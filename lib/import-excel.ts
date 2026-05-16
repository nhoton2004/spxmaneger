import * as XLSX from 'xlsx';
import { buildColumnMap } from './header-map';
import { supabase } from './supabase';

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}

const FAILED_KEYWORDS = [
  'giao thất bại',
  'không thành công',
  'failed',
  'delivery failed',
  'giao hang that bai',
  'thất bại',
];

function isDeliveryFailed(status: string): boolean {
  const lower = (status || '').toLowerCase();
  return FAILED_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  // Excel serial date numbers
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0).toISOString();
    }
  }
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseAmount(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export async function importExcelBuffer(
  buffer: ArrayBuffer,
  shopId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
  };

  // Parse workbook
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (rows.length < 2) {
    result.errorDetails.push('File không có dữ liệu hoặc thiếu header.');
    result.errors = 1;
    return result;
  }

  // Build column map from header row
  const headerRow = (rows[0] as string[]).map(String);
  const colMap = buildColumnMap(headerRow);

  if (!colMap.shopee_order_sn && !colMap.tracking_code) {
    result.errorDetails.push(
      'Không tìm thấy cột mã đơn hàng (Order SN) hoặc mã vận đơn trong file. Vui lòng kiểm tra lại tên cột.'
    );
    result.errors = 1;
    return result;
  }

  const dataRows = rows.slice(1);
  result.total = dataRows.filter((r) => (r as string[]).some((c) => String(c).trim() !== '')).length;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    // Skip empty rows
    if (row.every((c) => String(c).trim() === '')) continue;

    try {
      const get = (key: keyof typeof colMap) =>
        colMap[key] !== undefined ? row[colMap[key]!] : undefined;

      const orderSn = String(get('shopee_order_sn') ?? '').trim();
      const trackingCode = String(get('tracking_code') ?? '').trim();

      if (!orderSn && !trackingCode) {
        result.errors++;
        result.errorDetails.push(`Dòng ${i + 2}: Thiếu cả mã đơn và mã vận đơn.`);
        continue;
      }

      const shippingStatus = String(get('shipping_status') ?? get('order_status') ?? '').trim();
      const orderStatus = String(get('order_status') ?? '').trim();

      const payload = {
        shop_id: shopId,
        shopee_order_sn: orderSn || `MANUAL-${Date.now()}-${i}`,
        tracking_code: trackingCode || null,
        order_date: parseDate(get('order_date')) || new Date().toISOString(),
        customer_name: String(get('customer_name') ?? '').trim() || null,
        customer_phone: String(get('customer_phone') ?? '').trim() || null,
        total_amount: parseAmount(get('total_amount')),
        cod_amount: parseAmount(get('cod_amount')),
        order_status: orderStatus || null,
        shipping_status: shippingStatus || null,
        payment_status: 'Chưa thu',
        need_action: isDeliveryFailed(shippingStatus) || isDeliveryFailed(orderStatus),
        last_sync_at: new Date().toISOString(),
      };

      // Upsert: nếu trùng shopee_order_sn thì update
      const { data: existing, error: fetchErr } = await supabase
        .from('orders')
        .select('id')
        .eq('shopee_order_sn', payload.shopee_order_sn)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        const { error: updateErr } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
        result.updated++;

        // Tạo reminder nếu giao thất bại
        if (payload.need_action) {
          await supabase.from('reminders').upsert({
            order_id: existing.id,
            type: 'delivery_failed',
            title: `Đơn ${payload.shopee_order_sn} giao thất bại`,
            message: `Trạng thái: ${shippingStatus || orderStatus}. Cần liên hệ lại khách hàng.`,
            due_at: new Date(Date.now() + 86400000).toISOString(),
            is_done: false,
          });
        }
      } else {
        const { data: newOrder, error: insertErr } = await supabase
          .from('orders')
          .insert(payload)
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        result.inserted++;

        // Tạo reminder nếu giao thất bại
        if (payload.need_action && newOrder) {
          await supabase.from('reminders').insert({
            order_id: newOrder.id,
            type: 'delivery_failed',
            title: `Đơn ${payload.shopee_order_sn} giao thất bại`,
            message: `Trạng thái: ${shippingStatus || orderStatus}. Cần liên hệ lại khách hàng.`,
            due_at: new Date(Date.now() + 86400000).toISOString(),
            is_done: false,
          });
        }
      }
    } catch (err: unknown) {
      result.errors++;
      result.errorDetails.push(`Dòng ${i + 2}: ${(err as Error).message}`);
    }
  }

  return result;
}

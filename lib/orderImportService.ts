/**
 * orderImportService.ts
 * ─────────────────────
 * Bảng duy nhất: orders (không dùng orders_ai nữa)
 * Map field của SpxOrder sang đúng cột của bảng orders.
 */
import * as XLSX from 'xlsx';
import { getSupabase } from './supabase';
import type { SpxOrder } from '@/types/order';

export interface OrderImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

// ─── Bảng chính ────────────────────────────────────────────
const ORDERS_TABLE = 'orders';

// ─── Column maps ────────────────────────────────────────────
const COL_EN: Record<string, string> = {
  'tracking no.': 'tracking_code',
  'tracking no. link': 'tracking_url',
  'customer reference no.': 'customer_reference_no',
  'create time': 'order_date',
  'actual pickup/drop off time': 'pickup_time',
  'delivered time': 'delivered_time',
  'tracking status': 'shipping_status',
  'receiver name': 'customer_name',
  'receiver phone number': 'customer_phone',
  'receiver province': 'receiver_province',
  'receiver district(old)/ward(new)': 'receiver_district',
  'receiver ward(old)': 'receiver_ward',
  'receiver detail address': 'receiver_address',
  'item list': 'item_list_raw',
  'cod amount': 'cod_amount',
  'parcel value': 'parcel_value',
  'actual shipping fee': 'actual_shipping_fee',
  'delivery failed reason': 'delivery_failed_reason',
};

const COL_VI: Record<string, string> = {
  'mã vận đơn': 'tracking_code',
  'mã tham chiếu khách hàng': 'customer_reference_no',
  'thời gian tạo đơn': 'order_date',
  'thời gian lấy/nhận hàng thực tế': 'pickup_time',
  'thời gian giao hàng': 'delivered_time',
  'trạng thái vận chuyển': 'shipping_status',
  'tên người nhận': 'customer_name',
  'số điện thoại người nhận': 'customer_phone',
  'tỉnh/tp người nhận': 'receiver_province',
  'quận/huyện người nhận': 'receiver_district',
  'phường/xã người nhận': 'receiver_ward',
  'địa chỉ người nhận': 'receiver_address',
  'danh sách hàng hóa': 'item_list_raw',
  'tiền thu hộ': 'cod_amount',
  'giá trị kiện hàng': 'parcel_value',
  'phí ship thực tế': 'actual_shipping_fee',
  'lý do giao thất bại': 'delivery_failed_reason',
};

// ─── Helpers ─────────────────────────────────────────────────
function normalizeKey(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAmount(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  return parseFloat(String(v).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0).toISOString();
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseItems(v: unknown): string[] {
  const raw = String(v ?? '').trim();
  if (!raw) return [];
  return raw.split(/\s*;\s*|\r?\n/).map(s => s.trim()).filter(Boolean);
}

function findHeaders(rows: unknown[][]) {
  const colMap: Record<number, string> = {};
  let dataStart = 1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = (rows[i] as unknown[]).map(c => normalizeKey(String(c ?? '')));
    const isHeader = cells.some(c => c === 'tracking no.' || c === 'mã vận đơn');
    if (!isHeader) continue;

    cells.forEach((cell, idx) => {
      const dbField = COL_EN[cell] || COL_VI[cell];
      if (dbField && !(idx in colMap)) colMap[idx] = dbField;
    });

    if (i + 1 < rows.length) {
      const next = (rows[i + 1] as unknown[]).map(c => normalizeKey(String(c ?? '')));
      const nextIsHeader = next.some(c => c === 'mã vận đơn' || c === 'tracking no.');
      dataStart = nextIsHeader ? i + 2 : i + 1;
    } else {
      dataStart = i + 1;
    }
    break;
  }

  return { colMap, dataStart };
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

// ─── Build SpxOrder from row ──────────────────────────────
function buildOrder(
  row: unknown[],
  colMap: Record<number, string>,
  userId: string,
  shopId?: string
): SpxOrder | null {
  const get = (field: string): unknown => {
    const entry = Object.entries(colMap).find(([, v]) => v === field);
    return entry ? row[Number(entry[0])] : undefined;
  };

  const trackingCode = String(get('tracking_code') ?? '').trim();
  if (!trackingCode) return null;

  return {
    id: trackingCode,
    userId: userId || null,
    shopId: shopId || null,
    trackingCode,
    receiverName: String(get('customer_name') ?? '').trim() || null,
    phone: String(get('customer_phone') ?? '').trim() || null,
    province: String(get('receiver_province') ?? '').trim() || null,
    district: String(get('receiver_district') ?? '').trim() || null,
    ward: String(get('receiver_ward') ?? '').trim() || null,
    address: String(get('receiver_address') ?? '').trim() || null,
    status: String(get('shipping_status') ?? '').trim() || null,
    cod: parseAmount(get('cod_amount')),
    orderValue: parseAmount(get('parcel_value')),
    shippingFee: parseAmount(get('actual_shipping_fee')),
    createTime: parseDate(get('order_date')),
    pickupTime: parseDate(get('pickup_time')),
    deliveredTime: parseDate(get('delivered_time')),
    reason: String(get('delivery_failed_reason') ?? '').trim() || null,
    items: parseItems(get('item_list_raw')),
    rawData: {},
    importedAt: new Date().toISOString(),
  };
}

// ─── Save to bảng orders ──────────────────────────────────
async function saveOrdersToSupabase(
  userId: string,
  orders: SpxOrder[],
  shopId?: string
): Promise<{ inserted: number; updated: number }> {
  const db = getSupabase();

  // Pre-fetch existing tracking codes
  const existingSet = new Set<string>();
  const codeChunks = chunk(orders.map(o => o.trackingCode), 100);
  for (const codes of codeChunks) {
    if (!codes.length) continue;
    const { data, error } = await db
      .from(ORDERS_TABLE)
      .select('tracking_code')
      .in('tracking_code', codes);
    if (error) throw error;
    (data || []).forEach((r: { tracking_code: string }) => existingSet.add(r.tracking_code));
  }

  // Upsert in batches of 200
  const batchChunks = chunk(orders, 200);
  for (const batchOrders of batchChunks) {
    const rows = batchOrders.map(o => ({
      tracking_code: o.trackingCode,
      tracking_url: null,
      shop_id: o.shopId ?? shopId ?? null,
      customer_name: o.receiverName,
      customer_phone: o.phone,
      receiver_province: o.province,
      receiver_district: o.district,
      receiver_ward: o.ward,
      receiver_address: o.address,
      shipping_status: o.status,
      cod_amount: o.cod,
      parcel_value: o.orderValue,
      actual_shipping_fee: o.shippingFee,
      order_date: o.createTime,
      pickup_time: o.pickupTime,
      delivered_time: o.deliveredTime,
      delivery_failed_reason: o.reason,
      item_list_raw: o.items.join('; '),
      need_action: false,
      payment_status: 'Chưa thu',
      last_imported_at: o.importedAt,
    }));

    const { error } = await db
      .from(ORDERS_TABLE)
      .upsert(rows, { onConflict: 'tracking_code', ignoreDuplicates: false });
    if (error) throw error;
  }

  const updated = orders.filter(o => existingSet.has(o.trackingCode)).length;
  const inserted = orders.length - updated;
  return { inserted, updated };
}

// ─── Public API ───────────────────────────────────────────
export async function importSpxExcelFile(
  file: File,
  userId: string,
  shopId?: string
): Promise<OrderImportResult> {
  const buffer = await file.arrayBuffer();
  return importSpxBuffer(buffer, userId, shopId);
}

export async function importSpxBuffer(
  buffer: ArrayBuffer,
  userId: string,
  shopId?: string
): Promise<OrderImportResult> {
  const result: OrderImportResult = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  if (!userId) {
    result.errors = 1;
    result.errorDetails.push('Thiếu userId để lưu dữ liệu.');
    return result;
  }

  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

  const { colMap, dataStart } = findHeaders(rows);
  if (Object.keys(colMap).length === 0) {
    result.errors = 1;
    result.errorDetails.push('Không tìm thấy cột mã vận đơn trong file SPX.');
    return result;
  }

  const dataRows = rows
    .slice(dataStart)
    .filter(r => (r as unknown[]).some(c => String(c).trim() !== ''));
  result.total = dataRows.length;

  const orders: SpxOrder[] = [];
  dataRows.forEach((row, idx) => {
    const order = buildOrder(row as unknown[], colMap, userId, shopId);
    if (!order) {
      result.skipped++;
      result.errorDetails.push(`Dòng ${dataStart + idx + 1}: Thiếu mã vận đơn, bỏ qua.`);
      return;
    }
    orders.push(order);
  });

  if (orders.length === 0) {
    if (result.skipped > 0) result.errors = result.skipped;
    return result;
  }

  try {
    const saved = await saveOrdersToSupabase(userId, orders, shopId);
    result.inserted = saved.inserted;
    result.updated = saved.updated;
  } catch (err: unknown) {
    result.errors = 1;
    const msg = (err as Error).message;
    console.error('[orderImportService] Save error:', msg);
    result.errorDetails.push(`Lỗi lưu dữ liệu vào bảng orders: ${msg}`);
  }

  return result;
}

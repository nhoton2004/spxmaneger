import * as XLSX from 'xlsx';
import { getSupabase } from './supabase';

// ============================================================
// Types
// ============================================================
export interface SpxImportResult {
  totalRows: number;
  mappedRows: number;
  savedRows: number;
  errors: number;
  errorDetails: string[];
  dbCountAfterImport: number;
  sampleSavedOrders: any[];
  
  // legacy for UI
  total: number;
  inserted: number;
  updated: number;
  totalCod: number;
  totalParcelValue: number;
  statusBreakdown: Record<string, number>;
  needActionCount: number;
  batchId: string | null;
}

// ============================================================
// Column maps
// ============================================================
const COL_EN: Record<string, string> = {
  'tracking no.': 'tracking_code',
  'tracking no. link': 'tracking_url',
  'customer reference no.': 'customer_reference_no',
  'account id': 'spx_account_id',
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
  'sender name': 'sender_name',
  'sender phone number': 'sender_phone',
  'payment role': 'payment_role',
  'delivery instruction': 'delivery_instruction',
  'item list': 'item_list_raw',
  'create method': 'create_method',
  'order creator': 'order_creator',
  'no of delivery attempts': 'delivery_attempts',
  'cod collection(y/n)': 'cod_enabled',
  'cod amount': 'cod_amount',
  'parcel value': 'parcel_value',
  'parcel weight': 'parcel_weight',
  'actual weight': 'actual_weight',
  'estimated shipping fee': 'estimated_shipping_fee',
  'actual shipping fee': 'actual_shipping_fee',
  'basic shipping fee': 'basic_shipping_fee',
  'insurance fee': 'insurance_fee',
  'cod service fee': 'cod_service_fee',
  'return shipping fee': 'return_shipping_fee',
  'delivery failed reason': 'delivery_failed_reason',
  'buyer rejects - collect fee': 'buyer_reject_collect_fee',
  'buyer rejects - collect fee amount': 'buyer_reject_fee_amount',
};

const COL_VI: Record<string, string> = {
  'mã vận đơn': 'tracking_code',
  'link tracking': 'tracking_url',
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
  'tên người gửi': 'sender_name',
  'số điện thoại người gửi': 'sender_phone',
  'thu hộ (có/không)': 'cod_enabled',
  'tiền thu hộ': 'cod_amount',
  'giá trị kiện hàng': 'parcel_value',
  'số lần giao hàng': 'delivery_attempts',
  'lý do giao thất bại': 'delivery_failed_reason',
  'phí ship thực tế': 'actual_shipping_fee',
  'phí ship cơ bản': 'basic_shipping_fee',
  'phí hoàn': 'return_shipping_fee',
  'phí bảo hiểm': 'insurance_fee',
  'phí cod': 'cod_service_fee',
  'danh sách hàng hóa': 'item_list_raw',
};

// ============================================================
// Status → reminder rules
// ============================================================
const REMINDER_RULES: Record<string, { type: string; title: string; message: string }> = {
  'lấy hàng không thành công': { type: 'pickup_failed', title: 'Lấy hàng không thành công', message: 'Liên hệ shipper/SPX để lấy lại hàng.' },
  'đang trả hàng': { type: 'returning', title: 'Đơn đang hoàn về', message: 'Theo dõi quá trình hoàn hàng.' },
  'đã trả hàng': { type: 'returned', title: 'Đơn đã hoàn về', message: 'Kiểm tra hàng hoàn, xác nhận nhập kho.' },
  'đã hủy': { type: 'cancelled', title: 'Đơn đã bị hủy', message: 'Kiểm tra và xử lý đơn hủy.' },
};

const STATUS_NEED_ACTION = new Set([
  'lấy hàng không thành công',
  'đang trả hàng',
  'đã trả hàng',
  'đã hủy',
]);

// ============================================================
// Helpers
// ============================================================
function nk(s: string) {
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

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return ['yes', 'y', 'có', 'true', '1'].includes(s);
}

// ============================================================
// Find header rows
// ============================================================
function findHeaders(rows: unknown[][]): {
  colMap: Record<number, string>;
  dataStart: number;
  reportTime: string;
} {
  const colMap: Record<number, string> = {};
  let dataStart = 1;
  let reportTime = '';

  if (rows[1]) reportTime = rows[1].filter(Boolean).map(String).join(' ').trim();

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const cells = (rows[i] as unknown[]).map(c => nk(String(c ?? '')));
    const isHeader = cells.some(c => c === 'tracking no.' || c === 'mã vận đơn');
    if (!isHeader) continue;

    cells.forEach((cell, idx) => {
      const dbField = COL_EN[cell] || COL_VI[cell];
      if (dbField && !(idx in colMap)) colMap[idx] = dbField;
    });

    if (i + 1 < rows.length) {
      const next = (rows[i + 1] as unknown[]).map(c => nk(String(c ?? '')));
      const nextIsHeader = next.some(c => c === 'mã vận đơn' || c === 'tracking no.');
      dataStart = nextIsHeader ? i + 2 : i + 1;
    } else {
      dataStart = i + 1;
    }
    break;
  }

  console.log(`[SPX Import] Header scan: colMap has ${Object.keys(colMap).length} columns, dataStart=${dataStart}`);
  return { colMap, dataStart, reportTime };
}

// ============================================================
// Main
// ============================================================
export async function importSpxBuffer(
  buffer: ArrayBuffer,
  shopId: string,
  fileName: string
): Promise<SpxImportResult> {
  const db = getSupabase();

  const result: SpxImportResult = {
    totalRows: 0,
    mappedRows: 0,
    savedRows: 0,
    errors: 0,
    errorDetails: [],
    dbCountAfterImport: 0,
    sampleSavedOrders: [],
    total: 0,
    inserted: 0,
    updated: 0,
    totalCod: 0,
    totalParcelValue: 0,
    statusBreakdown: {},
    needActionCount: 0,
    batchId: null,
  };

  // ── Parse workbook ────────────────────────────────────────
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

  const { colMap, dataStart, reportTime } = findHeaders(rows);

  if (Object.keys(colMap).length === 0) {
    result.errors = 1;
    result.errorDetails.push(
      'Không tìm thấy cột "Tracking No." hoặc "Mã vận đơn" trong file. ' +
      'Vui lòng dùng file Excel export trực tiếp từ SPX Seller Center.'
    );
    return result;
  }

  const dataRows = rows
    .slice(dataStart)
    .filter(r => (r as unknown[]).some(c => String(c).trim() !== ''));
    
  console.log("IMPORT API START");
  console.log("Parsed rows length:", dataRows.length);
  if (dataRows.length > 0) {
    console.log("First raw row:", dataRows[0]);
  }

  result.total = dataRows.length;
  result.totalRows = dataRows.length;

  // ── Create import_batches record (NON-FATAL) ──────────────
  let batchId: string | null = null;
  try {
    const { data: batch, error: batchErr } = await db
      .from('import_batches')
      .insert({
        shop_id: shopId,
        file_name: fileName,
        report_download_time: reportTime,
        total_rows: result.total,
      })
      .select('id')
      .single();

    if (batchErr) {
      console.warn('[SPX Import] import_batches insert failed (non-fatal, continuing):', batchErr.message);
    } else {
      batchId = batch?.id ?? null;
      result.batchId = batchId;
      console.log(`[SPX Import] Batch created: ${batchId}`);
    }
  } catch (e) {
    console.warn('[SPX Import] import_batches exception (non-fatal):', e);
  }

  // Helper to get value by dbField name
  const get = (row: unknown[], field: string): unknown => {
    const entry = Object.entries(colMap).find(([, v]) => v === field);
    return entry ? row[parseInt(entry[0])] : undefined;
  };

  // ── Pre-fetch existing tracking codes (batch) ─────────────
  const allTrackingCodes = (dataRows as unknown[][])
    .map(row => String(get(row, 'tracking_code') ?? '').trim())
    .filter(Boolean);

  const existingSet = new Set<string>();
  for (let ci = 0; ci < allTrackingCodes.length; ci += 100) {
    const chunk = allTrackingCodes.slice(ci, ci + 100);
    const { data: existing } = await db
      .from('orders')
      .select('tracking_code')
      .in('tracking_code', chunk);
    (existing || []).forEach((r: { tracking_code: string }) => existingSet.add(r.tracking_code));
  }
  console.log(`[SPX Import] Pre-existing orders found: ${existingSet.size}`);

  // ── Build Payloads ───────────────────────────────────────
  const payloads: any[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    const trackingCode = String(get(row, 'tracking_code') ?? '').trim();

    if (!trackingCode) {
      result.errors++;
      result.errorDetails.push(`Dòng ${dataStart + i + 1}: Không có mã vận đơn — bỏ qua.`);
      continue;
    }

    const shippingStatus = String(get(row, 'shipping_status') ?? '').trim();
    const deliveryFailedReason = String(get(row, 'delivery_failed_reason') ?? '').trim();
    const codAmount = parseAmount(get(row, 'cod_amount'));
    const parcelValue = parseAmount(get(row, 'parcel_value'));
    const codEnabled = parseBool(get(row, 'cod_enabled'));

    const statusKey = shippingStatus.toLowerCase();
    const needAction = STATUS_NEED_ACTION.has(statusKey) || deliveryFailedReason !== '';

    result.totalCod += codAmount;
    result.totalParcelValue += parcelValue;
    result.statusBreakdown[shippingStatus] = (result.statusBreakdown[shippingStatus] || 0) + 1;
    if (needAction) result.needActionCount++;

    payloads.push({
      shop_id: shopId,
      import_batch_id: batchId,
      tracking_code: trackingCode,
      tracking_url: String(get(row, 'tracking_url') ?? '').trim() || null,
      customer_reference_no: String(get(row, 'customer_reference_no') ?? '').trim() || null,
      spx_account_id: String(get(row, 'spx_account_id') ?? '').trim() || null,
      order_date: parseDate(get(row, 'order_date')),
      pickup_time: parseDate(get(row, 'pickup_time')),
      delivered_time: parseDate(get(row, 'delivered_time')),
      shipping_status: shippingStatus || null,
      customer_name: String(get(row, 'customer_name') ?? '').trim() || null,
      customer_phone: String(get(row, 'customer_phone') ?? '').trim() || null,
      receiver_province: String(get(row, 'receiver_province') ?? '').trim() || null,
      receiver_district: String(get(row, 'receiver_district') ?? '').trim() || null,
      receiver_ward: String(get(row, 'receiver_ward') ?? '').trim() || null,
      receiver_address: String(get(row, 'receiver_address') ?? '').trim() || null,
      sender_name: String(get(row, 'sender_name') ?? '').trim() || null,
      sender_phone: String(get(row, 'sender_phone') ?? '').trim() || null,
      payment_role: String(get(row, 'payment_role') ?? '').trim() || null,
      delivery_instruction: String(get(row, 'delivery_instruction') ?? '').trim() || null,
      item_list_raw: String(get(row, 'item_list_raw') ?? '').trim() || null,
      create_method: String(get(row, 'create_method') ?? '').trim() || null,
      order_creator: String(get(row, 'order_creator') ?? '').trim() || null,
      delivery_attempts: parseInt(String(get(row, 'delivery_attempts') ?? '0')) || 0,
      cod_enabled: codEnabled,
      cod_amount: codAmount,
      parcel_value: parcelValue,
      parcel_weight: parseAmount(get(row, 'parcel_weight')),
      actual_weight: parseAmount(get(row, 'actual_weight')),
      estimated_shipping_fee: parseAmount(get(row, 'estimated_shipping_fee')),
      actual_shipping_fee: parseAmount(get(row, 'actual_shipping_fee')),
      basic_shipping_fee: parseAmount(get(row, 'basic_shipping_fee')),
      insurance_fee: parseAmount(get(row, 'insurance_fee')),
      cod_service_fee: parseAmount(get(row, 'cod_service_fee')),
      return_shipping_fee: parseAmount(get(row, 'return_shipping_fee')),
      delivery_failed_reason: deliveryFailedReason || null,
      buyer_reject_collect_fee: parseBool(get(row, 'buyer_reject_collect_fee')),
      buyer_reject_fee_amount: parseAmount(get(row, 'buyer_reject_fee_amount')),
      need_action: needAction,
      payment_status: 'Chưa thu',
      last_imported_at: new Date().toISOString(),
    });
  }

  result.mappedRows = payloads.length;
  console.log("Mapped orders length:", payloads.length);
  if (payloads.length > 0) {
    console.log("First mapped order:", payloads[0]);
  }

  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Upsert payload length:", payloads.length);
  if (payloads.length > 0) {
    console.log("First upsert payload:", payloads[0]);
  }

  if (payloads.length === 0) {
    throw new Error("Không có dòng nào hợp lệ để lưu vào database.");
  }

  // ── Upsert Batch ───────────────────────────────────────
  const { data: upsertData, error: upsertError } = await db
    .from("orders")
    .upsert(payloads, { onConflict: "tracking_code" })
    .select();

  console.log("Supabase upsert data length:", upsertData?.length);
  console.log("Supabase upsert error:", upsertError);

  if (upsertError) {
    throw new Error(`Lỗi từ Supabase: ${upsertError.message} (${upsertError.code})`);
  }

  if (!upsertData || upsertData.length === 0) {
    throw new Error("Không có dòng nào được lưu vào database (kết quả trả về rỗng).");
  }

  result.savedRows = upsertData.length;
  result.inserted = upsertData.length; // Approximate for UI compatibility
  result.updated = 0;
  result.sampleSavedOrders = upsertData.slice(0, 5);

  // ── Check DB Count ─────────────────────────────────────
  const { count, error: countError } = await db
    .from("orders")
    .select("*", { count: "exact", head: true });

  console.log("DB count after import:", count);
  console.log("DB count error:", countError);

  result.dbCountAfterImport = count || 0;

  // ── Update batch summary ─────────────────────────────────
  if (result.batchId) {
    await db.from('import_batches').update({
      inserted_count: result.savedRows,
      error_count: result.errors,
      total_cod: result.totalCod,
      total_parcel_value: result.totalParcelValue,
    }).eq('id', result.batchId);
  }

  return result;
}

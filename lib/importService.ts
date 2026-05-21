/**
 * importService.ts
 * ─────────────────
 * Xử lý import file Excel (.xlsx/.xls) hoặc CSV từ SPX / Shopee Seller Center.
 * - Nhận diện cột linh hoạt (EN + VI)
 * - Validate dữ liệu từng dòng
 * - Chuẩn hóa trạng thái
 * - Không hard-code tên cột
 * - Trả về thống kê chi tiết: total / inserted / updated / skipped / errors
 */

import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────────────────

export interface ParsedOrder {
  trackingCode: string | null;
  orderCode: string | null;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  shopName: string | null;
  orderDate: string | null;
  deliveredTime: string | null;
  pickupTime: string | null;
  codAmount: number;
  shippingFee: number;
  parcelValue: number;
  status: string | null;
  shippingStatus: string | null;
  deliveryFailedReason: string | null;
  notes: string | null;
  items: string[];
}

export interface ImportFileResult {
  /** Tổng số dòng dữ liệu trong file (bỏ qua header + dòng trống) */
  totalRows: number;
  /** Số dòng parse thành công */
  mappedRows: number;
  /** Số đơn tạo mới */
  inserted: number;
  /** Số đơn được cập nhật */
  updated: number;
  /** Số dòng bị bỏ qua (trống, thiếu định danh) */
  skipped: number;
  /** Số lỗi */
  errors: number;
  /** Chi tiết lỗi */
  errorDetails: string[];
  /** Các cột đã nhận diện được */
  detectedColumns: string[];
  /** Cột bắt buộc bị thiếu */
  missingRequired: string[];
  /** Dữ liệu preview (5 dòng đầu) */
  preview: ParsedOrder[];
}

// ─── Column mapping (EN + VI linh hoạt) ─────────────────────────────────

/**
 * Mỗi entry: key = tên trường nội bộ, value = danh sách tên cột có thể có trong file
 * Dùng includes() nên cần substring match.
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  tracking_code: [
    'tracking no.',
    'tracking no',
    'tracking number',
    'tracking_code',
    'mã vận đơn',
    'mã spx',
    'số vận đơn',
    'mã tracking',
    'tracking',
  ],
  order_code: [
    'customer reference no.',
    'customer reference no',
    'customer reference',
    'order sn',
    'order id',
    'order_sn',
    'mã đơn hàng',
    'mã đơn',
    'mã tham chiếu',
    'mã tham chiếu khách hàng',
    'số đơn hàng',
    'ordersn',
  ],
  customer_name: [
    'receiver name',
    'recipient name',
    'customer name',
    'buyer name',
    'tên người nhận',
    'tên khách hàng',
    'tên khách',
    'customer_name',
    'receiver_name',
  ],
  customer_phone: [
    'receiver phone number',
    'receiver phone',
    'recipient phone',
    'buyer phone',
    'customer phone',
    'số điện thoại người nhận',
    'số điện thoại',
    'sdt',
    'phone',
    'phone_number',
  ],
  receiver_address: [
    'receiver detail address',
    'receiver address',
    'detail address',
    'địa chỉ người nhận',
    'địa chỉ chi tiết',
    'địa chỉ',
    'address',
  ],
  receiver_province: [
    'receiver province',
    'province',
    'tỉnh/tp người nhận',
    'tỉnh thành',
    'tỉnh/tp',
  ],
  receiver_district: [
    'receiver district',
    'district',
    'quận/huyện người nhận',
    'quận/huyện',
    'receiver district(old)/ward(new)',
  ],
  receiver_ward: [
    'receiver ward',
    'ward',
    'phường/xã người nhận',
    'phường/xã',
    'receiver ward(old)',
  ],
  shop_name: [
    'account id',
    'account_id',
    'spx account',
    'seller account',
    'shop',
    'shop name',
    'tên shop',
    'tài khoản shop',
    'tài khoản',
  ],
  order_date: [
    'create time',
    'created at',
    'created_at',
    'order date',
    'order_date',
    'ngày tạo đơn',
    'thời gian tạo đơn',
    'ngày tạo',
    'ngày đặt hàng',
    'create date',
    'date created',
  ],
  delivered_time: [
    'delivered time',
    'delivery time',
    'delivered_time',
    'thời gian giao hàng',
    'ngày giao hàng',
  ],
  pickup_time: [
    'actual pickup/drop off time',
    'pickup time',
    'pickup_time',
    'thời gian lấy/nhận hàng thực tế',
    'thời gian lấy hàng',
    'ngày lấy hàng',
  ],
  cod_amount: [
    'cod amount',
    'cod_amount',
    'cod',
    'tiền thu hộ',
    'tiền cod',
    'số tiền thu hộ',
    'cash on delivery',
  ],
  shipping_fee: [
    'actual shipping fee',
    'actual_shipping_fee',
    'shipping fee',
    'phí ship thực tế',
    'phí vận chuyển',
    'phí ship',
  ],
  parcel_value: [
    'parcel value',
    'parcel_value',
    'item value',
    'giá trị kiện hàng',
    'giá trị hàng hóa',
  ],
  shipping_status: [
    'tracking status',
    'shipping status',
    'shipping_status',
    'delivery status',
    'trạng thái vận chuyển',
    'tình trạng vận chuyển',
    'trạng thái',
    'status',
  ],
  delivery_failed_reason: [
    'delivery failed reason',
    'failed reason',
    'delivery_failed_reason',
    'lý do giao thất bại',
    'lý do thất bại',
    'reason',
  ],
  item_list: [
    'item list',
    'items',
    'item_list_raw',
    'danh sách hàng hóa',
    'hàng hóa',
    'sản phẩm',
  ],
  notes: [
    'notes',
    'note',
    'delivery instruction',
    'ghi chú',
    'hướng dẫn giao hàng',
  ],
};

// ─── Internal status normalization ──────────────────────────────────────

/**
 * Map trạng thái SPX/Shopee về nhóm nội bộ
 */
export function normalizeShippingStatus(raw: string): string {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return 'unknown';

  if (s.includes('đã giao') || s.includes('delivered') || s.includes('giao thành công')) return 'delivered';
  if (s.includes('đang vận chuyển') || s.includes('in transit') || s.includes('shipping') || s.includes('delivering')) return 'shipping';
  if (s.includes('lấy hàng không thành công') || s.includes('pickup failed')) return 'pickup_failed';
  if (s.includes('đang trả') || s.includes('returning')) return 'returning';
  if (s.includes('đã trả') || s.includes('returned')) return 'returned';
  if (s.includes('hủy') || s.includes('cancel')) return 'cancelled';
  if (s.includes('chờ') || s.includes('pending') || s.includes('waiting')) return 'pending';
  return s; // giữ nguyên nếu không khớp
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function nk(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAmount(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const cleaned = String(v)
    .replace(/[^\d.,\-]/g, '')
    .replace(/,(\d{3})/g, '$1') // bỏ dấu phân cách hàng nghìn kiểu "1,000"
    .replace(',', '.'); // nếu còn dấu phẩy thì đó là thập phân
  return parseFloat(cleaned) || 0;
}

function parseDate(v: unknown): string | null {
  if (!v && v !== 0) return null;
  // Excel serial date number
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) {
        return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0).toISOString();
      }
    } catch { /* ignore */ }
  }
  const str = String(v).trim();
  if (!str) return null;

  // dd/mm/yyyy hoặc dd-mm-yyyy
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(.*)$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy, rest] = ddmmyyyy;
    const timePart = rest.trim() || '00:00:00';
    const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timePart.startsWith('T') ? timePart.slice(1) : timePart}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // yyyy-mm-dd or ISO strings
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseItems(v: unknown): string[] {
  const raw = String(v ?? '').trim();
  if (!raw) return [];
  return raw.split(/\s*;\s*|\r?\n/).map(s => s.trim()).filter(Boolean);
}

// ─── Header detection ─────────────────────────────────────────────────

/**
 * Trả về map: internalField -> colIndex
 * Scan tối đa 10 dòng đầu để tìm header row (chứa "tracking no." hoặc "mã vận đơn")
 */
function detectColumnMap(rows: unknown[][]): {
  colMap: Record<string, number>;
  dataStart: number;
  detectedColumns: string[];
  missingRequired: string[];
} {
  const colMap: Record<string, number> = {};
  let dataStart = 1;

  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const cells = (rows[i] as unknown[]).map(c => nk(String(c ?? '')));

    // Kiểm tra xem dòng này có phải là header không
    const isHeader = cells.some(c =>
      c === 'tracking no.' || c === 'mã vận đơn' || c === 'tracking no' ||
      c === 'tracking_code' || c.includes('tracking') && c.includes('no')
    );
    if (!isHeader) continue;

    // Map từng cell vào internal field
    cells.forEach((cell, idx) => {
      for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (field in colMap) continue; // đã map rồi
        if (aliases.some(alias => cell === alias || cell.includes(alias))) {
          colMap[field] = idx;
          break;
        }
      }
    });

    // Dòng tiếp theo: có thể là header thứ hai (một số file SPX có 2 dòng header)
    if (i + 1 < rows.length) {
      const next = (rows[i + 1] as unknown[]).map(c => nk(String(c ?? '')));
      const nextIsHeader = next.some(c => c === 'mã vận đơn' || c === 'tracking no.' || c === 'tracking no');
      dataStart = nextIsHeader ? i + 2 : i + 1;
    } else {
      dataStart = i + 1;
    }
    break;
  }

  const detectedColumns = Object.keys(colMap);

  // Kiểm tra cột bắt buộc: ít nhất tracking_code hoặc order_code
  const missingRequired: string[] = [];
  if (!('tracking_code' in colMap) && !('order_code' in colMap)) {
    missingRequired.push('Mã vận đơn (Tracking No.) hoặc Mã đơn hàng');
  }

  return { colMap, dataStart, detectedColumns, missingRequired };
}

// ─── Parse một dòng thành ParsedOrder ─────────────────────────────────

function parseRow(
  row: unknown[],
  colMap: Record<string, number>,
  lineNum: number
): { order: ParsedOrder | null; error: string | null } {
  const get = (field: string): unknown =>
    field in colMap ? row[colMap[field]] : undefined;

  const trackingCode = String(get('tracking_code') ?? '').trim() || null;
  const orderCode = String(get('order_code') ?? '').trim() || null;

  if (!trackingCode && !orderCode) {
    return { order: null, error: `Dòng ${lineNum}: Không có mã vận đơn và mã đơn hàng — bỏ qua.` };
  }

  const rawStatus = String(get('shipping_status') ?? '').trim();

  return {
    order: {
      trackingCode,
      orderCode,
      customerName: String(get('customer_name') ?? '').trim() || null,
      customerPhone: String(get('customer_phone') ?? '').trim() || null,
      address: String(get('receiver_address') ?? '').trim() || null,
      province: String(get('receiver_province') ?? '').trim() || null,
      district: String(get('receiver_district') ?? '').trim() || null,
      ward: String(get('receiver_ward') ?? '').trim() || null,
      shopName: String(get('shop_name') ?? '').trim() || null,
      orderDate: parseDate(get('order_date')),
      deliveredTime: parseDate(get('delivered_time')),
      pickupTime: parseDate(get('pickup_time')),
      codAmount: parseAmount(get('cod_amount')),
      shippingFee: parseAmount(get('shipping_fee')),
      parcelValue: parseAmount(get('parcel_value')),
      status: rawStatus || null,
      shippingStatus: rawStatus || null,
      deliveryFailedReason: String(get('delivery_failed_reason') ?? '').trim() || null,
      notes: String(get('notes') ?? '').trim() || null,
      items: parseItems(get('item_list')),
    },
    error: null,
  };
}

// ─── CSV parser ──────────────────────────────────────────────────────────

function parseCSV(text: string): unknown[][] {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const cols: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
        else inQuote = !inQuote;
      } else if ((ch === ',' || ch === '\t') && !inQuote) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    return cols;
  });
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Parse file (Excel hoặc CSV) thành danh sách ParsedOrder
 * Không lưu vào database — chỉ parse và validate
 */
export async function parseImportFile(file: File): Promise<{
  orders: ParsedOrder[];
  detectedColumns: string[];
  missingRequired: string[];
  totalRows: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}> {
  const fileName = file.name.toLowerCase();
  let rows: unknown[][];

  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    rows = parseCSV(text);
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  }

  const { colMap, dataStart, detectedColumns, missingRequired } = detectColumnMap(rows);

  if (missingRequired.length > 0) {
    return {
      orders: [],
      detectedColumns,
      missingRequired,
      totalRows: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [`Thiếu cột bắt buộc: ${missingRequired.join(', ')}`],
    };
  }

  const dataRows = rows
    .slice(dataStart)
    .filter(r => (r as unknown[]).some(c => String(c).trim() !== ''));

  const orders: ParsedOrder[] = [];
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  dataRows.forEach((row, idx) => {
    const { order, error } = parseRow(row as unknown[], colMap, dataStart + idx + 1);
    if (error) {
      skipped++;
      errorDetails.push(error);
    } else if (order) {
      orders.push(order);
    } else {
      skipped++;
    }
  });

  return {
    orders,
    detectedColumns,
    missingRequired,
    totalRows: dataRows.length,
    skipped,
    errors,
    errorDetails,
  };
}

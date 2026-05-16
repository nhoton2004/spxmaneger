/**
 * Flexible header mapping:
 * Nhiều tên cột khác nhau từ các phiên bản Shopee Seller Center (VI/EN/CSV/Excel)
 * đều được map về key chuẩn của database.
 */

export type DbKey =
  | 'shopee_order_sn'
  | 'tracking_code'
  | 'order_date'
  | 'customer_name'
  | 'customer_phone'
  | 'total_amount'
  | 'cod_amount'
  | 'order_status'
  | 'shipping_status';

type HeaderVariants = Record<DbKey, string[]>;

const HEADER_VARIANTS: HeaderVariants = {
  shopee_order_sn: [
    'mã đơn hàng',
    'order sn',
    'order_sn',
    'mã đơn',
    'order id',
    'ordersn',
    'số đơn hàng',
  ],
  tracking_code: [
    'mã vận đơn',
    'tracking number',
    'tracking_number',
    'tracking_code',
    'tracking no',
    'mã tracking',
    'số vận đơn',
  ],
  order_date: [
    'ngày đặt hàng',
    'ngày tạo đơn',
    'create time',
    'order date',
    'created at',
    'order_date',
    'ngày tạo',
    'create date',
  ],
  customer_name: [
    'tên người nhận',
    'recipient name',
    'customer name',
    'buyer name',
    'tên khách',
    'customer_name',
    'buyer_name',
  ],
  customer_phone: [
    'số điện thoại người nhận',
    'phone',
    'recipient phone',
    'buyer phone',
    'customer phone',
    'sdt',
    'số điện thoại',
    'customer_phone',
    'phone_number',
  ],
  total_amount: [
    'tổng giá trị đơn hàng',
    'tổng tiền',
    'total amount',
    'total_amount',
    'order amount',
    'grand total',
    'tổng tiền hàng',
  ],
  cod_amount: [
    'cod',
    'cod amount',
    'cod_amount',
    'tiền thu hộ',
    'tiền cod',
    'cash on delivery',
  ],
  order_status: [
    'trạng thái đơn hàng',
    'order status',
    'order_status',
    'trạng thái đơn',
    'status',
    'tình trạng',
  ],
  shipping_status: [
    'trạng thái vận chuyển',
    'shipping status',
    'shipping_status',
    'tình trạng vận chuyển',
    'delivery status',
    'logistics status',
  ],
};

/**
 * Nhận vào một tên cột thô từ file Excel/CSV,
 * trả về DbKey chuẩn hoặc null nếu không khớp.
 */
export function mapHeader(rawHeader: string): DbKey | null {
  const normalized = rawHeader.trim().toLowerCase();
  for (const [key, variants] of Object.entries(HEADER_VARIANTS) as [DbKey, string[]][]) {
    if (variants.some((v) => normalized === v || normalized.includes(v))) {
      return key;
    }
  }
  return null;
}

/**
 * Build column index map: { dbKey -> colIndex } từ mảng header của sheet.
 */
export function buildColumnMap(headers: string[]): Partial<Record<DbKey, number>> {
  const colMap: Partial<Record<DbKey, number>> = {};
  headers.forEach((h, i) => {
    const key = mapHeader(h);
    if (key && !(key in colMap)) {
      colMap[key] = i;
    }
  });
  return colMap;
}

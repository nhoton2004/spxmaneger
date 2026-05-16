/**
 * orderSearchService.ts
 * ──────────────────────
 * Tìm đơn từ bảng orders (không dùng orders_ai nữa).
 * Field mapping: orders dùng customer_name, customer_phone,
 * receiver_province, order_date, shipping_status, ...
 */
import { getSupabase } from './supabase';
import type { CustomerIntent, SpxOrder } from '@/types/order';

// ─── Bảng chính ────────────────────────────────────────────
const ORDERS_TABLE = 'orders';

// ─── DB row type (bảng orders) ─────────────────────────────
type DbOrderRow = {
  id: string;
  shop_id: string | null;
  tracking_code: string;
  customer_name: string | null;    // = receiver_name trong SpxOrder
  customer_phone: string | null;   // = phone
  receiver_province: string | null; // = province
  receiver_district: string | null; // = district
  receiver_ward: string | null;     // = ward
  receiver_address: string | null;  // = address
  shipping_status: string | null;   // = status
  cod_amount: number;               // = cod
  parcel_value: number;             // = orderValue
  actual_shipping_fee: number;      // = shippingFee
  order_date: string | null;        // = createTime
  pickup_time: string | null;
  delivered_time: string | null;
  delivery_failed_reason: string | null; // = reason
  item_list_raw: string | null;     // = items (raw string)
  last_imported_at: string | null;  // = importedAt
};

// ─── Helpers ─────────────────────────────────────────────────
function normalizeText(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}

function normalizePhone(s: string) {
  return s.replace(/\D/g, '');
}

function parseItems(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v));
  if (typeof value === 'string') {
    return value.split(/\s*;\s*|\r?\n/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function mapDbOrder(row: DbOrderRow): SpxOrder {
  return {
    id: row.id,
    userId: null,
    shopId: row.shop_id,
    trackingCode: row.tracking_code,
    receiverName: row.customer_name,
    phone: row.customer_phone,
    province: row.receiver_province,
    district: row.receiver_district,
    ward: row.receiver_ward,
    address: row.receiver_address,
    status: row.shipping_status,
    cod: row.cod_amount || 0,
    orderValue: row.parcel_value || 0,
    shippingFee: row.actual_shipping_fee || 0,
    createTime: row.order_date,
    pickupTime: row.pickup_time,
    deliveredTime: row.delivered_time,
    reason: row.delivery_failed_reason,
    items: parseItems(row.item_list_raw),
    rawData: {},
    importedAt: row.last_imported_at || '',
  };
}

function mapOrders(data: DbOrderRow[] | null | undefined): SpxOrder[] {
  return (data || []).map(mapDbOrder);
}

// ─── Search functions ─────────────────────────────────────
export async function searchOrderByTrackingCode(
  _userId: string,
  trackingCode: string,
  shopId?: string
): Promise<SpxOrder[]> {
  const code = normalizeText(trackingCode);
  if (!code) return [];
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .eq('tracking_code', code)
    .limit(1);
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

export async function searchOrdersByReceiverName(
  _userId: string,
  receiverName: string,
  shopId?: string
): Promise<SpxOrder[]> {
  const name = normalizeText(receiverName);
  if (!name) return [];
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .ilike('customer_name', `%${name}%`)
    .order('order_date', { ascending: false })
    .limit(5);
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

export async function searchOrdersByPhone(
  _userId: string,
  phone: string,
  shopId?: string
): Promise<SpxOrder[]> {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .ilike('customer_phone', `%${normalized}%`)
    .order('order_date', { ascending: false })
    .limit(5);
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

export async function searchOrdersByProvince(
  _userId: string,
  province: string,
  shopId?: string
): Promise<SpxOrder[]> {
  const normalized = normalizeText(province);
  if (!normalized) return [];
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .ilike('receiver_province', `%${normalized}%`)
    .order('order_date', { ascending: false })
    .limit(5);
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

export async function searchOrdersByDateRange(
  _userId: string,
  dateFrom: string,
  dateTo: string,
  shopId?: string
): Promise<SpxOrder[]> {
  if (!dateFrom || !dateTo) return [];
  const from = new Date(dateFrom).toISOString();
  const to = new Date(dateTo).toISOString();
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .gte('order_date', from)
    .lte('order_date', to)
    .order('order_date', { ascending: false });
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

async function searchOrdersByReceiverNameAndProvince(
  _userId: string,
  receiverName: string,
  province: string,
  shopId?: string
): Promise<SpxOrder[]> {
  const name = normalizeText(receiverName);
  const prov = normalizeText(province);
  if (!name || !prov) return [];
  const db = getSupabase();

  let query = db
    .from(ORDERS_TABLE)
    .select('*')
    .ilike('customer_name', `%${name}%`)
    .ilike('receiver_province', `%${prov}%`)
    .order('order_date', { ascending: false })
    .limit(5);
  if (shopId) query = query.eq('shop_id', shopId);

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders(data as DbOrderRow[]);
}

export async function smartSearchOrders(
  userId: string,
  extractedInfo: CustomerIntent,
  shopId?: string
): Promise<SpxOrder[]> {
  if (extractedInfo.trackingCode) {
    const found = await searchOrderByTrackingCode(userId, extractedInfo.trackingCode, shopId);
    if (found.length) return found.slice(0, 1);
  }

  if (extractedInfo.phone) {
    const found = await searchOrdersByPhone(userId, extractedInfo.phone, shopId);
    if (found.length) return found.slice(0, 5);
  }

  if (extractedInfo.receiverName && extractedInfo.province) {
    const found = await searchOrdersByReceiverNameAndProvince(
      userId,
      extractedInfo.receiverName,
      extractedInfo.province,
      shopId
    );
    if (found.length) return found.slice(0, 5);
  }

  if (extractedInfo.receiverName) {
    const found = await searchOrdersByReceiverName(userId, extractedInfo.receiverName, shopId);
    if (found.length) return found.slice(0, 5);
  }

  return [];
}

-- ============================================================
-- MIGRATION: orders_ai → orders (chạy trong Supabase SQL Editor)
-- Nếu bạn đã có dữ liệu trong orders_ai, script này migrate sang orders
-- Nếu chưa có dữ liệu trong orders_ai, chỉ cần drop nó
-- ============================================================

-- BƯỚC 1: Nếu orders_ai có dữ liệu, migrate sang orders
-- (Chạy phần này nếu bạn muốn giữ dữ liệu cũ)
INSERT INTO orders (
  tracking_code,
  customer_name,
  customer_phone,
  receiver_province,
  receiver_district,
  receiver_ward,
  receiver_address,
  shipping_status,
  cod_amount,
  parcel_value,
  actual_shipping_fee,
  order_date,
  pickup_time,
  delivered_time,
  delivery_failed_reason,
  item_list_raw,
  last_imported_at,
  need_action,
  payment_status
)
SELECT
  tracking_code,
  receiver_name,     -- orders_ai dùng receiver_name
  phone,             -- orders_ai dùng phone
  province,
  district,
  ward,
  address,
  status,
  cod,
  order_value,
  shipping_fee,
  create_time,
  pickup_time,
  delivered_time,
  reason,
  array_to_string(items, '; '),
  imported_at,
  false,
  'Chưa thu'
FROM orders_ai
ON CONFLICT (tracking_code) DO NOTHING;

-- BƯỚC 2: Drop bảng orders_ai sau khi migrate
DROP TABLE IF EXISTS orders_ai CASCADE;

-- ============================================================
-- KIỂM TRA SAU MIGRATION:
-- ============================================================
SELECT COUNT(*) AS total_orders FROM orders;

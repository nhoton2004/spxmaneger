-- ============================================================
-- SPX Order Tracker - Full Schema (v3)
-- Bảng chính duy nhất: orders
-- Không dùng orders_ai
-- Safe to re-run: uses DROP IF EXISTS + CREATE IF NOT EXISTS
-- ============================================================

-- Drop old tables (order matters due to foreign keys)
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS shops CASCADE;

-- Drop orders_ai nếu còn tồn tại
DROP TABLE IF EXISTS orders_ai CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- Table: shops
-- ============================================================
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'spx',
  spx_account_id text,
  sender_phone text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- Table: import_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  file_name text,
  report_download_time text,
  total_rows int DEFAULT 0,
  inserted_count int DEFAULT 0,
  updated_count int DEFAULT 0,
  error_count int DEFAULT 0,
  total_cod numeric(15,2) DEFAULT 0,
  total_parcel_value numeric(15,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- Table: orders  (bảng chính duy nhất)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,

  -- Core identifiers
  tracking_code text UNIQUE NOT NULL,
  tracking_url text,
  customer_reference_no text,        -- Mã đơn Shopee
  spx_account_id text,
  import_batch_id uuid REFERENCES import_batches(id),

  -- Timestamps
  order_date timestamp with time zone,           -- Create Time
  pickup_time timestamp with time zone,          -- Actual Pickup/Drop Off Time
  delivered_time timestamp with time zone,       -- Delivered Time
  last_imported_at timestamp with time zone DEFAULT now(),

  -- Receiver (khách hàng)
  customer_name text,          -- Receiver Name
  customer_phone text,         -- Receiver Phone Number
  receiver_province text,
  receiver_district text,
  receiver_ward text,
  receiver_address text,

  -- Sender (shop)
  sender_name text,
  sender_phone text,

  -- Status
  shipping_status text,        -- Tracking Status
  payment_status text DEFAULT 'Chưa thu',
  need_action boolean DEFAULT false,

  -- Order details
  item_list_raw text,
  delivery_instruction text,
  payment_role text,
  create_method text,
  order_creator text,
  delivery_attempts int DEFAULT 0,

  -- Money
  cod_enabled boolean DEFAULT false,
  cod_amount numeric(15,2) DEFAULT 0,
  parcel_value numeric(15,2) DEFAULT 0,
  parcel_weight numeric(8,3) DEFAULT 0,
  actual_weight numeric(8,3) DEFAULT 0,

  estimated_shipping_fee numeric(15,2) DEFAULT 0,
  actual_shipping_fee numeric(15,2) DEFAULT 0,
  basic_shipping_fee numeric(15,2) DEFAULT 0,
  insurance_fee numeric(15,2) DEFAULT 0,
  cod_service_fee numeric(15,2) DEFAULT 0,
  return_shipping_fee numeric(15,2) DEFAULT 0,

  -- Failed delivery
  delivery_failed_reason text,
  buyer_reject_collect_fee boolean DEFAULT false,
  buyer_reject_fee_amount numeric(15,2) DEFAULT 0,

  -- Internal / reconcile
  paid_amount numeric(15,2) DEFAULT 0,
  debt_amount numeric(15,2) DEFAULT 0,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Index để tìm nhanh theo shop và status
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_need_action ON orders(need_action) WHERE need_action = true;

-- ============================================================
-- Table: reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  tracking_code text,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  due_at timestamp with time zone,
  is_done boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(tracking_code, type)
);

-- ============================================================
-- RLS Policies (permissive for MVP / anon key)
-- ============================================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_shops" ON shops FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_batches" ON import_batches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_orders" ON orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_reminders" ON reminders FOR ALL TO anon USING (true) WITH CHECK (true);

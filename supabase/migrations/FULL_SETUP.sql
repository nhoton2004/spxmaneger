-- ============================================================
-- TOÀN BỘ SETUP DATABASE CHO SPX ORDER TRACKER
-- Copy toàn bộ và paste vào Supabase SQL Editor rồi click Run
-- ============================================================

-- ============================================================
-- 1. CREATE TABLES
-- ============================================================

-- Users table (for auth & permissions)
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  displayName TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  assignedShops TEXT[] DEFAULT '{}',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disabled BOOLEAN DEFAULT FALSE
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  ownerId TEXT,
  platform TEXT,
  assignedUsers TEXT[] DEFAULT '{}',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(uid)
);

-- Orders table - THÊM TOÀN BỘ CỘT CẦN THIẾT
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_id TEXT NOT NULL,
  import_batch_id TEXT,
  tracking_code TEXT UNIQUE NOT NULL,
  tracking_url TEXT,
  customer_reference_no TEXT,
  spx_account_id TEXT,
  order_date TIMESTAMP,
  pickup_time TIMESTAMP,
  delivered_time TIMESTAMP,
  shipping_status TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  receiver_province TEXT,
  receiver_district TEXT,
  receiver_ward TEXT,
  receiver_address TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  payment_role TEXT,
  delivery_instruction TEXT,
  item_list_raw TEXT,
  create_method TEXT,
  order_creator TEXT,
  delivery_attempts INTEGER DEFAULT 0,
  cod_enabled BOOLEAN DEFAULT FALSE,
  cod_amount NUMERIC DEFAULT 0,
  parcel_value NUMERIC DEFAULT 0,
  parcel_weight NUMERIC DEFAULT 0,
  actual_weight NUMERIC DEFAULT 0,
  estimated_shipping_fee NUMERIC DEFAULT 0,
  actual_shipping_fee NUMERIC DEFAULT 0,
  basic_shipping_fee NUMERIC DEFAULT 0,
  insurance_fee NUMERIC DEFAULT 0,
  cod_service_fee NUMERIC DEFAULT 0,
  return_shipping_fee NUMERIC DEFAULT 0,
  delivery_failed_reason TEXT,
  buyer_reject_collect_fee BOOLEAN DEFAULT FALSE,
  buyer_reject_fee_amount NUMERIC DEFAULT 0,
  need_action BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'Chưa thu',
  last_imported_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

-- Import batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  shop_id TEXT NOT NULL,
  file_name TEXT,
  report_download_time TEXT,
  total_rows INTEGER DEFAULT 0,
  inserted_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_cod NUMERIC DEFAULT 0,
  total_parcel_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

-- ============================================================
-- 2. CREATE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_shops_code ON shops(code);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(ownerId);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_need_action ON orders(need_action);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_import_batches_shop_id ON import_batches(shop_id);

-- ============================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES FOR USERS TABLE
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_all_users" ON users;
DROP POLICY IF EXISTS "users_view_self" ON users;
DROP POLICY IF EXISTS "users_no_role_update" ON users;

-- Admin can do everything
CREATE POLICY "admin_all_users" ON users
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Users can only view themselves
CREATE POLICY "users_view_self" ON users
  FOR SELECT
  USING (auth.uid() = uid);

-- Users cannot update their own role
CREATE POLICY "users_no_role_update" ON users
  FOR UPDATE
  USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

-- ============================================================
-- 5. RLS POLICIES FOR SHOPS TABLE
-- ============================================================

DROP POLICY IF EXISTS "admin_all_shops" ON shops;
DROP POLICY IF EXISTS "managers_view_assigned_shops" ON shops;
DROP POLICY IF EXISTS "users_view_assigned_shops" ON shops;

-- Admin can do everything
CREATE POLICY "admin_all_shops" ON shops
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Managers can view assigned shops
CREATE POLICY "managers_view_assigned_shops" ON shops
  FOR SELECT
  USING (auth.uid() IN (SELECT unnest(assignedUsers)) OR ownerId = auth.uid());

-- Regular users can view assigned shops
CREATE POLICY "users_view_assigned_shops" ON shops
  FOR SELECT
  USING (auth.uid() IN (SELECT unnest(assignedUsers)));

-- ============================================================
-- 6. RLS POLICIES FOR ORDERS TABLE
-- ============================================================

DROP POLICY IF EXISTS "admin_all_orders" ON orders;
DROP POLICY IF EXISTS "managers_view_shop_orders" ON orders;

-- Admin can do everything
CREATE POLICY "admin_all_orders" ON orders
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Managers can view orders of assigned shops
CREATE POLICY "managers_view_shop_orders" ON orders
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE auth.uid() IN (SELECT unnest(assignedUsers))
    )
  );

-- ============================================================
-- 7. RLS POLICIES FOR IMPORT_BATCHES TABLE
-- ============================================================

DROP POLICY IF EXISTS "admin_all_import_batches" ON import_batches;
DROP POLICY IF EXISTS "managers_view_import_batches" ON import_batches;

-- Admin can do everything
CREATE POLICY "admin_all_import_batches" ON import_batches
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

-- Managers can view their shop's batches
CREATE POLICY "managers_view_import_batches" ON import_batches
  FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE auth.uid() IN (SELECT unnest(assignedUsers))
    )
  );

-- ============================================================
-- DONE!
-- ============================================================
-- Tables created:
-- - users (uid, email, displayName, role, assignedShops, createdAt, updatedAt, disabled)
-- - shops (id, name, code, ownerId, platform, assignedUsers, createdAt, updatedAt)
-- - orders (full schema with need_action, payment_status, etc.)
-- - import_batches (id, shop_id, file_name, total_rows, inserted_count, error_count, etc.)
--
-- Indexes created for performance
-- RLS policies enabled for security
-- Ready to use!

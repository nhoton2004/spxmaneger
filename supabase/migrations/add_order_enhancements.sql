-- ============================================================
-- ADD NEW COLUMNS FOR ENHANCED ORDER MANAGEMENT
-- ============================================================

-- 1. Add new columns to orders table
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS combined_status TEXT DEFAULT 'pending-no_cod',
ADD COLUMN IF NOT EXISTS cod_status TEXT DEFAULT 'no_cod',
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_profit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_updated_by TEXT,
ADD COLUMN IF NOT EXISTS updated_by_user_id TEXT;

-- 2. Create logs_import table for tracking imports
CREATE TABLE IF NOT EXISTS logs_import (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  import_batch_id TEXT UNIQUE,
  file_name TEXT NOT NULL,
  import_by TEXT NOT NULL,
  import_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_rows INTEGER DEFAULT 0,
  created_new INTEGER DEFAULT 0,
  updated_existing INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  shop_id TEXT NOT NULL
);

-- 3. Create logs_update table for tracking order updates
CREATE TABLE IF NOT EXISTS logs_update (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action TEXT DEFAULT 'manual'
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_combined_status ON orders(combined_status);
CREATE INDEX IF NOT EXISTS idx_orders_cod_status ON orders(cod_status);
CREATE INDEX IF NOT EXISTS idx_orders_tags ON orders USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_orders_last_updated_by ON orders(last_updated_by);
CREATE INDEX IF NOT EXISTS idx_logs_import_shop_id ON logs_import(shop_id);
CREATE INDEX IF NOT EXISTS idx_logs_import_import_at ON logs_import(import_at);
CREATE INDEX IF NOT EXISTS idx_logs_update_order_id ON logs_update(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_update_updated_at ON logs_update(updated_at);
CREATE INDEX IF NOT EXISTS idx_logs_update_updated_by ON logs_update(updated_by);

-- 5. Enable RLS for new tables
ALTER TABLE logs_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_update ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for logs_import
DROP POLICY IF EXISTS "admin_all_logs_import" ON logs_import;
DROP POLICY IF EXISTS "users_view_own_import_logs" ON logs_import;

CREATE POLICY "admin_all_logs_import" ON logs_import
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

CREATE POLICY "users_view_own_import_logs" ON logs_import
  FOR SELECT
  USING (shop_id IN (SELECT id FROM shops WHERE auth.uid() IN (SELECT unnest(assignedUsers))));

-- 7. RLS Policies for logs_update
DROP POLICY IF EXISTS "admin_all_logs_update" ON logs_update;
DROP POLICY IF EXISTS "users_view_shop_logs_update" ON logs_update;

CREATE POLICY "admin_all_logs_update" ON logs_update
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

CREATE POLICY "users_view_shop_logs_update" ON logs_update
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE shop_id IN (
        SELECT id FROM shops WHERE auth.uid() IN (SELECT unnest(assignedUsers))
      )
    )
  );

-- 8. Combined status update trigger (optional, for auto-calculation)
CREATE OR REPLACE FUNCTION update_combined_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate combined_status from shipping_status + cod_status
  IF NEW.shipping_status IS NOT NULL AND NEW.cod_status IS NOT NULL THEN
    NEW.combined_status := NEW.shipping_status || '-' || NEW.cod_status;
  END IF;
  
  -- Calculate total_fee
  NEW.total_fee := COALESCE(NEW.actual_shipping_fee, 0) + 
                   COALESCE(NEW.return_shipping_fee, 0) +
                   COALESCE(NEW.cod_service_fee, 0);
  
  -- Calculate estimated_profit (simplified: cod_amount - total_fee)
  IF NEW.cod_amount > 0 THEN
    NEW.estimated_profit := NEW.cod_amount - NEW.total_fee;
  ELSE
    NEW.estimated_profit := 0 - NEW.total_fee;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_combined_status ON orders;
CREATE TRIGGER trigger_update_combined_status
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_combined_status();

-- Done!

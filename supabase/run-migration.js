#!/usr/bin/env node

/**
 * Auto-run Supabase migration to add missing columns
 * Usage: node supabase/run-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migration = `
-- Add missing columns to orders table if not exist
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS need_action BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Chưa thu',
ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

-- Create import_batches table if not exist
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

-- Add indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_need_action ON orders(need_action);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_import_batches_shop_id ON import_batches(shop_id);

-- Enable RLS
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- RLS policy for import_batches
CREATE POLICY "admin_all_import_batches" ON import_batches
  FOR ALL
  USING (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT uid FROM users WHERE role = 'admin'));

CREATE POLICY "managers_view_import_batches" ON import_batches
  FOR SELECT
  USING (shop_id IN (SELECT unnest(assignedShops) FROM users WHERE uid = auth.uid()));
`;

async function runMigration() {
  try {
    console.log('🔄 Running migration...');
    
    // Note: Supabase JS client doesn't have direct SQL execution
    // This is for reference - you need to run SQL in Supabase dashboard
    console.log('');
    console.log('❌ Supabase JS client cannot execute raw SQL directly.');
    console.log('');
    console.log('✅ Please run this SQL in Supabase dashboard:');
    console.log('');
    console.log('📋 Go to: https://app.supabase.com → Your Project → SQL Editor');
    console.log('');
    console.log('Copy and paste this SQL:');
    console.log('');
    console.log('---START SQL---');
    console.log(migration);
    console.log('---END SQL---');
    console.log('');
    console.log('Then click "Run"');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigration();

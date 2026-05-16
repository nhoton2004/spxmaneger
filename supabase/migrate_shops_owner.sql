-- ============================================================
-- Migration: Add owner_id + updated_at to shops table
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add owner_id column (nullable for backward compat with existing rows)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_id text;

-- 2. Add updated_at column
ALTER TABLE shops ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 3. Backfill updated_at for existing rows that don't have it
UPDATE shops SET updated_at = created_at WHERE updated_at IS NULL;

-- 4. (Optional) Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);

-- 5. Verify
SELECT id, name, owner_id, created_at, updated_at FROM shops LIMIT 10;

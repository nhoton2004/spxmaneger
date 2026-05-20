# Fix Lỗi PGRST204 - Cột need_action không tồn tại

## 🔧 Cách Fix

### Option 1: Chạy SQL trực tiếp trong Supabase (Nhanh nhất)

1. Vào https://app.supabase.com
2. Chọn project của bạn
3. Vào **SQL Editor** (sidebar trái)
4. Click **New query**
5. Copy toàn bộ SQL dưới đây paste vào:

```sql
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
```

6. Click **Run** (hoặc Ctrl+Enter)
7. Chờ xanh ✓ Complete

### Option 2: Dùng Supabase CLI

```bash
cd ~/Documents/Spxmanager/spx-order-tracker

supabase db push
```

---

## ✅ Kiểm tra sau khi fix

1. Vào **Table Editor** trong Supabase
2. Click vào table **orders**
3. Kiểm tra có cột **need_action** không
4. Nếu có → OK, lỗi đã fix

---

## 🔄 Sau khi fix, restart dev server

```bash
npm run dev
```

Rồi test import Excel lại.

---

## 📊 Cột được thêm:

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `need_action` | BOOLEAN | Đơn cần xử lý? |
| `payment_status` | TEXT | Trạng thái thanh toán |
| `last_imported_at` | TIMESTAMP | Lần import cuối |
| `import_batch_id` | TEXT | ID batch import |

---

## ❌ Nếu vẫn lỗi sau khi fix

Kiểm tra:

1. **RLS Policy**: Vào **Authentication > Policies** trong Supabase
   - Kiểm tra table `orders` có policy không
   - Nếu RLS bị lock → Admin/Public có thể access không

2. **Schema Cache**: 
   - Click **Refresh** trong Supabase SQL Editor
   - Hoặc đợi ~30s để cache refresh tự động

3. **Check Error**: Copy toàn bộ error message báo cho tôi

---

## 💡 Tại sao lỗi này xảy ra?

Supabase schema cache chưa được cập nhật vì:
- Table `orders` tồn tại nhưng cột `need_action` mới được thêm
- Supabase API cache vẫn có schema cũ
- Cần refresh hoặc chờ cache expire

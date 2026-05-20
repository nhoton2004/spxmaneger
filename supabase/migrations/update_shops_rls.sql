-- Cập nhật RLS cho bảng shops để người dùng có thể thêm/sửa/xóa shop của chính họ

-- Xóa policies cũ
DROP POLICY IF EXISTS "managers_view_assigned_shops" ON shops;
DROP POLICY IF EXISTS "users_view_assigned_shops" ON shops;
DROP POLICY IF EXISTS "users_insert_shops" ON shops;
DROP POLICY IF EXISTS "users_update_shops" ON shops;
DROP POLICY IF EXISTS "users_delete_shops" ON shops;

-- Users (bất kỳ ai đăng nhập) đều có thể xem shop mà họ là owner HOẶC được gán
CREATE POLICY "users_view_shops" ON shops
  FOR SELECT
  USING (auth.uid() = ownerId OR auth.uid() IN (SELECT unnest(assignedUsers)));

-- Users có thể INSERT shop mới (ownerId tự động là uid của họ)
CREATE POLICY "users_insert_shops" ON shops
  FOR INSERT
  WITH CHECK (auth.uid() = ownerId);

-- Users có thể UPDATE shop nếu họ là owner
CREATE POLICY "users_update_shops" ON shops
  FOR UPDATE
  USING (auth.uid() = ownerId)
  WITH CHECK (auth.uid() = ownerId);

-- Users có thể DELETE shop nếu họ là owner
CREATE POLICY "users_delete_shops" ON shops
  FOR DELETE
  USING (auth.uid() = ownerId);

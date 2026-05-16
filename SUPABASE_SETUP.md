# Setup Supabase cho SPX Order Tracker

## 1. Tạo Database Tables

Chạy SQL migration file trong Supabase SQL Editor:

```sql
-- Xem file: supabase/migrations/create_auth_tables.sql
```

Hoặc chạy qua CLI:
```bash
supabase db push
```

## 2. Cấu hình Supabase

### Bước 1: Tạo Project Supabase
- Truy cập https://app.supabase.com
- Tạo project mới
- Copy URL và Anon Key vào `.env.local`

### Bước 2: Enable Auth
- Vào Authentication > Providers
- Enable Email Provider
- Cấu hình Email settings nếu cần

### Bước 3: Tạo Tables
- Sử dụng SQL migration file hoặc tạo thủ công các bảng:
  - `users` - Lưu user profile
  - `shops` - Lưu shop info

### Bước 4: Enable RLS (Row Level Security)
- Các RLS policy đã được định nghĩa trong migration file
- Kiểm tra trong Database > Policies

## 3. Cấu trúc dữ liệu

### Users Table
```
uid (TEXT, PRIMARY KEY) - Firebase/Supabase user ID
email (TEXT, UNIQUE) - Email người dùng
displayName (TEXT) - Tên hiển thị
role (TEXT) - admin | manager | user
assignedShops (TEXT[]) - Mảng ID shop được gán
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
disabled (BOOLEAN) - Đã khóa tài khoản?
```

### Shops Table
```
id (TEXT, PRIMARY KEY) - UUID
name (TEXT) - Tên shop
code (TEXT, UNIQUE) - Mã shop (Shopee, TikTok, etc)
ownerId (TEXT) - UID của chủ shop
assignedUsers (TEXT[]) - Mảng UID user được gán
createdAt (TIMESTAMP)
updatedAt (TIMESTAMP)
```

## 4. Định nghĩa Role

### Admin
- Toàn quyền hệ thống
- Quản lý tất cả user
- Quản lý tất cả shop
- Đổi quyền user

### Manager
- Quản lý shop được gán
- Xem đơn hàng của shop
- Không thể đổi quyền
- Không thể xóa shop

### User
- Xem dữ liệu cá nhân
- Xem shop được gán
- Không thể xem user khác

## 5. Routing

### Public Routes
- `/login` - Trang đăng nhập
- `/register` - Trang đăng ký

### Protected Routes (Require Auth)
- `/dashboard` - Dashboard chính
- `/orders` - Quản lý đơn
- `/debts` - Công nợ
- `/import` - Import dữ liệu
- `/ai-assistant` - AI hỗ trợ
- `/reminders` - Nhắc nhở
- `/settings/shops` - Cài đặt

### Admin Only Routes
- `/admin` - Admin panel chính
- `/admin/users` - Quản lý user
- `/admin/shops` - Quản lý shop
- `/admin/roles` - Xem phân quyền

## 6. Auth Flow

1. User đăng ký/đăng nhập
2. Supabase Auth tạo user session
3. AuthContext fetch user profile từ `users` table
4. Nếu chưa có profile, tự động tạo profile mặc định
5. Sidebar hiển thị menu dựa theo role
6. ProtectedRoute kiểm tra quyền trước khi truy cập

## 7. Development

### Chạy local dev server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## 8. Troubleshooting

### Lỗi: "Supabase chưa được cấu hình"
- Kiểm tra file `.env.local` có URL và key không
- Kiểm tra biến môi trường: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

### Lỗi: "User không có quyền truy cập"
- Kiểm tra RLS policy có kích hoạt không
- Kiểm tra role của user trong database

### User bị login loop
- Kiểm tra auth state change listener trong AuthContext
- Kiểm tra ProtectedRoute redirect logic

## 9. Setup Demo

Để test nhanh:

1. Tạo tài khoản Admin đầu tiên thủ công:
   ```sql
   INSERT INTO users (uid, email, displayName, role)
   VALUES ('your-uid', 'admin@example.com', 'Admin', 'admin');
   ```

2. Đăng ký tài khoản thường qua UI
3. Admin vào `/admin/users` để quản lý
4. Thêm shop vào `/admin/shops`
5. Gán shop cho user

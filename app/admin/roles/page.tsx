'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shield } from 'lucide-react';

export default function AdminRolesPage() {
  const roles = [
    {
      name: 'Admin',
      description: 'Quản trị viên toàn bộ hệ thống',
      permissions: [
        'Xem tất cả tài khoản',
        'Thêm/sửa/xóa tài khoản',
        'Đổi quyền tài khoản',
        'Quản lý toàn bộ shop',
        'Thêm/sửa/xóa shop',
        'Gán shop cho user',
        'Xem tất cả dữ liệu',
      ],
    },
    {
      name: 'Manager',
      description: 'Quản lý cấp cao',
      permissions: [
        'Xem shop được gán',
        'Quản lý đơn hàng của shop',
        'Xem dữ liệu shop',
        'Không thể đổi quyền user',
        'Không thể xóa shop',
      ],
    },
    {
      name: 'User',
      description: 'Người dùng thường',
      permissions: [
        'Xem dữ liệu cá nhân',
        'Xem shop được gán',
        'Không thể xem user khác',
        'Không thể quản lý quyền',
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Quản lý phân quyền</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.name} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {role.permissions.map((permission, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{permission}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle>Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Role được gán khi tạo tài khoản là <strong>User</strong> mặc định</li>
              <li>• Admin có thể thay đổi quyền của người dùng bất kỳ lúc nào</li>
              <li>• Manager có thể quản lý dữ liệu của shop được gán nhưng không thể quản lý quyền</li>
              <li>• User chỉ có thể xem dữ liệu cá nhân và shop được gán</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

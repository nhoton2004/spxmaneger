'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Store, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const modules = [
    {
      title: 'Quản lý người dùng',
      description: 'Quản lý tài khoản, quyền hạn và phân công shop',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Quản lý shop',
      description: 'Thêm, sửa, xóa shop và gán cho user',
      icon: Store,
      href: '/admin/shops',
      color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Phân quyền',
      description: 'Xem chi tiết các quyền theo role',
      icon: Lock,
      href: '/admin/roles',
      color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card className="border-none shadow-sm hover:shadow-lg transition-all cursor-pointer h-full">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-4`}>
                  <module.icon size={24} />
                </div>
                <CardTitle>{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{module.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

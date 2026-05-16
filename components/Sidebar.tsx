'use client';

import Link from 'next/link';
import { LayoutDashboard, ShoppingBag, CreditCard, Upload, Bell, Settings, Bot, Users, Store, Lock, LogOut } from 'lucide-react';
import ShopSelector from './ShopSelector';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const { userProfile, user, signOut, loading } = useAuth();
  const router = useRouter();

  const commonMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Đơn hàng', icon: ShoppingBag, href: '/orders' },
    { name: 'Công nợ', icon: CreditCard, href: '/debts' },
    { name: 'Import Excel', icon: Upload, href: '/import' },
    { name: 'AI trả lời khách', icon: Bot, href: '/ai-assistant' },
    { name: 'Nhắc nhở', icon: Bell, href: '/reminders' },
    { name: 'Cài đặt', icon: Settings, href: '/settings/shops' },
  ];

  const adminMenuItems = [
    { name: 'Quản lý người dùng', icon: Users, href: '/admin/users' },
    { name: 'Quản lý shop', icon: Store, href: '/admin/shops' },
    { name: 'Phân quyền', icon: Lock, href: '/admin/roles' },
  ];

  const menuItems = userProfile?.role === 'admin' 
    ? [...commonMenuItems, ...adminMenuItems]
    : commonMenuItems;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const roleDisplay = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    user: 'Người dùng',
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0">
        <div className="font-bold text-2xl mb-8 mt-4 px-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          SPX Tracker
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0">
      <div className="font-bold text-2xl mb-8 mt-4 px-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        SPX Tracker
      </div>
      
      {userProfile?.role === 'manager' && <ShopSelector />}

      <nav className="flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {getInitials(userProfile?.displayName, userProfile?.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{userProfile?.displayName || user?.email}</div>
            <div className="text-xs text-gray-400 truncate">{roleDisplay[userProfile?.role || 'user']}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
        >
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useAuth, UserRole } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const BYPASS_AUTH = true;

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (BYPASS_AUTH) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (requiredRole && userProfile?.role !== requiredRole) {
      router.push('/dashboard?error=unauthorized');
      return;
    }
  }, [user, userProfile, loading, requiredRole, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && userProfile?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg font-semibold mb-4">
            Bạn không có quyền truy cập trang này
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

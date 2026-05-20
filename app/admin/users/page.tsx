'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/context/AuthContext';
import { Plus, Edit2, Trash2, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface Shop {
  id: string;
  name: string;
  code: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form State
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  
  const supabase = getSupabase();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [usersResponse, shopsResponse] = await Promise.all([
        supabase.from('users').select('*').order('createdAt', { ascending: false }),
        supabase.from('shops').select('id, name, code')
      ]);

      if (usersResponse.error) console.error('Error fetching users:', usersResponse.error);
      if (shopsResponse.error) console.error('Error fetching shops:', shopsResponse.error);

      setUsers(usersResponse.data || []);
      setShops(shopsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole, updatedAt: new Date().toISOString() })
        .eq('uid', editingUser.uid);

      if (error) {
        console.error('Error updating role:', error);
        return;
      }

      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, role: selectedRole } : u));
      setShowRoleModal(false);
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleUpdateShops = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ assignedShops: selectedShops, updatedAt: new Date().toISOString() })
        .eq('uid', editingUser.uid);

      if (error) {
        console.error('Error updating assigned shops:', error);
        return;
      }

      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, assignedShops: selectedShops } : u));
      setShowShopModal(false);
    } catch (err) {
      console.error('Error updating assigned shops:', err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Bạn chắc chắn muốn khóa người dùng này?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ disabled: true, updatedAt: new Date().toISOString() })
        .eq('uid', uid);

      if (error) {
        console.error('Error deleting user:', error);
        return;
      }

      setUsers(users.filter(u => u.uid !== uid));
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const toggleShopSelection = (shopId: string) => {
    setSelectedShops(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  const roleOptions: UserRole[] = ['admin', 'manager', 'user'];
  const roleDisplay = { admin: 'Quản trị viên', manager: 'Quản lý', user: 'Người dùng' };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Quản lý người dùng</h1>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý người dùng</h1>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Chưa có người dùng nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tên / Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Quyền</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Shop được gán</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4">
                        <div className="text-gray-900 dark:text-gray-100 font-medium">{user.displayName || 'N/A'}</div>
                        <div className="text-gray-500 text-sm">{user.email}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {roleDisplay[user.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {user.assignedShops && user.assignedShops.length > 0 ? (
                            user.assignedShops.map(shopId => {
                              const shop = shops.find(s => s.id === shopId);
                              return (
                                <span key={shopId} className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                  {shop?.name || shopId.substring(0,6)}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-gray-400 italic">Chưa gán</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            title="Gán shop"
                            onClick={() => {
                              setEditingUser(user);
                              setSelectedShops(user.assignedShops || []);
                              setShowShopModal(true);
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg transition"
                          >
                            <Store size={18} />
                          </button>
                          <button
                            title="Đổi quyền"
                            onClick={() => {
                              setEditingUser(user);
                              setSelectedRole(user.role);
                              setShowRoleModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            title="Khóa/Xóa"
                            onClick={() => handleDeleteUser(user.uid)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Đổi quyền: {editingUser?.displayName}</h2>
            <div className="space-y-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {roleOptions.map(role => (
                  <option key={role} value={role}>{roleDisplay[role]}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
                >Hủy</button>
                <button
                  onClick={handleUpdateRole}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >Cập nhật</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Gán Shop cho: <span className="text-blue-600">{editingUser?.displayName}</span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">Check để thêm shop, bỏ check để xóa shop khỏi tài khoản.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6 p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              {shops.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Chưa có shop nào trong hệ thống</p>
              ) : (
                shops.map(shop => (
                  <label key={shop.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedShops.includes(shop.id)}
                      onChange={() => toggleShopSelection(shop.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{shop.name}</div>
                      <div className="text-xs text-gray-500">{shop.code}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShopModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
              >Hủy</button>
              <button
                onClick={handleUpdateShops}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >Lưu cấu hình Shop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

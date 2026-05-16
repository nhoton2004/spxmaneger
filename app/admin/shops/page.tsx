'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface Shop {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  assignedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const supabase = getSupabase();

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Error fetching shops:', error);
        return;
      }

      setShops(data || []);
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    try {
      const newShop = {
        name: formData.name,
        code: formData.code,
        ownerId: '',
        assignedUsers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('shops')
        .insert([newShop])
        .select();

      if (error) {
        console.error('Error adding shop:', error);
        return;
      }

      setShops([...(data || []), ...shops]);
      setShowModal(false);
      setFormData({ name: '', code: '' });
    } catch (err) {
      console.error('Error adding shop:', err);
    }
  };

  const handleDeleteShop = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa shop này?')) return;

    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shop:', error);
        return;
      }

      setShops(shops.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting shop:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Quản lý shop</h1>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý shop</h1>
        <button
          onClick={() => {
            setEditingShop(null);
            setFormData({ name: '', code: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Thêm shop
        </button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Danh sách shop ({shops.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {shops.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có shop nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Tên shop</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Mã shop</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">User được gán</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Ngày tạo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{shop.name}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{shop.code}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-sm">
                        {shop.assignedUsers?.length > 0 ? shop.assignedUsers.length : 0}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-sm">
                        {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingShop(shop);
                              setFormData({ name: shop.name, code: shop.code });
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteShop(shop.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingShop ? 'Sửa shop' : 'Thêm shop'}
            </h2>
            <form onSubmit={handleAddShop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên shop
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mã shop
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingShop ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

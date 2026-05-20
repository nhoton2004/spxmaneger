'use client';

import { useShop } from '@/context/ShopContext';
import { useAuth } from '@/context/AuthContext';
import { shopService } from '@/src/services/shopService';
import { Plus, Store, Check, ChevronsUpDown, Trash2, Edit2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ShopSelector() {
  const { shops, selectedShopId, setSelectedShopId, refreshShops } = useShop();
  const { userProfile } = useAuth();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [newShopName, setNewShopName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Checking permissions
  const isAdmin = userProfile?.role === 'admin';

  const selectedShop = shops.find(s => s.id === selectedShopId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingShopId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddShop = async () => {
    if (!newShopName.trim()) return;
    setErrorMsg(null);
    try {
      const created = shopService.create({ name: newShopName.trim(), platform: 'spx' });
      if (created?.id) {
        await refreshShops();
        setSelectedShopId(created.id);
        setNewShopName('');
        setIsAdding(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error adding shop:', error);
      setErrorMsg((error as Error).message || 'Không thêm được shop');
    }
  };
  
  const handleEditShop = async (shopId: string, currentName: string) => {
    if (!newShopName.trim() || newShopName === currentName) {
      setEditingShopId(null);
      return;
    }
    setErrorMsg(null);
    try {
      const updated = shopService.update(shopId, { name: newShopName.trim() });
      if (!updated) {
        setErrorMsg('Không sửa được shop');
        return;
      }
      await refreshShops();
      setEditingShopId(null);
    } catch (error) {
      console.error('Error updating shop:', error);
      setErrorMsg((error as Error).message || 'Không sửa được shop');
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm('Bạn có chắc muốn xoá shop này?')) return;
    setErrorMsg(null);
    try {
      shopService.remove(shopId);
      await refreshShops();
      if (selectedShopId === shopId) {
        setSelectedShopId(shops.length > 1 ? shops.find(s => s.id !== shopId)?.id || null : null);
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
      setErrorMsg((error as Error).message || 'Không xoá được shop');
    }
  };

  return (
    <div className="relative px-4 mb-6" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2 truncate">
          <Store size={16} className="text-blue-400 flex-shrink-0" />
          <span className="truncate">{selectedShop ? selectedShop.name : (shops.length === 0 ? 'Chưa có shop' : 'Chọn Shop...')}</span>
        </div>
        <ChevronsUpDown size={14} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100] py-1 max-h-80 overflow-y-auto">
          {errorMsg && (
            <div className="px-3 py-2 text-xs text-red-300 bg-red-900/20 border-b border-red-900/30">
              {errorMsg}
            </div>
          )}
          {shops.length === 0 && !isAdding && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              Chưa có shop nào, hãy bấm Thêm shop.
            </div>
          )}

          {shops.map((shop) => {
            const canManage = true;
            return (
              <div key={shop.id} className="relative group">
                {editingShopId === shop.id ? (
                   <div className="p-2 space-y-2 border-b border-gray-700">
                     <input
                       autoFocus
                       type="text"
                       value={newShopName}
                       onChange={(e) => setNewShopName(e.target.value)}
                       className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
                       onKeyDown={(e) => e.key === 'Enter' && handleEditShop(shop.id, shop.name)}
                     />
                     <div className="flex gap-2">
                       <button onClick={() => handleEditShop(shop.id, shop.name)} className="flex-1 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded">Lưu</button>
                       <button onClick={() => setEditingShopId(null)} className="flex-1 py-1 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded">Hủy</button>
                     </div>
                   </div>
                ) : (
                  <div className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-700 transition cursor-pointer">
                    <div
                      onClick={() => {
                        setSelectedShopId(shop.id);
                        setIsOpen(false);
                      }}
                      className="flex-1 text-left truncate text-gray-300 hover:text-white"
                    >
                      <span className="truncate">{shop.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {selectedShopId === shop.id && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                      
                      {/* Người tạo shop hoặc Admin có quyền sửa xóa trực tiếp */}
                      {canManage && (
                        <div className="hidden group-hover:flex gap-1 ml-2 bg-gray-700 rounded p-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setNewShopName(shop.name); setEditingShopId(shop.id); }} 
                            className="text-gray-400 hover:text-blue-400"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteShop(shop.id); }} 
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Mọi người đều có thể thêm shop mới */}
          <div className="border-t border-gray-700 mt-1">
            {isAdding ? (
              <div className="p-2 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="Tên shop mới..."
                  className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShop()}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddShop} className="flex-1 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded">Lưu</button>
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-1 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded">Hủy</button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewShopName('');
                  setIsAdding(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 transition"
              >
                <Plus size={14} />
                <span>Thêm shop</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useShop } from '@/context/ShopContext';
import { Plus, Store, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

export default function ShopSelector() {
  const { shops, selectedShopId, setSelectedShopId, refreshShops } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newShopName, setNewShopName] = useState('');

  const selectedShop = shops.find(s => s.id === selectedShopId);

  const handleAddShop = async () => {
    if (!newShopName.trim()) return;
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newShopName, platform: 'spx' }),
      });
      const data = await res.json();
      if (data.id) {
        await refreshShops();
        setSelectedShopId(data.id);
        setNewShopName('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error adding shop:', error);
    }
  };

  return (
    <div className="relative px-4 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition"
      >
        <div className="flex items-center gap-2 truncate">
          <Store size={16} className="text-blue-400 flex-shrink-0" />
          <span className="truncate">{selectedShop ? selectedShop.name : 'Chọn Shop...'}</span>
        </div>
        <ChevronsUpDown size={14} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
          {shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => {
                setSelectedShopId(shop.id);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-700 text-gray-300 hover:text-white transition"
            >
              <span className="truncate">{shop.name}</span>
              {selectedShopId === shop.id && <Check size={14} className="text-emerald-500" />}
            </button>
          ))}
          
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
                onClick={() => setIsAdding(true)}
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

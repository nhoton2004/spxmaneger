'use client';

/**
 * ShopSelector.tsx
 * ─────────────────────────────────────────────────────────────
 * Full shop management UI:
 *  - Dropdown to select active shop
 *  - Each item has Edit & Delete buttons
 *  - "+ Thêm shop" opens ShopModal in Add mode
 *  - Edit button opens ShopModal in Edit mode
 *  - Delete shows inline confirmation before executing
 *
 * Props:
 *   selectedShopId   - controlled value from parent
 *   onShopChange     - callback when selection changes
 *   userId           - current user UID (null = unauthenticated)
 *   isAdmin          - admin override
 */

import { useState } from 'react';
import {
  Store, Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronDown,
} from 'lucide-react';
import { useShops, type Shop } from '@/lib/useShops';
import ShopModal from './ShopModal';

interface Props {
  selectedShopId: string;
  onShopChange: (shopId: string) => void;
  userId: string | null;
  isAdmin?: boolean;
}

type ModalState =
  | { type: 'closed' }
  | { type: 'add' }
  | { type: 'edit'; shop: Shop };

export default function ShopSelector({ selectedShopId, onShopChange, userId, isAdmin = false }: Props) {
  const { shops, loading, error, addShop, updateShop, deleteShop } = useShops({ userId, isAdmin });
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────

  const handleAdd = async (name: string) => {
    const newShop = await addShop(name);
    onShopChange(newShop.id);
  };

  const handleEdit = async (name: string) => {
    if (modal.type !== 'edit') return;
    await updateShop(modal.shop.id, name);
  };

  const handleDeleteRequest = (shopId: string) => {
    setDeleteConfirmId(shopId);
  };

  const handleDeleteConfirm = async (shopId: string) => {
    setDeletingId(shopId);
    setDeleteConfirmId(null);
    try {
      await deleteShop(shopId);
      // If the deleted shop was selected, fall back to first remaining
      if (selectedShopId === shopId) {
        const remaining = shops.filter((s) => s.id !== shopId);
        onShopChange(remaining.length > 0 ? remaining[0].id : '');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Selector row */}
      <div className="flex gap-2 items-center">
        {/* Dropdown */}
        <div className="relative flex-1">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Đang tải...
            </div>
          ) : (
            <div className="relative">
              <Store
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                value={selectedShopId}
                onChange={(e) => onShopChange(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer text-sm appearance-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn shop --</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Add button */}
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition font-medium whitespace-nowrap"
        >
          <Plus size={15} />
          Thêm shop
        </button>
      </div>

      {/* Per-shop edit / delete row */}
      {!loading && shops.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
            Quản lý shop
          </p>
          {shops.map((shop) => {
            const isDeleting = deletingId === shop.id;
            const isConfirming = deleteConfirmId === shop.id;

            return (
              <div
                key={shop.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                  ${selectedShopId === shop.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent'
                  }`}
              >
                {/* Shop name */}
                <div
                  className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate cursor-pointer"
                  onClick={() => onShopChange(shop.id)}
                >
                  <span className={selectedShopId === shop.id ? 'text-blue-600 dark:text-blue-400' : ''}>
                    {shop.name}
                  </span>
                </div>

                {/* Inline delete confirm */}
                {isConfirming ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-red-500 font-medium">Xóa shop này?</span>
                    <button
                      onClick={() => handleDeleteConfirm(shop.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Edit */}
                    <button
                      onClick={() => setModal({ type: 'edit', shop })}
                      className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      title="Sửa tên shop"
                      disabled={isDeleting}
                    >
                      <Pencil size={13} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRequest(shop.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      title="Xóa shop"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 size={13} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && shops.length === 0 && !error && (
        <p className="text-xs text-gray-400 text-center py-2">
          Chưa có shop nào. Bấm &quot;+ Thêm shop&quot; để bắt đầu.
        </p>
      )}

      {/* Modals */}
      {modal.type === 'add' && (
        <ShopModal
          onConfirm={handleAdd}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
      {modal.type === 'edit' && (
        <ShopModal
          initialName={modal.shop.name}
          onConfirm={handleEdit}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}
    </div>
  );
}

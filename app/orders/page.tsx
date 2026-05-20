'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { orderService } from '@/src/services/orderService';

interface Order {
  id: string;
  tracking_code: string;
  customer_reference_no: string | null;
  shop_id: string;
  order_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  cod_amount: number;
  actual_shipping_fee: number;
  shipping_status: string | null;
  delivery_failed_reason: string | null;
  need_action: boolean;
  payment_status: string;
}

const STATUS_BADGE: Record<string, string> = {
  'Đã giao hàng': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Đang vận chuyển': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Lấy hàng không thành công': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Đang trả hàng': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Đã trả hàng': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Đã hủy': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const SPX_STATUSES = ['Đã giao hàng', 'Đang vận chuyển', 'Lấy hàng không thành công', 'Đang trả hàng', 'Đã trả hàng', 'Đã hủy'];

export default function OrdersPage() {
  const { selectedShopId, shops } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [shopMap, setShopMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const LIMIT = 20;

  useEffect(() => {
    if (selectedShopId) setShopFilter(selectedShopId);
  }, [selectedShopId]);

  useEffect(() => {
    const m: Record<string, string> = {};
    shops.forEach((s) => { m[s.id] = s.name; });
    setShopMap(m);
  }, [shops]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
       const result = orderService.query({
         page,
         limit: LIMIT,
         search,
         shopId: shopFilter || undefined,
         status: statusFilter || undefined,
         from: undefined,
         to: undefined,
       });
      const mapped = (result.data || []).map((r: any) => ({
        id: r.id,
        tracking_code: r.trackingCode,
        customer_reference_no: r.orderCode,
        shop_id: r.shopId,
        order_date: r.createdAt,
        customer_name: r.customerName,
        customer_phone: null,
        cod_amount: r.codAmount,
        actual_shipping_fee: 0,
        shipping_status: r.status,
        delivery_failed_reason: null,
        need_action: !!r.needAction,
        payment_status: 'Chưa thu',
      }));
      setOrders(mapped as Order[]);
      setTotal(result.total || 0);
    } catch {
      setOrders([]);
    } finally { setLoading(false); }
  }, [page, search, shopFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Danh sách đơn hàng</h1>
            <p className="text-sm text-gray-500 mt-1">{total.toLocaleString('vi-VN')} đơn</p>
          </div>
          <Link href="/import" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
            + Import SPX
          </Link>
        </div>

        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Tìm mã vận đơn, mã Shopee, tên/SĐT khách..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
            <select value={shopFilter} onChange={e => { setShopFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer">
              <option value="">Tất cả Shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer">
              <option value="">Tất cả trạng thái</option>
              {SPX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => { setSearch(''); setShopFilter(selectedShopId || ''); setStatusFilter(''); setPage(1); }}
              className="p-2 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition" title="Xóa bộ lọc">
              <Filter size={18} />
            </button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-blue-500" size={36} /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-medium">Không có đơn hàng nào</p>
              <p className="text-sm mt-1">Hãy <Link href="/import" className="text-blue-500 hover:underline">import file SPX</Link> để bắt đầu.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">Mã vận đơn SPX</th>
                      <th className="p-4 font-medium">Mã Shopee</th>
                      <th className="p-4 font-medium">Khách hàng</th>
                      <th className="p-4 font-medium">Shop</th>
                      <th className="p-4 font-medium">Ngày tạo</th>
                      <th className="p-4 font-medium">COD</th>
                      <th className="p-4 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {orders.map(o => (
                      <tr key={o.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition ${o.need_action ? 'border-l-4 border-orange-400' : ''}`}>
                        <td className="p-4 font-mono text-sm text-blue-600 dark:text-blue-400">{o.tracking_code}</td>
                        <td className="p-4 text-xs text-gray-500">{o.customer_reference_no || '—'}</td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{o.customer_phone || ''}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{shopMap[o.shop_id] || '—'}</td>
                        <td className="p-4 text-sm text-gray-500">{o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—'}</td>
                        <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {o.cod_amount ? o.cod_amount.toLocaleString('vi-VN') + 'đ' : '—'}
                        </td>
                        <td className="p-4">
                          {o.shipping_status ? (
                            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${STATUS_BADGE[o.shipping_status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {o.shipping_status}
                            </span>
                          ) : '—'}
                          {o.delivery_failed_reason && (
                            <p className="text-xs text-orange-500 mt-1">{o.delivery_failed_reason}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                  <span>Trang {page} / {totalPages} ({total.toLocaleString('vi-VN')} đơn)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

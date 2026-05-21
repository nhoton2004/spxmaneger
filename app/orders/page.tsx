'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, CalendarDays, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { orderService } from '@/src/services/orderService';

interface Order {
  id: string;
  trackingCode: string | null;
  orderCode: string | null;
  shopId: string;
  orderDate: string | null;
  customerName: string | null;
  customerPhone: string | null;
  codAmount: number;
  shippingFee: number;
  shippingStatus: string | null;
  status: string | null;
  deliveryFailedReason: string | null;
  needAction: boolean;
  province: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  'Đã giao hàng': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Đang vận chuyển': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  shipping: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Lấy hàng không thành công': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pickup_failed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Đang trả hàng': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  returning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Đã trả hàng': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  returned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Đã hủy': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const SPX_STATUSES = [
  'Đã giao hàng', 'Đang vận chuyển',
  'Lấy hàng không thành công', 'Đang trả hàng',
  'Đã trả hàng', 'Đã hủy',
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
}

export default function OrdersPage() {
  const { selectedShopId, shops } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCod, setTotalCod] = useState(0);
  const [shopMap, setShopMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const LIMIT = 20;

  useEffect(() => {
    if (selectedShopId) setShopFilter(selectedShopId);
  }, [selectedShopId]);

  useEffect(() => {
    const m: Record<string, string> = {};
    shops.forEach(s => { m[s.id] = s.name; });
    setShopMap(m);
  }, [shops]);

   const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = orderService.query({
        page,
        limit: LIMIT,
        search: search || undefined,
        shopId: shopFilter || undefined,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      const data = result.data || [];
      const mapped = data.map((r: any) => ({
        id: r.id,
        trackingCode: r.trackingCode,
        orderCode: r.orderCode,
        shopId: r.shopId,
        orderDate: r.createdAt,
        customerName: r.customerName || r.receiverName,
        customerPhone: r.customerPhone || r.receiverPhone,
        codAmount: r.codAmount,
        shippingFee: r.actualShippingFee || r.shippingFee,
        shippingStatus: r.status || r.rawStatus,
        deliveryFailedReason: r.failedReason || r.deliveryFailedReason,
        needAction: !!r.needAction,
        paymentStatus: 'Chưa thu',
      }));

      setOrders(mapped as Order[]);
      setTotal(result.total || 0);

      // Tính tổng COD cho kết quả hiện tại
      const cod = data.reduce((s: number, r: any) => s + Number((r as any).codAmount || 0), 0);
      setTotalCod(cod);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, shopFilter, statusFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // Listen for import events
  useEffect(() => {
    const handleImport = () => { setPage(1); load(); };
    window.addEventListener('spx_orders_updated', handleImport);
    return () => window.removeEventListener('spx_orders_updated', handleImport);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setShopFilter(selectedShopId || '');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Danh sách đơn hàng</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total.toLocaleString('vi-VN')} đơn
              {totalCod > 0 && (
                <span className="ml-2 text-emerald-600 font-semibold">
                  • COD: {totalCod.toLocaleString('vi-VN')}đ
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <Link
              href="/import"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              + Import SPX
            </Link>
          </div>
        </div>

        <Card className="mb-4 border-none shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Row 1: search + shop + status + clear */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm mã vận đơn, mã đơn, tên/SĐT khách..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <select
                value={shopFilter}
                onChange={e => { setShopFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer"
              >
                <option value="">Tất cả Shop</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                {SPX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={clearFilters}
                className="p-2 bg-gray-100 dark:bg-gray-900 text-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                title="Xóa bộ lọc"
              >
                <X size={18} />
              </button>
            </div>

            {/* Row 2: date range */}
            <div className="flex flex-wrap gap-3 items-center">
              <CalendarDays size={16} className="text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Từ:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Đến:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                >
                  <X size={12} /> Xóa lọc ngày
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-blue-500" size={36} />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-medium">Không có đơn hàng nào</p>
              <p className="text-sm mt-1">
                Hãy <Link href="/import" className="text-blue-500 hover:underline">import file SPX</Link> để bắt đầu.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-4 font-medium">Mã vận đơn SPX</th>
                      <th className="p-4 font-medium">Mã đơn</th>
                      <th className="p-4 font-medium">Khách hàng</th>
                      <th className="p-4 font-medium">Shop</th>
                      <th className="p-4 font-medium">Ngày tạo</th>
                      <th className="p-4 font-medium">COD</th>
                      <th className="p-4 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {orders.map((o, i) => {
                      const status = o.shippingStatus || o.status;
                      return (
                        <tr
                          key={o.id || o.trackingCode || i}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition ${o.needAction ? 'border-l-4 border-orange-400' : ''}`}
                        >
                          <td className="p-4 font-mono text-sm text-blue-600 dark:text-blue-400">
                            {o.trackingCode || '—'}
                          </td>
                          <td className="p-4 text-xs text-gray-500">{o.orderCode || '—'}</td>
                          <td className="p-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.customerName || '—'}</p>
                            {o.customerPhone && (
                              <p className="text-xs text-gray-500">{o.customerPhone}</p>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {shopMap[o.shopId] || o.shopId || '—'}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{fmtDate(o.orderDate)}</td>
                          <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {o.codAmount ? o.codAmount.toLocaleString('vi-VN') + 'đ' : '—'}
                          </td>
                          <td className="p-4">
                            {status ? (
                              <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                {status}
                              </span>
                            ) : '—'}
                            {o.deliveryFailedReason && (
                              <p className="text-xs text-orange-500 mt-1">{o.deliveryFailedReason}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
                  <span>
                    Trang {page} / {totalPages} ({total.toLocaleString('vi-VN')} đơn)
                    {totalCod > 0 && ` • COD trang này: ${totalCod.toLocaleString('vi-VN')}đ`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                    >
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

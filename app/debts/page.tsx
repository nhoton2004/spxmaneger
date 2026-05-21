'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Download, Loader2, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { orderService } from '@/src/services/orderService';
import { shopService } from '@/src/services/shopService';

interface DebtOrder {
  id: string;
  tracking_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  shop_id: string;
  order_date: string;
  cod_amount: number;
  actual_shipping_fee: number;
  shipping_status: string | null;
  payment_status: string;
}
interface Shop { id: string; name: string; }

export default function DebtsPage() {
  const [orders, setOrders] = useState<DebtOrder[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopMap, setShopMap] = useState<Record<string, string>>({});
  const [shopFilter, setShopFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const q = (orderService as any).query({ shopId: shopFilter || undefined, limit: 1000, page: 1 });
      let rows: DebtOrder[] = (q.data || []).map((r: any) => ({
        id: r.id,
        tracking_code: r.trackingCode,
        customer_name: r.customerName,
        customer_phone: null,
        shop_id: r.shopId,
        order_date: r.createdAt,
        cod_amount: Number(r.codAmount || 0),
        actual_shipping_fee: 0,
        shipping_status: r.status,
        payment_status: 'Chưa thu',
      }));
      rows = rows.filter(o => (o.cod_amount || 0) > 0);
      if (paymentFilter) rows = rows.filter(o => o.payment_status === paymentFilter);
      setOrders(rows);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [shopFilter, paymentFilter]);

  useEffect(() => {
    const data = shopService.list();
    setShops(data);
    const m: Record<string, string> = {};
    data.forEach((s: Shop) => { m[s.id] = s.name; });
    setShopMap(m);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCod = orders.reduce((s, o) => s + (o.cod_amount || 0), 0);
  const paidCod = orders.filter(o => o.payment_status === 'Đã thu').reduce((s, o) => s + (o.cod_amount || 0), 0);
  const pendingCod = totalCod - paidCod;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Công nợ COD</h1>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <p className="text-blue-100 font-medium mb-1">Tổng COD dự thu</p>
              <h3 className="text-3xl font-bold">{loading ? '...' : totalCod.toLocaleString('vi-VN') + 'đ'}</h3>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <p className="text-emerald-100 font-medium mb-1">Đã đối soát & thu</p>
              <h3 className="text-3xl font-bold">{loading ? '...' : paidCod.toLocaleString('vi-VN') + 'đ'}</h3>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <p className="text-orange-100 font-medium mb-1">Chờ đối soát / Chưa thu</p>
              <h3 className="text-3xl font-bold">{loading ? '...' : pendingCod.toLocaleString('vi-VN') + 'đ'}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-4 flex gap-3">
            <select value={shopFilter} onChange={e => setShopFilter(e.target.value)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer text-sm">
              <option value="">Tất cả Shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer text-sm">
              <option value="">Tất cả trạng thái</option>
              <option value="Chưa thu">Chưa thu / Chờ đối soát</option>
              <option value="Đã thu">Đã thu</option>
            </select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>Không có đơn COD nào. Hãy <Link href="/import" className="text-blue-500 hover:underline">import file SPX</Link>.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <th className="p-4 font-medium">Mã vận đơn</th>
                    <th className="p-4 font-medium">Khách hàng</th>
                    <th className="p-4 font-medium">Shop</th>
                    <th className="p-4 font-medium">Ngày tạo</th>
                    <th className="p-4 font-medium">COD</th>
                    <th className="p-4 font-medium">Vận chuyển</th>
                    <th className="p-4 font-medium">Đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                      <td className="p-4 font-mono text-sm text-blue-600 dark:text-blue-400">{o.tracking_code}</td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.customer_name || '—'}</p>
                        <p className="text-xs text-gray-500">{o.customer_phone || ''}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{shopMap[o.shop_id] || '—'}</td>
                      <td className="p-4 text-sm text-gray-500">{o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{o.cod_amount.toLocaleString('vi-VN')}đ</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{o.shipping_status || '—'}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${o.payment_status === 'Đã thu' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {o.payment_status === 'Đã thu' ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {o.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

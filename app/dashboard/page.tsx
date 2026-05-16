'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, TrendingUp, AlertCircle, Truck, RefreshCw, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';

interface Stats {
  totalToday: number;
  totalOrders: number;
  totalCod: number;
  totalShippingFee: number;
  totalReturnFee: number;
  codPendingReconcile: number;
  needActionCount: number;
  statusBreakdown: Record<string, number>;
}

function money(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

export default function DashboardPage() {
  const { selectedShopId } = useShop();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [urgentOrders, setUrgentOrders] = useState<{ tracking_code: string; shipping_status: string; delivery_failed_reason?: string }[]>([]);

  const load = async () => {
    if (!selectedShopId) {
      setStats(null);
      setUrgentOrders([]);
      return;
    }
    setLoading(true);
    try {
      const ts = Date.now();
      const q = `?shop_id=${selectedShopId}&t=${ts}`;

      const [sRes, oRes] = await Promise.all([
        fetch(`/api/dashboard${q}`),
        fetch(`/api/orders${q}&page=1`),
      ]);
      const s = await sRes.json();
      if (!s.error) setStats(s);
      const o = await oRes.json();
      setUrgentOrders((o.data || []).filter((x: { need_action: boolean }) => x.need_action).slice(0, 5));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedShopId]);

  const statCards = [
    { title: 'Tổng đơn', value: loading ? '...' : String(stats?.totalOrders ?? 0), icon: Package, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { title: 'Tổng COD', value: loading ? '...' : money(stats?.totalCod ?? 0) + 'đ', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { title: 'COD chờ đối soát', value: loading ? '...' : money(stats?.codPendingReconcile ?? 0) + 'đ', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
    { title: 'Cần xử lý', value: loading ? '...' : String(stats?.needActionCount ?? 0), icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/20' },
  ];

  const statusOrder = ['Đã giao hàng', 'Đang vận chuyển', 'Lấy hàng không thành công', 'Đang trả hàng', 'Đã trả hàng', 'Đã hủy'];
  const statusColor: Record<string, string> = {
    'Đã giao hàng': 'bg-emerald-500',
    'Đang vận chuyển': 'bg-blue-500',
    'Lấy hàng không thành công': 'bg-orange-500',
    'Đang trả hàng': 'bg-yellow-500',
    'Đã trả hàng': 'bg-purple-500',
    'Đã hủy': 'bg-red-500',
  };

  const breakdown = stats?.statusBreakdown ?? {};
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tổng quan</h1>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Làm mới
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${s.bg}`}><s.icon className={`w-8 h-8 ${s.color}`} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <Card className="col-span-2 border-none shadow-sm">
          <CardHeader><CardTitle>Phân bổ theo trạng thái</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-gray-400">Đang tải...</div>
            ) : total <= 1 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Package size={36} className="text-gray-200 dark:text-gray-700" />
                <p className="text-sm">Chưa có dữ liệu. Hãy <Link href="/import" className="text-blue-500 hover:underline">import file SPX</Link>.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bar chart */}
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                  {statusOrder.filter(s => breakdown[s]).map(s => (
                    <div key={s} title={`${s}: ${breakdown[s]}`}
                      style={{ width: `${(breakdown[s] / total) * 100}%` }}
                      className={`${statusColor[s] || 'bg-gray-400'} transition-all`} />
                  ))}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2">
                  {statusOrder.filter(s => breakdown[s]).map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusColor[s] || 'bg-gray-400'} flex-shrink-0`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{s}</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{breakdown[s]}</span>
                    </div>
                  ))}
                </div>
                {/* Extra fees */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-sm">
                    <p className="text-gray-500">Phí ship thực tế</p>
                    <p className="font-bold text-gray-900 dark:text-white">{money(stats?.totalShippingFee ?? 0)}đ</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500">Phí hoàn hàng</p>
                    <p className="font-bold text-gray-900 dark:text-white">{money(stats?.totalReturnFee ?? 0)}đ</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent orders */}
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle>Cần xử lý gấp</CardTitle></CardHeader>
          <CardContent>
            {urgentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="mx-auto mb-2 text-gray-200 dark:text-gray-700" size={32} />
                <p className="text-sm">Không có đơn cần xử lý</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentOrders.map(o => (
                  <div key={o.tracking_code} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{o.tracking_code}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">{o.shipping_status}</p>
                    {o.delivery_failed_reason && (
                      <p className="text-xs text-gray-500 mt-0.5">{o.delivery_failed_reason}</p>
                    )}
                  </div>
                ))}
                <Link href="/orders?need_action=true" onClick={(e) => {
                  const shopId = new URLSearchParams(window.location.search).get('shop_id');
                  if (shopId) {
                    e.preventDefault();
                    window.location.href = `/orders?need_action=true&shop_id=${shopId}`;
                  }
                }} className="block text-center text-xs text-blue-500 hover:underline mt-2">
                  Xem tất cả →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

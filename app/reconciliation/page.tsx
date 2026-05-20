'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useShop } from '@/context/ShopContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OrderRow {
  id: string;
  tracking_code: string;
  order_date: string;
  shipping_status: string | null;
  cod_status: string | null;
  cod_amount: number;
  actual_shipping_fee: number;
  return_shipping_fee: number;
  cod_service_fee: number;
  estimated_profit?: number;
}

function fmtMoney(v: number) {
  return `${(v || 0).toLocaleString('vi-VN')}đ`;
}

export default function ReconciliationPage() {
  const { shops, selectedShopId } = useShop();
  const [shopId, setShopId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedShopId) setShopId(selectedShopId);
  }, [selectedShopId]);

  const load = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ shop_id: shopId, limit: '1000' });
      if (from) p.append('from', from);
      if (to) p.append('to', to);
      const res = await fetch(`/api/orders?${p.toString()}`);
      const json = await res.json();
      setRows(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalOrders = rows.length;
    const totalCod = rows.reduce((s, r) => s + (r.cod_amount || 0), 0);
    const totalSuccess = rows.filter(r => (r.shipping_status || '').toLowerCase().includes('đã giao')).length;
    const totalFail = rows.filter(r => (r.shipping_status || '').toLowerCase().includes('không thành công')).length;
    const totalReturn = rows.filter(r => (r.shipping_status || '').toLowerCase().includes('trả')).length;
    const totalFee = rows.reduce((s, r) => s + (r.actual_shipping_fee || 0) + (r.return_shipping_fee || 0) + (r.cod_service_fee || 0), 0);
    const profit = rows.reduce((s, r) => s + (r.estimated_profit ?? ((r.cod_amount || 0) - ((r.actual_shipping_fee || 0) + (r.return_shipping_fee || 0) + (r.cod_service_fee || 0)))), 0);
    return { totalOrders, totalCod, totalSuccess, totalFail, totalReturn, totalFee, profit };
  }, [rows]);

  const exportExcel = () => {
    const data = rows.map(r => ({
      'Mã vận đơn': r.tracking_code,
      'Ngày tạo': r.order_date ? new Date(r.order_date).toLocaleString('vi-VN') : '',
      'Trạng thái VC': r.shipping_status || '',
      'Trạng thái COD': r.cod_status || '',
      'COD': r.cod_amount || 0,
      'Phí ship': r.actual_shipping_fee || 0,
      'Phí hoàn': r.return_shipping_fee || 0,
      'Phí COD': r.cod_service_fee || 0,
      'Lợi nhuận': r.estimated_profit ?? ((r.cod_amount || 0) - ((r.actual_shipping_fee || 0) + (r.return_shipping_fee || 0) + (r.cod_service_fee || 0))),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reconciliation');
    XLSX.writeFile(wb, `doi-soat-${shopId}-${Date.now()}.xlsx`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Đối soát / Cộng đơn</h1>
          <button onClick={exportExcel} disabled={!rows.length} className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-40 flex items-center gap-2">
            <Download size={16} /> Xuất Excel
          </button>
        </div>

        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500">Shop</label>
              <select value={shopId} onChange={e => setShopId(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900">
                <option value="">Chọn shop</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Từ ngày</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Đến ngày</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-900" />
            </div>
            <div className="md:col-span-2">
              <button onClick={load} disabled={!shopId || loading} className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 flex items-center justify-center gap-2">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Thống kê
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Tổng đơn</p><p className="text-xl font-bold">{stats.totalOrders}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Tổng COD</p><p className="text-xl font-bold">{fmtMoney(stats.totalCod)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Tổng phí</p><p className="text-xl font-bold">{fmtMoney(stats.totalFee)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Lợi nhuận ước tính</p><p className="text-xl font-bold">{fmtMoney(stats.profit)}</p></CardContent></Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader><CardTitle>Danh sách mã vận đơn</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Mã</th><th className="text-left p-2">Ngày</th><th className="text-left p-2">VC</th><th className="text-left p-2">COD</th><th className="text-right p-2">Tiền</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-2 font-mono">{r.tracking_code}</td>
                      <td className="p-2">{r.order_date ? new Date(r.order_date).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="p-2">{r.shipping_status || '—'}</td>
                      <td className="p-2">{r.cod_status || '—'}</td>
                      <td className="p-2 text-right">{fmtMoney(r.cod_amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

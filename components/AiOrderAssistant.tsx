'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Clipboard, Loader2, Search, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { extractCustomerIntent } from '@/lib/aiIntentService';
import { generateCustomerReply } from '@/lib/aiReplyService';
import { importSpxExcelFile } from '../lib/orderImportService';
import { smartSearchOrders, searchOrdersByDateRange } from '../lib/orderSearchService';
import { summarizeOrders } from '../lib/orderSummaryService';
import { maskPhone } from '@/lib/formatting';
import type { CustomerIntent, OrderSummary, SpxOrder } from '@/types/order';

function money(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function AiOrderAssistant() {
  const [customerMessage, setCustomerMessage] = useState('');
  const [reply, setReply] = useState('');
  const [matchedOrders, setMatchedOrders] = useState<SpxOrder[]>([]);
  const [intent, setIntent] = useState<CustomerIntent | null>(null);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [userIdError, setUserIdError] = useState('');

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('user_id') || window.localStorage.getItem('uid') || '';
    if (stored) setUserId(stored);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userId) {
      window.localStorage.setItem('user_id', userId);
    } else {
      window.localStorage.removeItem('user_id');
    }
  }, [userId]);

  const canSearch = useMemo(() => customerMessage.trim().length > 0 && !loading, [customerMessage, loading]);

  const handleImport = async () => {
    if (!importFile || !userId) return;
    setImportLoading(true);
    setImportResult('');
    try {
      const result = await importSpxExcelFile(importFile, userId);
      setImportResult(
        `Tổng: ${result.total} | Mới: ${result.inserted} | Cập nhật: ${result.updated} | Bỏ qua: ${result.skipped}`
      );
    } catch (err: unknown) {
      setImportResult((err as Error).message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!customerMessage.trim()) return;
    if (!userId) {
      setError('Bạn cần nhập userId để tra cứu dữ liệu SPX.');
      return;
    }

    setLoading(true);
    setError('');
    setReply('');
    setMatchedOrders([]);
    setSummary(null);

    try {
      const extracted = await extractCustomerIntent(customerMessage);
      setIntent(extracted);

      let orders: SpxOrder[] = [];
      let summaryResult: OrderSummary | null = null;

      if (extracted.intent === 'summarize_orders_by_date') {
        if (!extracted.dateFrom || !extracted.dateTo) {
          setError('Mình cần khoảng ngày cụ thể để tổng hợp.');
          setLoading(false);
          return;
        }
        orders = await searchOrdersByDateRange(userId, extracted.dateFrom, extracted.dateTo);
        summaryResult = summarizeOrders(orders);
      } else {
        orders = await smartSearchOrders(userId, extracted);
      }

      const replyText = await generateCustomerReply(customerMessage, orders);
      setMatchedOrders(orders);
      setReply(replyText || 'Dạ shop chưa có phản hồi phù hợp.');
      setSummary(summaryResult);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyReply = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
          <Bot size={22} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI trả lời khách</h1>
          <p className="text-sm text-gray-500">Tra cứu đơn SPX theo tin nhắn khách hàng</p>
        </div>
      </div>

      {userIdError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{userIdError}</p>
        </div>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet size={18} /> Import SPX cho AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value.trim());
                setUserIdError('');
              }}
              placeholder="Nhap userId"
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none"
              aria-label="User ID"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1 text-sm"
              aria-label="Chon file Excel SPX"
            />
            <button
              onClick={handleImport}
              disabled={!importFile || importLoading || !userId}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {importLoading ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Đang import</span>
              ) : (
                'Import vào AI'
              )}
            </button>
          </div>
          {importResult && <p className="text-sm text-gray-600 dark:text-gray-300">{importResult}</p>}
          {!userId && !userIdError && (
            <p className="text-xs text-gray-500">Nhap userId de luu va tra cuu don.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tin nhắn khách hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            rows={4}
            placeholder="Ví dụ: Shop ơi đơn em tới đâu rồi, em tên Thảo ở Bình Phước"
            className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-900 border-none outline-none text-sm"
          />
          <button
            onClick={handleCheck}
            disabled={!canSearch}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Kiểm tra đơn
          </button>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Câu trả lời gợi ý</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" /> Đang tạo câu trả lời...
              </div>
            ) : reply ? (
              <>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{reply}</p>
                <button
                  onClick={copyReply}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Clipboard size={14} /> Sao chép
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Chưa có dữ liệu trả lời.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Đơn tìm được ({matchedOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchedOrders.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa tìm thấy đơn phù hợp.</p>
            ) : (
              matchedOrders.slice(0, 5).map((o) => (
                <div key={o.id || o.trackingCode} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{o.trackingCode}</p>
                  <p className="text-xs text-gray-500">{o.receiverName || 'Không rõ'} · {o.district || '...'},{' '}{o.province || '...'}</p>
                  <p className="text-xs text-gray-500">Trạng thái: {o.status || 'Không rõ'} · COD: {money(o.cod || 0)}</p>
                  {o.phone && (
                    <p className="text-xs text-gray-500">SĐT: {maskPhone(o.phone)}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tổng hợp theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tổng đơn</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{summary.totalOrders}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tổng COD</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{money(summary.totalCod)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tổng giá trị đơn</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{money(summary.totalOrderValue)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500">Tổng phí ship</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{money(summary.totalShippingFee)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Trạng thái</th>
                    <th className="py-2">Số đơn</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.statusBreakdown).map(([status, count]) => (
                    <tr key={status} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2">{status}</td>
                      <td className="py-2 font-semibold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.trackingCodes.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Danh sách mã vận đơn</p>
                <div className="flex flex-wrap gap-2">
                  {summary.trackingCodes.map((code) => (
                    <span key={code} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-full">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {intent && (
        <p className="text-xs text-gray-400">Intent: {intent.intent} · Confidence: {intent.confidence ?? 0}</p>
      )}
    </div>
  );
}

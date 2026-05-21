'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  UploadCloud, CheckCircle2, XCircle, FileSpreadsheet,
  Loader2, AlertTriangle, RefreshCw, Eye, Package, TrendingUp,
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { parseSpxExcel } from '@/src/utils/importSpxExcel';
import { orderService } from '@/src/services/orderService';

interface ImportResult {
  success?: boolean;
  shop?: string;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  error?: string;
}

function money(n: number) {
  if (!n) return '0đ';
  return n.toLocaleString('vi-VN') + 'đ';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
}

export default function ImportPage() {
  const router = useRouter();
  const { selectedShopId, shops } = useShop();

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseSkipped, setParseSkipped] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedShopName = shops.find(s => s.id === selectedShopId)?.name;

  // ─── Đọc và parse file ───────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    const allowed = /\.(xlsx|xls|csv)$/i;
    if (!allowed.test(f.name)) {
      alert('Chỉ chấp nhận file .xlsx, .xls hoặc .csv từ SPX / Shopee');
      return;
    }

    setFile(f);
    setResult(null);
    setParsedOrders([]);
    setDetectedColumns([]);
    setMissingRequired([]);
    setParseErrors([]);
    setParseSkipped(0);
    setShowPreview(false);
    setParsing(true);

    try {
      const parsed = await parseSpxExcel(f);
      setParsedOrders((parsed as any).orders || []);
      setDetectedColumns((parsed as any).detectedColumns || []);
      setMissingRequired([]);
      setParseErrors([]);
      setParseSkipped(0);
    } catch (e: unknown) {
      setParseErrors(['Lỗi đọc file: ' + (e as Error).message]);
      setParsedOrders([]);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ─── Thực hiện import ────────────────────────────────────
  const handleImport = async () => {
    if (!file || !selectedShopId) {
      alert('Vui lòng chọn shop và file trước khi import.');
      return;
    }
    if (parsedOrders.length === 0) {
      alert('Không có dữ liệu hợp lệ để import. Vui lòng kiểm tra lại file.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      // Gắn shopId cho từng đơn trước khi lưu
      const ordersWithShop = parsedOrders.map(o => ({ ...o, shopId: selectedShopId }));

      const summary = orderService.bulkImport(ordersWithShop, selectedShopId);

      setResult({
        success: true,
        shop: selectedShopName,
        total: summary.total,
        inserted: summary.inserted,
        updated: summary.updated,
        skipped: summary.skipped + parseSkipped,
        errors: summary.errors,
        errorDetails: [
          ...parseErrors,
          ...(summary.errorDetails || []),
        ],
      });
    } catch (e: unknown) {
      setResult({
        error: 'Lỗi import: ' + (e as Error).message,
        total: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        errorDetails: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setParsedOrders([]);
    setDetectedColumns([]);
    setMissingRequired([]);
    setParseErrors([]);
    setParseSkipped(0);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const goToDashboard = () => router.push('/dashboard');
  const goToOrders = () => router.push('/orders');

  const hasError = missingRequired.length > 0;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <h1 className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">Import đơn SPX</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Tải file Excel (.xlsx/.xls) hoặc CSV xuất từ <strong>SPX → Quản lý đơn hàng → Xuất báo cáo</strong>
        </p>

        <div className="max-w-3xl space-y-5">

          {/* Step 1: Shop */}
          <Card className="border-none shadow-sm text-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Shop hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedShopId ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg">
                  Đang chọn shop: <span className="font-bold text-blue-700 dark:text-blue-400 text-base">{selectedShopName}</span>
                  <p className="text-xs text-gray-500 mt-1 italic">Bạn có thể đổi shop ở menu bên trái.</p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg text-red-600 dark:text-red-400 font-medium">
                  Vui lòng chọn hoặc thêm Shop ở menu bên trái trước khi Import.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: File */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Chọn file Excel / CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : file ? (hasError ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10')
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                    <p className="text-gray-500">Đang đọc file...</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-12 h-12 ${hasError ? 'text-red-400' : 'text-emerald-500'}`} />
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={e => { e.stopPropagation(); reset(); }}
                      className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                    >
                      <XCircle size={14} /> Xóa file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <UploadCloud className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Kéo thả file vào đây</p>
                      <p className="text-sm text-gray-400 mt-1">hoặc bấm để chọn file (.xlsx, .xls, .csv)</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </CardContent>
          </Card>

          {/* Step 3: Preview / Analysis */}
          {file && !parsing && (
            <Card className={`border-none shadow-sm ${hasError ? 'border-2 border-red-200' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Phân tích file
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Missing required columns */}
                {hasError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1 mb-1">
                      <AlertTriangle size={16} /> Thiếu cột bắt buộc
                    </p>
                    {missingRequired.map((m, i) => (
                      <p key={i} className="text-sm text-red-500">• {m}</p>
                    ))}
                    <p className="text-xs text-gray-500 mt-2">
                      Hãy dùng file export trực tiếp từ SPX Seller Center hoặc kiểm tra tên cột trong file.
                    </p>
                  </div>
                )}

                {/* Stats */}
                {!hasError && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{parsedOrders.length + parseSkipped}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Tổng dòng</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{parsedOrders.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Dòng hợp lệ</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{parseSkipped}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Dòng bỏ qua</p>
                    </div>
                  </div>
                )}

                {/* Detected columns */}
                {detectedColumns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cột đã nhận diện ({detectedColumns.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedColumns.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium">
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parse errors */}
                {parseErrors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
                      Cảnh báo ({parseErrors.length} dòng)
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {parseErrors.slice(0, 10).map((e, i) => (
                        <p key={i} className="text-xs text-orange-500">• {e}</p>
                      ))}
                      {parseErrors.length > 10 && (
                        <p className="text-xs text-gray-400">...và {parseErrors.length - 10} lỗi khác</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview toggle */}
                {parsedOrders.length > 0 && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Eye size={16} />
                    {showPreview ? 'Ẩn preview' : `Xem preview (${Math.min(5, parsedOrders.length)} dòng đầu)`}
                  </button>
                )}

                {/* Preview table */}
                {showPreview && parsedOrders.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500">
                          <th className="p-2 text-left font-medium">Mã vận đơn</th>
                          <th className="p-2 text-left font-medium">Khách hàng</th>
                          <th className="p-2 text-left font-medium">Ngày tạo</th>
                          <th className="p-2 text-right font-medium">COD</th>
                          <th className="p-2 text-left font-medium">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {parsedOrders.slice(0, 5).map((o, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="p-2 font-mono text-blue-600 dark:text-blue-400">{o.trackingCode || o.orderCode || '—'}</td>
                            <td className="p-2 text-gray-700 dark:text-gray-300">{o.customerName || '—'}</td>
                            <td className="p-2 text-gray-500">{fmtDate(o.orderDate)}</td>
                            <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                              {o.codAmount ? money(o.codAmount) : '—'}
                            </td>
                            <td className="p-2">
                              {o.shippingStatus ? (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {o.shippingStatus}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!file || !selectedShopId || loading || parsing || hasError || parsedOrders.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading
              ? <><Loader2 size={20} className="animate-spin" />Đang import {parsedOrders.length} đơn...</>
              : <><UploadCloud size={20} />Xác nhận Import {parsedOrders.length > 0 ? `${parsedOrders.length} đơn` : ''}</>
            }
          </button>

          {/* Result */}
          {result && (
            <Card className={`border-2 shadow-sm ${result.error ? 'border-red-200 dark:border-red-800' : 'border-emerald-200 dark:border-emerald-800'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {result.error
                    ? <XCircle className="text-red-500" size={20} />
                    : <CheckCircle2 className="text-emerald-500" size={20} />
                  }
                  {result.error ? 'Import thất bại' : 'Import thành công!'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.error ? (
                  <p className="text-red-600 dark:text-red-400 text-sm">{result.error}</p>
                ) : (
                  <>
                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{result.total}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Tổng dòng</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{result.inserted}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Tạo mới</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{result.updated}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Cập nhật</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{result.skipped}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Bỏ qua</p>
                      </div>
                    </div>

                    {result.errorDetails.length > 0 && (
                      <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20">
                        <p className="text-xs font-semibold text-orange-600 mb-1">Chi tiết cảnh báo:</p>
                        <div className="max-h-32 overflow-y-auto space-y-0.5">
                          {result.errorDetails.slice(0, 8).map((e, i) => (
                            <p key={i} className="text-xs text-orange-500">• {e}</p>
                          ))}
                          {result.errorDetails.length > 8 && (
                            <p className="text-xs text-gray-400">...và {result.errorDetails.length - 8} cảnh báo khác</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={goToDashboard}
                        className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <TrendingUp size={16} /> Xem Dashboard
                      </button>
                      <button
                        onClick={goToOrders}
                        className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Package size={16} /> Xem Danh sách đơn
                      </button>
                      <button
                        onClick={reset}
                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        <RefreshCw size={16} className="inline mr-1" /> Import tiếp
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  UploadCloud, CheckCircle2, XCircle, FileSpreadsheet,
  Loader2, AlertTriangle, RefreshCw, TrendingUp, Package,
} from 'lucide-react';
import { useShop } from '@/context/ShopContext';

interface ImportResult {
  success?: boolean;
  shop?: string;
  total: number;
  inserted: number;
  updated: number;
  errors: number;
  errorDetails: string[];
  totalCod?: number;
  totalParcelValue?: number;
  statusBreakdown?: Record<string, number>;
  needActionCount?: number;
  error?: string;
  totalRows?: number;
  mappedRows?: number;
  savedRows?: number;
  dbCountAfterImport?: number;
  sampleSavedOrders?: any[];
}

function money(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function ImportPage() {
  const router = useRouter();
  const { selectedShopId, shops } = useShop();

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedShopName = shops.find(s => s.id === selectedShopId)?.name;

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { alert('Chỉ chấp nhận file .xlsx hoặc .xls từ SPX'); return; }
    setFile(f); setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!file || !selectedShopId) { alert('Vui lòng chọn shop và file.'); return; }
    setLoading(true); setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('shop_id', selectedShopId);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd });
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setResult({ error: 'Lỗi kết nối server: ' + (e as Error).message, total: 0, inserted: 0, updated: 0, errors: 1, errorDetails: [] });
    } finally { setLoading(false); }
  };

  const reset = () => {
    setFile(null); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const goToDashboard = () => router.push('/dashboard');
  const goToOrders = () => router.push('/orders');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <h1 className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">Import đơn SPX</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Tải file Excel xuất từ <strong>SPX → Quản lý đơn hàng → Xuất báo cáo</strong></p>

        <div className="max-w-2xl space-y-5">
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

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Chọn file Excel SPX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={e => { e.stopPropagation(); reset(); }}
                      className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                      <XCircle size={14} /> Xóa file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <UploadCloud className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Kéo thả file vào đây</p>
                      <p className="text-sm text-gray-400 mt-1">hoặc bấm để chọn file từ máy tính</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </CardContent>
          </Card>

          <button onClick={handleImport} disabled={!file || !selectedShopId || loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
            {loading ? <><Loader2 size={20} className="animate-spin" />Đang xử lý...</> : <><UploadCloud size={20} />Bắt đầu Import</>}
          </button>

          {result && (
            <Card className={`border-2 shadow-sm ${result.error ? 'border-red-200 dark:border-red-800' : 'border-emerald-200 dark:border-emerald-800'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {result.error
                    ? <XCircle className="text-red-500" size={20} />
                    : <CheckCircle2 className="text-emerald-500" size={20} />}
                  Kết quả Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.error ? (
                  <p className="text-red-600 dark:text-red-400 text-sm">{result.error}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.inserted}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Đơn mới</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.updated}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Cập nhật</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={goToDashboard} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded hover:bg-emerald-700 transition shadow-sm">
                        Xem Dashboard
                      </button>
                      <button onClick={reset} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-semibold rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        Import tiếp
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

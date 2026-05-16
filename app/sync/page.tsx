import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Download, CheckCircle, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function SyncPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Đồng bộ dữ liệu</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Đồng bộ đơn hàng Shopee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn Shop</label>
                  <select className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer">
                    <option value="all">Tất cả Shop</option>
                    <option value="shop1">Shop 1</option>
                    <option value="shop2">Shop 2</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Từ ngày</label>
                    <input type="date" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Đến ngày</label>
                    <input type="date" className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 border-none rounded-lg outline-none cursor-pointer" />
                  </div>
                </div>
                <button className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20">
                  <Download size={20} />
                  Bắt đầu đồng bộ
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Lịch sử đồng bộ gần nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    {i === 1 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        Đồng bộ tự động - Shop {i % 2 === 0 ? '1' : '2'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Hôm nay lúc {10 - i}:00 AM • Đã tải {120 - i * 15} đơn hàng mới
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

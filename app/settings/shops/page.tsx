import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Store, Plus } from "lucide-react";

export default function ShopsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Shop</h1>
          <Link href="/api/shopee/auth" className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
            <Plus size={18} />
            <span>Kết nối Shop Shopee mới</span>
          </Link>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Danh sách Shop đã kết nối</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Store size={48} className="mx-auto text-gray-300 mb-4" />
              <p>Chưa có shop nào được kết nối.</p>
              <p className="text-sm mt-2">Vui lòng bấm nút "Kết nối Shop Shopee mới" để liên kết tài khoản.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

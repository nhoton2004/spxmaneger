'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Check, Bell, Clock, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface Reminder {
  id: string;
  tracking_code: string;
  type: string;
  title: string;
  message: string | null;
  due_at: string | null;
  is_done: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  delivery_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pickup_failed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  returning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  returned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cod_reconcile: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function RemindersPage() {
  const [pending, setPending] = useState<Reminder[]>([]);
  const [done, setDone] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [p, d] = await Promise.all([
        fetch('/api/reminders?is_done=false').then(r => r.json()),
        fetch('/api/reminders?is_done=true').then(r => r.json()),
      ]);
      if (p.error) { setError(p.error); return; }
      setPending(Array.isArray(p) ? p : []);
      setDone(Array.isArray(d) ? d.slice(0, 10) : []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markDone = async (id: string) => {
    setMarking(id);
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_done: true }),
      });
      setPending(prev => prev.filter(r => r.id !== id));
    } finally { setMarking(null); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nhắc nhở xử lý</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <Bell size={20} />Cần xử lý ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
              ) : pending.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Check size={32} className="mx-auto mb-2 text-emerald-300" />
                  <p className="text-sm">Không có việc cần xử lý! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {pending.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_BADGE[r.type] || 'bg-gray-100 text-gray-600'}`}>
                            {r.type.replace(/_/g, ' ')}
                          </span>
                          {r.due_at && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={11} /> {new Date(r.due_at).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                        {r.message && <p className="text-xs text-gray-500 mt-0.5">{r.message}</p>}
                      </div>
                      <button onClick={() => markDone(r.id)} disabled={marking === r.id}
                        className="p-2 flex-shrink-0 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 rounded-full transition">
                        {marking === r.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check size={20} />Đã xử lý gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              {done.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Chưa có lịch sử xử lý</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {done.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 opacity-60">
                      <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{r.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

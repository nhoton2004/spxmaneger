import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const db = getSupabase();
    const url = new URL(request.url);
    const shopId = url.searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({
        totalToday: 0,
        totalOrders: 0,
        totalCod: 0,
        totalShippingFee: 0,
        totalReturnFee: 0,
        codPendingReconcile: 0,
        needActionCount: 0,
        statusBreakdown: {},
      });
    }

    let query = db.from('orders').select(
      'shipping_status,cod_amount,actual_shipping_fee,return_shipping_fee,need_action,order_date,payment_status'
    ).eq('shop_id', shopId);
    
    const { data: orders, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const all = orders || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const statusBreakdown: Record<string, number> = {};
    all.forEach(o => {
      const s = o.shipping_status || 'Không xác định';
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    });

    const delivered = all.filter(o => (o.shipping_status || '').toLowerCase() === 'đã giao hàng');
    return NextResponse.json({
      totalToday: all.filter(o => o.order_date && new Date(o.order_date) >= today).length,
      totalOrders: all.length,
      totalCod: all.reduce((s, o) => s + (o.cod_amount || 0), 0),
      totalShippingFee: all.reduce((s, o) => s + (o.actual_shipping_fee || 0), 0),
      totalReturnFee: all.reduce((s, o) => s + (o.return_shipping_fee || 0), 0),
      codPendingReconcile: delivered.filter(o => (o.cod_amount || 0) > 0 && o.payment_status !== 'Đã thu')
        .reduce((s, o) => s + (o.cod_amount || 0), 0),
      needActionCount: all.filter(o => o.need_action).length,
      statusBreakdown,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const db = getSupabase();
    const url = new URL(request.url);
    const shopId = url.searchParams.get('shop_id');
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;

    let query = db
      .from('orders')
      .select(
        'id,tracking_code,tracking_url,customer_reference_no,shop_id,order_date,' +
        'customer_name,customer_phone,cod_amount,parcel_value,actual_shipping_fee,' +
        'shipping_status,delivery_failed_reason,need_action,payment_status',
        { count: 'exact' }
      )
      .order('order_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (shopId) query = query.eq('shop_id', shopId);
    if (status) query = query.eq('shipping_status', status);
    if (search) query = query.or(
      `tracking_code.ilike.%${search}%,customer_name.ilike.%${search}%,` +
      `customer_phone.ilike.%${search}%,customer_reference_no.ilike.%${search}%`
    );

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count: count || 0, page, limit });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

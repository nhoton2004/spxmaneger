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
    const codStatus = url.searchParams.get('cod_status');
    const combinedStatus = url.searchParams.get('combined_status');
    const tag = url.searchParams.get('tag');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = db
      .from('orders')
      .select(
        'id,tracking_code,tracking_url,customer_reference_no,shop_id,order_date,' +
        'customer_name,customer_phone,cod_amount,parcel_value,actual_shipping_fee,' +
        'shipping_status,cod_status,combined_status,delivery_failed_reason,need_action,payment_status,' +
        'notes,tags,history,total_fee,estimated_profit,last_imported_at',
        { count: 'exact' }
      )
      .order('order_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (shopId) query = query.eq('shop_id', shopId);
    if (status) query = query.eq('shipping_status', status);
    if (codStatus) query = query.eq('cod_status', codStatus);
    if (combinedStatus) query = query.eq('combined_status', combinedStatus);
    if (tag) query = query.contains('tags', [tag]);
    if (from) query = query.gte('order_date', `${from}T00:00:00`);
    if (to) query = query.lte('order_date', `${to}T23:59:59`);

    if (search) {
      const escaped = search.replace(/,/g, ' ');
      query = query.or(
        `tracking_code.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,` +
        `customer_phone.ilike.%${escaped}%,customer_reference_no.ilike.%${escaped}%`
      );
    }

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [], count: count || 0, page, limit });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

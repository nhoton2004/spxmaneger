import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const db = getSupabase();
    const url = new URL(request.url);
    const isDone = url.searchParams.get('is_done');

    let query = db
      .from('reminders')
      .select('id,tracking_code,type,title,message,due_at,is_done,created_at,order_id')
      .order('due_at', { ascending: true });

    if (isDone !== null) query = query.eq('is_done', isDone === 'true');

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = getSupabase();
    const { id, is_done } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { error } = await db.from('reminders').update({ is_done }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

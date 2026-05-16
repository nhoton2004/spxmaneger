import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('shops')
      .select('id, name, platform')
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabase();
    const body = await request.json();
    const { name, platform = 'spx' } = body;
    if (!name) return NextResponse.json({ error: 'Tên shop không được để trống.' }, { status: 400 });
    const { data, error } = await db
      .from('shops')
      .insert({ name, platform })
      .select('id, name, platform')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

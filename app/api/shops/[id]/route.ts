import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await db.auth.setSession({ access_token: token, refresh_token: '' });
    }

    const body = await request.json();
    const { name } = body;
    
    if (!name) return NextResponse.json({ error: 'Tên shop không được để trống.' }, { status: 400 });
    
    const { data, error } = await db
      .from('shops')
      .update({ name })
      .eq('id', params.id)
      .select()
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await db.auth.setSession({ access_token: token, refresh_token: '' });
    }

    const { error } = await db
      .from('shops')
      .delete()
      .eq('id', params.id);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const db = getSupabase();
    // Pass auth header from request to Supabase to run as the user
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      db.auth.setSession({ access_token: authHeader.replace('Bearer ', ''), refresh_token: '' });
    }

    const { data, error } = await db
      .from('shops')
      .select('id, name, platform, code, ownerId')
      .order('createdAt', { ascending: true });
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getSupabase();
    const authHeader = request.headers.get('Authorization');
    
    let uid = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await db.auth.setSession({ access_token: token, refresh_token: '' });
      const { data: { user } } = await db.auth.getUser(token);
      uid = user?.id;
    } else {
      // For Next.js App Router, we might want to get session from cookies if using SSR setup
      // But let's fallback to getting the session from the client side using createRouteHandlerClient
      const { data: { session } } = await db.auth.getSession();
      uid = session?.user?.id;
    }

    const body = await request.json();
    const { name, platform = 'spx', code = `SHOP_${Date.now()}` } = body;
    if (!name) return NextResponse.json({ error: 'Tên shop không được để trống.' }, { status: 400 });
    
    const { data, error } = await db
      .from('shops')
      .insert({ 
        name, 
        platform,
        code,
        ownerId: uid || null
      })
      .select('id, name, platform, code, ownerId')
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

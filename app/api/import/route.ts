import { NextRequest, NextResponse } from 'next/server';
import { importSpxBuffer } from '@/lib/import-spx';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let db;
  try {
    db = getSupabase();
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const shopId = formData.get('shop_id') as string | null;

    if (!file) return NextResponse.json({ error: 'Không tìm thấy file upload.' }, { status: 400 });
    if (!shopId) return NextResponse.json({ error: 'Vui lòng chọn Shop.' }, { status: 400 });

    const { data: shop, error: shopErr } = await db
      .from('shops').select('id,name').eq('id', shopId).maybeSingle();
    if (shopErr) return NextResponse.json({ error: `Lỗi truy vấn shop: ${shopErr.message}` }, { status: 500 });
    if (!shop) return NextResponse.json({ error: 'Shop không tồn tại.' }, { status: 404 });

    console.log(`[API /import] Starting import for shop: ${shop.name}, file: ${file.name}`);
    const buffer = await file.arrayBuffer();
    const result = await importSpxBuffer(buffer, shopId, file.name);
    console.log(`[API /import] Result:`, JSON.stringify({ ...result, errorDetails: result.errorDetails.slice(0, 3) }));

    return NextResponse.json({ success: true, shop: shop.name, ...result });
  } catch (err: unknown) {
    console.error('[API /import] Fatal error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

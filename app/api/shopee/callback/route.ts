import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const shopId = url.searchParams.get('shop_id');
  
  if (!code || !shopId) {
    return NextResponse.json({ error: 'Missing code or shop_id from Shopee' }, { status: 400 });
  }

  // TODO: Gọi API Shopee để đổi "code" lấy "access_token"
  // Sau đó lưu access_token và refresh_token vào database Supabase (bảng shops)
  
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${host}/settings/shops?success=true&shopId=${shopId}`);
}

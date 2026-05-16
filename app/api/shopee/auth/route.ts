import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/shopee';

export async function GET(request: Request) {
  if (!process.env.SHOPEE_PARTNER_ID || !process.env.SHOPEE_PARTNER_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình SHOPEE_PARTNER_ID hoặc KEY trong file .env.local' }, { status: 500 });
  }

  const host = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUrl = `${host}/api/shopee/callback`;
  
  const authUrl = getAuthUrl(redirectUrl);
  return NextResponse.redirect(authUrl);
}

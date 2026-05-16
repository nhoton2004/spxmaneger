import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      `Supabase chưa được cấu hình. Kiểm tra file .env.local:\n` +
      `  NEXT_PUBLIC_SUPABASE_URL=${url || '(trống)'}\n` +
      `  NEXT_PUBLIC_SUPABASE_ANON_KEY=${key ? '(có)' : '(trống)'}`
    );
  }

  console.log('[supabase] Connecting to:', url);
  _client = createClient(url, key);
  return _client;
}

// Convenience export (lazy)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

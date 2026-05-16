import { getSupabase } from './lib/supabase';
const db = getSupabase();
async function run() {
  const { data, error, count } = await db.from('orders').select('*', { count: 'exact', head: true });
  console.log("Error:", error);
  console.log("Count:", count);
}
run();

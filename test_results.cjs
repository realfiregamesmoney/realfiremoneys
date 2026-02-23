const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jieokmcyxftfjpfuvimj.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function test() {
  const { data, error } = await supabase.from('tournament_results').select('prize_amount, created_at, profiles:winner_user_id(nickname, avatar_url)').limit(5);
  console.log(JSON.stringify({ data, error }, null, 2));
}
test();

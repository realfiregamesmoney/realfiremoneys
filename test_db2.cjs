const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jieokmcyxftfjpfuvimj.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function test() {
  const { data } = await supabase.from('notification_settings').select('*').limit(1);
  console.log(data);
}
test();

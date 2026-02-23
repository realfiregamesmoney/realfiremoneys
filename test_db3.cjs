const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jieokmcyxftfjpfuvimj.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function test() {
  const { data, error } = await supabase.from('notification_settings').insert({
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    key_name: 'test_product',
    category: 'store_product',
    enabled: true
  }).select();
  console.log("INSERT RESULT:", { data, error });
}
test();

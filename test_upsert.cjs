const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jieokmcyxftfjpfuvimj.supabase.co',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function test() {
  const payload = {
    key_name: 'STORE_PRODUCTS_V1',
    category: 'system_data',
    label: JSON.stringify([{ id: 1, name: 'test' }]),
    is_enabled: true
  };
  
  // Try normal upsert
  const { error: err1 } = await supabase.from('notification_settings').upsert(payload);
  console.log("Normal upsert error:", err1);

  // Try with onConflict
  const { error: err2 } = await supabase.from('notification_settings').upsert(payload, { onConflict: 'key_name' });
  console.log("With onConflict error:", err2);
}
test();

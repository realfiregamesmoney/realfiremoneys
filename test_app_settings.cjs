const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const user_uuid = '00000000-0000-0000-0000-000000000000';
  await supabase.from('app_settings').upsert({ key: `races_${user_uuid}`, value: JSON.stringify({ races: 5, score: 0 }) });

  let { data, error } = await supabase.from('app_settings').select('*').eq('key', `races_${user_uuid}`).limit(1);
  console.log("App Settings check:", data, error);
}

check();

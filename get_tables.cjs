const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('global_chat_messages').select('*').limit(1);
  console.log("Chat table exists:", error ? error.message : "YES");
  const { data: d2, error: e2 } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles table exists:", e2 ? e2.message : "YES");
}
test();

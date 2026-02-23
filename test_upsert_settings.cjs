require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase.from('app_settings').upsert({ key: 'global_chat_pinned_message', value: 'test' });
  console.log("Upsert result:", { data, error });
}
test();

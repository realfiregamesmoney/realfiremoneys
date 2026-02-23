import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function run() {
  const { data } = await supabase.from('app_settings').select('*');
  console.log("App Settings:", data);
}
run();

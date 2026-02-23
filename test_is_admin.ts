import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('is_admin', { _user_id: '00000000-0000-0000-0000-000000000000' });
  console.log("RPC result:", { data, error });
}
run();

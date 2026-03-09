import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // use service key to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { error } = await supabase.from('app_settings').upsert([
    { key: 'parceria_cutoff', value: '11' }
  ], { onConflict: 'key' });
  console.log("Upsert error?", error);
}

fix();

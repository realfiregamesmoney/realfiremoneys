import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { error } = await supabase.from('app_settings').upsert({ key: 'ares_security_logs', value: '[]' });
    console.log("Upsert fallback check:", error || "OK");
}
run();

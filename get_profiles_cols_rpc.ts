import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data: cols, error } = await supabase.rpc('exec_sql', { sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';" });
    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("Columns:", cols);
    }
}
run();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.log("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Existing Columns:", Object.keys(data[0]));
    } else {
        console.log("No rows in profiles table to inspect columns.");
    }
}
run();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supaAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const { data, error } = await supaAdmin.rpc('get_tables_info');
    if (error) {
        // Fallback: try querying a know view or information schema table but JS client limits it
        console.error(error.message);
    }
}
run();

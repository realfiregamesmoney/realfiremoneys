import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data, error } = await supabase.from('vault_hints').select('*').limit(1);

    if (error) {
        console.log("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Existing Columns:", Object.keys(data[0]));
    } else {
        // If no data, try to force an error to see column list if possible, 
        // or just try to select the specific column.
        const { error: colError } = await supabase.from('vault_hints').select('pre_reveal_title').limit(1);
        if (colError) {
            console.log("Column 'pre_reveal_title' check error:", colError);
        } else {
            console.log("Column 'pre_reveal_title' exists.");
        }
    }
}
run();

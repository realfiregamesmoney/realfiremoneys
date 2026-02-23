import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data: cols, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.log("Error:", error);
    } else if (cols && cols.length > 0) {
        console.log("Columns:", Object.keys(cols[0]));
    } else {
        // Insert a dummy to get keys
        const { data: insertData, error: insertError } = await supabase.from('profiles').insert({ user_id: '00000000-0000-0000-0000-000000000000' }).select('*').single();
        if (insertData) {
            console.log("Columns:", Object.keys(insertData));
        } else {
            console.log("Insert Error:", insertError);
        }
    }
}
run();

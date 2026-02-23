import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('transactions').select('*').eq('status', 'pending');
    console.log("Pending TXs:", data?.length);
    if(data && data.length > 0) {
        console.log("First Tx:", data[0]);
    }
}
run();

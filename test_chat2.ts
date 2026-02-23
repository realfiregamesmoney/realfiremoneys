import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supaAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const { data: d1, error: e1 } = await supaAdmin.from('global_chat_messages').select('*').limit(1);
    console.log("Admin select:", e1 ? e1.message : "Success");
    console.log(d1);
}
run();

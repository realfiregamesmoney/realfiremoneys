import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supaAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
const supaUser = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
    console.log("Starting tests...");

    // Test 1: clear chat via admin
    const { data: d1, error: e1 } = await supaAdmin.from('global_chat_messages').delete().neq('sender_id', '00000000-0000-0000-0000-000000000000');
    console.log("Admin delete:", e1 ? e1.message : "Success");

    // Test 2: insert admin message via admin
    const { data: d2, error: e2 } = await supaAdmin.from('global_chat_messages').insert({
        message: "Test admin push msg",
        is_admin: true
    });
    console.log("Admin insert:", e2 ? e2.message : "Success");
}
run();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const tables = ['chat_messages', 'global_chat', 'messages', 'room_messages'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('id').limit(1);
        console.log(`Table ${t}:`, error ? error.message : "Exists!");
    }
}
test();

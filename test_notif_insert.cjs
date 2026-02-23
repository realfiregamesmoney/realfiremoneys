const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { error: err } = await supabase.from('notifications').insert({
                user_id: '47e7d996-96fb-47f6-955a-ae331da38456',
                title: 'title', message: 'msg', type: 'system'
    });
    console.log("Error inserting:", err);
}
run();

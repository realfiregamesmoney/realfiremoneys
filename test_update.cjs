const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const tx = { id: '1593fff7-5d2c-426d-841e-0bffbcdd9069', user_id: '47e7d996-96fb-47f6-955a-ae331da38456', amount: 200, type: 'deposit' };
    
    // Test profiles fetch
    const { data: profile, error: err1 } = await supabase.from('profiles').select('saldo').eq('user_id', tx.user_id).single();
    console.log("Profile ok:", !err1, err1);

    // Test transactions update? No let's not update it since we use SR key. We know SR key works.
    // Let's use the USER's actual session? We don't have it.
}
run();

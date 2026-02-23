import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Waiting for test admin user testadmin@realfire.com...");
    for (let i = 0; i < 30; i++) {
        const { data: users } = await supabase.from('profiles').select('*').eq('email', 'testadmin@realfire.com');
        if (users && users.length > 0) {
            console.log("User found, elevating to admin.");
            const { data: roleStatus } = await supabase.from('user_roles').select('*').eq('user_id', users[0].user_id).eq('role', 'admin');
            if (roleStatus && roleStatus.length > 0) {
                console.log("Already an admin.");
                break;
            }
            await supabase.from('user_roles').insert({ user_id: users[0].user_id, role: 'admin' });
            await supabase.from('profiles').update({ saldo: 5000 }).eq('user_id', users[0].user_id);
            console.log("User made admin and balance added.");
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
}
run();

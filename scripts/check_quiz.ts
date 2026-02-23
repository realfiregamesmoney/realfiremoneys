import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('quiz_events').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else if (data && data.length === 0) {
        const { data: d2, error: e2 } = await supabase.from('quiz_events').insert({ title: 'test', scheduled_at: new Date().toISOString() }).select();
        if (e2) console.log("Insert error:", e2);
        else {
            console.log("Columns after insert:", Object.keys(d2[0]));
            await supabase.from('quiz_events').delete().eq('id', d2[0].id);
        }
    } else {
        console.log('No data or error:', error);
    }
}
run();

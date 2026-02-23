import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
        .split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const [k, ...v] = line.split('=');
            let val = v.join('=').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            return [k.trim(), val];
        })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log("Fetching one profile to see columns...");
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error("Error fetching profiles:", error);
        // Try to see if we can get anything from a failed insert
        console.log("Attempting a dummy insert to see error details...");
        const { error: insError } = await supabase.from('profiles').insert({ user_id: '00000000-0000-0000-0000-000000000000' });
        console.error("Insert error:", insError);
    } else {
        if (data && data.length > 0) {
            console.log("Columns found:", Object.keys(data[0]));
        } else {
            console.log("No profiles found. Profiles table is empty.");
            // Try to get schema via an empty select if that works
            const { data: emptyData, error: emptyError } = await supabase.from('profiles').select('*').limit(0);
            console.log("Empty select result:", emptyData, emptyError);
        }
    }
}

main();

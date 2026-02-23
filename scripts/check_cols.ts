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
    console.log("Checking if 'email' column exists...");
    const { error } = await supabase.from('profiles').select('email').limit(1);
    if (error) {
        console.log("Error checking 'email' column:", error.message);
    } else {
        console.log("'email' column exists.");
    }

    console.log("Checking if 'nickname' column exists...");
    const { error: error2 } = await supabase.from('profiles').select('nickname').limit(1);
    if (error2) {
        console.log("Error checking 'nickname' column:", error2.message);
    } else {
        console.log("'nickname' column exists.");
    }
}

main();

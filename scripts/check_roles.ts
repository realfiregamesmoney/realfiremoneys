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
    console.log("Checking 'user_roles' table...");
    const { data, error } = await supabase.from('user_roles').select('*').limit(1);
    if (error) {
        console.log("Error selecting from user_roles:", error.message);
    } else {
        console.log("user_roles columns:", Object.keys(data[0] || {}));
    }
}

main();

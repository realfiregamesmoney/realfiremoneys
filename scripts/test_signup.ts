import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple env parser
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

async function testSignup() {
    const email = `test_user_${Date.now()}@test.com`;
    const password = 'Password123!';
    const fullName = 'Test User';

    console.log(`Attempting signup for ${email}...`);
    // auth.admin.createUser bypasses the trigger? No, actually it runs it too.
    // But if we want to see the error that the frontend gets, we should use signUp.
    // Although signUp requires anon key.

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });

    if (error) {
        console.error("Signup failed:", error);
    } else {
        console.log("Signup success:", data);
    }
}

testSignup();

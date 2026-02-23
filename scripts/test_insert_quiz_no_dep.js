import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) {
        let value = val.join('=').trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key.trim()] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const formData = {
        title: "Test",
        scheduled_at: new Date().toISOString(),
        ticket_price: 10,
        prize_type: "cash",
        prize_product_name: "",
        prize_product_image: "",
        prize_product_value: 0,
        platform_fee_percent: 30, // Default 30%
        questions: Array(6).fill(0).map((_, i) => ({
            id: i,
            text: i === 5 ? "PERGUNTA MATA-MATA (DESEMPATE)" : `Pergunta ${i + 1}`,
            options: ["A", "B", "C", "D"],
            correctIndex: 0
        }))
    };

    const { data, error } = await supabase.from('quiz_events').insert(formData).select();
    if (error) {
        console.log('Error inserting:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success!', data);
        await supabase.from('quiz_events').delete().eq('id', data[0].id);
    }
}
run();

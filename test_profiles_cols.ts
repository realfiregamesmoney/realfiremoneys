import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
const cols = [
    "nickname", "saldo", "nivel", "avatar_url", "full_name", "cpf",
    "freefire_id", "freefire_nick", "freefire_level", "freefire_proof_url",
    "total_winnings", "tournaments_played", "victories", "user_id", "is_chat_banned"
];

async function run() {
    for (const col of cols) {
        const { error } = await supabase.from('profiles').select(col).limit(1);
        if (error) {
            console.log(`Column ${col} ERROR:`, error.message);
        } else {
            console.log(`Column ${col} OK`);
        }
    }
}
run();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data, error } = await supabase.from('profiles').select('nickname, saldo, nivel, avatar_url, full_name, cpf, freefire_id, freefire_nick, freefire_level, freefire_proof_url, total_winnings, tournaments_played, victories, user_id, is_chat_banned').limit(1);
    console.log("data:", !!data, "error:", error ? error.message : "none");
}
run();

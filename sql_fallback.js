import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Insere alguma coisa pra testar
    const threat = { id: 'teste-123', name: 'Zezinho', reason: 'Aimbot' };
    const newLog = {
        threat_id: threat.id,
        player_name: threat.name,
        reason: threat.reason,
        action_taken: 'EXPULSO (1º AVISO)',
        level: 'yellow',
        created_at: new Date().toISOString()
    };
    
    // Tenta atualizar a app_settings
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'ares_security_logs').maybeSingle();
    let history = [];
    if(data && data.value) {
        history = JSON.parse(data.value);
    }
    history.unshift(newLog);
    
    // update app settings using Anon Key/RLS? Oh wait, we will use service role here, but let's test RLS in UI.
}
run();

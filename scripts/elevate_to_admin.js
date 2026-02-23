import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) {
        let value = val.join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[key.trim()] = value;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function elevateAdmin() {
    const email = 'realfiregamesmoney@gmail.com';
    console.log(`Buscando usuário: ${email}...`);

    // 1. Buscar o user_id no profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email);

    if (profileError) {
        console.error("Erro ao buscar perfil:", profileError.message);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("Usuário não encontrado na tabela profiles. Certifique-se de que ele já fez login pelo menos uma vez.");
        return;
    }

    const userId = profiles[0].user_id;
    console.log(`User ID encontrado: ${userId}`);

    // 2. Inserir/Atualizar na tabela user_roles
    const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });

    if (roleError) {
        console.error("Erro ao elevar para ADMIN:", roleError.message);
    } else {
        console.log(`SUCESSO! ${email} agora é ADMIN com acesso total.`);
    }
}

elevateAdmin();

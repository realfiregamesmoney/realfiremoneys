import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWhatsApp() {
    const { error } = await supabase.from('app_settings').update({ value: '5547992138320' }).eq('key', 'parceria_whatsapp');
    if (error) {
        console.error("Erro ao atualizar o WhatsApp:", error);
    } else {
        console.log("Número do WhatsApp atualizado com sucesso para 5547992138320!");
    }
}

updateWhatsApp();

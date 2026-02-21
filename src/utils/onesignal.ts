import { supabase } from "@/integrations/supabase/client";

// Substitua esta chave pela sua REST API KEY verdadeira do Painel do OneSignal
// (Encontrada em Settings > Keys & IDs > REST API Key)
const ONESIGNAL_REST_KEY = "os_v2_app_roekgo42qrcsjaozjv2c4zmrncwskdqf2xru6oestdr764ilaw5qzl6f44prsuytdr5pezyq6miz7ig6klnuarevl2u7fw752nqwnby";
const ONESIGNAL_APP_ID = "8b88a33b-9a84-4524-81d9-4d742e659168";

/**
 * Envia uma notificação Push via OneSignal
 * @param key_name A chave da configuração (ex: 'ply_new_tournaments') para verificar se o Admin habilitou
 * @param title Título da notificação
 * @param message Mensagem da notificação
 * @param targetUserIds Lista de user_ids específicos. Se nulo/vazio, envia para TODOS os usuários assinantes.
 */
export const sendPushNotification = async (
    key_name: string,
    title: string,
    message: string,
    targetUserIds?: string[] | null
) => {
    try {
        // 1. Verificar se a notificação está ativa no painel do admin
        const { data: setting } = await supabase
            .from('notification_settings')
            .select('is_enabled')
            .eq('key_name', key_name)
            .maybeSingle();

        // Se encontrou a configuração e ela está desligada explicitly, abortamos o envio
        if (setting && setting.is_enabled === false) {
            console.log(`[Push Notification] Bloqueada porque '${key_name}' está desligada no painel Admin.`);
            return;
        }

        // 2. Montar o Payload da API do OneSignal
        const body: any = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title, pt: title }, // O OneSignal usa multilinguagem nativa
            contents: { en: message, pt: message },
        };

        if (targetUserIds && targetUserIds.length > 0) {
            // Envia apenas para os IDs Específicos (External IDs setados no AuthContext login)
            body.include_aliases = { external_id: targetUserIds };
            body.target_channel = "push";
        } else {
            // Envia para TODOS os inscritos
            body.included_segments = ["All"];
        }

        // 3. Disparar a requisição
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log(`[Push Notification Enviada] - Chave: ${key_name}`, result);

    } catch (error) {
        console.error("Erro ao enviar notificação Push:", error);
    }
};

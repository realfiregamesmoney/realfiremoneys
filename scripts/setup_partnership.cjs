require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function setupPartnershipConfig() {
    const defaultQuestions = [
        {
            "id": "q1",
            "question": "Atualmente, qual é a dimensão da sua audiência na sua principal rede social?",
            "options": [
                { "id": "q1_a", "text": "Menos de 5.000 seguidores.", "points": 0, "autoFail": true },
                { "id": "q1_b", "text": "De 5.000 a 20.000 seguidores.", "points": 1, "autoFail": false },
                { "id": "q1_c", "text": "De 20.000 a 100.000 seguidores.", "points": 3, "autoFail": false },
                { "id": "q1_d", "text": "Mais de 100.000 seguidores.", "points": 4, "autoFail": false }
            ]
        },
        {
            "id": "q2",
            "question": "Qual é o tema ou foco principal do conteúdo que produz diariamente?",
            "options": [
                { "id": "q2_a", "text": "Exclusivamente Free Fire e E-sports.", "points": 4, "autoFail": false },
                { "id": "q2_b", "text": "Jogos variados (Gaming em geral).", "points": 2, "autoFail": false },
                { "id": "q2_c", "text": "Estilo de vida, humor ou vlogs.", "points": 0, "autoFail": false },
                { "id": "q2_d", "text": "Outros nichos não relacionados com jogos.", "points": 0, "autoFail": false }
            ]
        },
        {
            "id": "q3",
            "question": "Em média, quantas visualizações reais os seus vídeos ou stories costumam alcançar nas primeiras 24 horas?",
            "options": [
                { "id": "q3_a", "text": "Menos de 1.000 visualizações.", "points": 0, "autoFail": false },
                { "id": "q3_b", "text": "Entre 1.000 e 5.000 visualizações.", "points": 1, "autoFail": false },
                { "id": "q3_c", "text": "Entre 5.000 e 15.000 visualizações.", "points": 3, "autoFail": false },
                { "id": "q3_d", "text": "Mais de 15.000 visualizações consistentes.", "points": 4, "autoFail": false }
            ]
        },
        {
            "id": "q4",
            "question": "Já tem experiência em promover aplicações, torneios ou trabalhar com links de afiliado?",
            "options": [
                { "id": "q4_a", "text": "Sim, faço isso com frequência e tenho resultados comprovados.", "points": 3, "autoFail": false },
                { "id": "q4_b", "text": "Já tentei algumas vezes, mas estou a começar.", "points": 2, "autoFail": false },
                { "id": "q4_c", "text": "Não, esta seria a minha primeira vez a divulgar algo assim.", "points": 1, "autoFail": false },
                { "id": "q4_d", "text": "Apenas divulgo as minhas próprias partidas (sem vendas).", "points": 0, "autoFail": false }
            ]
        },
        {
            "id": "q5",
            "question": "Se for aprovado, qual seria a sua principal estratégia para atrair jogadores para o Real F$re?",
            "options": [
                { "id": "q5_a", "text": "Criar vídeos a jogar, a mostrar a plataforma e os ganhos reais.", "points": 3, "autoFail": false },
                { "id": "q5_b", "text": "Organizar lives e chamar os meus seguidores e jogadores para os torneios ao vivo.", "points": 3, "autoFail": false },
                { "id": "q5_c", "text": "Apenas colocar o link na biografia e nos stories.", "points": 1, "autoFail": false },
                { "id": "q5_d", "text": "Ainda não sei bem como faria.", "points": 0, "autoFail": true }
            ]
        }
    ];

    const defaultAffiliates = [
        {
            "id": "aff_1",
            "title": "Curso Mestre do Free Fire",
            "url": "https://hotmart.com/...",
            "description": "Indique seus amigos e ganhe 50% de comissão por venda."
        }
    ];

    const ops = [
        supabase.from('app_settings').upsert({ key: 'parceria_cutoff', value: '10' }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'parceria_whatsapp', value: '+5511999999999' }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'parceria_questions', value: JSON.stringify(defaultQuestions) }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({ key: 'parceria_affiliates', value: JSON.stringify(defaultAffiliates) }, { onConflict: 'key' })
    ];

    const results = await Promise.all(ops);
    console.log("Setup finished", results.map(r => r.error));
}

setupPartnershipConfig();

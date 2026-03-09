import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const questions = [
  {
    id: "q_1",
    question: "Em qual plataforma você tem a sua principal e maior audiência hoje?",
    options: [
      { id: "opt_1a", text: "YouTube (Focado em Free Fire / Games)", points: 5, autoFail: false },
      { id: "opt_1b", text: "TikTok / Kwai / Shorts (Vídeos Curtos)", points: 4, autoFail: false },
      { id: "opt_1c", text: "Instagram (Stories e Reels)", points: 3, autoFail: false },
      { id: "opt_1d", text: "Não crio conteúdo, apenas jogo muito bem.", points: 0, autoFail: true },
    ]
  },
  {
    id: "q_2",
    question: "Qual a média exata de visualizações que seus vídeos pegam nas primeiras 24 horas?",
    options: [
      { id: "opt_2a", text: "Mais de 10.000 visualizações orgânicas.", points: 5, autoFail: false },
      { id: "opt_2b", text: "Entre 1.000 e 5.000 visualizações.", points: 3, autoFail: false },
      { id: "opt_2c", text: "Entre 500 e 1.000 visualizações.", points: 1, autoFail: false },
      { id: "opt_2d", text: "Menos de 500 visualizações hoje.", points: 0, autoFail: false },
    ]
  },
  {
    id: "q_3",
    question: "Qual é o seu principal objetivo ao fechar uma parceria de divulgação com o Real Fire?",
    options: [
      { id: "opt_3a", text: "Divulgar meu link de indicação, trazer dezenas de jogadores pagantes e lucrar R$10 por cada um.", points: 5, autoFail: false },
      { id: "opt_3b", text: "Ganhar acesso a benefícios VIP (Passes gratuitos) para eu poder jogar e gravar sem pagar inscrição.", points: 2, autoFail: false },
      { id: "opt_3c", text: "Apenas ganhar uma continha de influenciador com escudo, codiguin ou roupa rara no Free Fire.", points: 0, autoFail: true },
    ]
  },
  {
    id: "q_4",
    question: "Se você for aprovado, como você convidaria sua comunidade para o aplicativo hoje?",
    options: [
      { id: "opt_4a", text: "Colocando o link na Bio e fazendo vídeos chamando e provando que dá pra ganhar dinheiro jogando.", points: 5, autoFail: false },
      { id: "opt_4b", text: "Mandando o link no meu grupo de WhatsApp/Telegram com meus amigos.", points: 2, autoFail: false },
      { id: "opt_4c", text: "Eu não iria convidar pelo meu link, só falaria o nome do app.", points: 0, autoFail: true },
    ]
  }
];

async function inject() {
  const { error } = await supabase.from('app_settings').update({ value: JSON.stringify(questions) }).eq('key', 'parceria_questions');
  console.log(error || "Questions injected successfully!");
}

inject();

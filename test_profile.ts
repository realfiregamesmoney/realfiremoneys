import fs from 'fs';

const pathDashboard = './src/pages/Dashboard.tsx';
const dashboard = fs.readFileSync(pathDashboard, 'utf8');
const regex = /\/\*\s*7\. PLANOS VIP ASSINATURA\s*\*\/([\s\S]*?)<\!--\s*8\. CAPTAÇÃO DE PARCEIROS E INDICAÇÕES/i;
const match = dashboard.match(/\/\*\s*7\. PLANOS VIP ASSINATURA\s*\*\/([\s\S]*?)\{\/\*\s*8\. CAPTAÇÃO DE PARCEIROS E INDICAÇÕES/i);

console.log(match ? "Encontrado!" : "Não encontrado");

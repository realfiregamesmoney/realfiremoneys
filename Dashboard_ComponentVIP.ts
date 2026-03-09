import fs from 'fs';

const path = './src/pages/Dashboard.tsx';
const content = fs.readFileSync(path, 'utf8');

const regex = /\/\*\s*7\. PLANOS VIP ASSINATURA\s*\*\/([\s\S]*?)\{\/\*\s*8\. CAPTAÇÃO DE PARCEIROS E INDICAÇÕES\s*\*\/\}/;
const match = content.match(regex);

if (match && match[1]) {
    fs.writeFileSync('./ComponenteVIP_temp.tsx', match[1]);
    console.log("Componente VIP extraído para ComponenteVIP_temp.tsx");
} else {
    console.log("Não encontrado");
}

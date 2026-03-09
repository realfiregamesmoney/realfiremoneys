const fs = require('fs');
const dashboard = fs.readFileSync('./src/pages/Dashboard.tsx', 'utf8');
const profile = fs.readFileSync('./src/pages/Profile.tsx', 'utf8');

const match = dashboard.match(/\/\*\s*7\. PLANOS VIP ASSINATURA\s*\*\/([\s\S]*?)\{\/\*\s*8\. CAPTAÇÃO DE PARCEIROS E INDICAÇÕES/i);

if(match && match[1]) {
    let vipJSX = match[1];
    vipJSX = vipJSX.replace(/className="mt-8"/g, 'className="mt-4"'); 
    
    // Agora vou ler o Profile.tsx e inserir no modal 
    const anchor = '<Button\\s*onClick=\\{\\(\\) => \\{ setActiveModal\\(null\\); navigate\\("/dashboard"\\); \\}\\}\\s*className="w-full py-7 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black uppercase tracking-\\[0\\.2em\\] rounded-2xl shadow-\\[0_0_30px_rgba\\(249,115,22,0\\.4\\)\\] border-0"\\s*>\\s*Desbloquear Modo VIP\\s*</Button>';
    
    // Em Profile.tsx precisamos garantir que vipPlans esteja no hook ou componente principal
    // E precisamos importar ShieldCheck, CheckCircle2 se nao existir
    // Como ja extraimos e vamos injetar vamos ter que ajustar isso nas tags.
    
    console.log("Achou VIP JSX");
}

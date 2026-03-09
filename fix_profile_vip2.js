const fs = require('fs');

const profile = fs.readFileSync('./src/pages/Profile.tsx', 'utf8');
const vipComponent = fs.readFileSync('./ComponenteVIPFinal.tsx', 'utf8');

// Primeiro, vamos ver se ShieldCheck e CheckCircle2 estao importados em Profile.tsx
let newProfile = profile;
if(!newProfile.includes('ShieldCheck')) {
    newProfile = newProfile.replace(/import {([^}]+)} from "lucide-react";/, 'import { $1, ShieldCheck } from "lucide-react";');
}
if(!newProfile.includes('CheckCircle2')) {
    newProfile = newProfile.replace(/import {([^}]+)} from "lucide-react";/, 'import { $1, CheckCircle2 } from "lucide-react";');
}

// Vamos adicionar o state vipPlans caso nao exista
if(!newProfile.includes('const [vipPlans, setVipPlans]')) {
    const anchorState = 'const [activeModal, setActiveModal] = useState<string | null>(null);';
    newProfile = newProfile.replace(anchorState, anchorState + '\n  const [vipPlans, setVipPlans] = useState<any[]>([]);');
    
    const fetchAnchor = 'const fetchProfile = async () => {';
    const fetchInsert = `
    const fetchPlans = async () => {
        const { data: plansData } = await supabase.from('notification_settings').select('label').eq('key_name', 'VIP_PLANS_V1').maybeSingle();
        if (plansData && plansData.label) {
            try {
                const parsedPlans = JSON.parse(plansData.label);
                setVipPlans(parsedPlans.filter((p: any) => p.is_active && !p.is_deleted));
            } catch (e) { }
        }
    };
    fetchPlans();
    `;
    
    newProfile = newProfile.replace('fetchProfile();', 'fetchProfile();\n' + fetchInsert);
}


// Substituindo o modal de Unlock 
const modalTagStart = '<div className="text-center space-y-6 py-4">';
const modalTagEndPattern = /Desbloquear Modo VIP\s*<\/Button>\s*<\/div>/;

const before = newProfile.substring(0, newProfile.indexOf(modalTagStart));
const middle = newProfile.substring(newProfile.indexOf(modalTagStart));
const afterMatch = middle.match(modalTagEndPattern);

if (afterMatch) {
    const cutPos = middle.indexOf(afterMatch[0]) + afterMatch[0].length;
    const endStr = middle.substring(cutPos);
    
    // Inserir os VIP Plans do dashboard, porem tirando as DIVs a mais para caber na view e removendo imports 
    // ou podemos simplesmente jogar no lugar 
    
    fs.writeFileSync('./src/pages/Profile.tsx', before + '\\n\\n' + vipComponent + '\\n\\n' + endStr);
    console.log('Feito');
} else {
    console.log('nao achou padrao da modal de substituicao');
}


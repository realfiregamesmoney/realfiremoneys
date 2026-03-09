import fs from 'fs';

const profile = fs.readFileSync('./src/pages/Profile.tsx', 'utf8');
const vipComponent = fs.readFileSync('./ComponenteVIPFinal.tsx', 'utf8');

let newProfile = profile;
if(!newProfile.includes('ShieldCheck')) {
    newProfile = newProfile.replace(/import {([^}]+)} from "lucide-react";/, 'import { $1, ShieldCheck } from "lucide-react";');
}
if(!newProfile.includes('CheckCircle2')) {
    newProfile = newProfile.replace(/import {([^}]+)} from "lucide-react";/, 'import { $1, CheckCircle2 } from "lucide-react";');
}

const anchorState = '  const [activeModal, setActiveModal] = useState<string | null>(null);';
if(!newProfile.includes('const [vipPlans, setVipPlans]')) {
    newProfile = newProfile.replace(anchorState, anchorState + '\n  const [vipPlans, setVipPlans] = useState<any[]>([]);');
    
    // the fetch function is handled easily as well: find useEffect for fetchProfile and add fetchPlans
    const fetchReplace = `
  useEffect(() => {
    const fetchProfile = async () => {`;
    
    const insertFetch = `
  useEffect(() => {
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
    
    const fetchProfile = async () => {`;
    
    newProfile = newProfile.replace(fetchReplace, insertFetch);
}

// Submodal replacement
const modalStartPos = newProfile.indexOf('<div className="text-center space-y-6 py-4">');
if(modalStartPos > -1) {
    const modalEndRegex = /Desbloquear Modo VIP\s*<\/Button>\s*<\/div>/;
    const match = newProfile.substring(modalStartPos).match(modalEndRegex);
    if(match) {
        const endPos = modalStartPos + match.index + match[0].length;
        
        const before = newProfile.substring(0, modalStartPos);
        const after = newProfile.substring(endPos);
        
        fs.writeFileSync('./src/pages/Profile.tsx', before + '\n' + vipComponent + '\n' + after);
        console.log("Feito e gravado");
    } else {
        console.log("Final da modal nao encontrado");
    }
} else {
    console.log("Inicio da modal nao encontrado");
}


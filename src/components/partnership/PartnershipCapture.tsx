import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, ChevronRight, MessageCircle, Copy, Share2, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PartnershipProps = {
    referralLink?: string;
    referralCount?: number;
};

export default function PartnershipCapture({ referralLink = "", referralCount = 0 }: PartnershipProps) {
    const { toast } = useToast();

    const [questions, setQuestions] = useState<any[]>([]);
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [cutoff, setCutoff] = useState(10);
    const [whatsapp, setWhatsapp] = useState("");
    const [uiConfig, setUiConfig] = useState<any>({
        mainBtnText: "Trabalhe com a Gente 🚀",
        mainBtnColor: "orange",
        cardReferralTitle: "Indique e Ganhe",
        cardReferralDesc: "Convide amigos através do seu link e ganhe dinheiro na hora para jogar assim que depositarem.",
        cardReferralColor: "indigo",
        cardAffiliateTitle: "Afiliado de Produtos",
        cardAffiliateDesc: "Venda produtos digitais online com nossos links e receba alta comissão garantida. Nível Iniciante.",
        cardAffiliateColor: "blue",
        cardInfluencerTitle: "Mestre Influenciador",
        cardInfluencerDesc: "Teste de Aptidão: Apenas para criadores de conteúdo que tenham mais de 5.000 seguidores.",
        cardInfluencerColor: "orange",
    });

    const [showOptions, setShowOptions] = useState(false);
    const [showAffiliates, setShowAffiliates] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showReferral, setShowReferral] = useState(false);

    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [autoFail, setAutoFail] = useState(false);
    const [result, setResult] = useState<"pending" | "approved" | "rejected">("pending");

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "Link copiado! 📋",
            description: "Envie para seus amigos. Quando eles depositarem, você ganha!",
            className: "bg-green-600 border-none text-white"
        });
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const fetchKeys = ['parceria_questions', 'parceria_cutoff', 'parceria_whatsapp', 'parceria_affiliates', 'parceria_ui_config'];
        const { data } = await supabase.from('app_settings').select('key, value').in('key', fetchKeys);

        if (data) {
            data.forEach(item => {
                if (item.key === 'parceria_questions') setQuestions(JSON.parse(item.value || '[]'));
                if (item.key === 'parceria_cutoff') setCutoff(Number(item.value || 10));
                if (item.key === 'parceria_whatsapp') setWhatsapp(item.value || '');
                if (item.key === 'parceria_affiliates') setAffiliates(JSON.parse(item.value || '[]'));
                if (item.key === 'parceria_ui_config' && item.value) {
                    try {
                        const parsed = JSON.parse(item.value);
                        setUiConfig((prev: any) => ({ ...prev, ...parsed }));
                    } catch (e) { }
                }
            });
        }
    };

    const handleOptionSelect = (points: number, isAutoFail: boolean) => {
        const newScore = score + points;
        const newAutoFail = autoFail || isAutoFail;

        setScore(newScore);
        setAutoFail(newAutoFail);

        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Calculate final result
            if (newAutoFail || newScore < cutoff) {
                setResult("rejected");
            } else {
                setResult("approved");
            }
            setShowForm(false);
        }
    };

    const resetState = () => {
        setShowOptions(true);
        setShowAffiliates(false);
        setShowReferral(false);
        setShowForm(false);
        setCurrentStep(0);
        setScore(0);
        setAutoFail(false);
        setResult("pending");
    };

    return (
        <div className="mt-8">
            {(!showOptions && !showAffiliates && !showForm && !showReferral && result === "pending") ? (
                <div className="relative group/cta">
                    <div className={`absolute inset-0 bg-gradient-to-r from-${uiConfig.mainBtnColor}-600 via-yellow-500 to-${uiConfig.mainBtnColor}-600 rounded-3xl blur-xl opacity-40 group-hover/cta:opacity-70 transition-opacity duration-500 animate-pulse pointer-events-none`}></div>
                    <Button
                        onClick={() => setShowOptions(true)}
                        className={`w-full relative overflow-hidden bg-gradient-to-r from-${uiConfig.mainBtnColor}-600 via-${uiConfig.mainBtnColor}-500 to-yellow-500 hover:from-${uiConfig.mainBtnColor}-500 hover:via-yellow-400 text-white font-black uppercase tracking-widest h-20 rounded-3xl shadow-[0_0_40px_rgba(249,115,22,0.6)] border-2 border-yellow-300/50 hover:scale-[1.02] transition-all duration-300`}
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
                        <div className="absolute -inset-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000 ease-in-out"></div>

                        <Briefcase className="h-8 w-8 mr-4 group-hover/cta:scale-125 group-hover/cta:-rotate-12 transition-transform duration-300 drop-shadow-md" />
                        <span className="text-xl md:text-2xl drop-shadow-lg">{uiConfig.mainBtnText}</span>
                    </Button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <Briefcase className={`h-6 w-6 text-${uiConfig.mainBtnColor}-500`} />
                        <h2 className="text-xl font-black uppercase text-white">{uiConfig.mainBtnText.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '')}</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">Escolha o seu nível de parceria e comece a monetizar agora:</p>
                </>
            )}

            {showOptions && result === "pending" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom duration-300">
                    <Card className={`bg-[#111] border border-${uiConfig.cardReferralColor}-500/30 hover:border-${uiConfig.cardReferralColor}-500 transition-colors cursor-pointer group`} onClick={() => { setShowOptions(false); setShowReferral(true); }}>
                        <CardHeader className="pb-2">
                            <CardTitle className={`text-base font-black text-${uiConfig.cardReferralColor}-400 uppercase flex items-center justify-between`}>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {uiConfig.cardReferralTitle}</div>
                                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-xs">{uiConfig.cardReferralDesc}</p>
                        </CardContent>
                    </Card>

                    <Card className={`bg-[#111] border border-${uiConfig.cardAffiliateColor}-500/30 hover:border-${uiConfig.cardAffiliateColor}-500 transition-colors cursor-pointer group`} onClick={() => { setShowOptions(false); setShowAffiliates(true); }}>
                        <CardHeader className="pb-2">
                            <CardTitle className={`text-base font-black text-${uiConfig.cardAffiliateColor}-400 uppercase flex items-center justify-between`}>
                                <div className="flex items-center gap-2"><Gem className="h-4 w-4" /> {uiConfig.cardAffiliateTitle}</div>
                                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-400 text-xs">{uiConfig.cardAffiliateDesc}</p>
                        </CardContent>
                    </Card>

                    <Card className={`bg-[#111] border border-${uiConfig.cardInfluencerColor}-500/30 hover:border-${uiConfig.cardInfluencerColor}-500 transition-colors cursor-pointer group`} onClick={() => { setShowOptions(false); setShowForm(true); }}>
                        <CardHeader className="pb-2">
                            <CardTitle className={`text-base font-black text-${uiConfig.cardInfluencerColor}-400 uppercase flex items-center justify-between`}>
                                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {uiConfig.cardInfluencerTitle}</div>
                                <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-gray-400 text-xs text-${uiConfig.cardInfluencerColor}-200/60`}>{uiConfig.cardInfluencerDesc}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showReferral && (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <Button variant="ghost" className="text-gray-400 mb-2 px-0 hover:text-white" onClick={resetState}>
                        ← Voltar ao Menu
                    </Button>
                    <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-white text-lg">
                                <Users className="h-5 w-5 text-indigo-300" />
                                Indique e Ganhe Dinheiro! 💸
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-indigo-100 leading-relaxed">
                                Convide amigos! Indique no mínimo 10 jogadores. Após o cadastro e depósito deles, você recebe <strong className="text-white">R$ 10,00</strong> para jogar.
                                Você já indicou <strong className="text-white">{referralCount}</strong> pessoa(s).
                            </p>

                            <div className="bg-black/40 p-3 rounded-lg border border-white/10 space-y-2">
                                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Seu Link de Indicação</label>
                                <div className="flex gap-2">
                                    <input
                                        value={referralLink}
                                        readOnly
                                        className="flex h-9 w-full rounded-md border border-white/10 bg-[#050505] px-3 py-1 text-xs text-gray-300 shadow-sm transition-colors font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    />
                                    <Button
                                        onClick={copyToClipboard}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 shrink-0"
                                    >
                                        <Copy className="h-4 w-4" /> Copiar
                                    </Button>
                                </div>
                            </div>

                            <Button onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: 'Real Fire Games',
                                        text: 'Venha jogar Free Fire valendo dinheiro real!',
                                        url: referralLink,
                                    })
                                } else {
                                    copyToClipboard();
                                }
                            }} variant="outline" className="w-full border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-colors">
                                <Share2 className="mr-2 h-4 w-4" /> Compartilhar Link
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showAffiliates && (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <Button variant="ghost" className="text-gray-400 mb-2 px-0 hover:text-white" onClick={resetState}>
                        ← Voltar
                    </Button>
                    {affiliates.length === 0 && <p className="text-gray-500">Nenhum produto disponível no momento.</p>}
                    {affiliates.map((aff, index) => (
                        <Card key={index} className="bg-[#111] border border-white/5">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-blue-400 uppercase text-lg">{aff.title}</h4>
                                    <p className="text-gray-400 text-sm">{aff.description}</p>
                                </div>
                                <Button onClick={() => window.open(aff.url, '_blank')} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap">
                                    Ver Produto
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showForm && questions.length > 0 && (
                <div className="bg-[#111] border border-white/10 p-6 rounded-2xl animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Questionário de Parceria</span>
                        <span className="text-xs font-black text-orange-500">{currentStep + 1} / {questions.length}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-6">{questions[currentStep].question}</h3>

                    <div className="space-y-3">
                        {questions[currentStep].options.map((opt: any, idx: number) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="w-full justify-start h-auto p-4 text-left whitespace-normal border-white/10 hover:border-orange-500 hover:bg-orange-500/10 text-gray-300 hover:text-white"
                                onClick={() => handleOptionSelect(opt.points, opt.autoFail)}
                            >
                                {opt.text}
                            </Button>
                        ))}
                    </div>

                    <Button variant="ghost" className="text-gray-500 mt-6 w-full hover:text-white" onClick={resetState}>
                        Cancelar e voltar
                    </Button>
                </div>
            )}

            {result === "approved" && (
                <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-2xl text-center animate-in zoom-in duration-500">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="h-8 w-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-black uppercase text-green-400 mb-2">Parabéns! Você se qualificou.</h3>
                    <p className="text-green-100/70 mb-8 max-w-lg mx-auto">Seu perfil demonstrou grande potencial para o programa Influenciador Mestre. Chame-nos agora no WhatsApp para finalizar seu cadastro e pegar seus acessos VIP e painel exclusivo.</p>

                    <Button onClick={() => window.open(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=Olá,%20acabei%20de%20fazer%20o%20teste%20de%20Mestre%20Influenciador%20e%20fui%20aprovado!`, '_blank')} className="bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest py-6 px-8 text-lg w-full md:w-auto">
                        <MessageCircle className="mr-2 h-6 w-6" /> Falar no WhatsApp
                    </Button>
                </div>
            )}

            {result === "rejected" && (
                <div className="bg-[#111] border border-red-500/20 p-6 md:p-8 rounded-2xl text-center mt-4 animate-in slide-in-from-bottom duration-500 shadow-xl">
                    <h3 className="text-xl md:text-2xl font-black uppercase text-red-400 mb-4">Ainda não é o momento da Parceria Mestre</h3>
                    <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                        Você ainda não se qualifica para nossa parceria Influenciador Mestre, mas ainda pode usar seu link nativo de convite para divulgar nossa plataforma e ganhar saldo real para jogar. E se quiser ganhar dinheiro de verdade para sacar, pode divulgar nossos produtos digitais e ganhar alta comissão de vendas instantaneamente.
                    </p>

                    <div className="border-t border-white/5 pt-8">
                        <h4 className="text-white font-bold uppercase mb-4 text-sm tracking-widest">Opção A (Aprovada Automaticamente)</h4>
                        {affiliates.length === 0 && <p className="text-gray-600 text-sm">Nenhum link ativo disponível no momento.</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            {affiliates.map((aff, index) => (
                                <Button key={index} onClick={() => window.open(aff.url, '_blank')} variant="outline" className="h-full py-4 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white flex-col gap-1 items-center justify-center whitespace-normal">
                                    <span className="font-black text-sm">{aff.title}</span>
                                    <span className="text-[10px] text-gray-400 line-clamp-2">{aff.description}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Button variant="ghost" className="text-gray-500 mt-8 hover:text-white" onClick={resetState}>
                        ← Entendi, Voltar
                    </Button>
                </div>
            )}

        </div>
    );
}

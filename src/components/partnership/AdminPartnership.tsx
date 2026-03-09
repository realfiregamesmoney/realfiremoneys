import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Link as LinkIcon, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function AdminPartnership() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [cutoff, setCutoff] = useState(10);
    const [whatsapp, setWhatsapp] = useState("");
    const [questions, setQuestions] = useState<any[]>([]);
    const [affiliates, setAffiliates] = useState<any[]>([]);
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

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        const fetchKeys = ['parceria_questions', 'parceria_cutoff', 'parceria_whatsapp', 'parceria_affiliates', 'parceria_ui_config'];
        const { data } = await supabase.from('app_settings').select('key, value').in('key', fetchKeys);

        if (data) {
            data.forEach(item => {
                if (item.key === 'parceria_questions') setQuestions(JSON.parse(item.value || '[]'));
                if (item.key === 'parceria_cutoff') setCutoff(Number(item.value || 10));
                if (item.key === 'parceria_whatsapp') setWhatsapp(item.value || '');
                if (item.key === 'parceria_affiliates') setAffiliates(JSON.parse(item.value || '[]'));
                if (item.key === 'parceria_ui_config') {
                    try {
                        const parsed = JSON.parse(item.value || '{}');
                        setUiConfig((prev: any) => ({ ...prev, ...parsed }));
                    } catch (e) { }
                }
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            // Because app_settings might have RLS or missing rows, we do individual updates.
            // Or we can use an RPC, or notification_settings style. Let's just use standard upserts but handle errors cleanly.
            const ops = [
                supabase.from('app_settings').upsert({ key: 'parceria_cutoff', value: cutoff.toString() }, { onConflict: 'key' }),
                supabase.from('app_settings').upsert({ key: 'parceria_whatsapp', value: whatsapp }, { onConflict: 'key' }),
                supabase.from('app_settings').upsert({ key: 'parceria_questions', value: JSON.stringify(questions) }, { onConflict: 'key' }),
                supabase.from('app_settings').upsert({ key: 'parceria_affiliates', value: JSON.stringify(affiliates) }, { onConflict: 'key' }),
                supabase.from('app_settings').upsert({ key: 'parceria_ui_config', value: JSON.stringify(uiConfig) }, { onConflict: 'key' })
            ];

            const results = await Promise.all(ops);
            const errors = results.filter(r => r.error).map(r => r.error);

            if (errors.length > 0) {
                console.error("Save Errors:", errors);
                toast({ title: "Erro ao salvar", description: errors[0]?.message || "Verifique o console.", variant: "destructive" });
            } else {
                toast({ title: "Tudo salvo com sucesso!", className: "bg-green-600 border-none text-white" });
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erro crasso ao salvar", description: error.message, variant: "destructive" });
        }
        setSaving(false);
    };

    const addAffiliate = () => {
        setAffiliates([...affiliates, { id: 'aff_' + Date.now(), title: "Novo Produto", url: "", description: "" }]);
    };

    const updateAffiliate = (id: string, field: string, value: string) => {
        setAffiliates(affiliates.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const removeAffiliate = (id: string) => {
        setAffiliates(affiliates.filter(a => a.id !== id));
    };

    const addQuestion = () => {
        setQuestions([...questions, {
            id: "q_" + Date.now(),
            question: "Nova Pergunta",
            options: [
                { id: "opt_a", text: "Opção 1", points: 0, autoFail: false }
            ]
        }]);
    };

    const updateQuestion = (qId: string, value: string) => {
        setQuestions(questions.map(q => q.id === qId ? { ...q, question: value } : q));
    };

    const removeQuestion = (qId: string) => {
        setQuestions(questions.filter(q => q.id !== qId));
    };

    const addOption = (qId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: [...q.options, { id: "opt_" + Date.now(), text: "Nova Opção", points: 0, autoFail: false }]
                };
            }
            return q;
        }));
    };

    const updateOption = (qId: string, optId: string, field: string, value: any) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: q.options.map((opt: any) => opt.id === optId ? { ...opt, [field]: value } : opt)
                };
            }
            return q;
        }));
    };

    const removeOption = (qId: string, optId: string) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                return {
                    ...q,
                    options: q.options.filter((opt: any) => opt.id !== optId)
                };
            }
            return q;
        }));
    };


    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

    return (
        <div className="space-y-6">

            {/* Botão Salvar Global */}
            <div className="flex justify-end sticky top-0 bg-[#0f0f0f]/80 backdrop-blur-md z-10 py-3 border-b border-white/5">
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500 font-bold px-8">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    SALVAR TUDO
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuração Visual (UI) */}
                <Card className="bg-[#111] border-white/5 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Edit className="h-5 w-5 text-orange-500" />
                            Personalização Visual do Botão e Cards
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Botão Principal */}
                        <div className="space-y-4 p-4 bg-black/40 border border-white/5 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-500 uppercase tracking-widest border-b border-orange-500/20 pb-2">Botão de Entrada</h4>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Texto do Botão</Label>
                                <Input value={uiConfig.mainBtnText} onChange={e => setUiConfig({ ...uiConfig, mainBtnText: e.target.value })} className="bg-black border-white/10 h-8 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Cor Predominante</Label>
                                <select value={uiConfig.mainBtnColor} onChange={e => setUiConfig({ ...uiConfig, mainBtnColor: e.target.value })} className="w-full bg-black border border-white/10 rounded-md h-8 text-sm px-2 text-white">
                                    <option value="orange">Laranja (Original)</option>
                                    <option value="blue">Azul</option>
                                    <option value="indigo">Índigo</option>
                                    <option value="purple">Roxo</option>
                                    <option value="green">Verde</option>
                                    <option value="red">Vermelho</option>
                                    <option value="cyan">Ciano</option>
                                </select>
                            </div>
                        </div>

                        {/* Card 1: Referral */}
                        <div className="space-y-4 p-4 bg-black/40 border border-white/5 rounded-xl">
                            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2">Card Indicação</h4>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Título</Label>
                                <Input value={uiConfig.cardReferralTitle} onChange={e => setUiConfig({ ...uiConfig, cardReferralTitle: e.target.value })} className="bg-black border-white/10 h-8 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Resumo / Descrição</Label>
                                <Textarea value={uiConfig.cardReferralDesc} onChange={e => setUiConfig({ ...uiConfig, cardReferralDesc: e.target.value })} className="bg-black border-white/10 h-20 text-xs resize-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Cor do Card</Label>
                                <select value={uiConfig.cardReferralColor} onChange={e => setUiConfig({ ...uiConfig, cardReferralColor: e.target.value })} className="w-full bg-black border border-white/10 rounded-md h-8 text-sm px-2 text-white">
                                    <option value="indigo">Índigo</option>
                                    <option value="blue">Azul</option>
                                    <option value="orange">Laranja</option>
                                    <option value="purple">Roxo</option>
                                    <option value="cyan">Ciano</option>
                                </select>
                            </div>
                        </div>

                        {/* Card 2: Affiliates */}
                        <div className="space-y-4 p-4 bg-black/40 border border-white/5 rounded-xl">
                            <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2">Card Afiliados</h4>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Título</Label>
                                <Input value={uiConfig.cardAffiliateTitle} onChange={e => setUiConfig({ ...uiConfig, cardAffiliateTitle: e.target.value })} className="bg-black border-white/10 h-8 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Resumo / Descrição</Label>
                                <Textarea value={uiConfig.cardAffiliateDesc} onChange={e => setUiConfig({ ...uiConfig, cardAffiliateDesc: e.target.value })} className="bg-black border-white/10 h-20 text-xs resize-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Cor do Card</Label>
                                <select value={uiConfig.cardAffiliateColor} onChange={e => setUiConfig({ ...uiConfig, cardAffiliateColor: e.target.value })} className="w-full bg-black border border-white/10 rounded-md h-8 text-sm px-2 text-white">
                                    <option value="blue">Azul</option>
                                    <option value="cyan">Ciano</option>
                                    <option value="indigo">Índigo</option>
                                    <option value="orange">Laranja</option>
                                    <option value="purple">Roxo</option>
                                </select>
                            </div>
                        </div>

                        {/* Card 3: Influencer */}
                        <div className="space-y-4 p-4 bg-black/40 border border-white/5 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-400 uppercase tracking-widest border-b border-orange-500/20 pb-2">Card Influencer</h4>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Título</Label>
                                <Input value={uiConfig.cardInfluencerTitle} onChange={e => setUiConfig({ ...uiConfig, cardInfluencerTitle: e.target.value })} className="bg-black border-white/10 h-8 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Resumo / Descrição</Label>
                                <Textarea value={uiConfig.cardInfluencerDesc} onChange={e => setUiConfig({ ...uiConfig, cardInfluencerDesc: e.target.value })} className="bg-black border-white/10 h-20 text-xs resize-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400 uppercase">Cor do Card</Label>
                                <select value={uiConfig.cardInfluencerColor} onChange={e => setUiConfig({ ...uiConfig, cardInfluencerColor: e.target.value })} className="w-full bg-black border border-white/10 rounded-md h-8 text-sm px-2 text-white">
                                    <option value="orange">Laranja</option>
                                    <option value="red">Vermelho</option>
                                    <option value="purple">Roxo</option>
                                    <option value="blue">Azul</option>
                                    <option value="cyan">Ciano</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Configurações Gerais */}
                <Card className="bg-[#111] border-white/5">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">Configurações Base</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-gray-400">Nota de Corte (Mínimo para Aprovação)</Label>
                            <Input type="number" value={cutoff} onChange={e => setCutoff(Number(e.target.value))} className="bg-black border-white/10 mt-1 focus-visible:ring-orange-500" />
                            <p className="text-[10px] text-gray-500 mt-1">Soma de pontos mínima exigida no questionário para não ser reprovado.</p>
                        </div>
                        <div>
                            <Label className="text-gray-400">WhatsApp para Aprovados</Label>
                            <Input type="text" placeholder="+5511999999999" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="bg-black border-white/10 mt-1 focus-visible:ring-orange-500" />
                            <p className="text-[10px] text-gray-500 mt-1">Este número é onde o usuário chamará para concluir o recrutamento Mestre.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Categoria Afiliados Aprovados Automaticamente */}
                <Card className="bg-[#111] border-white/5">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <CardTitle className="text-lg text-blue-400">Links de Afiliados (Opção A)</CardTitle>
                        <Button size="sm" variant="outline" onClick={addAffiliate} className="border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {affiliates.length === 0 && <p className="text-sm text-gray-500">Nenhum link ativo.</p>}
                        {affiliates.map((aff, i) => (
                            <div key={aff.id} className="p-3 bg-black/40 border border-white/5 rounded-lg relative space-y-3 pb-8">
                                <Button size="icon" variant="ghost" onClick={() => removeAffiliate(aff.id)} className="absolute top-1 right-1 text-red-500 h-6 w-6"><Trash2 className="h-3 w-3" /></Button>
                                <div>
                                    <Label className="text-[10px] text-gray-500 uppercase">Título do Produto</Label>
                                    <Input value={aff.title} onChange={e => updateAffiliate(aff.id, 'title', e.target.value)} className="h-7 text-sm bg-black border-white/10" />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-gray-500 uppercase">Link / URL</Label>
                                    <Input value={aff.url} onChange={e => updateAffiliate(aff.id, 'url', e.target.value)} className="h-7 text-sm bg-black border-white/10" />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-gray-500 uppercase">Descrição Curta</Label>
                                    <Textarea value={aff.description} onChange={e => updateAffiliate(aff.id, 'description', e.target.value)} className="h-14 text-sm bg-black border-white/10 resize-none" />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Editor do Questionário */}
            <Card className="bg-[#111] border-white/5">
                <CardHeader className="flex flex-row justify-between items-center border-b border-white/5 pb-4">
                    <div>
                        <CardTitle className="text-xl text-orange-400">Questionário (Funil)</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Formule as perguntas, crie alternativas e defina quantos pontos cada resposta vale.</p>
                    </div>
                    <Button onClick={addQuestion} className="bg-orange-600 hover:bg-orange-500 text-white"><Plus className="h-4 w-4 mr-2" /> Nova Pergunta</Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                    {questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl relative">
                            <div className="absolute top-4 right-4 flex items-center">
                                <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4 mr-2" /> Excluir Pergunta</Button>
                            </div>

                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pergunta {qIndex + 1}</h4>
                            <Input value={q.question} onChange={e => updateQuestion(q.id, e.target.value)} className="bg-black border-white/10 font-bold mb-4 w-full md:w-3/4" />

                            <div className="pl-4 border-l-2 border-orange-500/20 space-y-3 mt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Alternativas de Resposta</span>
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-orange-400" onClick={() => addOption(q.id)}><Plus className="h-3 w-3 mr-1" /> Adicionar Opção</Button>
                                </div>

                                {q.options.map((opt: any) => (
                                    <div key={opt.id} className="flex flex-col sm:flex-row items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                                        <Input value={opt.text} onChange={e => updateOption(q.id, opt.id, 'text', e.target.value)} className="bg-black border-white/10 text-sm flex-1" placeholder="Texto da alternativa" />

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Label className="text-[10px] text-gray-400">Pontos:</Label>
                                            <Input type="number" value={opt.points} onChange={e => updateOption(q.id, opt.id, 'points', Number(e.target.value))} className="w-16 h-8 bg-black border-white/10 text-center text-sm" />

                                            <label className="flex items-center gap-1.5 ml-2 cursor-pointer bg-red-500/10 hover:bg-red-500/20 px-2 py-1.5 rounded text-red-400">
                                                <input type="checkbox" checked={opt.autoFail} onChange={e => updateOption(q.id, opt.id, 'autoFail', e.target.checked)} className="accent-red-500" />
                                                <span className="text-[10px] uppercase font-bold tracking-tighter">Reprova?</span>
                                            </label>

                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-500 hover:text-red-500" onClick={() => removeOption(q.id, opt.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

        </div>
    );
}

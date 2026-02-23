import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Zap, Users, Trophy, CheckCircle2, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AdminVault from "./AdminVault";

export default function AdminQuiz() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        title: "",
        scheduled_at: "",
        ticket_price: 10,
        prize_type: "cash",
        prize_product_name: "",
        prize_product_image: "",
        prize_product_value: 0,
        platform_fee_percent: 30, // Default 30%
        questions: Array(6).fill(0).map((_, i) => ({
            id: i,
            text: i === 5 ? "PERGUNTA MATA-MATA (DESEMPATE)" : `Pergunta ${i + 1}`,
            options: ["A", "B", "C", "D"],
            correctIndex: 0
        }))
    });

    useEffect(() => {
        loadQuizzes();
    }, []);

    const loadQuizzes = async () => {
        setLoading(true);
        const { data } = await supabase.from('quiz_events').select('*').order('created_at', { ascending: false });
        setQuizzes(data || []);
        setLoading(false);
    };

    const loadQuizDetails = async (quiz: any) => {
        setSelectedQuiz(quiz);
        // Load tickets
        const { data: ticketData } = await supabase.from('quiz_tickets').select('*, profiles(nickname, full_name)').eq('quiz_id', quiz.id);
        setTickets(ticketData || []);
        // Load rankings
        const { data: rankData } = await supabase
            .from('quiz_rankings')
            .select('*, profiles(nickname, avatar_url)')
            .eq('quiz_id', quiz.id)
            .order('total_correct', { ascending: false })
            .order('total_time_ms', { ascending: true });
        setRankings(rankData || []);
    };

    const handleCreate = async () => {
        try {
            if (!formData.title) {
                toast({ title: "Título obrigatório", variant: "destructive" });
                return;
            }
            if (!formData.scheduled_at) {
                toast({ title: "Data obrigatória", variant: "destructive" });
                return;
            }

            // Limpeza ultra-rigorosa do payload para evitar erros de cache/schema
            const payload = {
                title: formData.title,
                scheduled_at: new Date(formData.scheduled_at).toISOString(),
                ticket_price: Number(formData.ticket_price) || 0,
                prize_type: formData.prize_type,
                prize_product_name: formData.prize_product_name || null,
                prize_product_image: formData.prize_product_image || null,
                prize_product_value: Number(formData.prize_product_value) || 0,
                platform_fee_percent: Number(formData.platform_fee_percent) || 30,
                questions: formData.questions, // JSONB
                status: 'scheduled'
            };

            console.log("Criando Mega Quiz no projeto correto:", payload);

            const { error, data } = await supabase.from('quiz_events').insert([payload]).select();

            if (error) {
                console.error("Erro detalhado do Supabase:", error);

                toast({
                    title: "Erro ao criar",
                    description: error.message || "Verifique o console do navegador",
                    variant: "destructive"
                });
            } else {
                toast({ title: "Mega Quiz agendado com sucesso!" });
                loadQuizzes();
                // Reset form
                setFormData({
                    ...formData,
                    title: "",
                    scheduled_at: "",
                });
            }
        } catch (e: any) {
            console.error("Erro na lógica de criação:", e);
            toast({ title: "Erro Inesperado", description: e.message, variant: "destructive" });
        }
    };

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('quiz_events').update({ status }).eq('id', id);
        toast({ title: `Status atualizado para ${status}` });
        loadQuizzes();
    };

    const approveTicket = async (id: string) => {
        await supabase.from('quiz_tickets').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
        toast({ title: "Ticket aprovado!" });
        if (selectedQuiz) loadQuizDetails(selectedQuiz);
    };

    const validateWinner = async (userId: string) => {
        await supabase.from('quiz_events').update({ validated_winner_id: userId, status: 'finished' }).eq('id', selectedQuiz.id);
        toast({ title: "Vencedor Validado!", description: "O prêmio agora pode ser processado." });
        loadQuizzes();
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="list" className="w-full">
                <TabsList className="bg-black/40 border border-white/10 p-1 mb-4">
                    <TabsTrigger value="list">Todos os Eventos</TabsTrigger>
                    <TabsTrigger value="create">Agendar Novo</TabsTrigger>
                    <TabsTrigger value="vault">Gestão do Cofre</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quizzes.map(q => (
                                <Card key={q.id} className="bg-[#111] border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer overflow-hidden" onClick={() => loadQuizDetails(q)}>
                                    <div className={`h-1 w-full ${q.status === 'live' ? 'bg-green-500' : q.status === 'finished' ? 'bg-gray-700' : 'bg-yellow-500'}`}></div>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-white text-lg font-black uppercase italic">{q.title}</CardTitle>
                                            <Badge variant="outline" className="uppercase text-[10px]">{q.status}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="text-xs text-gray-500">Data: {new Date(q.scheduled_at).toLocaleString()}</div>
                                        <div className="text-xs text-yellow-500 font-bold">Ticket: R$ {q.ticket_price}</div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                            {q.status === 'scheduled' && <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(q.id, 'live'); }} className="bg-green-600 hover:bg-green-700 h-7 text-[10px] uppercase font-black">Iniciar Agora</Button>}
                                            {q.status === 'live' && <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(q.id, 'finished'); }} className="bg-red-600 hover:bg-red-700 h-7 text-[10px] uppercase font-black">Finalizar</Button>}
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase border-white/10">Ver Detalhes</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="create">
                    <Card className="bg-[#111] border-white/5">
                        <CardHeader><CardTitle className="text-white">Agendar Mega Quiz (Formato Sobrevivência)</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Título do Evento</Label>
                                    <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-black border-white/10" placeholder="Ex: Mega Quiz Survival #1" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data e Hora</Label>
                                    <Input type="datetime-local" value={formData.scheduled_at} onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })} className="bg-black border-white/10" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço do Ticket (R$)</Label>
                                    <Input type="number" value={formData.ticket_price} onChange={e => setFormData({ ...formData, ticket_price: parseFloat(e.target.value) })} className="bg-black border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Comissão Plataforma (%)</Label>
                                    <Input type="number" value={formData.platform_fee_percent} onChange={e => setFormData({ ...formData, platform_fee_percent: parseFloat(e.target.value) })} className="bg-black border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Prêmio</Label>
                                    <Select value={formData.prize_type} onValueChange={v => setFormData({ ...formData, prize_type: v })}>
                                        <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-black border-white/20 text-white">
                                            <SelectItem value="cash">Dinheiro Acumulado</SelectItem>
                                            <SelectItem value="product">Produto Físico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.prize_type === 'product' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Nome do Produto</Label>
                                            <Input value={formData.prize_product_name} onChange={e => setFormData({ ...formData, prize_product_name: e.target.value })} className="bg-black border-white/10" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor Estimado (R$)</Label>
                                            <Input type="number" value={formData.prize_product_value} onChange={e => setFormData({ ...formData, prize_product_value: parseFloat(e.target.value) })} className="bg-black border-white/10" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL da Imagem do Produto</Label>
                                            <Input value={formData.prize_product_image} onChange={e => setFormData({ ...formData, prize_product_image: e.target.value })} className="bg-black border-white/10" placeholder="https://..." />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                    <Zap className="text-yellow-500 h-4 w-4" /> Perguntas do Ciclo (5 Oficiais + 1 Mata-Mata)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formData.questions.map((q: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-xl border space-y-3 ${idx === 5 ? 'bg-red-500/10 border-red-500/20' : 'bg-black/40 border-white/5'}`}>
                                            <div className="flex justify-between items-center">
                                                <Label className={`${idx === 5 ? 'text-red-500' : 'text-yellow-500'} uppercase text-[10px] font-black`}>
                                                    {idx === 5 ? "BOTÃO DE PÂNICO: MORTE SÚBITA (PERGUNTA 6)" : `RODADA ${idx + 1}`}
                                                </Label>
                                            </div>
                                            <Input value={q.text} onChange={e => {
                                                const qs = [...formData.questions];
                                                qs[idx].text = e.target.value;
                                                setFormData({ ...formData, questions: qs });
                                            }} className="bg-black border-white/10 text-xs h-8" placeholder="Digite a pergunta..." />
                                            <div className="grid grid-cols-2 gap-2">
                                                {q.options.map((opt: string, optIdx: number) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <input type="radio" checked={q.correctIndex === optIdx} onChange={() => {
                                                            const qs = [...formData.questions];
                                                            qs[idx].correctIndex = optIdx;
                                                            setFormData({ ...formData, questions: qs });
                                                        }} />
                                                        <Input value={opt} onChange={e => {
                                                            const qs = [...formData.questions];
                                                            qs[idx].options[optIdx] = e.target.value;
                                                            setFormData({ ...formData, questions: qs });
                                                        }} className="bg-black border-white/5 text-[10px] h-7" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleCreate} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase h-14 rounded-2xl">Lançar Mega Quiz Survival</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vault">
                    <AdminVault />
                </TabsContent>
            </Tabs>

            {/* PAINEL DE GESTÃO DO EVENTO SELECIONADO */}
            {selectedQuiz && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic text-white leading-none">{selectedQuiz.title}</h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> Gerenciador Survival Ativo
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setSelectedQuiz(null)} className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">Voltar à Central</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Participant Management */}
                            <Card className="bg-black/40 border-white/5 rounded-[2.5rem] backdrop-blur-md">
                                <CardHeader className="flex flex-row justify-between items-center border-b border-white/5 px-8">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-500" /> Vendas e Vagas
                                        </CardTitle>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Painel Administrativo - Privado</p>
                                    </div>
                                    <Badge className="bg-blue-500/10 text-blue-500 border-0 px-4 py-1.5 rounded-full">{tickets.length} INSCRITOS</Badge>
                                </CardHeader>
                                <CardContent className="p-8 max-h-[600px] overflow-y-auto space-y-4">
                                    {tickets.filter(t => t.status === 'pending').length > 0 && (
                                        <div className="space-y-3 mb-8">
                                            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest px-2">Aguardando Validação de PIX</h4>
                                            {tickets.filter(t => t.status === 'pending').map(t => (
                                                <div key={t.id} className="group flex items-center justify-between bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/10 hover:border-yellow-500/30 transition-all">
                                                    <div>
                                                        <div className="text-sm font-black text-white uppercase italic">{t.profiles?.nickname}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">{t.profiles?.full_name}</div>
                                                    </div>
                                                    <Button size="sm" onClick={() => approveTicket(t.id)} className="bg-yellow-500 hover:bg-yellow-400 text-black h-9 font-black text-[10px] uppercase rounded-xl">Autorizar Entrada</Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Soldados Confirmados</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {tickets.filter(t => t.status === 'paid').map(t => (
                                            <div key={t.id} className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <div className="text-sm font-black text-white/80 uppercase italic">{t.profiles?.nickname}</div>
                                                </div>
                                                <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Pronto para o Round 1</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Survival Monitor */}
                            <Card className="bg-black/40 border-white/5 rounded-[2.5rem] backdrop-blur-md">
                                <CardHeader className="flex flex-row justify-between items-center border-b border-white/5 px-8">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-white font-black uppercase tracking-tighter flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-yellow-500" /> Monitor de Sobreviventes
                                        </CardTitle>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Resultados em Milissegundos</p>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4">
                                    {rankings.length === 0 ? (
                                        <div className="text-center py-20 text-gray-600 flex flex-col items-center grayscale opacity-50">
                                            <Zap className="h-12 w-12 mb-4 animate-pulse" />
                                            <p className="text-xs uppercase font-black tracking-[0.2em]">O Quiz ainda não foi iniciado</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {rankings.map((r, i) => (
                                                <div key={r.id} className={`group relative flex items-center justify-between p-5 rounded-[2rem] border transition-all ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'bg-white/[0.02] border-white/5'}`}>
                                                    {i === 0 && <Badge className="absolute -top-3 left-6 bg-yellow-500 text-black font-black uppercase text-[9px] tracking-widest h-6 px-3 border-4 border-[#0a0a0a]">TOP SURVIVOR</Badge>}
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-2xl bg-white/10 overflow-hidden border border-white/20 flex items-center justify-center font-black text-white italic">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-black text-white uppercase italic tracking-tight">{r.profiles?.nickname}</div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className={`text-[9px] font-black uppercase ${r.total_correct >= 5 ? 'text-green-500 border-green-500/30' : 'text-yellow-500 border-yellow-500/30'}`}>
                                                                    Round {r.total_correct} Completo
                                                                </Badge>
                                                                <span className="text-[10px] font-mono text-gray-500 font-bold">{r.total_time_ms}ms acumulados</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        disabled={selectedQuiz.validated_winner_id === r.user_id}
                                                        onClick={() => validateWinner(r.user_id)}
                                                        className={`${selectedQuiz.validated_winner_id === r.user_id ? 'bg-green-600 text-white' : 'bg-white hover:bg-yellow-500 hover:text-black'} text-black h-10 px-5 text-[10px] font-black uppercase rounded-xl transition-all`}
                                                    >
                                                        {selectedQuiz.validated_winner_id === r.user_id ? "VENCEDOR OFICIAL" : "Validar Vitória"}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


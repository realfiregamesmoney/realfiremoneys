import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Zap, Users, Trophy, CheckCircle2, Clock, Star, Layout, Lock, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AdminVault from "./AdminVault";
import { Textarea } from "@/components/ui/textarea";
import { sendPushNotification } from "@/utils/onesignal";

export default function AdminQuiz() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("list");
    const [vaults, setVaults] = useState<any[]>([]);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [monitorTab, setMonitorTab] = useState("radar");
    const [showOnlyFinalists, setShowOnlyFinalists] = useState(false);

    const initialForm = {
        title: "",
        scheduled_at: "",
        ticket_price: 10,
        prize_type: "cash",
        prize_product_name: "",
        prize_product_image: "",
        prize_product_value: 0,
        estimated_prize_value: 1000,
        platform_fee_percent: 30,
        primary_color: "#EAB308",
        secondary_color: "#000000",
        symbol_icon: "Zap",
        banner_url: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070",
        is_prize_fixed: false,
        welcome_text: "Participe do Mega Quiz e ganhe prêmios!",
        show_estimated_value: true,
        custom_info_text: "AO VIVO NO APP • TODA TERÇA ÀS 21H",
        custom_info_color: "#EAB308",
        rules_text: "O jogo consiste em 5 perguntas oficiais e 1 desempate. Se errar, você pode reviver pagando com seu saldo do app.",
        extra_rules_text: "A cada rodada o tempo diminui e a pressão aumenta!",
        button_text: "Reservar Meu Ticket",
        questions: Array(6).fill(0).map((_, i) => ({
            id: i,
            text: i === 5 ? "PERGUNTA MATA-MATA (DESEMPATE)" : `Pergunta ${i + 1}`,
            options: ["A", "B", "C", "D"],
            correctIndex: 0,
            time_limit: 10,
            proposal_time_limit: 10,
            allow_extra_attempt: i < 3,
            extra_attempt_price: 5,
            inter_question_delay: 59
        })),
        winner_message: "O jogo deu empate, mas você foi o vencedor. Parabéns pela sobrevivência. Você receberá um troféu dourado grande e brilhante de sobrevivente número 1, e seu prêmio já está na sua conta.",
        runner_up_message: "Deu empate e infelizmente você não foi o mais rápido no tempo das respostas, sinto muito, não foi dessa vez. Mas nós te daremos um troféu prateado de sobrevivente e você também ganhará um passe livre para participar de um torneio."
    };

    const QUIZ_TEMPLATES = {
        ff_especial: {
            title: "MEGA QUIZ FF: EDIÇÃO ESPECIAL IPHONE",
            ticket_price: 15,
            prize_type: "product",
            prize_product_name: "iPhone 15 Pro Max 256GB",
            prize_product_image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=2070",
            prize_product_value: 8500,
            estimated_prize_value: 5000,
            welcome_text: "O MAIOR MEGA QUIZ DE FREE FIRE DO BRASIL!",
            rules_text: "Responda corretamente para avançar. Se errar, você tem 10 segundos para renascer e continuar!",
            button_text: "GARANTIR MINHA VAGA",
            questions: [
                { id: 0, text: "Qual dessas armas usa munição AR?", options: ["MP40", "M4A1", "AWM", "M1887"], correctIndex: 1, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 5, inter_question_delay: 59 },
                { id: 1, text: "Qual o nome do mapa clássico do Free Fire?", options: ["Kalahari", "Purgatório", "Bermuda", "Alpine"], correctIndex: 2, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 8, inter_question_delay: 59 },
                { id: 2, text: "Qual personagem tem a habilidade 'Som na Caixa'?", options: ["Alok", "Chrono", "Kelly", "Hayato"], correctIndex: 0, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 12, inter_question_delay: 59 },
                { id: 3, text: "Em qual cidade fica a 'Clock Tower' no mapa Bermuda?", options: ["Peak", "Factory", "Clock Tower", "Bimasakti"], correctIndex: 2, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 15, inter_question_delay: 59 },
                { id: 4, text: "Qual o dano base (nas pernas) da AWM sem colete?", options: ["150", "300", "110", "190"], correctIndex: 2, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 20, inter_question_delay: 59 },
                { id: 5, text: "MORTE SÚBITA: Qual ano o Free Fire foi lançado globalmente?", options: ["2016", "2017", "2018", "2019"], correctIndex: 1, time_limit: 10, proposal_time_limit: 0, allow_extra_attempt: false, extra_attempt_price: 0, inter_question_delay: 59 }
            ]
        },
        survival_basic: {
            title: "OPERACAO SOBREVIVENCIA: NIVEL 1",
            ticket_price: 5,
            prize_type: "cash",
            estimated_prize_value: 500,
            welcome_text: "BEM-VINDO AO SOBREVIVENCIA FIRE!",
            rules_text: "5 perguntas. 1 Sobrevivente. Errou? Renasça em 10 segundos.",
            button_text: "ENTRAR NO COMBATE",
            questions: [
                { id: 0, text: "Pergunta de Entrada", options: ["A", "B", "C", "D"], correctIndex: 0, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 2, inter_question_delay: 59 },
                { id: 1, text: "Pergunta 2", options: ["A", "B", "C", "D"], correctIndex: 1, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 4, inter_question_delay: 59 },
                { id: 2, text: "Pergunta 3", options: ["A", "B", "C", "D"], correctIndex: 2, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 6, inter_question_delay: 59 },
                { id: 3, text: "Pergunta 4", options: ["A", "B", "C", "D"], correctIndex: 3, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 8, inter_question_delay: 59 },
                { id: 4, text: "Pergunta Latal", options: ["A", "B", "C", "D"], correctIndex: 0, time_limit: 10, proposal_time_limit: 10, allow_extra_attempt: true, extra_attempt_price: 15, inter_question_delay: 59 },
                { id: 5, text: "MORTE SUBITA", options: ["A", "B", "C", "D"], correctIndex: 1, time_limit: 10, proposal_time_limit: 0, allow_extra_attempt: false, extra_attempt_price: 0, inter_question_delay: 59 }
            ]
        }
    };


    const [formData, setFormData] = useState<any>(initialForm);

    useEffect(() => {
        loadQuizzes();
        loadVaults();
    }, []);

    const loadVaults = async () => {
        const { data } = await supabase.from('vault_events').select('*').eq('status', 'active');
        setVaults(data || []);
    };

    const loadQuizzes = async () => {
        setLoading(true);
        const { data } = await supabase.from('quiz_events').select('*').order('created_at', { ascending: false });
        setQuizzes(data || []);
        setLoading(false);
    };

    const loadQuizDetails = async (quiz: any) => {
        setSelectedQuiz(quiz);
        const { data: ticketData } = await supabase.from('quiz_tickets').select('*, profiles(nickname, full_name)').eq('quiz_id', quiz.id);
        setTickets(ticketData || []);
        const { data: rankData } = await supabase
            .from('quiz_rankings')
            .select('*, profiles(nickname, avatar_url)')
            .eq('quiz_id', quiz.id)
            .order('total_correct', { ascending: false })
            .order('total_time_ms', { ascending: true });
        setRankings(rankData || []);
    };

    const fillExampleData = () => {
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0);

        setFormData({
            title: "MEGA QUIZ FF: EDIÇÃO ESPECIAL IPHONE",
            scheduled_at: nextHour.toISOString().slice(0, 16),
            ticket_price: 15,
            prize_type: "product",
            prize_product_name: "iPhone 15 Pro Max 256GB",
            prize_product_image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=2070",
            prize_product_value: 8500,
            estimated_prize_value: 5000,
            platform_fee_percent: 30,
            primary_color: "#EAB308",
            secondary_color: "#000000",
            symbol_icon: "Trophy",
            banner_url: "https://images.unsplash.com/photo-1614017273232-fb9038234676?q=80&w=2070",
            welcome_text: "O MAIOR MEGA QUIZ DE FREE FIRE DO BRASIL!",
            rules_text: "Responda corretamente para avançar. Se for eliminado até a Fase 3, você pode renascer por um custo adicional utilizando seu saldo da FireMoney.",
            extra_rules_text: "Rounds 4 e 5 são zonas letais: Não há renascimento. O Round 6 é a Morte Súbita para desempate.",
            button_text: "GARANTIR VAGA NA ELITE",
            questions: [
                { id: 0, text: "Qual dessas armas usa munição AR?", options: ["MP40", "M4A1", "AWM", "M1887"], correctIndex: 1, time_limit: 10, proposal_time_limit: 15, allow_extra_attempt: true, extra_attempt_price: 5, inter_question_delay: 5 },
                { id: 1, text: "Qual o nome do mapa clássico do Free Fire?", options: ["Kalahari", "Purgatório", "Bermuda", "Alpine"], correctIndex: 2, time_limit: 10, proposal_time_limit: 15, allow_extra_attempt: true, extra_attempt_price: 10, inter_question_delay: 5 },
                { id: 2, text: "Qual personagem tem a habilidade 'Som na Caixa'?", options: ["Alok", "Chrono", "Kelly", "Hayato"], correctIndex: 0, time_limit: 8, proposal_time_limit: 12, allow_extra_attempt: true, extra_attempt_price: 15, inter_question_delay: 8 },
                { id: 3, text: "Em qual cidade fica a 'Clock Tower' no mapa Bermuda?", options: ["Peak", "Factory", "Clock Tower", "Bimasakti"], correctIndex: 2, time_limit: 8, proposal_time_limit: 12, allow_extra_attempt: false, extra_attempt_price: 0, inter_question_delay: 10 },
                { id: 4, text: "Qual o dano base (nas pernas) da AWM sem colete?", options: ["150", "300", "110", "190"], correctIndex: 2, time_limit: 5, proposal_time_limit: 5, allow_extra_attempt: false, extra_attempt_price: 0, inter_question_delay: 5 },
                { id: 5, text: "MORTE SÚBITA: Qual ano o Free Fire foi lançado globalmente?", options: ["2016", "2017", "2018", "2019"], correctIndex: 1, time_limit: 5, proposal_time_limit: 5, allow_extra_attempt: false, extra_attempt_price: 0, inter_question_delay: 5 }
            ]
        });
        toast({ title: "Dados carregados!" });
    };

    const handleSave = async () => {
        try {
            if (!formData.title || !formData.scheduled_at) {
                toast({ title: "Título e Data obrigatórios", variant: "destructive" });
                return;
            }
            // Limpeza e validação rigorosa do payload
            const sanitizedQuestions = (formData.questions || []).map((q: any) => ({
                ...q,
                time_limit: Number(q.time_limit) || 15,
                proposal_time_limit: Number(q.proposal_time_limit) || 10,
                inter_question_delay: Number(q.inter_question_delay) || 5,
                extra_attempt_price: Number(q.extra_attempt_price) || 0,
                correctIndex: Number(q.correctIndex) || 0
            }));

            const cleanUrl = (url: any) => {
                if (!url) return null;
                let src = String(url).trim();

                // Extrator Inteligente: Detecta [img]...[/img] (Padrão ImgBB)
                const bbMsgMatch = src.match(/\[img\](.*?)\[\/img\]/i);
                if (bbMsgMatch && bbMsgMatch[1]) {
                    src = bbMsgMatch[1].trim();
                } else {
                    // Tentar extrair de tags HTML <img>
                    const htmlMatch = src.match(/src=["'](.*?)["']/i);
                    if (htmlMatch && htmlMatch[1]) src = htmlMatch[1].trim();
                }

                if (src === "" || src.toLowerCase() === "null" || src.toLowerCase() === "undefined") return null;
                if (src.length < 3) return null;
                return src;
            };


            const payload: any = {
                title: formData.title.trim(),
                scheduled_at: new Date(formData.scheduled_at).toISOString(),
                ticket_price: Number(formData.ticket_price) || 0,
                prize_type: formData.prize_type || 'cash',
                prize_product_name: (formData.prize_product_name || "").trim() || null,
                prize_product_image: cleanUrl(formData.prize_product_image),
                prize_product_value: Number(formData.prize_product_value) || 0,
                platform_fee_percent: Number(formData.platform_fee_percent) || 30,
                estimated_prize_value: Number(formData.estimated_prize_value) || 0,
                primary_color: formData.primary_color || "#EAB308",
                secondary_color: formData.secondary_color || "#000000",
                symbol_icon: formData.symbol_icon || "Zap",
                banner_url: cleanUrl(formData.banner_url),
                welcome_text: (formData.welcome_text || "").trim(),
                rules_text: (formData.rules_text || "").trim(),
                extra_rules_text: (formData.extra_rules_text || "").trim(),
                button_text: (formData.button_text || "").trim(),
                questions: sanitizedQuestions,
                winner_message: (formData.winner_message || "").trim(),
                runner_up_message: (formData.runner_up_message || "").trim(),
                // Sincronia de Premiação: is_prize_fixed é exclusivo para quiz_events
                is_prize_fixed: !!formData.is_prize_fixed,
                show_estimated_value: !!formData.show_estimated_value,
                custom_info_text: (formData.custom_info_text || "").trim(),
                custom_info_color: formData.custom_info_color || "#EAB308",
                status: editMode ? undefined : 'scheduled'
            };





            let res;

            if (editMode && editingId) {
                res = await supabase.from('quiz_events').update(payload).eq('id', editingId);
            } else {
                res = await supabase.from('quiz_events').insert([payload]);
            }

            // AUTO-REPARO: Se o banco de dados reclamar que as colunas novas não existem no cache
            if (res.error && (res.error.message?.includes('column') || res.error.message?.includes('cache'))) {
                console.warn("Detectado schema desatualizado. Re-tentando salvamento de segurança sem colunas novas...");
                const safePayload = { ...payload };
                delete safePayload.winner_message;
                delete safePayload.runner_up_message;
                delete safePayload.is_prize_fixed;
                delete safePayload.show_estimated_value;
                delete safePayload.custom_info_text;
                delete safePayload.custom_info_color;

                if (editMode && editingId) {
                    res = await supabase.from('quiz_events').update(safePayload).eq('id', editingId);
                } else {
                    res = await supabase.from('quiz_events').insert([safePayload]);
                }
            }



            if (res.error) throw res.error;

            toast({
                title: editMode ? "Quiz atualizado!" : "Mega Quiz agendado!",
                description: payload.runner_up_message ? undefined : "Nota: Mensagens personalizadas salvas apenas localmente (Aguardando Sync de Banco)."
            });

            // FIM DO SILÊNCIO: Notificações e Logs
            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser) {
                    const { error: logErr } = await supabase.from("audit_logs").insert({
                        admin_id: currentUser.id,
                        action_type: 'quiz_event_save',
                        details: `${editMode ? 'Editou' : 'Agendou'} Mega Quiz: ${payload.title}`
                    });
                    if (logErr) toast({ variant: "warning", title: "Erro de Log", description: "Quiz salvo, mas houve um erro ao registrar a auditoria." });
                }
            } catch (e) { console.error("Erro no log de auditoria do quiz:", e); }

            try {
                await sendPushNotification(
                    'push_announcements',
                    editMode ? 'Mega Quiz Atualizado! 🔥' : 'Novo Mega Quiz Agendado! 🚀',
                    `Prepare seu cérebro: ${payload.title} começa logo mais. Não fique de fora!`
                );
            } catch (e) {
                console.error("Erro no push do quiz:", e);
                toast({ variant: "warning", title: "Push Indisponível", description: "Quiz salvo, mas não foi possível notificar os jogadores pelo OneSignal." });
            }

            setEditMode(false);
            setEditingId(null);
            setFormData(initialForm);
            setActiveTab("list");
            loadQuizzes();
        } catch (e: any) {
            console.error("Erro completo ao salvar Quiz:", e);
            toast({
                title: "Erro ao salvar",
                description: e.message || "Verifique os campos e tente novamente.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este quiz permanentemente?")) return;
        const { error } = await supabase.from('quiz_events').delete().eq('id', id);
        if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
        else {
            toast({ title: "Quiz excluído" });
            loadQuizzes();
        }
    };

    const handleEdit = (quiz: any) => {
        setFormData({
            ...initialForm,
            ...quiz,
            scheduled_at: new Date(quiz.scheduled_at).toISOString().slice(0, 16)
        });
        setEditMode(true);
        setEditingId(quiz.id);
        setActiveTab("create");
    };


    const handleSendAlert = async () => {
        if (!broadcastMessage) return;
        const { error } = await supabase.from('broadcast_messages').insert({ message: broadcastMessage });
        if (error) toast({ title: "Erro no alerta", variant: "destructive" });
        else {
            toast({ title: "Alerta enviado!" });
            setBroadcastMessage("");
        }
    };

    const updateStatus = async (id: string, status: string) => {
        const payload: any = { status };
        // Correção 2: Remove a sobreposição do scheduled_at que matava o relógio ao vivo
        // if (status === 'live') {
        //    payload.scheduled_at = new Date().toISOString();
        // }
        await supabase.from('quiz_events').update(payload).eq('id', id);
        toast({ title: `Status: ${status.toUpperCase()}` });
        loadQuizzes();
    };

    const approveTicket = async (id: string) => {
        await supabase.from('quiz_tickets').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
        toast({ title: "Ticket aprovado!" });
        if (selectedQuiz) loadQuizDetails(selectedQuiz);
    };

    const validateWinner = async (userId: string) => {
        if (!confirm("Confirmar este jogador como VENCEDOR SUPREMO? O prêmio será creditado e as mensagens de vitória/empate enviadas.")) return;

        try {
            const { error } = await supabase.rpc('finalize_quiz_winner', {
                p_quiz_id: selectedQuiz.id,
                p_winner_id: userId
            });

            if (error) throw error;

            toast({ title: "Vencedor Consagrado!", description: "Prêmio creditado e mensagens enviadas." });
            loadQuizzes();
            if (selectedQuiz) loadQuizDetails(selectedQuiz);
        } catch (e: any) {
            toast({ title: "Erro na validação", description: e.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-black/40 border-white/5 p-6 rounded-[2.5rem] backdrop-blur-md">
                <div className="flex flex-col md:flex-row gap-4">
                    <Input
                        placeholder="Mensagem para TODOS os jogadores (ex: Começa em 10s!)..."
                        value={broadcastMessage}
                        onChange={e => setBroadcastMessage(e.target.value)}
                        className="bg-black/40 border-white/10 h-14 rounded-2xl"
                    />
                    <Button onClick={handleSendAlert} className="bg-orange-600 hover:bg-orange-500 font-black uppercase text-[10px] px-8 h-14 rounded-2xl shadow-lg">Mandar Alerta</Button>
                </div>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-black/40 border border-white/10 p-1 mb-4 h-14 rounded-3xl">
                    <TabsTrigger value="list" className="rounded-2xl data-[state=active]:bg-orange-600 font-black uppercase text-[10px]">Eventos</TabsTrigger>
                    <TabsTrigger value="create" className="rounded-2xl data-[state=active]:bg-orange-600 font-black uppercase text-[10px]">{editMode ? 'Editar' : 'Novo'}</TabsTrigger>
                    <TabsTrigger value="vault" className="rounded-2xl data-[state=active]:bg-orange-600 font-black uppercase text-[10px]">Cofre</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-8">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div>
                    ) : (
                        <div className="space-y-10">
                            {/* COFRES ATIVOS SEÇÃO */}
                            {vaults.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Lock className="h-4 w-4 text-yellow-500" />
                                        <h3 className="text-xs font-black uppercase text-yellow-500 tracking-widest">Cofres Ativos</h3>
                                        <Badge className="bg-yellow-500 text-black text-[9px] font-black">{vaults.length}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {vaults.map(v => (
                                            <Card key={v.id} className="bg-[#0c0c0c] border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group relative overflow-hidden" onClick={() => setActiveTab("vault")}>
                                                <div className="h-1.5 w-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-white text-lg font-black uppercase italic tracking-tight">{v.title}</CardTitle>
                                                        <Badge variant="outline" className="uppercase text-[9px] font-black text-yellow-500 border-yellow-500/20">COFRE ATIVO</Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="flex justify-between items-center bg-yellow-500/5 p-3 rounded-xl border border-yellow-500/10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                                                <Trophy className="h-5 w-5 text-yellow-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-gray-500 font-bold uppercase">Premiação</p>
                                                                <p className="text-xs text-white font-black">
                                                                    {v.prize_type === 'cash' ? `R$ ${v.prize_pool}` : v.prize_product_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-yellow-500 hover:bg-yellow-500/10">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* QUIZZES SEÇÃO */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    <h3 className="text-xs font-black uppercase text-orange-500 tracking-widest">Mega Quizzes</h3>
                                    <Badge className="bg-orange-600 text-white text-[9px] font-black">{quizzes.length}</Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {quizzes.map(q => (
                                        <Card key={q.id} className="bg-[#111] border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group" onClick={() => loadQuizDetails(q)}>
                                            <div className={`h-1.5 w-full ${q.status === 'live' ? 'bg-green-500 animate-pulse' : q.status === 'finished' ? 'bg-gray-700' : 'bg-orange-500'}`}></div>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-white text-lg font-black uppercase italic tracking-tight">{q.title}</CardTitle>
                                                    <Badge variant="outline" className="uppercase text-[9px] font-black">{q.status}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                                    <div className="flex items-center gap-3">
                                                        {q.prize_type === 'product' && q.prize_product_image ? (
                                                            <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                                                                <img src={q.prize_product_image} alt="Produto" className="h-full w-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-12 w-12 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                                                <Trophy className="h-6 w-6 text-green-500" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Premiação</p>
                                                            <p className="text-xs text-white font-bold truncate max-w-[120px]">
                                                                {q.prize_type === 'product' ? q.prize_product_name : `R$ ${q.estimated_prize_value}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Entrada</p>
                                                        <p className="text-sm text-green-500 font-black">R$ {q.ticket_price}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {q.status === 'scheduled' && (
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(q.id, 'live'); }} className="flex-1 bg-green-600 hover:bg-green-500 h-9 text-[10px] font-black uppercase rounded-xl">Iniciar Agora</Button>
                                                    )}
                                                    {q.status === 'live' && (
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(q.id, 'finished'); }} className="flex-1 bg-red-600 hover:bg-red-500 h-9 text-[10px] font-black uppercase rounded-xl">Finalizar</Button>
                                                    )}
                                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(q); }} className="h-9 px-4 border-white/10 text-white font-black uppercase text-[10px] rounded-xl hover:bg-white/10">Editar</Button>
                                                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="h-9 w-9 p-0 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="create">
                    <Card className="bg-[#111] border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                        <CardHeader className="p-10 border-b border-white/5 flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-white">{editMode ? 'Editar Operação' : 'Nova Operação Survival'}</CardTitle>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Protocolo de Configuração do Mega Quiz</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => {
                                    const nextHour = new Date();
                                    nextHour.setHours(nextHour.getHours() + 1);
                                    nextHour.setMinutes(0);
                                    setFormData({ ...initialForm, ...QUIZ_TEMPLATES.ff_especial, scheduled_at: nextHour.toISOString().slice(0, 16) });
                                    toast({ title: "Template Free Fire Carregado!" });
                                }} className="rounded-full border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-black font-black uppercase text-[9px] px-4 h-10">
                                    FF PRO PROD
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    const nextHour = new Date();
                                    nextHour.setHours(nextHour.getHours() + 1);
                                    nextHour.setMinutes(0);
                                    setFormData({ ...initialForm, ...QUIZ_TEMPLATES.survival_basic, scheduled_at: nextHour.toISOString().slice(0, 16) });
                                    toast({ title: "Template Básico Carregado!" });
                                }} className="rounded-full border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-black font-black uppercase text-[9px] px-4 h-10">
                                    SURVIVAL CASH
                                </Button>
                            </div>

                        </CardHeader>
                        <CardContent className="p-10 space-y-12">
                            <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="bg-black/20 border-white/5 mb-8 rounded-2xl h-12 w-full flex overflow-x-auto shadow-inner shadow-black/50">
                                    <TabsTrigger value="basic" className="flex-1 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-yellow-500 text-[10px] sm:text-xs font-black uppercase transition-all">Dados Básicos</TabsTrigger>
                                    <TabsTrigger value="design" className="flex-1 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-yellow-500 text-[10px] sm:text-xs font-black uppercase transition-all">Textos & Design</TabsTrigger>
                                    <TabsTrigger value="questions" className="flex-1 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-yellow-500 text-[10px] sm:text-xs font-black uppercase transition-all">Regras & Fases</TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-8 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-gray-500">Título do Evento</Label>
                                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-black/40 border-white/10 h-16 rounded-2xl text-xl font-black italic text-orange-500" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-gray-500">Início</Label>
                                                <Input type="datetime-local" value={formData.scheduled_at} onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })} className="bg-black/40 border-white/10 h-16 rounded-2xl font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-gray-500">Ticket (R$)</Label>
                                                <Input type="number" value={formData.ticket_price} onChange={e => setFormData({ ...formData, ticket_price: Number(e.target.value) })} className="bg-black/40 border-white/10 h-16 rounded-2xl text-white font-black text-center text-lg" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2 mb-4"><Trophy className="h-4 w-4 text-orange-500" /> Premiação</h4>
                                        <RadioGroup value={formData.prize_type} onValueChange={v => setFormData({ ...formData, prize_type: v })} className="flex gap-6 mb-6">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="p_cash" /><Label htmlFor="p_cash" className="text-xs font-black uppercase">PIX</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="product" id="p_prod" /><Label htmlFor="p_prod" className="text-xs font-black uppercase">Produto</Label></div>
                                        </RadioGroup>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {formData.prize_type === 'cash' ? (
                                                <>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <Label className="text-[10px] font-black uppercase text-gray-500">Taxa Plat (%)</Label>
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" checked={formData.is_prize_fixed} onChange={e => setFormData({ ...formData, is_prize_fixed: e.target.checked })} id="fixed_p" />
                                                                <Label htmlFor="fixed_p" className="text-[9px] font-black uppercase text-orange-500 cursor-pointer">Prêmio Fixo</Label>
                                                            </div>
                                                        </div>
                                                        <Input type="number" value={formData.platform_fee_percent} onChange={e => setFormData({ ...formData, platform_fee_percent: Number(e.target.value) })} className="bg-black/40 border-white/5 h-14 rounded-xl" disabled={formData.is_prize_fixed} />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase text-gray-500">{formData.is_prize_fixed ? "Valor do Prêmio Travado (R$)" : "Prêmio Mínimo (R$)"}</Label>
                                                        <Input type="number" value={formData.estimated_prize_value} onChange={e => setFormData({ ...formData, estimated_prize_value: Number(e.target.value) })} className={`bg-black/40 border-white/5 h-14 rounded-xl font-bold ${formData.is_prize_fixed ? 'text-orange-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-green-500'}`} />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Nome do Produto</Label><Input value={formData.prize_product_name} onChange={e => setFormData({ ...formData, prize_product_name: e.target.value })} className="bg-black/40 border-white/5 h-14 rounded-xl font-bold" /></div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase text-gray-500">Foto do Produto (URL)</Label>
                                                        <Input value={formData.prize_product_image} onChange={e => setFormData({ ...formData, prize_product_image: e.target.value })} className="bg-black/40 border-white/5 h-14 rounded-xl" placeholder="https://..." />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase text-gray-500">Valor Estimado (R$)</Label>
                                                            <Input type="number" value={formData.estimated_prize_value} onChange={e => setFormData({ ...formData, estimated_prize_value: Number(e.target.value) })} className="bg-black/40 border-white/5 h-14 rounded-xl font-bold text-orange-500" />
                                                        </div>
                                                        <div className="flex flex-col justify-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" checked={formData.show_estimated_value} onChange={e => setFormData({ ...formData, show_estimated_value: e.target.checked })} id="show_v" className="h-5 w-5 rounded border-white/10 accent-orange-500 cursor-pointer" />
                                                                <Label htmlFor="show_v" className="text-[10px] font-black uppercase cursor-pointer">Exibir Valor na Tela</Label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>

                                            )}
                                        </div>


                                    </div>
                                </TabsContent>

                                <TabsContent value="design" className="space-y-8 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Banner URL</Label><Input value={formData.banner_url} onChange={e => setFormData({ ...formData, banner_url: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl" /></div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Cor Principal</Label><Input value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl font-mono" /></div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-gray-500">Ícone</Label>
                                                    <Select value={formData.symbol_icon} onValueChange={v => setFormData({ ...formData, symbol_icon: v })}>
                                                        <SelectTrigger className="bg-black/40 border-white/10 h-14 rounded-xl"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-[#111] border-white/5 text-white">
                                                            <SelectItem value="Zap">Raio</SelectItem>
                                                            <SelectItem value="Trophy">Troféu</SelectItem>
                                                            <SelectItem value="Flame">Fogo</SelectItem>
                                                            <SelectItem value="Target">Alvo</SelectItem>
                                                            <SelectItem value="Crown">Coroa</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Título de Boas-Vindas</Label><Input value={formData.welcome_text} onChange={e => setFormData({ ...formData, welcome_text: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl" /></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-gray-500">Selo Info (Texto)</Label>
                                                    <Input value={formData.custom_info_text} onChange={e => setFormData({ ...formData, custom_info_text: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-gray-500">Cor do Selo</Label>
                                                    <Input type="color" value={formData.custom_info_color} onChange={e => setFormData({ ...formData, custom_info_color: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl p-1" />
                                                </div>
                                            </div>
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Descrição das Regras</Label><Textarea value={formData.rules_text} onChange={e => setFormData({ ...formData, rules_text: e.target.value })} className="bg-black/40 border-white/10 min-h-[100px] rounded-xl text-xs" /></div>

                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Texto do Botão</Label><Input value={formData.button_text} onChange={e => setFormData({ ...formData, button_text: e.target.value })} className="bg-black/40 border-white/10 h-14 rounded-xl font-black italic" /></div>
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500 text-yellow-500 block relative bottom-[-10px]">Atenção do BD</Label><p className="text-[9px] text-yellow-500/50 uppercase font-black mb-4">Se os dados abaixo não salvarem, rode a migração SQL no seu painel Supabase para criar as gavetas extras.</p></div>
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-500">Regra Extra (Se Houver)</Label><Textarea value={formData.extra_rules_text} onChange={e => setFormData({ ...formData, extra_rules_text: e.target.value })} className="bg-black/40 border-white/10 min-h-[40px] rounded-xl text-[10px]" /></div>
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-yellow-500">Mensagem de Vitória Exata</Label><Textarea value={formData.winner_message} onChange={e => setFormData({ ...formData, winner_message: e.target.value })} className="bg-black/40 border-white/10 border-yellow-500/20 min-h-[80px] rounded-xl text-[10px]" /></div>
                                            <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-gray-400">Mensagem de Derrota / Finalista</Label><Textarea value={formData.runner_up_message} onChange={e => setFormData({ ...formData, runner_up_message: e.target.value })} className="bg-black/40 border-white/10 min-h-[80px] rounded-xl text-[10px]" /></div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="questions" className="space-y-8 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {formData.questions.map((q: any, idx: number) => (
                                            <div key={idx} className={`p-6 rounded-[2rem] border ${idx === 5 ? 'bg-red-500/5 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <Badge className={`${idx === 5 ? 'bg-red-600' : 'bg-orange-600'} text-white font-black uppercase text-[8px]`}>{idx === 5 ? 'MORTE SÚBITA' : `FASE ${idx + 1}`}</Badge>
                                                    <div className="flex items-center gap-2"><input type="checkbox" checked={q.allow_extra_attempt} onChange={e => { const qs = [...formData.questions]; qs[idx].allow_extra_attempt = e.target.checked; setFormData({ ...formData, questions: qs }); }} /><span className="text-[9px] font-black text-gray-500 uppercase">Reviver?</span></div>
                                                </div>
                                                <Input value={q.text} onChange={e => { const qs = [...formData.questions]; qs[idx].text = e.target.value; setFormData({ ...formData, questions: qs }); }} className="bg-black/40 border-white/10 mb-4 h-11 text-xs font-bold" />
                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                    {q.options.map((opt: string, oi: number) => (
                                                        <div key={oi} className={`flex items-center gap-2 p-2 rounded-lg border ${q.correctIndex === oi ? 'bg-green-500/20 border-green-500/40' : 'bg-black/40 border-white/5'}`}>
                                                            <input type="radio" checked={q.correctIndex === oi} onChange={() => { const qs = [...formData.questions]; qs[idx].correctIndex = oi; setFormData({ ...formData, questions: qs }); }} />
                                                            <Input value={opt} onChange={e => { const qs = [...formData.questions]; qs[idx].options[oi] = e.target.value; setFormData({ ...formData, questions: qs }); }} className="bg-transparent border-none p-0 h-6 text-[10px]" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-1"><Label className="text-[8px] text-gray-600 font-bold uppercase">Resp (s)</Label><Input type="number" value={q.time_limit} onChange={e => { const qs = [...formData.questions]; qs[idx].time_limit = Number(e.target.value); setFormData({ ...formData, questions: qs }); }} className="h-8 text-center text-xs p-0 bg-black/40 border-white/5" /></div>
                                                        <div className="space-y-1"><Label className="text-[8px] text-gray-600 font-bold uppercase">Prop (s)</Label><Input type="number" value={q.proposal_time_limit} onChange={e => { const qs = [...formData.questions]; qs[idx].proposal_time_limit = Number(e.target.value); setFormData({ ...formData, questions: qs }); }} className="h-8 text-center text-xs p-0 bg-black/40 border-white/5" /></div>
                                                        <div className="space-y-1"><Label className="text-[8px] text-gray-600 font-bold uppercase">Atraso (s)</Label><Input type="number" value={q.inter_question_delay} onChange={e => { const qs = [...formData.questions]; qs[idx].inter_question_delay = Number(e.target.value); setFormData({ ...formData, questions: qs }); }} className="h-8 text-center text-xs p-0 bg-black/40 border-white/5" /></div>
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-[8px] text-gray-600 font-bold uppercase text-right block">Custo R$</Label><Input type="number" value={q.extra_attempt_price} onChange={e => { const qs = [...formData.questions]; qs[idx].extra_attempt_price = Number(e.target.value); setFormData({ ...formData, questions: qs }); }} className="h-8 text-center text-xs p-0 bg-black/40 border-white/5" disabled={!q.allow_extra_attempt} /></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <Button onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase h-16 rounded-2xl text-lg shadow-2xl transition-all active:scale-[0.98]">
                                <Save className="mr-3 h-6 w-6" /> {editMode ? 'Salvar Alterações' : 'Lançar Mega Quiz Survival'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vault">
                    <AdminVault />
                </TabsContent>
            </Tabs>

            {selectedQuiz && (
                <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-3xl overflow-y-auto p-4 md:p-12 animate-in fade-in zoom-in-95 duration-500">
                    <div className="max-w-7xl mx-auto space-y-8 pb-32">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.03] p-10 rounded-[3rem] border border-white/5">
                            <div>
                                <h1 className="text-4xl font-black uppercase italic text-white tracking-tighter">{selectedQuiz.title}</h1>
                                <Badge className="mt-2 bg-orange-600 text-[10px] uppercase font-black px-4 h-7">Monitorando em Tempo Real</Badge>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setSelectedQuiz(null)} className="h-14 px-10 rounded-2xl border-white/10 font-bold uppercase text-xs tracking-widest">Fechar Monitor</Button>
                                {selectedQuiz.status === 'live' && <Button onClick={() => updateStatus(selectedQuiz.id, 'finished')} className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-500 font-bold uppercase text-xs">Finalizar Evento</Button>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                            <Card className="md:col-span-5 bg-black/40 border-white/5 rounded-[3rem] overflow-hidden flex flex-col max-h-[700px]">
                                <CardHeader className="p-8 border-b border-white/5">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 flex-col items-start">
                                        <div className="flex items-center gap-2 text-blue-500"><Users className="h-4 w-4" /> Alistamento</div>
                                        <span className="text-[10px] text-gray-600 font-bold mt-1">Gerenciamento de Candidatos</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 overflow-y-auto space-y-4">
                                    {tickets.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-white/20 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-2 w-2 rounded-full ${t.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                                <span className="text-sm font-bold text-white uppercase italic">{t.profiles?.nickname || 'Recruta'}</span>
                                            </div>
                                            {t.status === 'pending' && <Button onClick={() => approveTicket(t.id)} className="h-8 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[9px] uppercase px-4 rounded-lg">Aprovar</Button>}
                                            {t.status === 'paid' && <span className="text-[8px] text-gray-600 font-black uppercase">CONFIRMADO</span>}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-7 bg-black/40 border-white/5 rounded-[3rem] overflow-hidden flex flex-col max-h-[700px]">
                                <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-yellow-500"><Trophy className="h-4 w-4" /> Inteligência de Sobrevivência</CardTitle>
                                        <p className="text-[8px] text-gray-600 font-bold uppercase">Monitorando precisão e tempo de resposta em ms</p>
                                    </div>
                                    <div className="flex bg-white/5 p-1 rounded-xl">
                                        <Button variant="ghost" onClick={() => setMonitorTab("radar")} className={`h-8 rounded-lg text-[9px] font-black uppercase ${monitorTab === 'radar' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500'}`}>Radar Geral</Button>
                                        <Button variant="ghost" onClick={() => setMonitorTab("speed")} className={`h-8 rounded-lg text-[9px] font-black uppercase ml-2 ${monitorTab === 'speed' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Ranking Rápido</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
                                    {rankings
                                        .filter(r => !showOnlyFinalists || r.total_correct === 6)
                                        .map((r, i) => (
                                            <div key={r.id} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all">
                                                {(monitorTab === 'speed' && i === 0) && <div className="absolute top-0 right-0 p-1.5 bg-blue-500 text-white text-[8px] font-black uppercase tracking-tighter">O MAIS RÁPIDO DO BRASIL</div>}
                                                {i === 0 && monitorTab === 'radar' && <div className="absolute top-0 right-0 p-1.5 bg-yellow-500 text-black text-[8px] font-black uppercase">LÍDER ATUAL</div>}

                                                <div className="flex items-center gap-5">
                                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl italic text-white ${monitorTab === 'speed' ? 'bg-blue-500/10' : 'bg-white/5'}`}>{i + 1}</div>
                                                    <div>
                                                        <p className="text-lg font-black text-white italic uppercase">{r.profiles?.nickname}</p>
                                                        <div className="flex items-center gap-3">
                                                            <Badge className="bg-white/5 text-[8px] font-bold text-gray-400">{r.total_correct} ACERTO(S)</Badge>
                                                            <Badge className="bg-orange-500/10 text-orange-500 text-[8px] font-black">{(r.total_time_ms / 1000).toFixed(3)}s</Badge>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {r.total_correct >= 5 && !selectedQuiz.validated_winner_id && (
                                                        <Button onClick={() => validateWinner(r.user_id)} className="bg-white text-black hover:bg-yellow-500 font-black text-[10px] uppercase h-10 px-6 rounded-xl shadow-lg border border-white/20">Lançar & Pagar</Button>
                                                    )}
                                                    {selectedQuiz.validated_winner_id === r.user_id && (
                                                        <Badge className="bg-yellow-500 text-black font-black uppercase text-[10px] px-4 h-10 rounded-xl">VENCEDOR SUPREMO</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </CardContent>
                                <CardHeader className="p-6 border-t border-white/5 flex flex-row gap-4">
                                    <Button variant="outline" onClick={() => setShowOnlyFinalists(!showOnlyFinalists)} className={`flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyFinalists ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                                        <Trophy className={`mr-2 h-4 w-4 ${showOnlyFinalists ? 'fill-orange-500' : ''}`} /> VENCEDORES
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const winnerEligible = rankings.filter(r => r.total_correct >= 5)[0];
                                            if (winnerEligible) validateWinner(winnerEligible.user_id);
                                            else toast({ title: "Ninguém qualificado", description: "Não há jogadores no radar que acertaram as perguntas mínimas.", variant: "destructive" });
                                        }}
                                        disabled={!!selectedQuiz.validated_winner_id}
                                        className="flex-1 h-14 rounded-2xl bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-yellow-600/20"
                                    >
                                        <Zap className="mr-2 h-4 w-4 fill-black" /> LANÇAR VENCEDOR
                                    </Button>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

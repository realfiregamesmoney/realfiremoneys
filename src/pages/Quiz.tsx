import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Trophy, Users, Zap, AlertCircle, CheckCircle2, XCircle, Wallet, QrCode, Copy, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Vault from "@/components/Vault";

export default function Quiz() {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState("quiz");
    const [event, setEvent] = useState<any>(null);
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [totalTickets, setTotalTickets] = useState(0);
    const [showPixModal, setShowPixModal] = useState(false);

    // Quiz State
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [eliminated, setEliminated] = useState(false);
    const [finished, setFinished] = useState(false);
    const [isMataMata, setIsMataMata] = useState(false);
    const [responses, setResponses] = useState<any[]>([]);
    const [startTime, setStartTime] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [survivorCount, setSurvivorCount] = useState<number | null>(null);

    useEffect(() => {
        loadData();

        // Subscription for event status changes
        const eventChannel = supabase
            .channel('quiz_event_status')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_events' }, (payload) => {
                setEvent(payload.new);
                if (payload.new.status === 'live' && !quizStarted) {
                    startQuiz();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(eventChannel);
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: eventData } = await supabase
                .from('quiz_events')
                .select('*')
                .or('status.eq.scheduled,status.eq.live')
                .order('scheduled_at', { ascending: true })
                .limit(1)
                .single();

            if (eventData) {
                setEvent(eventData);

                if (user) {
                    const { data: ticketData } = await supabase
                        .from('quiz_tickets')
                        .select('*')
                        .eq('quiz_id', eventData.id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    setTicket(ticketData);
                }

                if (eventData.status === 'live') {
                    startQuiz();
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketCount = async () => {
        if (!event?.id) return;
        const { count } = await supabase
            .from('quiz_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', event.id)
            .eq('status', 'paid');
        setTotalTickets(count || 0);
    };

    useEffect(() => {
        if (event?.id) fetchTicketCount();
    }, [event]);

    const startQuiz = () => {
        setQuizStarted(true);
        setCurrentQuestionIndex(0);
        setStartTime(Date.now());
    };

    const checkSurvivors = async (qIndex: number) => {
        const { count } = await supabase
            .from('quiz_rankings')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', event.id)
            .eq('total_correct', qIndex + 1);
        return count || 0;
    };

    const handleAnswer = async (answerIndex: number) => {
        if (eliminated || finished) return;

        const timeTaken = Date.now() - startTime;
        const currentQuestion = event.questions[currentQuestionIndex];
        const isCorrect = answerIndex === currentQuestion.correctIndex;

        const newResponse = {
            quiz_id: event.id,
            user_id: user?.id,
            question_index: currentQuestionIndex,
            answer_index: answerIndex,
            is_correct: isCorrect,
            time_ms: timeTaken
        };

        const updatedResponses = [...responses, newResponse];
        setResponses(updatedResponses);

        await supabase.from('quiz_responses').insert(newResponse);

        if (!isCorrect) {
            setEliminated(true);
            toast.error("Resposta incorreta! Você foi eliminado.");
            return;
        }

        const totalTime = updatedResponses.reduce((acc, r) => acc + r.time_ms, 0);
        await supabase.from('quiz_rankings').upsert({
            quiz_id: event.id,
            user_id: user?.id,
            total_correct: currentQuestionIndex + 1,
            total_time_ms: totalTime,
            finished_at: new Date().toISOString()
        }, { onConflict: 'quiz_id,user_id' });

        toast.info("Processando rodada...", { duration: 1000 });
        await new Promise(r => setTimeout(r, 1500));

        const survivors = await checkSurvivors(currentQuestionIndex);
        setSurvivorCount(survivors);

        if (survivors === 1 && currentQuestionIndex < 4) {
            setFinished(true);
            toast.success("VOCÊ É O ÚNICO SOBREVIVENTE!", { description: "Parabéns, os outros erraram e você ganhou antecipadamente!" });
            return;
        }

        if (currentQuestionIndex < 4) {
            setCurrentQuestionIndex(prev => prev + 1);
            setStartTime(Date.now());
            setTimeLeft(15);
        }
        else if (currentQuestionIndex === 4) {
            const { data: topPlayers } = await supabase
                .from('quiz_rankings')
                .select('*')
                .eq('quiz_id', event.id)
                .eq('total_correct', 5)
                .order('total_time_ms', { ascending: true })
                .limit(2);

            if (topPlayers && topPlayers.length > 1 && topPlayers[0].total_time_ms === topPlayers[1].total_time_ms) {
                setIsMataMata(true);
                setCurrentQuestionIndex(5);
                setStartTime(Date.now());
                setTimeLeft(10);
                toast.info("EMPATE! Morte Súbita iniciada!");
            } else {
                setFinished(true);
                toast.success("Quiz Finalizado!", { description: "Aguarde a validação oficial do admin." });
            }
        }
        else if (currentQuestionIndex === 5) {
            setFinished(true);
            toast.success("Mata-Mata Finalizado!");
        }
    };

    const handleBuyTicket = async () => {
        if (!user) return toast.error("Faça login para participar");
        setShowPixModal(true);
    };

    const confirmPixPayment = async () => {
        try {
            const { error } = await supabase.from('quiz_tickets').insert({
                quiz_id: event.id,
                user_id: user?.id,
                status: 'pending',
                payment_method: 'pix_external'
            });

            if (error) {
                if (error.code === '23505') toast.info("Você já tem um ticket pendente ou pago.");
                else throw error;
            } else {
                toast.success("Solicitação enviada!", { description: "Pague o PIX e aguarde a validação do admin." });
                loadData();
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setShowPixModal(false);
        }
    };

    const calculatePrize = () => {
        if (!event) return 0;
        if (event.prize_type === 'product') return event.prize_product_value || 0;
        const total = totalTickets * (event.ticket_price || 0);
        const prize = total * (1 - (event.platform_fee_percent / 100));
        return prize;
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white font-black uppercase">Sincronizando...</div>;

    if (quizStarted && !finished && !eliminated) {
        const currentQuestion = event.questions[currentQuestionIndex];
        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg space-y-8">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                                {isMataMata ? "MORTE SÚBITA" : `RODADA ${currentQuestionIndex + 1}`}
                            </span>
                            <div className="flex items-center gap-2">
                                <Zap className={`h-4 w-4 ${isMataMata ? 'text-red-500' : 'text-yellow-400'}`} />
                                <span className="font-black text-lg">PROVA DE VELOCIDADE</span>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-2xl font-black font-mono text-yellow-400 border-yellow-400/30 h-14 w-14 flex items-center justify-center rounded-2xl">
                            {timeLeft}
                        </Badge>
                    </div>

                    <div className="py-14 text-center">
                        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            {currentQuestion.text}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {currentQuestion.options.map((option: string, idx: number) => (
                            <Button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className="h-20 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-yellow-500/50 hover:text-yellow-500 text-xl font-black rounded-[2rem] transition-all duration-300"
                            >
                                {option}
                            </Button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase">
                            <span>Progresso</span>
                            <span>{currentQuestionIndex + 1} de {isMataMata ? '6' : '5'}</span>
                        </div>
                        <Progress value={(currentQuestionIndex / (isMataMata ? 6 : 5)) * 100} className="h-1 bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (eliminated) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-600/20 blur-[100px] rounded-full"></div>
                    <div className="relative p-12 bg-red-500/10 border border-red-500/20 rounded-[4rem] shadow-2xl backdrop-blur-xl">
                        <XCircle className="h-24 w-24 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                        <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">GAME OVER</h1>
                        <p className="text-gray-400 mt-4 max-w-xs font-bold uppercase tracking-widest text-xs">Você falhou na missão. Tente novamente no próximo sorteio.</p>
                    </div>
                </div>
                <Button onClick={() => window.location.reload()} className="bg-white text-black font-black uppercase px-12 h-16 rounded-[2rem] text-lg hover:bg-gray-200 transition-all">Voltar à Central</Button>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-green-600/20 blur-[100px] rounded-full"></div>
                    <div className="relative p-12 bg-green-500/10 border border-green-500/20 rounded-[4rem] shadow-2xl backdrop-blur-xl">
                        <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">SOBREVIVENTE</h1>
                        <p className="text-gray-400 mt-4 max-w-xs font-bold uppercase tracking-widest text-xs">Prova concluída! O admin verificará quem foi o mais rápido para disparar o prêmio.</p>
                    </div>
                </div>
                <Button onClick={() => window.location.reload()} className="bg-white text-black font-black uppercase px-12 h-16 rounded-[2rem] text-lg hover:bg-gray-200 transition-all">Fechar</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-32">
            <div className="pt-6 px-6 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md pb-4 border-b border-white/5">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-white/5 border border-white/10 p-1 w-full grid grid-cols-2 rounded-2xl h-12">
                        <TabsTrigger value="quiz" className="rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest">Mega Quiz</TabsTrigger>
                        <TabsTrigger value="vault" className="rounded-xl data-[state=active]:bg-yellow-500 data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest">O Cofre</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {activeTab === "quiz" ? (
                <>
                    {!event ? (
                        <div className="flex flex-col h-[60vh] items-center justify-center bg-black text-white space-y-4">
                            <AlertCircle className="h-16 w-16 text-gray-600" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest">Nenhum Mega Quiz ativo agora.</p>
                        </div>
                    ) : (
                        <>
                            <div className="relative h-80 overflow-hidden border-b border-white/10">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10"></div>
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070')] bg-cover bg-center opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"></div>

                                <div className="relative z-20 flex flex-col items-center justify-center h-full p-6 text-center">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-red-500 animate-ping"></div>
                                        <Badge className="bg-white text-black font-black uppercase px-4 py-1.5 tracking-tighter">
                                            ACUMULADO DO DIA
                                        </Badge>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                                        MEGA QUIZ <span className="text-yellow-500">SURVIVAL</span>
                                    </h1>
                                    <div className="mt-6 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md">
                                        <Timer className="h-5 w-5 text-yellow-500" />
                                        <span className="text-gray-300 font-black uppercase tracking-widest text-xs">
                                            Início: {new Date(event.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 -mt-14 relative z-30 space-y-10">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-[3.5rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <Card className="relative bg-[#080808] border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                                        <CardContent className="p-10 flex flex-col items-center text-center">
                                            <div className="flex flex-col items-center animate-in zoom-in duration-500 w-full">
                                                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mb-4">Grande Prêmio Acumulado</span>
                                                {event.prize_type === 'cash' ? (
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-yellow-500 font-black text-4xl italic">R$</span>
                                                        <div className="text-7xl md:text-9xl font-black tracking-tighter text-white">
                                                            {calculatePrize().toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="relative h-64 w-64 md:h-80 md:w-80 rounded-[3rem] bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center p-8 border border-white/10 shadow-inner group">
                                                            {event.prize_product_image ? (
                                                                <img src={event.prize_product_image} alt="Premio" className="h-full w-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
                                                            ) : (
                                                                <Trophy className="h-32 w-32 text-yellow-500" />
                                                            )}
                                                            <div className="absolute -bottom-4 bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-4 border-[#080808]">FÍSICO</div>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-3xl font-black uppercase italic tracking-tighter">{event.prize_product_name}</h3>
                                                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest mt-1">Valor Estimado: R$ {event.prize_product_value}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-10 grid grid-cols-2 gap-10 w-full border-t border-white/5 pt-10">
                                                <div className="flex flex-col items-center group cursor-default">
                                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2 border border-white/10 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all">
                                                        <Zap className="h-6 w-6 text-yellow-500" />
                                                    </div>
                                                    <span className="text-xl font-black uppercase italic tracking-tighter">ELIMINATÓRIA</span>
                                                    <span className="text-[9px] uppercase font-black text-gray-600 tracking-widest">Estilo Mata-Mata</span>
                                                </div>
                                                <div className="flex flex-col items-center group cursor-default">
                                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-2 border border-white/10 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all">
                                                        <Wallet className="h-6 w-6 text-amber-500" />
                                                    </div>
                                                    <span className="text-xl font-black tracking-tighter">R$ {event.ticket_price}</span>
                                                    <span className="text-[9px] uppercase font-black text-gray-600 tracking-widest">Custo do Ticket</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {!ticket || ticket.status === 'pending' ? (
                                    <div className="space-y-6">
                                        <div className="relative group overflow-hidden rounded-[2.5rem] p-[1px]">
                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                                            <Button onClick={handleBuyTicket} className="w-full h-24 relative bg-black hover:bg-[#050505] text-white font-black uppercase tracking-[0.3em] text-2xl border-0 transition-all duration-300 shadow-2xl">
                                                <span className="text-yellow-500 mr-4">RESERVAR</span> MEU TICKET
                                            </Button>
                                        </div>
                                        {ticket?.status === 'pending' && (
                                            <div className="bg-amber-500/5 p-6 rounded-[2rem] border border-amber-500/20 text-center space-y-2">
                                                <p className="text-amber-500 text-sm font-black uppercase tracking-widest animate-pulse">Pagamento em Verificação</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Aguarde a validação do sistema para garantir sua vaga.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-green-500/5 p-10 rounded-[3rem] border border-green-500/20 text-center space-y-6 relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 h-32 w-32 bg-green-500/10 blur-[50px] rounded-full"></div>
                                        <div className="h-20 w-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-green-500/20 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">CONVOCADO PARA O COMBATE</h3>
                                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Mantenha o app aberto. O Quiz iniciará simultaneamente para os convocados.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 pb-20">
                                    {[
                                        { title: "ELIMINAÇÃO PROGRESSIVA", desc: "Errou uma questão? Game Over. Apenas os vencedores avançam em cada round.", icon: Zap },
                                        { title: "VITÓRIA ANTECIPADA", desc: "Se apenas você sobrar vivo em qualquer round, o jogo acaba e o prêmio é seu.", icon: Trophy },
                                        { title: "MORTE SÚBITA", desc: "Empate no tempo da última pergunta ativa uma 6ª rodada extra de desempate.", icon: Clock }
                                    ].map((rule, idx) => (
                                        <div key={idx} className="flex gap-4 p-6 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-md">
                                            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                                <rule.icon className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-white">{rule.title}</h4>
                                                <p className="text-[11px] font-bold text-gray-500 mt-1 leading-relaxed">{rule.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="p-6">
                    <Vault />
                </div>
            )}

            <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 text-white rounded-[3rem] w-[95%] p-0 overflow-hidden">
                    <div className="p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-12 w-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                                <QrCode className="h-6 w-6 text-yellow-500" />
                            </div>
                            <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter">Pagamento via PIX</DialogTitle>
                            <DialogDescription className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Transação Segura • Sincronização em Tempo Real</DialogDescription>
                        </div>
                        <div className="flex flex-col items-center space-y-6">
                            <div className="p-4 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=pix-quiz-${event?.id}`} alt="PIX" className="h-52 w-52" />
                            </div>
                            <div className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center justify-between">
                                <div className="truncate flex-1 mr-4">
                                    <span className="text-[10px] font-black text-gray-600 block uppercase tracking-widest mb-1">Chave Copia e Cola</span>
                                    <span className="text-sm font-mono truncate text-gray-200">financeiro@realfire.com</span>
                                </div>
                                <Button size="icon" variant="ghost" className="h-12 w-12 rounded-xl hover:bg-white/10" onClick={() => { navigator.clipboard.writeText("financeiro@realfire.com"); toast.success("Copiada!"); }}>
                                    <Copy className="h-5 w-5 text-yellow-500" />
                                </Button>
                            </div>
                            <div className="w-full space-y-4">
                                <div className="flex justify-between items-center bg-yellow-500/10 p-4 rounded-2xl border border-yellow-500/20">
                                    <span className="text-xs font-black text-gray-400 uppercase">VALOR DO TICKET</span>
                                    <span className="text-2xl font-black text-yellow-500 italic">R$ {event?.ticket_price}</span>
                                </div>
                                <Button onClick={confirmPixPayment} className="w-full bg-white hover:bg-gray-200 text-black font-black uppercase h-16 rounded-2xl text-lg shadow-xl transition-all active:scale-95">
                                    Já realizei o pagamento
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

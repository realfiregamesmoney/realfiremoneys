import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Trophy, Users, Zap, AlertCircle, CheckCircle2, XCircle, Wallet, QrCode, Copy, Clock, Loader2, Bell, ShieldAlert, Info, ShieldCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Vault from "@/components/Vault";
import { Flame as FlameIcon, Target as TargetIcon, Crown as CrownIcon, Zap as ZapIcon, Trophy as TrophyIcon } from "lucide-react";
import KycModal from "@/components/KycModal";

const ICON_MAP: Record<string, any> = {
    Zap: ZapIcon,
    Trophy: TrophyIcon,
    Flame: FlameIcon,
    Target: TargetIcon,
    Crown: CrownIcon
};

export default function Quiz() {
    const { user, profile, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState("quiz");
    const [event, setEvent] = useState<any>(null);
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [totalTickets, setTotalTickets] = useState(0);
    const [showPixModal, setShowPixModal] = useState(false);
    const [showKyc, setShowKyc] = useState(false);

    // Asaas States
    const [isGeneratingPix, setIsGeneratingPix] = useState(false);
    const [asaasQrCode, setAsaasQrCode] = useState("");
    const [asaasCopyPaste, setAsaasCopyPaste] = useState("");

    // Broadcast messages state
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [activeAlert, setActiveAlert] = useState<any>(null);

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

    const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);
    const [waitCountdown, setWaitCountdown] = useState(0);
    const [showContinuePrompt, setShowContinuePrompt] = useState(false);
    const [continueCountdown, setContinueCountdown] = useState(0);
    const [justRevived, setJustRevived] = useState(false);
    const [antiCheatFlag, setAntiCheatFlag] = useState(false);
    const [preStartCountdown, setPreStartCountdown] = useState(0);
    const [reward, setReward] = useState<{ show: boolean, data: any }>({ show: false, data: null });
    const [currentPhase, setCurrentPhase] = useState<'idle' | 'pre-start' | 'question' | 'wait' | 'finished'>('idle');
    const [globalTimer, setGlobalTimer] = useState(0);
    const [inArena, setInArena] = useState(false);
    const [declinedQuickBuy, setDeclinedQuickBuy] = useState(false);

    // Ref para evitar loops de render em cálculos de tempo
    const quizTimelineRef = useRef<any[]>([]);


    useEffect(() => {
        loadData();

        // Subscription for event status changes
        // Mudança crítica: filtro por ID se disponível para evitar conflitos
        const channelName = event?.id ? `quiz_${event.id}` : 'quiz_global';
        const eventChannel = supabase
            .channel(channelName)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'quiz_events',
                    filter: event?.id ? `id=eq.${event.id}` : undefined
                },
                (payload) => {
                    console.log("Realtime Update Received:", payload.new.title, "Banner:", payload.new.banner_url);
                    setEvent(payload.new);
                    if (payload.new.status === 'live' && !quizStarted && !loading) {
                        startQuiz(payload.new);
                    }
                }
            )
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' }, (payload) => {
                const msg = payload.new;
                setBroadcasts(prev => [...prev, msg]);
                setActiveAlert(msg);
                toast(msg.message, {
                    icon: <Bell className="text-orange-500 h-5 w-5" />,
                    duration: 10000,
                    className: "bg-black border-orange-500/50 text-white font-black uppercase italic"
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(eventChannel);
        };
    }, [event?.id, user]); // Re-assina se o ID do evento mudar ou o usuário logar


    const loadData = async () => {
        let isUserEliminated = false;
        setLoading(true);
        try {
            const { data: eventData, error: eventError } = await supabase
                .from('quiz_events')
                .select('*')
                .or('status.eq.scheduled,status.eq.live')
                .order('scheduled_at', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (eventError) {
                console.error("Error loading quiz event:", eventError);
                return;
            }

            if (eventData) {
                if (!eventData.questions || !Array.isArray(eventData.questions)) {
                    eventData.questions = [];
                }
                setEvent(eventData);

                if (user) {
                    const { data: ticketData } = await supabase
                        .from('quiz_tickets')
                        .select('*')
                        .eq('quiz_id', eventData.id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    setTicket(ticketData);

                    // BUSCA TODAS AS RESPOSTAS PARA HIDRATAR O ESTADO
                    const { data: userResponses } = await supabase
                        .from('quiz_responses')
                        .select('*')
                        .eq('quiz_id', eventData.id)
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: true });

                    if (userResponses) {
                        setResponses(userResponses);
                        // Se a última resposta foi correta, ele está aguardando a próxima pergunta
                        const last = userResponses[userResponses.length - 1];
                        if (last && last.is_correct) {
                            setWaitingForNextQuestion(true);
                        }
                    }

                    // VERIFICAÇÃO DE ELIMINAÇÃO PERSISTENTE
                    const { data: lastResponse } = await supabase
                        .from('quiz_responses')
                        .select('is_correct, question_index')
                        .eq('quiz_id', eventData.id)
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (lastResponse && !lastResponse.is_correct) {
                        const { data: ranking } = await supabase
                            .from('quiz_rankings')
                            .select('total_correct')
                            .eq('quiz_id', eventData.id)
                            .eq('user_id', user.id)
                            .maybeSingle();

                        // Se não tem progresso no ranking pós-erro, está fora (Eliminado Definitivo)
                        if (!ranking || ranking.total_correct <= lastResponse.question_index) {
                            isUserEliminated = true; // Variável local para controle imediato
                            setEliminated(true);
                            setShowContinuePrompt(false); // Garante que o prompt não apareça
                            setQuizStarted(false);
                            setLoading(false);
                            return; // PARA TUDO: NÃO CHAMA START QUIZ
                        }
                    }
                }

                if (eventData.status === 'live' && !isUserEliminated && user) {
                    // Garantir limpeza de estados de prompt antes de iniciar
                    setShowContinuePrompt(false);
                    startQuiz(eventData);
                }
            }
        } catch (error) {
            console.error("General error in loadData:", error);
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

    const startQuiz = (currentEvent?: any) => {
        const targetEvent = currentEvent || event;
        // BLOQUEIO CRÍTICO: Se já foi eliminado NESTE quiz, não deixa entrar de novo
        if (!targetEvent || eliminated) return;

        setQuizStarted(true);
        setFinished(false);

        // Protocolo de Timeline: 30s Prep -> [10s Question -> 59s Wait]
        const timeline: any[] = [];
        let currentTime = 30; // 30 segundos iniciais de preparação

        targetEvent.questions.forEach((q: any, i: number) => {
            const limit = 10; // Fixo 10s por pergunta
            const wait = 59; // Fixo 59s por intervalo

            timeline.push({
                index: i,
                type: 'question',
                start: currentTime,
                end: currentTime + limit
            });
            currentTime += limit;

            timeline.push({
                index: i,
                type: 'wait',
                start: currentTime,
                end: currentTime + wait
            });
            currentTime += wait;
        });

        quizTimelineRef.current = timeline;
    };

    // MASTER SYNC EFFECT (Protocolo Universal 30-10-59)
    useEffect(() => {
        if (!quizStarted || !event || finished || eliminated) return;

        const syncLoop = setInterval(() => {
            if (loading || !user || !ticket) return; // BLOQUEIO TÉCNICO: Aguarda user e ticket estarem prontos

            const anchorTime = new Date(event.scheduled_at).getTime();
            const elapsed = (Date.now() - anchorTime) / 1000;
            const timeline = quizTimelineRef.current;

            // 1. Fase de Preparação (30s)
            if (elapsed < 30) {
                setCurrentPhase('pre-start');
                setGlobalTimer(Math.ceil(30 - elapsed));
                return;
            }

            // AUTO-PUSH: Se o tempo acabou e o jogador tem ticket, leva para a arena imediatamente
            if (ticket?.status === 'paid' && !inArena && !eliminated && !finished) {
                setInArena(true);
            }

            // 2. Busca de Fase atual na cronologia
            const current = timeline.find(t => elapsed >= t.start && elapsed < t.end);

            if (current) {
                const remaining = Math.ceil(current.end - elapsed);
                setGlobalTimer(remaining);

                if (current.type === 'question') {
                    if (currentPhase !== 'question' || currentQuestionIndex !== current.index) {
                        if (currentQuestionIndex !== current.index) {
                            setWaitingForNextQuestion(false);
                            setShowContinuePrompt(false);
                        }
                        setCurrentQuestionIndex(current.index);
                        setCurrentPhase('question');
                        setStartTime(anchorTime + (current.start * 1000));
                        setTimeLeft(remaining);
                    } else {
                        setTimeLeft(remaining);
                    }
                } else if (current.type === 'wait') {
                    setCurrentPhase('wait');
                    setWaitCountdown(remaining);
                    // Se a fase de pergunta de 10s acabou e o jogador não respondeu corretamente
                    // Bloqueio: Apenas para quem pagou E está na arena
                    if (ticket?.status === 'paid' && inArena && !waitingForNextQuestion && !eliminated && !showContinuePrompt && !justRevived) {
                        handleTimeout();
                    }
                }
            } else if (elapsed >= (timeline[timeline.length - 1]?.end || 0)) {
                setFinished(true);
                setCurrentPhase('finished');
            }
        }, 100);

        return () => clearInterval(syncLoop);
    }, [quizStarted, event, finished, eliminated, waitingForNextQuestion, currentPhase, currentQuestionIndex, showContinuePrompt, justRevived, ticket, loading]);

    // Timer para o Revival (Continue Prompt)
    useEffect(() => {
        if (!showContinuePrompt) return;
        const timer = setInterval(() => {
            setContinueCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setShowContinuePrompt(false);
                    setEliminated(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [showContinuePrompt]);

    const checkSurvivors = async (qIndex: number) => {
        const { count } = await supabase
            .from('quiz_rankings')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', event.id)
            .eq('total_correct', qIndex + 1);
        return count || 0;
    };

    const handleTimeout = async () => {
        if (eliminated || finished) return;
        toast.error("Tempo Esgotado!");

        // PERSISTÊNCIA DE FALHA: Salva no banco que o jogador falhou por tempo
        if (user && event) {
            const timeoutResponse = {
                quiz_id: event.id,
                user_id: user.id,
                question_index: currentQuestionIndex,
                answer_index: -1, // -1 indica timeout
                is_correct: false,
                time_ms: (event.questions[currentQuestionIndex]?.time_limit || 10) * 1000,
                metadata: { type: 'timeout' }
            };
            await supabase.from('quiz_responses').insert(timeoutResponse);
        }

        handleElimination();
    };

    const handleElimination = async () => {
        const currentQuestion = event?.questions?.[currentQuestionIndex];
        // Nova Regra: Permite ressurgir até a fase final
        if (currentQuestion && currentQuestion.allow_extra_attempt) {
            setShowContinuePrompt(true);
            setContinueCountdown(10); // 10s fixos para decisão conforme regra
        } else {
            setShowContinuePrompt(false);
            setEliminated(true);
            grantParticipationMedal();
        }
    };

    const grantParticipationMedal = async () => {
        if (!user) return;
        try {
            toast("Que pena! Participe da próxima rodada.", {
                description: "Sua bravura foi registrada. Confira sua medalha na aba Títulos!",
                icon: <ShieldAlert className="text-red-500 h-5 w-5" />,
                duration: 5000
            });

            const { data: rewardData, error: rewardError } = await supabase.rpc('award_achievement', {
                target_user_id: user.id,
                achievement_type_pattern: 'medal'
            });

            if (!rewardError && rewardData?.success) {
                setReward({ show: true, data: rewardData.achievement });
            }

            refreshProfile();
        } catch (e) {
            console.error("Erro ao processar eliminação/medalha:", e);
        } finally {
            // Expulsa da Arena imediatamente
            setInArena(false);
            setWaitingForNextQuestion(false);
        }
    };


    const processCorrectAnswerEnd = async () => {
        const survivors = await checkSurvivors(currentQuestionIndex);
        setSurvivorCount(survivors);

        // Se após responder corretamente, o jogador for o último sobrevivente, ele termina (se houver essa regra)
        if (survivors === 1 && currentQuestionIndex < 4) {
            // Opcional: Aqui poderíamos esperar o fim da fase de pergunta para dar o veredito oficial
        }

        setWaitingForNextQuestion(true);
    };

    const handleAnswer = async (answerIndex: number) => {
        if (!event || !event.questions || eliminated || finished || waitingForNextQuestion || showContinuePrompt) return;
        const timeTaken = Date.now() - startTime;
        const currentQuestion = event.questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const isCorrect = answerIndex === currentQuestion.correctIndex;
        const newResponse = {
            quiz_id: event.id,
            user_id: user?.id,
            question_index: currentQuestionIndex,
            answer_index: answerIndex,
            is_correct: isCorrect,
            time_ms: timeTaken,
            metadata: timeTaken < 200 ? { flagged: true, reason: 'latency_too_low' } : {} // ANTI-CHEAT
        };
        const updatedResponses = [...responses, newResponse];
        setResponses(updatedResponses);
        await supabase.from('quiz_responses').insert(newResponse);

        if (!isCorrect) {
            toast.error("Resposta Incorreta!");
            handleElimination();
            return;
        }

        const totalTime = updatedResponses.reduce((acc, r) => acc + r.time_ms, 0);
        await supabase.from('quiz_rankings').upsert({ quiz_id: event.id, user_id: user?.id, total_correct: currentQuestionIndex + 1, total_time_ms: totalTime, finished_at: new Date().toISOString() }, { onConflict: 'quiz_id,user_id' });
        await new Promise(r => setTimeout(r, 1000));
        processCorrectAnswerEnd();
    };

    const handleBuyContinue = async () => {
        const currentQuestion = event?.questions?.[currentQuestionIndex];
        if (!currentQuestion) return;
        const price = currentQuestion.extra_attempt_price || 5;

        // Check Balance
        if ((profile?.saldo || 0) < price) {
            toast.error("Saldo insuficiente!", { description: "Sinto muito, você não tem saldo na conta para renascer. Seus pontos foram salvos até aqui." });
            setShowContinuePrompt(false);
            setEliminated(true);
            grantParticipationMedal(); // Dá a medalha e mostra o feedback final
            return;
        }

        try {
            // Deduct balance via RPC
            const { error: balanceError } = await supabase.rpc('deduct_balance', { amount_to_deduct: price });
            if (balanceError) throw balanceError;

            // Voltar para a Arena se foi revivido
            setShowContinuePrompt(false); // FECHAMENTO CRÍTICO: Impede que o timer de eliminação continue rodando
            setEliminated(false); // Garante que o estado de eliminado seja limpo
            setInArena(true);
            setJustRevived(true);

            toast.success(`Renascimento confirmado! R$ ${price} debitados.`);

            // NOVO: Registrar no Histórico Financeiro
            await supabase.from('transactions').insert({
                user_id: user?.id,
                type: 'quiz_revive',
                amount: price,
                status: 'approved'
            });

            const totalTime = responses.reduce((acc, r) => acc + r.time_ms, 0);
            await supabase.from('quiz_rankings').upsert({
                quiz_id: event.id,
                user_id: user?.id,
                total_correct: currentQuestionIndex + 1,
                total_time_ms: totalTime + 30000,
                finished_at: new Date().toISOString()
            }, { onConflict: 'quiz_id,user_id' });

            // Mostrar mensagem de incentivo
            setTimeout(() => {
                setJustRevived(false);
                processCorrectAnswerEnd();
            }, 1000); // Reduzido de 3s para 1s conforme solicitado para agilidade total

            refreshProfile();
        } catch (e: any) {
            toast.error("Erro ao processar saldo: " + e.message);
        }

    };

    const handleWinnerReward = async () => {
        if (!user || !event) return;
        const { data, error } = await supabase.rpc('award_achievement', {
            target_user_id: user.id,
            achievement_type_pattern: 'trophy'
        });
        if (!error && data?.success) {
            setReward({ show: true, data: data.achievement });
        }
    };

    useEffect(() => {
        const isWinner = user?.id === event?.validated_winner_id;
        if (finished && isWinner && !reward.show) {
            handleWinnerReward();
        }
    }, [finished, event?.validated_winner_id]);

    const handleQuickBuyTicket = async () => {
        if (!user) return toast.error("Faça login para participar");
        const price = event?.ticket_price || 0;

        if ((profile?.saldo || 0) < price) {
            toast.error("Saldo insuficiente!", {
                description: "Sinto muito, você não tem saldo suficiente. Deposite para participar da próxima!"
            });
            return;
        }

        try {
            const { error: balanceError } = await supabase.rpc('deduct_balance', { amount_to_deduct: price });
            if (balanceError) throw balanceError;

            // Registrar Transação
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'quiz_participation',
                amount: price,
                status: 'approved'
            });

            // Criar Ticket Pago (Status 'paid' conforme regras do banco)
            const { data: ticketData, error: ticketError } = await supabase
                .from('quiz_tickets')
                .upsert({
                    quiz_id: event.id,
                    user_id: user.id,
                    status: 'paid',
                    payment_method: 'balance'
                }, { onConflict: 'quiz_id,user_id' })
                .select()
                .single();

            if (ticketError) throw ticketError;

            setTicket(ticketData);
            setInArena(true); // Entra imediatamente
            refreshProfile();
            fetchTicketCount(); // Atualiza contador de prêmios
            toast.success(`Inscrição Confirmada! R$ ${price} debitados do seu saldo.`);
        } catch (e: any) {
            toast.error("Erro no Processamento: " + e.message);
        }
    };

    const handleBuyTicket = async () => {
        if (!user) return toast.error("Faça login para participar");
        if (!profile?.cpf || !profile?.full_name) {
            setShowKyc(true);
            return;
        }

        setIsGeneratingPix(true);
        setShowPixModal(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-pix-charge', {
                body: { amount: event.ticket_price, user_id: user.id, name: profile.full_name, cpf: profile.cpf }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setAsaasQrCode(data.encodedImage);
            setAsaasCopyPaste(data.payload);

            // Log ticket intent
            await supabase.from('quiz_tickets').upsert({
                quiz_id: event.id,
                user_id: user.id,
                status: 'pending',
                payment_method: 'asaas_pix'
            }, { onConflict: 'quiz_id,user_id' });

        } catch (e: any) {
            toast.error("Falha ao gerar PIX: " + e.message);
            setShowPixModal(false);
        } finally {
            setIsGeneratingPix(false);
        }
    };

    const getCleanUrl = (url: any) => {
        if (!url) return null;
        let src = String(url).trim();
        const bbImgMatch = src.match(/\[img\](.*?)\[\/img\]/i);
        if (bbImgMatch && bbImgMatch[1]) {
            src = bbImgMatch[1].trim();
        } else {
            const htmlMatch = src.match(/src=["'](.*?)["']/i);
            if (htmlMatch && htmlMatch[1]) src = htmlMatch[1].trim();
        }
        if (src.toLowerCase() === "null" || src.toLowerCase() === "undefined") return null;
        return src;
    };

    const calculatePrize = () => {

        if (!event) return 0;
        if (event.prize_type === 'product') return event.estimated_prize_value || 0;
        if (event.is_prize_fixed) return event.estimated_prize_value || 0;
        const total = totalTickets * (event.ticket_price || 0);
        const calculatedPrize = total * (1 - (event.platform_fee_percent / 100));
        return Math.max(calculatedPrize, event.estimated_prize_value || 0);

    };

    // --- SISTEMA DE RENDERIZAÇÃO UNIFICADO ---
    let content;

    if (loading) {
        content = (
            <div className="flex h-screen items-center justify-center bg-black text-white font-black uppercase tracking-widest animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                    Sincronizando com a Central...
                </div>
            </div>
        );
    } else if (eliminated) {
        content = (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="space-y-6">
                    <ShieldAlert className="h-20 w-20 text-red-600 mx-auto animate-pulse" />
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">OPERAÇÃO ENCERRADA</h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] max-w-xs mx-auto leading-relaxed">
                        Infelizmente você foi eliminado desta rodada. Sua bravura foi registrada, mas o acesso ao evento atual foi encerrado para você. Aguarde o próximo chamado!
                    </p>
                    <Button onClick={() => window.location.href = '/'} className="bg-white text-black font-black px-8 h-12 rounded-xl text-xs uppercase italic mt-4">Sair da Operação</Button>
                </div>
            </div>
        );
    } else if (inArena && !finished && !eliminated && !showContinuePrompt) {
        const currentQuestion = event?.questions?.[currentQuestionIndex];
        const ThemeIcon = ICON_MAP[event?.symbol_icon || "Zap"] || Zap;
        const themeColor = event?.primary_color || "#EAB308";

        if (!event || !event.questions || !currentQuestion) {
            content = <div className="min-h-screen bg-black flex items-center justify-center text-white italic font-black">Sincronizando Dados de Combate...</div>;
        } else {
            content = (
                <div className="min-h-screen bg-[#020202] text-white p-6 flex flex-col items-center justify-center relative overflow-hidden z-[100]">
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20 animate-pulse" style={{ backgroundColor: themeColor }}></div>
                    </div>

                    <div className="w-full max-w-lg space-y-10 relative z-10">
                        {currentPhase === 'pre-start' ? (
                            <div className="text-center space-y-12 animate-in zoom-in duration-700 bg-orange-600 p-12 rounded-[3.5rem] shadow-[0_30px_90px_rgba(234,179,8,0.4)] border-4 border-black border-dashed">
                                <div className="space-y-4">
                                    <Zap className="h-24 w-24 mx-auto text-black animate-bounce" />
                                    <h2 className="text-5xl font-black uppercase italic text-black leading-tight">Prepare-se!<br />O Quiz começa em:</h2>
                                </div>
                                <div className="text-[12rem] font-black font-mono text-white leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                    {globalTimer}
                                </div>
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.5em] animate-pulse">Sincronizando com todos os jogadores...</p>
                            </div>
                        ) : justRevived ? (
                            <div className="text-center space-y-8 animate-in zoom-in duration-700">
                                <div className="p-8 bg-orange-600/20 border-2 border-orange-500 rounded-[2.5rem] shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                                    <Zap className="h-16 w-16 mx-auto text-orange-500 animate-bounce mb-4" />
                                    <h2 className="text-3xl font-black uppercase italic text-white mb-2">Foi por pouco em!</h2>
                                    <p className="text-orange-400 font-bold uppercase text-xs tracking-widest italic">Aguarde o início da próxima pergunta.</p>
                                    <div className="mt-8 text-7xl font-black font-mono text-white">{waitCountdown}s</div>
                                </div>
                            </div>
                        ) : (waitingForNextQuestion || currentPhase === 'wait') ? (
                            <div className="text-center space-y-8 animate-in zoom-in duration-700">
                                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-3xl mb-4">
                                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                    <h3 className="text-xl font-black uppercase italic text-white">Parabéns você segue para a próxima fase!</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sincronia Fire Ativada</p>
                                </div>
                                <h2 className="text-4xl font-black uppercase italic text-white tracking-tighter">Próxima Pergunta em:</h2>
                                <div className="text-8xl font-black font-mono animate-bounce" style={{ color: themeColor }}>{globalTimer}s</div>
                            </div>
                        ) : currentQuestion ? (
                            <>
                                <div className="bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <ThemeIcon className="h-6 w-6" style={{ color: themeColor }} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase opacity-60">COMBATE {(currentQuestionIndex + 1)} / {event.questions.length}</span>
                                                <span className="font-black text-xs uppercase italic text-white text-left">FIRE ENERGY</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`text-4xl font-black font-mono h-16 w-24 flex items-center justify-center rounded-2xl ${timeLeft <= 3 ? 'text-red-500 border-red-500 animate-pulse' : 'text-white border-white/10'}`}>
                                            {timeLeft}
                                        </Badge>
                                    </div>
                                    <Progress value={((currentQuestionIndex + 1) / event.questions.length) * 100} className="h-1.5" />
                                </div>

                                <div className="py-6 text-center">
                                    <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl">{currentQuestion.text}</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {currentQuestion.options.map((option: string, idx: number) => (
                                        <Button key={idx} onClick={() => handleAnswer(idx)} className="h-20 bg-white/[0.05] border border-white/10 hover:bg-orange-500 hover:text-white text-xl font-black rounded-[2rem] transition-all">
                                            {option}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            );
        }
    } else if (showContinuePrompt) {
        const currentQuestion = event.questions[currentQuestionIndex];
        const themeColor = event.primary_color || "#EAB308";
        content = (
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-red-600/5 blur-[100px] animate-pulse"></div>
                <div className="w-full max-w-md space-y-10 relative z-10 animate-in zoom-in duration-500">
                    <div className="p-10 bg-[#0a0a0a] border-2 border-orange-500 rounded-[3rem] shadow-[0_0_80px_rgba(234,179,8,0.4)] relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-600 p-4 rounded-full border-4 border-black shadow-xl">
                            <AlertCircle className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-black italic uppercase text-white mt-4">Você Errou!</h1>
                        <p className="text-gray-400 mt-4 font-bold text-[10px] uppercase tracking-widest leading-relaxed">Não abandone o campo de batalha agora. Use R$ {currentQuestion.extra_attempt_price?.toFixed(2)} e volte para a guerra!</p>

                        <div className="mt-8 relative h-32 w-32 mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="text-6xl font-black font-mono text-orange-500">{continueCountdown}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button onClick={handleBuyContinue} className="w-full h-24 bg-orange-600 hover:bg-orange-500 rounded-[2rem] text-2xl font-black italic shadow-[0_10px_40px_rgba(234,179,8,0.3)] animate-pulse">
                            REASSURGIR AGORA (R$ {currentQuestion.extra_attempt_price?.toFixed(2)})
                        </Button>
                        <button onClick={() => {
                            setShowContinuePrompt(false);
                            setEliminated(true);
                            grantParticipationMedal();
                            window.location.href = '/'; // Sai imediatamente ao abandonar
                        }} className="text-gray-600 uppercase font-black text-[10px] tracking-widest hover:text-white transition-colors">
                            Abandonar e Sair
                        </button>
                    </div>
                </div>
            </div>

        );
    } else if (finished) {
        const isWinner = user?.id === event?.validated_winner_id;
        const reachedEnd = responses.length >= (event?.questions?.length || 5) && responses.every(r => r.is_correct);

        content = (
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-1000 z-[120]">
                {isWinner ? (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-500 blur-[100px] opacity-20 animate-pulse"></div>
                            <Trophy className="h-48 w-48 text-yellow-500 animate-bounce relative z-10 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic uppercase text-yellow-500 tracking-tighter">SOBREVIVENTE #1</h1>
                        <Card className="bg-white/5 border-yellow-500/30 p-8 rounded-[3rem] max-w-xl border">
                            <p className="text-sm font-bold text-white uppercase italic leading-relaxed">
                                {event?.winner_message || "O jogo deu empate, mas você foi o vencedor! Parabéns pela sobrevivência."}
                            </p>
                        </Card>
                    </>
                ) : reachedEnd ? (
                    <>
                        <Trophy className="h-40 w-40 text-gray-400 animate-pulse drop-shadow-[0_0_20px_rgba(156,163,175,0.3)]" />
                        <h1 className="text-5xl md:text-7xl font-black italic uppercase text-gray-400">SOBREVIVENTE DE ELITE</h1>
                        <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem] max-w-xl border">
                            <p className="text-xs font-bold text-gray-400 uppercase italic leading-relaxed">
                                {event?.runner_up_message || "Infelizmente você não foi o mais rápido, mas ganhou um troféu de prata e um passe livre!"}
                            </p>
                        </Card>
                    </>
                ) : (
                    <>
                        <Trophy className="h-32 w-32 text-gray-700" />
                        <h1 className="text-5xl font-black italic uppercase text-gray-700">MISSÃO CUMPRIDA</h1>
                        <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Você concluiu o quiz. Obrigado por participar!</p>
                    </>
                )}

                <Button onClick={() => window.location.reload()} className="bg-white text-black font-black px-12 h-16 rounded-2xl hover:bg-yellow-500 transition-all">
                    Concluir Operação
                </Button>
            </div>
        );
    } else {
        content = (
            <div className="min-h-screen bg-[#050505] text-white pb-32">
                <div className="pt-6 px-6 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md pb-4 border-b border-white/5">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-white/5 border border-white/10 p-1 w-full grid grid-cols-2 rounded-2xl h-12">
                            <TabsTrigger value="quiz" className="rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black uppercase text-[10px]">Sobrevivência</TabsTrigger>
                            <TabsTrigger value="vault" className="rounded-xl data-[state=active]:bg-orange-500 data-[state=active]:text-white font-black uppercase text-[10px]">Cofre Real</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {activeTab === "quiz" ? (
                    <>
                        {event ? (
                            <div className="animate-in fade-in duration-700">
                                <div className="relative h-[400px] overflow-hidden bg-neutral-900">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/40 z-20"></div>
                                    <img
                                        key={event.banner_url || 'default-banner'}
                                        src={getCleanUrl(event.banner_url) || "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070"}
                                        alt="Banner"
                                        className="absolute inset-0 h-full w-full object-cover z-10 opacity-60"
                                        onError={(e: any) => e.target.src = "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070"}
                                    />



                                    <div className="relative z-20 flex flex-col items-center justify-center h-full p-6 text-center">
                                        <Badge className="bg-orange-500 mb-4 animate-pulse">
                                            AO VIVO • {new Date(event.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(event.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </Badge>
                                        <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{event.title}</h1>
                                        <p className="text-orange-500 mt-4 font-black uppercase tracking-[0.4em] italic text-xs">{event.welcome_text}</p>
                                    </div>

                                </div>

                                <div className="px-6 -mt-12 relative z-30 space-y-10">
                                    <Card className="bg-[#080808]/90 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                                        <CardContent className="p-10 flex flex-col items-center">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">
                                                {event.prize_type === 'product' ? 'Prêmio da Rodada' : 'Prêmio Máximo Esperado'}
                                            </p>
                                            {event.prize_type === 'product' ? (
                                                <div className="relative group w-full flex flex-col items-center justify-center py-6 min-h-[200px]">
                                                    <div className="absolute inset-0 bg-orange-500/10 blur-[120px] rounded-full"></div>
                                                    <div className="h-64 md:h-80 w-full flex items-center justify-center relative z-10">
                                                        <img
                                                            key={event.prize_product_image || 'default-product'}
                                                            src={getCleanUrl(event.prize_product_image) || "https://images.unsplash.com/photo-1549463591-2435a2196094?q=80&w=2070"}
                                                            alt={event.prize_product_name}
                                                            className="max-h-full max-w-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)] transition-all duration-700 group-hover:scale-105"
                                                            onError={(e: any) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://images.unsplash.com/photo-1549463591-2435a2196094?q=80&w=2070';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="mt-8 bg-black/60 px-8 py-3 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-2xl flex flex-col items-center">
                                                        <h3 className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-widest">{event.prize_product_name || "Produto Especial"}</h3>
                                                        {(event.show_estimated_value !== false) && event.estimated_prize_value > 0 && (
                                                            <span className="text-orange-500 font-black text-xs mt-2 italic shadow-orange-500/20">VALOR ESTIMADO: R$ {Number(event.estimated_prize_value).toLocaleString()}</span>
                                                        )}

                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-7xl md:text-9xl font-black italic text-white leading-none flex items-center justify-center">
                                                    <span className="text-orange-500 text-3xl mr-2">R$</span>{calculatePrize().toLocaleString()}
                                                </div>
                                            )}




                                            <div className="mt-10 w-full">
                                                <div className="w-full bg-white/[0.03] p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center animate-pulse shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ borderColor: `${event.custom_info_color}33`, color: event.custom_info_color }}>
                                                    <p className="text-xs md:text-sm font-black uppercase italic tracking-[0.2em]">
                                                        {event.custom_info_text || "OPERAÇÃO AO VIVO NO APP • TODA TERÇA ÀS 21H"}
                                                    </p>
                                                </div>
                                            </div>

                                        </CardContent>
                                    </Card>

                                    {!ticket || ticket.status === 'pending' ? (
                                        <div className="space-y-4">
                                            {event.status === 'live' && currentPhase === 'pre-start' && !declinedQuickBuy ? (
                                                <div className="bg-orange-600/10 p-8 rounded-[2rem] border-2 border-dashed border-orange-500/30 text-center space-y-6 animate-in zoom-in duration-500">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-center gap-2 text-orange-500 animate-pulse mb-2">
                                                            <Clock className="h-4 w-4" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Oportunidade Master</span>
                                                        </div>
                                                        <div className="text-6xl font-black font-mono text-white">
                                                            {globalTimer}<span className="text-xs text-gray-500">S</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <p className="text-[11px] font-bold uppercase italic text-gray-300 leading-relaxed">
                                                            Deseja participar do quiz agora, descontando do saldo da conta?
                                                            <br />
                                                            <span className="text-orange-500 text-lg font-black tracking-tighter">PREÇO: R$ {event.ticket_price?.toFixed(2)}</span>
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button onClick={handleQuickBuyTicket} className="bg-white text-black font-black uppercase hover:bg-orange-500 hover:text-white transition-all rounded-xl h-12">SIM</Button>
                                                            <Button variant="outline" className="border-white/10 text-white font-black uppercase rounded-xl h-12" onClick={() => { setDeclinedQuickBuy(true); toast.info("Inscrição recusada."); }}>NÃO</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : event.status === 'live' ? (
                                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 text-center space-y-2">
                                                    <ShieldAlert className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                                    <p className="text-xs font-black uppercase text-gray-400 italic">
                                                        {currentPhase === 'pre-start' ? "Inscrição Recusada" : "Inscrições Encerradas"}
                                                    </p>
                                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">O comando encerrou o alistamento para esta missão.</p>
                                                </div>
                                            ) : (
                                                <Button onClick={handleBuyTicket} className="w-full h-20 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xl rounded-2xl italic shadow-2xl shadow-orange-600/20">
                                                    {event.button_text || "GARANTIR VAGA AGORA"}
                                                </Button>
                                            )}
                                            {ticket?.status === 'pending' && <p className="text-center text-[10px] font-black uppercase text-orange-500 animate-pulse">Ticket em Análise Pelo Comando</p>}
                                        </div>
                                    ) : (
                                        <div className="bg-green-600/10 p-8 rounded-[2rem] border border-green-600/30 text-center space-y-6">
                                            <div className="space-y-2">
                                                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                                                <h3 className="text-xl font-black uppercase italic text-white leading-tight">Vaga Confirmada e Sincronizada</h3>
                                            </div>

                                            {event.status === 'live' ? (
                                                <div className="space-y-6 pt-4 animate-in zoom-in duration-500">
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-orange-500 tracking-[0.3em]">A BATALHA VAI COMEÇAR</p>
                                                        <div className="text-6xl font-black font-mono text-white flex items-center justify-center gap-2">
                                                            {globalTimer}<span className="text-xs text-gray-500 mt-6">SEG</span>
                                                        </div>
                                                    </div>

                                                    {!inArena ? (
                                                        <Button
                                                            onClick={() => setInArena(true)}
                                                            className="w-full h-20 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-2xl rounded-2xl italic shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-pulse"
                                                        >
                                                            INICIAR AGORA <Zap className="ml-2 h-6 w-6 fill-current" />
                                                        </Button>
                                                    ) : (
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                            <p className="text-[10px] font-black uppercase text-gray-400">Você já está na Arena. Boa sorte!</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Aguarde o comando da central para iniciar.</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-6 pb-20">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { title: "REGRAS DE SOBREVIVÊNCIA", desc: event.rules_text, icon: <ShieldCheck className="h-5 w-5 text-orange-500" /> },
                                                { title: "DIRETRIZES DA MISSÃO", desc: event.extra_rules_text, icon: <Target className="h-5 w-5 text-orange-500" /> },
                                                { title: "SISTEMA DE REVIVER", desc: event.revive_system_text || "Se você errar, terá 10s para renascer pagando com saldo do app.", icon: <Zap className="h-5 w-5 text-orange-500" /> },
                                                { title: "PREMIAÇÃO FINAL", desc: event.final_prize_text || (event.prize_type === 'product' ? `Item em jogo: ${event.prize_product_name}` : "Prêmio enviado via PIX na mesma hora."), icon: <Trophy className="h-5 w-5 text-orange-500" /> }
                                            ].map((box, i) => (

                                                <div key={i} className="bg-[#0A0A0A] p-6 rounded-3xl border border-orange-500/10 hover:border-orange-500/30 transition-all group overflow-hidden relative">
                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity translate-x-4 -translate-y-4">
                                                        {box.icon}
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {box.icon}
                                                        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-wider transition-all">{box.title}</h4>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase leading-relaxed italic line-clamp-3">
                                                        {box.desc}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 animate-in fade-in duration-700">
                                <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                    <Trophy className="h-12 w-12 text-white/20" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase italic text-white">Nenhum evento agendado</h3>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">Aguarde novas ordens da central</p>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-6"><Vault /></div>
                )}
            </div>
        );
    }

    return (
        <>
            {content}

            <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
                <DialogContent className="bg-[#0a0a0a] border-white/10 text-white rounded-[3rem] w-[95%] max-w-sm p-8 z-[1000]">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black italic uppercase text-center">Protocolo de Pagamento</DialogTitle>
                        <DialogDescription className="text-center font-black uppercase text-[10px] text-gray-500">Geração de Cobrança Automática Asaas</DialogDescription>
                    </DialogHeader>
                    {isGeneratingPix ? (
                        <div className="flex flex-col items-center py-10 gap-4">
                            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                            <p className="font-black uppercase text-xs">Criptografando Transação...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 mt-6">
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-white rounded-3xl mb-6">
                                    <img src={`data:image/png;base64,${asaasQrCode}`} alt="QR Code PIX" className="h-48 w-48" />
                                </div>
                                <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between mb-6">
                                    <p className="text-[10px] font-mono break-all mr-2">{asaasCopyPaste}</p>
                                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => { navigator.clipboard.writeText(asaasCopyPaste); toast.success("Copiado!"); }}>
                                        <Copy className="h-5 w-5 text-orange-500" />
                                    </Button>
                                </div>
                                <div className="w-full bg-orange-600/10 p-6 rounded-2xl border border-orange-600/20 text-center mb-6">
                                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Total a Enviar</span>
                                    <span className="text-4xl font-black text-orange-500 italic">R$ {event?.ticket_price?.toFixed(2)}</span>
                                </div>
                                <Button onClick={() => { loadData(); setShowPixModal(false); }} className="w-full bg-white hover:bg-gray-200 text-black font-black uppercase h-16 rounded-2xl">Já realizei o pagamento</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <KycModal open={showKyc} onClose={() => setShowKyc(false)} onSuccess={() => { setShowKyc(false); handleBuyTicket(); }} />

            {/* Immersive Full Screen Alert */}
            <Dialog open={!!activeAlert} onOpenChange={() => setActiveAlert(null)}>
                <DialogContent className="max-w-none w-screen h-screen m-0 p-0 bg-orange-600/95 border-none text-white backdrop-blur-xl flex flex-col items-center justify-center p-12 animate-in fade-in zoom-in duration-500 z-[9999]">
                    <button
                        onClick={() => setActiveAlert(null)}
                        className="absolute top-10 right-10 p-4 hover:bg-white/10 rounded-full transition-all group"
                    >
                        <XCircle className="h-12 w-12 text-white group-hover:scale-110 transition-transform" />
                    </button>

                    <div className="flex flex-col items-center max-w-4xl text-center space-y-12">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white blur-[100px] opacity-30 animate-pulse"></div>
                            <Bell className="h-32 w-32 text-white animate-bounce relative z-10" />
                        </div>

                        <div className="space-y-6">
                            <Badge className="bg-white text-orange-600 font-black px-6 py-2 text-xl italic uppercase tracking-[0.3em] rounded-full">ALERTA GERAL DO COMANDO</Badge>
                            <h2 className="text-5xl md:text-8xl font-black uppercase italic leading-[0.9] tracking-tighter drop-shadow-2xl">
                                {activeAlert?.message}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4 text-white/60 font-black uppercase tracking-widest text-sm pt-8">
                            <div className="h-[2px] w-20 bg-white/30"></div>
                            PROTOCOLO DE URGÊNCIA ATIVADO
                            <div className="h-[2px] w-20 bg-white/30"></div>
                        </div>

                        <Button
                            onClick={() => setActiveAlert(null)}
                            className="bg-white text-orange-600 hover:bg-gray-100 h-20 px-12 rounded-[2rem] text-2xl font-black uppercase italic shadow-2xl shadow-black/20"
                        >
                            ENTENDIDO, VOLTAR À OPERAÇÃO
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Achievement / Reward Modal */}
            <Dialog open={reward.show} onOpenChange={(open) => setReward(prev => ({ ...prev, show: open }))}>
                <DialogContent className="max-w-md w-[90%] bg-transparent border-none p-0 shadow-none outline-none z-[9998]">
                    <div className="relative flex flex-col items-center justify-center text-center space-y-8 p-10 rounded-[3.5rem] bg-[#0a0a0a] border-2 border-orange-500 shadow-[0_0_100px_rgba(234,179,8,0.4)] animate-in zoom-in duration-700">
                        {/* Shimmer/Pulse Glow */}
                        <div className="absolute inset-0 bg-orange-600/5 blur-[80px] rounded-full animate-pulse"></div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150"></div>
                            {reward.data?.image_url && (
                                <img
                                    src={reward.data.image_url}
                                    alt={reward.data.name}
                                    className="h-48 w-48 object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(234,179,8,0.6)] animate-bounce"
                                />
                            )}
                            <div className="absolute -inset-4 border-2 border-dashed border-orange-500/30 rounded-full animate-spin-slow"></div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <Badge className="bg-orange-500 text-black font-black px-4 py-1 text-[10px] uppercase italic">RECOMPENSA RECEBIDA</Badge>
                            <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none">
                                {reward.data?.name}
                            </h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] leading-relaxed italic max-w-xs mx-auto">
                                {reward.data?.description || "Sua bravura e agilidade foram recompensadas. Este item foi adicionado à sua galeria de títulos!"}
                            </p>
                        </div>

                        <Button
                            onClick={() => setReward({ show: false, data: null })}
                            className="w-full h-16 bg-white hover:bg-orange-500 text-black hover:text-white font-black uppercase rounded-2xl transition-all shadow-xl group"
                        >
                            FECHAR E CONTINUAR <Zap className="ml-2 h-5 w-5 fill-current group-hover:animate-pulse" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

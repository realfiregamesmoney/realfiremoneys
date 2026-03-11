import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, Unlock, Zap, Trophy, Timer, Clock, Wallet, Star, Info, ChevronRight, AlertCircle, Loader2, ShieldCheck, Key, ArrowRight, History, RotateCw, Fingerprint, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


export default function Vault() {
    const { user, profile } = useAuth();
    const [vault, setVault] = useState<any>(null);
    const [passLength, setPassLength] = useState(6);
    const [lastWinners, setLastWinners] = useState<any[]>([]);
    const [attempts, setAttempts] = useState(0);
    const [hints, setHints] = useState<any[]>([]);
    const [unlockedHintIds, setUnlockedHintIds] = useState<string[]>([]);
    const [vaultPackages, setVaultPackages] = useState<any[]>([
        { id: 'single', name: 'Investida Única', amount: 1, price: 2.00, color: 'gray' },
        { id: 'silver', name: 'Pacote EspecialISTA', amount: 10, price: 15.00, color: 'blue', badge: 'Recomendado' },
        { id: 'gold', name: 'Arsenal de Ouro', amount: 50, price: 50.00, color: 'yellow', badge: 'Elite' }
    ]);
    const [guess, setGuess] = useState("");
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [shake, setShake] = useState(false);
    const [confirmHint, setConfirmHint] = useState<any>(null);

    useEffect(() => {
        loadVaultData();
        loadHistory();
        loadPackages();

        const subscription = supabase
            .channel('vault_realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vault_events' }, async (payload) => {
                if (payload.new.status === 'finished') {
                    // Se o cofre finalizou, busca os dados completos com o perfil do vencedor
                    const { data } = await supabase
                        .from('vault_events')
                        .select('*, profiles!vault_events_winner_id_fkey(nickname)')
                        .eq('id', payload.new.id)
                        .maybeSingle();
                    if (data) setVault(data);
                    loadHistory();
                } else {
                    setVault(payload.new);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vault_hints' }, () => {
                if (vault?.id) loadHints(vault.id);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_packages' }, () => {
                loadPackages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [vault?.id]);

    const loadVaultData = async () => {
        setLoading(true);
        try {
            const { data: vaultData } = await supabase
                .from('vault_events')
                .select('*')
                .eq('status', 'active')
                .maybeSingle();

            if (vaultData) {
                setVault(vaultData);
                setPassLength(vaultData.correct_password?.length || 6);
                loadHints(vaultData.id);

                if (user) {
                    const { data: attemptData } = await supabase
                        .from('vault_user_attempts')
                        .select('attempts_remaining')
                        .eq('vault_id', vaultData.id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                    setAttempts(attemptData?.attempts_remaining || 0);
                }
            } else {
                setVault(null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadHints = async (vaultId: string) => {
        // Load all hints for the vault
        const { data: allHints } = await supabase
            .from('vault_hints')
            .select('*')
            .eq('vault_id', vaultId)
            .order('reveal_at', { ascending: true });

        setHints(allHints || []);

        if (user) {
            // Tenta carregar da tabela original e da tabela de fallback (vault_guesses)
            const { data: unlockedFallback } = await supabase
                .from('vault_guesses')
                .select('guess')
                .eq('user_id', user.id)
                .eq('vault_id', vaultId) // FILTRO CRÍTICO: Garante que a dica seja deste cofre específico
                .like('guess', 'HINT_UNLOCK_%');

            const fallbackIds = unlockedFallback?.map(g => g.guess.replace('HINT_UNLOCK_', '')) || [];

            try {
                const { data: unlocked } = await supabase
                    .from('vault_unlocked_hints')
                    .select('hint_id')
                    .eq('user_id', user.id)
                    .eq('vault_id', vaultId); // FILTRO ADICIONAL: Segurança em dobro

                const originalIds = unlocked?.map(u => u.hint_id) || [];
                setUnlockedHintIds([...new Set([...fallbackIds, ...originalIds])]);
            } catch (e) {
                // Se a tabela original falhar, usa apenas o fallback
                setUnlockedHintIds(fallbackIds);
            }
        }
    };

    const handleUnlockHint = async (hint: any) => {
        if (!user || !profile) return toast.error("Faça login para desbloquear!");
        if (profile.saldo < hint.unlock_price) return toast.error("Saldo insuficiente!");

        setLoading(true);
        try {
            // 1. Deduzir saldo imediatamente
            const { error: balanceError } = await supabase
                .from('profiles')
                .update({ saldo: profile.saldo - hint.unlock_price })
                .eq('user_id', user.id);

            if (balanceError) throw balanceError;

            // 2. Registrar desbloqueio (Usando vault_guesses como storage resiliente)
            const { error: unlockError } = await supabase
                .from('vault_guesses')
                .insert({
                    user_id: user.id,
                    vault_id: vault.id,
                    guess: `HINT_UNLOCK_${hint.id}`,
                    is_correct: false
                });

            if (unlockError) throw unlockError;

            toast.success("INTELIGÊNCIA DESBLOQUEADA!", {
                icon: <Zap className="text-yellow-500" />,
                description: "A informação confidencial agora está visível."
            });
            setUnlockedHintIds(prev => [...prev, hint.id]);
        } catch (e: any) {
            toast.error("Erro na transação: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        const { data } = await supabase
            .from('vault_events')
            .select('*, profiles!vault_events_winner_id_fkey(nickname)')
            .eq('status', 'finished')
            .order('updated_at', { ascending: false })
            .limit(3);
        setLastWinners(data || []);
    };

    const loadPackages = async () => {
        try {
            const { data, error } = await supabase
                .from('vault_packages')
                .select('*')
                .order('price', { ascending: true });

            if (data && data.length > 0) {
                setVaultPackages(data);
            }
        } catch (e) {
            console.error("Failed to load packages", e);
        }
    };

    const handleKeypad = (num: string) => {
        if (!vault || vault.status !== 'active') return;
        if (guess.length < (vault?.correct_password?.length || 6)) {
            setGuess(prev => prev + num);
        }
    };

    const handleClear = () => setGuess("");

    const handleBuyAttempts = async (packageId: string) => {
        if (!user || !vault) return;

        const selectedPkg = vaultPackages.find(p => p.id === packageId);
        if (!selectedPkg) return;

        const cost = selectedPkg.price;
        const amount = selectedPkg.amount;

        if ((profile?.saldo || 0) < cost) {
            return toast.error("Saldo insuficiente!");
        }

        try {
            const { error: balanceError } = await supabase
                .from('profiles')
                .update({ saldo: (profile?.saldo || 0) - cost })
                .eq('user_id', user.id);

            if (balanceError) throw balanceError;

            const { error: attemptError } = await supabase
                .from('vault_user_attempts')
                .upsert({
                    user_id: user.id,
                    vault_id: vault.id,
                    attempts_remaining: (attempts || 0) + amount
                }, { onConflict: 'user_id,vault_id' });

            if (attemptError) throw attemptError;

            // NOVO: Registrar no Histórico Financeiro
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: 'vault_purchase',
                amount: cost,
                status: 'approved'
            });

            await supabase.from("audit_logs").insert({
                admin_id: user.id,
                action_type: "tournament_enroll",
                details: `Jogador ${profile?.nickname} comprou pacote do Cofre: ${selectedPkg.name} (R$ ${cost})`
            });

            toast.success(`Arsenal abastecido! +${amount} palpites.`);
            setAttempts(prev => prev + amount);
        } catch (e: any) {
            toast.error("Erro na transação: " + e.message);
        }
    };

    const handleTestPassword = async () => {
        if (!user || !vault || guess.length !== (vault?.correct_password?.length || 6) || testing) return;
        if (attempts <= 0) return toast.error("Você não tem palpites!");

        setTesting(true);
        try {
            const { error: consumeError } = await supabase
                .from('vault_user_attempts')
                .update({ attempts_remaining: attempts - 1 })
                .eq('user_id', user.id)
                .eq('vault_id', vault.id);

            if (consumeError) throw consumeError;
            setAttempts(prev => prev - 1);

            const isCorrect = guess === vault.correct_password;

            await supabase.from('vault_guesses').insert({
                user_id: user.id,
                vault_id: vault.id,
                guess: guess,
                is_correct: isCorrect
            });

            if (isCorrect) {
                const prizeAmount = vault.prize_type === 'cash' ? (vault.prize_pool || 0) : 0;

                await supabase.from('vault_events').update({
                    status: 'finished',
                    winner_id: user.id
                }).eq('id', vault.id);

                if (prizeAmount > 0) {
                    await supabase.from('profiles').update({
                        saldo: (profile?.saldo || 0) + prizeAmount,
                        total_winnings: (profile?.total_winnings || 0) + prizeAmount,
                        victories: (profile?.victories || 0) + 1
                    }).eq('user_id', user.id);

                    await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'vault_prize',
                        amount: prizeAmount,
                        status: 'approved'
                    });
                } else {
                    await supabase.from('profiles').update({
                        victories: (profile?.victories || 0) + 1
                    }).eq('user_id', user.id);
                }

                await supabase.from("audit_logs").insert({
                    admin_id: user.id,
                    action_type: "finance_approve",
                    details: `Jogador ${profile?.nickname} DESBLOQUEOU O COFRE (${vault.title}). Prêmio: ${vault.prize_type === 'cash' ? 'R$ ' + prizeAmount : vault.prize_product_name}`
                });

                toast.success("COFRE DESBLOQUEADO!", {
                    duration: 15000,
                    description: `PARABÉNS! Você conquistou o prêmio: ${vault.prize_type === 'cash' ? 'R$ ' + prizeAmount : vault.prize_product_name}`
                });
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 500);
                toast.error("SENHA INCORRETA!", { description: "O mecanismo de trava permanece intacto." });
                setGuess("");
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-yellow-500" /></div>;

    const isActive = vault?.status === 'active';
    const isFinished = vault?.status === 'finished';

    return (
        <div className="space-y-16 animate-in fade-in duration-1000 pb-40">
            {/* ULTRA-PREMIUM INTERACTIVE VAULT */}
            <div className="relative flex flex-col items-center">
                {/* Visual Background Atmosphere */}
                <div className={`absolute top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000 ${!isFinished ? 'bg-yellow-500/10' : 'bg-green-500/10'} pointer-events-none`}></div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-6xl">

                    {/* LEFT SIDE: PRIZE & RIDDLE */}
                    <div className="space-y-8 order-2 lg:order-1">
                        {!isFinished ? (
                            <div className="space-y-8 text-center lg:text-left">
                                <div className="space-y-6">
                                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-black uppercase px-6 py-2 rounded-full text-[11px] tracking-widest animate-pulse border-2">
                                        RECOMPENSA DE SEGURANÇA MÁXIMA
                                    </Badge>

                                    {vault?.prize_type === 'product' ? (
                                        <div className="flex flex-col items-center lg:items-start gap-4">
                                            <div className="relative group/prize">
                                                <div className="absolute -inset-8 bg-yellow-500/20 blur-3xl rounded-full opacity-50 group-hover/prize:opacity-100 transition-opacity"></div>
                                                {vault.prize_product_image ? (
                                                    <img
                                                        src={vault.prize_product_image}
                                                        alt={vault.prize_product_name}
                                                        className="relative w-64 h-64 object-contain drop-shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-transform duration-700 hover:scale-110"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135678.png";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="relative w-48 h-48 bg-white/5 rounded-full flex items-center justify-center border-4 border-dashed border-yellow-500/20">
                                                        <Trophy className="h-16 w-16 text-yellow-500/20" />
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-2 rounded-2xl text-[11px] font-black uppercase shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-2 border-black rotate-12">Prêmio Especial</div>
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">
                                                    {vault.prize_product_name}
                                                </h2>
                                                {vault.show_estimated_value && vault.estimated_prize_value > 0 && (
                                                    <p className="text-yellow-500 font-black uppercase text-xs tracking-widest italic">Valor de Mercado: R$ {vault.estimated_prize_value.toLocaleString()}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <h2 className="text-8xl md:text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_50px_rgba(234,179,8,0.4)] flex items-end justify-center lg:justify-start">
                                                <span className="text-4xl text-yellow-500 font-bold mb-4 mr-2">R$</span>
                                                {vault?.prize_pool || "0"}
                                            </h2>
                                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Prêmio Acumulado em Tempo Real</p>
                                        </div>
                                    )}
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative group lg:max-w-md"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-600 blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <Card className="relative bg-black/80 border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl overflow-hidden shadow-2xl">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all group-hover:rotate-12">
                                            <Key className="h-20 w-20 text-yellow-500" />
                                        </div>
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_15px_#eab308] animate-pulse"></div>
                                            <h3 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.5em]">Protocolo Enigma</h3>
                                        </div>
                                        <p className="text-2xl md:text-3xl font-black italic text-white leading-tight uppercase group-hover:text-yellow-400 transition-colors duration-500 shadow-sm">
                                            "{vault?.description || "A senha está oculta nas sombras..."}"
                                        </p>
                                        <div className="mt-8 flex items-center gap-4 text-[9px] font-black text-white/30 uppercase tracking-widest border-t border-white/5 pt-6">
                                            <Fingerprint className="h-4 w-4 text-yellow-500/40" />
                                            <span>Algoritmo de Segurança Ativo</span>
                                        </div>
                                    </Card>
                                </motion.div>

                                <div className="flex justify-center lg:justify-start gap-6">
                                    <div className="group relative flex items-center gap-4 bg-gradient-to-br from-yellow-500/10 to-transparent px-8 py-5 rounded-[2rem] border-2 border-yellow-500/20 backdrop-blur-xl shadow-2xl hover:border-yellow-500/50 transition-all hover:scale-105 active:scale-95">
                                        <div className="p-3 bg-yellow-500 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                                            <Zap className="h-6 w-6 text-black fill-black" />
                                        </div>
                                        <div className="text-left leading-none">
                                            <p className="text-3xl font-black text-white italic group-hover:text-yellow-500 transition-colors">{attempts}</p>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Palpites Ativos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group/win animate-in zoom-in duration-1000">
                                <div className="absolute -inset-10 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse"></div>
                                <div className="relative space-y-6 text-center lg:text-left bg-gradient-to-br from-[#FFD700]/20 via-black to-black p-12 rounded-[5rem] border-4 border-[#FFD700]/30 shadow-[0_0_100px_rgba(255,215,0,0.2)]">
                                    <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                                        <div className="h-16 w-16 bg-[#FFD700] rounded-2xl flex items-center justify-center shadow-[0_0_30px_#FFD700]">
                                            <Unlock className="h-8 w-8 text-black" />
                                        </div>
                                        <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">Cofre Aberto!</h2>
                                    </div>

                                    <div className="relative h-48 w-full bg-[#111] rounded-[3rem] border-2 border-[#FFD700]/10 overflow-hidden flex items-center justify-center group-hover/win:scale-105 transition-transform duration-700">
                                        {/* Golden Treasure Visual Case */}
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#FFD700]/40 to-transparent"></div>
                                        <Coins className="h-24 w-24 text-[#FFD700] drop-shadow-[0_0_40px_rgba(255,215,0,0.6)] animate-bounce" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="grid grid-cols-4 gap-2 opacity-30">
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className="h-4 w-4 bg-[#FFD700] rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 space-y-4">
                                        <div className="bg-black/60 p-8 rounded-[3rem] border-2 border-[#FFD700]/20 shadow-inner">
                                            <p className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest mb-3">Tesouro Conquistado por {vault?.profiles?.nickname || 'Agente X'}</p>
                                            <div className="text-7xl font-black text-white italic leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                                                {vault.prize_type === 'cash' ? (
                                                    <><span className="text-3xl mr-2 text-yellow-500">R$</span> {vault?.prize_pool}</>
                                                ) : (
                                                    <span className="text-3xl text-yellow-500">{vault.prize_product_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: THE INTERACTIVE VAULT DOOR */}
                    <div className="order-1 lg:order-2 flex justify-center perspective-[2000px]">
                        <motion.div
                            initial={false}
                            className="relative group transition-all duration-1000"
                        >
                            {/* SAFE INTERIOR (The Golden Treasure) */}
                            {isFinished && (
                                <div className="absolute inset-4 rounded-[4rem] bg-[#0a0a05] border-8 border-yellow-600/30 flex flex-col items-center justify-center overflow-hidden z-0 shadow-[0_0_100px_rgba(255,215,0,0.4)]">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 via-transparent to-transparent"></div>

                                    <motion.div
                                        initial={{ scale: 0.5, y: 50 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="relative">
                                            <div className="absolute -inset-10 bg-yellow-400 blur-3xl opacity-40 animate-pulse"></div>
                                            <Coins className="h-32 w-32 text-[#FFD700] drop-shadow-[0_0_40px_rgba(255,215,0,0.9)] mb-6" />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className="h-6 w-16 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-600 rounded shadow-2xl skew-x-12 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>

                                        <div className="mt-10 text-center">
                                            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] mb-2">Resgate Liberado</p>
                                            <p className="text-4xl font-black text-white italic drop-shadow-lg uppercase">Ouro Puro</p>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* VAULT BODY/DOOR */}
                            <motion.div
                                animate={isFinished ? { rotateY: -130, x: 150, z: -100 } : { rotateY: 0, x: 0, z: 0 }}
                                transition={{ type: "spring", stiffness: 40, damping: 15 }}
                                className={`relative w-[340px] md:w-[400px] h-[580px] rounded-[5rem] p-10 border-[16px] shadow-[0_80px_120px_rgba(0,0,0,0.9)] flex flex-col items-center transition-all duration-1000 overflow-hidden z-10
                                ${isFinished ? 'border-[#1a3a1a] bg-[#050a05] shadow-[0_0_100px_rgba(34,197,94,0.1)]' :
                                        isActive ? 'border-[#FFD700] bg-gradient-to-br from-[#1a1400] via-[#050505] to-[#1a1400] shadow-[inset_0_0_80px_rgba(255,215,0,0.3),0_0_150px_rgba(255,215,0,0.2)]' :
                                            'border-yellow-600/40 bg-gradient-to-br from-[#2a1a0a] via-[#0a0a0a] to-[#2a1a0a] shadow-[inset_0_4px_40px_rgba(0,0,0,0.8)] opacity-90 grayscale-[0.2]'}`}>

                                {/* Metallic Texture Overlay */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none"></div>
                                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-20' : 'opacity-10'} bg-gradient-to-tr from-yellow-500/20 via-transparent to-orange-500/20`}></div>
                                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"></div>

                                {/* COMPACT DIGITAL VISOR */}
                                <div className={`w-full h-24 bg-black rounded-[2rem] border-2 mb-6 flex flex-col items-center justify-center relative shadow-[inset_0_4px_30px_rgba(0,0,0,1)] z-20
                                    ${!isFinished ? 'border-yellow-600' : 'border-green-600'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 to-transparent pointer-events-none"></div>

                                    <AnimatePresence mode="wait">
                                        {isFinished ? (
                                            <motion.div
                                                key="unlocked"
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center"
                                            >
                                                <Unlock className="h-5 w-5 text-green-500" />
                                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">ABERTO</span>
                                            </motion.div>
                                        ) : (
                                            <div className="grid grid-cols-6 gap-1">
                                                {[...Array(passLength)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={guess[i] ? {
                                                            scale: [1, 1.05, 1],
                                                            boxShadow: ["0 0 0px #FFD700", "0 0 10px #FFD700", "0 0 3px #FFD700"]
                                                        } : {}}
                                                        className={`w-5 h-7 rounded-md border transition-all duration-300 flex items-center justify-center
                                                            ${guess[i] ? 'bg-yellow-500 border-yellow-400' : 'bg-white/5 border-white/10'}`}
                                                    >
                                                        {guess[i] ? (
                                                            <span className="text-sm font-black text-black leading-none">{guess[i]}</span>
                                                        ) : (
                                                            <div className="h-0.5 w-0.5 rounded-full bg-white/20"></div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* EMBEDDED KEYPAD */}
                                <div className={`grid grid-cols-3 gap-3 w-full max-w-[280px] transition-opacity duration-500 ${!isActive ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                                        <button
                                            key={k}
                                            onClick={() => {
                                                if (k === 'C') handleClear();
                                                else if (k === '⌫') setGuess(prev => prev.slice(0, -1));
                                                else handleKeypad(k);
                                            }}
                                            className={`h-11 md:h-12 w-full flex items-center justify-center rounded-xl border font-black text-sm transition-all active:scale-90 hover:scale-105
                                                ${k === 'C' || k === '⌫'
                                                    ? 'bg-red-500/5 border-red-500/20 text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg'
                                                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-yellow-500/50 hover:text-yellow-500 hover:bg-white/5'}`}
                                        >
                                            {k}
                                        </button>
                                    ))}
                                </div>

                                {/* MECHANICAL SPIN HANDLE (ACTION BUTTON) */}
                                <div className="mt-8 relative flex flex-col items-center justify-center">
                                    <motion.button
                                        disabled={guess.length !== passLength || testing || !isActive}
                                        onClick={handleTestPassword}
                                        whileHover={guess.length === passLength ? { scale: 1.05 } : {}}
                                        whileTap={guess.length === passLength ? { scale: 0.95 } : {}}
                                        animate={testing ? { rotate: 360 } : {}}
                                        transition={testing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring", stiffness: 300 }}
                                        className={`relative w-40 h-40 md:w-48 md:h-48 rounded-full border-[10px] flex items-center justify-center z-10 transition-all duration-700
                                            ${guess.length === passLength && !testing
                                                ? 'border-yellow-500 bg-gradient-to-tr from-[#222] via-[#444] to-[#222] shadow-[0_0_60px_rgba(234,179,8,0.4)] cursor-pointer'
                                                : isFinished ? 'border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-black'
                                                    : 'border-white/5 bg-black cursor-not-allowed opacity-50'}`}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-full bg-white/5 absolute rotate-0"></div>
                                            <div className="w-2 h-full bg-white/5 absolute rotate-45"></div>
                                            <div className="w-2 h-full bg-white/5 absolute rotate-90"></div>
                                            <div className="w-2 h-full bg-white/5 absolute rotate-[135deg]"></div>
                                        </div>
                                        <div className={`relative z-20 flex flex-col items-center transition-all ${testing ? 'scale-75' : ''}`}>
                                            {testing ? (
                                                <RotateCw className="h-10 w-10 text-yellow-500 animate-spin" />
                                            ) : isFinished ? (
                                                <Unlock className="h-12 w-12 text-green-500" />
                                            ) : (
                                                <>
                                                    <Lock className={`h-12 w-12 mb-1 ${guess.length === passLength ? 'text-yellow-500' : 'text-gray-700'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${guess.length === passLength ? 'text-yellow-500' : 'text-gray-800'}`}>Girar</span>
                                                </>
                                            )}
                                        </div>
                                    </motion.button>

                                    {/* Security Lights */}
                                    <div className="mt-4 flex gap-3">
                                        <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse' : 'bg-gray-800'}`}></div>
                                        <div className={`h-2 w-2 rounded-full ${isFinished ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`}></div>
                                        <div className={`h-2 w-2 rounded-full ${attempts === 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-800'}`}></div>
                                    </div>
                                </div>

                            </motion.div>
                        </motion.div>
                    </div>

                </div>
            </div>

            {/* INTELLIGENCE SECTION (NOW ON TOP) */}
            <div className="space-y-8 pt-10">
                <div className="flex flex-col items-center text-center space-y-2">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-black uppercase tracking-widest px-6 py-1.5 text-[8px] bg-blue-500/5">Transmissão Criptografada</Badge>
                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter">Arquivos de Inteligência</h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Interceptações estratégicas do Protocolo Enigma</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {hints.map((h, i) => {
                        const isRevealedByTime = h.is_revealed || new Date(h.reveal_at) <= new Date();
                        const isUnlocked = unlockedHintIds.includes(h.id);
                        const canSee = isRevealedByTime || isUnlocked;
                        const daysUntil = Math.max(0, Math.ceil((new Date(h.reveal_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));

                        return (
                            <div key={h.id} className={`group relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden
                                ${canSee ? 'bg-gradient-to-br from-blue-600/10 to-black border-blue-500/20 shadow-2xl' : 'bg-black/80 border-white/5 grayscale pointer-events-none opacity-80'}`}>

                                {!canSee && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[10px] pointer-events-auto flex flex-col items-center justify-center p-8 text-center z-10 transition-all">
                                        <AnimatePresence>
                                            {confirmHint?.id === h.id ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="space-y-6"
                                                >
                                                    <div className="flex flex-col items-center gap-2">
                                                        <p className="text-xs font-black text-yellow-500 uppercase tracking-widest">Confirmar Pagamento</p>
                                                        <h4 className="text-3xl font-black text-white italic">R$ {h.unlock_price.toLocaleString()}</h4>
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest max-w-[200px]">Deseja descriptografar esta informação agora?</p>
                                                    </div>
                                                    <div className="flex gap-3 justify-center w-full">
                                                        <Button
                                                            onClick={() => {
                                                                handleUnlockHint(h);
                                                                setConfirmHint(null);
                                                            }}
                                                            className="bg-green-500 hover:bg-green-400 text-black font-black uppercase text-[10px] px-6 h-10 rounded-xl"
                                                        >
                                                            SIM, LIBERAR
                                                        </Button>
                                                        <Button
                                                            onClick={() => setConfirmHint(null)}
                                                            className="bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] px-6 h-10 rounded-xl border border-white/5"
                                                        >
                                                            CANCELAR
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="space-y-4"
                                                >
                                                    <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10 mx-auto w-fit">
                                                        <Lock className="h-8 w-8 text-gray-500" />
                                                    </div>
                                                    {h.reveal_at && (
                                                        <div className="flex items-center justify-center gap-1 mb-2 opacity-80 scale-90">
                                                            <Clock className="h-3 w-3 text-blue-400" />
                                                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
                                                                Revelação Gratuita: {new Date(h.reveal_at).toLocaleDateString()} às {new Date(h.reveal_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-4">{h.pre_reveal_title || "Informação Criptografada"}</p>
                                                    <Button
                                                        onClick={() => setConfirmHint(h)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] px-10 h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-3 transition-all active:scale-95 border-b-4 border-blue-800"
                                                    >
                                                        <Fingerprint className="h-5 w-5" />
                                                        DESBLOQUEAR AGORA
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                <div className="flex flex-col gap-6 relative z-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-transform duration-500 group-hover:rotate-12
                                            ${canSee ? 'bg-blue-600 text-white border-black' : 'bg-white/5 text-gray-700 border-white/10'}`}>
                                            <Key className="h-6 w-6 font-bold" />
                                        </div>
                                        <div className="flex flex-col">
                                            <Badge className={`text-[8px] w-fit font-black uppercase border-0 ${canSee ? 'bg-blue-400/20 text-blue-400' : 'bg-white/5'}`}>REgistro #{i + 1}</Badge>
                                            {isUnlocked && <p className="text-[7px] text-yellow-500 font-black uppercase mt-1">Acesso Antecipado Concedido</p>}
                                        </div>
                                    </div>
                                    <p className={`text-lg font-black italic leading-tight uppercase ${canSee ? 'text-white' : 'text-transparent bg-gradient-to-r from-white/10 to-transparent bg-clip-text select-none'}`}>
                                        "{canSee ? h.hint_text : 'SINAL CRIPTOGRAFADO'}"
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    {hints.length === 0 && (
                        <div className="col-span-full py-16 border-2 border-dashed border-white/5 rounded-[4rem] text-center bg-black/20">
                            <AlertCircle className="h-10 w-10 mx-auto mb-4 text-gray-800" />
                            <h4 className="text-white/20 font-black uppercase tracking-widest text-sm">Sem Transmissões</h4>
                        </div>
                    )}
                </div>
            </div>

            {/* UPSELL PACKAGES */}
            <div className="space-y-8 pt-10">
                <div className="flex flex-col items-center text-center space-y-2">
                    <Badge variant="outline" className="border-white/10 text-gray-500 font-black uppercase tracking-widest px-4 py-1 text-[8px]">Loja de Munições</Badge>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Adquirir Palpites</h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest max-w-sm">Esteja preparado para a invasão</p>
                </div>
                <div className="flex flex-wrap justify-center gap-4 px-4 max-w-5xl mx-auto">
                    {vaultPackages.map((pkg) => (
                        <div key={pkg.id} className="relative active:scale-95 transition-all duration-300 w-full md:w-[280px]">
                            {/* EFEITO DE BRILHO VIP (GLOW) */}
                            {pkg.is_glowing && (
                                <div
                                    className="absolute -inset-1 rounded-[2rem] opacity-75 blur-xl animate-pulse z-0"
                                    style={{ background: `linear-gradient(45deg, ${pkg.highlight_color || '#eab308'}, #fff, ${pkg.highlight_color || '#eab308'})` }}
                                />
                            )}

                            <Card
                                onClick={() => handleBuyAttempts(pkg.id)}
                                style={{
                                    borderColor: pkg.is_glowing ? `${pkg.highlight_color}66` : 'rgba(255,255,255,0.05)',
                                    boxShadow: pkg.is_glowing ? `0 10px 20px -5px ${pkg.highlight_color}44` : 'none'
                                }}
                                className={`group relative p-6 rounded-[2rem] border-2 bg-[#080808] hover:bg-[#0c0c0c] transition-all cursor-pointer flex flex-col items-center hover:-translate-y-2 overflow-hidden z-10 h-full ${pkg.is_glowing ? 'border-t-white/30' : ''}`}
                            >
                                {/* TEXTURA PREMIUM */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

                                {/* BADGE VIP */}
                                {pkg.badge && (
                                    <div className="absolute top-0 right-4 transform -translate-y-1/2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-xl z-20 animate-bounce" style={{ backgroundColor: pkg.highlight_color || '#eab308', color: 'black' }}>
                                        {pkg.badge}
                                    </div>
                                )}

                                {/* ÍCONE FLUTUANTE */}
                                <div
                                    className="p-4 rounded-[1.5rem] mb-4 relative transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-110"
                                    style={{
                                        backgroundColor: `${pkg.highlight_color}10`,
                                        border: `1px solid ${pkg.highlight_color}20`,
                                        boxShadow: `0 0 20px ${pkg.highlight_color}10`
                                    }}
                                >
                                    <div className="absolute inset-0 blur-lg opacity-50" style={{ backgroundColor: pkg.highlight_color }}></div>
                                    <div className="relative z-10" style={{ color: pkg.highlight_color }}>
                                        {pkg.amount >= 50 ? <Trophy className="h-8 w-8" /> : pkg.amount >= 10 ? <ShieldCheck className="h-8 w-8" /> : <Zap className="h-8 w-8" />}
                                    </div>
                                </div>

                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-center" style={{ color: pkg.text_color || '#6b7280' }}>
                                    {pkg.name}
                                </h4>

                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-4xl font-black italic tracking-tighter text-white drop-shadow-2xl">
                                        {pkg.amount}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest leading-none">Tentativas</span>
                                        <div className="h-0.5 w-6 bg-yellow-500 rounded-full mt-1"></div>
                                    </div>
                                </div>

                                <div className="mt-auto w-full space-y-4">
                                    <div className="flex justify-center items-center gap-1.5 py-2.5 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-[9px] font-bold text-gray-400">VALOR:</span>
                                        <span className="text-lg font-black text-white" style={{ color: pkg.highlight_color }}>
                                            R$ {Number(pkg.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <Button
                                        className="w-full h-12 rounded-2xl font-black uppercase italic tracking-[0.15em] text-[10px] shadow-xl transition-all group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                                        style={{
                                            backgroundColor: pkg.highlight_color || '#eab308',
                                            borderColor: pkg.highlight_color || '#eab308',
                                            color: 'black'
                                        }}
                                    >
                                        {pkg.button_text || 'ADQUIRIR'}
                                        <ChevronRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="absolute -bottom-10 -left-10 h-32 w-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-1000 rounded-full" style={{ backgroundColor: pkg.highlight_color }}></div>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {/* HALL DA FAMA (BOTTOM) */}
            <div className="space-y-12 pt-20 border-t border-white/5">
                <div className="flex flex-col items-center text-center space-y-2">
                    <History className="h-10 w-10 text-yellow-500 mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    <h3 className="text-5xl font-black text-white uppercase italic tracking-tighter">Hall da Fama</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.8em]">Lendas do Protocolo Enigma</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                    {lastWinners.map((w) => (
                        <div key={w.id} className="relative group p-10 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[4rem] hover:border-yellow-500/30 transition-all flex flex-col items-center">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity"><Trophy className="h-16 w-16 text-yellow-500" /></div>
                            <div className="h-16 w-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center border-2 border-yellow-500/20 mb-6">
                                <Trophy className="h-8 w-8 text-yellow-500" />
                            </div>
                            <h4 className="text-2xl font-black text-white uppercase italic mb-2">{w.profiles?.nickname || 'Agente'}</h4>
                            <p className="text-3xl font-black text-yellow-500 italic mb-6">R$ {w.prize_pool || '---'}</p>
                            <div className="flex items-center gap-3 px-6 py-2 bg-black/40 rounded-full border border-white/5">
                                <Timer className="h-4 w-4 text-gray-600" />
                                <span className="text-[10px] text-gray-600 font-black uppercase">{new Date(w.updated_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                    {lastWinners.length === 0 && <div className="col-span-full text-center py-20 text-[10px] uppercase font-black text-gray-700 opacity-20 italic">O ranking heroico está vazio...</div>}
                </div>
            </div>
        </div>
    );
}

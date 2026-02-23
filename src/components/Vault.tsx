import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, Unlock, Zap, Trophy, Timer, Wallet, Star, Info, ChevronRight, AlertCircle, Loader2, ShieldCheck, Key, ArrowRight, History } from "lucide-react";

export default function Vault() {
    const { user, profile } = useAuth();
    const [vault, setVault] = useState<any>(null);
    const [lastWinners, setLastWinners] = useState<any[]>([]);
    const [attempts, setAttempts] = useState(0);
    const [hints, setHints] = useState<any[]>([]);
    const [vaultPackages, setVaultPackages] = useState<any[]>([
        { id: 'single', name: 'Investida Única', amount: 1, price: 2.00, color: 'gray' },
        { id: 'silver', name: 'Pacote EspecialISTA', amount: 10, price: 15.00, color: 'blue', badge: 'Recomendado' },
        { id: 'gold', name: 'Arsenal de Ouro', amount: 50, price: 50.00, color: 'yellow', badge: 'Elite' }
    ]);
    const [guess, setGuess] = useState("");
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        loadVaultData();
        loadHistory();
        loadPackages();

        const subscription = supabase
            .channel('vault_realtime')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vault_events' }, (payload) => {
                setVault(payload.new);
                if (payload.new.status === 'finished') loadHistory();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vault_hints' }, () => {
                if (vault?.id) loadHints(vault.id);
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
        const { data } = await supabase
            .from('vault_hints')
            .select('*')
            .eq('vault_id', vaultId)
            .eq('is_revealed', true)
            .order('reveal_at', { ascending: false });
        setHints(data || []);
    };

    const loadHistory = async () => {
        const { data } = await supabase
            .from('vault_events')
            .select('*, profiles(nickname)')
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
        if (guess.length < 6) {
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

            toast.success(`Arsenal abastecido! +${amount} palpites.`);
            setAttempts(prev => prev + amount);
        } catch (e: any) {
            toast.error("Erro na transação: " + e.message);
        }
    };

    const handleTestPassword = async () => {
        if (!user || !vault || guess.length !== 6 || testing) return;
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
                await supabase.from('vault_events').update({
                    status: 'finished',
                    winner_id: user.id
                }).eq('id', vault.id);

                await supabase.from('profiles').update({
                    saldo: (profile?.saldo || 0) + (vault.prize_pool || 0),
                    total_winnings: (profile?.total_winnings || 0) + (vault.prize_pool || 0),
                    victories: (profile?.victories || 0) + 1
                }).eq('user_id', user.id);

                toast.success("COFRE DESBLOQUEADO!", {
                    duration: 15000,
                    description: `PARABÉNS! R$ ${vault.prize_pool} foram creditados na sua conta.`
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
        <div className="space-y-12 animate-in fade-in duration-1000 pb-40">
            {/* PREMIERE VAULT VISUAL */}
            <div className="relative flex flex-col items-center">
                {/* Visual Background Glows */}
                <div className={`absolute top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] transition-all duration-1000 ${!isFinished ? 'bg-yellow-500/30' : 'bg-green-500/20'} pointer-events-none`}></div>
                {!isFinished && <div className="absolute top-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[80px] bg-yellow-400/20 animate-pulse pointer-events-none"></div>}

                <div className={`relative transition-all duration-500 ${shake ? 'animate-bounce' : ''}`}>
                    {/* SAFE BODY */}
                    <div className={`relative w-80 h-96 rounded-[4.5rem] p-6 border-[16px] shadow-[0_40px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between transition-all duration-1000
                        ${isFinished ? 'border-[#1a3a1a] bg-gradient-to-br from-[#1a2f1a] to-[#051a05] shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                            'border-yellow-400 bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 shadow-[inset_0_4px_30px_rgba(255,255,255,0.6),0_0_100px_rgba(234,179,8,0.7)]'}`}>

                        {/* Hinge Detail */}
                        <div className={`absolute right-12 top-0 bottom-0 w-3 bg-black/50 border-l border-white/5 transition-transform duration-1000 ${isFinished ? 'translate-x-[200px] opacity-0' : ''}`}></div>

                        {/* DIGITAL DISPLAY (VISOR) */}
                        <div className={`w-full h-24 bg-[#050505] rounded-[2rem] border-4 ${!isFinished ? 'border-yellow-600 shadow-[inset_0_4px_20px_rgba(0,0,0,1),0_0_30px_rgba(234,179,8,0.4)]' : 'border-[#222] shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]'} flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-500`}>
                            {!isActive && !isFinished && (
                                <>
                                    <div className="flex gap-3 mb-2 opacity-30">
                                        {[0, 1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-4 h-5 rounded-md border-2 bg-white/5 border-white/10"></div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-black text-yellow-500/50 uppercase tracking-[0.2em] animate-pulse">Aguardando Conexão</p>
                                </>
                            )}
                            {isActive && (
                                <>
                                    <div className="flex gap-3 mb-2">
                                        {[0, 1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`w-4 h-5 rounded-md border-2 transition-all duration-300 ${guess[i] ? 'bg-yellow-400 border-yellow-300 shadow-[0_0_15px_#facc15]' : 'bg-white/5 border-white/10'}`}></div>
                                        ))}
                                    </div>
                                    <p className="text-[8px] font-black text-yellow-500/50 uppercase tracking-[0.2em]">Painel Desbloqueio</p>
                                </>
                            )}
                            {isFinished && (
                                <div className="text-center animate-bounce">
                                    <p className="text-sm font-black text-green-500 uppercase tracking-[0.2em]">Cofre Aberto</p>
                                    <Unlock className="h-5 w-5 text-green-500 mx-auto mt-2" />
                                </div>
                            )}
                        </div>

                        {/* MECHANICAL HANDLE */}
                        <div className="relative group/handle cursor-help">
                            {/* Inner Circle with Spokes */}
                            <div className={`w-36 h-36 rounded-full border-[12px] shadow-2xl flex items-center justify-center transition-all duration-1000
                                ${isFinished ? 'rotate-180 border-green-900 bg-gradient-to-tr from-[#111] to-[#333] shadow-[0_0_30px_rgba(34,197,94,0.3)]' :
                                    'group-hover/handle:rotate-45 border-yellow-200 bg-gradient-to-tr from-yellow-100 via-yellow-300 to-yellow-600 shadow-[0_0_50px_rgba(255,255,255,0.5)]'}`}>
                                <div className={`w-6 h-6 rounded-full transition-all duration-1000 ${!isFinished ? 'bg-white shadow-[0_0_25px_#fff] animate-pulse' : 'bg-green-500 shadow-[0_0_15px_#22c55e]'}`}></div>

                                {/* Spokes */}
                                <div className="absolute inset-0 p-4 flex justify-between items-center opacity-30">
                                    <div className="h-2.5 w-7 rounded-full bg-white"></div>
                                    <div className="h-2.5 w-7 rounded-full bg-white"></div>
                                </div>
                                <div className="absolute inset-0 p-4 flex flex-col justify-between items-center opacity-30">
                                    <div className="w-2.5 h-7 rounded-full bg-white"></div>
                                    <div className="w-2.5 h-7 rounded-full bg-white"></div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER STATUS LIGHTS */}
                        <div className="w-full flex justify-between items-center px-6 pb-2">
                            <div className="flex gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${!isFinished ? 'bg-green-500 shadow-[0_0_15px_#4ade80] animate-pulse' : 'bg-gray-900'}`}></div>
                                <div className="h-2.5 w-2.5 rounded-full bg-gray-900"></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className={`h-5 w-5 ${isFinished ? 'text-green-500' : 'text-yellow-600'}`} />
                                <span className={`text-[8px] font-black uppercase ${!isFinished ? 'text-yellow-700' : 'text-gray-900'}`}>High Security</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INFO PANEL */}
                <div className="mt-10 text-center max-w-sm w-full space-y-6">
                    {!isFinished && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-700 relative text-center">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-yellow-400/40 blur-[80px] rounded-full pointer-events-none"></div>
                            <div className="flex flex-col items-center relative z-10">
                                <Badge className="bg-yellow-400 text-black font-black uppercase px-6 py-2 rounded-full tracking-tighter mb-2 shadow-[0_0_40px_rgba(250,204,21,0.8)] border-2 border-white/50">
                                    PRÊMIO ACUMULADO
                                </Badge>
                                <div className="text-[5.5rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-200 to-yellow-600" style={{ filter: 'drop-shadow(0px 0px 30px rgba(250,204,21,1))' }}>
                                    <span className="text-4xl text-yellow-300">R$</span> {vault?.prize_pool || "?.???"}
                                </div>
                            </div>

                            <Card className="bg-white/5 border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl relative overflow-hidden group hover:border-yellow-500/30 transition-all cursor-default">
                                <div className="absolute -top-10 -right-10 h-32 w-32 bg-yellow-500/10 blur-[50px] rounded-full group-hover:scale-150 transition-transform"></div>
                                <Key className="h-6 w-6 text-yellow-500/20 absolute bottom-6 right-8 rotate-12" />
                                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em] mb-4 text-center border-b border-white/5 pb-2">A CHARADA LÓGICA</h3>
                                <p className="text-2xl font-black italic text-white leading-tight uppercase text-center group-hover:scale-105 transition-transform duration-500">
                                    "{vault?.description || "Enigma Oculto..."}"
                                </p>
                            </Card>
                        </div>
                    )}
                    {isFinished && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
                            <Badge className="bg-green-600 text-white font-black uppercase px-8 py-2 rounded-full text-xs shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                                EVENTO FINALIZADO
                            </Badge>
                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-md">
                                <div className="h-20 w-20 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                    <Trophy className="h-10 w-10 text-yellow-500" />
                                </div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tesouro Descoberto</p>
                                <p className="text-5xl font-black text-white italic tracking-tighter leading-none mb-4">R$ {vault?.prize_pool}</p>
                                <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center justify-center gap-2">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase italic">Ganhador: {vault?.profiles?.nickname || 'Veterano'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* INTERACTIVE PAD (BLURRED IF NOT ACTIVE) */}
            <div className={`transition-all duration-1000 ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-10 blur-xl pointer-events-none translate-y-20 scale-90'}`}>
                <div className="max-w-xs mx-auto space-y-8">
                    {/* ATTEMPTS LEFT */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-md">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">{attempts} Palpites Ativos</span>
                        </div>
                    </div>

                    {/* PAD */}
                    <div className="grid grid-cols-3 gap-4">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                            <Button
                                key={k}
                                onClick={() => {
                                    if (k === 'C') handleClear();
                                    else if (k === '⌫') setGuess(prev => prev.slice(0, -1));
                                    else handleKeypad(k);
                                }}
                                className={`h-16 text-3xl font-black rounded-3xl border-2 transition-all active:scale-95 duration-75 shadow-lg
                                    ${k === 'C' || k === '⌫' ? 'bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]' :
                                        'bg-[#050505]/80 border-yellow-800/60 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.6)]'}`}
                            >
                                {k}
                            </Button>
                        ))}
                    </div>

                    <Button
                        disabled={guess.length !== 6 || testing || !isActive}
                        onClick={handleTestPassword}
                        className="w-full h-20 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 hover:from-yellow-400 hover:via-yellow-300 hover:to-yellow-400 text-black font-black uppercase text-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(234,179,8,0.5),inset_0_4px_15px_rgba(255,255,255,0.5)] border-none active:translate-y-1 transition-all disabled:opacity-100 disabled:cursor-not-allowed"
                    >
                        {testing ? <Loader2 className="animate-spin" /> : "GIRAR MAÇANETA"}
                    </Button>
                </div>
            </div>

            {/* UPSELL PACKAGES - ALWAYS RELEVANT TO BUILD SALDO */}
            <div className="space-y-6 pt-10">
                <div className="text-center">
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.5em] mb-1">Munição para o Desafio</h3>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Aumente suas chances de abrir o cofre</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {vaultPackages.map((pkg) => (
                        <Card
                            key={pkg.id}
                            onClick={() => handleBuyAttempts(pkg.id)}
                            className={`group relative p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center hover:scale-105 active:scale-95 overflow-hidden
                                ${pkg.color === 'yellow' ? 'border-yellow-500/10 ring-1 ring-yellow-500/5' : ''}`}
                        >
                            {pkg.badge && <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-[2rem] text-[9px] font-black uppercase tracking-tighter ${pkg.color === 'yellow' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>{pkg.badge}</div>}
                            <div className={`p-4 rounded-3xl mb-6 bg-white/5 group-hover:scale-110 transition-transform ${pkg.color === 'yellow' ? 'text-yellow-500' : pkg.color === 'blue' ? 'text-blue-500' : 'text-gray-500'}`}>
                                {pkg.color === 'gray' ? <Zap className="h-8 w-8" /> : pkg.color === 'blue' ? <ShieldCheck className="h-8 w-8" /> : <Trophy className="h-8 w-8" />}
                            </div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{pkg.name}</h4>
                            <p className="text-3xl font-black text-white italic">{pkg.amount} Palpites</p>
                            <div className="mt-4 text-2xl font-black text-yellow-500 leading-none">R$ {Number(pkg.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <Button variant="ghost" className="mt-6 font-black uppercase text-[10px] tracking-widest border border-white/5 group-hover:bg-white group-hover:text-black rounded-xl">Adquirir</Button>
                        </Card>
                    ))}
                </div>
            </div>

            {/* HINT MURAL AND RECENT WINNERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Hints */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <Info className="h-5 w-5 text-blue-500" />
                            <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Registros de Dicas</h3>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black border-blue-500/20 text-blue-500">{hints.length} REVELADAS</Badge>
                    </div>
                    <div className="space-y-4">
                        {hints.map((h, i) => (
                            <div key={h.id} className="group flex gap-6 p-6 bg-gradient-to-r from-blue-600/10 to-transparent border-l-4 border-blue-500 rounded-3xl animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                                <div className="h-12 w-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-xl group-hover:scale-110 transition-transform shrink-0">
                                    <Key className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-blue-100 leading-relaxed uppercase italic">"{h.hint_text}"</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Timer className="h-3 w-3 text-gray-600" />
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Revelada em {new Date(h.reveal_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {hints.length === 0 && (
                            <div className="p-16 border-2 border-dashed border-white/5 rounded-[3rem] text-center opacity-40">
                                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-gray-700" />
                                <p className="text-[10px] uppercase font-black text-gray-500 px-10">Nenhuma informação confidencial interceptada até o momento.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <History className="h-5 w-5 text-yellow-500" />
                            <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Hall da Fama</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {lastWinners.map((w, i) => (
                            <div key={w.id} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
                                        <Trophy className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white uppercase italic">{w.profiles?.nickname || 'Vencedor Anonimo'}</p>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{new Date(w.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-yellow-500 italic leading-none">R$ {w.prize_pool}</p>
                                    <p className="text-[9px] text-gray-700 uppercase font-black">Prêmio Pago</p>
                                </div>
                            </div>
                        ))}
                        {lastWinners.length === 0 && <p className="text-center py-20 text-[10px] uppercase font-black text-gray-700 opacity-30 italic">O ranking heroico está vazio...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

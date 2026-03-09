import { useState, useEffect, useRef } from "react";
import { Gamepad2, Play, ChevronLeft, Swords, Rocket, Target, Puzzle, Ship, Crown, Flag, Trophy, Zap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
    {
        id: "race",
        title: "ROYAL MONEY RACE",
        description: "Ação, Corrida e Tiro Espacial.",
        icon: Rocket,
        color: "orange",
        games: [
            { id: "shooting", title: "SHOOTING", description: "Ganhe Pontos no Ranking Atirando.", path: "/minigames/shooting", icon: Target },
            { id: "jumping", title: "JUMPING", description: "Ganhe Pontos no Ranking PULANDO.", path: "/minigames/jumping", icon: Flag }
        ]
    },
    {
        id: "battle",
        title: "ROYAL MONEY BATTLE",
        description: "Jogos de Tabuleiro, Cartas e Estratégia.",
        icon: Swords,
        color: "blue",
        games: [
            {
                id: "damas", title: "DAMAS", description: "Clássico estratégico de tabuleiro", path: "/radar/damas", icon: Crown,
                theme: {
                    bg: "bg-zinc-900/60", hoverBg: "hover:bg-zinc-800/60", border: "border-orange-500/40", hoverBorder: "hover:border-orange-500",
                    glow: "bg-orange-500", iconBg: "bg-zinc-800 border-zinc-700 group-hover:bg-orange-500 text-orange-500 group-hover:text-black", titleText: "group-hover:text-orange-400", playBtn: "bg-orange-600 text-white hover:bg-orange-500 border-orange-400"
                }
            },
            {
                id: "xadrez", title: "XADREZ", description: "Lute pelo rei no tabuleiro", path: "/radar/xadrez", icon: Crown,
                theme: {
                    bg: "bg-indigo-950/60", hoverBg: "hover:bg-indigo-900/60", border: "border-purple-500/40", hoverBorder: "hover:border-purple-500",
                    glow: "bg-purple-500", iconBg: "bg-indigo-900 border-indigo-800 group-hover:bg-purple-500 text-purple-400 group-hover:text-white", titleText: "group-hover:text-purple-400", playBtn: "bg-purple-600 text-white hover:bg-purple-500 border-purple-400"
                }
            },
            {
                id: "domino", title: "DOMINÓ", description: "Descarte primeiro e vença", path: "/radar/domino", icon: Puzzle,
                theme: {
                    bg: "bg-green-900/40", hoverBg: "hover:bg-green-800/40", border: "border-green-500/60", hoverBorder: "hover:border-green-400",
                    glow: "bg-green-500", iconBg: "bg-green-500 border-green-300 group-hover:bg-green-400 text-black", titleText: "group-hover:text-green-400", playBtn: "bg-green-600 text-white hover:bg-green-500 border-green-400"
                }
            },
            {
                id: "batalhanaval", title: "BATALHA NAVAL", description: "Destrua a frota inimiga", path: "/radar/batalhanaval", icon: Ship,
                theme: {
                    bg: "bg-cyan-900/40", hoverBg: "hover:bg-cyan-800/40", border: "border-cyan-500/60", hoverBorder: "hover:border-cyan-400",
                    glow: "bg-cyan-500", iconBg: "bg-cyan-500 border-cyan-300 group-hover:bg-cyan-400 text-black", titleText: "group-hover:text-cyan-400", playBtn: "bg-cyan-600 text-white hover:bg-cyan-500 border-cyan-400"
                }
            },
            {
                id: "uno", title: "UNO", description: "Cartas, cores e reviravoltas", path: "/radar/uno", icon: Puzzle,
                theme: {
                    bg: "bg-yellow-900/40", hoverBg: "hover:bg-yellow-800/40", border: "border-yellow-500/60", hoverBorder: "hover:border-yellow-400",
                    glow: "bg-yellow-500", iconBg: "bg-yellow-500 border-yellow-300 group-hover:bg-yellow-400 text-black", titleText: "group-hover:text-yellow-400", playBtn: "bg-yellow-600 text-black hover:bg-yellow-500 border-yellow-400"
                }
            },
            {
                id: "cacheta", title: "CACHETA", description: "Cartas e muita inteligência", path: "/radar/cacheta", icon: Puzzle,
                theme: {
                    bg: "bg-pink-900/40", hoverBg: "hover:bg-pink-800/40", border: "border-pink-500/60", hoverBorder: "hover:border-pink-400",
                    glow: "bg-pink-500", iconBg: "bg-pink-500 border-pink-300 group-hover:bg-pink-400 text-black", titleText: "group-hover:text-pink-400", playBtn: "bg-pink-600 text-white hover:bg-pink-500 border-pink-400"
                }
            }
        ]
    }
];

export default function MiniGames() {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, loading: authLoading } = useAuth();
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [raceData, setRaceData] = useState({ races: 0, score: 0 });
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [pageConfigs, setPageConfigs] = useState<any>({
        race: { rankingPrize: "300,00", resultDate: "Carregando..." },
        battle: { mainSubtitle: "ESTRATÉGIA" },
        hide_race: false,
        hide_battle: false
    });
    const [dbGames, setDbGames] = useState<any[]>([]);
    const isSettingsLoaded = useRef(false);

    const [packages, setPackages] = useState<any[]>([
        { id: 'b1', name: 'Único', category: 'battle', amount: 1, price: 5, badge: '' },
        { id: 'b2', name: 'Veterano', category: 'battle', amount: 5, price: 20, badge: 'Pop' },
        { id: 'b3', name: 'Elite', category: 'battle', amount: 15, price: 50, badge: 'PRO' },
        { id: 'r1', name: 'Única', category: 'race', amount: 1, price: 5, badge: '' },
        { id: 'r2', name: 'Frequente', category: 'race', amount: 5, price: 20, badge: 'Pop' },
        { id: 'r3', name: 'Elite', category: 'race', amount: 15, price: 50, badge: 'Elite' }
    ]);

    const handleBattleJoin = async (game: any) => {
        if (!user || !profile || (profile.passes_available || 0) <= 0) {
            toast.error("Bilhete necessário! Adquira passes abaixo.");
            return;
        }

        toast.loading("Descontando Bilhete...");
        try {
            // 1. Desconta bilhete
            const { error: discountErr } = await supabase
                .from('profiles')
                .update({ passes_available: (profile.passes_available || 1) - 1 })
                .eq('user_id', user.id);

            if (discountErr) throw discountErr;

            // 2. RPC Join Tournament
            const { data: tId, error: joinErr } = await supabase
                .rpc('join_tournament', {
                    p_game_id: game.id,
                    p_user_id: user.id,
                    p_nickname: profile.nickname,
                    p_avatar_url: profile.avatar_url
                });

            if (joinErr) throw joinErr;

            toast.dismiss();
            toast.success("-1 Passe de Batalha!");
            navigate(`/radar/${game.id}?tournament_id=${tId}`);
        } catch (err) {
            toast.dismiss();
            console.error("Erro ao iniciar batalha:", err);
            toast.error("Ocorreu um erro ao entrar no radar.");
        }
    }

    useEffect(() => {
        const init = async () => {
            if (!isSettingsLoaded.current) {
                await Promise.all([loadPageSettings(), loadPackages()]);
                isSettingsLoaded.current = true;
                setIsLoadingSettings(false);
            }
        };

        init();

        if (activeCategory === "race" || activeCategory === "battle") {
            loadRaceData();
            loadLeaderboard();
        }
    }, [activeCategory, user?.id]);

    const loadPackages = async () => {
        try {
            const { data } = await supabase.from('minigame_packages').select('*').order('price', { ascending: true });
            if (data && data.length > 0) {
                setPackages(data);
            }
        } catch (error) {
            console.error("Error loading packages:", error);
        }
    };

    const loadPageSettings = async () => {
        try {
            const { data } = await supabase.from('app_settings').select('*').in('key', ['race_page_config', 'battle_page_config', 'hide_race', 'hide_battle']);
            if (data) {
                const safeParse = (val: any, fallback: any) => {
                    if (!val) return fallback;
                    if (typeof val === 'object') return val;
                    try {
                        return typeof val === 'string' ? JSON.parse(val) : val;
                    } catch (e) {
                        console.error("Error parsing settings key:", e);
                        return fallback;
                    }
                };

                const raceConfig = data.find(s => s.key === 'race_page_config');
                const battleConfig = data.find(s => s.key === 'battle_page_config');

                setPageConfigs({
                    race: safeParse(raceConfig?.value, { rankingPrize: "300,00" }),
                    battle: safeParse(battleConfig?.value, {}),
                    hide_race: data.find(s => s.key === 'hide_race')?.value === 'true',
                    hide_battle: data.find(s => s.key === 'hide_battle')?.value === 'true'
                });

                const { data: gamesData } = await supabase.from('minigame_configs').select('*');
                if (gamesData) setDbGames(gamesData);
            }
        } catch (error) {
            console.error("Error loading page settings:", error);
        }
    };

    const loadRaceData = async () => {
        if (!user || !profile) return;
        setRaceData({ races: profile.passes_available || 0, score: 0 });
    };

    const loadLeaderboard = async () => {
        const type = activeCategory === 'battle' ? 'battle_score' : 'race_score';
        const { data } = await supabase.from("transactions")
            .select("amount, user_id, profiles!inner(nickname, avatar_url)")
            .eq("type", type)
            .order("amount", { ascending: false })
            .limit(20);

        if (data && data.length > 0) {
            const uniqueUsers = new Map();
            data.forEach(item => {
                if (!uniqueUsers.has(item.user_id)) {
                    uniqueUsers.set(item.user_id, {
                        score: item.amount,
                        nickname: item.profiles?.nickname || 'Piloto',
                        avatar_url: item.profiles?.avatar_url
                    });
                }
            });
            setLeaderboard(Array.from(uniqueUsers.values()).slice(0, 10));
        } else {
            setLeaderboard([]);
        }
    };

    const handleBuyRaces = async (amount: number, price: number, packageName: string) => {
        if (!user || !profile) return toast.error("Faça login para comprar.");

        toast.loading("Adquirindo pacote...");
        try {
            // Busca dados mais recentes para evitar erros de acumulação
            const { data: latest, error: fetchError } = await supabase.from("profiles")
                .select("saldo, passes_available")
                .eq("user_id", user.id)
                .single();

            if (fetchError || !latest) throw new Error("Erro ao buscar perfil atualizado");
            if (latest.saldo < price) {
                toast.dismiss();
                return toast.error("Saldo insuficiente!");
            }

            const newBalance = latest.saldo - price;
            const newPasses = (latest.passes_available || 0) + amount;

            const { error: balanceError } = await supabase.from("profiles")
                .update({ saldo: newBalance, passes_available: newPasses })
                .eq("user_id", user.id);

            if (balanceError) throw balanceError;

            const purchaseType = activeCategory === 'battle' ? 'battle_purchase' : 'race_purchase';
            await supabase.from('transactions').insert({
                user_id: user.id,
                type: purchaseType,
                amount: price,
                status: 'approved'
            });

            await refreshProfile(); // Atualiza o contexto global
            toast.dismiss();
            toast.success(`Você adquiriu ${amount} ${activeCategory === 'battle' ? 'Batalhas' : 'Corridas'} (${packageName})!`);
        } catch (e) {
            toast.dismiss();
            toast.error("Erro na transação!");
        }
    };

    const handleCategoryClick = (categoryId: string) => {
        if (categoryId === "competicao") {
            navigate("/tournaments");
            return;
        }
        setActiveCategory(categoryId);
    };

    const handlePlayGame = (game: any) => {
        if (!user) return toast.error("Faça login para jogar.");
        if ((profile?.passes_available || 0) <= 0) {
            toast.error(`Você não tem ${activeCategory === 'battle' ? 'Batalhas' : 'Corridas'} disponíveis! Adquira mais no final da página.`);
            return;
        }
        navigate(game.path);
    };


    const getIcon = (name: string) => {
        switch (name) {
            case 'Rocket': return Rocket;
            case 'Zap': return Zap;
            case 'Trophy': return Trophy;
            case 'Swords': return Swords;
            case 'Target': return Target;
            case 'Flag': return Flag;
            case 'Crown': return Crown;
            case 'Puzzle': return Puzzle;
            case 'Ship': return Ship;
            default: return (activeCategory === 'battle' ? Swords : Rocket);
        }
    };

    const handleBack = () => {
        setActiveCategory(null);
    };

    const categoryData = CATEGORIES.find(c => c.id === activeCategory);

    if (authLoading || isLoadingSettings) {
        return <div className="flex min-h-screen items-center justify-center bg-black text-orange-500"><Loader2 className="animate-spin h-10 w-10" /></div>;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 pb-24 relative overflow-hidden">
            {/* Efeitos de Fundo */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-orange-600/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
                <header className="mb-12 flex flex-col items-center justify-center text-center">
                    {activeCategory ? (
                        <div className="w-full flex justify-start mb-6">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                className="text-gray-400 hover:text-white hover:bg-white/5 uppercase font-black text-[10px] tracking-widest h-10 px-4 rounded-xl border border-white/5"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-neon-orange/10 border border-neon-orange/20 rounded-[2rem] shadow-[0_0_30px_rgba(249,115,22,0.15)] relative overflow-hidden group transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]">
                                <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Gamepad2 className="h-10 w-10 text-neon-orange relative z-10" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white drop-shadow-lg mb-2">MODO DE JOGO</h1>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em] max-w-[250px] mx-auto leading-relaxed">
                                    Escolha sua categoria e conquiste os Rankings
                                </p>
                            </div>
                        </div>
                    )}
                </header>

                {/* VISÃO DE CATEGORIAS (LOBBY PRINCIPAL) */}
                {!activeCategory && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md mx-auto">
                        {CATEGORIES.filter(cat => {
                            if (cat.id === 'race' && pageConfigs.hide_race) return false;
                            if (cat.id === 'battle' && pageConfigs.hide_battle) return false;
                            return true;
                        }).map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`w-full flex flex-col items-center justify-center text-center bg-[#0c0c0c] border-2 rounded-[2rem] p-8 relative overflow-hidden group transition-all duration-300 transform hover:scale-[1.03] hover:-translate-y-2 
                                ${cat.color === 'orange' ? 'border-orange-500/40 hover:border-orange-500 shadow-orange-500/10' :
                                        cat.color === 'blue' ? 'border-blue-500/40 hover:border-blue-500 shadow-blue-500/10' :
                                            cat.color === 'yellow' ? 'border-yellow-400/40 hover:border-yellow-400 shadow-yellow-400/10' :
                                                'border-red-500/40 hover:border-red-500 shadow-red-500/10'} hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)]`}
                            >
                                {/* Background Effects */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
                                <div className={`absolute inset-0 bg-gradient-to-t 
                                ${cat.color === 'orange' ? 'from-orange-600/20 to-transparent' :
                                        cat.color === 'blue' ? 'from-blue-600/20 to-transparent' :
                                            cat.color === 'yellow' ? 'from-yellow-400/20 to-transparent' :
                                                'from-red-600/20 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                <div className={`absolute -top-10 -right-10 w-40 h-40 blur-[50px] rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-500 
                                ${cat.color === 'orange' ? 'bg-orange-500' :
                                        cat.color === 'blue' ? 'bg-blue-500' :
                                            cat.color === 'yellow' ? 'bg-yellow-400' :
                                                'bg-red-500'}`}></div>

                                {/* Content */}
                                <div className={`p-5 rounded-full mb-4 relative z-10 transition-all duration-500 transform group-hover:rotate-12 group-hover:scale-110 shadow-lg 
                                ${cat.color === 'orange' ? 'bg-orange-500 shadow-orange-500/30' :
                                        cat.color === 'blue' ? 'bg-blue-500 shadow-blue-500/30' :
                                            cat.color === 'yellow' ? 'bg-yellow-400 shadow-yellow-400/30' :
                                                'bg-red-500 shadow-red-500/30'}`}>
                                    <cat.icon className="h-12 w-12 text-black drop-shadow-md" />
                                </div>
                                <div className="relative z-10 w-full">
                                    <h2 className={`text-3xl font-black uppercase italic tracking-tighter mb-2 
                                    ${cat.color === 'orange' ? 'text-orange-500 group-hover:text-orange-400' :
                                            cat.color === 'blue' ? 'text-blue-500 group-hover:text-blue-400' :
                                                cat.color === 'yellow' ? 'text-yellow-400 group-hover:text-yellow-300' :
                                                    'text-red-500 group-hover:text-red-400'} drop-shadow-md transition-colors`}>
                                        {pageConfigs?.[cat.id]?.mainTitle || cat.title}
                                    </h2>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest max-w-[250px] mx-auto leading-snug group-hover:text-gray-300 transition-colors">
                                        {cat.description}
                                    </p>
                                </div>

                                <div className={`mt-6 inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] relative z-10 transition-all 
                                ${cat.color === 'orange' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/30 group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500' :
                                        cat.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500' :
                                            cat.color === 'yellow' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 group-hover:bg-yellow-400 group-hover:text-black group-hover:border-yellow-400' :
                                                'bg-red-500/10 text-red-500 border border-red-500/30 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500'}`}>
                                    Acessar Lobby <ChevronLeft className="w-3 h-3 rotate-180" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* VISÃO DE JOGOS (SUBCATEGORIA) */}
                {activeCategory && categoryData && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="text-center mb-10">
                            <categoryData.icon className={`h-16 w-16 mx-auto mb-4 ${categoryData.color === 'orange' ? 'text-orange-500' : (categoryData.color === 'blue' ? 'text-blue-500' : 'text-red-500')} animate-pulse drop-shadow-[0_0_15px_rgba(255,68,0,0.3)]`} />
                            {pageConfigs?.[categoryData.id]?.mainSubtitle && (
                                <div className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 ${categoryData.color === 'orange' ? 'bg-orange-600 text-white' : (categoryData.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white')}`}>
                                    {pageConfigs?.[categoryData.id]?.mainSubtitle}
                                </div>
                            )}
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
                                {pageConfigs?.[categoryData.id]?.mainTitle || categoryData.title}
                            </h1>
                            {pageConfigs?.[categoryData.id]?.mainDescText && (
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2 max-w-xl mx-auto leading-relaxed">
                                    {pageConfigs?.[categoryData.id]?.mainDescText}
                                </p>
                            )}
                        </div>

                        {/* BANNER PROMOCIONAL DO RECORDE & BOTÕES DOS JOGOS */}
                        <div className="flex flex-col items-center mb-10">
                            {categoryData.id === 'race' && (
                                <div className="flex flex-col items-center justify-center mb-8 relative w-full">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-yellow-500/20 blur-[100px] rounded-[100%] pointer-events-none -z-10"></div>
                                    <span className="text-sm md:text-lg font-bold text-white/90 tracking-[0.4em] uppercase mb-1 drop-shadow-md">
                                        PRÊMIO
                                    </span>
                                    <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-700 drop-shadow-[0_0_40px_rgba(234,179,8,0.8)] pb-2 select-none">
                                        R$ {pageConfigs?.race?.rankingPrize || '300,00'}
                                    </div>
                                </div>
                            )}

                            {categoryData.id === 'battle' && pageConfigs.battle?.rankingPrize &&
                                (pageConfigs.battle.rankingPrize !== "0" && pageConfigs.battle.rankingPrize !== "" && pageConfigs.battle.rankingPrize !== "0,00") && (
                                    <div className="mb-10 w-full max-w-xl bg-orange-600/20 border border-orange-500/40 rounded-2xl p-6 text-center animate-pulse mx-auto shadow-[0_0_30px_rgba(234,88,12,0.2)]">
                                        <p className="text-orange-500 font-black uppercase italic tracking-[0.25em] text-sm md:text-base">
                                            {pageConfigs?.battle?.bannerText || '🏆 PRÊMIO PAGO NO PIX! 🏆'} R$ {pageConfigs?.battle?.rankingPrize || '0,00'}
                                        </p>
                                    </div>
                                )}

                            {categoryData.id === 'race' && (
                                <div className="w-full max-w-2xl bg-gradient-to-r from-orange-600/10 via-orange-500/5 to-orange-600/10 border border-orange-500/30 rounded-3xl p-6 text-center shadow-[0_0_30px_rgba(234,88,12,0.15)] relative overflow-hidden group mb-10">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                    <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-45deg] group-hover:left-[200%] transition-all duration-1000"></div>
                                    <Trophy className="mx-auto h-8 w-8 text-yellow-500 mb-2 drop-shadow-[0_0_10px_rgba(234,179,8,1)] animate-pulse" />
                                    <h3 className="text-xl md:text-2xl font-black text-white italic uppercase drop-shadow-md tracking-wider">
                                        TORNE-SE O LÍDER SUPREMO
                                    </h3>
                                    <p className="text-xs md:text-sm font-bold text-orange-400 uppercase tracking-widest mt-2">
                                        Consiga o Recorde Máximo na corrida que desejar e conquiste o <span className="text-yellow-500 font-black">Prêmio do Melhor Ranking!</span>
                                    </p>
                                </div>
                            )}

                            <div className={`grid gap-4 w-full max-w-4xl mx-auto ${categoryData.id === 'battle' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                {categoryData.games.map((gameData: any) => {
                                    const dbGame = (dbGames || []).find(g => g.id === gameData.id);
                                    const game = {
                                        ...gameData,
                                        title: dbGame?.title || gameData.title,
                                        description: dbGame?.description || gameData.description,
                                        entry_fee: dbGame?.entry_fee || 10,
                                        prize_amount: dbGame?.prize_amount || 18
                                    };

                                    return (
                                        <button
                                            key={game.id}
                                            onClick={() => {
                                                if (categoryData.id === 'battle') handleBattleJoin(game);
                                                else navigate(game.path);
                                            }}
                                            className={`text-left border-2 transition-all duration-300 transform shadow-lg group relative overflow-hidden bg-[#0a0505] 
                                        ${categoryData.id === 'battle'
                                                    ? `rounded-2xl p-4 flex items-center gap-4 hover:-translate-y-1 hover:scale-[1.01] ${game.theme.bg} ${game.theme.border} ${game.theme.hoverBorder} ${game.theme.hoverBg}`
                                                    : `rounded-[2rem] p-6 hover:-translate-y-2 hover:scale-[1.02] ${categoryData.color === 'orange' ? 'border-orange-500/60 hover:border-orange-400 bg-gradient-to-br from-orange-900/40 to-[#140800] hover:from-orange-600/40 hover:to-[#220d00]' : 'border-red-500/60 hover:border-red-400 bg-gradient-to-br from-red-900/40 to-[#140000] hover:from-red-600/40 hover:to-[#220000]'}`}`}
                                        >
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay transition-opacity group-hover:opacity-50"></div>
                                            <div className={`absolute inset-0 bg-gradient-to-b from-transparent ${categoryData.id === 'battle' ? '' : (categoryData.color === 'orange' ? 'to-orange-500/20' : 'to-red-500/20')} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>
                                            <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[50px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-500 ${categoryData.id === 'battle' ? game.theme.glow : (categoryData.color === 'orange' ? 'bg-orange-500' : 'bg-red-500')}`}></div>

                                            {categoryData.id === 'battle' ? (
                                                // BATTLE LIST LAYOUT (Menor e em linha)
                                                <div className="relative z-10 flex w-full items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-2xl shadow-md transition-all duration-300 transform group-hover:scale-110 ${game.theme.iconBg}`}>
                                                            <game.icon className="h-6 w-6 md:h-8 md:w-8 drop-shadow-md" />
                                                        </div>
                                                        <div>
                                                            <h3 className={`text-lg md:text-xl font-black uppercase tracking-tighter text-white drop-shadow-md transition-colors ${game.theme.titleText}`}>
                                                                {game.title}
                                                            </h3>
                                                            <p className="text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-widest leading-none drop-shadow-md group-hover:text-gray-200 mt-1">
                                                                {game.description}
                                                            </p>
                                                            <div className="mt-2 flex flex-col gap-1.5">
                                                                <span className="text-xs md:text-sm font-black text-white/40 uppercase tracking-widest leading-none">Entrada: <span className="text-white/80 font-black italic">R$ {game.entry_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 border border-orange-300 shadow-[0_0_20px_rgba(234,88,12,0.3)] w-fit transition-transform group-hover:scale-105">
                                                                    <Trophy className="h-4 w-4 text-black drop-shadow-sm" />
                                                                    <span className="text-xs md:text-base font-black uppercase tracking-tighter text-black">Prêmio: R$ {game.prize_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-sm ${game.theme.playBtn}`}>
                                                        <Play className="h-3 w-3 fill-current hidden sm:block" /> BATALHAR
                                                    </div>
                                                </div>
                                            ) : (
                                                // RACE CARD LAYOUT (Grande e centralizado)
                                                <div className="relative z-10 flex flex-col items-center text-center w-full">
                                                    <div className={`p-5 rounded-full mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 transform group-hover:rotate-12 group-hover:scale-110 ${categoryData.color === 'orange' ? 'bg-orange-500 border-2 border-orange-300 text-black group-hover:bg-yellow-400 group-hover:border-yellow-200 group-hover:shadow-[0_0_40px_rgba(250,204,21,1)]' : 'bg-red-500 border-2 border-red-300 text-black group-hover:bg-rose-500 group-hover:border-rose-300 group-hover:shadow-[0_0_40px_rgba(244,63,94,1)]'}`}>
                                                        <game.icon className="h-10 w-10 md:h-12 md:w-12 drop-shadow-md" />
                                                    </div>
                                                    <h3 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter text-white drop-shadow-lg mb-2 transition-colors ${categoryData.color === 'orange' ? 'group-hover:text-yellow-400' : 'group-hover:text-rose-400'}`}>
                                                        {game.title}
                                                    </h3>
                                                    <p className="text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed drop-shadow-md group-hover:text-gray-200">
                                                        {game.description}
                                                    </p>

                                                    <div className={`mt-8 w-full py-3.5 rounded-xl text-[12px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg ${categoryData.color === 'orange' ? 'bg-orange-500 text-black hover:bg-yellow-400 border border-orange-300 hover:border-yellow-200 hover:shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'bg-red-600 text-white hover:bg-rose-500 border border-red-400 hover:border-rose-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.8)]'}`}>
                                                        <Play className="h-4 w-4 fill-current" /> INICIAR CORRIDA
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}

                            </div>
                        </div>
                        {/* NOVO SISTEMA DE CORRIDAS/BATALHAS */}
                        {(categoryData.id === "race" || categoryData.id === "battle") && (
                            <div className="mt-16 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {/* PLACAR DO USUÁRIO */}
                                <div className="flex justify-center px-4">
                                    <div className={`flex items-center gap-6 bg-[#080808] border px-8 py-4 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.1)] relative overflow-hidden ${categoryData.id === 'battle' ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-orange-500/30'}`}>
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05]"></div>
                                        <div className={`absolute top-0 left-0 w-1/4 h-full bg-gradient-to-r to-transparent ${categoryData.id === 'battle' ? 'from-red-500/10' : 'from-orange-500/10'}`}></div>
                                        {categoryData.id === 'battle' ? (
                                            <Swords className="h-6 w-6 text-red-500 relative z-10" />
                                        ) : (
                                            <Flag className="h-6 w-6 text-orange-500 relative z-10" />
                                        )}
                                        <div className="relative z-10 flex flex-col justify-center">
                                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-gray-500 leading-none mb-1">Passes Disponíveis</p>
                                            <p className="text-2xl font-black italic text-white drop-shadow-md leading-none"><span className={categoryData.id === 'battle' ? 'text-red-500' : 'text-orange-500'}>{profile?.passes_available || 0}</span> {categoryData.id === 'battle' ? 'Batalhas' : 'Corridas'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* LOJA DE BILHETES (CAIXAS BRILHANTES) */}
                                <div className="space-y-8 mt-16 px-2">
                                    <div className="text-center flex flex-col items-center">
                                        <Badge className={`px-6 py-1.5 text-[10px] tracking-[0.3em] mb-4 font-black rounded-full border ${categoryData.id === 'battle' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                            LOJA DE BILHETES
                                        </Badge>
                                        <h2 className={`text-3xl md:text-5xl font-black text-white italic uppercase drop-shadow-[0_0_20px_rgba(234,88,12,0.3)]`}>
                                            Adquirir {categoryData.id === 'battle' ? 'Batalha' : 'Corrida'}
                                        </h2>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2 max-w-sm mx-auto">
                                            {categoryData.id === 'battle' ? 'Prepare seu exército e domine o ranking global' : 'Abasteça seu motor e suba no ranking global'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-4xl mx-auto pt-2 px-2">
                                        {(packages || []).filter(p => p.category === categoryData.id).map((pkg, i) => {
                                            const pkgColors = i === 0 ? 'from-blue-600 to-blue-900 border-blue-400' :
                                                i === 1 ? 'from-orange-500 to-orange-800 border-orange-300' :
                                                    'from-purple-600 to-purple-900 border-purple-400';

                                            const Icon = getIcon(pkg.icon_name || (i === 0 ? (categoryData.id === 'battle' ? 'Swords' : 'Rocket') : i === 1 ? (categoryData.id === 'battle' ? 'Trophy' : 'Target') : 'Zap'));
                                            return (
                                                <Card key={pkg.id} onClick={() => handleBuyRaces(pkg.amount, pkg.price, pkg.name)} className={`group relative p-3 md:p-5 rounded-[2rem] border-2 bg-gradient-to-br ${pkgColors} transition-all cursor-pointer flex flex-col items-center justify-between hover:-translate-y-1 hover:brightness-110 shadow-xl overflow-hidden min-h-[160px] md:min-h-[200px]`}>
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>

                                                    {pkg.badge && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-3 py-0.5 rounded-b-lg text-[8px] font-black uppercase tracking-wider z-20 shadow-md">
                                                            {pkg.badge}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col items-center w-full relative z-10 mt-3 md:mt-2">
                                                        <Icon className="h-6 w-6 md:h-8 md:w-8 text-white/90 mb-1.5 md:mb-2 drop-shadow-md group-hover:scale-110 transition-transform" />
                                                        <h4 className="text-[10px] md:text-sm font-black uppercase tracking-wider text-white mb-0.5 leading-none text-center drop-shadow-sm">{pkg.name}</h4>
                                                        <p className="text-[7px] md:text-[9px] text-white/70 font-bold uppercase tracking-widest text-center leading-tight mb-2 md:mb-3">{pkg.amount} ENTRADAS</p>
                                                    </div>

                                                    <div className="relative z-10 flex flex-col items-center gap-0.5 mb-2 md:mb-3">
                                                        <span className="text-3xl md:text-5xl font-black italic text-white drop-shadow-lg leading-none">{pkg.amount}</span>
                                                        <span className="text-[7px] md:text-[9px] uppercase font-black text-white/90 italic drop-shadow-sm text-center">PASSE DE ENTRADA</span>
                                                    </div>

                                                    <div className="relative z-10 w-full mt-auto">
                                                        <div className="bg-black/40 backdrop-blur-md text-yellow-400 font-black text-xs md:text-base py-1.5 md:py-2.5 rounded-full border border-white/20 group-hover:bg-black/60 group-hover:border-yellow-400/50 transition-all shadow-inner flex flex-col items-center mx-1 shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                                                            <span className="text-[6px] md:text-[8px] text-white/70 leading-none mb-0.5 uppercase tracking-widest font-bold">Por apenas</span>
                                                            <span className="drop-shadow-md">R$ {Number(pkg.price).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* RANKING GLOBAL DO RACE/BATTLE */}
                                <div className="mt-20 pt-16 relative">
                                    {/* Divisor Luminoso */}
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent to-transparent ${categoryData.id === 'battle' ? 'via-red-500/50' : 'via-orange-500/50'}`}></div>
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[100px] blur-[80px] pointer-events-none ${categoryData.id === 'battle' ? 'bg-red-600/10' : 'bg-orange-600/10'}`}></div>

                                    <div className="text-center mb-10 relative z-10 flex flex-col items-center px-4">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-yellow-500/20 blur-[40px] rounded-full animate-pulse"></div>
                                            <Trophy className="relative h-20 w-20 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)] animate-[bounce_3s_ease-in-out_infinite]" />
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase drop-shadow-md tracking-tighter">
                                            {categoryData.id === 'battle' ? 'Hall da Fama - Gladiadores' : 'Ranking Global - Pilotos'}
                                        </h2>
                                        <Badge variant="outline" className={`mt-4 border-yellow-500/30 text-yellow-500 text-[10px] uppercase font-black tracking-widest bg-yellow-500/5`}>
                                            {categoryData.id === 'battle' ? 'Campeões Eternizados' : 'High Scores Globais'}
                                        </Badge>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest max-w-[450px] mx-auto mt-4 leading-relaxed">
                                            {categoryData.id === 'battle' ? 'Galeria suprema onde ficam gravados por ordem de conquista todos os campeões dos torneios de batalha!' : 'Sua maior pontuação absoluta entre todas as corridas registradas define sua posição no topo!'}
                                        </p>
                                    </div>

                                    <div className="bg-[#050505] rounded-[3rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 max-w-4xl mx-auto mb-10">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

                                        {/* CABEÇALHO TABELA */}
                                        {categoryData.id !== 'battle' && (
                                            <div className="grid grid-cols-12 gap-2 md:gap-4 p-5 md:p-6 bg-gradient-to-r from-orange-600/10 via-black to-orange-600/10 border-b border-orange-500/20 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-orange-500">
                                                <div className="col-span-2 text-center">Pos</div>
                                                <div className="col-span-6 md:col-span-6">Piloto Oficial</div>
                                                <div className="col-span-4 md:col-span-4 text-right pr-2 md:pr-6">Recorde</div>
                                            </div>
                                        )}

                                        <div className="p-3 md:p-6 space-y-3 relative z-10 bg-[#0a0a0a]/80 backdrop-blur-sm min-h-[300px]">
                                            {(leaderboard || []).length === 0 ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                                    {categoryData.id === 'battle' ? <Swords className="h-12 w-12 text-white/5 mx-auto mb-4" /> : <Flag className="h-12 w-12 text-white/5 mx-auto mb-4" />}
                                                    <p className="text-sm font-black text-gray-600 uppercase tracking-widest opacity-60">{categoryData.id === 'battle' ? 'Hall da Fama Vazio.' : 'Pista Livre.'}</p>
                                                    <p className="text-[10px] text-gray-700 mt-2 font-bold uppercase w-[200px]">{categoryData.id === 'battle' ? 'Seja o primeiro campeão a ser eternizado aqui.' : 'Seja o primeiro a acelerar e definir o recorde.'}</p>
                                                </div>
                                            ) : (
                                                (leaderboard || []).map((l, i) => (
                                                    <div key={i} className={`grid grid-cols-12 items-center gap-2 md:gap-4 p-3 md:p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.01] ${categoryData.id === 'battle' ? 'bg-[#111] border-white/5 hover:border-red-500/30' : (i === 0 ? 'bg-gradient-to-r from-yellow-500/10 via-[#111] to-transparent border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : i === 1 ? 'bg-gradient-to-r from-gray-400/10 via-[#0c0c0c] to-transparent border-gray-400/30' : i === 2 ? 'bg-gradient-to-r from-amber-700/10 via-[#0a0a0a] to-transparent border-amber-700/30' : 'bg-[#0f0f0f] border-white/5 hover:border-white/10 hover:bg-[#151515]')}`}>
                                                        {categoryData.id !== 'battle' && (
                                                            <div className="col-span-2 flex justify-center">
                                                                {i === 0 ? (
                                                                    <div className="relative">
                                                                        <div className="absolute inset-0 bg-yellow-500/30 blur-md rounded-full"></div>
                                                                        <Trophy className="relative h-8 w-8 md:h-12 md:w-12 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,1)]" />
                                                                    </div>
                                                                ) : (
                                                                    <span className={`text-xl md:text-3xl font-black italic ${i === 1 ? 'text-gray-300 drop-shadow-md' : i === 2 ? 'text-amber-600 drop-shadow-md' : 'text-gray-700'}`}>#{i + 1}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className={`${categoryData.id === 'battle' ? 'col-span-8' : 'col-span-6 md:col-span-6'} flex items-center gap-3 md:gap-4 pl-1 md:pl-3 overflow-hidden`}>
                                                            <div className="flex-shrink-0">
                                                                <div className="relative">
                                                                    <img
                                                                        src={l.avatar_url || '/placeholder.svg'}
                                                                        alt={l.nickname || 'Ganhador'}
                                                                        className={`w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border-2 bg-black/50 ${categoryData.id === 'battle' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : (i === 0 ? 'border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : i === 1 ? 'border-gray-300' : 'border-gray-700')}`}
                                                                    />
                                                                    {categoryData.id === 'battle' && (
                                                                        <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border border-black">
                                                                            <Swords className="h-2 w-2 md:h-3 md:w-3 text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col overflow-hidden w-full">
                                                                <span className={`text-sm md:text-xl font-black uppercase truncate tracking-tighter ${categoryData.id === 'battle' ? 'text-white' : (i === 0 ? 'text-yellow-400' : 'text-gray-300')}`}>{l.nickname || "Ganhador"}</span>
                                                                {categoryData.id === 'battle' ? (
                                                                    <span className="text-[9px] md:text-[11px] font-black text-red-500 uppercase tracking-[0.2em] mt-0.5 italic">Campeão do Torneio</span>
                                                                ) : (
                                                                    i === 0 && <span className="text-[8px] md:text-[10px] font-black text-yellow-600 uppercase tracking-widest mt-0.5">Líder Supremo</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={`${categoryData.id === 'battle' ? 'col-span-4' : 'col-span-4 md:col-span-4'} text-right pr-2 md:pr-6 flex flex-col justify-center`}>
                                                            <p className={`text-xl md:text-4xl font-black italic tabular-nums tracking-tighter leading-none ${categoryData.id === 'battle' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]' : (i === 0 ? 'text-yellow-500' : 'text-orange-500/80')}`}>
                                                                {l.score.toLocaleString()}
                                                            </p>
                                                            <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80 ${categoryData.id === 'battle' ? 'text-red-400' : 'text-gray-500'}`}>{categoryData.id === 'battle' ? 'Vitórias' : 'Pontos'}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>

        </div>
    );
}

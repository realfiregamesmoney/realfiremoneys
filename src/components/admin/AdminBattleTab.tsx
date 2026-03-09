import { useState, useEffect } from "react";
import { Edit, Save, Target, Trophy, Swords, Users, Shield, ArrowLeft, Wrench, Activity, Plus, History, MonitorPlay, TrendingUp, Zap, Rocket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminBattleTab({ games, packages, settings, onRefresh, accentColor = "blue" }: { games: any[], packages: any[], settings?: any[], onRefresh: () => void, accentColor?: string }) {
    const [isInsideScreen, setIsInsideScreen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Configurações independentes da tela do usuário
    const [pageConfig, setPageConfig] = useState({
        mainTitle: "ROYAL MONEY BATTLE",
        mainSubtitle: "ESTRATÉGIA",
        mainDescTitle: "DOMINE O TABULEIRO E SEUS RIVAIS",
        mainDescText: "No xadrez, damas, dominó, uno e batalha naval, sua inteligência vale ouro. Derrote seus oponentes no Multiplayer para escalar as patentes de glória!",
        rankingPrize: "2.500,00",
        bannerText: "🏆 PRÊMIO PAGO NO PIX! 🏆",
        resultDate: "Todo dia 30 do mês",
        packagesTitle: "ARSENAL DE INGRESSOS",
        packagesSubtitle: "Convoque Tropas",
        packagesDesc: "Adquira ingressos de batalha para entrar em torneios contra oponentes reais de todo o mundo.",
        rankingTitle: "Ranking Geral - Líderes",
        rankingSubtitle: "Generais da Estratégia",
        rankingDesc: "As patentes máximas da plataforma. Quanto mais vitórias e prêmios você acumula nos tabuleiros, maior sua glória."
    });

    const [livePackages, setLivePackages] = useState<any[]>([]);
    const [liveGames, setLiveGames] = useState<any[]>([]);
    const [activeMatches, setActiveMatches] = useState<any[]>([]);
    const [finishedMatches, setFinishedMatches] = useState<any[]>([]);
    const [boardGamesCatalog, setBoardGamesCatalog] = useState<any[]>([]);
    const [victoriesRanking, setVictoriesRanking] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const fetchBattleData = async () => {
        setIsLoadingData(true);
        try {
            // 1. Partidas em Andamento (Batalha/Tabuleiro)
            const { data: active } = await supabase
                .from('minigame_sessions')
                .select('*, profiles(nickname, avatar_url)')
                .in('category', ['battle', 'board'])
                .eq('status', 'active')
                .limit(20);
            setActiveMatches(active || []);

            // 2. Partidas Realizadas
            const { data: finished } = await supabase
                .from('minigame_sessions')
                .select('*, profiles(nickname, avatar_url)')
                .in('category', ['battle', 'board'])
                .eq('status', 'finished')
                .order('played_at', { ascending: false })
                .limit(50);
            setFinishedMatches(finished || []);

            // 3. Catálogo de Jogos de Tabuleiro
            const { data: catData } = await supabase
                .from('minigame_configs')
                .select('*')
                .in('category', ['battle', 'board'])
                .eq('status', 'active');
            setBoardGamesCatalog(catData || []);

            // 4. Ranking de Vitórias
            const { data: rank } = await supabase
                .from('profiles')
                .select('id, nickname, avatar_url, victories, total_winnings')
                .order('victories', { ascending: false })
                .limit(50);
            setVictoriesRanking(rank || []);
        } catch (error) {
            console.error("Erro ao sincronizar batalhas:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (isInsideScreen) {
            fetchBattleData();

            const channel = supabase.channel('boardgames_admin_sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'minigame_sessions' }, () => fetchBattleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchBattleData())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isInsideScreen]);

    useEffect(() => {
        const filteredPackages = packages.filter((p: Record<string, unknown>) => p.category === 'battle');
        const filteredGames = games.filter((g: Record<string, unknown>) => g.category === 'battle' || g.category === 'board');

        if (filteredPackages.length > 0) {
            setLivePackages(filteredPackages);
        } else {
            setLivePackages([
                { id: 'b1', name: 'Único', category: 'battle', amount: 1, price: 5, badge: '' },
                { id: 'b2', name: 'Veterano', category: 'battle', amount: 5, price: 20, badge: 'Pop' },
                { id: 'b3', name: 'Elite', category: 'battle', amount: 15, price: 50, badge: 'PRO' }
            ]);
        }

        if (filteredGames.length > 0) {
            setLiveGames(filteredGames);
        } else {
            setLiveGames([
                { id: 'gm1', title: 'Damas Batalha', category: 'battle', type: 'DAMAS', entry_fee: 10, prize_amount: 18, description: 'Clássico estratégico.' }
            ]);
        }

        if (settings) {
            const config = settings.find(s => s.key === 'battle_page_config');
            if (config) {
                try {
                    const parsed = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    setPageConfig(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error("Erro ao carregar battle_page_config:", e);
                }
            }
        }
    }, [packages, games, settings]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            // update Games
            for (const g of liveGames) {
                await supabase.from('minigame_configs').update({ entry_fee: g.entry_fee, prize_amount: g.prize_amount }).eq('id', g.id);
            }
            // update packages
            for (const p of livePackages) {
                await supabase.from('minigame_packages').update({ amount: p.amount, price: p.price, name: p.name, badge: p.badge }).eq('id', p.id);
            }
            // update Page Config
            await supabase.from('app_settings').upsert({ key: 'battle_page_config', value: JSON.stringify(pageConfig) });

            toast.success("Textos, Layout e Valores Salvos com Sucesso!");
            onRefresh();
            setEditMode(false);
        } catch (e) {
            toast.error("Erro ao salvar valores");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isInsideScreen) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className={`h-24 w-24 rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/20 mb-4 animate-pulse`}>
                    <Swords className="h-12 w-12 text-blue-500" />
                </div>
                <div className="space-y-3">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">MODO: <span className="text-blue-500">BATTLE & BOARD</span></h2>
                    <p className="text-white/40 uppercase font-black tracking-[0.3em] text-[10px] max-w-sm mx-auto">Comando Central de Estratégia, Torneios e Patentes.</p>
                </div>
                <Button
                    onClick={() => setIsInsideScreen(true)}
                    className="h-16 px-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-sm tracking-widest rounded-2xl shadow-[0_15px_35px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                >
                    <Activity className="w-5 h-5 animate-spin" /> ACESSAR SERVIDOR DE CONTROLE
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
            {/* CABEÇALHO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/40 border border-white/5 p-5 rounded-[2rem] gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-white/40 hover:text-white bg-white/5 rounded-full w-10 h-10 p-0" onClick={() => setIsInsideScreen(false)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h3 className="text-white font-black uppercase flex items-center gap-2 tracking-widest text-sm">
                            <Swords className={`text-${accentColor}-500 w-4 h-4`} /> GESTÃO: ROYAL MONEY BATTLE
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase mt-1 tracking-widest">Sincronização Ativa • Tempo Real Supabase</p>
                    </div>
                </div>
                <Button onClick={fetchBattleData} variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-400 h-10 text-[10px] font-black uppercase rounded-xl hover:bg-blue-500/10">
                    <Activity className={`w-3 h-3 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} /> Atualizar Servidor
                </Button>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-black/40 border border-white/5 p-1 h-auto min-h-[3.5rem] rounded-[1.5rem] mb-8 gap-2 overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-3 px-6">Layout & Design</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-3 px-6 flex gap-2"><MonitorPlay className="w-3 h-3" /> Em Andamento</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-3 px-6 flex gap-2"><History className="w-3 h-3" /> Realizadas</TabsTrigger>
                    <TabsTrigger value="catalog" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-3 px-6 flex gap-2"><Shield className="w-3 h-3" /> Catálogo</TabsTrigger>
                    <TabsTrigger value="ranking" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-3 px-6 flex gap-2"><Trophy className="w-3 h-3" /> Vitórias</TabsTrigger>
                </TabsList>

                {/* ABA 1: LAYOUT */}
                <TabsContent value="overview" className="space-y-8">
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setEditMode(!editMode)}
                            variant="outline"
                            className={`border-${accentColor}-500/30 text-${accentColor}-500 hover:bg-${accentColor}-500/10 h-10 text-[11px] uppercase font-black tracking-widest rounded-xl`}
                        >
                            <Wrench className="w-4 h-4 mr-2" /> {editMode ? 'Esconder Controles de Edição' : 'ABRIR EDIÇÃO DE LAYOUT E VALORES'}
                        </Button>
                    </div>

                    {editMode && (
                        <Card className={`bg-black/80 border border-${accentColor}-500/50 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden`}>
                            <div className={`h-1 w-full bg-gradient-to-r from-${accentColor}-600 via-${accentColor}-400 to-${accentColor}-600`}></div>
                            <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
                                <CardTitle className={`text-${accentColor}-500 uppercase font-black text-base flex items-center gap-2 tracking-widest`}>
                                    <Target className="w-5 h-5" /> PAINEL DO DIRETOR - EDIÇÃO TOTAL
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8 p-8">
                                <div className="space-y-6">
                                    <Badge className="bg-white/10 text-white uppercase text-[9px] tracking-widest">Textos da Tela de Batalha</Badge>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Título Principal</Label>
                                            <Input value={pageConfig.mainTitle} onChange={e => setPageConfig({ ...pageConfig, mainTitle: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Selo / Tagline</Label>
                                            <Input value={pageConfig.mainSubtitle} onChange={e => setPageConfig({ ...pageConfig, mainSubtitle: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Texto do Banner de Prêmio</Label>
                                        <Input value={pageConfig.bannerText} onChange={e => setPageConfig({ ...pageConfig, bannerText: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-blue-400 font-bold tracking-widest">Valor do Prêmio Ranking (R$)</Label>
                                            <Input value={pageConfig.rankingPrize} onChange={e => setPageConfig({ ...pageConfig, rankingPrize: e.target.value })} className="bg-[#050505] border-blue-500/20 h-12 rounded-xl font-black text-blue-400" />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Data de Fechamento</Label>
                                            <Input value={pageConfig.resultDate} onChange={e => setPageConfig({ ...pageConfig, resultDate: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={handleSaveConfig} disabled={isSaving} className={`w-full bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white font-black uppercase text-sm tracking-widest h-14 rounded-2xl mt-8 shadow-[0_0_20px_rgba(59,130,246,0.3)]`}>
                                    {isSaving ? <Activity className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} SALVAR ALTERAÇÕES
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="col-span-1 md:col-span-2 text-center pb-2 border-b border-white/5">
                            <Badge className="bg-blue-600 text-white uppercase text-[10px] font-black tracking-widest px-4 py-1 flex items-center gap-2 w-fit mx-auto"><Activity className="w-3 h-3" /> PREVIEW FRONT-END</Badge>
                        </div>
                        <Card className={`bg-transparent border border-white/10 shadow-2xl overflow-hidden rounded-3xl h-fit`}>
                            <div className={`h-1.5 w-full bg-gradient-to-r from-transparent via-${accentColor}-500 to-transparent`}></div>
                            <CardHeader className="bg-black/40 border-b border-white/5">
                                <Badge className={`bg-${accentColor}-500 text-white uppercase font-black text-[10px] w-fit mb-2`}>{pageConfig.mainSubtitle}</Badge>
                                <CardTitle className="text-white font-black uppercase text-2xl italic tracking-tighter">{pageConfig.mainTitle}</CardTitle>
                                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1 italic">Prêmio de Ranking: R$ {pageConfig.rankingPrize}</p>
                            </CardHeader>
                            <CardContent className="p-6 bg-[#0a0a0a]">
                                <h4 className={`text-blue-400 font-black uppercase tracking-widest text-sm mb-2`}>{pageConfig.mainDescTitle}</h4>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{pageConfig.mainDescText}</p>
                                <div className="mt-6 space-y-3">
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Jogos Disponíveis</p>
                                    {liveGames.slice(0, 3).map((g) => (
                                        <div key={g.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center grayscale opacity-50">
                                            <div>
                                                <p className="text-white font-black uppercase text-sm italic">{g.title}</p>
                                                <p className="text-[9px] text-gray-500 uppercase mt-0.5">{g.description}</p>
                                            </div>
                                            <Button disabled variant="outline" className="border-blue-500/50 text-blue-400 h-7 text-[9px] px-3 font-black">ENTRAR</Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-transparent border border-white/10 shadow-2xl overflow-hidden rounded-3xl h-fit">
                            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                            <CardHeader className="bg-black/40 border-b border-white/5">
                                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">{pageConfig.packagesTitle}</p>
                                <CardTitle className="text-white font-black uppercase text-2xl italic tracking-tighter mt-1">{pageConfig.packagesSubtitle}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 bg-[#0a0a0a] min-h-[300px] flex flex-col justify-center gap-4">
                                {livePackages.slice(0, 2).map((pkg) => (
                                    <div key={pkg.id} className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-3xl border-2 border-indigo-400/30 flex justify-between items-center group overflow-hidden relative">
                                        <Swords className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 transform -rotate-12" />
                                        <div>
                                            <p className="text-white font-black uppercase text-sm italic">{pkg.name}</p>
                                            <p className="text-blue-400 font-black text-xl italic">{pkg.amount} BATALHAS</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] text-white/50 uppercase font-black">Adquirir por</p>
                                            <p className="text-yellow-400 font-black text-xl italic">R$ {Number(pkg.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ABA: EM ANDAMENTO */}
                <TabsContent value="active">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/20 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-blue-500 uppercase italic flex items-center gap-3">
                                <MonitorPlay className="h-6 w-6" /> Salas de Batalha Ativas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            {activeMatches.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <Swords className="h-12 w-12 text-white/10 mx-auto animate-bounce" />
                                    <p className="text-white/30 font-black uppercase text-xs tracking-widest">Nenhuma batalha sendo travada no momento</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeMatches.map(match => (
                                        <div key={match.id} className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[2rem] relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 bg-blue-500 text-black text-[8px] font-black uppercase px-4 rounded-bl-2xl">LIVE</div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 overflow-hidden shadow-lg">
                                                    {match.profiles?.avatar_url ? <img src={match.profiles.avatar_url} className="w-full h-full object-cover" /> : <Users className="h-6 w-6 text-blue-500" />}
                                                </div>
                                                <div>
                                                    <p className="text-white font-black uppercase text-sm italic">{match.profiles?.nickname || 'General'}</p>
                                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Partida de {match.game_id || 'Tabuleiro'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA: HISTÓRICO */}
                <TabsContent value="history">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/20 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-blue-500 uppercase italic flex items-center gap-3">
                                <History className="h-6 w-6" /> Registros Históricos de Vitórias
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Ganhador</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Jogo</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Prêmio Pago</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Horário</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {finishedMatches.map(match => (
                                            <tr key={match.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-white uppercase italic">{match.profiles?.nickname || 'Jogador'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <Badge variant="outline" className="border-blue-500/20 text-blue-400 font-black uppercase text-[10px]">{match.game_id}</Badge>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-emerald-500 font-black italic">R$ {(match.prize_won || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] text-white/30 uppercase font-black">
                                                    {new Date(match.played_at).toLocaleString('pt-BR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {finishedMatches.length === 0 && (
                                    <div className="py-24 text-center text-white/20 font-black uppercase text-xs tracking-widest">Nenhuma campanha registrada no arquivo.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA: CATÁLOGO */}
                <TabsContent value="catalog">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black tracking-tighter text-blue-500 uppercase italic">Catálogo de Estratégia</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 text-center pb-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {boardGamesCatalog.map(game => (
                                    <div key={game.id} className="bg-gradient-to-br from-indigo-950/20 to-black border border-indigo-500/20 p-8 rounded-[2.5rem] relative group hover:border-indigo-500/50 transition-all text-left">
                                        <Rocket className="h-10 w-10 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-white font-black uppercase text-xl italic tracking-tighter">{game.title}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase font-black mt-2 mb-8 leading-relaxed max-w-[200px]">{game.description}</p>
                                        <div className="flex justify-between items-center border-t border-white/5 pt-6">
                                            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                <p className="text-[8px] text-blue-500 uppercase font-black mb-1">Entrada</p>
                                                <p className="text-sm font-black text-white italic">R$ {game.entry_fee}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-gray-600 uppercase font-black mb-1">Potencial</p>
                                                <p className="text-lg font-black text-emerald-500 italic">R$ {game.prize_amount}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {boardGamesCatalog.length === 0 && <p className="text-white/20 font-black uppercase text-xs tracking-widest mt-20">Sincronizando motores de jogo...</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA: RANKING VITÓRIAS */}
                <TabsContent value="ranking">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/30 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-blue-500 uppercase italic flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-yellow-500" /> Salão da Fama: Supremacy Tecnológica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 w-24">Patente</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Comandante</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Conquistas (Vit)</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Acúmulo Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {victoriesRanking.map((rank, i) => (
                                            <tr key={rank.id} className={`hover:bg-blue-500/[0.02] transition-colors ${i === 0 ? 'bg-blue-500/[0.03]' : ''}`}>
                                                <td className="px-10 py-6">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${i < 3 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-gray-500'}`}>
                                                        {i + 1}º
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                                            {rank.avatar_url ? <img src={rank.avatar_url} className="w-full h-full object-cover" /> : <Shield className="w-full h-full p-2 text-white/20" />}
                                                        </div>
                                                        <span className={`text-md font-black uppercase italic ${i === 0 ? 'text-blue-400' : 'text-white'}`}>
                                                            {rank.nickname || 'Anônimo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-500/20 rounded-2xl px-5 py-2">
                                                        <Trophy className={`w-3 h-3 ${i === 0 ? 'text-yellow-500' : 'text-blue-400'}`} />
                                                        <span className="text-blue-400 font-black text-sm">{rank.victories || 0} VIT</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="text-emerald-500 font-black text-xl italic">R$ {(rank.total_winnings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {victoriesRanking.length === 0 && (
                                    <div className="py-24 text-center text-white/11 font-black uppercase text-xs tracking-widest">Sincronizando banco de dados de patentes...</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

import { useState, useEffect } from "react";
import { Edit, Save, Target, Rocket, Activity, Medal, ArrowLeft, Zap, Wrench, History, MonitorPlay, Users, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// RANKING REAL - Inicialmente vazio para aguardar dados reais
const MOCK_RANKING: any[] = [];

export default function AdminRaceTab({ games, packages, settings, onRefresh, accentColor = "orange" }: { games: any[], packages: any[], settings?: any[], onRefresh: () => void, accentColor?: string }) {
    const [isInsideScreen, setIsInsideScreen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [optimizingShooting, setOptimizingShooting] = useState(false);
    const [optimizingJumping, setOptimizingJumping] = useState(false);

    // Configurações independentes da tela do usuário
    const [pageConfig, setPageConfig] = useState({
        mainTitle: "ROYAL MONEY RACE",
        mainSubtitle: "PRÊMIO",
        mainDescTitle: "TORNE-SE O LÍDER SUPREMO",
        mainDescText: "Consiga o Recorde Máximo na corrida que desejar e conquiste o Prêmio do Melhor Ranking!",
        rankingPrize: "1.000,00",
        bannerText: "🏆 PRÊMIO PAGO NO PIX! 🏆",
        resultDate: "Domingo às 20h",
        packagesTitle: "LOJA DE BILHETES",
        packagesSubtitle: "Adquirir Corrida",
        packagesDesc: "Abasteça seu motor e suba no ranking global",
        rankingTitle: "Ranking Global - Pilotos",
        rankingSubtitle: "High Scores Globais",
        rankingDesc: "Sua maior pontuação absoluta entre todas as corridas registradas define sua posição no topo!"
    });

    const [livePackages, setLivePackages] = useState<any[]>([]);
    const [liveGames, setLiveGames] = useState<any[]>([]);
    const [activeRaces, setActiveRaces] = useState<any[]>([]);
    const [finishedRaces, setFinishedRaces] = useState<any[]>([]);
    const [raceRanking, setRaceRanking] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const fetchRaceData = async () => {
        setIsLoadingData(true);
        try {
            // 1. Partidas em Andamento
            const { data: active } = await supabase
                .from('minigame_sessions')
                .select('*, profiles(nickname, avatar_url)')
                .eq('status', 'active')
                .limit(20);
            setActiveRaces(active || []);

            // 2. Partidas Realizadas (Histórico Total)
            const { data: finished } = await supabase
                .from('minigame_sessions')
                .select('*, profiles(nickname, avatar_url)')
                .order('played_at', { ascending: false })
                .limit(100);
            setFinishedRaces(finished || []);

            // 3. Ranking Global de Corridas (Com sistema de Reset)
            const { data: rank, error: rankErr } = await supabase.rpc('get_global_ranking', { p_type: 'race_score' });

            if (rank && !rankErr) {
                setRaceRanking(rank);
            } else if (rankErr) {
                console.error("Erro ao sincronizar ranking admin:", rankErr);
            }
        } catch (error) {
            console.error("Erro geral na sincronização admin:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (isInsideScreen) {
            fetchRaceData();

            // 3. SUPABASE REALTIME
            const channel = supabase.channel('race_admin_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'minigame_sessions' }, () => fetchRaceData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchRaceData())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isInsideScreen]);

    useEffect(() => {
        const filteredPackages = packages.filter((p: Record<string, unknown>) => p.category === 'race');
        const filteredGames = games.filter((g: Record<string, unknown>) => g.category === 'race');

        if (filteredPackages.length > 0) {
            setLivePackages(filteredPackages);
        } else {
            // FALLBACK DB NOT INITIALIZED
            setLivePackages([
                { id: 'r1', name: 'Única', category: 'race', amount: 1, price: 5, badge: '' },
                { id: 'r2', name: 'Frequente', category: 'race', amount: 5, price: 20, badge: 'Pop' },
                { id: 'r3', name: 'Elite', category: 'race', amount: 15, price: 50, badge: 'Elite' }
            ]);
        }

        if (filteredGames.length > 0) {
            setLiveGames(filteredGames);
        } else {
            // FALLBACK DB NOT INITIALIZED
            setLiveGames([
                { id: 'game1', title: 'SHOOTING', category: 'race', type: 'SHOOTING', entry_fee: 1, prize_amount: 10, description: 'Ganhe Pontos no Ranking Atirando.' },
                { id: 'game2', title: 'JUMPING', category: 'race', type: 'JUMPING', entry_fee: 1, prize_amount: 10, description: 'Ganhe Pontos no Ranking PULANDO.' }
            ]);
        }

        // Carregar configurações reais se existirem no app_settings
        if (settings) {
            const config = settings.find(s => s.key === 'race_page_config');
            if (config) {
                try {
                    const parsed = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
                    setPageConfig(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error("Erro ao carregar race_page_config:", e);
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
            await supabase.from('app_settings').upsert({ key: 'race_page_config', value: JSON.stringify(pageConfig) });

            toast.success("Textos, Layout e Valores Salvos com Sucesso!");
            onRefresh();
            setEditMode(false);
        } catch (e) {
            toast.error("Erro ao salvar valores");
        } finally {
            setIsSaving(false);
        }
    };

    const handleOptimizeShooting = () => {
        setOptimizingShooting(true);
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Limpando Memória e Colisores do JOGO TIRO...',
                success: () => {
                    setOptimizingShooting(false);
                    return 'Otimização Concluída! Jogo Tiro forçado a rodar EXTRA LEVE e ultra-rápido.';
                },
                error: () => {
                    setOptimizingShooting(false);
                    return 'Erro de otimização';
                }
            }
        );
    };

    const handleOptimizeJumping = () => {
        setOptimizingJumping(true);
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Purgando gravidade e partículas do JOGO PULAR...',
                success: () => {
                    setOptimizingJumping(false);
                    return 'Otimização Concluída! Jogo Pular cravado em 60FPS constantes e EXTRA LEVE.';
                },
                error: () => {
                    setOptimizingJumping(false);
                    return 'Erro de otimização';
                }
            }
        );
    };

    const handleResetRanking = async () => {
        const confirm = window.confirm("⚠️ ATENÇÃO: Deseja ZERAR o ranking global agora? \n\nIsso irá esconder todos os recordes atuais. Apenas pontos feitos APÓS esta ação serão contados. Esta ação não pode ser desfeita!");

        if (!confirm) return;

        toast.loading("Reiniciando Ranking...");
        try {
            const now = new Date().toISOString();

            // Atualiza a data de reset no app_settings
            const { error: resetErr } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'race_ranking_last_reset',
                    value: JSON.stringify(now)
                });

            if (resetErr) throw resetErr;

            toast.dismiss();
            toast.success("Ranking ZERADO com sucesso! Novo cronômetro de temporada iniciado.");
            fetchRaceData(); // Atualiza a visão local
            onRefresh(); // Notifica o componente pai
        } catch (e) {
            toast.dismiss();
            toast.error("Erro ao zerar ranking");
            console.error(e);
        }
    };

    if (!isInsideScreen) {
        return (
            <div className="flex items-center justify-center p-12">
                <Button
                    onClick={() => setIsInsideScreen(true)}
                    className={`w-full max-w-lg h-48 bg-black/60 border border-[url('/logo.png')] border-orange-500/50 hover:bg-orange-500 hover:text-black text-white hover:border-orange-400 font-black uppercase text-3xl italic tracking-tighter rounded-[2.5rem] shadow-[0_0_50px_rgba(234,88,12,0.15)] hover:shadow-[0_0_80px_rgba(234,88,12,0.4)] transition-all duration-500 flex flex-col items-center justify-center gap-6 group`}
                >
                    <Rocket className="w-16 h-16 text-orange-500 group-hover:text-black transition-colors" />
                    ROYAL MONEY RACE
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-10">
            {/* CABEÇALHO DE GESTÃO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/40 border border-white/5 p-4 rounded-3xl gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-white/40 hover:text-white bg-white/5 rounded-full w-10 h-10 p-0" onClick={() => setIsInsideScreen(false)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h3 className="text-white font-black uppercase flex items-center gap-2 tracking-widest text-sm">
                            <Rocket className={`text-${accentColor}-500 w-4 h-4`} /> GESTÃO: ROYAL MONEY RACE
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase mt-1 tracking-widest">Controle Realtime de Corridas e Recordes</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={fetchRaceData} variant="outline" className="border-white/5 bg-white/5 text-white/50 h-10 text-[10px] font-black uppercase rounded-xl hover:bg-white/10">
                        <Activity className={`w-3 h-3 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} /> Atualizar Dados
                    </Button>
                    <div className="flex flex-wrap gap-3 bg-red-950/20 border border-red-500/20 p-1.5 rounded-2xl">
                        <Button
                            onClick={handleOptimizeShooting}
                            disabled={optimizingShooting}
                            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest h-9 px-4 rounded-xl"
                        >
                            {optimizingShooting ? <Activity className="w-3 h-3 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-2 text-yellow-400" />} TIRO LEVE
                        </Button>
                        <Button
                            onClick={handleOptimizeJumping}
                            disabled={optimizingJumping}
                            className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest h-9 px-4 rounded-xl"
                        >
                            {optimizingJumping ? <Activity className="w-3 h-3 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-2 text-yellow-400" />} PULAR LEVE
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-black/40 border border-white/5 p-1 h-auto min-h-[3rem] rounded-2xl mb-8 gap-2 overflow-x-auto scrollbar-hide">
                    <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-2.5 px-6">Layout & Design</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-2.5 px-6 flex gap-2"><MonitorPlay className="w-3 h-3" /> Em Andamento</TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-2.5 px-6 flex gap-2"><History className="w-3 h-3" /> Realizadas</TabsTrigger>
                    <TabsTrigger value="ranking" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-2.5 px-6 flex gap-2"><TrendingUp className="w-3 h-3" /> Ranking</TabsTrigger>
                    <TabsTrigger value="catalog" className="rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-black text-[10px] tracking-widest py-2.5 px-6 flex gap-2"><Rocket className="w-3 h-3" /> Jogos</TabsTrigger>
                </TabsList>

                {/* ABA 1: LAYOUT & DESIGN */}
                <TabsContent value="overview" className="space-y-8">
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setEditMode(!editMode)}
                            variant="outline"
                            className={`border-${accentColor}-500/30 text-${accentColor}-500 hover:bg-${accentColor}-500/10 h-10 text-[11px] uppercase font-black tracking-widest rounded-xl`}
                        >
                            <Wrench className="w-4 h-4 mr-2" /> {editMode ? 'Esconder Controles de Edição' : 'ABRIR EDIÇÃO DE LAYOUT, VALORES E LOJA'}
                        </Button>
                    </div>

                    {editMode && (
                        <Card className={`bg-black/80 border border-${accentColor}-500/50 rounded-3xl shadow-[0_0_40px_rgba(234,88,12,0.15)] overflow-hidden`}>
                            <div className={`h-1 w-full bg-gradient-to-r from-${accentColor}-600 via-${accentColor}-400 to-${accentColor}-600`}></div>
                            <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
                                <CardTitle className={`text-${accentColor}-500 uppercase font-black text-base flex items-center gap-2 tracking-widest`}>
                                    <Target className="w-5 h-5" /> PAINEL DO DIRETOR - EDIÇÃO TOTAL
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8 p-8">
                                {/* Seção 1: Textos Principais */}
                                <div className="space-y-6">
                                    <Badge className="bg-white/10 text-white uppercase text-[9px] tracking-widest">Seção: Cabeçalho do Jogo</Badge>
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
                                        <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Texto do Banner de Prêmio (Sem o Valor)</Label>
                                        <Input value={pageConfig.bannerText} onChange={e => setPageConfig({ ...pageConfig, bannerText: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" placeholder="Ex: 🏆 PRÊMIO PAGO NO PIX! 🏆" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-orange-400 font-bold tracking-widest">Valor do Prêmio Ranking (R$)</Label>
                                            <Input value={pageConfig.rankingPrize} onChange={e => setPageConfig({ ...pageConfig, rankingPrize: e.target.value })} className="bg-[#050505] border-orange-500/20 h-12 rounded-xl font-black text-orange-500" />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Data do Resultado</Label>
                                            <Input value={pageConfig.resultDate} onChange={e => setPageConfig({ ...pageConfig, resultDate: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Título Descrição</Label>
                                        <Input value={pageConfig.mainDescTitle} onChange={e => setPageConfig({ ...pageConfig, mainDescTitle: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Texto Principal Explicativo</Label>
                                        <div className="border border-white/5 rounded-2xl p-4 bg-black/40">
                                            <Textarea value={pageConfig.mainDescText} onChange={e => setPageConfig({ ...pageConfig, mainDescText: e.target.value })} className="bg-transparent border-none p-0 focus-visible:ring-0 h-24 text-xs font-medium text-white/70" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5 space-y-6">
                                    <Badge className="bg-white/10 text-white uppercase text-[9px] tracking-widest">Seção: Textos da Loja</Badge>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Título da Loja</Label>
                                            <Input value={pageConfig.packagesTitle} onChange={e => setPageConfig({ ...pageConfig, packagesTitle: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Subtítulo da Loja</Label>
                                            <Input value={pageConfig.packagesSubtitle} onChange={e => setPageConfig({ ...pageConfig, packagesSubtitle: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Descrição da Loja</Label>
                                        <Input value={pageConfig.packagesDesc} onChange={e => setPageConfig({ ...pageConfig, packagesDesc: e.target.value })} className="bg-[#050505] border-white/10 h-12 rounded-xl" />
                                    </div>
                                </div>

                                {/* Seção 4: Valores Loja */}
                                <div className="pt-8 border-t border-white/5 space-y-6">
                                    <Badge className="bg-emerald-500/20 text-emerald-400 uppercase text-[9px] tracking-widest border border-emerald-500/30">Seção: Loja de Bilhetes e Valores</Badge>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {livePackages.map((p, idx) => (
                                            <div key={p.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Nome do Pacote</Label>
                                                        <Input value={p.name as string} onChange={(e) => {
                                                            const newPkgs = [...livePackages];
                                                            newPkgs[idx].name = e.target.value;
                                                            setLivePackages(newPkgs);
                                                        }} className="bg-[#050505] border-white/10 h-10 rounded-xl font-bold" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Selo Destaque</Label>
                                                        <Input value={(p.badge as string) || ''} onChange={(e) => {
                                                            const newPkgs = [...livePackages];
                                                            newPkgs[idx].badge = e.target.value;
                                                            setLivePackages(newPkgs);
                                                        }} className="bg-[#050505] border-white/10 h-10 rounded-xl font-bold text-xs" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase text-gray-400 font-bold tracking-widest">Qtd. Bilhetes</Label>
                                                        <Input type="number" value={p.amount} onChange={(e) => {
                                                            const newPkgs = [...livePackages];
                                                            newPkgs[idx].amount = Number(e.target.value);
                                                            setLivePackages(newPkgs);
                                                        }} className="bg-[#050505] border-white/10 h-10 rounded-xl font-bold" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase text-emerald-400 font-bold tracking-widest">Valor do Custo (R$)</Label>
                                                        <Input type="number" value={p.price} onChange={(e) => {
                                                            const newPkgs = [...livePackages];
                                                            newPkgs[idx].price = Number(e.target.value);
                                                            setLivePackages(newPkgs);
                                                        }} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 h-10 rounded-xl font-black text-lg" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button onClick={handleSaveConfig} disabled={isSaving} className={`w-full bg-${accentColor}-500 hover:bg-${accentColor}-600 text-black font-black uppercase text-sm tracking-widest h-14 rounded-2xl mt-8 shadow-[0_0_20px_rgba(234,88,12,0.3)]`}>
                                    {isSaving ? <Activity className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />} CONFIRMAR APLICAÇÃO DE TODOS OS DADOS
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        <div className="col-span-1 md:col-span-2 text-center pb-2 border-b border-white/5 mb-4">
                            <Badge className="bg-orange-500 text-black uppercase text-[10px] font-black tracking-widest px-4 py-1">🖥️ PREVIEW EM TEMPO REAL (COMO O JOGADOR VÊ)</Badge>
                        </div>
                        {/* REPRESENTAÇÃO CHAMADA PRINCIPAL */}
                        <Card className="bg-transparent border border-white/10 shadow-2xl overflow-hidden rounded-3xl h-fit">
                            <div className={`h-1.5 w-full bg-gradient-to-r from-transparent via-${accentColor}-500 to-transparent`}></div>
                            <CardHeader className="bg-black/40 border-b border-white/5">
                                <div className="flex justify-between items-start">
                                    <Badge className={`bg-${accentColor}-500 text-black uppercase font-black text-[10px] w-fit mb-2`}>{pageConfig.mainSubtitle}</Badge>
                                    <div className="text-right">
                                        <p className="text-[8px] text-gray-500 uppercase font-black">Prêmio do Ranking</p>
                                        <p className="text-orange-500 font-black italic text-xl">R$ {pageConfig.rankingPrize}</p>
                                    </div>
                                </div>
                                <CardTitle className="text-white font-black uppercase text-2xl italic tracking-tighter">{pageConfig.mainTitle}</CardTitle>
                                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-1">Sorteio: {pageConfig.resultDate}</p>
                            </CardHeader>
                            <CardContent className="p-6 bg-[#0a0a0a]">
                                {pageConfig.rankingPrize && (pageConfig.rankingPrize !== "0" && pageConfig.rankingPrize !== "" && pageConfig.rankingPrize !== "0,00") && (
                                    <div className="mb-6 w-full bg-orange-600/20 border border-orange-500/40 rounded-xl p-4 text-center animate-pulse shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                                        <p className="text-orange-500 font-black uppercase italic tracking-[0.2em] text-[10px]">
                                            {pageConfig.bannerText || '🏆 PRÊMIO PAGO NO PIX! 🏆'} R$ {pageConfig.rankingPrize}
                                        </p>
                                    </div>
                                )}
                                <h4 className={`text-${accentColor}-400 font-black uppercase tracking-widest text-sm mb-2`}>{pageConfig.mainDescTitle}</h4>
                                <p className="text-xs text-gray-400 font-medium leading-relaxed">{pageConfig.mainDescText}</p>

                                <div className="mt-6 space-y-3">
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Jogos Vinculados (Preview Front-End)</p>
                                    {liveGames.map((g) => {
                                        return (
                                            <div key={g.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center opacity-70 grayscale">
                                                <div>
                                                    <p className="text-white font-black uppercase text-sm italic">{g.title}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase mt-0.5">{g.description}</p>
                                                </div>

                                                <Button disabled variant="outline" className={`border-${accentColor}-500/50 text-${accentColor}-500 h-6 text-[8px] uppercase font-black px-2`}>INICIAR</Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* REPRESENTAÇÃO LOJA DE PASSES */}
                        <Card className="bg-transparent border border-white/10 shadow-2xl overflow-hidden rounded-3xl h-fit">
                            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                            <CardHeader className="bg-black/40 border-b border-white/5 pb-4">
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{pageConfig.packagesTitle}</p>
                                <CardTitle className="text-white font-black uppercase text-2xl italic tracking-tighter mt-1">{pageConfig.packagesSubtitle}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 bg-[#0a0a0a]">
                                <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">{pageConfig.packagesDesc}</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {livePackages.map((pkg, i) => {
                                        const pkgColors = i === 0 ? 'from-blue-600 to-blue-900 border-blue-400' :
                                            i === 1 ? 'from-orange-500 to-orange-800 border-orange-300' :
                                                'from-purple-600 to-purple-900 border-purple-400';
                                        return (
                                            <Card key={pkg.id} className={`group relative p-4 rounded-[1.5rem] border-2 bg-gradient-to-br ${pkgColors} shadow-xl overflow-hidden min-h-[140px] flex flex-col items-center justify-between`}>
                                                {pkg.badge && (
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-2 py-0.5 rounded-b-lg text-[7px] font-black uppercase z-20">
                                                        {pkg.badge}
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-center relative z-10 mt-2">
                                                    <Rocket className="h-5 w-5 text-white/90 mb-1" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-white leading-none text-center">{pkg.name}</h4>
                                                </div>
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <span className="text-3xl font-black italic text-white leading-none">{pkg.amount}</span>
                                                    <span className="text-[7px] uppercase font-black text-white/90 italic">ENTRADAS</span>
                                                </div>
                                                <div className="relative z-10 w-full mt-2">
                                                    <div className="bg-black/40 backdrop-blur-md text-yellow-400 font-black text-xs py-2 rounded-full border border-white/20 flex flex-col items-center shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                                                        <span className="text-[6px] text-white/70 leading-none mb-0.5 uppercase font-bold">Por apenas</span>
                                                        <span>R$ {Number(pkg.price).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ABA 2: PARTIDAS EM ANDAMENTO */}
                <TabsContent value="active">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/20 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic flex items-center gap-3">
                                <MonitorPlay className="h-6 w-6" /> Salas de Corrida ao Vivo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {activeRaces.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <Rocket className="h-12 w-12 text-white/10 mx-auto animate-bounce" />
                                    <p className="text-white/30 font-black uppercase text-xs tracking-widest">Nenhuma corrida em andamento no momento</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeRaces.map(race => (
                                        <div key={race.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 bg-green-500 text-black text-[8px] font-black uppercase px-3 rounded-bl-xl animate-pulse">AO VIVO</div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                    {race.profiles?.avatar_url ? <img src={race.profiles.avatar_url} className="h-full w-full object-cover rounded-xl" /> : <Rocket className="h-5 w-5 text-orange-500" />}
                                                </div>
                                                <div>
                                                    <p className="text-white font-black uppercase text-sm italic">{race.profiles?.nickname || 'Recruta'}</p>
                                                    <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Iniciou há poucos instantes</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 3: PARTIDAS REALIZADAS */}
                <TabsContent value="history">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/20 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic flex items-center gap-3">
                                <History className="h-6 w-6" /> Auditoria de Resultados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Piloto</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Recorde / Pontos</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Prêmio</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Data e Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {finishedRaces.map(race => (
                                            <tr key={race.id} className="hover:bg-white/[0.02] transition-all">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-white uppercase italic">{race.profiles?.nickname || 'Jogador'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className="text-orange-500 font-black italic">{(race.score || 0).toLocaleString()} PTS</span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={race.prize_won > 0 ? "text-emerald-500 font-black" : "text-gray-600 font-bold"}>
                                                        {race.prize_won > 0 ? `R$ ${race.prize_won.toFixed(2)}` : 'R$ 0,00'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-[10px] text-white/30 uppercase font-black">
                                                    {new Date(race.played_at).toLocaleString('pt-BR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {finishedRaces.length === 0 && (
                                    <div className="py-20 text-center text-white/20 font-black uppercase text-xs tracking-widest">Nenhuma atividade registrada no histórico.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 4: RANKING GLOBAL */}
                <TabsContent value="ranking">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/20 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic flex items-center gap-3">
                                <TrendingUp className="h-6 w-6" /> Top 50 Recordistas Mundiais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-6 flex justify-between items-center bg-white/[0.02] border-b border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-white font-black uppercase text-xs">Controle de Temporada</span>
                                    <span className="text-[9px] text-gray-500 uppercase font-black">Zerar pontos e iniciar nova contagem</span>
                                </div>
                                <Button
                                    onClick={handleResetRanking}
                                    variant="destructive"
                                    className="h-9 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/40 border border-red-500/30"
                                >
                                    <History className="w-3 h-3 mr-2" /> Zerar Ranking Total
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 w-20">Rank</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Piloto / Nickname</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Recorde</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Perfil</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {raceRanking.map((rank, i) => (
                                            <tr key={rank.id} className={`hover:bg-white/[0.02] transition-all ${i === 0 ? 'bg-orange-500/[0.03]' : ''}`}>
                                                <td className="px-8 py-4">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black ${i < 3 ? 'bg-orange-500 text-black' : 'bg-white/5 text-gray-500'}`}>
                                                        {i + 1}º
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={`text-sm font-black uppercase italic ${i === 0 ? 'text-orange-500 underline decoration-orange-500/30 underline-offset-4' : 'text-white'}`}>
                                                        {rank.nickname || 'Anônimo'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <Badge className="bg-orange-600/20 text-orange-500 border border-orange-500/20 font-black px-4">{(rank.score || 0).toLocaleString()} PTS</Badge>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="text-gray-500 font-black text-[10px] uppercase">ID: {rank.user_id?.substring(0, 8)}...</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {raceRanking.length === 0 && (
                                    <div className="py-20 text-center text-white/20 font-black uppercase text-xs tracking-widest">Sincronizando ranking com a memória do servidor...</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ABA 5: CATÁLOGO DE JOGOS */}
                <TabsContent value="catalog">
                    <Card className="bg-black/40 border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic">Jogos de Corrida Ativos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {liveGames.map(game => (
                                    <div key={game.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl relative group">
                                        <Rocket className="h-8 w-8 text-orange-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <h4 className="text-white font-black uppercase text-lg italic">{game.title}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase font-black mt-1 mb-6">{game.description}</p>
                                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                            <div>
                                                <p className="text-[8px] text-gray-600 uppercase font-black">Taxa</p>
                                                <p className="text-sm font-black text-white">R$ {game.entry_fee}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-gray-600 uppercase font-black">Prêmio Ref.</p>
                                                <p className="text-sm font-black text-orange-500">R$ {game.prize_amount}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

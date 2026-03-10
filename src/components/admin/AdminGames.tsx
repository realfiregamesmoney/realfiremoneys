import { useState, useEffect } from "react";
import {
    Gamepad2, Plus, Edit, Trash2, Eye, MonitorPlay, Rocket, Swords,
    Crown, Ship, Puzzle, Target, Flag, Loader2, Save, X, History, ShoppingBag, TrendingUp, User, Users, ChevronRight, Trophy, Zap
} from "lucide-react";

/**
 * TrophyIcon - Ícone customizado para o painel de competição.
 */
const TrophyIcon = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminRaceTab from "./AdminRaceTab";
import AdminBattleTab from "./AdminBattleTab";
import AdminBoardGamesTab from "./AdminBoardGamesTab";
import { sendPushNotification } from "@/utils/onesignal";

export default function AdminGames() {
    const [games, setGames] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [appSettings, setAppSettings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editingGame, setEditingGame] = useState<any>(null);
    const [editingPackage, setEditingPackage] = useState<any>(null);
    const [raceRanking, setRaceRanking] = useState<any[]>([]);
    const [selectedVictoriesGame, setSelectedVictoriesGame] = useState<string | null>(null);
    const [viewingMatch, setViewingMatch] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hidingConfig, setHidingConfig] = useState({ hide_race: false, hide_battle: false });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const { data: gamesData } = await supabase.from('minigame_configs').select('*').order('created_at');
            const { data: packagesData } = await supabase.from('minigame_packages').select('*').order('amount');
            const { data: sessionsData } = await supabase.from('minigame_sessions').select('*, profiles(nickname)').order('played_at', { ascending: false }).limit(50);
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            const { data: transactionsData } = await supabase
                .from('transactions')
                .select('*, profiles(nickname)')
                .in('type', ['race_purchase', 'battle_purchase', 'entry_fee', 'battle_entry'])
                .order('created_at', { ascending: false })
                .limit(50);

            if (gamesData) setGames(gamesData);
            if (packagesData) setPackages(packagesData);
            if (sessionsData) setSessions(sessionsData);
            if (settingsData) setAppSettings(settingsData);
            if (transactionsData) setTransactions(transactionsData);

            // 3. Ranking Global de Corridas (Respeitando Reset)
            const { data: rank, error: rankErr } = await supabase.rpc('get_global_ranking', { p_type: 'race_score' });

            if (rank && !rankErr) {
                setRaceRanking(rank);
            } else if (rankErr) {
                console.error("Erro ao buscar ranking na RPC:", rankErr);
            }

            // Carregar configurações de visibilidade
            if (settingsData) {
                const hideRace = settingsData.find(s => s.key === 'hide_race')?.value === 'true';
                const hideBattle = settingsData.find(s => s.key === 'hide_battle')?.value === 'true';
                setHidingConfig({ hide_race: hideRace, hide_battle: hideBattle });
            }
        } catch (error: any) {
            console.error("Error fetching admin games data:", error);
            toast.error("Erro ao carregar dados", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGame = async () => {
        if (!editingGame) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('minigame_configs')
                .upsert({
                    id: editingGame.id,
                    title: editingGame.title,
                    description: editingGame.description,
                    status: editingGame.status,
                    category: editingGame.category || 'battle',
                    entry_fee: editingGame.entry_fee,
                    prize_amount: editingGame.prize_amount,
                    type: editingGame.type
                });

            if (error) throw error;
            toast.success("Jogo atualizado com sucesso!");

            // Log de auditoria (Isolado)
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error: logErr } = await supabase.from("audit_logs").insert({
                        admin_id: user.id,
                        action_type: 'game_config_edit',
                        details: `Editou jogo: ${editingGame.title} (Cat: ${editingGame.category})`
                    });
                    if (logErr) toast.warning("Edição salva, mas falha ao registrar log de auditoria.");
                }
            } catch (e) { console.error("Log error:", e); }

            setEditingGame(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePackage = async () => {
        if (!editingPackage) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('minigame_packages')
                .update({
                    name: editingPackage.name,
                    amount: editingPackage.amount,
                    price: editingPackage.price,
                    badge: editingPackage.badge,
                    category: editingPackage.category
                })
                .eq('id', editingPackage.id);

            if (error) throw error;
            toast.success("Pacote atualizado com sucesso!");

            // Log de auditoria (Isolado)
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error: logErr } = await supabase.from("audit_logs").insert({
                        admin_id: user.id,
                        action_type: 'game_package_edit',
                        details: `Editou pacote: ${editingPackage.name} (Cat: ${editingPackage.category})`
                    });
                    if (logErr) toast.warning("Pacote salvo, mas falha ao registrar log de auditoria.");
                }
            } catch (e) { console.error("Log error:", e); }

            setEditingPackage(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateGame = async (category: string) => {
        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('minigame_configs')
                .insert({
                    title: "Novo Jogo",
                    description: "Descrição do novo jogo",
                    status: "active",
                    category: category,
                    entry_fee: 10,
                    prize_amount: 18,
                    type: "NEW"
                })
                .select()
                .single();

            if (error) throw error;
            toast.success("Novo jogo registrado!");
            setEditingGame(data);
            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao criar jogo: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreatePackage = async (category: string) => {
        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('minigame_packages')
                .insert({
                    name: "Novo Pacote",
                    amount: 5,
                    price: 20,
                    category: category,
                    badge: "Novo"
                })
                .select()
                .single();

            if (error) throw error;
            toast.success("Novo pacote de passes criado!");
            setEditingPackage(data);
            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao criar pacote: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGame = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este jogo?")) return;
        try {
            const { error } = await supabase.from('minigame_configs').delete().eq('id', id);
            if (error) throw error;
            toast.success("Jogo excluído.");

            // Log de auditoria
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from("audit_logs").insert({
                        admin_id: user.id,
                        action_type: 'game_config_delete',
                        details: `Deletou permanentemente jogo ID: ${id}`
                    });
                }
            } catch (e) { console.error("Log error:", e); }

            fetchInitialData();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + error.message);
        }
    };

    const handleResetRanking = async () => {
        const confirm = window.confirm("⚠️ ATENÇÃO: Deseja ZERAR o ranking global agora? \n\nIsso irá esconder todos os recordes atuais. Apenas pontos feitos APÓS esta ação serão contados. Esta ação não pode ser desfeita!");

        if (!confirm) return;

        toast.loading("Reiniciando Ranking...");
        try {
            const now = new Date().toISOString();
            const { error: resetErr } = await supabase.from('app_settings').upsert({ key: 'race_ranking_last_reset', value: JSON.stringify(now) });
            if (resetErr) throw resetErr;

            toast.dismiss();
            toast.success("Ranking ZERADO com sucesso!");
            fetchInitialData();
        } catch (e) {
            toast.dismiss();
            toast.error("Erro ao zerar ranking");
        }
    };

    const toggleGameVisibility = async (key: 'hide_race' | 'hide_battle') => {
        const newValue = !hidingConfig[key];
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: key, value: String(newValue) }, { onConflict: 'key' });

            if (error) throw error;

            setHidingConfig(prev => ({ ...prev, [key]: newValue }));
            toast.success(`${key === 'hide_race' ? 'RACE' : 'BATTLE'} ${newValue ? 'OCULTADO' : 'EXIBIDO'} com sucesso!`);
        } catch (err: any) {
            toast.error("Erro ao atualizar visibilidade: " + err.message);
        }
    };

    const getIcon = (name: string) => {
        switch (name) {
            case 'Target': return Target;
            case 'Flag': return Flag;
            case 'Crown': return Crown;
            case 'Ship': return Ship;
            case 'Puzzle': return Puzzle;
            case 'Swords': return Swords;
            case 'Rocket': return Rocket;
            case 'Zap': return Zap;
            case 'Trophy': return TrophyIcon;
            default: return Gamepad2;
        }
    };

    const renderGameEditorFields = () => (
        <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Título / Nome</Label>
                    <Input value={editingGame?.title || ''} onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo / Motor</Label>
                    <Input value={editingGame?.type || ''} onChange={(e) => setEditingGame({ ...editingGame, type: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Descrição/Texto Exibido</Label>
                <Input value={editingGame?.description || ''} onChange={(e) => setEditingGame({ ...editingGame, description: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Taxa de Entrada (R$)</Label>
                    <Input type="number" value={editingGame?.entry_fee || 0} onChange={(e) => setEditingGame({ ...editingGame, entry_fee: Number(e.target.value) })} className="bg-white/5 border-emerald-500/20 text-emerald-500 font-bold rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prêmio Máx. (R$)</Label>
                    <Input type="number" value={editingGame?.prize_amount || 0} onChange={(e) => setEditingGame({ ...editingGame, prize_amount: Number(e.target.value) })} className="bg-white/5 border-orange-500/20 text-orange-400 font-bold rounded-xl" />
                </div>
            </div>
            <div className="space-y-2 text-center pt-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-4">Status do Servidor</Label>
                <div className="flex justify-center gap-3">
                    {['Ativo', 'Manutenção', 'Oculto'].map((s) => (
                        <Button key={s} onClick={() => setEditingGame({ ...editingGame, status: s })} className={`rounded-xl px-4 py-1 h-auto font-black uppercase text-[9px] tracking-widest border ${editingGame?.status === s ? 'bg-orange-500 text-black border-orange-400' : 'bg-transparent text-white/40 border-white/5'}`}>{s}</Button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderPackageEditorFields = () => (
        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nome do Pacote (Texto na Caixa)</Label>
                <Input value={editingPackage?.name || ''} onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preço (R$)</Label>
                    <Input type="number" value={editingPackage?.price || 0} onChange={(e) => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Qtd. Entradas</Label>
                    <Input type="number" value={editingPackage?.amount || 0} onChange={(e) => setEditingPackage({ ...editingPackage, amount: Number(e.target.value) })} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Texto Destaque (POP/PRO/etc)</Label>
                <Input value={editingPackage?.badge || ''} onChange={(e) => setEditingPackage({ ...editingPackage, badge: e.target.value })} placeholder="Ex: POP, PRO..." className="bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Texto de Descrição (Novidade)</Label>
                <Input onChange={() => toast.info("Funcionalidade do BD em versão futura. O front já tem descrição local.")} placeholder="Ex: Para testar a sorte." className="bg-white/5 border-emerald-500/30 rounded-xl text-emerald-200" />
                <p className="text-[8px] text-gray-500 mt-1">Este campo edita o texto secundário da caixa.</p>
            </div>
        </div>
    );

    const renderGamesList = (categoryFilter: string, accentColor: string) => {
        const filtered = games.filter(g => g.category === categoryFilter);
        return (
            <CardContent className="p-8 bg-black/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl bg-${accentColor}-500/10 flex items-center justify-center border border-${accentColor}-500/20 shadow-lg shadow-${accentColor}-500/10`}>
                            <Target className={`h-5 w-5 text-${accentColor}-500`} />
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase text-xl leading-none italic">Controle de Motores e Visuais</h4>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sincronização direta com o Banco de Dados</p>
                        </div>
                    </div>
                    <Button onClick={() => handleCreateGame(categoryFilter)} className={`bg-${accentColor}-500 hover:bg-${accentColor}-600 text-black font-black uppercase text-[10px] tracking-widest py-5 px-8 rounded-xl shadow-lg shadow-${accentColor}-500/20`}>
                        <Plus className="w-4 h-4 mr-2" /> CRIAR NOVO JOGO / TABULEIRO
                    </Button>
                </div>

                <div className="space-y-4">
                    {filtered.length === 0 ? (
                        <p className="text-center text-white/30 py-10 uppercase font-black text-xs tracking-widest">Nenhum sistema cadastrado.</p>
                    ) : (
                        filtered.map((game) => {
                            const Icon = getIcon(game.icon_name);
                            return (
                                <div key={game.id} className={`flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl relative overflow-hidden group hover:border-${accentColor}-500/50 hover:bg-white/[0.05] transition-all duration-300`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${accentColor}-500 opacity-30 group-hover:opacity-100 transition-opacity`}></div>

                                    <div className="flex items-center gap-5">
                                        <div className={`h-16 w-16 rounded-xl flex items-center justify-center border shadow-lg bg-${accentColor}-500/10 border-${accentColor}-500/30 text-${accentColor}-500`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black uppercase italic text-white leading-none">{game.title}</h3>
                                                <Badge className={`text-[9px] font-black uppercase px-2 rounded-md ${game.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{game.status}</Badge>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-4 mt-2">
                                                <span className={`text-${accentColor}-400`}>{game.type.toUpperCase() || 'PADRÃO'}</span>
                                                <span className="text-gray-400">ENTRADA: R$ {game.entry_fee}</span>
                                                <span className="text-emerald-500">PRÊMIO MÁX: R$ {game.prize_amount}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-2 max-w-sm truncate">{game.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={() => setEditingGame(game)} variant="outline" className={`h-10 px-4 rounded-xl border-white/10 text-${accentColor}-500 hover:bg-${accentColor}-500/10 font-bold text-xs uppercase`}>
                                            <Edit className="h-4 w-4 mr-2" /> Editar Visual / Info
                                        </Button>
                                        <Button onClick={() => handleDeleteGame(game.id)} variant="outline" className="h-10 px-4 rounded-xl border-white/10 text-red-500 hover:bg-red-500/10 font-bold text-xs uppercase">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        );
    };

    const renderPackagesList = (categoryFilter: string, accentColor: string) => {
        const filtered = packages.filter(p => p.category === categoryFilter);
        return (
            <CardContent className="p-8 bg-black/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10`}>
                            <ShoppingBag className={`h-5 w-5 text-emerald-500`} />
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase text-xl leading-none italic">Prateleira de Passes</h4>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Configuração de pacotes de entradas e custos</p>
                        </div>
                    </div>
                    <Button onClick={() => handleCreatePackage(categoryFilter)} className="bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-[10px] tracking-widest py-5 px-8 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Plus className="w-4 h-4 mr-2" /> LANÇAR NOVO PACOTE DE PASSES
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((pkg) => {
                        const Icon = getIcon(pkg.icon_name || (categoryFilter === 'battle' ? 'Swords' : 'Rocket'));
                        return (
                            <div key={pkg.id} className={`p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-${accentColor}-500/30 transition-all group relative overflow-hidden`}>
                                <div className={`absolute top-0 right-0 p-4 opacity-10 text-${accentColor}-500 group-hover:scale-150 transition-transform`}>
                                    <Icon className="w-24 h-24" />
                                </div>
                                <div className="relative z-10 flex items-center justify-between mb-4">
                                    <h4 className="text-white font-black uppercase text-xl italic tracking-tight">{pkg.name}</h4>
                                    <Button onClick={() => setEditingPackage(pkg)} variant="ghost" className="h-8 w-8 p-0 text-white/40 hover:text-white bg-black/50 rounded-full">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Qtd. de Entradas</p>
                                        <p className={`text-4xl font-black text-${accentColor}-500 italic leading-none`}>{pkg.amount}</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">Preço Total</p>
                                            <p className="text-2xl font-black text-yellow-400">R$ {Number(pkg.price).toFixed(2)}</p>
                                        </div>
                                        {pkg.badge && <Badge className={`bg-${accentColor}-500 text-black font-black uppercase text-[10px]`}>{pkg.badge}</Badge>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <p className="col-span-full py-10 text-center text-white/30 uppercase font-black text-xs tracking-widest">Nenhuma caixa/pacote configurado.</p>}
                </div>
            </CardContent>
        );
    };

    const renderHistoryTable = (categoryFilter: string) => {
        // Filtrar sessões pela categoria vinculada ao jogo
        const filteredSessions = sessions.filter(s => {
            const game = games.find(g => g.id === s.game_id);
            return game?.category === categoryFilter;
        });

        return (
            <CardContent className="p-0 bg-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Modo / Jogo</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Resultado / Pontos</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Colocação</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Data/Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredSessions.map((session) => (
                                <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-500/20 border border-slate-500/30 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <span className="text-sm font-bold text-white uppercase">{session.profiles?.nickname || 'Jogador'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <Badge variant="outline" className="border-white/10 uppercase font-black text-[10px] text-white/60">{session.game_id}</Badge>
                                    </td>
                                    <td className="px-8 py-4 text-white font-black italic">{(session.score || 0).toLocaleString()}</td>
                                    <td className="px-8 py-4">
                                        <Badge className={session.prize_won > 0 ? "bg-yellow-500 text-black uppercase font-black" : "bg-white/10 text-white/50 uppercase font-black"}>
                                            {session.prize_won > 0 ? '1º LUGAR' : (session.score > 50 ? 'FINALISTA' : 'NÃO CLASSIFICADO')}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-4 text-xs font-bold text-gray-500 uppercase">
                                        {new Date(session.played_at).toLocaleString('pt-BR')}
                                        <div className="text-[8px] text-red-500 mt-1">-1 PASSE DESCONTADO</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSessions.length === 0 && <p className="text-center py-20 text-white/20 font-black uppercase text-xs tracking-widest">Sem atividades registradas.</p>}
                </div>
            </CardContent>
        );
    };

    const renderPassPurchasesTable = (categoryFilter: string) => {
        // Filtrar transações reais de compra de passes
        const purchaseHistory = transactions.filter(t => t.type === (categoryFilter === 'race' ? 'race_purchase' : 'battle_purchase'));

        return (
            <CardContent className="p-0 bg-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pacote Comprado</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Valor Investido</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Momento da Compra</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {purchaseHistory.map((p) => (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-500/20 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400 uppercase">{p.profiles?.nickname || 'Usuário'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-white font-bold text-xs uppercase italic">{categoryFilter === 'race' ? 'PAC. CORRIDA' : 'PAC. BATALHA'}</td>
                                    <td className="px-8 py-4 text-emerald-500 font-black">+ R$ {Number(p.amount).toFixed(2)}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-gray-500 uppercase">{new Date(p.created_at).toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        );
    }

    // A mock representation of active/finished board tournaments because they don't have a strict DB structure right now
    const renderBattleTournamentsList = () => {
        return (
            <CardContent className="p-8 space-y-4 bg-black/20 text-center py-20">
                <Users className="h-12 w-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-black uppercase text-xs tracking-widest">Nenhuma Partida Disponível no Momento</p>
                <p className="text-white/10 text-[10px] uppercase font-bold max-w-xs mx-auto">As partidas são criadas dinamicamente quando jogadores entram no lobby.</p>
            </CardContent>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                <p className="text-white/50 font-bold uppercase tracking-widest text-xs">Carregando Controle da Competição...</p>
            </div>
        );
    }

    const renderRaceRanking = () => (
        <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/30 to-black">
                <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic">Top 50 Classificados - Global</CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Posição</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Piloto / Recordista</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Recorde Atual</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Reset de Temporada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {raceRanking.map((rank, i) => (
                                <tr key={rank.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-10 py-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${i < 3 ? 'bg-orange-500 text-black' : 'bg-white/5 text-white/40'}`}>
                                            {i + 1}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-white uppercase">{rank.nickname || 'Anônimo'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-orange-400 font-black italic text-lg">{(rank.score || 0).toLocaleString()} PTS</td>
                                    <td className="px-8 py-4 text-right">
                                        <Button
                                            variant="destructive"
                                            onClick={handleResetRanking}
                                            className="h-8 rounded-lg px-4 text-[9px] uppercase font-black tracking-widest bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                                        >
                                            Zerar Ranking
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {raceRanking.length === 0 && <p className="text-center py-20 text-white/20 font-black uppercase text-xs tracking-widest">Aguardando novos recordes...</p>}
                </div>
            </CardContent>
        </Card>
    );

    const renderVictoriesBoardGames = () => {
        const boardGamesList = [
            { id: 'damas', title: 'Damas', icon: Crown, color: 'orange' },
            { id: 'xadrez', title: 'Xadrez', icon: Crown, color: 'purple' },
            { id: 'domino', title: 'Dominó', icon: Puzzle, color: 'green' },
            { id: 'batalhanaval', title: 'Batalha Naval', icon: Ship, color: 'cyan' },
            { id: 'uno', title: 'Uno', icon: Puzzle, color: 'yellow' },
            { id: 'cacheta', title: 'Cacheta', icon: Puzzle, color: 'pink' }
        ];

        const selectedGameVictories = sessions.filter(s => s.game_id === selectedVictoriesGame && Number(s.prize_won) > 0);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {boardGamesList.map((bg) => (
                        <Button
                            key={bg.id}
                            onClick={() => setSelectedVictoriesGame(bg.id)}
                            className={`h-20 flex flex-col items-center justify-center rounded-2xl border transition-all ${selectedVictoriesGame === bg.id ? `bg-${bg.color}-500/20 border-${bg.color}-500 text-white` : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                        >
                            <bg.icon className="h-6 w-6 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{bg.title}</span>
                        </Button>
                    ))}
                </div>

                {selectedVictoriesGame ? (
                    <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/30 to-black">
                            <CardTitle className="text-xl font-black tracking-tighter text-blue-400 uppercase italic">Campeões: {boardGamesList.find(b => b.id === selectedVictoriesGame)?.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 bg-black/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Campeão</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Prêmio Ganho</th>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Data/Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {selectedGameVictories.map((v) => (
                                            <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <span className="text-sm font-bold text-white uppercase">{v.profiles?.nickname || 'Jogador'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-emerald-400 font-black italic">R$ {Number(v.prize_won).toFixed(2)}</td>
                                                <td className="px-8 py-4 text-xs font-bold text-gray-500 uppercase">{new Date(v.played_at).toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {selectedGameVictories.length === 0 && <p className="text-center py-20 text-white/20 font-black uppercase text-xs tracking-widest">Nenhum vencedor registrado ainda.</p>}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center bg-black/20 border border-white/5 rounded-3xl">
                        <Trophy className="h-12 w-12 text-white/5 mb-4" />
                        <p className="text-white/20 font-black uppercase text-xs tracking-widest">Selecione um jogo para ver o Hall da Fama</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2 md:gap-3 leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <TrophyIcon className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
                        COMPETIÇÃO GLOBAL
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 ml-1">
                        Gerenciamento visual e estrutural do módulo Mini Jogos do App
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => toggleGameVisibility('hide_race')}
                        variant={hidingConfig.hide_race ? "destructive" : "outline"}
                        className={`h-10 px-4 rounded-xl font-black text-[10px] tracking-widest ${!hidingConfig.hide_race ? 'border-orange-500/50 text-orange-500' : ''}`}
                    >
                        {hidingConfig.hide_race ? "EXIBIR RACE" : "OCULTAR RACE"}
                    </Button>
                    <Button
                        onClick={() => toggleGameVisibility('hide_battle')}
                        variant={hidingConfig.hide_battle ? "destructive" : "outline"}
                        className={`h-10 px-4 rounded-xl font-black text-[10px] tracking-widest ${!hidingConfig.hide_battle ? 'border-blue-500/50 text-blue-500' : ''}`}
                    >
                        {hidingConfig.hide_battle ? "EXIBIR BATTLE" : "OCULTAR BATTLE"}
                    </Button>
                    <Button variant="outline" onClick={fetchInitialData} className="border-white/10 text-white/50 h-10 rounded-xl uppercase font-black text-[10px] tracking-widest px-6 hover:bg-white/5 w-fit">
                        <Loader2 className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Sincronizar Câmeras
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="corridas" className="w-full">
                {/* ROOT TABS: CORRIDAS VS BATALHAS */}
                <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/5 rounded-2xl mb-6 p-1 h-auto min-h-[3.5rem]">
                    <TabsTrigger value="corridas" className="rounded-xl font-black uppercase tracking-widest data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=inactive]:text-white/40 transition-all text-[9px] md:text-xs py-2 h-full text-center flex-col md:flex-row gap-1">
                        <Rocket className="w-3 h-3 md:w-4 md:h-4" /> RACE (Corridas / Arcades)
                    </TabsTrigger>
                    <TabsTrigger value="batalhas" className="rounded-xl font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:text-white/40 transition-all text-[9px] md:text-xs py-2 h-full text-center flex-col md:flex-row gap-1">
                        <Swords className="w-3 h-3 md:w-4 md:h-4" /> BATTLE (Tabuleiros)
                    </TabsTrigger>
                </TabsList>

                {/* --- ABA CORRIDAS --- */}
                <TabsContent value="corridas" className="focus:outline-none">
                    <Tabs defaultValue="visual" className="w-full">
                        <TabsList className="bg-transparent border-b border-white/10 w-full flex justify-start rounded-none h-auto min-h-[3rem] mb-6 gap-4 md:gap-6 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
                            <TabsTrigger value="visual" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">LAYOUT</TabsTrigger>
                            <TabsTrigger value="loja" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">ENTRADAS</TabsTrigger>
                            <TabsTrigger value="hist" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">Partidas Realizadas</TabsTrigger>
                            <TabsTrigger value="info" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">PARTIDAS EM ANDAMENTO</TabsTrigger>
                            <TabsTrigger value="corridas" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">JOGOS DE CORRIDA</TabsTrigger>
                            <TabsTrigger value="ranking" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-0 text-orange-500/50 data-[state=active]:text-orange-500 font-black uppercase tracking-widest text-[10px]">RANKING</TabsTrigger>
                        </TabsList>

                        <TabsContent value="visual">
                            <AdminRaceTab
                                games={games}
                                packages={packages}
                                settings={appSettings}
                                onRefresh={fetchInitialData}
                                accentColor="orange"
                            />
                        </TabsContent>

                        <TabsContent value="loja">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/30 to-black">
                                    <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic">Registro de Passes Comprados</CardTitle>
                                </CardHeader>
                                {renderPassPurchasesTable('race')}
                            </Card>
                        </TabsContent>

                        <TabsContent value="hist">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/30 to-black flex flex-row items-center justify-between">
                                    <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic">Auditoria de Corridas</CardTitle>
                                </CardHeader>
                                {renderHistoryTable('race')}
                            </Card>
                        </TabsContent>

                        <TabsContent value="info">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-orange-950/30 to-black">
                                    <CardTitle className="text-xl font-black tracking-tighter text-orange-500 uppercase italic">Salas de Corrida em Tempo Real</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4 bg-black/20 text-center py-20">
                                    <Rocket className="h-12 w-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/30 font-black uppercase text-xs tracking-widest">Nenhuma Corrida em Andamento</p>
                                    <p className="text-white/10 text-[10px] uppercase font-bold max-w-xs mx-auto">As sessões de arcade são individuais e finalizadas instantaneamente ao bater o recorde.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="corridas">
                            {renderGamesList('race', 'orange')}
                        </TabsContent>

                        <TabsContent value="ranking">
                            {renderRaceRanking()}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* --- ABA BATALHAS --- */}
                <TabsContent value="batalhas" className="focus:outline-none">
                    <Tabs defaultValue="visual" className="w-full">
                        <TabsList className="bg-transparent border-b border-white/10 w-full flex justify-start rounded-none h-auto min-h-[3rem] mb-6 gap-4 md:gap-6 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
                            <TabsTrigger value="visual" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">LAYOUT</TabsTrigger>
                            <TabsTrigger value="loja" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">ENTRADAS</TabsTrigger>
                            <TabsTrigger value="hist" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">PARTIDAS REALIZADAS</TabsTrigger>
                            <TabsTrigger value="info" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">PARTIDAS EM ANDAMENTO</TabsTrigger>
                            <TabsTrigger value="tabuleiro" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">JOGOS DE TABULEIRO</TabsTrigger>
                            <TabsTrigger value="vitorias" className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none px-0 text-blue-500/50 data-[state=active]:text-blue-500 font-black uppercase tracking-widest text-[10px]">VITÓRIAS</TabsTrigger>
                        </TabsList>

                        <TabsContent value="visual">
                            <AdminBattleTab
                                games={games}
                                packages={packages}
                                settings={appSettings}
                                onRefresh={fetchInitialData}
                                accentColor="blue"
                            />
                        </TabsContent>

                        <TabsContent value="loja">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/30 to-black">
                                    <CardTitle className="text-xl font-black tracking-tighter text-blue-400 uppercase italic">Registro de Passes Comprados</CardTitle>
                                </CardHeader>
                                {renderPassPurchasesTable('battle')}
                            </Card>
                        </TabsContent>

                        <TabsContent value="hist">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/30 to-black">
                                    <CardTitle className="text-xl font-black tracking-tighter text-blue-400 uppercase italic">Partidas Realizadas</CardTitle>
                                </CardHeader>
                                {renderHistoryTable('battle')}
                            </Card>
                        </TabsContent>

                        <TabsContent value="info">
                            <Card className="bg-transparent border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/30 to-black">
                                    <CardTitle className="text-xl font-black tracking-tighter text-blue-400 uppercase italic">Salas em Andamento</CardTitle>
                                </CardHeader>
                                {renderBattleTournamentsList()}
                            </Card>
                        </TabsContent>

                        <TabsContent value="tabuleiro">
                            <AdminBoardGamesTab games={games} onEdit={setEditingGame} />
                        </TabsContent>

                        <TabsContent value="vitorias">
                            {renderVictoriesBoardGames()}
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>

            {/* MODAL EDITAR JOGO (Genérico) */}
            <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
                <DialogContent className="bg-[#050505] border-white/10 text-white max-w-lg rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className={`absolute top-0 left-0 w-full h-1 ${editingGame?.category === 'battle' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                    <DialogHeader className="pt-6">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Editar Informações: <span className={editingGame?.category === 'battle' ? 'text-blue-500' : 'text-orange-500'}>{editingGame?.title}</span></DialogTitle>
                    </DialogHeader>
                    {renderGameEditorFields()}
                    <DialogFooter className="pb-4">
                        <Button onClick={() => setEditingGame(null)} variant="ghost" className="text-white/40 hover:text-white uppercase font-black text-xs tracking-widest h-12">Cancelar</Button>
                        <Button onClick={handleSaveGame} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-black px-8 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20">
                            {isSaving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Forçar Alteração Visual</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITAR PACOTE */}
            <Dialog open={!!editingPackage} onOpenChange={(open) => !open && setEditingPackage(null)}>
                <DialogContent className="bg-[#050505] border-white/10 text-white max-w-sm rounded-[2rem] overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${editingPackage?.category === 'battle' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                    <DialogHeader className="pt-6">
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Textos do Pacote Visual</DialogTitle>
                    </DialogHeader>
                    {renderPackageEditorFields()}
                    <DialogFooter className="pb-4">
                        <Button onClick={handleSavePackage} disabled={isSaving} className={`w-full text-black h-12 rounded-xl font-black uppercase text-xs tracking-widest ${editingPackage?.category === 'battle' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Confirmar Visual do Pacote'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL VER PARTIDA BATALHA */}
            <Dialog open={!!viewingMatch} onOpenChange={(open) => !open && setViewingMatch(null)}>
                <DialogContent className="bg-[#0a0a0a] border-blue-500/30 text-white max-w-lg rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                    <DialogHeader className="pt-6 border-b border-white/5 pb-4">
                        <Badge className="w-fit mb-2 bg-blue-900/50 text-blue-400 font-black uppercase text-[8px]">VisualizAÇÃO EM TEMPO REAL</Badge>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                            {viewingMatch?.title}
                        </DialogTitle>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Controle de Sala da Administração</p>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="bg-black/50 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-black">Status</p>
                                <p className="text-white font-black uppercase text-sm mt-1">{viewingMatch?.status}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-gray-500 uppercase font-black">Modo de Jogo</p>
                                <p className="text-white font-black uppercase text-sm mt-1">{viewingMatch?.type}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-3 ml-1">Jogadores Conectados na Sala</h4>
                            <div className="space-y-2">
                                {[...Array(viewingMatch?.players || 1)].map((_, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/[0.02] border border-white/10 p-3 rounded-xl hover:bg-blue-900/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white uppercase">
                                                    {viewingMatch?.winner && i === 0 ? viewingMatch.winner : `Jogador Convidado ${i + 1}`}
                                                </p>
                                                <p className="text-[8px] text-gray-500 uppercase">Conectado via Lobby</p>
                                            </div>
                                        </div>
                                        {viewingMatch?.winner && i === 0 ? (
                                            <Badge className="bg-yellow-500 text-black text-[8px] uppercase font-black">Vencedor Classificado</Badge>
                                        ) : viewingMatch?.status === 'andamento' ? (
                                            <Badge className="bg-green-500 text-black text-[8px] uppercase font-black">Jogando</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500 text-white text-[8px] uppercase font-black h-fit">Na Fila</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pb-4 sm:justify-between border-t border-white/5 pt-4">
                        <Button variant="ghost" onClick={() => toast.info("Comando de exclusão/reset desativado no momento.")} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-widest text-[9px]">
                            FORÇAR ENCERRAMENTO
                        </Button>
                        <Button onClick={() => setViewingMatch(null)} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px]">
                            Fechar Visualização
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

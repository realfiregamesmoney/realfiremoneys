import React, { useState, useEffect } from "react";
import {
    Shield, Trophy, Wallet, Users, MessageSquare, Plus, Check, X, Star, ExternalLink, Loader2,
    Edit, Save, Calendar, Link as LinkIcon, Trash2, Send, Lightbulb, Archive, Gamepad2, Search,
    AlertTriangle, History, Eye, Clock, UserCog, Upload, DollarSign, ArrowLeft, Gift, Ban, Lock, Bell, Zap, ShoppingBag, Ticket, BarChart2, Unlock, Pin, Briefcase, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { playNotificationSound } from "@/utils/notificationSound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendPushNotification } from "@/utils/onesignal";
import { INITIAL_PRODUCTS } from "./seed_products";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import GlobalChat from "./GlobalChat";
import AdminQuiz from "@/components/admin/AdminQuiz";
import AdminPartnership from "@/components/partnership/AdminPartnership";

// Definir SINO para evitar erro no código
const SINO = Bell;

export default function Admin() {
    const { isAdmin, loading, user } = useAuth();
    const navigate = useNavigate();
    const [adminUnread, setAdminUnread] = useState(0);
    const [activeTab, setActiveTab] = useState("notifications");

    useEffect(() => {
        if (!loading && !isAdmin) navigate("/dashboard", { replace: true });
    }, [isAdmin, loading, navigate]);

    // Fetch admin notification count
    useEffect(() => {
        if (!user) return;
        const fetchCount = async () => {
            const { count } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("user_id", user.id).eq("is_read", false);
            setAdminUnread(count || 0);
        };
        fetchCount();
        const channel = supabase
            .channel('admin-notif-count')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
                fetchCount();
                playNotificationSound();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user]);

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-neon-orange"><Loader2 className="animate-spin h-10 w-10" /></div>;
    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-[#050505] pb-20 text-white font-sans">
            <div className="border-b border-white/10 bg-[#0c0c0c] px-4 py-4 sticky top-0 z-50 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neon-orange/10 rounded-lg border border-neon-orange/20">
                            <Shield className="h-6 w-6 text-neon-orange" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-wider text-white">Sala de Comando</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Real Fire Admin • v2.0</p>
                        </div>
                    </div>
                    <button className="relative p-2" onClick={async () => {
                        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
                        setAdminUnread(0);
                    }}>
                        <Bell className="h-5 w-5 text-gray-400" />
                        {adminUnread > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-neon-orange text-[9px] font-bold text-black">
                                {adminUnread > 9 ? '9+' : adminUnread}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="px-2 pt-4">
                <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent h-auto p-0 mb-4 overflow-x-auto">
                    <TabItem value="notifications" icon={SINO} label="Notificações" />
                    <TabItem value="tournaments" icon={Trophy} label="Torneios" />
                    <TabItem value="rooms" icon={Gamepad2} label="Salas Ao Vivo" />
                    <TabItem value="chat" icon={MessageSquare} label="Chat Global" />
                    <TabItem value="users" icon={Users} label="Jogadores" />
                    <TabItem value="finance" icon={Wallet} label="Financeiro" />
                    <TabItem value="wallet" icon={BarChart2} label="Carteira e Lucro" />
                    <TabItem value="auto_history" icon={Zap} label="Históricos Auto" />
                    <TabItem value="payment_link" icon={LinkIcon} label="Link da Conta" />
                    <TabItem value="support" icon={MessageSquare} label="Suporte" />
                    <TabItem value="logs" icon={History} label="Registros" />
                    <TabItem value="referrals" icon={Gift} label="Indicações" />
                    <TabItem value="products" icon={ShoppingBag} label="Produtos" />
                    <TabItem value="passes" icon={Ticket} label="Passes Livres" />
                    <TabItem value="alerts" icon={AlertTriangle} label="Alertas" />
                    <TabItem value="partnership" icon={Briefcase} label="Parceria" />
                    <TabItem value="quiz" icon={Zap} label="Mega Quiz" />
                </TabsList>

                <div className="px-2">
                    <TabsContent value="notifications"><AdminNotificationsSettings /></TabsContent>
                    <TabsContent value="tournaments"><AdminTournaments /></TabsContent>
                    <TabsContent value="rooms"><AdminRooms /></TabsContent>
                    <TabsContent value="chat"><AdminChatControl onTabChange={setActiveTab} /></TabsContent>
                    <TabsContent value="users"><AdminUsers /></TabsContent>
                    <TabsContent value="finance"><AdminFinance /></TabsContent>
                    <TabsContent value="wallet"><AdminCompanyWallet /></TabsContent>
                    <TabsContent value="auto_history"><AdminAutoHistory /></TabsContent>
                    <TabsContent value="payment_link"><AdminPaymentLink /></TabsContent>
                    <TabsContent value="support"><AdminSupport /></TabsContent>
                    <TabsContent value="logs"><AdminLogs /></TabsContent>
                    <TabsContent value="referrals"><AdminReferrals /></TabsContent>
                    <TabsContent value="products"><AdminProducts /></TabsContent>
                    <TabsContent value="passes"><AdminPasses /></TabsContent>
                    <TabsContent value="alerts"><AdminAlerts /></TabsContent>
                    <TabsContent value="partnership"><AdminPartnership /></TabsContent>
                    <TabsContent value="quiz"><AdminQuiz /></TabsContent>
                </div>
            </Tabs>

            <div className="px-4 mt-8 mb-8">
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full border-white/10 bg-[#111] text-gray-400 hover:text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
                </Button>
            </div>
        </div>
    );
}

const TabItem = ({ value, icon: Icon, label }: any) => (
    <TabsTrigger
        value={value}
        className="data-[state=active]:bg-neon-orange data-[state=active]:text-black bg-[#111] border border-white/5 text-gray-400 text-[10px] uppercase font-bold px-3 py-2 rounded-md flex items-center gap-2 transition-all hover:bg-white/5"
    >
        <Icon className="h-3 w-3" /> {label}
    </TabsTrigger>
);

// --- 1. NOTIFICAÇÕES ---
function AdminNotificationsSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // LISTA FIXA OBRIGATÓRIA
    const defaultList = [
        { category: 'admin', key_name: 'adm_data_changes', label: 'Notificações de Mudança de Dados' },
        { category: 'admin', key_name: 'adm_new_user', label: 'Notificações de Novo Usuário Cadastrado' },
        { category: 'admin', key_name: 'adm_tourn_schedule', label: 'Notificações de Horários de Torneio' },
        { category: 'admin', key_name: 'adm_finance', label: 'Notificações de Saque e Depósito' },
        { category: 'admin', key_name: 'adm_messages', label: 'Notificações de Novas Mensagens' },
        { category: 'admin', key_name: 'adm_system_actions', label: 'Ações Gerais do Sistema' },
        { category: 'player', key_name: 'ply_new_tournaments', label: 'Notificações de Novos Torneios' },
        { category: 'player', key_name: 'ply_schedule', label: 'Notificações de Horários de Torneio' },
        { category: 'player', key_name: 'ply_finance_done', label: 'Notificações de Saque e Depósito Concluído' },
        { category: 'player', key_name: 'ply_msg_reply', label: 'Notificações de Mensagens Respondidas' },
        { category: 'player', key_name: 'ply_open_rooms', label: 'Notificações de Salas Abertas' }
    ];

    const fetchSettings = async () => {
        try {
            const { data } = await (supabase as any).from('notification_settings').select('*');
            const dbData = data || [];

            const merged = defaultList.map(item => {
                const dbItem = dbData.find(d => d.key_name === item.key_name);
                return {
                    ...item,
                    id: dbItem?.id || item.key_name,
                    is_enabled: dbItem ? dbItem.is_enabled : true
                };
            });
            setSettings(merged);
        } catch (e) {
            setSettings(defaultList.map(i => ({ ...i, is_enabled: true })));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleToggle = async (key_name: string, currentStatus: boolean) => {
        const item = defaultList.find(l => l.key_name === key_name);
        const { error } = await (supabase as any).from('notification_settings').upsert({
            key_name,
            is_enabled: !currentStatus,
            category: item?.category,
            label: item?.label
        }, { onConflict: 'key_name' });

        if (error) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } else {
            setSettings(prev => prev.map(s => s.key_name === key_name ? { ...s, is_enabled: !currentStatus } : s));
            toast({ title: "Configuração atualizada!" });
        }
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-center gap-3">
                <Bell className="text-blue-400 h-5 w-5" />
                <p className="text-xs text-blue-200">Gerencie quais notificações o sistema deve disparar.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {['admin', 'player'].map((cat) => (
                    <Card key={cat} className="border-white/10 bg-[#0c0c0c]">
                        <CardHeader className="pb-2 border-b border-white/5">
                            <CardTitle className="text-xs uppercase text-neon-orange">
                                {cat === 'admin' ? "Alertas para Equipe" : "Alertas para Jogadores"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {settings.filter(s => s.category === cat).map((s) => (
                                <div key={s.key_name} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-white/5 transition-colors">
                                    <Label className="text-sm cursor-pointer" htmlFor={s.key_name}>{s.label}</Label>
                                    <Switch
                                        id={s.key_name}
                                        checked={s.is_enabled}
                                        onCheckedChange={() => handleToggle(s.key_name, s.is_enabled)}
                                        className="data-[state=checked]:bg-neon-orange"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// --- 1. TORNEIOS ---
function AdminTournaments() {
    const { toast } = useToast();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: "", type: "SQUAD", entry_fee: "", prize_pool: "",
        room_link: "", scheduled_at: "", is_open: true, open_time: "", close_time: "",
        max_players: "48", extra_text: "", max_level: "", prize_distribution: "winner", button_color: "orange",
        prize_first: "100", prize_second: "0", prize_third: "0"
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [deleteModal, setDeleteModal] = useState<any | null>(null);

    const fetchTournaments = async () => {
        const { data: ts } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
        const { data: participants } = await supabase.from("tournament_participants").select("tournament_id").eq("status", "paid");

        if (ts) {
            let accurateTs = ts;
            if (participants) {
                const counts: Record<string, number> = {};
                participants.forEach((p: any) => {
                    counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
                });
                accurateTs = ts.map(t => ({
                    ...t,
                    current_players: counts[t.id] || 0
                }));
            }
            setTournaments(accurateTs);
        }
    };

    useEffect(() => { fetchTournaments(); }, []);

    const handleCreate = async () => {
        if (!formData.title || !formData.entry_fee) return toast({ variant: "destructive", title: "Preencha os dados obrigatórios" });

        let fixedDate = null;
        try {
            if (formData.scheduled_at) {
                fixedDate = new Date(formData.scheduled_at).toISOString();
            }
        } catch (e) {
            return toast({ variant: "destructive", title: "Data Inválida", description: "Verifique o formato da data e hora." });
        }

        const entryFee = parseFloat(String(formData.entry_fee)) || 0;
        const prizePool = parseFloat(String(formData.prize_pool)) || 0;

        const payload = {
            title: formData.title,
            type: formData.type,
            entry_fee: entryFee,
            prize_pool: prizePool,
            room_link: formData.room_link || null,
            scheduled_at: fixedDate,
            status: formData.is_open ? 'open' : 'closed',
            open_time: formData.open_time || null,
            close_time: formData.close_time || null,
            max_players: parseInt(String(formData.max_players)) || 48,
            extra_text: formData.extra_text || null,
            max_level: formData.max_level ? parseInt(String(formData.max_level)) : null,
            prize_distribution: formData.prize_distribution || "winner",
            button_color: formData.button_color || "orange",
            prize_first: parseInt(String(formData.prize_first)) || 100,
            prize_second: parseInt(String(formData.prize_second)) || 0,
            prize_third: parseInt(String(formData.prize_third)) || 0
        };

        let currentPayload: any = { ...payload };
        let success = false;
        let lastError = null;

        // Recursive attempt to save by stripping missing columns
        for (let attempt = 0; attempt < 10; attempt++) {
            console.log(`[AdminTournaments] Tentativa de criação #${attempt + 1}`, currentPayload);
            const { error: insertError } = await supabase.from("tournaments").insert(currentPayload);

            if (!insertError) {
                success = true;
                break;
            }

            lastError = insertError;
            console.error(`[AdminTournaments] Erro na criação:`, insertError);

            // Handle missing column error (schema cache out of sync)
            if (insertError.message?.includes("column") && (insertError.message?.includes("not find") || insertError.message?.includes("does not exist"))) {
                const match = insertError.message.match(/'([^']+)'/) || insertError.message.match(/column "([^"]+)"/);
                const missingColumn = match ? match[1] : null;

                if (missingColumn && currentPayload.hasOwnProperty(missingColumn)) {
                    console.warn(`[AdminTournaments] Removendo coluna inexistente no banco: ${missingColumn}`);
                    delete currentPayload[missingColumn];
                    continue; // Next attempt
                }
            }
            break; // Stop on other errors
        }

        if (!success && lastError) {
            toast({ variant: "destructive", title: "Erro ao criar", description: lastError.message });
        } else {
            toast({ title: "Torneio Criado com Sucesso!" });
            fetchTournaments();

            try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                await supabase.from("audit_logs").insert({
                    admin_id: currentUser?.id,
                    action_type: 'tournament_create',
                    details: `Criou torneio: ${formData.title} (Entrada: R$${entryFee}, Prêmio: R$${prizePool})`
                });
            } catch (auditErr) { console.error("Erro ao gerar log", auditErr); }

            // DISPARO DE PUSH
            await sendPushNotification(
                'ply_new_tournaments',
                'Novo Torneio no Real Fire! 🔥',
                `O torneio "${formData.title}" valendo R$ ${prizePool} acabou de abrir! Garanta sua vaga.`
            );

            setFormData({
                title: "", type: "SQUAD", entry_fee: "", prize_pool: "",
                room_link: "", scheduled_at: "", is_open: true, open_time: "", close_time: "",
                max_players: "48", extra_text: "", max_level: "", prize_distribution: "winner", button_color: "orange",
                prize_first: "100", prize_second: "0", prize_third: "0"
            });
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        const { error } = await supabase.from("tournaments").update({
            status: 'closed',
            title: `[ARQUIVADO] ${deleteModal.title}`
        }).eq("id", deleteModal.id);

        if (error) {
            toast({ variant: "destructive", title: "Falha de Permissão ou Banco", description: error.message });
            return;
        }

        await supabase.from("audit_logs").insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action_type: 'tournament_delete', details: `Arquivou torneio: ${deleteModal.title}` });
        toast({ variant: "destructive", title: "Torneio Excluído", description: "O torneio foi enviado para o histórico de exclusão." });
        setDeleteModal(null);
        fetchTournaments();
    };

    const handleRestore = async (id: string, oldTitle: string) => {
        const cleanTitle = oldTitle.replace('[ARQUIVADO] ', '');
        await supabase.from("tournaments").update({ status: 'closed', title: cleanTitle }).eq("id", id);
        toast({ title: "Torneio Restaurado!" });
        fetchTournaments();
    };

    const handleRealDelete = async (id: string) => {
        if (!confirm("Atenção: Destruir permanentemente pode falhar se houver jogadores já inscritos pagos. Deseja tentar destruir?")) return;
        const { error } = await supabase.from("tournaments").delete().eq("id", id);
        if (error) {
            toast({ variant: "destructive", title: "Erro na Dedeção", description: "Não é possível excluir um torneio que já tem participantes e histórico atrelados." });
        } else {
            toast({ title: "Destruído permanentemente." });
            fetchTournaments();
        }
    };

    const handleSetFeatured = async (id: string) => {
        await supabase.from("tournaments").update({ is_featured: false }).neq("id", id);
        await supabase.from("tournaments").update({ is_featured: true }).eq("id", id);
        toast({ title: "Destaque atualizado!" });
        fetchTournaments();
    };

    const startEdit = (t: any) => {
        setEditingId(t.id);
        // Correctly format ISO date for datetime-local input (YYYY-MM-DDTHH:mm)
        let formattedDate = "";
        if (t.scheduled_at) {
            try {
                formattedDate = new Date(t.scheduled_at).toISOString().slice(0, 16);
            } catch (e) {
                formattedDate = "";
            }
        }

        setEditData({
            title: t.title || "",
            type: t.type || "SQUAD",
            entry_fee: String(t.entry_fee || 0),
            prize_pool: String(t.prize_pool || 0),
            room_link: t.room_link || "",
            scheduled_at: formattedDate,
            is_open: t.status === 'open',
            open_time: t.open_time || "",
            close_time: t.close_time || "",
            max_players: String(t.max_players || 48),
            extra_text: t.extra_text || "",
            max_level: String(t.max_level || ""),
            prize_distribution: t.prize_distribution || "winner",
            button_color: t.button_color || "orange",
            prize_first: String(t.prize_first ?? 100),
            prize_second: String(t.prize_second ?? 0),
            prize_third: String(t.prize_third ?? 0)
        });
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        let fixedDateEdit = null;
        try {
            if (editData.scheduled_at) {
                fixedDateEdit = new Date(editData.scheduled_at).toISOString();
            }
        } catch (e) {
            return toast({ variant: "destructive", title: "Data Inválida", description: "Verifique o formato da data e hora." });
        }

        const entryFee = parseFloat(String(editData.entry_fee)) || 0;
        const prizePool = parseFloat(String(editData.prize_pool)) || 0;

        const payloadEdit = {
            title: editData.title,
            type: editData.type,
            entry_fee: entryFee,
            prize_pool: prizePool,
            room_link: editData.room_link || null,
            scheduled_at: fixedDateEdit,
            status: editData.is_open ? 'open' : 'closed',
            open_time: editData.open_time || null,
            close_time: editData.close_time || null,
            max_players: parseInt(String(editData.max_players)) || 48,
            extra_text: editData.extra_text || null,
            max_level: editData.max_level && editData.max_level !== "" ? parseInt(String(editData.max_level)) : null,
            prize_distribution: editData.prize_distribution || "winner",
            button_color: editData.button_color || "orange",
            prize_first: parseInt(String(editData.prize_first)) || 100,
            prize_second: parseInt(String(editData.prize_second)) || 0,
            prize_third: parseInt(String(editData.prize_third)) || 0
        };

        let currentPayloadEdit: any = { ...payloadEdit };
        let successEdit = false;
        let lastErrorEdit = null;

        // Recursive attempt to update by stripping missing columns
        for (let attempt = 0; attempt < 10; attempt++) {
            console.log(`[AdminTournaments] Tentativa de atualização #${attempt + 1}`, currentPayloadEdit);
            const { error: updateError } = await supabase.from("tournaments").update(currentPayloadEdit).eq("id", editingId);

            if (!updateError) {
                successEdit = true;
                break;
            }

            lastErrorEdit = updateError;
            console.error(`[AdminTournaments] Erro na atualização:`, updateError);

            // Handle missing column error
            if (updateError.message?.includes("column") && (updateError.message?.includes("not find") || updateError.message?.includes("does not exist"))) {
                const match = updateError.message.match(/'([^']+)'/) || updateError.message.match(/column "([^"]+)"/);
                const missingColumn = match ? match[1] : null;

                if (missingColumn && currentPayloadEdit.hasOwnProperty(missingColumn)) {
                    console.warn(`[AdminTournaments] Removendo coluna inexistente no banco: ${missingColumn}`);
                    delete currentPayloadEdit[missingColumn];
                    continue; // Next attempt
                }
            }
            break; // Stop on other errors
        }

        if (!successEdit && lastErrorEdit) {
            toast({ variant: "destructive", title: "Erro ao atualizar", description: lastErrorEdit.message });
        } else {
            toast({ title: "Torneio Atualizado com Sucesso!" });
            setEditingId(null);
            fetchTournaments();

            // DISPARO DE PUSH
            await sendPushNotification(
                'ply_schedule',
                '⏳ Torneio Atualizado',
                `A sala "${editData.title}" pode ter novos horários ou vagas. Verifique agora!`
            );
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-white/10 bg-[#0c0c0c]">
                <CardHeader className="pb-3 border-b border-white/5"><CardTitle className="flex items-center gap-2 text-sm uppercase text-neon-orange"><Plus className="h-4 w-4" /> Criar Nova Sala</CardTitle></CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <Input placeholder="Nome da Sala (Ex: Diário Solo)" className="bg-black/50 border-white/10" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                        <select className="bg-black border border-white/10 text-sm rounded-md px-3 h-10 text-white w-full" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                            <option value="SOLO">SOLO</option><option value="DUO">DUO</option><option value="SQUAD">SQUAD</option>
                        </select>
                        <Input type="datetime-local" className="bg-black/50 border-white/10" value={formData.scheduled_at} onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1"><Label className="text-[10px]">Entrada (R$)</Label><Input type="number" className="bg-black/50 border-white/10" value={formData.entry_fee} onChange={e => setFormData({ ...formData, entry_fee: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Prêmio Ref. (R$)</Label><Input type="number" className="bg-black/50 border-white/10" value={formData.prize_pool} onChange={e => setFormData({ ...formData, prize_pool: e.target.value })} /></div>
                        <div className="space-y-1"><Label className="text-[10px]">Jogadores</Label><Input type="number" min="0" max="48" className="bg-black/50 border-white/10" value={formData.max_players} onChange={e => setFormData({ ...formData, max_players: e.target.value })} placeholder="48" /></div>
                        <div className="space-y-1">
                            <Label className="text-[10px]">Distribuição</Label>
                            <select className="bg-black border border-white/10 text-xs rounded-md px-1 h-10 text-white w-full" value={formData.prize_distribution} onChange={e => {
                                const val = e.target.value;
                                setFormData({ ...formData, prize_distribution: val, prize_first: val === 'podium' ? "50" : "100", prize_second: val === 'podium' ? "30" : "0", prize_third: val === 'podium' ? "20" : "0" })
                            }}>
                                <option value="winner">Único</option>
                                <option value="podium">Pódio</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                        <div className="space-y-1"><Label className="text-[10px] text-green-400">1º Lugar (%)</Label><Input type="number" min="0" max="100" className="bg-black/80 border-white/10" value={formData.prize_first} onChange={e => setFormData({ ...formData, prize_first: e.target.value })} /></div>
                        {formData.prize_distribution === 'podium' && (
                            <>
                                <div className="space-y-1"><Label className="text-[10px] text-zinc-400">2º Lugar (%)</Label><Input type="number" min="0" max="100" className="bg-black/80 border-white/10" value={formData.prize_second} onChange={e => setFormData({ ...formData, prize_second: e.target.value })} /></div>
                                <div className="space-y-1"><Label className="text-[10px] text-orange-400">3º Lugar (%)</Label><Input type="number" min="0" max="100" className="bg-black/80 border-white/10" value={formData.prize_third} onChange={e => setFormData({ ...formData, prize_third: e.target.value })} /></div>
                            </>
                        )}
                    </div>

                    <div className="p-3 border border-white/10 rounded-lg bg-white/5 space-y-3">
                        <Label className="text-xs text-neon-green font-bold uppercase">Controle de Abertura</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-[10px] text-gray-400">Abre às:</Label><Input type="time" className="bg-black border-white/10" value={formData.open_time} onChange={e => setFormData({ ...formData, open_time: e.target.value })} /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-gray-400">Fecha às:</Label><Input type="time" className="bg-black border-white/10" value={formData.close_time} onChange={e => setFormData({ ...formData, close_time: e.target.value })} /></div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Switch checked={formData.is_open} onCheckedChange={c => setFormData({ ...formData, is_open: c })} className="data-[state=checked]:bg-neon-green" />
                            <Label className="text-xs cursor-pointer">{formData.is_open ? "Sala ABERTA AGORA (Verde)" : "Sala FECHADA (Vermelho)"}</Label>
                        </div>
                        <div>
                            <Input placeholder="Link/ID da Sala Free Fire" className="bg-black/50 border-white/10" value={formData.room_link} onChange={e => setFormData({ ...formData, room_link: e.target.value })} />
                            <p className="text-[10px] text-gray-500 mt-1">Coloque o ID completo que será liberado para os inscritos.</p>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <Label className="text-[10px] text-gray-400">Texto Extra Adicional (Opcional)</Label>
                            <Input placeholder="Ex: Apenas jogadores do Mobile!" className="bg-black/50 border-white/10" value={formData.extra_text} onChange={e => setFormData({ ...formData, extra_text: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-gray-400">Nível Máximo da Sala (Opcional)</Label>
                            <Input type="number" min="0" placeholder="Ex: 20" className="bg-black/50 border-white/10" value={formData.max_level} onChange={e => setFormData({ ...formData, max_level: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-gray-400">Cor do Botão de Destaque</Label>
                            <select className="bg-black border border-white/10 text-xs rounded-md px-2 h-10 text-white w-full" value={formData.button_color} onChange={e => setFormData({ ...formData, button_color: e.target.value })}>
                                <option value="orange">Laranja (Padrão)</option>
                                <option value="green">Verde</option>
                                <option value="blue">Azul</option>
                                <option value="pink">Rosa</option>
                                <option value="purple">Roxo</option>
                            </select>
                        </div>
                    </div>

                    <Button onClick={handleCreate} className="w-full bg-orange-600 hover:bg-orange-700 font-black tracking-widest">PUBLICAR TORNEIO</Button>
                </CardContent>
            </Card>

            <Tabs defaultValue="ativas" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#111] mb-2">
                    <TabsTrigger value="ativas" className="data-[state=active]:bg-neon-orange data-[state=active]:text-black text-gray-400">Salas Ativas</TabsTrigger>
                    <TabsTrigger value="historico" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Históricos</TabsTrigger>
                </TabsList>
                <TabsContent value="ativas" className="space-y-3 mt-2">
                    {tournaments.filter(t => !(t.title && t.title.startsWith('[ARQUIVADO]'))).map(t => (
                        <Card key={t.id} className="border-border bg-[#111] mb-3 overflow-hidden">
                            {editingId === t.id ? (
                                <div className="p-3 space-y-3 bg-white/5">
                                    <div className="flex justify-between"><span className="text-xs font-bold text-neon-orange">EDITANDO</span><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button></div>
                                    <div className="flex gap-2">
                                        <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} placeholder="Título" className="flex-1" />
                                        <select className="bg-black border border-white/10 text-xs rounded-md px-2 w-[100px] text-white h-10" value={editData.type} onChange={e => setEditData({ ...editData, type: e.target.value })}>
                                            <option value="SOLO">SOLO</option><option value="DUO">DUO</option><option value="SQUAD">SQUAD</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <Input type="number" value={editData.entry_fee} onChange={(e) => setEditData({ ...editData, entry_fee: e.target.value })} placeholder="Entrada" />
                                        <Input type="number" value={editData.prize_pool} onChange={(e) => setEditData({ ...editData, prize_pool: e.target.value })} placeholder="Prêmio" />
                                        <Input type="number" min="0" max="48" value={editData.max_players} onChange={(e) => setEditData({ ...editData, max_players: e.target.value })} placeholder="Vagas" />
                                        <select className="bg-black border border-white/10 text-[10px] rounded-md text-white w-full h-10 px-1" value={editData.prize_distribution} onChange={e => {
                                            const val = e.target.value;
                                            setEditData({ ...editData, prize_distribution: val, prize_first: val === 'podium' ? "50" : "100", prize_second: val === 'podium' ? "30" : "0", prize_third: val === 'podium' ? "20" : "0" });
                                        }}>
                                            <option value="winner">Único</option>
                                            <option value="podium">Pódio</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded border border-white/5">
                                        <Input type="number" min="0" max="100" value={editData.prize_first} onChange={(e) => setEditData({ ...editData, prize_first: e.target.value })} placeholder="1º (%)" />
                                        {editData.prize_distribution === 'podium' && (
                                            <>
                                                <Input type="number" min="0" max="100" value={editData.prize_second} onChange={(e) => setEditData({ ...editData, prize_second: e.target.value })} placeholder="2º (%)" />
                                                <Input type="number" min="0" max="100" value={editData.prize_third} onChange={(e) => setEditData({ ...editData, prize_third: e.target.value })} placeholder="3º (%)" />
                                            </>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input value={editData.extra_text} onChange={(e) => setEditData({ ...editData, extra_text: e.target.value })} placeholder="Texto Opcional" />
                                        <Input type="number" min="0" value={editData.max_level} onChange={(e) => setEditData({ ...editData, max_level: e.target.value })} placeholder="Nível Máx." />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input value={editData.room_link} onChange={(e) => setEditData({ ...editData, room_link: e.target.value })} placeholder="Link da Sala" />
                                        <Input type="datetime-local" value={editData.scheduled_at} onChange={(e) => setEditData({ ...editData, scheduled_at: e.target.value })} />
                                        <select className="bg-black border border-white/10 text-[10px] rounded-md text-white h-10 px-1" value={editData.button_color} onChange={e => setEditData({ ...editData, button_color: e.target.value })}>
                                            <option value="orange">Laranja</option>
                                            <option value="green">Verde</option>
                                            <option value="blue">Azul</option>
                                            <option value="pink">Rosa</option>
                                            <option value="purple">Roxo</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch checked={editData.is_open} onCheckedChange={c => setEditData({ ...editData, is_open: c })} /><Label>Aberta?</Label>
                                        <Input type="time" placeholder="Abre" value={editData.open_time} onChange={(e) => setEditData({ ...editData, open_time: e.target.value })} className="w-24 text-xs h-8 ml-2" />
                                        <Input type="time" placeholder="Fecha" value={editData.close_time} onChange={(e) => setEditData({ ...editData, close_time: e.target.value })} className="w-24 text-xs h-8" />
                                    </div>
                                    <Button onClick={handleSaveEdit} className="w-full bg-green-600">Salvar</Button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-3">
                                    <div>
                                        <p className="font-bold text-sm text-white flex items-center gap-2">
                                            {t.title}
                                            <span className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-neon-green shadow-[0_0_8px_#00ff00]' : 'bg-red-600 shadow-[0_0_8px_#ff0000]'}`}></span>
                                        </p>
                                        <p className="text-[10px] text-gray-500 mb-1">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : 'Sem data'} • {t.current_players}/{t.max_players} jogadores</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 border-white/20 ${t.button_color === 'green' ? 'text-green-500' : t.button_color === 'blue' ? 'text-blue-500' : t.button_color === 'pink' ? 'text-pink-500' : t.button_color === 'purple' ? 'text-purple-500' : 'text-orange-500'}`}>
                                                COR: {t.button_color || 'orange'}
                                            </Badge>
                                            {t.prize_distribution === 'podium' && (
                                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-yellow-400">1º: {t.prize_first}% | 2º: {t.prize_second}% | 3º: {t.prize_third}%</Badge>
                                            )}
                                            {t.prize_distribution !== 'podium' && (
                                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-blue-400">1º: {t.prize_first}%</Badge>
                                            )}
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-gray-400">MODO: {t.type || 'SQUAD'}</Badge>
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-gray-400">ENTRADA: R${t.entry_fee}</Badge>
                                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-gray-400">PRÊMIO: R${t.prize_pool}</Badge>
                                            {t.max_level && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-gray-400">NV MÁX: {t.max_level}</Badge>}
                                            {t.open_time && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-green-400">{t.open_time} as {t.close_time}</Badge>}
                                            {t.extra_text && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-white/20 text-gray-400 max-w-[200px] truncate" title={t.extra_text}>{t.extra_text}</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => handleSetFeatured(t.id)}><Star className={`h-4 w-4 ${t.is_featured ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`} /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-900/20" onClick={() => setDeleteModal(t)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </TabsContent>
                <TabsContent value="historico" className="space-y-3 mt-2">
                    {tournaments.filter(t => (t.title && t.title.startsWith('[ARQUIVADO]'))).map(t => (
                        <Card key={t.id} className="border-border bg-[#111] mb-3 overflow-hidden opacity-75">
                            <div className="flex justify-between items-center p-3">
                                <div>
                                    <p className="font-bold text-sm text-gray-400 flex items-center gap-2">
                                        {t.title}
                                    </p>
                                    <p className="text-[10px] text-gray-600">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : 'Sem data'}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="text-green-500 hover:bg-green-900/20" title="Restaurar" onClick={() => handleRestore(t.id, t.title)}><Archive className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-red-700 hover:bg-red-900/20" title="Destruir Permanentemente" onClick={() => handleRealDelete(t.id)}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>

            <Dialog open={!!deleteModal} onOpenChange={() => setDeleteModal(null)}>
                <DialogContent className="border-red-600/50 bg-[#0c0c0c] text-white">
                    <DialogHeader>
                        <div className="mx-auto bg-red-900/20 p-3 rounded-full mb-3 border border-red-900">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-black uppercase text-red-500">
                            EXCLUIR TORNEIO?
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-400 text-sm mt-2">
                            {deleteModal?.current_players > 0 ? (
                                <span className="text-red-400 font-bold block mb-2">ATENÇÃO: Este torneio tem {deleteModal.current_players} inscritos pagos!</span>
                            ) : null}
                            Tem certeza que deseja remover o torneio <strong className="text-white">{deleteModal?.title}</strong>? Ele deixará de aparecer para todos os usuários imediatamente e será movido para o histórico.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" className="border-white/10 bg-[#111] text-white flex-1" onClick={() => setDeleteModal(null)}>CANCELAR</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white flex-1 font-bold" onClick={confirmDelete}>ACEITAR, EXCLUIR</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- 2. SALAS AO VIVO ---
function AdminRooms() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [rooms, setRooms] = useState<any[]>([]);
    const [roomPlayerCounts, setRoomPlayerCounts] = useState<Record<string, number>>({});
    const [resultModal, setResultModal] = useState<any | null>(null);
    const [playersList, setPlayersList] = useState<any[]>([]);
    const [winnerId, setWinnerId] = useState("");
    const [podiumIds, setPodiumIds] = useState({ first: "", second: "", third: "" });
    const [calculatedPrize, setCalculatedPrize] = useState(0);
    const [uploadingPrint, setUploadingPrint] = useState(false);
    const [printUrl, setPrintUrl] = useState("");
    const [podiumPrints, setPodiumPrints] = useState({ first: "", second: "", third: "" });
    const [historyModal, setHistoryModal] = useState<any | null>(null);
    const [resultHistory, setResultHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchRooms = async () => {
        const { data } = await supabase.from("tournaments").select("*").order("scheduled_at", { ascending: false });
        if (data) setRooms(data);
    };

    // Fetch player counts for all rooms
    const fetchAllPlayerCounts = async (roomsList?: any[]) => {
        const targetRooms = roomsList || rooms;
        if (targetRooms.length === 0) return;
        const counts: Record<string, number> = {};
        await Promise.all(targetRooms.map(async (room) => {
            const { count } = await supabase.from("enrollments").select("*", { count: 'exact', head: true }).eq("tournament_id", room.id);
            counts[room.id] = count || 0;
        }));
        setRoomPlayerCounts(counts);
    };

    useEffect(() => {
        fetchRooms().then(() => { });
    }, []);

    useEffect(() => {
        if (rooms.length > 0) fetchAllPlayerCounts(rooms);
    }, [rooms]);

    // Realtime: update player counts when enrollments change
    useEffect(() => {
        const channel = supabase
            .channel('rooms-enrollment-counts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
                fetchAllPlayerCounts();
                // Also update playersList if result modal is open
                if (resultModal) {
                    refreshPlayersList(resultModal.id);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [rooms, resultModal]);

    const refreshPlayersList = async (tournamentId: string) => {
        const { data: enrollments } = await supabase
            .from("enrollments")
            .select("user_id")
            .eq("tournament_id", tournamentId);
        if (enrollments && enrollments.length > 0) {
            const userIds = enrollments.map(e => e.user_id);
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, nickname, freefire_id")
                .in("user_id", userIds);
            if (profiles) setPlayersList(profiles.map(p => ({ user_id: p.user_id, profiles: { nickname: p.nickname, freefire_id: p.freefire_id } })));
        } else {
            setPlayersList([]);
        }
    };

    const openGame = (link: string) => {
        if (!link) return alert("Sem link cadastrado.");
        window.open(link, "_blank");
    };

    const handleOpenResult = async (room: any) => {
        setResultModal(room);
        setWinnerId("");
        setPodiumIds({ first: "", second: "", third: "" });
        setPrintUrl("");
        setPodiumPrints({ first: "", second: "", third: "" });

        // Dynamic Prize Recalculation
        const count = roomPlayerCounts[room.id] ?? room.current_players;
        const max = room.max_players || 48;
        let finalPrize = Number(room.prize_pool);
        if (count < max) finalPrize = (count * Number(room.entry_fee)) * 0.70;
        setCalculatedPrize(finalPrize);

        await refreshPlayersList(room.id);
    };

    // Realtime: update player list when someone enrolls (kept for backward compat)
    useEffect(() => {
        const channel = supabase
            .channel('rooms-participants-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, async () => {
                if (resultModal) {
                    await refreshPlayersList(resultModal.id);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [resultModal]);

    const handlePrintUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'single' | 'first' | 'second' | 'third' = 'single') => {
        try {
            setUploadingPrint(true);
            const file = e.target.files?.[0];
            if (!file) {
                setUploadingPrint(false);
                return;
            }

            const fileExt = file.name.split('.').pop() || 'png';
            const filePath = `${user?.id}/result_${resultModal.id}_${target}_${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage.from('profile_proofs').upload(filePath, file, {
                upsert: true,
                contentType: file.type || 'image/png'
            });

            if (error) {
                console.error("Storage upload details:", error);
                throw error;
            }

            const { data } = supabase.storage.from('profile_proofs').getPublicUrl(filePath);

            if (target === 'single') setPrintUrl(data.publicUrl);
            else setPodiumPrints(prev => ({ ...prev, [target]: data.publicUrl }));

            toast({ title: "Arquivo Carregado!" });
        } catch (err: any) {
            console.error("Upload process error:", err);
            toast({ variant: "destructive", title: "Erro no upload da imagem", description: err.message || "Tente novamente mais tarde." });
        }
        finally { setUploadingPrint(false); }
    };

    const handleConfirmResult = async () => {
        let winnersData = [];
        if (resultModal.prize_distribution === 'podium') {
            if (!podiumIds.first || !podiumIds.second || !podiumIds.third || !podiumPrints.first || !podiumPrints.second || !podiumPrints.third) {
                return toast({ variant: "destructive", title: "Selecione o pódio e envie as 3 fotos." });
            }
            if (new Set([podiumIds.first, podiumIds.second, podiumIds.third]).size !== 3) return toast({ variant: "destructive", title: "Jogadores duplicados no pódio." });
            winnersData.push({ id: podiumIds.first, amount: calculatedPrize * (resultModal.prize_first / 100 || 0.60), place: 1, print: podiumPrints.first });
            winnersData.push({ id: podiumIds.second, amount: calculatedPrize * (resultModal.prize_second / 100 || 0.25), place: 2, print: podiumPrints.second });
            winnersData.push({ id: podiumIds.third, amount: calculatedPrize * (resultModal.prize_third / 100 || 0.15), place: 3, print: podiumPrints.third });
        } else {
            if (!winnerId || !printUrl) return toast({ variant: "destructive", title: "Selecione o vencedor e envie o print." });
            winnersData.push({ id: winnerId, amount: calculatedPrize, place: 1, print: printUrl });
        }

        const count = roomPlayerCounts[resultModal.id] ?? resultModal.current_players;
        const totalMontante = count * Number(resultModal.entry_fee);
        const platformTax = totalMontante * 0.30;

        try {
            // Registra o Caixa da Plataforma
            await supabase.from("audit_logs").insert({
                admin_id: user?.id,
                action_type: 'platform_profit',
                details: `Lucro da Sala ${resultModal.title}: R$ ${platformTax.toFixed(2)} (Taxa de 30% do montante total de R$ ${totalMontante.toFixed(2)})`
            });

            // Marca o Torneio como finalizado e salva o financeiro da sala
            await supabase.from("tournaments").update({ status: 'finished', prize_pool: calculatedPrize, platform_tax: platformTax }).eq("id", resultModal.id);

            for (const win of winnersData) {
                const winner = playersList.find(p => p.user_id === win.id);
                // 1. Atualiza Saldo, Ganhos Totais e Vitórias do Vencedor
                const { data: profile } = await supabase.from("profiles").select("saldo, total_winnings, victories").eq("user_id", win.id).single();
                if (profile) {
                    await supabase.from("profiles").update({
                        saldo: Number(profile.saldo) + win.amount,
                        total_winnings: Number(profile.total_winnings || 0) + win.amount,
                        victories: Number(profile.victories || 0) + 1
                    }).eq("user_id", win.id);
                }

                // 2. SALVA NO HISTÓRICO
                const { error: insertErr } = await (supabase as any).from("tournament_results").insert({
                    tournament_id: resultModal.id,
                    winner_user_id: win.id,
                    print_url: win.print,
                    prize_amount: win.amount,
                    admin_id: user?.id,
                    place: win.place
                });

                if (insertErr) {
                    console.error("Erro do Banco no Histórico:", insertErr);
                    throw new Error("Erro de permissão no Banco (RLS) ao salvar histórico.");
                }

                // 4. Registra no Log de Auditoria
                await supabase.from("audit_logs").insert({
                    admin_id: user?.id,
                    action_type: 'tournament_result',
                    details: `Finalizou ${resultModal.title} (${win.place}º Lugar). Vencedor: ${winner?.profiles?.nickname} (R$ ${win.amount.toFixed(2)})`
                });

                // DISPARO DE PUSH: Notifica especificamente
                await sendPushNotification(
                    'ply_finance_done',
                    `🏆 Você ficou no ${win.place}º Lugar!`,
                    `Parabéns ${winner?.profiles?.nickname}! Seu prêmio de R$ ${win.amount.toFixed(2)} já está no seu saldo!`,
                    [win.id]
                );
            }

            // 3. Marca o Torneio como finalizado e ARQUIVA
            await supabase.from("tournaments").update({
                status: 'finished',
                title: `[ARQUIVADO] ${resultModal.title}`
            }).eq("id", resultModal.id);

            // Atualiza estado local para refletir na aba Histórico imediatamente
            setRooms(prevRooms => prevRooms.map(r => r.id === resultModal.id ? { ...r, status: 'finished', title: `[ARQUIVADO] ${resultModal.title}` } : r));

            toast({ title: "Resultado Lançado!", description: "Prêmio enviado, histórico salvo e caixa registrado." });
            setResultModal(null);
            fetchRooms(); // Recarrega a lista de salas
        } catch (err: any) {
            console.error(err);
            toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
        }
    };

    const handleOpenHistory = async (room: any) => {
        setHistoryModal(room);
        setHistoryLoading(true);
        // Fetch all results for this tournament
        const { data: results } = await (supabase as any)
            .from("tournament_results")
            .select("*")
            .eq("tournament_id", room.id)
            .order("created_at", { ascending: false });

        if (results && results.length > 0) {
            const winnerIds = [...new Set(results.map((r: any) => r.winner_user_id))] as string[];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, nickname, freefire_id, avatar_url")
                .in("user_id", winnerIds);
            const profileMap: Record<string, any> = {};
            profiles?.forEach(p => { profileMap[p.user_id] = p; });
            setResultHistory(results.map(r => ({ ...r, winner_profile: profileMap[r.winner_user_id] || null })));
        } else {
            setResultHistory([]);
        }
        setHistoryLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="bg-orange-900/20 border border-orange-500/30 p-3 rounded-lg flex items-center gap-3">
                <Eye className="text-orange-500 h-5 w-5" />
                <p className="text-xs text-orange-200">Clique em "Assistir" para abrir o jogo. Use "Lançar Resultado" para finalizar e pagar.</p>
            </div>
            <Tabs defaultValue="ativas" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#111] mb-2">
                    <TabsTrigger value="ativas" className="data-[state=active]:bg-neon-orange data-[state=active]:text-black text-gray-400">Salas Ativas</TabsTrigger>
                    <TabsTrigger value="historico" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Histórico de Salas</TabsTrigger>
                </TabsList>

                <TabsContent value="ativas" className="space-y-3 mt-2">
                    {rooms.filter(room => !(room.title && room.title.startsWith('[ARQUIVADO]'))).map(room => {
                        const isLive = room.scheduled_at && new Date() >= new Date(room.scheduled_at) && new Date() < new Date(new Date(room.scheduled_at).getTime() + 60 * 60 * 1000);
                        const liveCount = roomPlayerCounts[room.id] ?? room.current_players;
                        return (
                            <Card key={room.id} className={`bg-[#0c0c0c] border ${isLive ? 'border-neon-green shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'border-white/5'}`}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                {room.title}
                                                {isLive && <Badge className="bg-red-600 animate-pulse text-[10px]">AO VIVO</Badge>}
                                            </h4>
                                            <p className="text-xs text-gray-500">ID Sala: {room.room_link || "Não definido"}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-gray-400">Prêmio Máx. Estimado</p>
                                            <p className="text-neon-green font-bold">R$ {Number(room.prize_pool).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                            <Users className="h-4 w-4 text-neon-orange" />
                                            <div>
                                                <div className="text-xs font-bold text-white">{liveCount} <span className="text-[10px] text-gray-400 font-normal">/ {room.max_players} instritos</span></div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg px-2 py-1 flex flex-col justify-center">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400">Total Entradas:</span>
                                                <span className="text-white font-bold">R$ {(liveCount * Number(room.entry_fee)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400">Taxa Plat (30%):</span>
                                                <span className="text-orange-500 font-bold">R$ {((liveCount * Number(room.entry_fee)) * 0.3).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button size="sm" onClick={() => openGame(room.room_link)} className="bg-white/10 text-white hover:bg-white/20">
                                            <Eye className="mr-1 h-4 w-4" /> Assistir
                                        </Button>
                                        <Button size="sm" onClick={() => handleOpenResult(room)} className="bg-yellow-600 text-black font-bold hover:bg-yellow-700">
                                            <Trophy className="mr-1 h-4 w-4" /> Resultado
                                        </Button>
                                        <Button size="sm" onClick={() => handleOpenHistory(room)} className="bg-blue-600/80 text-white hover:bg-blue-700">
                                            <History className="mr-1 h-4 w-4" /> Histórico
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </TabsContent>

                <TabsContent value="historico" className="space-y-3 mt-2">
                    {rooms.filter(room => (room.title && room.title.startsWith('[ARQUIVADO]'))).map(room => {
                        const isLive = room.scheduled_at && new Date() >= new Date(room.scheduled_at) && new Date() < new Date(new Date(room.scheduled_at).getTime() + 60 * 60 * 1000);
                        const liveCount = roomPlayerCounts[room.id] ?? room.current_players;
                        return (
                            <Card key={room.id} className={`bg-[#0c0c0c] border border-white/5 opacity-70`}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-gray-400 flex items-center gap-2">
                                                {room.title}
                                            </h4>
                                            <p className="text-xs text-gray-600">ID Sala: {room.room_link || "Não definido"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Prêmio Original</p>
                                            <p className="text-gray-400 font-bold">R$ {room.prize_pool}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs font-bold text-gray-400">{liveCount}</span>
                                        <span className="text-[10px] text-gray-600">/ {room.max_players} jogadores na sala</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button size="sm" onClick={() => handleOpenHistory(room)} className="bg-blue-600/50 text-white hover:bg-blue-700/50 w-full">
                                            <History className="mr-1 h-4 w-4" /> Ver Histórico de Resultados Salvos
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </TabsContent>
            </Tabs>

            {/* Result Modal */}
            <Dialog open={!!resultModal} onOpenChange={() => setResultModal(null)}>
                <DialogContent className="bg-[#111] border-yellow-600/50 text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-yellow-500 flex items-center gap-2"><Trophy /> Finalizar Partida</DialogTitle>
                        <DialogDescription className="text-gray-400">Selecione o ganhador. O prêmio será transferido automaticamente.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-lg px-3 py-2">
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-neon-orange" />
                                    <span className="text-sm font-bold text-white">{playersList.length}</span>
                                </div>
                                <span className="text-[10px] text-gray-400">inscritos (Lot: {resultModal?.max_players})</span>
                            </div>
                            <div className="text-right text-[10px] flex flex-col justify-center">
                                <p className="text-gray-400 flex justify-between"><span>Arrecadação Total:</span> <span className="text-white">R$ {(playersList.length * Number(resultModal?.entry_fee || 0)).toFixed(2)}</span></p>
                                <p className="text-gray-400 flex justify-between"><span>Lucro Plat (30%):</span> <span className="text-neon-orange font-bold">R$ {((playersList.length * Number(resultModal?.entry_fee || 0)) * 0.3).toFixed(2)}</span></p>
                                <p className="text-gray-400 flex justify-between pt-1 mt-1 border-t border-white/10"><span>Prêmio Final Sala:</span> <span className="text-neon-green font-bold">R$ {calculatedPrize.toFixed(2)}</span></p>
                            </div>
                        </div>

                        {resultModal?.prize_distribution === 'podium' ? (
                            <div className="space-y-3">
                                <Label className="text-xs text-yellow-500 font-bold uppercase block text-center mb-1">Distribuição do Pódio - Prêmio Total: R$ {calculatedPrize.toFixed(2)}</Label>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-gray-400">🥇 1º Lugar (60% = R$ {(calculatedPrize * 0.60).toFixed(2)})</Label>
                                    <select className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white" onChange={(e) => setPodiumIds({ ...podiumIds, first: e.target.value })} value={podiumIds.first}>
                                        <option value="">Selecione o 1º Colocado...</option>
                                        {playersList.map(p => (<option key={p.user_id} value={p.user_id}>{p.profiles?.nickname} (ID: {p.profiles?.freefire_id})</option>))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-gray-400">🥈 2º Lugar (25% = R$ {(calculatedPrize * 0.25).toFixed(2)})</Label>
                                    <select className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white" onChange={(e) => setPodiumIds({ ...podiumIds, second: e.target.value })} value={podiumIds.second}>
                                        <option value="">Selecione o 2º Colocado...</option>
                                        {playersList.map(p => (<option key={p.user_id} value={p.user_id}>{p.profiles?.nickname} (ID: {p.profiles?.freefire_id})</option>))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-gray-400">🥉 3º Lugar (15% = R$ {(calculatedPrize * 0.15).toFixed(2)})</Label>
                                    <select className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white" onChange={(e) => setPodiumIds({ ...podiumIds, third: e.target.value })} value={podiumIds.third}>
                                        <option value="">Selecione o 3º Colocado...</option>
                                        {playersList.map(p => (<option key={p.user_id} value={p.user_id}>{p.profiles?.nickname} (ID: {p.profiles?.freefire_id})</option>))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-xs">Quem deu Booyah? (Prêmio Único: R$ {calculatedPrize.toFixed(2)})</Label>
                                <select className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white" onChange={(e) => setWinnerId(e.target.value)} value={winnerId}>
                                    <option value="">Selecione o Jogador...</option>
                                    {playersList.map(p => (
                                        <option key={p.user_id} value={p.user_id}>{p.profiles?.nickname} (ID: {p.profiles?.freefire_id})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {resultModal?.prize_distribution === 'podium' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                {(['first', 'second', 'third'] as const).map((pos, idx) => (
                                    <div key={pos} className="space-y-1">
                                        <Label className="text-[10px] text-gray-500 uppercase">{idx + 1}º Lugar Print</Label>
                                        <div className="border border-dashed border-white/20 rounded-lg p-2 text-center hover:bg-white/5 relative h-20 flex items-center justify-center overflow-hidden group">
                                            <input type="file" accept="image/*" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-50 block" onChange={(e) => handlePrintUpload(e, pos)} disabled={uploadingPrint} />
                                            {podiumPrints[pos] ? <p className="text-green-500 text-[10px] font-bold relative z-10">OK</p> : <div className="text-gray-500 text-[9px] relative z-10 group-hover:text-white transition-colors"><Upload className="h-4 w-4 mx-auto mb-1" />Upload</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Print da Vitória (Obrigatório)</Label>
                                <div className="border border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 relative group transition-all overflow-hidden">
                                    <input type="file" accept="image/*" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-50 block" onChange={(e) => handlePrintUpload(e, 'single')} disabled={uploadingPrint} />
                                    {uploadingPrint ? (
                                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-neon-orange relative z-10" />
                                    ) : printUrl ? (
                                        <div className="flex flex-col items-center relative z-10">
                                            <Check className="h-8 w-8 text-neon-green mb-1" />
                                            <p className="text-neon-green text-[10px] font-black uppercase">Imagem Carregada!</p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-500 group-hover:text-white transition-colors relative z-10">
                                            <Upload className="h-8 w-8 mx-auto mb-2 opacity-30 group-hover:opacity-100" />
                                            <p className="text-[10px] font-black uppercase tracking-tighter">Clique para enviar o resultado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleConfirmResult}
                            className="w-full bg-neon-orange hover:bg-orange-600 text-white font-black uppercase py-6 rounded-2xl shadow-[0_0_20px_rgba(255,85,0,0.3)]"
                            disabled={uploadingPrint || ((resultModal?.prize_distribution !== 'podium' && (!winnerId || !printUrl)) || (resultModal?.prize_distribution === 'podium' && (!podiumIds.first || !podiumIds.second || !podiumIds.third || !podiumPrints.first || !podiumPrints.second || !podiumPrints.third)))}
                        >
                            {uploadingPrint ? "AGUARDE UPLOAD..." : "FINALIZAR E PAGAR PRÊMIOS"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Modal */}
            <Dialog open={!!historyModal} onOpenChange={() => setHistoryModal(null)}>
                <DialogContent className="bg-[#111] border-blue-600/50 text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-blue-400 flex items-center gap-2"><History /> Histórico dos Resultados</DialogTitle>
                        <DialogDescription className="text-gray-400">{historyModal?.title}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {historyLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-blue-400" /></div>
                        ) : resultHistory.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-8">Nenhum resultado registrado para esta sala.</p>
                        ) : (
                            resultHistory.map(result => (
                                <div key={result.id} className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                                    <img src={result.print_url} alt="Print do resultado" className="w-full max-h-72 object-contain bg-black" />
                                    <div className="p-3 flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-neon-orange/20 border border-neon-orange/40 flex items-center justify-center text-neon-orange font-bold text-sm shrink-0">
                                            {result.winner_profile?.avatar_url ? (
                                                <img src={result.winner_profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                result.winner_profile?.nickname?.charAt(0)?.toUpperCase() || "?"
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">
                                                {result.place && <span className="text-yellow-500 mr-1">{result.place}º Lugar - </span>}
                                                {result.winner_profile?.nickname || "Jogador"}
                                            </p>
                                            <p className="text-[10px] text-gray-400">ID: {result.winner_profile?.freefire_id || "N/A"}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-neon-green font-bold text-sm bg-black/50 px-2 py-0.5 rounded-md inline-block">Pago: R$ {Number(result.prize_amount).toFixed(2)}</p>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                                                Finalização: {new Date(result.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- 3. JOGADORES (COM EDITAR, APAGAR, BLOQUEAR, BANIR) ---
function AdminUsers() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [activeFilter, setActiveFilter] = useState<"all" | "banned" | "chat_banned" | "locked">("all");
    const [editMode, setEditMode] = useState(false);
    const [editFields, setEditFields] = useState({
        full_name: "",
        cpf: "",
        email: "",
        nickname: "",
        freefire_id: "",
        freefire_level: "",
        saldo: "",
        avatar_url: "",
        freefire_proof_url: ""
    });

    const [totalCounts, setTotalCounts] = useState({ all: 0, banned: 0, chat_banned: 0, locked: 0 });

    const fetchStats = async () => {
        const { count: all } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
        const { count: banned } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("is_app_banned", true);
        const { count: chat_banned } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("is_chat_banned", true);
        const { count: locked } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("is_balance_locked", true);
        setTotalCounts({ all: all || 0, banned: banned || 0, chat_banned: chat_banned || 0, locked: locked || 0 });
    };

    const fetchUsers = async () => {
        let query = supabase.from("profiles").select("*");

        // Aplicar busca se houver termo
        if (searchTerm) {
            query = query.or(`nickname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,freefire_id.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
        }

        // Aplicar filtros de situação (Pastas)
        if (activeFilter === "banned") query = query.eq("is_app_banned", true);
        else if (activeFilter === "chat_banned") query = query.eq("is_chat_banned", true);
        else if (activeFilter === "locked") query = query.eq("is_balance_locked", true);

        const { data } = await query.order("created_at", { ascending: false }).limit(100);
        if (data) setUsers(data);
        fetchStats();
    };

    useEffect(() => {
        const timer = setTimeout(fetchUsers, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, activeFilter]);

    const openUser = (user: any) => {
        setSelectedUser(user);
        setEditMode(false);
        setEditFields({
            full_name: user.full_name || "",
            cpf: user.cpf || "",
            email: user.email || "",
            nickname: user.nickname || "",
            freefire_id: user.freefire_id || "",
            freefire_level: String(user.freefire_level || ""),
            saldo: String(user.saldo || 0),
            avatar_url: user.avatar_url || "",
            freefire_proof_url: user.freefire_proof_url || "",
        });
    };

    const handleAdminEditUser = async () => {
        if (!selectedUser) return;
        const { error } = await supabase.from("profiles").update({
            full_name: editFields.full_name,
            cpf: editFields.cpf,
            email: editFields.email,
            nickname: editFields.nickname,
            freefire_id: editFields.freefire_id,
            freefire_level: editFields.freefire_level ? parseInt(editFields.freefire_level) : null,
            saldo: parseFloat(editFields.saldo) || 0,
            avatar_url: editFields.avatar_url,
            freefire_proof_url: editFields.freefire_proof_url,
        }).eq("user_id", selectedUser.user_id);
        if (error) return toast({ variant: "destructive", title: "Erro", description: error.message });

        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_edit_user",
            details: `Admin editou perfil de ${selectedUser.nickname}: Nome=${editFields.full_name}, CPF=${editFields.cpf}, Email=${editFields.email}`
        });
        toast({ title: "Perfil atualizado!" });
        setEditMode(false);

        const updatedUser = {
            ...selectedUser,
            ...editFields,
            freefire_level: editFields.freefire_level ? parseInt(editFields.freefire_level) : null,
            saldo: parseFloat(editFields.saldo) || 0
        };

        // Atualiza o usuário selecionado no modal sem fechar
        setSelectedUser(updatedUser);

        // Atualiza a grid atrás sem precisar recarregar tudo bruscamente do server
        setUsers(users.map(u => u.user_id === selectedUser.user_id ? updatedUser : u));
    };

    const handleDeleteUser = async () => {
        if (!selectedUser || !confirm(`Tem certeza que deseja APAGAR o jogador ${selectedUser.nickname}?`)) return;
        await supabase.from("profiles").delete().eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_delete_user",
            details: `Admin apagou perfil de ${selectedUser.nickname} (${selectedUser.email})`
        });
        toast({ variant: "destructive", title: "Usuário removido" });
        setSelectedUser(null);
        fetchUsers();
    };

    const handleBlockBalance = async () => {
        if (!selectedUser) return;
        await supabase.from("profiles").update({ saldo: 0 }).eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_block_balance",
            details: `Admin bloqueou saldo de ${selectedUser.nickname} (R$${Number(selectedUser.saldo).toFixed(2)} → R$0.00)`
        });
        toast({ title: "Saldo bloqueado (zerado)" });
        setSelectedUser({ ...selectedUser, saldo: 0 });
        fetchUsers();
    };

    const handleToggleChatBan = async () => {
        if (!selectedUser) return;
        const newStatus = !selectedUser.is_chat_banned;
        if (!confirm(`Tem certeza que deseja ${newStatus ? 'BANIR' : 'DESBANIR'} o jogador ${selectedUser.nickname} do Chat Global?`)) return;
        await supabase.from("profiles").update({ is_chat_banned: newStatus }).eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_chat_ban",
            details: `Admin ${newStatus ? 'baniu' : 'desbaniu'} o jogador ${selectedUser.nickname} do Chat Global`
        });
        toast({ title: `Jogador ${newStatus ? 'banido' : 'desbanido'} do Chat Global!` });
        setSelectedUser({ ...selectedUser, is_chat_banned: newStatus });
        fetchUsers();
    };

    const handleToggleAppBan = async () => {
        if (!selectedUser) return;
        const newStatus = !selectedUser.is_app_banned;
        if (!confirm(`Tem certeza que deseja ${newStatus ? 'BANIR O ACESSO' : 'RESTAURAR O ACESSO'} do jogador ${selectedUser.nickname} do aplicativo?`)) return;

        let updateData: any = { is_app_banned: newStatus };
        if (newStatus) updateData.saldo = 0;

        await supabase.from("profiles").update(updateData).eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: newStatus ? "admin_app_ban" : "admin_app_unban",
            details: `Admin ${newStatus ? 'BANIU' : 'RESTAUROU'} o acesso de ${selectedUser.nickname} no Aplicativo Inteiro`
        });
        toast({ title: `Acesso ao aplicativo ${newStatus ? 'bloqueado' : 'restaurado'}!` });
        setSelectedUser({ ...selectedUser, is_app_banned: newStatus, saldo: newStatus ? 0 : selectedUser.saldo });
        fetchUsers();
    };

    const handleToggleBalanceLock = async () => {
        if (!selectedUser) return;
        const newStatus = !selectedUser.is_balance_locked;
        if (!confirm(`Tem certeza que deseja ${newStatus ? 'TRANCAR' : 'DESTRANCAR'} o saldo do jogador ${selectedUser.nickname}? Ele não poderá jogar nem sacar.`)) return;

        await supabase.from("profiles").update({ is_balance_locked: newStatus }).eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: newStatus ? "admin_lock_balance" : "admin_unlock_balance",
            details: `Admin ${newStatus ? 'TRANCOU' : 'DESTRANCOU'} o saldo de ${selectedUser.nickname}`
        });
        toast({ title: `Saldo ${newStatus ? 'Trancado' : 'Livre para uso'}!` });
        setSelectedUser({ ...selectedUser, is_balance_locked: newStatus });
        fetchUsers();
    };

    const filteredUsers = users.filter(user => {
        if (activeFilter === "banned") return user.is_app_banned;
        if (activeFilter === "chat_banned") return user.is_chat_banned;
        if (activeFilter === "locked") return user.is_balance_locked;
        return true;
    });

    const stats = {
        all: totalCounts.all,
        banned: totalCounts.banned,
        chat_banned: totalCounts.chat_banned,
        locked: totalCounts.locked
    };

    return (
        <div className="space-y-6">
            {/* Punishment Boxes / Information Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    onClick={() => setActiveFilter("all")}
                    className={`p-4 rounded-3xl border ${activeFilter === "all" ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5'} cursor-pointer transition-all hover:bg-white/5`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-[10px] font-black uppercase text-gray-500">Todos os Jogadores</span>
                    </div>
                    <p className="text-xl font-black text-white">{stats.all}</p>
                </div>
                <div
                    onClick={() => setActiveFilter("banned")}
                    className={`p-4 rounded-3xl border ${activeFilter === "banned" ? 'bg-red-900/20 border-red-500' : 'bg-black/40 border-white/5'} cursor-pointer transition-all hover:bg-red-500/10`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Ban className="h-4 w-4 text-red-500" />
                        <span className="text-[10px] font-black uppercase text-red-500">Banidos App</span>
                    </div>
                    <p className="text-xl font-black text-white">{stats.banned}</p>
                </div>
                <div
                    onClick={() => setActiveFilter("chat_banned")}
                    className={`p-4 rounded-3xl border ${activeFilter === "chat_banned" ? 'bg-orange-900/20 border-orange-500' : 'bg-black/40 border-white/5'} cursor-pointer transition-all hover:bg-orange-500/10`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        <span className="text-[10px] font-black uppercase text-orange-500">Mudos Chat</span>
                    </div>
                    <p className="text-xl font-black text-white">{stats.chat_banned}</p>
                </div>
                <div
                    onClick={() => setActiveFilter("locked")}
                    className={`p-4 rounded-3xl border ${activeFilter === "locked" ? 'bg-yellow-900/20 border-yellow-500' : 'bg-black/40 border-white/5'} cursor-pointer transition-all hover:bg-yellow-500/10`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-yellow-500" />
                        <span className="text-[10px] font-black uppercase text-yellow-500">Trancados</span>
                    </div>
                    <p className="text-xl font-black text-white">{stats.locked}</p>
                </div>
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="relative mt-8 mb-4">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Pesquisar por Nome, Nick, Email, CPF ou FreeFire ID..."
                    className="pl-14 bg-black/40 border-white/10 text-white rounded-2xl h-14 font-medium text-sm focus:border-neon-orange/50 transition-all shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Players List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <Search className="h-10 w-10 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 font-bold uppercase text-[10px]">Nenhum jogador encontrado nesta categoria</p>
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <Card
                            key={user.id}
                            className={`group bg-[#0a0a0a] border-white/5 hover:border-neon-orange/20 transition-all cursor-pointer overflow-hidden rounded-[2rem] shadow-xl ${user.nickname?.includes('[BANIDO]') ? 'opacity-50 grayscale' : ''}`}
                            onClick={() => openUser(user)}
                        >
                            <CardContent className="p-0">
                                <div className="p-5 flex items-start gap-4">
                                    <div className="relative shrink-0">
                                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-white/10 overflow-hidden shadow-2xl transition-transform group-hover:scale-105">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} className="h-full w-full object-cover" alt={user.nickname} />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-600 bg-white/5">
                                                    <Users size={24} />
                                                </div>
                                            )}
                                        </div>
                                        {user.is_app_banned && (
                                            <div className="absolute top-0 right-0 left-0 bottom-0 bg-red-900/80 backdrop-blur-[2px] rounded-2xl border-4 border-[#0a0a0a] flex items-center justify-center flex-col" title="Banido do App">
                                                <Ban className="h-6 w-6 text-white mb-1 drop-shadow-md" />
                                                <span className="text-[8px] font-black tracking-widest text-white uppercase bg-black/50 px-2 py-0.5 rounded-full">Exilado</span>
                                            </div>
                                        )}
                                        {user.is_chat_banned && !user.is_app_banned && (
                                            <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1.5 border-2 border-[#0a0a0a] shadow-[0_0_10px_rgba(255,0,0,0.5)]" title="Banido do Chat">
                                                <MessageSquare className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                        {user.is_balance_locked && !user.is_app_banned && (
                                            <div className="absolute -bottom-1 -right-1 bg-yellow-600 rounded-full p-1.5 border-2 border-[#0a0a0a] shadow-[0_0_10px_rgba(255,150,0,0.5)]" title="Saldo Trancado">
                                                <Lock className="h-3 w-3 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-black text-white uppercase italic truncate text-base leading-none group-hover:text-neon-orange transition-colors">
                                                {user.nickname || "N/A"}
                                            </h4>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase text-neon-green border-neon-green/20 bg-neon-green/5">
                                                R$ {Number(user.saldo).toFixed(2)}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase truncate mt-1">{user.email}</p>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1">
                                                <Shield className="h-3 w-3 text-neon-orange" />
                                                <span className="text-[10px] font-mono text-white/70">ID: {user.freefire_id || "?"}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Zap className="h-3 w-3 text-yellow-500" />
                                                <span className="text-[10px] font-bold text-white/50">NV.{user.freefire_level || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Trophy className="h-3 w-3 text-neon-green" />
                                                <span className="text-[10px] font-black text-neon-green">{user.victories || 0}V</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Dossier Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="bg-[#050505] border-white/5 text-white w-[98%] max-w-4xl rounded-[2.5rem] max-h-[92vh] overflow-y-auto shadow-2xl p-0">
                    {selectedUser && (
                        <div className="flex flex-col">
                            {/* Injected Header for Accessibility */}
                            <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <DialogTitle className="text-2xl font-black uppercase text-white truncate">Dossiê do Jogador</DialogTitle>
                                    <DialogDescription className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Controle Administrativo Total</DialogDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} className="h-10 w-10 rounded-full hover:bg-white/5 border border-white/5"><X size={18} /></Button>
                            </DialogHeader>

                            {/* Dialog Header / Profile Hero */}
                            <div className="relative h-32 bg-gradient-to-r from-neon-orange/20 to-transparent">
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
                                <div className="absolute bottom-0 left-0 w-full p-8 flex items-end gap-6 translate-y-1/2">
                                    <div className="relative">
                                        <div className="w-28 h-28 rounded-[2rem] bg-black border-4 border-[#050505] overflow-hidden shadow-2xl shrink-0">
                                            {selectedUser.avatar_url ? (
                                                <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt={selectedUser.nickname} />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-800 bg-white/5">
                                                    <Users size={48} />
                                                </div>
                                            )}
                                        </div>
                                        <Badge className="absolute -bottom-2 right-0 bg-neon-orange text-black font-black uppercase text-[10px] tracking-widest px-3 py-1 border-4 border-[#050505]">
                                            NV. {selectedUser.freefire_level || 0}
                                        </Badge>
                                    </div>
                                    <div className="mb-2">
                                        <h2 className="text-3xl font-black uppercase italic text-white flex gap-2 leading-none items-center flex-wrap">
                                            {selectedUser.nickname || "N/A"}
                                            {selectedUser.is_app_banned && <Badge variant="destructive" className="ml-2 font-black tracking-widest shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-pulse">BANIDO APP</Badge>}
                                        </h2>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">{selectedUser.email || "E-mail não informado"}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 text-white hover:bg-white/5 rounded-full z-[60]"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="pt-24 px-8 pb-10 space-y-8">
                                {!editMode ? (
                                    <>
                                        {/* EMERGENCY ACTIONS - FORCED TOP VISIBILITY */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                onClick={() => setEditMode(true)}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-16 rounded-[1.5rem] font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                                            >
                                                <Edit size={22} /> Editar Perfil e Dados
                                            </Button>
                                            <Button
                                                onClick={handleBlockBalance}
                                                variant="outline"
                                                className="flex-1 border-2 border-red-500/50 text-red-500 hover:bg-red-500/10 h-16 rounded-[1.5rem] font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-900/10"
                                            >
                                                <DollarSign size={22} /> Zerar Saldo Total
                                            </Button>
                                        </div>

                                        <div className="h-4"></div> {/* Spacer */}

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl group hover:bg-white/[0.04] transition-all">
                                                <DollarSign className="text-neon-green h-4 w-4 mb-2" />
                                                <p className="text-[10px] text-gray-500 font-black uppercase">Saldo Atual</p>
                                                <p className="text-xl font-black text-neon-green">R$ {Number(selectedUser.saldo || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl group hover:bg-white/[0.04] transition-all">
                                                <Trophy className="text-yellow-500 h-4 w-4 mb-2" />
                                                <p className="text-[10px] text-gray-500 font-black uppercase">Winnings</p>
                                                <p className="text-xl font-black text-white">R$ {Number(selectedUser.total_winnings || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl group hover:bg-white/[0.04] transition-all">
                                                <CheckCircle2 className="text-neon-orange h-4 w-4 mb-2" />
                                                <p className="text-[10px] text-gray-500 font-black uppercase">Vitórias</p>
                                                <p className="text-xl font-black text-white">{selectedUser.victories || 0}</p>
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl group hover:bg-white/[0.04] transition-all">
                                                <Gamepad2 className="text-blue-500 h-4 w-4 mb-2" />
                                                <p className="text-[10px] text-gray-500 font-black uppercase">Torneios</p>
                                                <p className="text-xl font-black text-white">{selectedUser.tournaments_played || 0}</p>
                                            </div>
                                        </div>

                                        {/* Personal Data Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-black text-neon-orange uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <UserCog className="h-3 w-3" /> Identidade e Perfil
                                                </h5>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome Real</span>
                                                        <span className="text-xs font-black text-white uppercase italic">{selectedUser.full_name || "—"}</span>
                                                    </div>
                                                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documento (CPF)</span>
                                                        <span className="text-xs font-mono font-bold text-white tracking-widest">{selectedUser.cpf || "—"}</span>
                                                    </div>
                                                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cadastro</span>
                                                        <span className="text-xs font-bold text-white/60">
                                                            {selectedUser.created_at ? format(new Date(selectedUser.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <ExternalLink className="h-3 w-3" /> Credenciais Online
                                                </h5>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID Free Fire</span>
                                                        <span className="text-xs font-mono font-black text-neon-orange">{selectedUser.freefire_id || "—"}</span>
                                                    </div>
                                                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nick do Jogo</span>
                                                        <span className="text-xs font-black text-white italic truncate ml-4">{selectedUser.freefire_nick || "—"}</span>
                                                    </div>
                                                    {(selectedUser.is_chat_banned || selectedUser.is_app_banned || selectedUser.is_balance_locked) && (
                                                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col justify-between items-start gap-2">
                                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Penalidades Ativas na Conta</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedUser.is_app_banned && (
                                                                    <Badge className="bg-red-900 border border-red-500 text-white font-black uppercase text-[10px]"><Ban size={10} className="mr-1" /> Banido Entrada App</Badge>
                                                                )}
                                                                {selectedUser.is_chat_banned && (
                                                                    <Badge className="bg-red-600 border border-red-400 text-white font-black uppercase text-[10px]"><MessageSquare size={10} className="mr-1" /> Mudo no Chat</Badge>
                                                                )}
                                                                {selectedUser.is_balance_locked && (
                                                                    <Badge className="bg-yellow-600 border border-yellow-400 text-black font-black uppercase text-[10px]"><Lock size={10} className="mr-1" /> Saldo Trancado no Banco</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Proof Image */}
                                        {selectedUser.freefire_proof_url && (
                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Eye className="h-3 w-3" /> Verificação Visual
                                                </h5>
                                                <div className="group relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
                                                    <img
                                                        src={selectedUser.freefire_proof_url}
                                                        className="w-full max-h-[400px] object-contain transition-transform group-hover:scale-[1.02] cursor-zoom-in"
                                                        alt="Verificação Free Fire"
                                                        onClick={() => window.open(selectedUser.freefire_proof_url, '_blank')}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                        <p className="text-[9px] font-black text-white/50 uppercase">Clique para ampliar imagem original</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                        <div className="space-y-4 pt-4 border-t border-red-500/20 bg-red-950/10 p-4 rounded-[2rem] border mt-8">
                                            <h5 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2"><Lock size={12} /> Sala de Punições do Admin</h5>
                                            <div className="flex flex-wrap gap-3">
                                                <Button onClick={handleToggleBalanceLock} variant="outline" className={`h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 ${selectedUser.is_balance_locked ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_15px_rgba(255,200,0,0.4)] hover:bg-yellow-400' : 'border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/10'}`}>
                                                    {selectedUser.is_balance_locked ? <Unlock size={14} /> : <Lock size={14} />}
                                                    {selectedUser.is_balance_locked ? "Destrancar Dinheiro" : "Trancar Saque/Jogo"}
                                                </Button>

                                                <Button onClick={handleToggleChatBan} variant="outline" className={`h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 ${selectedUser.is_chat_banned ? 'bg-red-500/10 text-red-500 border-red-500/50' : 'text-red-500 border-red-600/30 hover:bg-red-500/10'}`}>
                                                    {selectedUser.is_chat_banned ? <MessageSquare size={14} /> : <Ban size={14} />}
                                                    {selectedUser.is_chat_banned ? "Tirar Mudo do Chat" : "Mudo no Global"}
                                                </Button>

                                                <Button onClick={handleToggleAppBan} variant="destructive" className={`h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all ${selectedUser.is_app_banned ? 'bg-black text-red-500 border border-red-500/50' : 'bg-red-800 hover:bg-red-700 shadow-[0_0_20px_rgba(255,0,0,0.5)] border border-red-500'}`}>
                                                    <Ban size={14} />
                                                    {selectedUser.is_app_banned ? "Restaurar Acesso de App" : "Banir do App Inteiro (Exílio)"}
                                                </Button>

                                            </div>
                                            <div className="flex justify-end pt-4 border-t border-red-500/10 mt-4">
                                                <Button onClick={handleDeleteUser} variant="ghost" className="text-gray-600 hover:text-red-600 hover:bg-red-950/20 h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shrink-0">
                                                    <Trash2 size={14} /> Apagar do Banco de Dados
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Edit Form */
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black uppercase italic text-neon-orange">Modo de Edição</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Alterações administrativas diretas</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => setEditMode(false)} variant="outline" className="rounded-xl border-white/10 text-xs px-6">Cancelar</Button>
                                                <Button onClick={handleAdminEditUser} className="rounded-xl bg-neon-green text-black font-black uppercase tracking-widest text-[10px] px-8 hover:bg-neon-green/90 shadow-lg shadow-neon-green/20">Salvar Alterações</Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <UserCog size={12} /> Dados Pessoais
                                                </h4>
                                                <div className="space-y-3">
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">Nome Completo</Label><Input value={editFields.full_name} onChange={e => setEditFields({ ...editFields, full_name: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">CPF do Jogador</Label><Input value={editFields.cpf} onChange={e => setEditFields({ ...editFields, cpf: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">Email Cadastrado</Label><Input value={editFields.email} onChange={e => setEditFields({ ...editFields, email: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Shield size={12} /> Dados da Conta Fogo
                                                </h4>
                                                <div className="space-y-3">
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">Nickname Real Fire</Label><Input value={editFields.nickname} onChange={e => setEditFields({ ...editFields, nickname: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">ID Free Fire</Label><Input value={editFields.freefire_id} onChange={e => setEditFields({ ...editFields, freefire_id: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                        <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">Nível Jogo</Label><Input type="number" value={editFields.freefire_level} onChange={e => setEditFields({ ...editFields, freefire_level: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                    </div>
                                                    <div><Label className="text-[10px] uppercase font-black text-neon-green mb-1 block">Saldo (R$)</Label><Input type="number" step="0.01" value={editFields.saldo} onChange={e => setEditFields({ ...editFields, saldo: e.target.value })} className="bg-neon-green/5 border-neon-green/20 h-11 rounded-xl focus:border-neon-green text-neon-green font-black" /></div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 md:col-span-2">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <History size={12} /> Imagens (URLs Externas)
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">URL Foto de Perfil</Label><Input value={editFields.avatar_url} onChange={e => setEditFields({ ...editFields, avatar_url: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                    <div><Label className="text-[10px] uppercase font-black text-gray-600 mb-1 block">URL Print de Nível</Label><Input value={editFields.freefire_proof_url} onChange={e => setEditFields({ ...editFields, freefire_proof_url: e.target.value })} className="bg-black border-white/10 h-11 rounded-xl focus:border-neon-orange" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}



// --- 4. FINANCEIRO (COM CONTROLE DE APROVAÇÃO AUTOMÁTICA) ---
function AdminFinance() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [historyTx, setHistoryTx] = useState<any[]>([]);

    // GUARDA OS IDS APROVADOS/REJEITADOS PARA NUNCA MAIS APARECEREM MESMO SE TIVER DELAY NO BANCO
    const [hiddenTxIds, setHiddenTxIds] = useState<Set<string>>(new Set());

    // Novo estado para o botão de Automático/Manual
    const [autoApprove, setAutoApprove] = useState(true);
    const [loadingSettings, setLoadingSettings] = useState(true);

    const fetchTx = async () => {
        // Fetch pendentes
        const { data: pendData } = await supabase
            .from("transactions")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        // Fetch historico
        const { data: histData } = await supabase
            .from("transactions")
            .select("*")
            .in("status", ["approved", "rejected"])
            .order("created_at", { ascending: false })
            .limit(50);

        const allUserIds = [...new Set([...(pendData || []), ...(histData || [])].map(tx => tx.user_id))];

        let profileMap = new Map();
        if (allUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, nickname, full_name, cpf, email")
                .in("user_id", allUserIds);
            profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        }

        const enrich = (list: any[]) => (list || []).map(tx => {
            const prof = profileMap.get(tx.user_id);
            return { ...tx, nickname: prof?.nickname || "Desconhecido", full_name: prof?.full_name || "-", cpf: prof?.cpf || "-", email: prof?.email || "-" };
        });

        // Filtra agressivamente usando a referência atualizada do React para realtime event race-conditions
        setTransactions(enrich(pendData || []).filter(tx => !hiddenTxIdsRef.current.has(tx.id)));
        setHistoryTx(enrich(histData || []));
    };

    const hiddenTxIdsRef = React.useRef(hiddenTxIds);
    // Força refiltragem se hiddenTxIds mudar ou fetchTx trazer delay
    useEffect(() => {
        hiddenTxIdsRef.current = hiddenTxIds;
        setTransactions(prev => prev.filter(tx => !hiddenTxIds.has(tx.id)));
    }, [hiddenTxIds]);

    // Busca a configuração atual ao abrir a tela
    const fetchSettings = async () => {
        const { data } = await (supabase as any)
            .from('notification_settings')
            .select('is_enabled')
            .eq('key_name', 'config_auto_approve_deposit')
            .maybeSingle();

        // Se não existir configuração, assume TRUE (Automático)
        if (data) setAutoApprove(data.is_enabled);
        setLoadingSettings(false);
    };

    // Fetch on mount + realtime updates
    useEffect(() => {
        fetchTx();
        fetchSettings();

        const channel = supabase
            .channel('admin-finance-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTx())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleToggleAutoApprove = async (val: boolean) => {
        setAutoApprove(val);
        // Salva a configuração no banco
        const { error } = await (supabase as any).from('notification_settings').upsert({
            key_name: 'config_auto_approve_deposit',
            is_enabled: val,
            category: 'system',
            label: 'Aprovação Automática de Depósitos'
        }, { onConflict: 'key_name' });

        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar configuração' });
            setAutoApprove(!val); // Reverte visualmente
        } else {
            toast({
                title: val ? "Modo Automático Ativado" : "Modo Manual Ativado",
                description: val ? "Os depósitos cairão na hora." : "Você precisará aprovar cada depósito manualmente."
            });
        }
    };

    const handleApprove = async (tx: any) => {
        if (tx.type === 'deposit' && tx.amount < 15) return toast({ variant: "destructive", title: "Bloqueado", description: "Depósito mínimo é R$ 15,00" });
        if (tx.type === 'withdraw' && tx.amount < 20) return toast({ variant: "destructive", title: "Bloqueado", description: "Saque mínimo é R$ 20,00" });

        if (!confirm(`Confirma a aprovação deste ${tx.type === 'deposit' ? 'depósito' : 'saque'} no valor de R$ ${tx.amount}?`)) return;

        // FORÇA A REMOÇÃO IMEDIATA E BLINDA CONTRA REAPARECIMENTO
        setHiddenTxIds(prev => new Set(prev).add(tx.id));
        setTransactions(prev => prev.filter(t => t.id !== tx.id));
        setHistoryTx(prev => [{ ...tx, status: 'approved', created_at: new Date().toISOString() }, ...prev]);

        try {
            const { data: profile, error: profileErr } = await supabase.from("profiles").select("saldo").eq("user_id", tx.user_id).single();
            if (profileErr || !profile) throw new Error("Perfil do usuário não encontrado.");

            let newBalance = Number(profile.saldo);
            if (tx.type === 'deposit') newBalance += Number(tx.amount);
            if (tx.type === 'withdraw') {
                if (newBalance < tx.amount) throw new Error("Saldo Insuficiente do Usuário");
                newBalance -= Number(tx.amount);
            }
            if (newBalance < 0) throw new Error("Erro: saldo ficaria negativo");

            // 1. Atualizar Saldo
            const { error: updErr } = await supabase.from("profiles").update({ saldo: newBalance }).eq("user_id", tx.user_id);
            if (updErr) throw updErr;

            // 2. Atualizar Transação
            const { error: txErr } = await supabase.from("transactions").update({ status: 'approved' }).eq("id", tx.id);
            if (txErr) throw txErr;

            // 3. Registrar Log
            await supabase.from("audit_logs").insert({
                admin_id: user?.id,
                action_type: 'finance_approve',
                details: `Aprovou ${tx.type === 'deposit' ? 'Depósito' : 'Saque'} de R$${Number(tx.amount).toFixed(2)} para ${tx.nickname} (${tx.full_name}, CPF: ${tx.cpf})`
            });

            // 4. Notificar
            await supabase.from("notifications").insert({
                user_id: tx.user_id,
                title: tx.type === 'deposit' ? 'Depósito Confirmado 🚀' : 'Saque Efetuado 💸',
                message: tx.type === 'deposit'
                    ? `Seu depósito de R$ ${Number(tx.amount).toFixed(2)} já está no seu saldo!`
                    : `Seu saque de R$ ${Number(tx.amount).toFixed(2)} foi aprovado e enviado.`,
                type: 'payment_confirmed'
            });

            // --- LÓGICA DE RECOMPENSA POR INDICAÇÃO ---
            if (tx.type === 'deposit') {
                const { data: referral } = await supabase
                    .from("referrals")
                    .select("*")
                    .eq("referred_id", tx.user_id)
                    .eq("status", "pending")
                    .maybeSingle();

                if (referral) {
                    await supabase.from("referrals").update({ status: "confirmed" }).eq("id", referral.id);

                    const { count } = await supabase
                        .from("referrals")
                        .select("*", { count: "exact", head: true })
                        .eq("referrer_id", referral.referrer_id)
                        .eq("status", "confirmed");

                    if (count && count >= 10 && count % 10 === 0) {
                        const rewardAmount = 10;
                        const { data: referrerProfile } = await supabase.from("profiles").select("saldo").eq("user_id", referral.referrer_id).single();
                        if (referrerProfile) {
                            const newReferrerBalance = Number(referrerProfile.saldo) + rewardAmount;
                            await supabase.from("profiles").update({ saldo: newReferrerBalance }).eq("user_id", referral.referrer_id);

                            await supabase.from("audit_logs").insert({
                                admin_id: user?.id,
                                action_type: "referral_reward",
                                details: `Recompensa automática de R$${rewardAmount.toFixed(2)} creditada por atingir ${count} indicações confirmadas.`
                            });
                        }
                    }
                }
            }

            toast({ title: "Transação Aprovada!" });

            // DISPARO DE PUSH
            try {
                let labelMsg = tx.type === 'deposit' ? 'Depósito Caiu! 💰' : 'Saque Efetuado! 💸';
                let bodyMsg = tx.type === 'deposit'
                    ? `Seu depósito de R$ ${Number(tx.amount).toFixed(2)} já está no seu saldo. Vá jogar!`
                    : `Seu saque de R$ ${Number(tx.amount).toFixed(2)} foi aprovado e enviado para você!`;

                // Usando unknown para driblar checagem
                await (window as any).sendPushNotification?.('ply_finance_done', labelMsg, bodyMsg, [tx.user_id]);
            } catch (pushErr) {
                console.error("Erro ao enviar push (não crítico):", pushErr);
            }
            // REMOVI O fetchTx() daqui para evitar race condition. O Realtime já faz isso ou o otimismo basta.
        } catch (err: any) {
            console.error("Erro ao aprovar transação:", err);
            toast({ variant: "destructive", title: "Erro na Operação", description: err.message || "Tente novamente." });
            // Se der erro de verdade, desfaz o otimismo
            setHiddenTxIds(prev => { const n = new Set(prev); n.delete(tx.id); return n; });
            fetchTx();
        }
    };

    const handleReject = async (tx: any) => {
        if (!confirm("Tem certeza que deseja rejeitar esta transação?")) return;

        // FORÇA A REMOÇÃO IMEDIATA E BLINDA CONTRA REAPARECIMENTO
        setHiddenTxIds(prev => new Set(prev).add(tx.id));
        setTransactions(prev => prev.filter(t => t.id !== tx.id));
        setHistoryTx(prev => [{ ...tx, status: 'rejected', created_at: new Date().toISOString() }, ...prev]);

        try {
            const { error: txErr } = await supabase.from("transactions").update({ status: 'rejected' }).eq("id", tx.id);
            if (txErr) throw txErr;

            await supabase.from("audit_logs").insert({
                admin_id: user?.id,
                action_type: 'finance_reject',
                details: `Rejeitou ${tx.type === 'deposit' ? 'Depósito' : 'Saque'} de R$${Number(tx.amount).toFixed(2)} para ${tx.nickname} (${tx.full_name})`
            });

            // Notificação interna pro sistema de sininho
            await supabase.from("notifications").insert({
                user_id: tx.user_id,
                title: 'Transação Rejeitada ❌',
                message: `Seu ${tx.type === 'deposit' ? 'depósito' : 'saque'} de R$ ${Number(tx.amount).toFixed(2)} foi recusado. Contate o suporte.`,
                type: 'payment_failed'
            });

            toast({ variant: "destructive", title: "Transação Rejeitada!" });

            // DISPARO DE PUSH
            try {
                await (window as any).sendPushNotification?.(
                    'ply_finance_done',
                    'Transação Recusada ❌',
                    `Seu ${tx.type === 'deposit' ? 'depósito' : 'saque'} de R$ ${Number(tx.amount).toFixed(2)} foi recusado. Contate o suporte.`,
                    [tx.user_id]
                );
            } catch (pushErr) {
                console.error("Erro ao enviar push (não crítico):", pushErr);
            }
            // REMOVI O fetchTx() daqui para evitar race condition.
        } catch (err: any) {
            console.error("Erro ao rejeitar transação:", err);
            toast({ variant: "destructive", title: "Erro na Operação", description: err.message || "Tente novamente." });
            // Desfaz o otimismo em caso de erro
            setHiddenTxIds(prev => { const n = new Set(prev); n.delete(tx.id); return n; });
            fetchTx();
        }
    };

    return (
        <div className="space-y-4">

            {/* NOVO: Painel de Controle de Automação */}
            <Card className="border-neon-green/30 bg-[#0c0c0c]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-neon-green uppercase flex items-center gap-2"><Zap className="h-4 w-4" /> Automação de Depósitos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="space-y-0.5">
                            <Label className="text-base text-white">Aprovar Automaticamente as PIX Asaas</Label>
                            <p className="text-xs text-gray-400">
                                {autoApprove
                                    ? "Ligado: O saldo cai na conta do jogador assim que o banco confirmar."
                                    : "Desligado: Todos os depósitos aguardarão a sua aprovação manual."}
                            </p>
                        </div>
                        <Switch
                            checked={autoApprove}
                            onCheckedChange={handleToggleAutoApprove}
                            className="data-[state=checked]:bg-neon-green"
                            disabled={loadingSettings}
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="pendentes">
                <TabsList className="grid w-full grid-cols-2 bg-secondary">
                    <TabsTrigger value="pendentes" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2">
                        Pendentes
                        {transactions.length > 0 && <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px]">{transactions.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="historico" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex gap-2">
                        Histórico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pendentes" className="mt-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase text-gray-500">Solicitações Aguardando Ação</h3>
                    {transactions.length === 0 && <p className="text-center text-sm text-gray-600 py-10">Tudo limpo por aqui.</p>}
                    {transactions.map(tx => (
                        <Card key={tx.id} className="bg-[#0c0c0c] border-white/5">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={tx.type === 'deposit' ? "bg-green-600" : "bg-red-600"}>
                                                {tx.type === 'deposit' ? 'DEPÓSITO' : 'SAQUE'}
                                            </Badge>
                                            <span className="font-bold text-white">R$ {Number(tx.amount).toFixed(2)}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{tx.nickname}</p>
                                        <p className="text-[9px] text-gray-600 font-mono mt-0.5">ID: {tx.id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" className="bg-green-600 h-8 w-8 hover:bg-green-700" onClick={() => handleApprove(tx)}><Check className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="destructive" className="h-8 w-8 hover:bg-red-700" onClick={() => handleReject(tx)}><X className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 bg-white/5 rounded p-2">
                                    <span>Nome: <span className="text-gray-300">{tx.full_name}</span></span>
                                    <span>CPF: <span className="text-gray-300">{tx.cpf}</span></span>
                                    <span>Email: <span className="text-gray-300">{tx.email}</span></span>
                                    <span>Horário: <span className="text-gray-300">{new Date(tx.created_at).toLocaleString("pt-BR")}</span></span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="historico" className="mt-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase text-gray-500">Últimas Movimentações Finalizadas</h3>
                    {historyTx.length === 0 && <p className="text-center text-sm text-gray-600 py-10">Histórico vazio.</p>}
                    {historyTx.map(tx => (
                        <Card key={tx.id} className="bg-[#0c0c0c] border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={tx.type === 'deposit' ? "bg-green-600/50" : "bg-red-600/50"}>
                                                {tx.type === 'deposit' ? 'DEPÓSITO' : 'SAQUE'}
                                            </Badge>
                                            <span className="font-bold text-white">R$ {Number(tx.amount).toFixed(2)}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{tx.nickname}</p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${tx.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-500'}`}>
                                            {tx.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 bg-white/5 rounded p-2">
                                    <span>Nome: <span className="text-gray-300">{tx.full_name}</span></span>
                                    <span>Horário: <span className="text-gray-300">{new Date(tx.created_at).toLocaleString("pt-BR")}</span></span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- 5. LINK DA CONTA (NOVO: COM SWITCH PARA ASAAS) ---
function AdminPaymentLink() {
    const { toast } = useToast();
    const [currentLink, setCurrentLink] = useState("");
    const [currentName, setCurrentName] = useState("Empresa Exemplo LTDA");
    const [newLink, setNewLink] = useState("");
    const [newName, setNewName] = useState("");
    const [history, setHistory] = useState<any[]>([]);

    // Novo estado para controlar o Gateway
    const [useAsaas, setUseAsaas] = useState(true);
    const [loadingSettings, setLoadingSettings] = useState(true);

    const fetchLinks = async () => {
        const { data } = await supabase.from("payment_links").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) {
            setCurrentLink(data[0].link);
            setHistory(data);
        }
    };

    const fetchSettings = async () => {
        const { data: asaasData } = await (supabase as any).from('notification_settings').select('is_enabled').eq('key_name', 'config_enable_asaas').maybeSingle();
        if (asaasData) setUseAsaas(asaasData.is_enabled);

        const { data: nameData } = await (supabase as any).from('notification_settings').select('label').eq('key_name', 'config_manual_pix_name').maybeSingle();
        if (nameData && nameData.label) {
            setCurrentName(nameData.label);
        }

        setLoadingSettings(false);
    };

    useEffect(() => {
        fetchLinks();
        fetchSettings();
    }, []);

    const handleSaveLink = async () => {
        if (!newLink.trim() && !newName.trim()) return toast({ variant: "destructive", title: "Preencha a chave ou o nome" });
        const adminId = (await supabase.auth.getUser()).data.user?.id;

        if (newLink.trim()) {
            const { error: linkErr } = await supabase.from("payment_links").insert({ link: newLink.trim(), created_by: adminId });
            if (linkErr) return toast({ variant: "destructive", title: "Erro na Chave", description: linkErr.message });
            await supabase.from("audit_logs").insert({
                admin_id: adminId,
                action_type: "payment_link_change",
                details: `Admin alterou chave de pagamento para: ${newLink.trim()}`
            });
            setNewLink("");
        }

        if (newName.trim()) {
            const { error: nameErr } = await (supabase as any).from('notification_settings').upsert({
                key_name: 'config_manual_pix_name',
                category: 'system',
                label: newName.trim(),
                is_enabled: true
            }, { onConflict: 'key_name' });

            if (nameErr) return toast({ variant: "destructive", title: "Erro no Nome", description: nameErr.message });

            await supabase.from("audit_logs").insert({
                admin_id: adminId,
                action_type: "payment_name_change",
                details: `Admin alterou nome do PIX para: ${newName.trim()}`
            });
            setCurrentName(newName.trim());
            setNewName("");
        }

        toast({ title: "Dados do PIX atualizados!" });
        fetchLinks();
    };

    const handleToggleAsaas = async (val: boolean) => {
        setUseAsaas(val);
        const { error } = await (supabase as any).from('notification_settings').upsert({
            key_name: 'config_enable_asaas',
            is_enabled: val,
            category: 'system',
            label: 'Ativar Integração Asaas (Automático)'
        }, { onConflict: 'key_name' });

        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar configuração' });
            setUseAsaas(!val);
        } else {
            toast({ title: val ? "Modo Automático Ativado" : "Modo Manual Ativado" });
        }
    };

    return (
        <div className="space-y-4">

            {/* SWITCH DE CONTROLE DO GATEWAY */}
            <Card className="border-neon-orange/30 bg-[#0c0c0c]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-neon-orange uppercase flex items-center gap-2"><Zap className="h-4 w-4" /> Modo de Operação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="space-y-0.5">
                            <Label className="text-base text-white">Integração Asaas (Automático)</Label>
                            <p className="text-xs text-gray-400">
                                {useAsaas
                                    ? "Ligado: O sistema gera PIX Copia e Cola automático."
                                    : "Desligado: O sistema usa a Chave Manual configurada abaixo."}
                            </p>
                        </div>
                        <Switch
                            checked={useAsaas}
                            onCheckedChange={handleToggleAsaas}
                            className="data-[state=checked]:bg-neon-green"
                            disabled={loadingSettings}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className={`border-white/10 bg-[#0c0c0c] ${useAsaas ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-400 uppercase flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Configuração PIX Manual (Emergência)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="bg-black/50 p-3 rounded border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Chave Atual</span>
                            <p className="text-sm text-white break-all font-mono">{currentLink || "Nenhuma chave configurada"}</p>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Nome Beneficiário Atual</span>
                            <p className="text-sm text-white break-all font-mono">{currentName}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-gray-400">Nova Chave PIX</Label>
                            <Input placeholder="E-mail, CPF, Telefone ou Aleatória" value={newLink} onChange={e => setNewLink(e.target.value)} className="bg-black/50 border-white/10" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-gray-400">Novo Nome Beneficiário</Label>
                            <Input placeholder="Nome exato que aparece no PIX" value={newName} onChange={e => setNewName(e.target.value)} className="bg-black/50 border-white/10" />
                        </div>
                    </div>

                    <Button onClick={handleSaveLink} className="w-full bg-gray-700 hover:bg-gray-600 font-bold mt-2">Atualizar Dados PIX Manual</Button>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-gray-500">Histórico de Chaves</h3>
                {history.map(h => (
                    <div key={h.id} className="bg-[#111] p-2 rounded border border-white/5 flex justify-between items-center">
                        <p className="text-xs text-gray-300 break-all flex-1">{h.link}</p>
                        <span className="text-[10px] text-gray-600 ml-2 shrink-0">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- 6. SUPORTE ---
function AdminSupport() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<any[]>([]);
    const [view, setView] = useState<'open' | 'archived' | 'ai_history'>('open');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiTickets, setAiTickets] = useState<any[]>([]);
    const [aiSearch, setAiSearch] = useState("");
    const [aiChatTicket, setAiChatTicket] = useState<any | null>(null);
    const [aiChatMessages, setAiChatMessages] = useState<any[]>([]);
    const [aiChatInput, setAiChatInput] = useState("");
    const [loadingAiChat, setLoadingAiChat] = useState(false);
    const [sendingAiChat, setSendingAiChat] = useState(false);

    useEffect(() => {
        (supabase as any).from('notification_settings').select('is_enabled').eq('key_name', 'gemini_ai_support').maybeSingle().then(({ data }: any) => {
            if (data?.is_enabled === true) setAiEnabled(true);
        });
        fetchAiTickets();
    }, []);

    const fetchAiTickets = async () => {
        const { data } = await supabase
            .from("support_tickets")
            .select("*")
            .in("status", ['ai_resolved', 'human_intervention'])
            .order("created_at", { ascending: false });
        if (!data) return;
        const userIds = [...new Set(data.map((t: any) => t.user_id))];
        if (userIds.length === 0) { setAiTickets([]); return; }
        const { data: profiles } = await supabase.from("profiles").select("user_id, nickname, email").in("user_id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const enriched = data.map(t => ({ ...t, profile: profileMap.get(t.user_id) || null }));
        setAiTickets(enriched);
    };

    const handleOpenAiChat = async (ticket: any) => {
        setAiChatTicket(ticket);
        setLoadingAiChat(true);
        const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
        setAiChatMessages(data || []);
        setLoadingAiChat(false);
    };

    const handleAiTakeOver = async () => {
        if (!aiChatTicket || !aiChatInput.trim()) return;
        setSendingAiChat(true);
        const adminId = (await supabase.auth.getUser()).data.user?.id;

        // 1. Mudar status do ticket para intervenção humana
        await supabase.from("support_tickets").update({ status: 'human_intervention' }).eq("id", aiChatTicket.id);

        // 2. Inserir mensagem do Admin
        await supabase.from("support_messages").insert({
            ticket_id: aiChatTicket.id,
            sender_id: adminId,
            message: aiChatInput.trim(),
            is_admin: true,
        });

        // 3. Notificar o jogador
        await supabase.from("notifications").insert({
            user_id: aiChatTicket.user_id,
            title: '💬 Suporte Humano Ativo',
            message: aiChatInput.trim().substring(0, 100),
            type: 'support_reply',
            ticket_id: aiChatTicket.id,
        });

        // 4. Atualizar UI
        setAiChatMessages(prev => [...prev, { id: Date.now(), message: aiChatInput.trim(), is_admin: true, sender_id: adminId, created_at: new Date().toISOString() }]);
        setAiChatTicket((prev: any) => ({ ...prev, status: 'human_intervention' }));
        setAiChatInput("");
        setSendingAiChat(false);
        fetchAiTickets();
        toast({ title: '✅ Mensagem enviada!', description: 'Ticket assumido pelo admin.' });
    };

    const handleToggleAi = async () => {
        const newValue = !aiEnabled;
        setAiEnabled(newValue);
        const { error } = await (supabase as any).from('notification_settings').upsert({
            key_name: 'gemini_ai_support',
            category: 'system',
            label: 'Suporte Automático por IA (Gemini)',
            is_enabled: newValue
        }, { onConflict: 'key_name' });
        if (error) {
            setAiEnabled(!newValue); // reverter se falhou
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } else {
            toast({ title: newValue ? "🤖 Suporte IA Ativado!" : "👤 Suporte IA Desativado!" });
        }
    };

    const fetchTickets = async () => {
        const statuses = view === 'open' ? ['open', 'waiting_human'] : [view];
        const { data } = await supabase
            .from("support_tickets")
            .select("*")
            .in("status", statuses)
            .order("created_at", { ascending: false });
        if (!data) return;

        const userIds = [...new Set(data.map(t => t.user_id))];
        if (userIds.length === 0) { setTickets([]); return; }
        const { data: profiles } = await supabase.from("profiles").select("user_id, nickname").in("user_id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) || []);
        const enriched = data.map(t => ({ ...t, nickname: profileMap.get(t.user_id) || "Usuário" }));
        // Coloca os urgentes (waiting_human) primeiro
        enriched.sort((a, b) => (b.status === 'waiting_human' ? 1 : 0) - (a.status === 'waiting_human' ? 1 : 0));
        setTickets(enriched);
    };

    useEffect(() => {
        if (view !== 'ai_history') fetchTickets();
        if (view !== 'ai_history') {
            const channel = supabase.channel('support_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchTickets).subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [view]);

    const handleArchive = async (id: string) => {
        const { error } = await supabase.from("support_tickets").update({ status: 'archived' }).eq("id", id);
        if (!error) { toast({ title: "Ticket Arquivado" }); fetchTickets(); }
    };

    const [chatTicket, setChatTicket] = useState<any | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [loadingChat, setLoadingChat] = useState(false);

    const handleReply = async (ticket: any) => {
        setChatTicket(ticket);
        setLoadingChat(true);
        const { data } = await supabase
            .from("support_messages")
            .select("*")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: true });
        setChatMessages(data || []);
        setLoadingChat(false);
    };

    // Realtime chat messages
    useEffect(() => {
        if (!chatTicket) return;
        const channel = supabase
            .channel(`chat-${chatTicket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${chatTicket.id}` }, (payload) => {
                setChatMessages(prev => [...prev, payload.new]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [chatTicket]);

    const handleSendChat = async () => {
        if (!chatInput.trim() || !chatTicket) return;
        const adminId = (await supabase.auth.getUser()).data.user?.id;
        await supabase.from("support_messages").insert({
            ticket_id: chatTicket.id,
            sender_id: adminId,
            message: chatInput.trim(),
            is_admin: true,
        });
        // Notify the player
        await supabase.from("notifications").insert({
            user_id: chatTicket.user_id,
            title: chatTicket.type === 'support' ? 'Resposta do Suporte' : 'Resposta à Sugestão',
            message: chatInput.trim().substring(0, 100),
            type: chatTicket.type === 'support' ? 'support_reply' : 'suggestion_reply',
            ticket_id: chatTicket.id,
        });
        setChatInput("");
    };

    return (
        <>
            <div className="space-y-4 pt-4">

                {/* --- TOGGLE DE IA --- */}
                <div className="flex items-center justify-between bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 mb-2">
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Atendimento Automático por IA (Gemini)
                        </span>
                        <span className="text-xs text-gray-400 mt-1">Se ativado, os tickets não chegarão aqui. O Google Gemini responderá o jogador na hora.</span>
                    </div>
                    <Switch checked={aiEnabled} onCheckedChange={handleToggleAi} className="data-[state=checked]:bg-yellow-500" />
                </div>

                <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                    <Button variant={view === 'open' ? 'default' : 'ghost'} className={`flex-1 text-xs ${view === 'open' ? 'bg-white/10' : ''}`} onClick={() => setView('open')}>Entrada</Button>
                    <Button variant={view === 'archived' ? 'default' : 'ghost'} className={`flex-1 text-xs ${view === 'archived' ? 'bg-white/10' : ''}`} onClick={() => setView('archived')}>Arquivados</Button>
                    <Button variant={view === 'ai_history' ? 'default' : 'ghost'} className={`flex-1 text-xs ${view === 'ai_history' ? 'bg-yellow-600/40 text-yellow-300' : 'text-yellow-500'}`} onClick={() => { setView('ai_history'); setAiChatTicket(null); }}>🤖 IA</Button>
                </div>

                {/* ===== HISTÓRICO IA ===== */}
                {view === 'ai_history' && !aiChatTicket && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                value={aiSearch}
                                onChange={e => setAiSearch(e.target.value)}
                                placeholder="Buscar por nickname, e-mail ou ID..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:border-yellow-500/50 outline-none"
                            />
                        </div>
                        {aiTickets
                            .filter(t => {
                                if (!aiSearch.trim()) return true;
                                const q = aiSearch.toLowerCase();
                                return (
                                    (t.profile?.nickname || "").toLowerCase().includes(q) ||
                                    (t.profile?.email || "").toLowerCase().includes(q) ||
                                    t.id.toLowerCase().includes(q)
                                );
                            })
                            .map(ticket => (
                                <Card key={ticket.id} onClick={() => handleOpenAiChat(ticket)} className={`bg-[#0c0c0c] border-l-4 cursor-pointer hover:bg-white/5 transition-colors ${ticket.status === 'human_intervention' ? 'border-l-blue-500' : 'border-l-yellow-500'}`}>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-bold text-sm truncate">{ticket.profile?.nickname || 'Usuário'}</p>
                                                <p className="text-gray-500 text-[10px] truncate">{ticket.profile?.email}</p>
                                                <p className="text-gray-400 text-xs mt-2 line-clamp-2">{ticket.message}</p>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ticket.status === 'human_intervention' ? 'bg-blue-900/40 text-blue-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                                    {ticket.status === 'human_intervention' ? 'Humano' : 'IA ✅'}
                                                </span>
                                                <p className="text-[10px] text-gray-600 mt-2">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        }
                        {aiTickets.length === 0 && (
                            <div className="text-center py-10 text-gray-600 text-sm">Nenhum chat da IA registrado ainda.</div>
                        )}
                    </div>
                )}

                {/* ===== CHAT DETALHADO DA IA ===== */}
                {view === 'ai_history' && aiChatTicket && (
                    <div className="space-y-3">
                        <Button variant="ghost" onClick={() => { setAiChatTicket(null); fetchAiTickets(); }} className="text-gray-400 hover:text-white -ml-2">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <div className="bg-[#111] border border-white/10 rounded-xl p-3">
                            <p className="text-white font-bold text-sm">{aiChatTicket.profile?.nickname || 'Usuário'}</p>
                            <p className="text-gray-500 text-[10px]">{aiChatTicket.profile?.email} • {aiChatTicket.id.substring(0, 8)}...</p>
                            <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${aiChatTicket.status === 'human_intervention' ? 'bg-blue-900/40 text-blue-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                {aiChatTicket.status === 'human_intervention' ? '🧑 Atendimento Humano' : '🤖 Resolvido pela IA'}
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[350px] overflow-y-auto py-2">
                            {loadingAiChat ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-yellow-500" /></div>
                            ) : (
                                aiChatMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.is_admin ? (msg.sender_id ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-yellow-600/10 border border-yellow-500/20') : 'bg-white/5 border border-white/10'}`}>
                                            <p className={`text-[10px] font-bold uppercase mb-1 ${msg.is_admin ? (msg.sender_id ? 'text-blue-400' : 'text-yellow-500') : 'text-gray-400'}`}>
                                                {msg.is_admin ? (msg.sender_id ? '🧑 Admin' : '🤖 IA') : '👤 Jogador'}
                                            </p>
                                            <p className="text-white whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-white/10 pt-3">
                            {aiChatTicket.status !== 'human_intervention' && (
                                <p className="text-xs text-yellow-600 mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Enviar uma mensagem irá assumir este ticket e notificar o jogador.</p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    value={aiChatInput}
                                    onChange={e => setAiChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiTakeOver()}
                                    placeholder="Digite sua resposta como Admin..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 outline-none"
                                />
                                <Button onClick={handleAiTakeOver} disabled={sendingAiChat || !aiChatInput.trim()} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                    {sendingAiChat ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {view !== 'ai_history' && (tickets.length === 0 ? (
                    <Card className="border-border bg-card"><CardContent className="flex flex-col items-center justify-center p-8 text-center"><MessageSquare className="h-12 w-12 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Nenhum ticket aqui.</p></CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {tickets.map(ticket => (
                            <Card key={ticket.id} className={`bg-card border-l-4 ${ticket.status === 'waiting_human' ? 'border-l-red-500 bg-red-950/10' :
                                ticket.type === 'support' ? 'border-l-neon-orange' : 'border-l-blue-500'
                                }`}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold uppercase ${ticket.type === 'support' ? 'text-neon-orange' : 'text-blue-400'}`}>
                                                {ticket.type === 'support' ? 'Problema' : 'Sugestão'}
                                            </span>
                                            {ticket.status === 'waiting_human' && (
                                                <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                                                    🚨 Urgente
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500">{new Date(ticket.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mb-1">{ticket.nickname || "Usuário"}</p>
                                    <p className="text-sm text-gray-300 bg-black/20 p-2 rounded mb-3">"{ticket.message}"</p>
                                    <div className="flex justify-end gap-2">
                                        {view === 'open' && (
                                            <Button size="sm" variant="ghost" onClick={() => handleArchive(ticket.id)} className="text-gray-500 hover:text-red-500"><Archive className="mr-2 h-3 w-3" /> Arquivar</Button>
                                        )}
                                        <Button size="sm" className={ticket.status === 'waiting_human' ? 'bg-red-600 text-white' : ticket.type === 'support' ? 'bg-neon-orange text-black' : 'bg-blue-600 text-white'} onClick={() => handleReply(ticket)}>
                                            {view === 'archived' ? <><Eye className="mr-2 h-3 w-3" /> Histórico</> : <><Send className="mr-2 h-3 w-3" /> {ticket.status === 'waiting_human' ? 'Atender Agora' : 'Responder'}</>}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                    </div>
                ))}
            </div>

            {/* Chat Dialog */}
            <Dialog open={!!chatTicket} onOpenChange={() => setChatTicket(null)}>
                <DialogContent className="bg-[#111] border-neon-orange text-white w-[95%] rounded-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-neon-orange flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Chat com {chatTicket?.nickname}</DialogTitle>
                        <DialogDescription className="text-gray-500 text-xs">Mensagem original: "{chatTicket?.message}"</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-2 py-3 min-h-[200px] max-h-[400px]">
                        {loadingChat ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /></div>
                        ) : chatMessages.length === 0 ? (
                            <p className="text-center text-gray-500 text-xs py-4">Nenhuma mensagem ainda. Envie a primeira!</p>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.is_admin ? 'bg-neon-orange text-black' : 'bg-white/10 text-white'}`}>
                                        <p>{msg.message}</p>
                                        <span className="text-[9px] opacity-60 block mt-1">{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/10">
                        <Input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Digite sua resposta..."
                            className="bg-black border-white/10 flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                        />
                        <Button onClick={handleSendChat} className="bg-neon-orange text-black"><Send className="h-4 w-4" /></Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// --- HISTÓRICOS AUTOMÁTICOS (ASAAS WEBHOOK) ---
function AdminAutoHistory() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);

    useEffect(() => {
        const fetchAutoTx = async () => {
            setLoading(true);
            // Busca transações aprovadas automaticamente (source = 'automatic')
            const { data } = await supabase
                .from("transactions")
                .select("*")
                .eq("source", "automatic")
                .order("created_at", { ascending: false })
                .limit(200);

            if (!data || data.length === 0) {
                setTransactions([]);
                setLoading(false);
                return;
            }

            const userIds = [...new Set(data.map(tx => tx.user_id))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, nickname, full_name, cpf, saldo, email")
                .in("user_id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
            const enriched = data.map(tx => ({
                ...tx,
                profile: profileMap.get(tx.user_id) || null,
            }));
            setTransactions(enriched);
            setLoading(false);
        };
        fetchAutoTx();
    }, []);

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /></div>;

    return (
        <div className="space-y-4">
            <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg flex items-center gap-3">
                <Zap className="text-emerald-400 h-5 w-5" />
                <p className="text-xs text-emerald-200">Transações processadas automaticamente pelo Webhook do Asaas.</p>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-10">
                    <Zap className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma transação automática registrada ainda.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {transactions.map(tx => (
                        <div
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className="bg-[#0c0c0c] border border-white/5 rounded-lg p-3 cursor-pointer hover:border-neon-green/30 transition-colors"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-full bg-neon-green/10">
                                        <Zap className="h-4 w-4 text-neon-green" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{tx.profile?.nickname || "Desconhecido"}</p>
                                        <p className="text-[10px] text-gray-500">
                                            {new Date(tx.created_at).toLocaleDateString("pt-BR")} às {new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-neon-green">R$ {Number(tx.amount).toFixed(2)}</p>
                                    <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 text-[9px]">
                                        AUTO
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Detalhes */}
            <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
                <DialogContent className="bg-[#111] border-neon-green/30 text-white w-[95%] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-neon-green flex items-center gap-2"><Zap className="h-5 w-5" /> Detalhes da Transação</DialogTitle>
                        <DialogDescription className="text-gray-500">Depósito aprovado automaticamente via Asaas.</DialogDescription>
                    </DialogHeader>
                    {selectedTx && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">Jogador</span>
                                    <span className="text-white font-bold">{selectedTx.profile?.nickname || "?"}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">Saldo Atual</span>
                                    <span className="text-neon-green font-bold">R$ {Number(selectedTx.profile?.saldo || 0).toFixed(2)}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">CPF</span>
                                    <span className="text-white">{selectedTx.profile?.cpf || "-"}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">Valor</span>
                                    <span className="text-neon-green font-bold">R$ {Number(selectedTx.amount).toFixed(2)}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded col-span-2">
                                    <span className="text-gray-500 text-[10px] uppercase block">ID Asaas (Payment)</span>
                                    <span className="text-neon-orange font-mono text-xs break-all">{selectedTx.asaas_payment_id || "N/A"}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">Data/Hora</span>
                                    <span className="text-white text-xs">{new Date(selectedTx.created_at).toLocaleString("pt-BR")}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded">
                                    <span className="text-gray-500 text-[10px] uppercase block">Status</span>
                                    <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30">{selectedTx.status}</Badge>
                                </div>
                                <div className="bg-black/30 p-3 rounded col-span-2">
                                    <span className="text-gray-500 text-[10px] uppercase block">ID Transação</span>
                                    <span className="text-gray-400 font-mono text-[10px] break-all">{selectedTx.id}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- 7. REGISTROS ---
function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    useEffect(() => {
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => {
            if (data) setLogs(data);
        });
    }, []);

    const getIcon = (type: string) => {
        if (type.startsWith('admin_') || type.startsWith('finance_') || type.startsWith('tournament_') || type === 'payment_link_change') return <Shield className="h-4 w-4 text-neon-orange shrink-0" />;
        return <UserCog className="h-4 w-4 text-blue-400 shrink-0" />;
    };

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Linha do Tempo (Admin e Jogadores)</h3>
            {logs.length === 0 && <p className="text-xs text-gray-600">Nenhum registro recente.</p>}
            {logs.map(log => (
                <div key={log.id} className="text-xs p-3 rounded bg-[#111] border border-white/5 text-gray-400 flex items-start gap-3">
                    {getIcon(log.action_type)}
                    <div>
                        <span className="text-neon-orange font-bold">[{new Date(log.created_at).toLocaleString("pt-BR")}]</span>
                        <span className="text-[10px] text-gray-600 ml-2 uppercase">{log.action_type}</span>
                        <span className="block mt-1">{log.details}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- 8. ALERTAS ---
function AdminAlerts() {
    const [dupes, setDupes] = useState<any[]>([]);

    useEffect(() => {
        const findDupes = async () => {
            const { data } = await supabase.from("profiles").select("id, nickname, freefire_id");
            if (!data) return;
            const lookup = new Map();
            const found: any[] = [];
            data.forEach(u => {
                if (u.freefire_id && lookup.has(u.freefire_id)) {
                    found.push({ original: lookup.get(u.freefire_id), dupe: u });
                } else if (u.freefire_id) {
                    lookup.set(u.freefire_id, u);
                }
            });
            setDupes(found);
        };
        findDupes();
    }, []);

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Integridade do Sistema</h3>
            {dupes.length === 0 ? <div className="text-center bg-green-900/10 border border-green-900/30 p-4 rounded"><Check className="h-6 w-6 text-green-500 mx-auto mb-2" /><p className="text-green-500 text-sm">Nenhum ID Duplicado.</p></div> : dupes.map((d, i) => (
                <div key={i} className="bg-red-900/10 border border-red-500/50 p-3 rounded flex justify-between items-center">
                    <div>
                        <p className="font-bold text-red-500 text-sm mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> ID DUPLICADO: {d.original.freefire_id}</p>
                        <p className="text-xs text-gray-400">Conta 1: {d.original.nickname}</p>
                        <p className="text-xs text-gray-400">Conta 2: {d.dupe.nickname}</p>
                    </div>
                    <Button size="sm" variant="destructive">Bloquear</Button>
                </div>
            ))}
        </div>
    );
}

// --- 9. INDICAÇÕES ---
function AdminReferrals() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [referrersList, setReferrersList] = useState<any[]>([]);
    const [showReferrers, setShowReferrers] = useState(false);
    const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null);
    const [referrerDetails, setReferrerDetails] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const BONUS_PER_MILESTONE = 10; // R$10 per 10 confirmed referrals (adjust as needed)

    useEffect(() => {
        const fetchReferrals = async () => {
            const { data } = await supabase
                .from("referrals")
                .select("*")
                .order("created_at", { ascending: false });

            if (data && data.length > 0) {
                const allIds = [...new Set(data.flatMap(r => [r.referrer_id, r.referred_id]))];
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, nickname, email, full_name, freefire_id, freefire_nick, avatar_url")
                    .in("user_id", allIds);

                const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

                const enriched = data.map(r => ({
                    ...r,
                    referrer_profile: profileMap.get(r.referrer_id) || null,
                    referred_profile: profileMap.get(r.referred_id) || null,
                }));
                setReferrals(enriched);

                // Build referrers summary
                const referrerMap = new Map<string, { profile: any; total: number; confirmed: number }>();
                enriched.forEach(r => {
                    const existing = referrerMap.get(r.referrer_id);
                    if (existing) {
                        existing.total += 1;
                        if (r.status === 'confirmed') existing.confirmed += 1;
                    } else {
                        referrerMap.set(r.referrer_id, {
                            profile: r.referrer_profile,
                            total: 1,
                            confirmed: r.status === 'confirmed' ? 1 : 0,
                        });
                    }
                });
                const referrersArr = Array.from(referrerMap.entries()).map(([id, data]) => ({
                    referrer_id: id,
                    ...data,
                    milestones: Math.floor(data.confirmed / 10),
                    totalEarnings: Math.floor(data.confirmed / 10) * BONUS_PER_MILESTONE,
                })).sort((a, b) => b.total - a.total);
                setReferrersList(referrersArr);
            } else {
                setReferrals([]);
                setReferrersList([]);
            }
            setLoading(false);
        };
        fetchReferrals();
    }, []);

    const handleSelectReferrer = (referrer: any) => {
        setSelectedReferrer(referrer);
        setDetailsLoading(true);
        const referred = referrals
            .filter(r => r.referrer_id === referrer.referrer_id)
            .map(r => ({
                ...r,
                profile: r.referred_profile,
            }));
        setReferrerDetails(referred);
        setDetailsLoading(false);
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /></div>;

    // Drill-down: selected referrer's referred users
    if (selectedReferrer) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setSelectedReferrer(null)} className="text-gray-400 hover:text-white mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <Card className="bg-[#0c0c0c] border-indigo-500/30">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 overflow-hidden">
                                {selectedReferrer.profile?.avatar_url ? (
                                    <img src={selectedReferrer.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <span className="text-indigo-400 font-bold text-lg">{selectedReferrer.profile?.nickname?.charAt(0)?.toUpperCase() || "?"}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-bold">{selectedReferrer.profile?.nickname || "Desconhecido"}</p>
                                <p className="text-xs text-gray-500">{selectedReferrer.profile?.email || ""}</p>
                                {selectedReferrer.profile?.full_name && <p className="text-xs text-gray-400">{selectedReferrer.profile.full_name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Total Indicados</p>
                                <p className="text-xl font-black text-indigo-400">{selectedReferrer.total}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Confirmados</p>
                                <p className="text-xl font-black text-green-400">{selectedReferrer.confirmed}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Metas de 10 atingidas</p>
                                <p className="text-xl font-black text-yellow-400">{selectedReferrer.milestones}x</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Total Ganho</p>
                                <p className="text-xl font-black text-neon-green">R$ {selectedReferrer.totalEarnings.toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <h3 className="text-xs font-bold uppercase text-gray-500">Pessoas indicadas por {selectedReferrer.profile?.nickname}</h3>

                {detailsLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-indigo-400" /></div>
                ) : referrerDetails.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-4">Nenhum indicado encontrado.</p>
                ) : (
                    referrerDetails.map(r => (
                        <Card key={r.id} className="bg-[#111] border-white/10">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                        {r.profile?.avatar_url ? (
                                            <img src={r.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                                        ) : (
                                            <Users className="h-4 w-4 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{r.profile?.nickname || "Desconhecido"}</p>
                                        <p className="text-[10px] text-gray-500">{r.profile?.email || "Sem email"}</p>
                                        {r.profile?.full_name && <p className="text-[10px] text-gray-400">{r.profile.full_name}</p>}
                                        {r.profile?.freefire_id && <p className="text-[10px] text-gray-400">FF ID: {r.profile.freefire_id} {r.profile.freefire_nick ? `• ${r.profile.freefire_nick}` : ''}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.status === 'confirmed' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                            {r.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}
                                        </span>
                                        <p className="text-[10px] text-gray-600 mt-1">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        );
    }

    // List of referrers (ranking mode)
    if (showReferrers && !selectedReferrer) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setShowReferrers(false)} className="text-gray-400 hover:text-white mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg flex items-center gap-3">
                    <Users className="text-indigo-400 h-5 w-5" />
                    <p className="text-xs text-indigo-200">Classificação de jogadores que trouxeram novos usuários para a plataforma.</p>
                </div>

                <div className="space-y-3">
                    {referrersList.map(r => (
                        <Card key={r.referrer_id} className="bg-[#111] border-white/10 hover:border-indigo-500/50 cursor-pointer transition-colors" onClick={() => handleSelectReferrer(r)}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {r.profile?.avatar_url ? (
                                            <img src={r.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-indigo-400 font-bold">{r.profile?.nickname?.charAt(0)?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{r.profile?.nickname || "Desconhecido"}</p>
                                        <p className="text-gray-500 text-[10px] truncate">{r.profile?.email}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-indigo-400 font-bold">{r.total} indicados</p>
                                    <p className="text-[10px] text-green-400">{r.confirmed} pagaram</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {referrersList.length === 0 && (
                        <p className="text-center text-gray-600 text-sm py-8">Ninguém indicou nenhuma pessoa ainda.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={() => setShowReferrers(true)}
                className="w-full bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg flex items-center justify-between hover:bg-indigo-900/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Gift className="text-indigo-400 h-5 w-5" />
                    <p className="text-sm text-indigo-200">Total de indicações: <strong className="text-white">{referrals.length}</strong></p>
                </div>
                <span className="text-indigo-400 text-xs font-bold">Ver detalhes →</span>
            </button>

            {referrals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">Nenhuma indicação registrada ainda.</div>
            ) : (
                referrals.slice(0, 20).map(r => (
                    <Card key={r.id} className="bg-[#0c0c0c] border-white/10">
                        <CardContent className="p-3 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Quem indicou</p>
                                    <p className="text-sm font-bold text-indigo-400">{r.referrer_profile?.nickname || "Desconhecido"}</p>
                                    <p className="text-[10px] text-gray-600">{r.referrer_profile?.email || ""}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Indicado</p>
                                    <p className="text-sm font-bold text-white">{r.referred_profile?.nickname || "Desconhecido"}</p>
                                    <p className="text-[10px] text-gray-600">{r.referred_profile?.email || ""}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-white/5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.status === 'confirmed' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                    {r.status === 'confirmed' ? '✅ Confirmado' : '⏳ Pendente'}
                                </span>
                                <span className="text-[10px] text-gray-600">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}

// --- 13. PRODUTOS PROMOCIONAIS E LOJA ---
function AdminProducts() {
    const { toast } = useToast();
    const [subTab, setSubTab] = useState<'dashboard' | 'store'>('dashboard');

    // Dashboard State
    const [dashProducts, setDashProducts] = useState<any[]>([]);
    const [dashListTab, setDashListTab] = useState<'ativos' | 'inativos'>('ativos');
    const [loadingDash, setLoadingDash] = useState(true);
    const [dashTitle, setDashTitle] = useState("");
    const [dashUrl, setDashUrl] = useState("");
    const [dashEditingId, setDashEditingId] = useState<string | null>(null);
    const [dashColor, setDashColor] = useState("orange");

    const colorOptions = [
        { id: 'orange', label: 'Laranja/Fogo', bg: 'bg-orange-500' },
        { id: 'green', label: 'Verde/Sucesso', bg: 'bg-green-500' },
        { id: 'blue', label: 'Azul/Confiança', bg: 'bg-blue-500' },
        { id: 'purple', label: 'Roxo/Épico', bg: 'bg-purple-500' },
        { id: 'pink', label: 'Rosa/Choque', bg: 'bg-pink-500' },
    ];

    // Store State
    const [storeProducts, setStoreProducts] = useState<any[]>([]);
    const [storeListTab, setStoreListTab] = useState<'ativos' | 'inativos'>('ativos');
    const [loadingStore, setLoadingStore] = useState(true);
    const [storeName, setStoreName] = useState("");
    const [storeImage, setStoreImage] = useState("");
    const [storeLink, setStoreLink] = useState("");
    const [storePrice, setStorePrice] = useState("");
    const [storeCategory, setStoreCategory] = useState("ACESSÓRIOS");
    const [storeFeatured, setStoreFeatured] = useState(false);
    const [storeEditingId, setStoreEditingId] = useState<string | null>(null);

    const fetchDashProducts = async () => {
        setLoadingDash(true);
        const { data } = await (supabase as any).from("notification_settings").select("label").eq("key_name", "PROMO_PRODUCTS_V1").maybeSingle();
        if (data && data.label) {
            try {
                const parsed = JSON.parse(data.label);
                const withIds = parsed.map((p: any, idx: number) => ({ ...p, id: p.id || `promo_${Date.now()}_${idx}` }));
                setDashProducts(withIds);
            } catch (e) { setDashProducts([]); }
        } else {
            setDashProducts([]);
        }
        setLoadingDash(false);
    };

    const fetchStoreProducts = async () => {
        setLoadingStore(true);
        const { data } = await (supabase as any).from("notification_settings").select("label").eq("key_name", "STORE_PRODUCTS_V1").maybeSingle();
        if (data && data.label) {
            try {
                const parsed = JSON.parse(data.label);
                const withIds = parsed.map((p: any, idx: number) => ({ ...p, id: p.id || `store_${Date.now()}_${idx}` }));
                setStoreProducts(withIds);
            } catch (e) {
                setStoreProducts(INITIAL_PRODUCTS);
            }
        } else {
            setStoreProducts(INITIAL_PRODUCTS);
        }
        setLoadingStore(false);
    };

    const restoreStoreProducts = async () => {
        setLoadingStore(true);
        await (supabase as any).from("notification_settings").upsert({
            key_name: "STORE_PRODUCTS_V1",
            category: "system_data",
            label: JSON.stringify(INITIAL_PRODUCTS),
            is_enabled: true
        }, { onConflict: 'key_name' });
        toast({ title: "Produtos padrão restaurados com sucesso!" });
        fetchStoreProducts();
    };

    useEffect(() => {
        if (subTab === 'dashboard') fetchDashProducts();
        else fetchStoreProducts();
    }, [subTab]);

    const handleSaveDash = async () => {
        if (!dashTitle.trim() || !dashUrl.trim()) return toast({ variant: "destructive", title: "Preencha todos os campos." });

        let newProducts = [...dashProducts];
        if (dashEditingId) {
            newProducts = newProducts.map(p => p.id === dashEditingId ? { ...p, title: dashTitle, url: dashUrl, color: dashColor } : p);
            toast({ title: "Produto atualizado com sucesso!" });
        } else {
            newProducts.unshift({ id: Date.now().toString(), title: dashTitle, url: dashUrl, color: dashColor, is_active: true });
            toast({ title: "Produto adicionado!" });
        }

        await (supabase as any).from("notification_settings").upsert({
            key_name: "PROMO_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true
        }, { onConflict: 'key_name' });

        setDashTitle(""); setDashUrl(""); setDashColor("orange"); setDashEditingId(null);
        fetchDashProducts();
    };

    const handleSaveStore = async () => {
        if (!storeName.trim() || !storeLink.trim() || !storePrice.trim() || !storeImage.trim()) {
            return toast({ variant: "destructive", title: "Preencha todos os campos da loja." });
        }

        let newProducts = [...storeProducts];
        const payload = {
            name: storeName, image: storeImage, link: storeLink, price: storePrice,
            category: storeCategory, featured: storeFeatured
        };

        if (storeEditingId) {
            newProducts = newProducts.map(p => p.id?.toString() === storeEditingId ? { ...p, ...payload } : p);
            toast({ title: "Produto da Loja atualizado!" });
        } else {
            newProducts.unshift({ id: Date.now().toString(), ...payload, is_active: true });
            toast({ title: "Produto adicionado à Loja!" });
        }

        await (supabase as any).from("notification_settings").upsert({
            key_name: "STORE_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true
        }, { onConflict: 'key_name' });

        setStoreName(""); setStoreImage(""); setStoreLink(""); setStorePrice(""); setStoreFeatured(false); setStoreEditingId(null);
        fetchStoreProducts();
    };

    const handleToggleStatusDash = async (id: string, currentStatus: boolean) => {
        if (!id) return;
        const nextStatus = !currentStatus;
        const newProducts = dashProducts.map(p => {
            if (p.id?.toString() === id.toString()) {
                return { ...p, is_active: nextStatus, is_deleted: nextStatus ? false : p.is_deleted };
            }
            return p;
        });
        await (supabase as any).from("notification_settings").upsert({ key_name: "PROMO_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
        toast({ title: nextStatus ? "Ativado com sucesso!" : "Desativado." });
        fetchDashProducts();
    };

    const handleToggleStatusStore = async (id: string, currentStatus: boolean) => {
        if (!id) return;
        const nextStatus = !currentStatus;
        const newProducts = storeProducts.map(p => {
            if (p.id?.toString() === id.toString()) {
                return { ...p, is_active: nextStatus, is_deleted: nextStatus ? false : p.is_deleted };
            }
            return p;
        });
        await (supabase as any).from("notification_settings").upsert({ key_name: "STORE_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
        toast({ title: nextStatus ? "Produto ativado e restaurado!" : "Produto desativado e movido para Inativos." });
        fetchStoreProducts();
    };

    const handleDeleteDash = async (id: string, isDeleted: boolean) => {
        if (!id) return;
        if (isDeleted) {
            if (confirm("Tem certeza que deseja apagar DEFINITIVAMENTE?")) {
                const newProducts = dashProducts.filter(p => p.id?.toString() !== id.toString());
                await (supabase as any).from("notification_settings").upsert({ key_name: "PROMO_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
                toast({ title: "Excluído permanentemente." });
                fetchDashProducts();
            }
        } else {
            if (confirm("Mover para lixeira?")) {
                const newProducts = dashProducts.map(p => p.id?.toString() === id.toString() ? { ...p, is_deleted: true, is_active: false } : p);
                await (supabase as any).from("notification_settings").upsert({ key_name: "PROMO_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
                toast({ title: "Movido para a lixeira." });
                fetchDashProducts();
            }
        }
    };

    const handleDeleteStore = async (id: string, isDeleted: boolean) => {
        if (!id) return;
        if (isDeleted) {
            if (confirm("Tem certeza que deseja apagar DEFINITIVAMENTE da loja?")) {
                const newProducts = storeProducts.filter(p => p.id?.toString() !== id.toString());
                await (supabase as any).from("notification_settings").upsert({ key_name: "STORE_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
                toast({ title: "Produto excluído permanentemente." });
                fetchStoreProducts();
            }
        } else {
            if (confirm("Mover para lixeira?")) {
                const newProducts = storeProducts.map(p => p.id?.toString() === id.toString() ? { ...p, is_deleted: true, is_active: false } : p);
                await (supabase as any).from("notification_settings").upsert({ key_name: "STORE_PRODUCTS_V1", category: "system_data", label: JSON.stringify(newProducts), is_enabled: true }, { onConflict: 'key_name' });
                toast({ title: "Movido para a lixeira." });
                fetchStoreProducts();
            }
        }
    };

    const displayDashProducts = dashListTab === 'ativos'
        ? dashProducts.filter(p => p.is_active !== false && p.is_deleted !== true)
        : dashProducts.filter(p => p.is_active === false || p.is_deleted === true);

    const displayStoreProducts = storeListTab === 'ativos'
        ? storeProducts.filter(p => p.is_active !== false && p.is_deleted !== true)
        : storeProducts.filter(p => p.is_active === false || p.is_deleted === true);

    return (
        <div className="space-y-6 pt-4 pb-8">
            <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <Button variant={subTab === 'dashboard' ? 'default' : 'ghost'} className={`flex-1 text-xs ${subTab === 'dashboard' ? 'bg-white/10' : ''}`} onClick={() => setSubTab('dashboard')}>Botões Dashboard</Button>
                <Button variant={subTab === 'store' ? 'default' : 'ghost'} className={`flex-1 text-xs ${subTab === 'store' ? 'bg-white/10' : ''}`} onClick={() => setSubTab('store')}>Loja (Física/Equip)</Button>
            </div>

            {subTab === 'dashboard' && (
                <>
                    <Card className="bg-[#111] border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                        <CardHeader>
                            <CardTitle className="text-yellow-500 uppercase flex items-center gap-2 text-base md:text-lg">
                                <ShoppingBag className="h-5 w-5" />
                                {dashEditingId ? "Editar Botão" : "Novo Botão de Destaque"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Texto do Botão</label>
                                <Input value={dashTitle} onChange={(e) => setDashTitle(e.target.value)} className="bg-black border-white/10 text-white" placeholder="Digite a chamada do botão..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Link (URL do Produto)</label>
                                <Input value={dashUrl} onChange={(e) => setDashUrl(e.target.value)} className="bg-black border-white/10 text-white" placeholder="https://" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-bold uppercase">Cor do Botão</label>
                                <div className="flex gap-2 flex-wrap pb-2">
                                    {colorOptions.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setDashColor(c.id)}
                                            className={`h-8 w-8 rounded-full border-2 transition-all ${dashColor === c.id ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'} ${c.bg}`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSaveDash} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold uppercase tracking-widest">
                                    <Save className="h-4 w-4 mr-2" /> {dashEditingId ? "Salvar" : "Adicionar à Home"}
                                </Button>
                                {dashEditingId && (
                                    <Button onClick={() => { setDashEditingId(null); setDashTitle(""); setDashUrl(""); setDashColor("orange"); }} variant="ghost" className="text-gray-400">Cancelar</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[#111] p-1 rounded-lg border border-white/5">
                            <Button variant={dashListTab === 'ativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setDashListTab('ativos')}>Ativos</Button>
                            <Button variant={dashListTab === 'inativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setDashListTab('inativos')}>Inativos / Lixeira</Button>
                        </div>

                        {loadingDash ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-yellow-500" /></div>
                        ) : displayDashProducts.length === 0 ? (
                            <Card className="bg-[#0c0c0c] border-dashed border-white/10"><CardContent className="p-8 text-center text-gray-500 text-sm">Nenhum botão nesta lista.</CardContent></Card>
                        ) : (
                            displayDashProducts.map(p => (
                                <Card key={p.id} className={`bg-[#0c0c0c] border-l-4 ${p.is_deleted ? 'border-l-red-500' : p.is_active !== false ? 'border-l-green-500' : 'border-l-gray-600'}`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-bold uppercase text-sm ${p.is_deleted ? 'text-red-500 line-through' : p.is_active !== false ? 'text-white' : 'text-gray-500'}`}>{p.title}</p>
                                                {p.is_deleted && <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded">EXCLUÍDO</span>}
                                            </div>
                                            <p className={`text-xs mt-1 truncate max-w-sm ${p.is_active !== false && !p.is_deleted ? 'text-blue-400' : 'text-gray-600'}`} title={p.url}>{p.url}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {!p.is_deleted && (
                                                <Button onClick={() => handleToggleStatusDash(p.id, p.is_active !== false)} size="sm" variant={p.is_active !== false ? "outline" : "default"} className={p.is_active !== false ? "border-white/10 text-green-400 hover:text-green-500 bg-white/5" : "bg-gray-700 text-white"}>
                                                    {p.is_active !== false ? "Desativar" : "Ativar"}
                                                </Button>
                                            )}
                                            {p.is_deleted ? (
                                                <Button onClick={() => handleToggleStatusDash(p.id, false)} size="sm" className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30">
                                                    Restaurar
                                                </Button>
                                            ) : (
                                                <Button onClick={() => { setDashEditingId(p.id); setDashTitle(p.title); setDashUrl(p.url); setDashColor(p.color || "orange"); }} size="sm" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30">
                                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                                </Button>
                                            )}
                                            <Button onClick={() => handleDeleteDash(p.id, !!p.is_deleted)} size="sm" className="bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/30">
                                                <Trash2 className="h-4 w-4 mr-2" /> {p.is_deleted ? 'Apagar Definitivo' : 'Excluir'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}

            {subTab === 'store' && (
                <>
                    <Card className="bg-[#111] border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                        <CardHeader>
                            <CardTitle className="text-orange-500 uppercase flex items-center gap-2 text-base md:text-lg">
                                <ShoppingBag className="h-5 w-5" />
                                {storeEditingId ? "Editar Produto Loja" : "Novo Produto na Loja"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Nome do Equipamento</label>
                                    <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="bg-black border-white/10 text-white" placeholder="Ex: Teclado Mecânico" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Preço Bruto Formatado</label>
                                    <Input value={storePrice} onChange={(e) => setStorePrice(e.target.value)} className="bg-black border-white/10 text-white" placeholder="R$ 150,00" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">URL da Imagem</label>
                                    <Input value={storeImage} onChange={(e) => setStoreImage(e.target.value)} className="bg-black border-white/10 text-white" placeholder="https://i.ibb.co/..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Categoria</label>
                                    <select value={storeCategory} onChange={(e) => setStoreCategory(e.target.value)} className="w-full bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-white">
                                        <option value="ACESSÓRIOS">ACESSÓRIOS</option>
                                        <option value="SETUP">SETUP</option>
                                        <option value="MOBILE">MOBILE</option>
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-xs text-gray-400 font-bold uppercase">Link de Compra</label>
                                    <Input value={storeLink} onChange={(e) => setStoreLink(e.target.value)} className="bg-black border-white/10 text-white" placeholder="https://mercadolivre.com/..." />
                                </div>
                                <div className="col-span-2 flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="featured" checked={storeFeatured} onChange={(e) => setStoreFeatured(e.target.checked)} className="h-4 w-4 bg-black border-white/10 accent-orange-500" />
                                    <label htmlFor="featured" className="text-xs text-gray-400 font-bold uppercase cursor-pointer">Definir como Destaque no Baner da Loja</label>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleSaveStore} className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold uppercase tracking-widest">
                                    <Save className="h-4 w-4 mr-2" /> {storeEditingId ? "Salvar" : "Adicionar Produto"}
                                </Button>
                                {storeEditingId && (
                                    <Button onClick={() => { setStoreEditingId(null); setStoreName(""); setStoreImage(""); setStoreLink(""); setStorePrice(""); setStoreFeatured(false); }} variant="ghost" className="text-gray-400">Cancelar</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end p-2 border border-orange-500/20 bg-[#111] rounded-lg">
                        <Button variant="outline" onClick={restoreStoreProducts} className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                            Restaurar 27 Produtos Iniciais (Use se sumiram)
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[#111] p-1 rounded-lg border border-white/5">
                            <Button variant={storeListTab === 'ativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setStoreListTab('ativos')}>Ativos</Button>
                            <Button variant={storeListTab === 'inativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setStoreListTab('inativos')}>Inativos / Lixeira</Button>
                        </div>

                        {loadingStore ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div>
                        ) : displayStoreProducts.length === 0 ? (
                            <Card className="bg-[#0c0c0c] border-dashed border-white/10"><CardContent className="p-8 text-center text-gray-500 text-sm">Nenhum produto nesta lista.</CardContent></Card>
                        ) : (
                            displayStoreProducts.map(p => (
                                <Card key={p.id} className={`bg-[#0c0c0c] border-l-4 ${p.is_deleted ? 'border-l-red-500' : p.is_active !== false ? 'border-l-green-500' : 'border-l-gray-600'}`}>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0 opacity-100">
                                            <img src={p.image} className={`w-12 h-12 rounded object-cover border border-white/10 ${p.is_deleted && 'grayscale opacity-50'}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold uppercase text-sm ${p.is_deleted ? 'text-red-500 line-through' : p.is_active !== false ? 'text-white' : 'text-gray-500'}`}>{p.name}</p>
                                                    {p.featured && !p.is_deleted && <span className="text-[9px] bg-orange-500 text-black font-black px-1.5 py-0.5 rounded">DESTAQUE</span>}
                                                    {p.is_deleted && <span className="text-[9px] bg-red-500/20 text-red-500 font-black px-1.5 py-0.5 rounded">EXCLUÍDO</span>}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{p.category} • <span className={`${p.is_deleted ? 'text-gray-500' : 'text-green-400'}`}>{p.price}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {!p.is_deleted && (
                                                <Button onClick={() => handleToggleStatusStore(p.id, p.is_active !== false)} size="sm" variant={p.is_active !== false ? "outline" : "default"} className={p.is_active !== false ? "border-white/10 text-green-400 hover:text-green-500 bg-white/5" : "bg-gray-700 text-white"}>
                                                    {p.is_active !== false ? "Desativar" : "Ativar"}
                                                </Button>
                                            )}
                                            {p.is_deleted ? (
                                                <Button onClick={() => handleToggleStatusStore(p.id, false)} size="sm" className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30">
                                                    Restaurar
                                                </Button>
                                            ) : (
                                                <Button onClick={() => { setStoreEditingId(p.id); setStoreName(p.name); setStoreImage(p.image); setStoreLink(p.link); setStorePrice(p.price); setStoreCategory(p.category); setStoreFeatured(p.featured); }} size="sm" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30">
                                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                                </Button>
                                            )}
                                            <Button onClick={() => handleDeleteStore(p.id, !!p.is_deleted)} size="sm" className="bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/30">
                                                <Trash2 className="h-4 w-4 mr-2" /> {p.is_deleted ? 'Apagar Definitivo' : 'Excluir'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

const ICON_OPTIONS = ['🎫', '🛡️', '🪙', '💎', '🔥', '⚔️', '⭐', '🥇', '👑', '💸', '🚀', '🎁', '🔑', '🎟️', '🏆', '🎯', '⚡', '🌟', '💼', '💳'];

const AdminPasses = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({ title: '', price: '', roomPrice: '', icon: '🎫', color: 'yellow', is_active: true, extra_text: '' });
    const [listTab, setListTab] = useState<'ativos' | 'inativos'>('ativos');
    const { toast } = useToast();

    const fetchPlans = async () => {
        setLoading(true);
        const { data } = await (supabase as any).from('notification_settings').select('label').eq('key_name', 'VIP_PLANS_V1').single();
        if (data && data.label) {
            try { setPlans(JSON.parse(data.label)); } catch (e) { }
        } else {
            const defaults = [
                { id: "ID_001", title: "Plano Master", price: 97, roomPrice: 2, icon: "🛡️", color: "yellow", is_active: true, is_deleted: false, extra_text: '' },
                { id: "ID_002", title: "Plano Gold", price: 209, roomPrice: 5, icon: "🪙", color: "orange", is_active: true, is_deleted: false, extra_text: '' },
                { id: "ID_003", title: "Plano Diamante", price: 389, roomPrice: 10, icon: "💎", color: "cyan", is_active: true, is_deleted: false, extra_text: '' }
            ];
            await (supabase as any).from('notification_settings').upsert({ key_name: 'VIP_PLANS_V1', category: 'system_data', label: JSON.stringify(defaults), is_enabled: true }, { onConflict: 'key_name' });
            setPlans(defaults);
        }
        setLoading(false);
    };

    useEffect(() => { fetchPlans(); }, []);

    const savePlansToDb = async (newPlans: any[]) => {
        await (supabase as any).from('notification_settings').upsert({ key_name: 'VIP_PLANS_V1', category: 'system_data', label: JSON.stringify(newPlans), is_enabled: true }, { onConflict: 'key_name' });
        setPlans(newPlans);
        toast({ title: "Planos atualizados com sucesso!" });
    };

    const handleSave = () => {
        let newPlans = [...plans];
        if (editId) {
            newPlans = newPlans.map(p => p.id === editId ? { ...p, ...formData, price: Number(formData.price), roomPrice: Number(formData.roomPrice) } : p);
        } else {
            newPlans.push({ ...formData, id: "ID_" + Date.now(), price: Number(formData.price), roomPrice: Number(formData.roomPrice), is_deleted: false });
        }
        savePlansToDb(newPlans);
        setEditId(null);
        setFormData({ title: '', price: '', roomPrice: '', icon: '🎫', color: 'yellow', is_active: true, extra_text: '' });
    };

    const handleEdit = (p: any) => { setEditId(p.id); setFormData(p); };
    const handleDelete = (id: string, isDeleted: boolean) => {
        if (isDeleted) {
            if (confirm("Tem certeza que deseja apagar DEFINITIVAMENTE esse plano?")) {
                savePlansToDb(plans.filter(p => p.id !== id));
            }
        } else {
            if (confirm("Mover plano para lixeira?")) {
                savePlansToDb(plans.map(p => p.id === id ? { ...p, is_deleted: true, is_active: false } : p));
                setListTab('inativos');
            }
        }
    };
    const handleToggle = (id: string, current: boolean) => {
        savePlansToDb(plans.map(p => p.id === id ? { ...p, is_active: !current, is_deleted: (!current ? false : p.is_deleted) } : p));
        setListTab(current ? 'inativos' : 'ativos');
    };

    const displayPlans = listTab === 'ativos'
        ? plans.filter(p => p.is_active !== false && p.is_deleted !== true)
        : plans.filter(p => p.is_active === false || p.is_deleted === true);

    return (
        <div className="space-y-6 pt-4 pb-8">
            <Card className="bg-[#111] border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                <CardHeader>
                    <CardTitle className="text-orange-500 uppercase flex items-center gap-2 text-base md:text-lg">
                        <Ticket className="h-5 w-5" />
                        {editId ? "Editar Plano VIP" : "Novo Plano VIP"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Nome do Plano</label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-black border-white/10 text-white" placeholder="Ex: Plano Master" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Preço Mensal (R$)</label>
                            <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="bg-black border-white/10 text-white" placeholder="97" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Valor da Sala p/ Passe (R$)</label>
                            <Input type="number" value={formData.roomPrice} onChange={e => setFormData({ ...formData, roomPrice: e.target.value })} className="bg-black border-white/10 text-white" placeholder="2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Texto Adicional (Opcional)</label>
                            <Input value={formData.extra_text || ''} onChange={e => setFormData({ ...formData, extra_text: e.target.value })} className="bg-black border-white/10 text-white" placeholder="Ex: Cancele a qualquer momento" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Ícone (Passe)</label>
                            <div className="flex gap-2 flex-wrap pb-2">
                                {ICON_OPTIONS.map(i => (
                                    <button
                                        key={i}
                                        onClick={() => setFormData({ ...formData, icon: i })}
                                        className={`h-10 w-10 text-xl rounded-full border-2 transition-all flex items-center justify-center bg-black ${formData.icon === i ? 'border-orange-500 scale-110 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'}`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Cor do Card (Avançado)</label>
                            <div className="flex gap-2 flex-wrap">
                                {['yellow', 'orange', 'cyan', 'green', 'blue', 'purple', 'red'].map(c => (
                                    <button key={c} onClick={() => setFormData({ ...formData, color: c })} title={`Cor: ${c}`} className={`h-8 w-8 rounded-full border-2 bg-${c}-500 ${formData.color === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`} />
                                ))}

                                {/* Cores Metálicas Premium */}
                                <button
                                    onClick={() => setFormData({ ...formData, color: 'bronze' })}
                                    title="Bronze"
                                    className={`h-8 w-8 rounded-full border-2 bg-gradient-to-br from-amber-700 to-orange-900 ${formData.color === 'bronze' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                />
                                <button
                                    onClick={() => setFormData({ ...formData, color: 'silver' })}
                                    title="Prata"
                                    className={`h-8 w-8 rounded-full border-2 bg-gradient-to-br from-gray-300 to-gray-500 ${formData.color === 'silver' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                />
                                <button
                                    onClick={() => setFormData({ ...formData, color: 'gold' })}
                                    title="Ouro Metálico"
                                    className={`h-8 w-8 rounded-full border-2 bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 ${formData.color === 'gold' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                />
                                <button
                                    onClick={() => setFormData({ ...formData, color: 'diamond' })}
                                    title="Azul Diamante"
                                    className={`h-8 w-8 rounded-full border-2 bg-gradient-to-br from-cyan-200 via-cyan-400 to-blue-500 ${formData.color === 'diamond' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest"><Save className="mr-2 h-4 w-4" /> Salvar Plano</Button>
                        {editId && <Button onClick={() => { setEditId(null); setFormData({ title: '', price: '', roomPrice: '', icon: '🎫', color: 'yellow', is_active: true, extra_text: '' }) }} variant="outline" className="flex-1 bg-transparent text-gray-400">Cancelar</Button>}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center bg-[#111] p-1 rounded-lg border border-white/5 mt-6 mb-2">
                <Button variant={listTab === 'ativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setListTab('ativos')}>Ativos</Button>
                <Button variant={listTab === 'inativos' ? 'default' : 'ghost'} className={`flex-1 text-xs`} onClick={() => setListTab('inativos')}>Inativos / Lixeira</Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div>
            ) : displayPlans.length === 0 ? (
                <Card className="bg-[#0c0c0c] border-dashed border-white/10"><CardContent className="p-8 text-center text-gray-500 text-sm">Nenhum plano encontrado nesta lista.</CardContent></Card>
            ) : (
                <div className="grid gap-4 mt-2">
                    {displayPlans.map(p => (
                        <Card key={p.id} className={`bg-[#0c0c0c] border-l-4 ${p.is_deleted ? 'border-l-red-500' : p.is_active ? 'border-l-green-500' : 'border-l-gray-600'}`}>
                            <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4 opacity-100">
                                    <div className={`text-4xl ${p.is_deleted && 'grayscale opacity-50'}`}>{p.icon}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-sm font-bold uppercase ${p.is_deleted ? 'text-red-500 line-through' : `text-${p.color}-500`}`}>{p.title} <span className="text-xs text-gray-500 font-normal">({p.id})</span></h3>
                                            {p.is_deleted && <span className="text-[9px] bg-red-500/20 text-red-500 font-black px-1.5 py-0.5 rounded">LIXEIRA</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">Mensalidade: <b className={`${p.is_deleted ? 'text-gray-500' : 'text-white'}`}>R$ {p.price}</b> | Salas: <b className={`${p.is_deleted ? 'text-gray-500' : 'text-green-400'}`}>R$ {p.roomPrice}</b></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t border-white/5 pt-3 md:pt-0 md:border-t-0 flex-wrap">
                                    {!p.is_deleted && (
                                        <Button size="sm" variant={p.is_active ? 'outline' : 'default'} className={p.is_active ? 'bg-white/5 border-white/10 text-green-400 hover:text-green-500' : 'bg-gray-700 text-white hover:bg-gray-600'} onClick={() => handleToggle(p.id, p.is_active)}>
                                            {p.is_active ? 'Desativar' : 'Ativar'}
                                        </Button>
                                    )}
                                    {p.is_deleted ? (
                                        <Button size="sm" onClick={() => handleToggle(p.id, false)} className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30">
                                            Restaurar
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(p)} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"><Edit className="h-4 w-4 mr-2" /> Editar</Button>
                                    )}
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id, !!p.is_deleted)} className="bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/30"><Trash2 className="h-4 w-4 mr-2" /> {p.is_deleted ? 'Apagar Definitivo' : 'Excluir'}</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AdminPassesUsers />
        </div>
    );
};

const AdminPassesUsers = () => {
    const [stats, setStats] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const { data } = await (supabase as any).from('profiles').select('plan_type, id');
            if (data) {
                const groups: Record<string, number> = {};
                data.forEach((p: any) => {
                    const pl = p.plan_type || 'Free Avulso';
                    groups[pl] = (groups[pl] || 0) + 1;
                });
                setStats(Object.entries(groups).map(([k, v]) => ({ plan: k, count: v })));
            }
        };
        fetchStats();
    }, []);

    return (
        <Card className="bg-[#111] border-white/5 mt-8 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <CardHeader><CardTitle className="text-blue-500 uppercase flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" /> Assinantes por Plano</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {stats.map(s => (
                        <div key={s.plan} className="flex justify-between items-center p-3 bg-black rounded-lg border border-white/5">
                            <span className="font-bold text-gray-300 uppercase text-sm">{s.plan}</span>
                            <Badge className="bg-blue-600 font-black">{s.count} usuários</Badge>
                        </div>
                    ))}
                    {stats.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Nenhum dado encontrado.</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// --- 11. CARTEIRA E LUCRO DA EMPRESA ---
// --- 11. CARTEIRA E LUCRO DA EMPRESA ---
function AdminCompanyWallet() {
    const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes' | 'tudo'>('semana');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalProfit: 0, totalDeposits: 0, totalWithdrawals: 0, totalPrizes: 0, matchesFinished: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        const fetchWallet = async () => {
            setLoading(true);
            const now = new Date();
            let startRange: Date | null = null;
            let endRange: Date = endOfDay(now);

            if (period === 'hoje') startRange = startOfDay(now);
            else if (period === 'semana') startRange = startOfWeek(now, { weekStartsOn: 0 });
            else if (period === 'mes') startRange = startOfMonth(now);

            // Fetch wallet reset date
            const { data: resetData } = await (supabase as any)
                .from("notification_settings")
                .select("label")
                .eq("key_name", "WALLET_RESET_DATE")
                .maybeSingle();

            let resetDate: Date | null = null;
            if (resetData && resetData.label) {
                resetDate = new Date(resetData.label);
            }

            if (resetDate) {
                if (!startRange || resetDate > startRange) {
                    startRange = resetDate;
                }
            }

            let queryTournaments = supabase.from("tournaments").select("updated_at, platform_tax, prize_pool").eq("status", "finished");
            if (startRange) {
                queryTournaments = queryTournaments.gte("updated_at", startRange.toISOString()).lte("updated_at", endRange.toISOString());
            }

            let queryTx = supabase.from("transactions").select("created_at, amount, type").in("status", ["approved"]);
            if (startRange) {
                queryTx = queryTx.gte("created_at", startRange.toISOString()).lte("created_at", endRange.toISOString());
            }

            const [tRes, txRes] = await Promise.all([queryTournaments, queryTx]);

            let sTotal = 0;
            let sMatches = 0;
            let sDep = 0;
            let sWith = 0;
            let sPrize = 0;
            const daily: Record<string, any> = {};

            const initDay = (d: string) => {
                if (!daily[d]) daily[d] = { name: d, lucro: 0, deposit: 0, withdraw: 0, prizes: 0 };
            };

            if (tRes.data) {
                tRes.data.forEach(t => {
                    const profit = Number(t.platform_tax || 0);
                    const prize = Number(t.prize_pool || 0);
                    sTotal += profit;
                    sMatches += 1;
                    sPrize += prize;
                    const dateKey = format(new Date(t.updated_at), "dd/MM");
                    initDay(dateKey);
                    daily[dateKey].lucro += profit;
                    daily[dateKey].prizes += prize;
                });
            }

            if (txRes.data) {
                txRes.data.forEach(tx => {
                    const val = Number(tx.amount || 0);
                    const isDep = tx.type === 'deposit';
                    if (isDep) sDep += val;
                    else sWith += val;

                    const dateKey = format(new Date(tx.created_at), "dd/MM");
                    initDay(dateKey);
                    if (isDep) daily[dateKey].deposit += val;
                    else daily[dateKey].withdraw += val;
                });
            }

            const formattedChartData = [];
            if (period === 'semana') {
                for (let i = 6; i >= 0; i--) {
                    const d = format(subDays(now, i), "dd/MM");
                    formattedChartData.push(daily[d] || { name: d, lucro: 0, deposit: 0, withdraw: 0, prizes: 0 });
                }
            } else if (period === 'mes') {
                for (let i = 29; i >= 0; i--) {
                    const d = format(subDays(now, i), "dd/MM");
                    formattedChartData.push(daily[d] || { name: d, lucro: 0, deposit: 0, withdraw: 0, prizes: 0 });
                }
            } else {
                Object.keys(daily).sort().forEach(k => {
                    formattedChartData.push(daily[k]);
                });
            }

            setStats({ totalProfit: sTotal, totalDeposits: sDep, totalWithdrawals: sWith, totalPrizes: sPrize, matchesFinished: sMatches });
            setChartData(formattedChartData);
            setLoading(false);
        };
        fetchWallet();
    }, [period, refreshTrigger]);

    const handleResetWallet = async () => {
        if (!confirm("ATENÇÃO: Você tem certeza que deseja RESETAR a carteira? Isso vai definir a data inicial de todos os gráficos desta aba para AGORA, zerando o painel para iniciar um novo ciclo financeiro. O histórico real de transações no banco de dados não será apagado, esta ação apenas afeta a visualização móvel.")) return;

        await (supabase as any).from("notification_settings").upsert({
            key_name: "WALLET_RESET_DATE",
            category: "system_data",
            label: new Date().toISOString(),
            is_enabled: true
        }, { onConflict: 'key_name' });

        toast({ title: "Carteira zerada com sucesso!", description: "Seu painel inicia um novo ciclo contábil." });
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-900 via-emerald-900 to-black border border-green-500/30 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-green-500/20 p-3 rounded-2xl border border-green-500/30">
                                <Wallet className="h-8 w-8 text-green-400" />
                            </div>
                            <h3 className="text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-200 tracking-tight">Painel Financeiro & Lucro</h3>
                        </div>
                        <p className="text-sm text-green-100/70 font-medium tracking-tight">Análise de caixa, entradas, saídas e lucro retido da plataforma (Taxa de 30%).</p>
                    </div>

                    <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto">
                        {['hoje', 'semana', 'mes', 'tudo'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={`text-[10px] md:text-sm font-black uppercase px-6 py-3 rounded-xl transition-all duration-300 ${period === p ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20 min-h-[400px]">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-24 h-24 border-4 border-green-500/20 rounded-full animate-ping"></div>
                        <Loader2 className="animate-spin h-12 w-12 text-green-500 relative z-10" />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-black/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-green-500/50 transition-all duration-300 rounded-[2rem]">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
                            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-green-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Wallet className="h-6 w-6 text-green-400" /></div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Lucro Retido (30%)</p>
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-200">R$ {stats.totalProfit.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-black/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300 rounded-[2rem]">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-blue-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Upload className="h-6 w-6 text-blue-400" /></div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Depósitos Totais</p>
                                <p className="text-3xl font-black text-blue-400">R$ {stats.totalDeposits.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-black/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-red-500/50 transition-all duration-300 rounded-[2rem]">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
                            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-red-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><DollarSign className="h-6 w-6 text-red-400" /></div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Saques Realizados</p>
                                <p className="text-3xl font-black text-red-400">R$ {stats.totalWithdrawals.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-black/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-yellow-500/50 transition-all duration-300 rounded-[2rem]">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"></div>
                            <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-yellow-500/10 rounded-2xl mb-3 group-hover:scale-110 transition-transform"><Trophy className="h-6 w-6 text-yellow-400" /></div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Prêmios Pagos</p>
                                <p className="text-3xl font-black text-yellow-400">R$ {stats.totalPrizes.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-[#050505] border-white/5 rounded-[2rem] overflow-hidden">
                            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                                <CardTitle className="text-sm uppercase text-gray-400 flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-green-500" /> Crescimento do Lucro (Retenção 30%)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-72 p-6">
                                {chartData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-600">Nenhum dado financeiro.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', padding: '12px' }}
                                                itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Lucro']}
                                                labelStyle={{ color: '#888', marginBottom: '8px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="lucro" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-[#050505] border-white/5 rounded-[2rem] overflow-hidden">
                            <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                                <CardTitle className="text-sm uppercase text-gray-400 flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-blue-500" /> Fluxo de Caixa (Depósitos vs Saques)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-72 p-6">
                                {chartData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-xs text-gray-600">Nenhum dado financeiro.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px', padding: '12px' }}
                                                formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name === 'deposit' ? 'Depósito' : 'Saque']}
                                                labelStyle={{ color: '#888', marginBottom: '8px', fontWeight: 'bold' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="deposit" name="deposit" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="withdraw" name="withdraw" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Botão de Reset */}
                    <div className="flex justify-end pt-8 pb-4">
                        <Button
                            variant="outline"
                            onClick={handleResetWallet}
                            className="bg-red-900/10 border-red-500/30 text-red-500 hover:bg-red-900/40 hover:text-red-400 font-bold uppercase tracking-widest text-xs h-12 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Zarar Dados e Recomeçar Gráficos
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 13. CHAT GLOBAL (ADMIN) ---
function AdminChatControl({ onTabChange }: { onTabChange: (val: string) => void }) {
    const [isLocked, setIsLocked] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [newMessage, setNewMessage] = useState("");
    const [sendPush, setSendPush] = useState(false);
    const [pinnedMsg, setPinnedMsg] = useState("");
    const [isSavingPinned, setIsSavingPinned] = useState(false);
    const { profile } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const loadState = async () => {
            const { data } = await supabase.from('notification_settings').select('is_enabled').eq('key_name', 'global_chat_locked').maybeSingle();
            if (data) setIsLocked(data.is_enabled);
            else {
                await supabase.from('notification_settings').insert({ key_name: 'global_chat_locked', category: 'chat', label: 'Chat Trancado', is_enabled: false });
            }
        };
        loadState();

        const presenceChannel = supabase.channel("admin_chat_presence", { config: { presence: { key: profile?.user_id || 'admin' } } });
        presenceChannel.on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            setOnlineCount(Object.keys(state).length);
        }).subscribe(async (status) => {
            if (status === "SUBSCRIBED" && profile) {
                await presenceChannel.track({ user: 'Admin Tracker', is_admin: true });
            }
        });

        const settingsChannel = supabase.channel("admin_chat_locking")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notification_settings", filter: "key_name=eq.global_chat_locked" }, (payload) => {
                setIsLocked(payload.new.is_enabled);
            }).subscribe();

        const loadPinned = async () => {
            const { data } = await supabase.from('notification_settings').select('label, is_enabled').eq('key_name', 'global_chat_pinned_message').maybeSingle();
            if (data && data.is_enabled) setPinnedMsg(data.label);
        };
        loadPinned();

        return () => {
            supabase.removeChannel(presenceChannel);
            supabase.removeChannel(settingsChannel);
        };
    }, [profile]);

    const toggleLock = async () => {
        const newState = !isLocked;
        await supabase.from('notification_settings').update({ is_enabled: newState }).eq('key_name', 'global_chat_locked');
        setIsLocked(newState);
        toast({ title: newState ? "Chat trancado. Apenas o Admin pode enviar mensagens." : "Chat destrancado. Jogadores podem enviar mensagens." });

        // Auto-anounce it in chat
        await supabase.from('global_chat_messages').insert({
            sender_id: profile?.user_id,
            message: newState ? "🚨 O Chat Global foi trancado pelo Administrador." : "✅ O Chat Global foi liberado!",
            is_admin: true
        });

        // Trigger system update correctly
        await supabase.from('global_chat_messages').insert({
            sender_id: profile?.user_id,
            message: 'SYS_CMD_UPDATE_LOCK',
            is_admin: true
        });
    };

    const handleClearChat = async () => {
        if (!confirm("Tem certeza que deseja LIMPAR TODO o histórico do Chat Global?")) return;
        const { error } = await supabase.from('global_chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) {
            toast({ title: "Chat limpo com sucesso!" });
            // Broadcast reload command to everyone
            await supabase.from('global_chat_messages').insert({
                sender_id: profile?.user_id,
                message: 'SYS_CMD_RELOAD',
                is_admin: true
            });
        } else {
            toast({ variant: "destructive", title: "Erro ao limpar", description: error.message });
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profile) return;

        if (sendPush) {
            await supabase.from('global_chat_messages').insert({
                sender_id: profile.user_id,
                message: `📢 [PRIORIDADE] ${newMessage}`,
                is_admin: true
            });
            await sendPushNotification('push_announcements', 'Mensagem do Admin 🚨', newMessage);
            toast({ title: "Mensagem e Push enviados com sucesso!" });
        } else {
            await supabase.from('global_chat_messages').insert({
                sender_id: profile.user_id,
                message: newMessage,
                is_admin: true
            });
            toast({ title: "Mensagem enviada com sucesso!" });
        }

        setNewMessage("");
        setSendPush(false);
    };

    const handleSavePinned = async () => {
        setIsSavingPinned(true);
        const { error } = await supabase.from('notification_settings').upsert({
            key_name: 'global_chat_pinned_message',
            category: 'chat',
            label: pinnedMsg || '',
            is_enabled: !!pinnedMsg.trim()
        }, { onConflict: 'key_name' });

        if (!error) {
            toast({ title: "Mensagem fixada atualizada!" });
            await supabase.from('global_chat_messages').insert({
                sender_id: profile?.user_id,
                message: 'SYS_CMD_UPDATE_PIN',
                is_admin: true
            });
        } else {
            console.error("Save pinned error:", error);
            toast({ title: "Erro ao atualizar mensagem fixada.", description: error.message });
        }
        setIsSavingPinned(false);
    };

    const handleClearPinned = async () => {
        setIsSavingPinned(true);
        const { error } = await supabase.from('notification_settings').upsert({
            key_name: 'global_chat_pinned_message',
            category: 'chat',
            label: '',
            is_enabled: false
        }, { onConflict: 'key_name' });

        if (!error) {
            setPinnedMsg("");
            toast({ title: "Mensagem fixada removida!" });
            await supabase.from('global_chat_messages').insert({
                sender_id: profile?.user_id,
                message: 'SYS_CMD_UPDATE_PIN',
                is_admin: true
            });
        }
        setIsSavingPinned(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-900/30 to-orange-900/10 border border-orange-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black uppercase text-orange-400 flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Controle do Chat Global</h3>
                    <p className="text-xs text-gray-400 mt-1">Interaja com os jogadores, lance votações, tranque o chat e dispare Push Notifications.</p>
                </div>
                <div className="text-right">
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs animate-pulse">
                        <Users className="h-3 w-3 mr-1" /> {onlineCount} Usuários Online App
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* Send Messages & Push */}
                    <Card className="bg-[#111] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2"><Send className="h-4 w-4 text-neon-orange" /> Enviar Mensagem Estratégica</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleSendMessage} className="space-y-4">
                                <div>
                                    <Label className="text-xs mb-1">Mensagem (Visível para todos, com destaque)</Label>
                                    <Input
                                        className="bg-black border-white/10 focus-visible:ring-neon-orange"
                                        placeholder="Ex: Quem quer uma Sala Relâmpago agora? Reaja aqui!"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 bg-white/5 p-3 rounded-md">
                                    <Switch id="push-toggle" checked={sendPush} onCheckedChange={setSendPush} className="data-[state=checked]:bg-orange-500" />
                                    <Label htmlFor="push-toggle" className="text-xs font-bold cursor-pointer flex flex-col">
                                        <span className="text-white">Marcar como Prioridade (Enviar Push)</span>
                                        <span className="text-[10px] text-gray-500 font-normal">Isso fará todos os celulares dos usuários vibrarem chamando para o App.</span>
                                    </Label>
                                </div>
                                <Button type="submit" disabled={!newMessage.trim()} className="w-full font-bold bg-neon-orange hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(255,100,0,0.3)]">
                                    Disparar Mensagem no Chat
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Moderation Controls */}
                    <Card className="bg-[#111] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2"><Shield className="h-4 w-4 text-orange-500" /> Controle de Segurança e Fluxo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <Label className="text-xs text-gray-400">Trancar / Destrancar Chat</Label>
                                <p className="text-[10px] text-gray-500 mb-2">Use isso quando quiser focar a atenção dos jogadores apenas nos seus anúncios, ou se houver muito spam.</p>
                                <Button onClick={toggleLock} variant={isLocked ? "default" : "outline"} className={`w-full font-bold flex items-center gap-2 ${isLocked ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-red-500 text-red-500 hover:bg-red-500/10'}`}>
                                    {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                    {isLocked ? "Destrancar Chat (Permitir Todos)" : "Trancar Chat (Apenas você fala)"}
                                </Button>
                                <Button onClick={handleClearChat} variant="destructive" className="w-full font-black uppercase text-[10px] tracking-widest h-10 mt-2 bg-red-900/20 text-red-500 border border-red-500/30 hover:bg-red-900/40">
                                    <Trash2 className="h-3 w-3 mr-2" /> Limpar Histórico do Chat
                                </Button>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <Label className="text-xs text-gray-400 mb-2 block">Moderação (Restringir Jogador)</Label>
                                <p className="text-[10px] text-gray-500 mb-3">Vá na aba "Jogadores" para gerenciar Banimento Específico do Chat Global usando o menu de edição do Jogador. (O jogador continuará podendo jogar Salas normalmente).</p>
                                <Button variant="secondary" className="w-full text-xs" onClick={() => onTabChange("users")}>Ir para Jogadores</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pinned Message Control */}
                    <Card className="bg-[#111] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Pin className="h-4 w-4 text-yellow-500" /> Mensagem Fixada no Topo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-xs mb-1">Conteúdo da Mensagem Fixada</Label>
                                <Input
                                    className="bg-black border-white/10 focus-visible:ring-yellow-500"
                                    placeholder="Ex: 📢 Promoção relâmpago às 20h! Não perca."
                                    value={pinnedMsg}
                                    onChange={(e) => setPinnedMsg(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-500 mt-2">Esta mensagem aparecerá travada no topo do chat para todos os usuários. Deixe em branco para remover.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSavePinned} disabled={isSavingPinned} className="flex-1 font-bold bg-yellow-600 hover:bg-yellow-700 text-white">
                                    {isSavingPinned ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Fixação"}
                                </Button>
                                {pinnedMsg && (
                                    <Button onClick={handleClearPinned} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 h-10 font-bold">
                                        Limpar
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="h-full min-h-[600px] border border-white/10 bg-black/40 rounded-2xl p-2 relative">
                    <div className="absolute top-2 left-4 z-10">
                        <Badge className="bg-neon-orange text-black border-none text-[10px] uppercase font-black px-2 py-0.5">Visão do Aplicativo (Live)</Badge>
                    </div>
                    <GlobalChat embedded />
                </div>
            </div>
        </div>
    );
}

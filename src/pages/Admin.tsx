import { useState, useEffect } from "react";
import { 
  Shield, Trophy, Wallet, Users, MessageSquare, Plus, Check, X, Star, ExternalLink, Loader2, 
  Edit, Save, Calendar, Link as LinkIcon, Trash2, Send, Lightbulb, Archive, Gamepad2, Search, 
  AlertTriangle, History, Eye, Clock, UserCog, Upload, DollarSign, ArrowLeft, Gift, Ban, Lock, Bell
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { playNotificationSound } from "@/utils/notificationSound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// Definir SINO para evitar erro no código
const SINO = Bell;

export default function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [adminUnread, setAdminUnread] = useState(0);

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

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-neon-orange"><Loader2 className="animate-spin h-10 w-10"/></div>;
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

      <Tabs defaultValue="notifications" className="px-2 pt-4">
        <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent h-auto p-0 mb-4 overflow-x-auto">
          <TabItem value="notifications" icon={SINO} label="Notificações" />
          <TabItem value="tournaments" icon={Trophy} label="Torneios" />
          <TabItem value="rooms" icon={Gamepad2} label="Salas Ao Vivo" />
          <TabItem value="users" icon={Users} label="Jogadores" />
          <TabItem value="finance" icon={Wallet} label="Financeiro" />
          <TabItem value="payment_link" icon={LinkIcon} label="Link da Conta" />
          <TabItem value="support" icon={MessageSquare} label="Suporte" />
          <TabItem value="logs" icon={History} label="Registros" />
          <TabItem value="referrals" icon={Gift} label="Indicações" />
          <TabItem value="alerts" icon={AlertTriangle} label="Alertas" />
        </TabsList>

        <div className="px-2">
            <TabsContent value="notifications"><AdminNotificationsSettings /></TabsContent>
            <TabsContent value="tournaments"><AdminTournaments /></TabsContent>
            <TabsContent value="rooms"><AdminRooms /></TabsContent>
            <TabsContent value="users"><AdminUsers /></TabsContent>
            <TabsContent value="finance"><AdminFinance /></TabsContent>
            <TabsContent value="payment_link"><AdminPaymentLink /></TabsContent>
            <TabsContent value="support"><AdminSupport /></TabsContent>
            <TabsContent value="logs"><AdminLogs /></TabsContent>
            <TabsContent value="referrals"><AdminReferrals /></TabsContent>
            <TabsContent value="alerts"><AdminAlerts /></TabsContent>
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
            const { data } = await supabase.from('notification_settings').select('*');
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
        const { error } = await supabase.from('notification_settings').upsert({ 
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
      max_players: "50"
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  
  const fetchTournaments = async () => {
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    if (data) setTournaments(data);
  };

  useEffect(() => { fetchTournaments(); }, []);

  const handleCreate = async () => {
    if (!formData.title || !formData.entry_fee) return toast({ variant: "destructive", title: "Preencha os dados obrigatórios" });
    
    const { error } = await supabase.from("tournaments").insert({
      title: formData.title,
      type: formData.type,
      entry_fee: parseFloat(formData.entry_fee),
      prize_pool: parseFloat(formData.prize_pool),
      room_link: formData.room_link,
      scheduled_at: formData.scheduled_at || null,
      status: formData.is_open ? 'open' : 'closed',
      max_players: parseInt(formData.max_players) || 50
    });

    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else { 
        toast({ title: "Torneio Criado!" }); 
        fetchTournaments(); 
        await supabase.from("audit_logs").insert({ 
            admin_id: (await supabase.auth.getUser()).data.user?.id, 
            action_type: 'tournament_create', 
            details: `Criou torneio: ${formData.title} (Entrada: R$${formData.entry_fee}, Prêmio: R$${formData.prize_pool})` 
        });
        setFormData({ title: "", type: "SQUAD", entry_fee: "", prize_pool: "", room_link: "", scheduled_at: "", is_open: true, open_time: "", close_time: "", max_players: "50" });
    }
  };

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza?")) return;
      const t = tournaments.find(x => x.id === id);
      await supabase.from("tournaments").delete().eq("id", id);
      await supabase.from("audit_logs").insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action_type: 'tournament_delete', details: `Deletou torneio: ${t?.title}` });
      fetchTournaments();
  };

  const handleSetFeatured = async (id: string) => {
    await supabase.from("tournaments").update({ is_featured: false }).neq("id", id);
    await supabase.from("tournaments").update({ is_featured: true }).eq("id", id);
    toast({ title: "Destaque atualizado!" }); 
    fetchTournaments();
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditData({ title: t.title, type: t.type, entry_fee: t.entry_fee, prize_pool: t.prize_pool, room_link: t.room_link || "", scheduled_at: t.scheduled_at ? t.scheduled_at.slice(0, 16) : "", is_open: t.status === 'open', max_players: String(t.max_players || 50) });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("tournaments").update({
      title: editData.title, type: editData.type, entry_fee: parseFloat(editData.entry_fee), prize_pool: parseFloat(editData.prize_pool),
      room_link: editData.room_link || null, scheduled_at: editData.scheduled_at || null, 
      status: editData.is_open ? 'open' : 'closed',
      max_players: parseInt(editData.max_players) || 50
    }).eq("id", editingId);
    if (!error) { toast({ title: "Atualizado!" }); setEditingId(null); fetchTournaments(); }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-[#0c0c0c]">
        <CardHeader className="pb-3 border-b border-white/5"><CardTitle className="flex items-center gap-2 text-sm uppercase text-neon-orange"><Plus className="h-4 w-4" /> Criar Nova Sala</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Input placeholder="Nome da Sala (Ex: Diário Solo)" className="bg-black/50 border-white/10" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
             <select className="bg-black border border-white/10 text-sm rounded-md px-3 h-10 text-white w-full" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="SOLO">SOLO</option><option value="DUO">DUO</option><option value="SQUAD">SQUAD</option>
             </select>
             <Input type="datetime-local" className="bg-black/50 border-white/10" value={formData.scheduled_at} onChange={e => setFormData({...formData, scheduled_at: e.target.value})} />
          </div>
           <div className="grid grid-cols-3 gap-3">
             <div className="space-y-1"><Label className="text-[10px]">Entrada (R$)</Label><Input type="number" className="bg-black/50 border-white/10" value={formData.entry_fee} onChange={e => setFormData({...formData, entry_fee: e.target.value})} /></div>
             <div className="space-y-1"><Label className="text-[10px]">Prêmio (R$)</Label><Input type="number" className="bg-black/50 border-white/10" value={formData.prize_pool} onChange={e => setFormData({...formData, prize_pool: e.target.value})} /></div>
             <div className="space-y-1"><Label className="text-[10px]">Jogadores</Label><Input type="number" min="0" max="54" className="bg-black/50 border-white/10" value={formData.max_players} onChange={e => setFormData({...formData, max_players: e.target.value})} placeholder="50" /></div>
           </div>
          
          <div className="p-3 border border-white/10 rounded-lg bg-white/5 space-y-3">
              <Label className="text-xs text-neon-green font-bold uppercase">Controle de Abertura</Label>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-[10px] text-gray-400">Abre às:</Label><Input type="time" className="bg-black border-white/10" value={formData.open_time} onChange={e => setFormData({...formData, open_time: e.target.value})} /></div>
                  <div className="space-y-1"><Label className="text-[10px] text-gray-400">Fecha às:</Label><Input type="time" className="bg-black border-white/10" value={formData.close_time} onChange={e => setFormData({...formData, close_time: e.target.value})} /></div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                  <Switch checked={formData.is_open} onCheckedChange={c => setFormData({...formData, is_open: c})} className="data-[state=checked]:bg-neon-green" />
                  <Label className="text-xs cursor-pointer">{formData.is_open ? "Sala ABERTA AGORA (Verde)" : "Sala FECHADA (Vermelho)"}</Label>
              </div>
          </div>

          <Input placeholder="Link/ID da Sala Free Fire" className="bg-black/50 border-white/10" value={formData.room_link} onChange={e => setFormData({...formData, room_link: e.target.value})} />
          <Button onClick={handleCreate} className="w-full bg-orange-600 hover:bg-orange-700 font-black tracking-widest">PUBLICAR TORNEIO</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-gray-500">Salas Ativas</h3>
          {tournaments.map(t => (
              <Card key={t.id} className="border-border bg-[#111] mb-3 overflow-hidden">
                {editingId === t.id ? (
                    <div className="p-3 space-y-3 bg-white/5">
                        <div className="flex justify-between"><span className="text-xs font-bold text-neon-orange">EDITANDO</span><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button></div>
                        <Input value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} />
                        <div className="grid grid-cols-3 gap-2">
                            <Input type="number" value={editData.entry_fee} onChange={(e) => setEditData({...editData, entry_fee: e.target.value})} placeholder="Entrada" />
                            <Input type="number" value={editData.prize_pool} onChange={(e) => setEditData({...editData, prize_pool: e.target.value})} placeholder="Prêmio" />
                            <Input type="number" min="0" max="54" value={editData.max_players} onChange={(e) => setEditData({...editData, max_players: e.target.value})} placeholder="Jogadores" />
                        </div>
                        <Input value={editData.room_link} onChange={(e) => setEditData({...editData, room_link: e.target.value})} placeholder="Link da Sala" />
                        <Input type="datetime-local" value={editData.scheduled_at} onChange={(e) => setEditData({...editData, scheduled_at: e.target.value})} />
                        <div className="flex items-center gap-2"><Switch checked={editData.is_open} onCheckedChange={c => setEditData({...editData, is_open: c})} /><Label>Aberta?</Label></div>
                        <Button onClick={handleSaveEdit} className="w-full bg-green-600">Salvar</Button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center p-3">
                        <div>
                            <p className="font-bold text-sm text-white flex items-center gap-2">
                                {t.title}
                                <span className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-neon-green shadow-[0_0_8px_#00ff00]' : 'bg-red-600 shadow-[0_0_8px_#ff0000]'}`}></span>
                            </p>
                            <p className="text-[10px] text-gray-500">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : 'Sem data'} • {t.current_players}/{t.max_players} jogadores</p>
                        </div>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleSetFeatured(t.id)}><Star className={`h-4 w-4 ${t.is_featured ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`} /></Button>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Edit className="h-4 w-4 text-blue-400" /></Button>
                            <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-900/20" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
              </Card>
          ))}
      </div>
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
    const [uploadingPrint, setUploadingPrint] = useState(false);
    const [printUrl, setPrintUrl] = useState("");
    const [historyModal, setHistoryModal] = useState<any | null>(null);
    const [resultHistory, setResultHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchRooms = async () => {
        const { data } = await supabase.from("tournaments").select("*").neq('status', 'finished').order("scheduled_at", {ascending: true});
        if(data) setRooms(data);
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
        fetchRooms().then(() => {});
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
        if(!link) return alert("Sem link cadastrado.");
        window.open(link, "_blank");
    };

    const handleOpenResult = async (room: any) => {
        setResultModal(room);
        setWinnerId("");
        setPrintUrl("");
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

    const handlePrintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploadingPrint(true);
            const file = e.target.files?.[0];
            if (!file) return;
            const fileExt = file.name.split('.').pop();
            const filePath = `results/${resultModal.id}_${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from('profile_proofs').upload(filePath, file);
            if(error) throw error;
            const { data } = supabase.storage.from('profile_proofs').getPublicUrl(filePath);
            setPrintUrl(data.publicUrl);
            toast({ title: "Print Carregado!" });
        } catch (err) { toast({ variant:"destructive", title: "Erro no upload" }); } 
        finally { setUploadingPrint(false); }
    };

    const handleConfirmResult = async () => {
        if (!winnerId || !printUrl) return toast({ variant: "destructive", title: "Selecione o vencedor e envie o print." });
        
        try {
            const winner = playersList.find(p => p.user_id === winnerId);
            const prizeAmount = Number(resultModal.prize_pool);

            // 1. Atualiza Saldo, Ganhos Totais e Vitórias do Vencedor
            const { data: profile } = await supabase.from("profiles").select("saldo, total_winnings, victories").eq("user_id", winnerId).single();
            if(profile) {
                await supabase.from("profiles").update({ 
                    saldo: Number(profile.saldo) + prizeAmount,
                    total_winnings: Number(profile.total_winnings || 0) + prizeAmount,
                    victories: Number(profile.victories || 0) + 1
                }).eq("user_id", winnerId);
            }

            // 2. SALVA NO HISTÓRICO
            const { error: historyError } = await supabase.from("tournament_results").insert({
                tournament_id: resultModal.id,
                winner_user_id: winnerId,
                print_url: printUrl,
                prize_amount: prizeAmount,
                admin_id: user?.id
            });

            if (historyError) throw historyError;

            // 3. Marca o Torneio como finalizado
            await supabase.from("tournaments").update({ status: 'finished' }).eq("id", resultModal.id);

            // 4. Registra no Log de Auditoria
            await supabase.from("audit_logs").insert({ 
                admin_id: user?.id, 
                action_type: 'tournament_result', 
                details: `Finalizou ${resultModal.title}. Vencedor: ${winner?.profiles?.nickname} (R$ ${prizeAmount})` 
            });

            toast({ title: "Resultado Lançado!", description: "Prêmio enviado e histórico salvo." });
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
        const { data: results } = await supabase
            .from("tournament_results")
            .select("*")
            .eq("tournament_id", room.id)
            .order("created_at", { ascending: false });
        
        if (results && results.length > 0) {
            const winnerIds = [...new Set(results.map(r => r.winner_user_id))];
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
            {rooms.map(room => {
                const isLive = room.scheduled_at && new Date() >= new Date(room.scheduled_at) && new Date() < new Date(new Date(room.scheduled_at).getTime() + 60*60*1000);
                const liveCount = roomPlayerCounts[room.id] ?? room.current_players;
                return (
                    <Card key={room.id} className={`bg-[#0c0c0c] border ${isLive ? 'border-neon-green shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'border-white/5'}`}>
                        <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        {room.title}
                                        {isLive && <Badge className="bg-red-600 animate-pulse text-[10px]">AO VIVO</Badge>}
                                    </h4>
                                    <p className="text-xs text-gray-500">ID Sala: {room.room_link || "Não definido"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400">Prêmio</p>
                                    <p className="text-neon-green font-bold">R$ {room.prize_pool}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <Users className="h-4 w-4 text-neon-orange" />
                                <span className="text-xs font-bold text-white">{liveCount}</span>
                                <span className="text-[10px] text-gray-400">/ {room.max_players} jogadores na sala</span>
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

            {/* Result Modal */}
            <Dialog open={!!resultModal} onOpenChange={() => setResultModal(null)}>
                <DialogContent className="bg-[#111] border-yellow-600/50 text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-yellow-500 flex items-center gap-2"><Trophy /> Finalizar Partida</DialogTitle>
                        <DialogDescription className="text-gray-400">Selecione o ganhador. O prêmio será transferido automaticamente.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                            <Users className="h-4 w-4 text-neon-orange" />
                            <span className="text-sm font-bold text-white">{playersList.length}</span>
                            <span className="text-xs text-gray-400">jogadores inscritos</span>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Quem deu Booyah?</Label>
                            <select className="w-full bg-black border border-white/10 rounded p-2 text-sm text-white" onChange={(e) => setWinnerId(e.target.value)} value={winnerId}>
                                <option value="">Selecione o Jogador...</option>
                                {playersList.map(p => (
                                    <option key={p.user_id} value={p.user_id}>{p.profiles?.nickname} (ID: {p.profiles?.freefire_id})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Print do Resultado (Obrigatório)</Label>
                            <div className="border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 relative">
                                <Input type="file" accept="image/*" className="opacity-0 absolute inset-0 cursor-pointer" onChange={handlePrintUpload} disabled={uploadingPrint} />
                                {uploadingPrint ? <Loader2 className="animate-spin h-6 w-6 mx-auto text-yellow-500"/> : printUrl ? <p className="text-green-500 text-xs">Imagem Carregada!</p> : <div className="text-gray-500 text-xs"><Upload className="h-6 w-6 mx-auto mb-1"/>Toque para enviar</div>}
                            </div>
                        </div>

                        {winnerId && (
                            <div className="bg-yellow-900/20 p-3 rounded border border-yellow-600/30">
                                <p className="text-xs text-yellow-500 font-bold uppercase">Resumo da Ação:</p>
                                <p className="text-xs text-gray-300 mt-1">
                                    O jogador selecionado receberá <span className="text-white font-bold">R$ {resultModal?.prize_pool}</span> no saldo imediatamente.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={handleConfirmResult} className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold" disabled={!winnerId || !printUrl}>
                            CONFIRMAR E PAGAR PRÊMIO
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
                                            <p className="text-sm font-bold text-white truncate">{result.winner_profile?.nickname || "Jogador"}</p>
                                            <p className="text-[10px] text-gray-400">ID: {result.winner_profile?.freefire_id || "N/A"}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-neon-green font-bold text-sm">R$ {Number(result.prize_amount).toFixed(2)}</p>
                                            <p className="text-[10px] text-gray-500">{new Date(result.created_at).toLocaleDateString("pt-BR")}</p>
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
    const [editMode, setEditMode] = useState(false);
    const [editFields, setEditFields] = useState({ full_name: "", cpf: "", email: "", nickname: "", freefire_id: "", freefire_level: "" });
    
    const fetchUsers = async () => {
        let query = supabase.from("profiles").select("*");
        if (searchTerm) {
            query = query.or(`nickname.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,freefire_id.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
        }
        const { data } = await query.order("created_at", { ascending: false }).limit(50);
        if (data) setUsers(data);
    };

    useEffect(() => {
        const timer = setTimeout(fetchUsers, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
        }).eq("user_id", selectedUser.user_id);
        if (error) return toast({ variant: "destructive", title: "Erro", description: error.message });
        
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_edit_user",
            details: `Admin editou perfil de ${selectedUser.nickname}: Nome=${editFields.full_name}, CPF=${editFields.cpf}, Email=${editFields.email}`
        });
        toast({ title: "Perfil atualizado!" });
        setEditMode(false);
        setSelectedUser(null);
        fetchUsers();
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
        setSelectedUser(null);
        fetchUsers();
    };

    const handleBanUser = async () => {
        if (!selectedUser || !confirm(`Tem certeza que deseja BANIR o jogador ${selectedUser.nickname}? Esta ação zera o saldo.`)) return;
        await supabase.from("profiles").update({ saldo: 0, nickname: `[BANIDO] ${selectedUser.nickname}` }).eq("user_id", selectedUser.user_id);
        await supabase.from("audit_logs").insert({
            admin_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: "admin_ban_user",
            details: `Admin baniu jogador ${selectedUser.nickname} (${selectedUser.email})`
        });
        toast({ variant: "destructive", title: "Jogador banido!" });
        setSelectedUser(null);
        fetchUsers();
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input 
                    placeholder="Buscar por Nick, ID, Email ou Nome..." 
                    className="pl-10 bg-[#0c0c0c] border-white/10 h-10 focus:border-neon-orange"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                {users.map(user => (
                    <div key={user.id} className="bg-[#111] p-3 rounded border border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5" onClick={() => openUser(user)}>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-black border border-white/10 overflow-hidden">
                                {user.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" /> : <Users className="h-5 w-5 m-auto mt-2 text-gray-500" />}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-white">{user.nickname || "Sem Nick"}</p>
                                <p className="text-[10px] text-gray-500">{user.email}</p>
                                <p className="text-[10px] text-neon-orange font-mono">ID: {user.freefire_id || "?"}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-neon-green">R$ {Number(user.saldo).toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="bg-[#111] border-white/10 text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-neon-orange uppercase">Dossiê do Jogador</DialogTitle></DialogHeader>
                    {selectedUser && !editMode && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <img src={selectedUser.avatar_url || ""} className="w-20 h-20 rounded-full bg-black border border-white/10 object-cover" />
                                <div>
                                    <h3 className="text-xl font-bold">{selectedUser.nickname}</h3>
                                    <p className="text-xs text-gray-400">{selectedUser.email}</p>
                                    <Badge className="bg-neon-orange text-black mt-1">Nível {selectedUser.freefire_level || 0}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-black/30 p-2 rounded"><span className="text-gray-500 text-xs block">Nome Real</span>{selectedUser.full_name || "-"}</div>
                                <div className="bg-black/30 p-2 rounded"><span className="text-gray-500 text-xs block">CPF</span>{selectedUser.cpf || "-"}</div>
                                <div className="bg-black/30 p-2 rounded"><span className="text-gray-500 text-xs block">ID Free Fire</span>{selectedUser.freefire_id || "-"}</div>
                                <div className="bg-black/30 p-2 rounded"><span className="text-gray-500 text-xs block">Saldo Atual</span>R$ {Number(selectedUser.saldo).toFixed(2)}</div>
                            </div>
                            {selectedUser.freefire_proof_url && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Print de Verificação:</p>
                                    <img src={selectedUser.freefire_proof_url} className="w-full rounded border border-white/10" />
                                </div>
                            )}
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                <Button onClick={() => setEditMode(true)} className="bg-blue-600 text-white text-xs"><Edit className="mr-1 h-3 w-3" /> Editar</Button>
                                <Button onClick={handleBlockBalance} variant="outline" className="border-yellow-600 text-yellow-500 text-xs"><Lock className="mr-1 h-3 w-3" /> Bloquear Saldo</Button>
                                <Button onClick={handleBanUser} variant="destructive" className="text-xs"><Ban className="mr-1 h-3 w-3" /> Banir</Button>
                                <Button onClick={handleDeleteUser} variant="destructive" className="bg-red-900 text-xs"><Trash2 className="mr-1 h-3 w-3" /> Apagar</Button>
                            </div>
                        </div>
                    )}
                    {selectedUser && editMode && (
                        <div className="space-y-3">
                            <p className="text-xs text-neon-orange font-bold uppercase">Editando dados do jogador</p>
                            <div><Label className="text-[10px]">Nome Completo</Label><Input value={editFields.full_name} onChange={e => setEditFields({...editFields, full_name: e.target.value})} className="bg-black border-white/10" /></div>
                            <div><Label className="text-[10px]">CPF</Label><Input value={editFields.cpf} onChange={e => setEditFields({...editFields, cpf: e.target.value})} className="bg-black border-white/10" /></div>
                            <div><Label className="text-[10px]">Email</Label><Input value={editFields.email} onChange={e => setEditFields({...editFields, email: e.target.value})} className="bg-black border-white/10" /></div>
                            <div><Label className="text-[10px]">Nickname</Label><Input value={editFields.nickname} onChange={e => setEditFields({...editFields, nickname: e.target.value})} className="bg-black border-white/10" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><Label className="text-[10px]">ID Free Fire</Label><Input value={editFields.freefire_id} onChange={e => setEditFields({...editFields, freefire_id: e.target.value})} className="bg-black border-white/10" /></div>
                                <div><Label className="text-[10px]">Nível</Label><Input type="number" value={editFields.freefire_level} onChange={e => setEditFields({...editFields, freefire_level: e.target.value})} className="bg-black border-white/10" /></div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setEditMode(false)} variant="outline" className="flex-1 border-white/10">Cancelar</Button>
                                <Button onClick={handleAdminEditUser} className="flex-1 bg-green-600">Salvar</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- 4. FINANCEIRO ---
function AdminFinance() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<any[]>([]);

    const fetchTx = async () => {
        const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });
        
        if (!data) return;
        
        const userIds = [...new Set(data.map(tx => tx.user_id))];
        if (userIds.length === 0) { setTransactions([]); return; }
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, nickname, full_name, cpf, email")
            .in("user_id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const enriched = data.map(tx => {
            const prof = profileMap.get(tx.user_id);
            return { ...tx, nickname: prof?.nickname || "Desconhecido", full_name: prof?.full_name || "-", cpf: prof?.cpf || "-", email: prof?.email || "-" };
        });
        setTransactions(enriched);
    };

    // Fetch on mount + realtime updates
    useEffect(() => {
        fetchTx();
        const channel = supabase
            .channel('admin-finance-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTx())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleApprove = async (tx: any) => {
        if (tx.type === 'deposit' && tx.amount < 15) return toast({ variant: "destructive", title: "Bloqueado", description: "Depósito mínimo é R$ 15,00" });
        if (tx.type === 'withdraw' && tx.amount < 20) return toast({ variant: "destructive", title: "Bloqueado", description: "Saque mínimo é R$ 20,00" });
        
        // Validate CPF and name for deposits
        if (tx.type === 'deposit' && (!tx.full_name || tx.full_name === '-' || !tx.cpf || tx.cpf === '-')) {
            return toast({ variant: "destructive", title: "Bloqueado", description: "Depósito requer Nome e CPF cadastrados." });
        }

        const { data: profile } = await supabase.from("profiles").select("saldo").eq("user_id", tx.user_id).single();
        if (!profile) return;

        let newBalance = Number(profile.saldo);
        if (tx.type === 'deposit') newBalance += Number(tx.amount);
        if (tx.type === 'withdraw') {
            if (newBalance < tx.amount) return toast({ variant: "destructive", title: "Saldo Insuficiente do Usuário" });
            newBalance -= Number(tx.amount);
        }
        if (newBalance < 0) return toast({ variant: "destructive", title: "Erro: saldo ficaria negativo" });

        await supabase.from("profiles").update({ saldo: newBalance }).eq("user_id", tx.user_id);
        await supabase.from("transactions").update({ status: 'approved' }).eq("id", tx.id);
        
        const adminId = (await supabase.auth.getUser()).data.user?.id;

        await supabase.from("audit_logs").insert({ 
            admin_id: adminId, 
            action_type: 'finance_approve', 
            details: `Aprovou ${tx.type === 'deposit' ? 'Depósito' : 'Saque'} de R$${Number(tx.amount).toFixed(2)} para ${tx.nickname} (${tx.full_name}, CPF: ${tx.cpf})` 
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
                            admin_id: adminId,
                            action_type: "referral_reward",
                            details: `Recompensa automática de R$${rewardAmount.toFixed(2)} creditada por atingir ${count} indicações confirmadas.`
                        });
                    }
                }
            }
        }

        toast({ title: "Transação Aprovada!" });
        fetchTx();
    };

    const handleReject = async (tx: any) => {
        if(!confirm("Tem certeza que deseja rejeitar esta transação?")) return;
        await supabase.from("transactions").update({ status: 'rejected' }).eq("id", tx.id);
        await supabase.from("audit_logs").insert({ 
            admin_id: (await supabase.auth.getUser()).data.user?.id, 
            action_type: 'finance_reject', 
            details: `Rejeitou ${tx.type === 'deposit' ? 'Depósito' : 'Saque'} de R$${Number(tx.amount).toFixed(2)} para ${tx.nickname} (${tx.full_name})` 
        });
        toast({ variant: "destructive", title: "Transação Rejeitada!" });
        fetchTx();
    };

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-500">Solicitações Pendentes</h3>
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
                            </div>
                            <div className="flex gap-2">
                                <Button size="icon" className="bg-green-600 h-8 w-8 hover:bg-green-700" onClick={() => handleApprove(tx)}><Check className="h-4 w-4"/></Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8 hover:bg-red-700" onClick={() => handleReject(tx)}><X className="h-4 w-4"/></Button>
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
        </div>
    );
}

// --- 5. LINK DA CONTA (NOVO) ---
function AdminPaymentLink() {
    const { toast } = useToast();
    const [currentLink, setCurrentLink] = useState("");
    const [newLink, setNewLink] = useState("");
    const [history, setHistory] = useState<any[]>([]);

    const fetchLinks = async () => {
        const { data } = await supabase.from("payment_links").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) {
            setCurrentLink(data[0].link);
            setHistory(data);
        }
    };

    useEffect(() => { fetchLinks(); }, []);

    const handleSaveLink = async () => {
        if (!newLink.trim()) return toast({ variant: "destructive", title: "Digite o novo link" });
        const adminId = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("payment_links").insert({ link: newLink.trim(), created_by: adminId });
        if (error) return toast({ variant: "destructive", title: "Erro", description: error.message });
        
        await supabase.from("audit_logs").insert({
            admin_id: adminId,
            action_type: "payment_link_change",
            details: `Admin alterou link de pagamento para: ${newLink.trim()}`
        });
        
        toast({ title: "Link atualizado!" });
        setNewLink("");
        fetchLinks();
    };

    return (
        <div className="space-y-4">
            <Card className="border-white/10 bg-[#0c0c0c]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-neon-orange uppercase flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link de Pagamento Atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="bg-black/50 p-3 rounded border border-white/10">
                        <p className="text-sm text-white break-all font-mono">{currentLink || "Nenhum link configurado"}</p>
                    </div>
                    <Input placeholder="Novo link de pagamento (PIX, email, etc.)" value={newLink} onChange={e => setNewLink(e.target.value)} className="bg-black/50 border-white/10" />
                    <Button onClick={handleSaveLink} className="w-full bg-orange-600 hover:bg-orange-700 font-bold">Atualizar Link</Button>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase text-gray-500">Histórico de Links</h3>
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
  const [view, setView] = useState<'open' | 'archived'>('open');

  const fetchTickets = async () => {
    const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("status", view)
        .order("created_at", { ascending: false });
    if (!data) return;
    
    const userIds = [...new Set(data.map(t => t.user_id))];
    if (userIds.length === 0) { setTickets([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, nickname").in("user_id", userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) || []);
    const enriched = data.map(t => ({ ...t, nickname: profileMap.get(t.user_id) || "Usuário" }));
    setTickets(enriched);
  };

  useEffect(() => {
    fetchTickets();
    const channel = supabase.channel('support_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchTickets).subscribe();
    return () => { supabase.removeChannel(channel); };
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
      <div className="flex gap-2 p-1 bg-secondary rounded-lg">
        <Button variant={view === 'open' ? 'default' : 'ghost'} className={`flex-1 text-xs ${view === 'open' ? 'bg-white/10' : ''}`} onClick={() => setView('open')}>Caixa de Entrada</Button>
        <Button variant={view === 'archived' ? 'default' : 'ghost'} className={`flex-1 text-xs ${view === 'archived' ? 'bg-white/10' : ''}`} onClick={() => setView('archived')}>Arquivados</Button>
      </div>
      
      {tickets.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="flex flex-col items-center justify-center p-8 text-center"><MessageSquare className="h-12 w-12 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Nenhum ticket aqui.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
            {tickets.map(ticket => (
                <Card key={ticket.id} className={`bg-card border-l-4 ${ticket.type === 'support' ? 'border-l-neon-orange' : 'border-l-blue-500'}`}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold uppercase ${ticket.type === 'support' ? 'text-neon-orange' : 'text-blue-400'}`}>{ticket.type === 'support' ? 'Problema' : 'Sugestão'}</span>
                            <span className="text-[10px] text-gray-500">{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{ticket.nickname || "Usuário"}</p>
                        <p className="text-sm text-gray-300 bg-black/20 p-2 rounded mb-3">"{ticket.message}"</p>
                        <div className="flex justify-end gap-2">
                            {view === 'open' && (
                                <Button size="sm" variant="ghost" onClick={() => handleArchive(ticket.id)} className="text-gray-500 hover:text-red-500"><Archive className="mr-2 h-3 w-3" /> Arquivar</Button>
                            )}
                            <Button size="sm" className={ticket.type === 'support' ? 'bg-neon-orange text-black' : 'bg-blue-600 text-white'} onClick={() => handleReply(ticket)}>
                                {view === 'archived' ? <><Eye className="mr-2 h-3 w-3" /> Histórico</> : <><Send className="mr-2 h-3 w-3" /> Responder</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
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

// --- 7. REGISTROS ---
function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    useEffect(() => {
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => {
            if(data) setLogs(data);
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
                        <p className="font-bold text-red-500 text-sm mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> ID DUPLICADO: {d.original.freefire_id}</p>
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

    // Referrers list view
    if (showReferrers) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setShowReferrers(false)} className="text-gray-400 hover:text-white mb-2">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <h3 className="text-xs font-bold uppercase text-gray-500">Jogadores que indicaram</h3>
                                
                {referrersList.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-8">Nenhum jogador indicou ainda.</p>
                ) : (
                    referrersList.map(ref => (
                        <Card key={ref.referrer_id} className="bg-[#0c0c0c] border-white/10 cursor-pointer hover:border-indigo-500/40 transition-colors" onClick={() => handleSelectReferrer(ref)}>
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                    {ref.profile?.avatar_url ? (
                                        <img src={ref.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <span className="text-indigo-400 font-bold">{ref.profile?.nickname?.charAt(0)?.toUpperCase() || "?"}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{ref.profile?.nickname || "Desconhecido"}</p>
                                    <p className="text-[10px] text-gray-500">{ref.profile?.email || ""}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-indigo-400 font-bold text-sm">{ref.total} indicações</p>
                                    <p className="text-[10px] text-green-400">{ref.confirmed} confirmadas</p>
                                    {ref.milestones > 0 && <p className="text-[10px] text-yellow-400">{ref.milestones}x meta de 10</p>}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
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

import { useState, useEffect } from "react";
import { User, Wallet, Edit, Trophy, Medal, Coins, LogOut, Settings, HelpCircle, MessageSquare, List, Shield, Lock, Upload, Camera, Bell, Mail, Volume2, Key, FileText, Clock, ChevronRight, Star, PlusCircle, Send, ArrowLeft, Loader2, Ticket, ShieldAlert, ShieldCheck, CheckCircle2, X, Gift, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { GoogleGenerativeAI } from "@google/generative-ai";

const menuItems = [
  { icon: FileText, label: "Dossiê do Jogador", action: "edit_profile" },
  { icon: Trophy, label: "Títulos e Honrarias", action: "titles" },
  { icon: Ticket, label: "Passes Livres", action: "free_passes" },
  { icon: List, label: "Suas Inscrições", action: "inscriptions" },
  { icon: Settings, label: "Configurações", action: "settings" },
  { icon: MessageSquare, label: "Sugestão de Melhorias", action: "feedback" },
  { icon: HelpCircle, label: "Ajuda e Suporte", action: "support" },
];

const RARITY_ORDER: Record<string, number> = {
  'common': 1, 'silver': 2, 'rare': 3, 'epic': 4, 'diamond': 5, 'emerald': 6, 'ruby': 7, 'elite': 8, 'exclusive': 9, 'vip': 10, 'executive': 11, 'collector': 12, 'realfire': 13
};

function TitlesModal({ open, onClose, userId, refreshProfile, profile }: { open: boolean; onClose: () => void; userId?: string; refreshProfile: () => void; profile: any }) {
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  const handlePurchase = async () => {
    if (!confirmItem || !userId || !profile) return;
    if (profile?.saldo < confirmItem.price) {
      toast.error("Saldo insuficiente.");
      setConfirmItem(null);
      return;
    }
    setPurchasing(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({ saldo: (profile?.saldo || 0) - confirmItem.price }).eq('user_id', userId);
      if (profileError) throw profileError;
      const { data: existing } = await supabase.from('user_achievements').select('id, count').eq('user_id', userId).eq('achievement_id', confirmItem.id).maybeSingle();
      if (existing) {
        await supabase.from('user_achievements').update({ count: (existing.count || 0) + 1, earned_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: confirmItem.id, is_active: false, count: 1 });
      }
      await supabase.from('transactions').insert({ user_id: userId, type: 'patent_purchase', amount: confirmItem.price, status: 'approved' });
      toast.success(`Patente adquirida!`);
      await fetchTitles();
      refreshProfile();
    } catch (error: any) {
      toast.error("Erro na compra");
    } finally {
      setPurchasing(false);
      setConfirmItem(null);
    }
  };

  const fetchTitles = async () => {
    if (!userId) return;
    setLoading(true);
    const { data: allAchievements } = await supabase.from("achievements").select("*").order("created_at", { ascending: true });
    const { data: userOwned } = await supabase.from("user_achievements").select("*").eq("user_id", userId);
    if (allAchievements) {
      const merged = allAchievements.map(acc => {
        const ownedItem = userOwned?.find(ua => ua.achievement_id === acc.id);
        const name = (acc.name || "").toLowerCase();
        let isOwned = !!ownedItem;
        if ((acc.type === 'medal' || acc.type === 'trophy') && (ownedItem as any)?.count >= 1) isOwned = true;
        return {
          ...acc, owned: isOwned, user_count: (ownedItem as any)?.count || 0,
          user_achievement_id: ownedItem?.id, is_active: ownedItem?.is_active || false, earned_at: ownedItem?.earned_at
        };
      });
      setTitles(merged);
    }
    setLoading(false);
  };

  useEffect(() => { if (open) fetchTitles(); }, [open]);

  const toggleActive = async (achievement: any) => {
    if (!userId || !achievement.id) return;
    setLoading(true);
    try {
      if (!achievement.is_active) {
        const isPatent = achievement.type === 'patent';
        const { data: activeUA } = await supabase.from("user_achievements").select("id, achievements(type)").eq("user_id", userId)
          .eq("is_active", true);
        const toDeactivate = activeUA?.filter((ua: any) => {
          const ach = Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements;
          return isPatent ? ach?.type === 'patent' : (ach?.type === 'trophy' || ach?.type === 'medal');
        }) || [];
        if (toDeactivate.length > 0) await supabase.from("user_achievements").update({ is_active: false }).in("id", toDeactivate.map(ua => ua.id));
      }
      let uaId = achievement.user_achievement_id;
      if (!uaId && achievement.owned) {
        const { data } = await supabase.from("user_achievements").insert({ user_id: userId, achievement_id: achievement.id, is_active: true }).select('id').single();
        uaId = data?.id;
      } else if (uaId) {
        await supabase.from("user_achievements").update({ is_active: !achievement.is_active }).eq("id", uaId);
      }
      await fetchTitles();
      refreshProfile();
      toast.success(achievement.is_active ? "Ocultado" : "Ativado no perfil!");
    } catch (err) { toast.error("Erro ao atualizar status"); } finally { setLoading(false); }
  };

  const patents = titles.filter(t => t.type === 'patent');
  const trophies = titles.filter(t => t.type === 'trophy');
  const medals = titles.filter(t => t.type === 'medal');

  const ShelfSection = ({ title, items, icon: Icon }: any) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2 border-l-2 border-neon-orange/40">
        <Icon className="h-4 w-4 text-neon-orange" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white italic">{title}</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 custom-scrollbar touch-pan-x">
        {Array.isArray(items) && items.map((item: any) => (
          <div key={item.id} onClick={() => item.owned ? toggleActive(item) : toast.info("Bloqueado")}
            className={`relative flex-shrink-0 w-28 flex flex-col items-center group transition-all duration-500 ${item.owned ? 'cursor-pointer' : 'opacity-40'}`}>
            <div className={`relative h-28 w-28 rounded-3xl mb-3 flex items-center justify-center p-4 ${item.is_active ? 'ring-2 ring-neon-orange border-neon-orange' : 'bg-black/40 border border-white/5'}`}>
              <img src={item.image_url} alt={item.name} className={`max-h-full max-w-full object-contain ${item.owned ? '' : 'grayscale'}`} />
              {!item.owned && <Lock className="absolute h-5 w-5 text-gray-500" />}
            </div>
            <p className="text-[9px] font-black uppercase italic tracking-tighter text-center line-clamp-2">{item.name}</p>
            {item.is_buyable && !item.owned && (
              <button onClick={(e) => { e.stopPropagation(); setConfirmItem(item); }} className="mt-1 bg-orange-500 text-black text-[9px] font-black px-2 py-1 rounded-xl">
                COMPRAR R${Number(item.price).toFixed(2)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-[2.5rem] max-h-[90vh] overflow-hidden flex flex-col p-0">
        {confirmItem && (
          <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-xl font-black uppercase text-white mb-2">Comprar {confirmItem.name}?</h3>
            <div className="flex gap-4 mt-4">
              <Button onClick={handlePurchase} disabled={purchasing} className="bg-green-600 font-black">SIM</Button>
              <Button onClick={() => setConfirmItem(null)} className="bg-red-600 font-black">NÃO</Button>
            </div>
          </div>
        )}
        <DialogHeader className="p-8 pb-4 relative z-10">
          <DialogTitle className="flex items-center gap-4 text-2xl font-black uppercase italic">
            <Trophy className="text-neon-orange h-8 w-8" /> Estante de Glórias
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 space-y-12 pb-12 pt-4 custom-scrollbar">
          {loading ? <Loader2 className="animate-spin mx-auto text-neon-orange" /> : (
            <>
              <ShelfSection title="Minhas Patentes" items={patents} icon={Shield} />
              <ShelfSection title="Galeria de Troféus" items={trophies} icon={Trophy} />
              <ShelfSection title="Medalhas de Honra" items={medals} icon={Medal} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InscriptionsModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId?: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  useEffect(() => {
    if (open && userId) {
      supabase.from("enrollments").select("*, tournaments(title, type, scheduled_at, status)").eq("user_id", userId).order("created_at", { ascending: false })
        .then(({ data }) => setEnrollments(data || []));
    }
  }, [open, userId]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><List /> Suas Inscrições</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          {enrollments.length === 0 ? <p className="text-center text-gray-500">Nenhuma inscrição.</p> : enrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border-l-4 border-orange-500">
              <div className="text-xs font-bold">{e.tournaments?.title} <br /><span className="text-gray-500 font-normal">{e.tournaments?.type}</span></div>
              <Badge>{e.tournaments?.status === 'finished' ? "Finalizado" : "Ativo"}</Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Profile() {
  const { user, profile, isAdmin, signOut, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [supportMessage, setSupportMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAttempts, setAiAttempts] = useState(0);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [chatPhase, setChatPhase] = useState<'input' | 'ai_replied' | 'rating' | 'escalate' | 'done' | 'escalated'>('input');
  const [csatRating, setCsatRating] = useState(0);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPrint, setUploadingPrint] = useState(false);
  const [rating, setRating] = useState(0);

  // [REPARO DE LOOP] useEffect Seguro para Atualização de Passes
  useEffect(() => {
    if (activeModal === "free_passes" && profile?.user_id) {
      const today = new Date().toISOString().split('T')[0];
      let activePlans: any[] = [];
      const pType = profile?.plan_type;

      try {
        if (pType && typeof pType === 'string' && pType.startsWith('[')) {
          activePlans = JSON.parse(pType).filter((p: any) => p && (p.title || p.id));
        } else if (pType && pType !== 'Free Avulso' && !String(pType).toLowerCase().includes('honra')) {
          activePlans = [{ id: 'legacy', title: pType, passes_available: profile?.passes_available || 0, pass_value: profile?.pass_value || 0, last_reset: today }];
        }
      } catch (e) { activePlans = []; }

      let needsUpdate = false;
      const initialCount = activePlans.length;
      activePlans = activePlans.filter(p => (!p.expires_at || new Date(p.expires_at) > new Date()) && !p.is_deleted);
      if (activePlans.length !== initialCount) needsUpdate = true;

      activePlans = activePlans.map(p => {
        if (p.last_reset !== today) {
          needsUpdate = true;
          return { ...p, passes_available: p.is_honor ? (p.max_passes || 2) : 2, last_reset: today };
        }
        return p;
      });

      if (needsUpdate) {
        supabase.from('profiles').update({
          plan_type: JSON.stringify(activePlans),
          passes_available: activePlans[0]?.passes_available || 0
        }).eq('user_id', profile?.user_id).then(() => refreshProfile());
      }
    }
  }, [activeModal, profile?.user_id]);

  if (authLoading || (!profile && user)) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 text-neon-orange animate-spin" />
        <p className="text-white/40 uppercase font-black tracking-[0.3em] text-[10px]">Sincronizando Dossiê do Jogador...</p>
      </div>
    );
  }


  useEffect(() => {
    if (activeModal === "support" && user) {
      supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setMyTickets(data || []));
    }
  }, [activeModal, user]);

  const loadTicketMessages = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setTicketMessages(data || []);
  };

  const [formData, setFormData] = useState({ full_name: "", cpf: "", email: "", ff_id: "", nickname: "", level: "" });
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [printPreview, setPrintPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState({ push: true, email: true, sound: true });
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "", cpf: profile.cpf || "", email: profile.email || "",
        ff_id: profile.freefire_id || "", nickname: profile.nickname || "", level: String(profile.freefire_level || ""),
      });
      if (profile.avatar_url) setSavedAvatar(profile.avatar_url);
      if (profile.freefire_proof_url) setPrintPreview(profile.freefire_proof_url);
    }
  }, [profile]);

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };
  const handleMenuClick = (action: string) => setActiveModal(action);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!e.target.files?.[0]) throw new Error("Selecione imagem.");
      const file = e.target.files[0];
      const filePath = `${user?.id}/avatar_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user?.id);
      setSavedAvatar(publicUrl);
      setAvatarPreview(publicUrl);
      toast.success("Foto atualizada!");
    } catch (err: any) { toast.error(err.message); } finally { setUploadingAvatar(false); }
  };

  const handlePrintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingPrint(true);
      if (!e.target.files?.[0]) throw new Error("Selecione arquivo.");
      const file = e.target.files[0];
      const filePath = `${user?.id}/proof_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('profile_proofs').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('profile_proofs').getPublicUrl(filePath);
      setPrintPreview(publicUrl);
      await supabase.from('profiles').update({ freefire_proof_url: publicUrl }).eq('user_id', user?.id);
      toast.success("Print carregado!");
    } catch (err: any) { toast.error(err.message); } finally { setUploadingPrint(false); }
  };

  const handleSaveProfile = async () => {
    try {
      const updateData: any = {
        nickname: formData.nickname, freefire_id: formData.ff_id,
        freefire_nick: formData.nickname, freefire_level: formData.level ? parseInt(formData.level) : null,
      };
      if (printPreview) updateData.freefire_proof_url = printPreview;
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', user?.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Salvo!");
      setActiveModal(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return toast.error("Escreva sua sugestão.");
    await supabase.from('support_tickets').insert({ user_id: user?.id, type: 'suggestion', message: feedbackMessage, status: 'open' });
    toast.success("Enviado!");
    setFeedbackMessage("");
    setActiveModal(null);
  };

  const resetChat = () => { setSupportMessage(""); setAiResponse(null); setAiAttempts(0); setCurrentTicketId(null); setChatPhase('input'); setChatHistory([]); setCsatRating(0); };

  const handleAiChat = async () => {
    if (!supportMessage.trim()) return toast.error("Descreva seu problema.");
    const nextAttempts = aiAttempts + 1;
    setLoadingAi(true);
    const userMsg = supportMessage.trim();
    setSupportMessage("");

    const { data: aiSetting } = await (supabase as any).from('notification_settings').select('is_enabled').eq('key_name', 'gemini_ai_support').maybeSingle();
    const isAiEnabled = aiSetting?.is_enabled === true;

    if (!isAiEnabled) { setLoadingAi(false); await sendToHumanQueue(userMsg); return; }

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave não configurada.");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `Você é o suporte do Real Fire. Jogador: ${formData.nickname}. Mensagem: "${userMsg}". Responda de forma humana e curta (max 2 parágrafos).`;
      const result = await model.generateContent(prompt);
      const aiReplyText = result.response.text();

      setChatHistory(prev => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: aiReplyText }]);
      setAiAttempts(nextAttempts);
      setAiResponse(aiReplyText);

      if (!currentTicketId) {
        const { data: newTicket } = await supabase.from('support_tickets').insert({ user_id: user?.id, type: 'support', message: userMsg, status: 'ai_resolved' }).select('id').single();
        if (newTicket) {
          setCurrentTicketId(newTicket.id);
          // [RASTREABILIDADE IA] Usando 'system_ai' em vez de null
          await supabase.from('support_messages').insert([
            { ticket_id: newTicket.id, sender_id: user?.id, message: userMsg, is_admin: false },
            { ticket_id: newTicket.id, sender_id: '00000000-0000-0000-0000-000000000000', message: aiReplyText, is_admin: true, sender_name: 'system_ai' }
          ]);
        }
      } else {
        await supabase.from('support_messages').insert([
          { ticket_id: currentTicketId, sender_id: user?.id, message: userMsg, is_admin: false },
          { ticket_id: currentTicketId, sender_id: '00000000-0000-0000-0000-000000000000', message: aiReplyText, is_admin: true, sender_name: 'system_ai' }
        ]);
      }
    } catch (err) { await sendToHumanQueue(userMsg); } finally { setLoadingAi(false); }
  };

  const sendToHumanQueue = async (msg?: string) => {
    const message = msg || supportMessage.trim();
    await supabase.from('support_tickets').insert({ user_id: user?.id, type: 'support', message, status: 'waiting_human' });
    toast.success("Encaminhado para atendente humano.");
  };

  const handleResolved = async (rating: number) => {
    setCsatRating(rating);
    if (currentTicketId) await supabase.from('support_tickets').update({ status: 'ai_closed', csat_rating: rating }).eq('id', currentTicketId);
    setChatPhase('done');
  };

  const handleEscalate = async (confirm: boolean) => {
    if (!confirm) { setChatPhase('input'); return; }
    setChatPhase('escalated');
    if (currentTicketId) await supabase.from('support_tickets').update({ status: 'waiting_human' }).eq('id', currentTicketId);
    else await sendToHumanQueue();
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error("Senhas não conferem.");
    supabase.auth.updateUser({ password: passwordData.newPassword }).then(({ error }) => {
      if (error) toast.error(error.message);
      else { toast.success("Senha alterada!"); setActiveModal("settings"); }
    });
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#050505] space-y-8 px-4 py-8 pb-32">
      {/* 1. BOTÃO PAINEL ADMIN */}
      {isAdmin && (
        <div className="relative group overflow-hidden rounded-2xl p-[1px] mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 animate-pulse"></div>
          <Button onClick={() => navigate("/admin")} className="w-full relative bg-[#070707] text-orange-400 font-black uppercase tracking-[0.2em] h-14 border-0 rounded-2xl">
            <Shield className="mr-3 h-6 w-6" /> Painel de Comando Admin
          </Button>
        </div>
      )}

      {/* 2. CABEÇALHO (AVATAR E NÍVEL) */}
      <div className="relative flex flex-col items-center py-10 rounded-[2.5rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] shadow-2xl backdrop-blur-sm">
        <div className="relative z-10">
          <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-orange-500 via-yellow-400 to-red-600">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#050505] p-1 overflow-hidden pointer-events-none">
              <div className="h-full w-full rounded-full overflow-hidden border-2 border-white/10 shadow-inner">
                {savedAvatar ? (
                  <img src={savedAvatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gray-800 flex items-center justify-center">
                    <User className="h-14 w-14 text-gray-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
          {profile?.active_patent && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 transform transition-all duration-500">
              <div className="h-11 w-11 bg-gradient-to-b from-[#2a2a2a] to-[#050505] rounded-full border border-white/20 shadow-xl flex items-center justify-center p-[2px]">
                <img src={profile.active_patent.image_url} alt="Patente" className="h-full w-full object-cover rounded-full" />
              </div>
            </div>
          )}
          <button onClick={() => setActiveModal("edit_profile")} className="absolute -bottom-1 -right-1 rounded-full bg-white text-black p-2.5 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-50 border-4 border-[#0d0d0d]">
            <Camera className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 text-center z-10 px-4 flex flex-col items-center w-full">
          <div className="flex items-center justify-center w-full">
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{formData.nickname || "Jogador"}</h2>
            {profile?.active_badge && (
              <div className="relative h-10 w-10 ml-2 animate-pulse">
                <img src={profile.active_badge.image_url} className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(251,146,60,0.6)]" alt="Badge" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase">Lv. {formData.level || 1}</Badge>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>

        <div className="mt-8 w-full max-w-[280px] z-10 cursor-pointer" onClick={() => navigate("/finance")}>
          <Card className="border-white/[0.08] bg-black/40 rounded-3xl">
            <CardContent className="flex flex-col items-center py-6 px-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Saldo em Conta</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-green-500">R$</span>
                <span className="text-4xl font-black text-white tracking-tighter">{(profile?.saldo ?? 0).toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[9px] font-bold text-green-500/70 uppercase"><PlusCircle className="h-3 w-3" /> Adicionar Saldo</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" className="h-20 bg-green-900/40 border border-green-500/30 rounded-3xl" onClick={() => navigate("/finance")}>
          <div className="flex flex-col items-center gap-1"><Wallet className="h-6 w-6 text-green-400" /><span className="text-xs font-black uppercase text-white">PIX Depósito</span></div>
        </Button>
        <Button variant="secondary" className="h-20 bg-red-900/40 border border-orange-500/30 rounded-3xl" onClick={() => navigate("/finance")}>
          <div className="flex flex-col items-center gap-1"><Send className="h-6 w-6 text-orange-400" /><span className="text-xs font-black uppercase text-white">Solicitar Saque</span></div>
        </Button>
      </div>

      {/* MENU PRINCIPAL */}
      <div className="bg-white/[0.02] rounded-[2rem] p-3 border border-white/[0.05]">
        <div className="px-4 py-2 border-b border-white/5 mb-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Centro de Controle</h3>
        </div>
        {menuItems.map((item) => (
          <button key={item.label} onClick={() => handleMenuClick(item.action)} className="group flex w-full items-center justify-between rounded-2xl px-4 py-4 text-sm text-gray-300 hover:bg-white/[0.05]">
            <div className="flex items-center gap-4">
              <div className="bg-white/[0.05] p-2.5 rounded-xl"><item.icon className="h-5 w-5" /></div>
              <span className="font-bold">{item.label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        ))}
        <Separator className="bg-white/5 my-2" />
        <button onClick={handleSignOut} className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-sm font-black uppercase text-red-500/80 hover:bg-red-500/10">
          <div className="bg-red-500/10 p-2.5 rounded-xl"><LogOut className="h-5 w-5" /></div>
          <span>Encerrar Sessão</span>
        </button>
      </div>

      {/* EXIBIÇÃO DE PASSES LIVRES */}
      <Dialog open={activeModal === "free_passes"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-0 bg-[#070707] text-white w-[95%] rounded-[2rem] max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(249,115,22,0.15)] ring-1 ring-white/10 p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Ticket className="h-8 w-8 text-orange-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-white italic uppercase tracking-tighter text-center">
              Seus Passes Livres
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6 px-6">
            <div className="relative group p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.1] shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Ticket className="h-24 w-24 text-white rotate-12" />
              </div>

              <div className="flex justify-between items-center border-b border-white/[0.05] pb-4 mb-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Plano Ativo</span>
                <Badge className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-0 ${(profile?.plan_type && profile.plan_type !== 'Free Avulso') ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                  {profile?.plan_type || 'Conta Básica'}
                </Badge>
              </div>

              {profile?.plan_type && profile.plan_type !== 'Free Avulso' ? (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor Economizado</span>
                      <span className="text-xl font-black text-orange-400">R$ {Number(profile.pass_value || 0).toFixed(2)} / sala</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Uso Diário</span>
                      <span className="text-xl font-black text-green-400">{profile.passes_available || 0} / 2</span>
                    </div>
                  </div>

                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-yellow-400 rounded-full" style={{ width: `${((profile.passes_available || 0) / 2) * 100}%` }}></div>
                  </div>

                  <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-black opacity-50">
                    Válido até 23:59 • Uso instantâneo
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 inline-block mb-2">
                    <ShieldAlert className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="px-4">
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                      Você está usando uma <b className="text-white">Conta Gratuita</b>. Melhore para o VIP e jogue salas profissionais sem taxa de inscrição!
                    </p>
                  </div>
                  <Button
                    onClick={() => { setActiveModal(null); navigate("/dashboard"); }}
                    className="w-full py-7 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.4)] border-0"
                  >
                    Desbloquear Modo VIP
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR PERFIL - [UX CAMPOS TRAVADOS] */}
      <Dialog open={activeModal === "edit_profile"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-neon-orange uppercase italic font-black">Dossiê do Jogador</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-2">
              <label htmlFor="avatar-upload" className="relative group cursor-pointer h-24 w-24">
                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                <div className="h-24 w-24 rounded-full bg-secondary border border-gray-600 flex items-center justify-center overflow-hidden">
                  {uploadingAvatar ? <Loader2 className="animate-spin text-neon-orange" /> : savedAvatar ? <img src={savedAvatar} className="h-full w-full object-cover" /> : <User className="text-gray-500" />}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><Camera className="h-6 w-6 text-white" /></div>
              </label>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-3">
              <Label className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2"><Lock className="h-3 w-3" /> Dados Oficiais (Monitorados)</Label>
              <div className="space-y-3">
                <div><Label className="text-[10px] text-gray-400">Nome Completo</Label><Input value={formData.full_name} readOnly disabled className="bg-black/40 border-white/5 text-gray-500 cursor-not-allowed" /></div>
                <div><Label className="text-[10px] text-gray-400">CPF</Label><Input value={formData.cpf} readOnly disabled className="bg-black/40 border-white/5 text-gray-500 cursor-not-allowed" /></div>
                <div><Label className="text-[10px] text-gray-400">E-mail</Label><Input value={formData.email} readOnly disabled className="bg-black/40 border-white/5 text-gray-500 cursor-not-allowed" /></div>

                {/* NOTA INFORMATIVA SOLICITADA */}
                <p className="text-[9px] text-orange-500/80 mt-1 font-bold uppercase tracking-wider px-1 italic">
                  * Para alterar dados de E-mail ou CPF, favor abrir um ticket no suporte.
                </p>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-3">
              <Label className="text-neon-orange text-xs font-bold uppercase"><Trophy className="inline h-3 w-3 mr-1" /> Identidade Gamer</Label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] text-gray-400">ID Free Fire</Label><Input value={formData.ff_id} onChange={e => setFormData({ ...formData, ff_id: e.target.value })} className="bg-white/5" /></div>
                <div><Label className="text-[10px] text-gray-400">Nível</Label><Input type="number" value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })} className="bg-white/5" /></div>
              </div>
              <div><Label className="text-[10px] text-gray-400">Nickname</Label><Input value={formData.nickname} onChange={e => setFormData({ ...formData, nickname: e.target.value })} className="bg-white/5" /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Print do Perfil (Verificação)</Label>
              <div className="relative border border-dashed border-white/20 rounded-lg bg-black/40 h-[100px] flex items-center justify-center overflow-hidden">
                <label htmlFor="print-upload" className="absolute inset-0 cursor-pointer"></label>
                <Input id="print-upload" type="file" accept="image/*" className="hidden" onChange={handlePrintUpload} disabled={uploadingPrint} />
                {uploadingPrint ? <Loader2 className="animate-spin text-neon-orange" /> : printPreview ? <img src={printPreview} className="h-full w-full object-cover" /> : <Upload className="text-gray-500" />}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveProfile} className="w-full bg-neon-orange text-black font-bold">Salvar Alterações</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <TitlesModal open={activeModal === "titles"} onClose={() => setActiveModal(null)} userId={user?.id} refreshProfile={refreshProfile} profile={profile} />
      <InscriptionsModal open={activeModal === "inscriptions"} onClose={() => setActiveModal(null)} userId={user?.id} />

      {/* MODAL CONFIGURAÇÕES */}
      <Dialog open={activeModal === "settings"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 italic uppercase font-black tracking-tighter"><Settings className="text-gray-400 h-5 w-5" /> Configurações</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-gray-400" /><span className="text-sm font-bold">Notificações Push</span></div>
                <button onClick={() => toggleSetting("push")} className={`w-10 h-5 rounded-full relative ${settings.push ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.push ? "left-6" : "left-1"}`} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-gray-400" /><span className="text-sm font-bold">Notificações por Email</span></div>
                <button onClick={() => toggleSetting("email")} className={`w-10 h-5 rounded-full relative ${settings.email ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.email ? "left-6" : "left-1"}`} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Volume2 className="h-5 w-5 text-gray-400" /><span className="text-sm font-bold">Efeitos Sonoros</span></div>
                <button onClick={() => toggleSetting("sound")} className={`w-10 h-5 rounded-full relative ${settings.sound ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.sound ? "left-6" : "left-1"}`} /></button>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-2">
              <Button onClick={() => setActiveModal("change_password")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300 font-bold uppercase text-[10px] tracking-widest"><Key className="mr-2 h-4 w-4 text-neon-orange" /> Alterar Minha Senha</Button>
              <Button onClick={() => setActiveModal("terms")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300 font-bold uppercase text-[10px] tracking-widest"><FileText className="mr-2 h-4 w-4" /> Termos de Uso</Button>
              <Button onClick={() => setActiveModal("privacy")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300 font-bold uppercase text-[10px] tracking-widest"><Shield className="mr-2 h-4 w-4" /> Política de Privacidade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SUB-MODAIS DE CONFIGURAÇÕES --- */}

      {/* 1. Alterar Senha */}
      <Dialog open={activeModal === "change_password"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 italic uppercase font-black"><Key className="text-neon-orange h-5 w-5" /> Alterar Senha</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="bg-white/5 border-white/10 h-12" placeholder="Nova Senha" />
            <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="bg-white/5 border-white/10 h-12" placeholder="Confirmar Senha" />
          </div>
          <DialogFooter><Button onClick={handlePasswordChange} className="w-full bg-neon-orange text-black font-black uppercase tracking-widest rounded-xl">Salvar Nova Senha</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Termos de Uso */}
      <Dialog open={activeModal === "terms"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-[2rem] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="italic font-black uppercase text-center text-xl">Termos de Uso</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-4">
            <div><h3 className="text-neon-orange font-bold mb-1 uppercase text-xs">1. Aceitação e Elegibilidade</h3><p>O uso deste aplicativo é estritamente reservado para maiores de 18 anos. Ao realizar o cadastro, você declara estar em plena capacidade civil e concorda integralmente com estes termos.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1 uppercase text-xs">2. Regras de Conduta e Fair Play</h3><p>Prezamos pelo jogo limpo. O uso de hacks, macros, bugs, emuladores não autorizados ou qualquer vantagem desleal resultará em banimento permanente e perda irrevogável do saldo em conta.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1 uppercase text-xs">3. Gestão de Saldo e Pagamentos</h3><p>Os depósitos são destinados exclusivamente para a participação em torneios. Os saques serão processados via PIX, unicamente para contas bancárias de mesma titularidade do CPF cadastrado, em até 48 horas úteis.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1 uppercase text-xs">4. Propriedade Intelectual</h3><p>Todo o conteúdo, design e código deste aplicativo são propriedade exclusiva da Real Fire. É proibida a cópia, engenharia reversa ou distribuição não autorizada.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1 uppercase text-xs">5. Limitação de Responsabilidade</h3><p>A Real Fire não se responsabiliza por instabilidades na conexão de internet do usuário, falhas nos servidores do jogo (Free Fire) ou manutenções programadas que afetem o andamento das partidas.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setActiveModal("settings")} className="w-full bg-white/10 rounded-xl font-bold">Voltar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Política de Privacidade */}
      <Dialog open={activeModal === "privacy"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-[2rem] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="italic font-black uppercase text-center text-xl">Política de Privacidade</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-4">
            <div><h3 className="text-neon-green font-bold mb-1 uppercase text-xs">1. Coleta de Dados</h3><p>Coletamos minimamente seu Nome Completo, CPF e E-mail. Também podemos coletar dados técnicos do dispositivo (IP, modelo) para fins de segurança e prevenção de fraudes.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1 uppercase text-xs">2. Finalidade do Tratamento</h3><p>Seus dados são utilizados exclusivamente para: validação de identidade (KYC), processamento de pagamentos e saques (PIX), suporte ao cliente e comunicação sobre torneios.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1 uppercase text-xs">3. Segurança da Informação</h3><p>Adotamos práticas rigorosas de segurança, incluindo criptografia de ponta a ponta e servidores protegidos. Recomendamos que nunca compartilhe sua senha com terceiros.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1 uppercase text-xs">4. Compartilhamento de Dados</h3><p>Não vendemos nem alugamos seus dados pessoais. O compartilhamento ocorre apenas com gateways de pagamento estritamente necessários para processar suas transações financeiras.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1 uppercase text-xs">5. Seus Direitos (LGPD)</h3><p>Você tem o direito de solicitar o acesso, correção ou exclusão dos seus dados pessoais a qualquer momento, entrando em contato através da nossa aba de Ajuda e Suporte.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setActiveModal("settings")} className="w-full bg-white/10 rounded-xl font-bold">Voltar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHAT SUPORTE IA / HUMANO */}
      <Dialog open={activeModal === "feedback"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-blue-500/50 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader><DialogTitle><MessageSquare className="inline mr-2" /> Sugestões</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-8 w-8 cursor-pointer ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} onClick={() => setRating(s)} />)}</div>
            <Textarea placeholder="Qual sua sugestão para o Real Fire?" className="bg-white/5 min-h-[100px]" value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleSubmitFeedback} className="w-full bg-blue-600 font-bold">Enviar Sugestão</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "support"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{selectedTicket ? <ArrowLeft className="cursor-pointer" onClick={() => setSelectedTicket(null)} /> : <HelpCircle />} {selectedTicket ? "Resposta" : "Tickets Ativos"}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto py-2 space-y-3">
            {selectedTicket ? (
              <div className="space-y-4">
                {ticketMessages.map(m => (
                  <div key={m.id} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`p-3 rounded-xl max-w-[85%] ${m.is_admin ? 'bg-orange-600/20 text-white' : 'bg-blue-600/20 text-white'}`}>
                      <p className="text-[10px] font-bold uppercase mb-1">{m.is_admin ? (m.sender_name === 'system_ai' ? '🤖 Suporte IA' : '👑 Admin') : '👤 Você'}</p>
                      <p className="text-sm">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : myTickets.map(t => (
              <div key={t.id} onClick={() => loadTicketMessages(t)} className="bg-white/5 p-3 rounded-lg cursor-pointer border-l-2 border-orange-500">
                <div className="flex justify-between text-[10px] font-black uppercase mb-1"><span>Ticket #{t.id.slice(0, 5)}</span><span className="text-orange-400">{t.status}</span></div>
                <p className="text-xs text-gray-400 truncate">{t.message}</p>
              </div>
            ))}
          </div>
          <DialogFooter>{!selectedTicket && <Button onClick={() => setActiveModal("write_ticket")} className="w-full bg-neon-orange text-black font-bold">Abrir Novo Chat</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "write_ticket"} onOpenChange={o => { if (!o) { setActiveModal("support"); resetChat(); } }}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader><DialogTitle className="flex gap-2 items-center"><ArrowLeft className="cursor-pointer" onClick={() => setActiveModal("support")} /> Chat Suporte</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {chatHistory.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-orange-500/20 text-white' : 'bg-white/5 text-gray-200'}`}>
                  <p className="text-[10px] font-bold uppercase mb-1">{m.role === 'user' ? '👤 Você' : '🤖 Suporte IA'}</p>
                  <p className="text-sm">{m.text}</p>
                </div>
              </div>
            ))}
            {loadingAi && <div className="text-xs text-orange-500 animate-pulse">IA digitando...</div>}
          </div>
          <DialogFooter className="flex-col gap-2">
            {chatPhase === 'input' && (
              <div className="relative">
                <Textarea placeholder="Como podemos ajudar?" className="bg-black/40 min-h-[80px]" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                <Button size="icon" className="absolute bottom-2 right-2 bg-neon-orange text-black" onClick={handleAiChat}><Send className="h-4 w-4" /></Button>
              </div>
            )}
            {aiAttempts >= 3 && <Button onClick={() => setChatPhase('escalate')} variant="ghost" className="text-xs text-gray-500">Deseja falar com humano?</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

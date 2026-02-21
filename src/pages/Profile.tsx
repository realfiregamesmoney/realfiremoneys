import { useState, useEffect } from "react";
import { User, Wallet, Edit, Trophy, Medal, Coins, LogOut, Settings, HelpCircle, MessageSquare, List, Shield, Lock, Upload, Camera, Bell, Mail, Volume2, Key, FileText, ChevronRight, Star, PlusCircle, Send, ArrowLeft, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client"; // Importação vital
import { GoogleGenerativeAI } from "@google/generative-ai";

// Itens do Menu Principal
const menuItems = [
  { icon: Edit, label: "Editar Perfil", action: "edit_profile" },
  { icon: List, label: "Suas Inscrições", action: "inscriptions" },
  { icon: Settings, label: "Configurações", action: "settings" },
  { icon: MessageSquare, label: "Sugestão de Melhorias", action: "feedback" },
  { icon: HelpCircle, label: "Ajuda e Suporte", action: "support" },
];

function InscriptionsModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId?: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const fetchEnrollments = () => {
    if (!userId) return;
    setLoadingEnrollments(true);
    supabase
      .from("enrollments")
      .select("*, tournaments(title, type, scheduled_at, status, prize_pool)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEnrollments(data || []);
        setLoadingEnrollments(false);
      });
  };

  useEffect(() => {
    if (!open || !userId) return;
    fetchEnrollments();
  }, [open, userId]);

  // Realtime: update when new enrollments are created
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('enrollments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enrollments', filter: `user_id=eq.${userId}` }, () => {
        fetchEnrollments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><List className="text-neon-orange" /> Suas Inscrições</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          {loadingEnrollments ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /></div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Nenhuma inscrição paga encontrada.</div>
          ) : (
            enrollments.map((e) => {
              const t = e.tournaments;
              const isFinished = t?.status === 'finished';
              return (
                <div key={e.id} className={`flex items-center justify-between bg-white/5 p-3 rounded-lg border-l-4 ${isFinished ? 'border-destructive' : 'border-primary'}`}>
                  <div>
                    <h4 className="font-bold text-sm">{t?.title || "Sala"}</h4>
                    <span className="text-[10px] text-gray-400">
                      {t?.type} • {t?.scheduled_at ? new Date(t.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Sem data"}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${isFinished ? 'text-orange-500 bg-orange-500/10' : 'text-green-500 bg-green-500/10'}`}>
                    {isFinished ? "Finalizado" : "Inscrito"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Profile() {
  const { user, profile, isAdmin, signOut, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // --- GERENCIAMENTO DE ESTADO ---
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
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

  useEffect(() => {
    if (activeModal === "support" && user) {
      supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
        setMyTickets(data || []);
      });
    } else if (activeModal !== "support") {
      setSelectedTicket(null);
    }
  }, [activeModal, user]);

  const loadTicketMessages = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setTicketMessages(data || []);
  };

  // Loading de Upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPrint, setUploadingPrint] = useState(false);

  // Dados do Formulário
  const [formData, setFormData] = useState({
    full_name: "",
    cpf: "",
    email: "",
    ff_id: "",
    nickname: "",
    level: "",
  });

  // Atualiza o formulário quando o perfil carrega
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        cpf: profile.cpf || "",
        email: user?.email || "",
        ff_id: profile.freefire_id || "",
        nickname: profile.nickname || "",
        level: String(profile.freefire_level || ""),
      });
      // Carrega as imagens salvas
      if (profile.avatar_url) setSavedAvatar(profile.avatar_url);
      if (profile.freefire_proof_url) setPrintPreview(profile.freefire_proof_url);
    }
  }, [profile]);

  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });

  // Imagens (Preview e Link Salvo)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [printPreview, setPrintPreview] = useState<string | null>(null);
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);

  const [settings, setSettings] = useState({ push: true, email: true, sound: true });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleMenuClick = (action: string) => {
    setActiveModal(action);
  };

  // --- FUNÇÃO DE UPLOAD DE AVATAR (FOTO DE PERFIL) ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem para fazer upload.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar_${Date.now()}.${fileExt}`;

      // 1. Upload para o Storage (sem deletar o antigo - histórico)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // 3. Atualizar Perfil no Banco
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // 4. Atualizar Visual
      setSavedAvatar(publicUrl);
      setAvatarPreview(publicUrl);

      // Log avatar change
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action_type: 'profile_update',
        details: `Jogador ${formData.nickname} atualizou foto de perfil`
      });

      toast.success("Foto de perfil atualizada!");

    } catch (error: any) {
      toast.error("Erro ao atualizar foto", { description: error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- FUNÇÃO DE UPLOAD DO PRINT (COMPROVANTE) ---
  const handlePrintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingPrint(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("Selecione um arquivo.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/proof_${Date.now()}.${fileExt}`;

      // 1. Upload para o Storage (Ajustado para 'profile_proofs')
      const { error: uploadError } = await supabase.storage
        .from('profile_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage.from('profile_proofs').getPublicUrl(filePath);

      // 3. Atualizar estado local
      setPrintPreview(publicUrl);

      await supabase.from('profiles').update({ freefire_proof_url: publicUrl }).eq('user_id', user?.id);

      // Log proof upload
      await supabase.from('audit_logs').insert({
        admin_id: user?.id,
        action_type: 'profile_update',
        details: `Jogador ${formData.nickname} enviou novo print de verificação`
      });

      toast.success("Print carregado com sucesso!");

    } catch (error: any) {
      toast.error("Erro no upload do print", { description: error.message });
    } finally {
      setUploadingPrint(false);
    }
  };

  // --- SALVAR ALTERAÇÕES GERAIS ---
  const handleSaveProfile = async () => {
    try {
      // Build change details for audit log
      const changes: string[] = [];
      if (formData.nickname !== (profile?.nickname || "")) changes.push(`Nickname: ${profile?.nickname || "vazio"} → ${formData.nickname}`);
      if (formData.ff_id !== (profile?.freefire_id || "")) changes.push(`ID FF: ${profile?.freefire_id || "vazio"} → ${formData.ff_id}`);
      const oldLevel = String(profile?.freefire_level || "");
      if (formData.level !== oldLevel) changes.push(`Nível: ${oldLevel || "vazio"} → ${formData.level}`);

      // Only update editable fields - NOT full_name, cpf, email (those are locked)
      const updateData: any = {
        nickname: formData.nickname,
        freefire_id: formData.ff_id,
        freefire_nick: formData.nickname, // Keep freefire_nick in sync
        freefire_level: formData.level ? parseInt(formData.level) : null,
      };

      // Only include freefire_proof_url if printPreview has a value (don't null it out)
      if (printPreview) {
        updateData.freefire_proof_url = printPreview;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Log player profile changes
      if (changes.length > 0) {
        await supabase.from('audit_logs').insert({
          admin_id: user?.id,
          action_type: 'profile_update',
          details: `Jogador ${formData.nickname} alterou: ${changes.join(', ')}`
        });
      }

      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
      setActiveModal(null);
    } catch (error: any) {
      toast.error("Erro ao salvar perfil", { description: error.message });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return toast.error("Escreva algo para enviar.");

    const { error } = await supabase.from('support_tickets').insert({
      user_id: user?.id,
      type: 'suggestion',
      message: feedbackMessage,
      status: 'open'
    });

    if (error) {
      toast.error("Erro ao enviar sugestão");
    } else {
      // Notify all admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "Nova Sugestão",
            message: feedbackMessage.substring(0, 100),
            type: "new_suggestion",
          });
        }
      }
      toast.success("Sugestão enviada!", { description: "Obrigado por ajudar a melhorar o Real Fire." });
      setRating(0);
      setFeedbackMessage("");
      setActiveModal(null);
    }
  };

  const resetChat = () => {
    setSupportMessage("");
    setAiResponse(null);
    setAiAttempts(0);
    setCurrentTicketId(null);
    setChatPhase('input');
    setChatHistory([]);
    setCsatRating(0);
  };

  const handleAiChat = async () => {
    if (!supportMessage.trim()) return toast.error("Descreva seu problema.");

    const nextAttempts = aiAttempts + 1;

    // --- ESCALONAMENTO: chegou na 3ª tentativa ---
    if (nextAttempts > 3) {
      setChatPhase('escalate');
      return;
    }

    setLoadingAi(true);
    const userMsg = supportMessage.trim();
    setSupportMessage("");

    // VERIFICAR IA
    const { data: aiSettingValue } = await supabase.rpc('get_app_setting', { p_key: 'gemini_ai_support' });
    const isAiEnabled = aiSettingValue === 'true';

    if (!isAiEnabled) {
      // Fallback direto para humano sem IA
      setLoadingAi(false);
      await sendToHumanQueue(userMsg);
      return;
    }

    let aiReplyText = "";
    let aiSuccess = false;
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Key não encontrada");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Constroi prompt com histórico de tentativas
      const historyContext = chatHistory.map(h => `${h.role === 'user' ? 'Jogador' : 'Suporte'}: ${h.text}`).join('\n');
      const attemptNote = nextAttempts > 1 ? `Esta é a ${nextAttempts}ª tentativa de resolver o problema. Tente uma abordagem diferente.` : '';
      const prompt = `Você é o suporte automatizado do Real Fire (app de torneios de Free Fire). Jogador: ${formData.nickname || 'Jogador'}. ${historyContext ? 'Histórico:\n' + historyContext + '\n' : ''}Nova mensagem: "${userMsg}". ${attemptNote} Seja direto, amigável e conciso (máx 3 parágrafos).`;

      const result = await model.generateContent(prompt);
      aiReplyText = result.response.text();
      aiSuccess = true;
    } catch (err) {
      console.error(err);
      toast.error("IA indisponível, repassando para equipe...");
      setLoadingAi(false);
      await sendToHumanQueue(userMsg);
      return;
    } finally {
      setLoadingAi(false);
    }

    if (aiSuccess) {
      // Atualiza histórico local
      setChatHistory(prev => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: aiReplyText }]);
      setAiAttempts(nextAttempts);
      setAiResponse(aiReplyText);
      setChatPhase('ai_replied');

      // Cria/atualiza ticket no BD
      if (!currentTicketId) {
        const { data: newTicket } = await supabase.from('support_tickets').insert({
          user_id: user?.id, type: 'support', message: userMsg, status: 'ai_resolved'
        }).select('id').single();
        if (newTicket) {
          setCurrentTicketId(newTicket.id);
          await supabase.from('support_messages').insert([
            { ticket_id: newTicket.id, sender_id: user?.id, message: userMsg, is_admin: false },
            { ticket_id: newTicket.id, sender_id: null, message: aiReplyText, is_admin: true }
          ]);
        }
      } else {
        await supabase.from('support_messages').insert([
          { ticket_id: currentTicketId, sender_id: user?.id, message: userMsg, is_admin: false },
          { ticket_id: currentTicketId, sender_id: null, message: aiReplyText, is_admin: true }
        ]);
      }
    }
  };

  const sendToHumanQueue = async (msg?: string) => {
    const message = msg || supportMessage.trim();
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user?.id, type: 'support', message, status: 'waiting_human'
    });
    if (!error) {
      // Notificar admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id, title: "🚨 Atendimento Urgente",
            message: message.substring(0, 100), type: "new_support"
          });
        }
      }
    }
  };

  const handleResolved = async (rating: number) => {
    setCsatRating(rating);
    if (currentTicketId) {
      await supabase.from('support_tickets').update({ status: 'closed', csat_rating: rating }).eq('id', currentTicketId);
    }
    setChatPhase('done');
  };

  const handleEscalate = async (confirm: boolean) => {
    if (!confirm) {
      setChatPhase('input'); // Fecha sem escalar
      return;
    }
    setChatPhase('escalated');
    if (currentTicketId) {
      await supabase.from('support_tickets').update({ status: 'waiting_human' }).eq('id', currentTicketId);
    } else {
      await sendToHumanQueue();
    }
    // Notificar os admins sobre urgência
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins) {
      for (const admin of admins) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id, title: "🚨 Jogador Aguardando Humano",
          message: `${formData.nickname} não foi resolvido pela IA e pediu atendimento humano.`, type: "new_support"
        });
      }
    }
  };

  // ========================
  // Fluxo original para tickets sem IA
  const handleSubmitTicket = async () => {
    if (!supportMessage.trim()) return toast.error("Descreva seu problema.");
    const { data: aiSettingValue } = await supabase.rpc('get_app_setting', { p_key: 'gemini_ai_support' });
    const isAiEnabled = aiSettingValue === 'true';
    if (isAiEnabled) { await handleAiChat(); return; }

    // Fallback Humano original
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user?.id, type: 'support', message: supportMessage, status: 'open'
    });
    if (!error) {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id, title: "Novo Ticket de Suporte", message: supportMessage.substring(0, 100), type: "new_support"
          });
        }
      }
      toast.success("Solicitação enviada!", { description: "Suporte notificado." });
      setSupportMessage("");
      setActiveModal(null);
    } else {
      toast.error("Erro ao enviar solicitação");
    }
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error("Senhas não conferem.");
    if (passwordData.newPassword.length < 6) return toast.error("Mínimo 6 caracteres.");

    supabase.auth.updateUser({ password: passwordData.newPassword }).then(({ error }) => {
      if (error) toast.error(error.message);
      else {
        toast.success("Senha alterada!");
        setActiveModal("settings");
        setPasswordData({ newPassword: "", confirmPassword: "" });
      }
    });
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5 px-4 py-4 pb-24">

      {/* 1. BOTÃO PAINEL ADMIN (TOPO) */}
      {isAdmin && (
        <Button
          onClick={() => navigate("/admin")}
          className="w-full bg-black border border-neon-orange text-neon-orange font-bold uppercase tracking-widest hover:bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.3)] mb-4 h-12"
        >
          <Shield className="mr-2 h-5 w-5" /> Painel do Admin
        </Button>
      )}

      {/* 2. CABEÇALHO (AVATAR E NÍVEL) */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary border-2 border-border overflow-hidden">
            {savedAvatar ? (
              <img src={savedAvatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => setActiveModal("edit_profile")}
            className="absolute 0 right-0 rounded-full bg-neon-orange p-2 shadow-lg hover:scale-110 transition-transform"
          >
            <Edit className="h-4 w-4 text-black" />
          </button>
        </div>

        <h2 className="mt-3 text-2xl font-black text-white uppercase tracking-wide">{formData.nickname || "Jogador"}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="bg-white/10 px-3 py-0.5 rounded text-xs text-gray-300 font-bold">Nível {formData.level || 1}</span>
        </div>

        <Card className="mt-4 w-full border-neon-orange bg-[#121214]">
          <CardContent className="flex items-center justify-center gap-3 p-4">
            <Wallet className="h-6 w-6 text-neon-green" />
            <span className="text-2xl font-black text-neon-green tracking-tight">
              R$ {(profile?.saldo ?? 0).toFixed(2).replace(".", ",")}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. MENU RÁPIDO (FINANCEIRO) */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" className="flex h-auto flex-col gap-2 border-white/10 bg-[#18181b] py-4 text-xs hover:border-neon-green/50" onClick={() => navigate("/finance")}>
          <Wallet className="h-6 w-6 text-neon-green" /> Depositar
        </Button>
        <Button variant="outline" className="flex h-auto flex-col gap-2 border-white/10 bg-[#18181b] py-4 text-xs hover:border-neon-orange/50" onClick={() => navigate("/finance")}>
          <Wallet className="h-6 w-6 text-neon-orange" /> Sacar
        </Button>
        <Button variant="outline" className="flex h-auto flex-col gap-2 border-white/10 bg-[#18181b] py-4 text-xs hover:border-white/30" onClick={() => navigate("/finance")}>
          <List className="h-6 w-6 text-gray-400" /> Histórico
        </Button>
      </div>

      {/* 4. ESTATÍSTICAS */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Trophy, label: "Torneios", value: String(profile?.tournaments_played || 0) },
          { icon: Medal, label: "Vitórias", value: String(profile?.victories || 0) },
          { icon: Coins, label: "Ganhos", value: `R$ ${Number(profile?.total_winnings || 0).toFixed(0)}` },
        ].map((s) => (
          <Card key={s.label} className="border-white/5 bg-[#121214]">
            <CardContent className="flex flex-col items-center p-3 gap-1">
              <s.icon className="h-5 w-5 text-neon-orange" />
              <span className="text-lg font-bold text-white">{s.value}</span>
              <span className="text-[10px] uppercase text-gray-500 font-bold">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 5. MENU PRINCIPAL */}
      <div className="space-y-1 bg-[#121214] rounded-xl p-2 border border-white/5">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => handleMenuClick(item.action)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-4 text-sm text-gray-200 transition-all hover:bg-white/5 active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/5 p-2 rounded-lg"><item.icon className="h-5 w-5 text-neon-orange" /></div>
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        ))}
        <Separator className="my-2 bg-white/10" />
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-4 py-4 text-sm text-red-500 transition-colors hover:bg-red-500/10">
          <div className="bg-red-500/10 p-2 rounded-lg"><LogOut className="h-5 w-5" /></div>
          <span className="font-bold">Sair da Conta</span>
        </button>
      </div>

      {/* ================= MODAIS ================= */}

      {/* A. EDITAR PERFIL */}
      <Dialog open={activeModal === "edit_profile"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-neon-orange uppercase">Editar Perfil</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">

            {/* Foto */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer h-24 w-24">
                <label htmlFor="avatar-upload" className="absolute inset-0 z-20 cursor-pointer rounded-full"></label>
                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />

                <div className="h-24 w-24 rounded-full bg-secondary border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                  {uploadingAvatar ? (
                    <Loader2 className="h-8 w-8 animate-spin text-neon-orange" />
                  ) : avatarPreview || savedAvatar ? (
                    <img src={avatarPreview || savedAvatar || ""} className="h-full w-full object-cover" alt="Perfil" />
                  ) : (
                    <User className="h-10 w-10 text-gray-500" />
                  )}
                </div>

                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"><Camera className="h-6 w-6 text-white" /></div>
              </div>
              <span className="text-xs text-neon-green font-bold uppercase">{uploadingAvatar ? "Enviando..." : "Trocar Foto"}</span>
            </div>

            <Separator className="bg-white/10" />

            {/* Dados Oficiais */}
            <div className="space-y-3">
              <Label className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2"><Lock className="h-3 w-3" /> Dados Oficiais (Não Alterável)</Label>
              <div className="space-y-3 opacity-70">
                <div><Label className="text-[10px] text-gray-400">Nome Completo</Label><Input value={formData.full_name} readOnly disabled className="bg-black border-white/5 text-gray-500 cursor-not-allowed" /></div>
                <div><Label className="text-[10px] text-gray-400">CPF</Label><Input value={formData.cpf} readOnly disabled className="bg-black border-white/5 text-gray-500 cursor-not-allowed" /></div>
                <div><Label className="text-[10px] text-gray-400">E-mail</Label><Input value={formData.email} readOnly disabled className="bg-black border-white/5 text-gray-500 cursor-not-allowed" /></div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Identidade Gamer */}
            <div className="space-y-3">
              <Label className="text-neon-orange text-xs font-bold uppercase flex items-center gap-2"><Trophy className="h-3 w-3" /> Identidade Gamer</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-400">ID Free Fire</Label>
                    <Input value={formData.ff_id} onChange={(e) => setFormData({ ...formData, ff_id: e.target.value })} className="bg-white/5 border-white/10 focus:border-neon-orange" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Nível</Label>
                    <Input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="bg-white/5 border-white/10 focus:border-neon-orange" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400">Nickname</Label>
                  <Input value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} className="bg-white/5 border-white/10 focus:border-neon-orange" />
                </div>
              </div>
            </div>

            {/* Print */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white">Print do Perfil</Label>
              <div className="relative border border-dashed border-white/20 rounded-lg bg-white/5 h-[100px] flex items-center justify-center overflow-hidden">
                <label htmlFor="print-upload" className="absolute inset-0 cursor-pointer z-10"></label>
                <Input id="print-upload" type="file" accept="image/*" className="hidden" onChange={handlePrintUpload} disabled={uploadingPrint} />

                {uploadingPrint ? (
                  <div className="flex flex-col items-center"><Loader2 className="animate-spin h-6 w-6 text-neon-orange" /><span className="text-xs mt-1">Enviando...</span></div>
                ) : printPreview ? (
                  <img src={printPreview} className="h-full w-full object-cover opacity-50" alt="Print" />
                ) : (
                  <div className="flex flex-col items-center"><Upload className="h-6 w-6 text-gray-400" /><span className="text-[10px] text-gray-400 mt-1">Toque para enviar</span></div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSaveProfile} className="w-full bg-neon-orange text-black font-bold">Salvar Alterações</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* B. SUAS INSCRIÇÕES (DADOS REAIS) */}
      <InscriptionsModal open={activeModal === "inscriptions"} onClose={() => setActiveModal(null)} userId={user?.id} />

      {/* C. CONFIGURAÇÕES */}
      <Dialog open={activeModal === "settings"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="text-gray-400" /> Configurações</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-gray-400" /><span className="text-sm">Notificações Push</span></div>
                <button onClick={() => toggleSetting("push")} className={`w-10 h-5 rounded-full relative ${settings.push ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.push ? "left-6" : "left-1"}`} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-gray-400" /><span className="text-sm">Notificações por Email</span></div>
                <button onClick={() => toggleSetting("email")} className={`w-10 h-5 rounded-full relative ${settings.email ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.email ? "left-6" : "left-1"}`} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Volume2 className="h-5 w-5 text-gray-400" /><span className="text-sm">Efeitos Sonoros</span></div>
                <button onClick={() => toggleSetting("sound")} className={`w-10 h-5 rounded-full relative ${settings.sound ? "bg-neon-green" : "bg-gray-700"}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.sound ? "left-6" : "left-1"}`} /></button>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div className="space-y-2">
              <Button onClick={() => setActiveModal("change_password")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300"><Key className="mr-2 h-4 w-4" /> Alterar Senha</Button>
              <Button onClick={() => setActiveModal("terms")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300"><FileText className="mr-2 h-4 w-4" /> Termos de Uso</Button>
              <Button onClick={() => setActiveModal("privacy")} variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 text-gray-300"><Shield className="mr-2 h-4 w-4" /> Política de Privacidade</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- SUB-MODAIS DE CONFIGURAÇÕES --- */}

      {/* 1. Alterar Senha */}
      <Dialog open={activeModal === "change_password"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="text-neon-orange" /> Alterar Senha</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="bg-white/5 border-white/10" placeholder="Nova Senha" />
            <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="bg-white/5 border-white/10" placeholder="Confirmar Senha" />
          </div>
          <DialogFooter><Button onClick={handlePasswordChange} className="w-full bg-neon-orange text-black font-bold">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Termos de Uso */}
      <Dialog open={activeModal === "terms"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Termos de Uso</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-2">
            <div><h3 className="text-neon-orange font-bold mb-1">1. Aceitação e Elegibilidade</h3><p>O uso deste aplicativo é estritamente reservado para maiores de 18 anos. Ao realizar o cadastro, você declara estar em plena capacidade civil e concorda integralmente com estes termos.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1">2. Regras de Conduta e Fair Play</h3><p>Prezamos pelo jogo limpo. O uso de hacks, macros, bugs, emuladores não autorizados ou qualquer vantagem desleal resultará em banimento permanente e perda irrevogável do saldo em conta.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1">3. Gestão de Saldo e Pagamentos</h3><p>Os depósitos são destinados exclusivamente para a participação em torneios. Os saques serão processados via PIX, unicamente para contas bancárias de mesma titularidade do CPF cadastrado, em até 48 horas úteis.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1">4. Propriedade Intelectual</h3><p>Todo o conteúdo, design e código deste aplicativo são propriedade exclusiva da Real Fire. É proibida a cópia, engenharia reversa ou distribuição não autorizada.</p></div>
            <div><h3 className="text-neon-orange font-bold mb-1">5. Limitação de Responsabilidade</h3><p>A Real Fire não se responsabiliza por instabilidades na conexão de internet do usuário, falhas nos servidores do jogo (Free Fire) ou manutenções programadas que afetem o andamento das partidas.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setActiveModal("settings")} className="w-full bg-white/10">Voltar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Política de Privacidade */}
      <Dialog open={activeModal === "privacy"} onOpenChange={() => setActiveModal("settings")}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Política de Privacidade</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-2">
            <div><h3 className="text-neon-green font-bold mb-1">1. Coleta de Dados</h3><p>Coletamos minimamente seu Nome Completo, CPF e E-mail. Também podemos coletar dados técnicos do dispositivo (IP, modelo) para fins de segurança e prevenção de fraudes.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1">2. Finalidade do Tratamento</h3><p>Seus dados são utilizados exclusivamente para: validação de identidade (KYC), processamento de pagamentos e saques (PIX), suporte ao cliente e comunicação sobre torneios.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1">3. Segurança da Informação</h3><p>Adotamos práticas rigorosas de segurança, incluindo criptografia de ponta a ponta e servidores protegidos. Recomendamos que nunca compartilhe sua senha com terceiros.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1">4. Compartilhamento de Dados</h3><p>Não vendemos nem alugamos seus dados pessoais. O compartilhamento ocorre apenas com gateways de pagamento estritamente necessários para processar suas transações financeiras.</p></div>
            <div><h3 className="text-neon-green font-bold mb-1">5. Seus Direitos (LGPD)</h3><p>Você tem o direito de solicitar o acesso, correção ou exclusão dos seus dados pessoais a qualquer momento, entrando em contato através da nossa aba de Ajuda e Suporte.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setActiveModal("settings")} className="w-full bg-white/10">Voltar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* D. SUGESTÕES */}
      <Dialog open={activeModal === "feedback"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-blue-500/50 bg-[#09090b] text-white w-[95%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400"><MessageSquare /> Sugestão de Melhorias</DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">Sua opinião é importante. Avalie e envie sua ideia.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-8 w-8 cursor-pointer transition-colors ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} onClick={() => setRating(star)} />
              ))}
            </div>
            <Textarea placeholder="Descreva sua sugestão..." className="bg-white/5 border-white/10 min-h-[100px] text-sm" value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleSubmitFeedback} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"><Send className="mr-2 h-4 w-4" /> Enviar Sugestão</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* E. SUPORTE */}
      <Dialog open={activeModal === "support"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-neon-orange">
            {selectedTicket ? <ArrowLeft className="h-5 w-5 cursor-pointer" onClick={() => setSelectedTicket(null)} /> : <HelpCircle />}
            {selectedTicket ? "Detalhes do Ticket" : "Suporte"}
          </DialogTitle></DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-3 min-h-[200px]">
            {selectedTicket ? (
              <div className="space-y-3">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-xs">
                  <strong className="text-gray-400">Mensagem Original:</strong>
                  <p className="mt-1 text-gray-300">{selectedTicket.message}</p>
                </div>
                {ticketMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.is_admin ? 'bg-orange-600/20 border border-orange-500/30 text-white' : 'bg-blue-600/20 border border-blue-500/30 text-white'}`}>
                      {msg.is_admin && <strong className="block text-neon-orange text-[10px] mb-1 uppercase">Suporte {selectedTicket.status === 'ai_resolved' && !msg.sender_id ? '(IA)' : ''}</strong>}
                      {!msg.is_admin && <strong className="block text-blue-400 text-[10px] mb-1 uppercase">Você</strong>}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
                {ticketMessages.length === 0 && <p className="text-center text-xs text-gray-500">Sem respostas adicionais.</p>}

                {selectedTicket.status === 'human_intervention' && (
                  <div className="text-center p-2 rounded bg-blue-900/20 border border-blue-500/30"><span className="text-xs text-blue-400">Um humano assumiu este ticket. Respostas enviadas a partir de agora cairão na caixa de entrada do admin.</span></div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {myTickets.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">Você ainda não abriu nenhum ticket.</p>
                ) : (
                  myTickets.map(t => (
                    <div key={t.id} onClick={() => loadTicketMessages(t)} className="bg-white/5 p-3 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-300 uppercase">
                          {t.type === 'support' ? 'Problema' : 'Sugestão'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase
                                        ${t.status === 'open' ? 'bg-yellow-900/30 text-yellow-500' :
                            t.status === 'ai_resolved' ? 'bg-green-900/40 text-green-400' :
                              t.status === 'human_intervention' ? 'bg-blue-900/40 text-blue-400' :
                                'bg-gray-800 text-gray-400'}`}>
                          {t.status === 'open' ? 'Aberto' :
                            t.status === 'ai_resolved' ? 'Resolvido (IA)' :
                              t.status === 'human_intervention' ? 'Admin. Ativo' : 'Fechado'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-2">{t.message}</p>
                      <p className="text-[10px] text-gray-600 mt-2">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-2 text-center items-center justify-center">
            {!selectedTicket && (
              <Button onClick={() => setActiveModal("write_ticket")} className="w-full bg-neon-orange text-black font-bold hover:bg-orange-600"><PlusCircle className="mr-2 h-4 w-4" /> Nova Mensagem</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F. NOVO TICKET / CHAT COM IA */}
      <Dialog open={activeModal === "write_ticket"} onOpenChange={(open) => { if (!open) { setActiveModal("support"); resetChat(); } }}>
        <DialogContent className="border-neon-orange bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neon-orange">
              <ArrowLeft className="h-5 w-5 cursor-pointer" onClick={() => { setActiveModal("support"); resetChat(); }} />
              {chatPhase === 'done' ? 'Obrigado pelo Feedback!' : chatPhase === 'escalated' ? 'Atendente Chamado' : chatPhase === 'escalate' ? 'Precisando de Mais Ajuda?' : 'Suporte Real Fire'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">

            {/* Histórico de mensagens */}
            {chatHistory.length > 0 && (
              <div className="space-y-2">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-neon-orange/20 border border-neon-orange/30 text-white' : 'bg-white/5 border border-white/10 text-gray-200'
                      }`}>
                      <p className={`text-[10px] font-bold uppercase mb-1 ${msg.role === 'user' ? 'text-neon-orange' : 'text-yellow-500'}`}>
                        {msg.role === 'user' ? '👤 Você' : '🤖 Suporte IA'}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading */}
            {loadingAi && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-400">IA analisando...</span>
                </div>
              </div>
            )}

            {/* FASE: Input */}
            {chatPhase === 'input' && !loadingAi && (
              <div className="space-y-3">
                {aiAttempts > 0 && (
                  <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
                    Tentativa {aiAttempts}/3 — Descreva o problema com mais detalhes para ajudarmos melhor.
                  </div>
                )}
                <Label className="text-xs text-gray-400">{aiAttempts === 0 ? 'Descreva seu problema:' : 'O que mais você pode nos contar?'}</Label>
                <Textarea
                  placeholder={aiAttempts === 0 ? 'Ex: Não recebi meus pontos após o torneio...' : 'Explique com mais detalhes o que está acontecendo...'}
                  className="bg-white/5 border-white/10 min-h-[100px] text-sm focus:border-neon-orange"
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                />
              </div>
            )}

            {/* FASE: IA Respondeu → Botões de Resolução */}
            {chatPhase === 'ai_replied' && !loadingAi && (
              <div className="space-y-3 pt-2">
                <p className="text-center text-xs text-gray-500">A resposta acima resolveu seu problema?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setChatPhase('rating')}
                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-3"
                  >
                    ✅ Resolvido!
                  </Button>
                  <Button
                    onClick={() => {
                      if (aiAttempts >= 3) { setChatPhase('escalate'); }
                      else { setChatPhase('input'); }
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-3"
                  >
                    ❌ Ainda preciso de ajuda
                  </Button>
                </div>
              </div>
            )}

            {/* FASE: Avaliação CSAT */}
            {chatPhase === 'rating' && (
              <div className="space-y-4 py-4 text-center">
                <p className="text-gray-300 text-sm font-bold">Que ótimo! 🎉 Como foi o nosso atendimento?</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleResolved(star)}
                      className={`h-12 w-12 rounded-full text-2xl transition-all hover:scale-125 ${star <= csatRating ? 'bg-yellow-500/20' : 'bg-white/5'
                        }`}
                    >
                      {star <= csatRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600">Toque em uma estrela para avaliar</p>
              </div>
            )}

            {/* FASE: Escalonamento */}
            {chatPhase === 'escalate' && (
              <div className="space-y-4 py-4 text-center">
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-5">
                  <p className="text-4xl mb-3">🤝</p>
                  <p className="text-white font-bold text-sm mb-2">Parece que essa questão é mais complexa.</p>
                  <p className="text-gray-400 text-xs">Deseja falar com um de nossos atendentes reais?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => handleEscalate(true)} className="bg-neon-orange text-black font-bold py-3">Sim, quero!</Button>
                  <Button onClick={() => handleEscalate(false)} variant="ghost" className="text-gray-400 font-bold py-3">Não, obrigado</Button>
                </div>
              </div>
            )}

            {/* FASE: Confirmação - Concluído */}
            {chatPhase === 'done' && (
              <div className="text-center py-6 space-y-4">
                <p className="text-5xl">{csatRating >= 4 ? '🔥' : csatRating >= 3 ? '👍' : '💪'}</p>
                <p className="text-white font-bold text-base">Obrigado pela avaliação!</p>
                <p className="text-gray-400 text-sm">Fico feliz em ter ajudado. Bora vencer no Free Fire! 🎮</p>
                <div className="flex justify-center">
                  {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-xl">{s <= csatRating ? '⭐' : '☆'}</span>)}
                </div>
              </div>
            )}

            {/* FASE: Escalonado para humano */}
            {chatPhase === 'escalated' && (
              <div className="text-center py-6 space-y-4">
                <p className="text-5xl">🧑‍💼</p>
                <p className="text-white font-bold text-base">Chamado registrado!</p>
                <p className="text-gray-400 text-sm">Um atendente real foi notificado e responderá em breve. Fique de olho nas suas notificações!</p>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-400">🔔 Você receberá uma notificação assim que um atendente responder.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer dinâmico */}
          <DialogFooter className="mt-2">
            {(chatPhase === 'done' || chatPhase === 'escalated') && (
              <Button onClick={() => { setActiveModal("support"); resetChat(); }} className="w-full bg-neon-orange text-black font-bold">Fechar</Button>
            )}
            {chatPhase === 'input' && !loadingAi && (
              <Button onClick={handleAiChat} disabled={!supportMessage.trim()} className="w-full bg-neon-orange text-black font-bold hover:bg-orange-600">
                <Send className="mr-2 h-4 w-4" /> {aiAttempts === 0 ? 'Enviar' : 'Tentar Novamente'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

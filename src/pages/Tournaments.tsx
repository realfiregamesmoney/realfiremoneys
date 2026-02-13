import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Users, Clock, Flame, ArrowLeft, AlertTriangle, ArrowRight, Bell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { playNotificationSound } from "@/utils/notificationSound";

const typeColor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("duplo") || t.includes("duo")) return "bg-purple-600";
  if (t.includes("squad")) return "bg-red-600";
  return "bg-blue-600";
};

export default function Tournaments() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [roomLinks, setRoomLinks] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("TODOS");

  // --- NOVOS ESTADOS PARA LOGICA DE ESPERA E REDIRECIONAMENTO ---
  const [fullRoomModal, setFullRoomModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [nextTournament, setNextTournament] = useState<any>(null);

  const fetchData = async () => {
    const { data: ts, error } = await supabase.from("tournaments").select("*").order("scheduled_at", { ascending: true });
    if (error) {
      console.error("Error fetching tournaments:", error);
      toast({ variant: "destructive", title: "Erro ao carregar torneios", description: error.message });
      return;
    }
    if (ts) setTournaments(ts);

    if (user) {
      const { data: enrollments } = await supabase.from("enrollments").select("tournament_id, tournaments(room_link)").eq("user_id", user.id);
      if (enrollments) {
        const ids = new Set(enrollments.map((e: any) => e.tournament_id));
        setEnrolledIds(ids);
        const links: Record<string, string> = {};
        enrollments.forEach((e: any) => {
          if (e.tournaments?.room_link) links[e.tournament_id] = e.tournaments.room_link;
        });
        setRoomLinks(links);
      }
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- 1. SISTEMA DE NOTIFICAÇÕES AUTOMÁTICAS PARA TODOS OS JOGADORES (10m, 5m, 1m) ---
  useEffect(() => {
    if (!user) return;
    
    const checkNotifications = () => {
      const now = new Date();
      tournaments.forEach(t => {
        if (t.status !== 'open') return;
        const tournamentTime = new Date(t.scheduled_at);
        const diffMs = tournamentTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if ([10, 5, 1].includes(diffMinutes)) {
          const storageKey = `notif_${t.id}_${diffMinutes}`;
          if (!sessionStorage.getItem(storageKey)) {
            const isEnrolled = enrolledIds.has(t.id);
            playNotificationSound();
            toast({
              title: `⏰ Torneio: ${t.title}`,
              description: isEnrolled
                ? `Faltam ${diffMinutes} minuto(s)! Prepare-se para jogar.`
                : `Faltam ${diffMinutes} minuto(s)! Inscreva-se agora antes que feche.`,
              variant: diffMinutes === 1 ? "destructive" : "default",
            });
            sessionStorage.setItem(storageKey, "true");
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 10000);
    checkNotifications(); // check immediately
    return () => clearInterval(interval);
  }, [tournaments, enrolledIds, user]);

  // --- 2. LÓGICA DE INSCRIÇÃO COM REDIRECIONAMENTO SE CHEIO ---
  const handleEnroll = async (tournament: any) => {
    if (!user || !profile) return;

    // Verificar se sala está cheia
    const isFull = tournament.current_players >= tournament.max_players;
    if (isFull) {
      // Encontra o próximo torneio do mesmo tipo ou qualquer próximo disponível
      const currentIndex = tournaments.findIndex(t => t.id === tournament.id);
      const suggestion = tournaments.slice(currentIndex + 1).find(t => t.current_players < t.max_players);
      
      setSelectedTournament(tournament);
      setNextTournament(suggestion || null);
      setFullRoomModal(true);
      return;
    }

    if (Number(profile.saldo) < Number(tournament.entry_fee)) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: "Deposite mais para se inscrever." });
      return;
    }

    try {
      const newSaldo = Number(profile.saldo) - Number(tournament.entry_fee);
      const newTournamentsPlayed = (profile.tournaments_played || 0) + 1;
      const { error: balanceErr } = await supabase.from("profiles").update({ 
        saldo: newSaldo,
        tournaments_played: newTournamentsPlayed
      }).eq("user_id", user.id);
      if (balanceErr) throw balanceErr;

      await supabase.from("transactions").insert({
        user_id: user.id, type: "entry_fee", amount: Number(tournament.entry_fee), status: "approved",
      });

      // Add to tournament_participants with paid status
      await supabase.from("tournament_participants").insert({
        user_id: user.id, tournament_id: tournament.id, status: "paid",
      });

      const { data: enrollment, error: enrollErr } = await supabase.from("enrollments").insert({
        user_id: user.id, tournament_id: tournament.id,
      }).select().single();
      if (enrollErr) throw enrollErr;

      await supabase.from("tournaments").update({
        current_players: tournament.current_players + 1,
        status: tournament.current_players + 1 >= tournament.max_players ? "waiting" : "open",
      }).eq("id", tournament.id);

      await refreshProfile();
      toast({ title: "Inscrito com sucesso! 🎉" });
      navigate(`/tournament/${tournament.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro na inscrição", description: err.message || "Tente novamente." });
    }
  };

  const handleJoinNext = () => {
    if (nextTournament) {
      setFullRoomModal(false);
      handleEnroll(nextTournament);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === "TODOS") return true;
    if (filter === "SALAS ABERTAS") return t.status === "open";
    return t.type?.toUpperCase() === filter;
  });

  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    const aEnrolled = enrolledIds.has(a.id) ? 0 : 1;
    const bEnrolled = enrolledIds.has(b.id) ? 0 : 1;
    return aEnrolled - bEnrolled;
  });

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 shadow-lg mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-orange-500" /> Torneios
          </h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["TODOS", "SOLO", "DUO", "SQUAD", "SALAS ABERTAS"].map((aba) => (
            <button
              key={aba}
              onClick={() => setFilter(aba)}
              className={`
                whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border uppercase
                ${filter === aba 
                  ? "bg-orange-600 border-orange-600 text-white shadow-[0_0_15_rgba(234,88,12,0.4)]" 
                  : "bg-[#111] border-white/10 text-gray-400 hover:border-white/30 hover:text-white"}
              `}
            >
              {aba}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-3">
        {sortedTournaments.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum torneio encontrado nesta categoria.</p>
        )}

        {sortedTournaments.map((t) => {
          const isFull = t.current_players >= t.max_players;
          const isEnrolled = enrolledIds.has(t.id);
          const revealedLink = roomLinks[t.id];
          const filled = t.current_players || 0;
          const max = t.max_players || 48;
          const percentage = Math.min(100, (filled / max) * 100);
          const barColor = percentage < 50 ? "bg-orange-500" : "bg-green-500";

          return (
            <div key={t.id} className="flex flex-col overflow-hidden rounded-xl" style={{ background: "#111111", border: "1px solid #333" }}>
              {!isEnrolled ? (
                <button
                  onClick={() => handleEnroll(t)}
                  className="flex w-full items-center justify-center gap-2 py-3 text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: isFull
                      ? "linear-gradient(135deg, #661a00, #993300)"
                      : "linear-gradient(135deg, #FF5500, #FF8800)",
                  }}
                >
                  <Flame className="h-4 w-4" />
                  {isFull
                    ? "SALA LOTADA / VER OPÇÕES"
                    : `ENTRAR - R$ ${Number(t.entry_fee).toFixed(2).replace(".", ",")}`}
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="flex w-full items-center justify-center gap-2 py-3 transition-all hover:brightness-110"
                  style={{ background: "rgba(0,255,0,0.15)" }}
                >
                  <span className="text-sm font-bold uppercase" style={{ color: "#00FF00" }}>✓ Inscrito — Acessar Sala</span>
                </button>
              )}

              <div className="flex flex-col gap-2 px-4 py-3">
                <span className={`inline-block self-start rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${typeColor(t.type)}`}>
                  {t.type}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #2a1a00, #3d2600)", boxShadow: "0 0 12px rgba(255,170,0,0.3)" }}>
                    <Trophy className="h-6 w-6" style={{ color: "#FFB800" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{t.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">(PRÊMIO EM DINHEIRO/ PIX)</p>
                    <p className="text-lg font-extrabold tracking-tight" style={{ color: "#00FF00", textShadow: "0 0 10px rgba(0,255,0,0.4)" }}>
                      R$ {Number(t.prize_pool).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                   <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
                     <span>Vagas Preenchidas</span>
                     <span className={percentage >= 100 ? "text-red-500" : "text-green-500"}>
                        {filled}/{max}
                     </span>
                   </div>
                   <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/10">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${barColor}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                   </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 mt-1" style={{ borderTop: "1px solid #333" }}>
                  <div className="flex items-center gap-3 w-full justify-between">
                    {t.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(t.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        {" • "}
                        {new Date(t.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className={isFull ? "text-destructive font-bold" : ""}>
                        {t.status === 'open' ? 'Aberto' : 'Fechado'}
                      </span>
                    </span>
                  </div>
                </div>

                {isEnrolled && revealedLink && (
                  <div className="rounded-lg p-3 text-center" style={{ background: "#1a1a1a" }}>
                    <p className="text-[10px] uppercase text-muted-foreground">Link da Sala</p>
                    <p className="text-sm font-bold text-neon-orange break-all" style={{color: '#ff5500'}}>{revealedLink}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- 3. MODAL DE SALA CHEIA / REDIRECIONAMENTO (ACRESCENTADO) --- */}
      <Dialog open={fullRoomModal} onOpenChange={setFullRoomModal}>
        <DialogContent className="border-red-600/50 bg-[#0c0c0c] text-white w-[92%] rounded-2xl p-6">
            <DialogHeader>
                <div className="mx-auto bg-red-900/20 p-3 rounded-full mb-3 border border-red-900">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <DialogTitle className="text-center text-xl font-black uppercase text-red-500 tracking-tighter">
                    SALA LOTADA!
                </DialogTitle>
                <DialogDescription className="text-center text-gray-400 text-xs">
                    As vagas para <strong>{selectedTournament?.title}</strong> esgotaram.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
                {nextTournament ? (
                    <div className="bg-orange-600/10 p-4 rounded-xl border border-orange-600/30">
                        <p className="text-[10px] text-orange-500 uppercase font-black mb-1">Próximo disponível:</p>
                        <h4 className="font-bold text-sm text-white">{nextTournament.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                            <Clock className="h-3 w-3" /> 
                            {new Date(nextTournament.scheduled_at).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                            <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded ml-2">Vagas Abertas</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-xs text-gray-500">Não há próximos horários para hoje.</p>
                )}
            </div>

            <DialogFooter className="flex flex-col gap-2 mt-2">
                {nextTournament && (
                    <Button onClick={handleJoinNext} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-6 rounded-xl">
                        IR PARA PRÓXIMO <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                <Button variant="outline" className="w-full border-white/5 bg-[#1a1a1a] text-gray-400 font-bold py-6 rounded-xl" onClick={() => {
                    setFullRoomModal(false);
                    toast({ title: "Fila de Espera", description: "Você será notificado se uma vaga abrir." });
                }}>
                    ENTRAR NA LISTA DE ESPERA
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

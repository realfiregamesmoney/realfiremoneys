import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Clock, Users, Flame, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function TournamentLobby() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const fetchData = async () => {
    if (!id || !user) return;

    const [{ data: t }, { data: enrollment }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).single(),
      supabase.from("enrollments").select("id").eq("tournament_id", id).eq("user_id", user.id).maybeSingle(),
    ]);

    if (t) setTournament(t);
    setIsEnrolled(!!enrollment);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // --- CORREÇÃO EM TEMPO REAL ---
    if (!id) return;

    // Escuta o banco de dados. Se o número de jogadores mudar (pelo Trigger), atualiza a tela automaticamente.
    const channel = supabase
      .channel('tournament_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => {
          setTournament((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const handlePay = async () => {
    if (!user || !profile || !tournament) return;
    setPaying(true);

    // 1. Verificações de Segurança
    if (!profile.freefire_id) {
      toast({
        variant: "destructive",
        title: "⚠️ Conta não vinculada",
        description: "Você precisa vincular sua conta do Free Fire no Perfil antes de jogar!",
      });
      setPaying(false);
      navigate("/profile");
      return;
    }

    if (Number(profile.saldo) < Number(tournament.entry_fee)) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: "Deposite mais para se inscrever." });
      setPaying(false);
      return;
    }

    // 2. Desconta o Saldo
    const newSaldo = Number(profile.saldo) - Number(tournament.entry_fee);
    const { error: balanceErr } = await supabase.from("profiles").update({ saldo: newSaldo }).eq("user_id", user.id);
    if (balanceErr) {
      toast({ variant: "destructive", title: "Erro", description: balanceErr.message });
      setPaying(false);
      return;
    }

    // 3. Registra a Transação
    await supabase.from("transactions").insert({
      user_id: user.id, type: "entry_fee", amount: Number(tournament.entry_fee), status: "approved",
    });

    // 4. Cria a Inscrição
    // SOLUÇÃO DEFINITIVA: Apenas inserimos na tabela enrollments. 
    // O Trigger do banco de dados (que tem permissão de Admin) fará a contagem no tournaments.
    const { error: enrollErr } = await supabase.from("enrollments").insert({
      user_id: user.id, tournament_id: tournament.id,
    });

    if (enrollErr) {
      // Estorno de segurança: Se falhar a inscrição, devolve o dinheiro
      await supabase.from("profiles").update({ saldo: Number(profile.saldo) }).eq("user_id", user.id);
      
      toast({ variant: "destructive", title: "Erro ao entrar", description: "Tente novamente mais tarde." });
      setPaying(false);
      return;
    }

    // --- LINHA COMENTADA PARA O CONTADOR FUNCIONAR VIA BANCO ---
    /* await supabase.from("tournaments").update({
      current_players: tournament.current_players + 1,
      status: tournament.current_players + 1 >= tournament.max_players ? "waiting" : "open",
    }).eq("id", tournament.id); */

    await refreshProfile();
    setIsEnrolled(true);
    toast({ title: "Inscrito com sucesso! 🎉" });
    setPaying(false);
  };

  const handleStartMatch = () => {
    if (tournament?.room_link) {
      window.open(tournament.room_link, "_blank");
    } else {
      toast({ title: "Link ainda não disponível", description: "O administrador ainda não configurou o link da sala." });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Carregando...
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p>Torneio não encontrado.</p>
        <button onClick={() => navigate("/tournaments")} className="text-sm text-primary underline">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "#0a0a0a", borderBottom: "1px solid #222" }}>
        <button onClick={() => navigate("/tournaments")} className="rounded-lg p-2 transition hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold uppercase tracking-wider truncate">{tournament.title}</h1>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {/* Status banner */}
        {isEnrolled ? (
          <div className="rounded-xl p-6 text-center" style={{ background: "linear-gradient(135deg, #002200, #003300)", border: "1px solid #00FF0044" }}>
            <p className="text-2xl font-black uppercase tracking-wider" style={{ color: "#00FF00", textShadow: "0 0 20px rgba(0,255,0,0.5)" }}>
              VOCÊ ESTÁ DENTRO! 🚀
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Sua vaga está garantida neste torneio</p>
          </div>
        ) : (
          <div className="rounded-xl p-6 text-center" style={{ background: "linear-gradient(135deg, #1a0a00, #2a1500)", border: "1px solid #FF550044" }}>
            <p className="text-lg font-extrabold uppercase tracking-wider" style={{ color: "#FF8800" }}>
              INSCREVA-SE AGORA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Pague a taxa de inscrição para garantir sua vaga</p>
          </div>
        )}

        {/* Tournament details card */}
        <div className="rounded-xl p-4 space-y-4" style={{ background: "#111", border: "1px solid #333" }}>
          {/* Prize */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #2a1a00, #3d2600)", boxShadow: "0 0 12px rgba(255,170,0,0.3)" }}>
              <Trophy className="h-7 w-7" style={{ color: "#FFB800" }} />
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Prêmio Total</p>
              <p className="text-2xl font-black" style={{ color: "#00FF00", textShadow: "0 0 10px rgba(0,255,0,0.4)" }}>
                R$ {Number(tournament.prize_pool).toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #333" }} />

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
              <p className="text-[10px] uppercase text-muted-foreground">Taxa de Entrada</p>
              <p className="text-sm font-bold text-foreground">R$ {Number(tournament.entry_fee).toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
              <p className="text-[10px] uppercase text-muted-foreground">Modo</p>
              <p className="text-sm font-bold text-foreground">{tournament.type}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
              <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Jogadores</p>
              <p className="text-sm font-bold text-foreground">{tournament.current_players}/{tournament.max_players}</p>
            </div>
            {tournament.scheduled_at && (
              <div className="rounded-lg p-3" style={{ background: "#1a1a1a" }}>
                <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(tournament.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  {" • "}
                  {new Date(tournament.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action area */}
        {isEnrolled ? (
          <button
            onClick={handleStartMatch}
            className="relative w-full overflow-hidden rounded-xl py-5 text-lg font-black uppercase tracking-widest text-background transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #00CC00, #00FF44)",
              boxShadow: "0 0 30px rgba(0,255,0,0.4), 0 0 60px rgba(0,255,0,0.15)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <ExternalLink className="h-5 w-5" />
              COMEÇAR PARTIDA
            </span>
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full rounded-xl py-4 text-base font-extrabold uppercase tracking-widest text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF5500, #FF8800)" }}
          >
            <span className="flex items-center justify-center gap-2">
              <Flame className="h-5 w-5" />
              {paying ? "PROCESSANDO..." : `PAGAR TAXA - R$ ${Number(tournament.entry_fee).toFixed(2).replace(".", ",")}`}
            </span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(0,255,0,0.4), 0 0 60px rgba(0,255,0,0.15); }
          50% { box-shadow: 0 0 40px rgba(0,255,0,0.6), 0 0 80px rgba(0,255,0,0.25); }
        }
      `}</style>
    </div>
  );
}

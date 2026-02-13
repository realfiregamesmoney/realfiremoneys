import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowUpCircle, ArrowDownCircle, Copy, Share2, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type WinnerEntry = { name: string; amount: string; avatar_url?: string };

// Fictional placeholder data
const FICTIONAL_RANKING = [
  { nickname: "🔥 FireKing", saldo: 2450, avatar_url: null, freefire_level: 78 },
  { nickname: "ShadowX", saldo: 1890, avatar_url: null, freefire_level: 65 },
  { nickname: "ProSniper_BR", saldo: 1540, avatar_url: null, freefire_level: 72 },
  { nickname: "QueenFF", saldo: 1320, avatar_url: null, freefire_level: 60 },
  { nickname: "NightWolf", saldo: 980, avatar_url: null, freefire_level: 55 },
];

const FICTIONAL_WINNERS: WinnerEntry[] = [
  { name: "FireKing", amount: "R$ 500,00" },
  { name: "ShadowX", amount: "R$ 300,00" },
  { name: "ProSniper_BR", amount: "R$ 200,00" },
  { name: "QueenFF", amount: "R$ 150,00" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [featuredTournament, setFeaturedTournament] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [recentWinners, setRecentWinners] = useState<WinnerEntry[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentWinners();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const link = `${window.location.origin}/auth?ref=${user.id}`;
      setReferralLink(link);

      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);
      setReferralCount(count || 0);

      const { data: profileData } = await supabase.from("profiles").select("*, total_winnings, tournaments_played, victories").eq("user_id", user.id).maybeSingle();
      setProfile(profileData || { saldo: 0, nickname: user.email?.split('@')[0] });

      const { data: featured } = await supabase.from("tournaments").select("*").eq("is_featured", true).maybeSingle();
      setFeaturedTournament(featured);

      // Ranking: use total_winnings for ranking instead of saldo
      const { data: players } = await supabase
        .from("profiles")
        .select("nickname, saldo, avatar_url, freefire_level, total_winnings")
        .order("total_winnings", { ascending: false })
        .limit(10);
      
      if (players && players.length >= 3) {
        setTopPlayers(players);
      } else {
        // Merge real + fictional, real first
        const merged = [...(players || []), ...FICTIONAL_RANKING].slice(0, 10);
        setTopPlayers(merged);
      }

    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentWinners = async () => {
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("details")
      .eq("action_type", "tournament_result")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (logs && logs.length > 0) {
      const winners: WinnerEntry[] = logs.map(log => {
        const match = log.details?.match(/Vencedor:\s*(.+?)\s*\(R\$\s*([\d.,]+)\)/);
        return {
          name: match?.[1] || "Jogador",
          amount: `R$ ${match?.[2] || "0,00"}`,
        };
      });
      setRecentWinners(winners);
    } else {
      // Use fictional winners as placeholder
      setRecentWinners(FICTIONAL_WINNERS);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('winners-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        const newLog = payload.new as any;
        if (newLog.action_type === 'tournament_result') {
          fetchRecentWinners();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copiado! 📋",
      description: "Envie para seus amigos. Quando eles depositarem, você ganha!",
      className: "bg-green-600 border-none text-white"
    });
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-orange-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-orange-500/30">
      
      <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: flex; white-space: nowrap; animation: scroll 20s linear infinite; }
      `}</style>

      {/* 1. LETREIRO DE GANHADORES */}
      <div className="relative mt-1 overflow-hidden border-b border-white/5">
        <div className="bg-gradient-to-r from-black/80 via-white/[0.03] to-black/80 backdrop-blur-md py-2">
          <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[#050505] to-transparent"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[#050505] to-transparent"></div>
          
          <div className="animate-marquee">
            {[...recentWinners, ...recentWinners, ...recentWinners, ...recentWinners].map((winner, i) => (
              <span key={i} className="inline-flex items-center mx-4 bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-full pl-1 pr-3 py-1 gap-2 shadow-lg">
                <Avatar className="h-6 w-6 border border-yellow-500/30">
                  <AvatarImage src={winner.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${winner.name}`} />
                  <AvatarFallback className="bg-gray-800 text-[10px] text-yellow-500 font-bold">{winner.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-bold text-white">{winner.name}</span>
                <span className="text-[11px] font-black text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]">{winner.amount}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* 2. TORNEIO EM DESTAQUE */}
        {featuredTournament ? (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-orange-500/30 group shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-orange-500 hover:bg-orange-600 text-black font-bold border-0 animate-pulse">🔥 EM DESTAQUE</Badge>
                <span className="text-xs font-bold text-orange-200 tracking-wider uppercase bg-orange-900/40 px-2 py-0.5 rounded border border-orange-500/30">{featuredTournament.type}</span>
              </div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter mb-1 drop-shadow-lg">{featuredTournament.title}</h2>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-sm text-gray-400 mb-1">Prêmio Total:</span>
                <span className="text-3xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">R$ {featuredTournament.prize_pool}</span>
              </div>
              <Button onClick={() => navigate("/tournaments")} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase tracking-widest border-0 shadow-lg">
                Inscrever-se Agora
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-[#111] border-dashed border-gray-800 p-8 text-center">
            <p className="text-gray-500">Nenhum torneio em destaque.</p>
          </Card>
        )}

        {/* 3. BOTÕES DE DEPÓSITO E SAQUE */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-orange-500/50 transition-all rounded-xl group"
            onClick={() => navigate("/finance")}
          >
            <div className="bg-orange-500/10 p-3 rounded-full group-hover:bg-orange-500/20 transition-colors">
              <ArrowUpCircle className="h-6 w-6 text-orange-500" />
            </div>
            <span className="font-bold text-gray-200">Depositar</span>
            <span className="text-[10px] text-gray-500">Via PIX</span>
          </Button>

          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-green-500/50 transition-all rounded-xl group"
            onClick={() => navigate("/finance")}
          >
            <div className="bg-green-500/10 p-3 rounded-full group-hover:bg-green-500/20 transition-colors">
              <ArrowDownCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="font-bold text-gray-200">Sacar</span>
            <span className="text-[10px] text-gray-500">Rápido</span>
          </Button>
        </div>

        {/* 4. TOP JOGADORES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Top Jogadores
            </h3>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            {topPlayers.map((player, index) => (
              <div key={index} className={`flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${index === 0 ? 'bg-yellow-500/5' : ''} ${index === 1 ? 'bg-gray-400/5' : ''} ${index === 2 ? 'bg-orange-700/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center font-bold">
                    {index === 0 && <span className="text-xl">🥇</span>}
                    {index === 1 && <span className="text-xl">🥈</span>}
                    {index === 2 && <span className="text-xl">🥉</span>}
                    {index > 2 && <span className="text-gray-600">#{index + 1}</span>}
                  </div>
                  <Avatar className="h-10 w-10 border border-white/10">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="bg-gray-800 text-gray-400 font-bold">{player.nickname?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm text-gray-200">{player.nickname || "Jogador"}</p>
                    <p className="text-[10px] text-gray-500">Nível {player.freefire_level || 0}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`block font-bold text-sm ${index < 3 ? 'text-green-400' : 'text-green-600'}`}>
                    R$ {Number(player.total_winnings || player.saldo || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {topPlayers.length === 0 && <div className="p-6 text-center text-gray-500 text-sm">Nenhum jogador no ranking ainda.</div>}
          </div>
        </div>

        {/* 5. SUAS ESTATÍSTICAS */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-400 uppercase">Suas Estatísticas</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-white/5">
            <div>
              <span className="block text-xl font-black text-white">{profile?.tournaments_played || 0}</span>
              <span className="text-[10px] text-gray-500 uppercase">Torneios</span>
            </div>
            <div>
              <span className="block text-xl font-black text-green-500">R$ {Number(profile?.total_winnings || 0).toFixed(0)}</span>
              <span className="text-[10px] text-gray-500 uppercase">Ganhos</span>
            </div>
            <div>
              <span className="block text-xl font-black text-white">{profile?.victories || 0}</span>
              <span className="text-[10px] text-gray-500 uppercase">Vitórias</span>
            </div>
          </div>
        </div>

        {/* 6. INDIQUE E GANHE */}
        <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.3)] mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Users className="h-5 w-5 text-indigo-300" />
              Indique e Ganhe Dinheiro! 💸
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-indigo-100 leading-relaxed">
              Convide amigos! Indique no mínimo 10 jogadores. Após o cadastro e depósito deles, você recebe <strong className="text-white">R$ 10,00</strong> para jogar.
              Você já indicou <strong className="text-white">{referralCount}</strong> pessoa(s).
            </p>
            
            <div className="bg-black/40 p-3 rounded-lg border border-white/10 space-y-2">
              <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Seu Link de Indicação</label>
              <div className="flex gap-2">
                <input 
                  value={referralLink} 
                  readOnly 
                  className="flex h-9 w-full rounded-md border border-white/10 bg-[#050505] px-3 py-1 text-xs text-gray-300 shadow-sm transition-colors font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                />
                <Button 
                  onClick={copyToClipboard} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3 shrink-0"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>

            <Button onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Real Fire Games',
                  text: 'Venha jogar Free Fire valendo dinheiro real!',
                  url: referralLink,
                })
              } else {
                copyToClipboard();
              }
            }} variant="outline" className="w-full border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-colors">
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar Link
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

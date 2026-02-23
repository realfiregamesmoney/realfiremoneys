import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowUpCircle, ArrowDownCircle, Copy, Share2, Users, User, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import PartnershipCapture from "@/components/partnership/PartnershipCapture";

type WinnerEntry = { name: string; amount: string; avatar_url?: string };

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
  const [promotionalProducts, setPromotionalProducts] = useState<any[]>([]);
  const [vipPlans, setVipPlans] = useState<any[]>([]);

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

      // Ranking: use total_winnings for ranking - only real winners, descending
      const { data: players } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, freefire_level, total_winnings")
        .gt("total_winnings", 0)
        .order("total_winnings", { ascending: false })
        .limit(10);
      setTopPlayers(players || []);
      // Fetch promotional products
      const { data: promoData } = await supabase.from('notification_settings').select('label').eq('key_name', 'PROMO_PRODUCTS_V1').maybeSingle();
      if (promoData && promoData.label) {
        try {
          const parsed = JSON.parse(promoData.label);
          setPromotionalProducts(parsed.filter((p: any) => p.is_active && !p.is_deleted));
        } catch (e) {
          setPromotionalProducts([]);
        }
      } else {
        setPromotionalProducts([]);
      }

      // Fetch VIP Plans
      const { data: plansData } = await supabase.from('notification_settings').select('label').eq('key_name', 'VIP_PLANS_V1').maybeSingle();
      if (plansData && plansData.label) {
        try {
          const parsedPlans = JSON.parse(plansData.label);
          setVipPlans(parsedPlans.filter((p: any) => p.is_active && !p.is_deleted));
        } catch (e) { }
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
      const winners = logs.map(log => {
        const match = log.details?.match(/Vencedor:\s*(.+?)\s*\(R\$\s*([\d.,]+)\)/);
        return {
          name: match?.[1] || "Jogador",
          amount: `R$ ${match?.[2] || "0,00"}`,
          avatar_url: undefined
        } as WinnerEntry;
      });

      const uniqueNames = Array.from(new Set(winners.map(w => w.name)));
      if (uniqueNames.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('nickname, avatar_url').in('nickname', uniqueNames);
        if (profiles) {
          winners.forEach(w => {
            const match = profiles.find(p => p.nickname === w.name);
            if (match) w.avatar_url = match.avatar_url;
          });
        }
      }
      setRecentWinners(winners);
    } else {
      setRecentWinners([]);
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

      {/* 1. LETREIRO DE GANHADORES (PREMIUM) */}
      <div className="relative mt-1 overflow-hidden border-b border-white/5 h-12 flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none"></div>

        <div className="bg-gradient-to-r from-black/90 via-[#0a0a0a]/80 to-black/90 backdrop-blur-md absolute inset-0">
          {/* Sombras laterais para fade-out perfeito */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#050505] to-transparent"></div>
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#050505] to-transparent"></div>

          <div className="animate-marquee h-full flex items-center">
            {recentWinners.length > 0 ? [...recentWinners, ...recentWinners, ...recentWinners, ...recentWinners].map((winner, i) => (
              <span key={i} className="inline-flex items-center mx-3 bg-white/[0.03] backdrop-blur-lg border border-white/5 rounded-full pl-1.5 pr-4 py-1 gap-2.5 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all hover:bg-white/[0.08] hover:border-white/10 group cursor-default">
                <Avatar className="h-6 w-6 border border-yellow-500/40 shadow-[0_0_5px_rgba(234,179,8,0.3)]">
                  <AvatarImage src={winner.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${winner.name}`} />
                  <AvatarFallback className="bg-gradient-to-b from-yellow-400 to-yellow-600 text-[10px] text-black font-black">{winner.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors">{winner.name}</span>
                <span className="flex items-center text-[11px] font-black text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                  <span className="text-[8px] mr-0.5 opacity-80">R$</span>
                  {winner.amount.replace('R$', '').trim()}
                </span>
              </span>
            )) : (
              <div className="text-xs text-gray-500 font-bold px-8 uppercase tracking-widest animate-pulse flex items-center h-full">Próximos ganhadores aparecerão aqui...</div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* --- NOVO: BANNER CTA PRODUTOS PROMOCIONAIS --- */}
        {promotionalProducts.map((product) => {
          let colorClass = "from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 border-yellow-300/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]";
          if (product.color === 'green') colorClass = "from-green-400 via-green-500 to-emerald-600 hover:from-green-300 hover:via-green-400 hover:to-emerald-500 border-green-300/50 shadow-[0_0_20px_rgba(74,222,128,0.4)]";
          else if (product.color === 'blue') colorClass = "from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 border-blue-300/50 shadow-[0_0_20px_rgba(59,130,246,0.4)]";
          else if (product.color === 'purple') colorClass = "from-fuchsia-500 via-purple-500 to-violet-600 hover:from-fuchsia-400 hover:via-purple-400 hover:to-violet-500 border-purple-300/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]";
          else if (product.color === 'pink') colorClass = "from-pink-400 via-pink-500 to-rose-600 hover:from-pink-300 hover:via-pink-400 hover:to-rose-500 border-pink-300/50 shadow-[0_0_20px_rgba(236,72,153,0.4)]";

          return (
            <Button
              key={product.id}
              onClick={() => window.open(product.url, '_blank')}
              className={`w-full h-auto py-4 px-6 bg-gradient-to-r text-white font-black uppercase tracking-tight text-sm sm:text-base border-2 animate-pulse rounded-2xl whitespace-normal text-center ${colorClass}`}
            >
              {product.title}
            </Button>
          );
        })}

        {/* 2. TORNEIO EM DESTAQUE */}
        {featuredTournament ? (
          <div className="relative w-full h-[280px] rounded-3xl overflow-hidden group border border-white/10 shadow-[0_0_40px_rgba(249,115,22,0.15)] cursor-pointer" onClick={() => navigate("/tournaments")}>
            {(() => {
              let btnColorClass = "bg-white text-black hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]";

              if (featuredTournament.button_color === "green") {
                btnColorClass = "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-[0_0_20px_rgba(74,222,128,0.4)]";
              } else if (featuredTournament.button_color === "orange") {
                btnColorClass = "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]";
              } else if (featuredTournament.button_color === "blue") {
                btnColorClass = "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]";
              } else if (featuredTournament.button_color === "pink") {
                btnColorClass = "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)]";
              } else if (featuredTournament.button_color === "purple") {
                btnColorClass = "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]";
              }

              return (
                <>
                  {/* Foto de Fundo */}
                  <img
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700 ease-out"
                  />
                  {/* Gradiente Escuro por cima */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>

                  {/* Linha Fina Brilhosa no Topo */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent"></div>

                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black border-0 shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse px-2.5 py-1 text-[10px] tracking-widest uppercase">
                        🔥 Evento Principal
                      </Badge>
                      <span className="text-[9px] font-black text-orange-200 tracking-widest uppercase bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-orange-500/20">{featuredTournament.type}</span>
                    </div>

                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-1 drop-shadow-xl group-hover:text-orange-400 transition-colors uppercase leading-none">
                      {featuredTournament.title}
                    </h2>

                    <div className="flex items-end justify-between mt-2 mb-5">
                      <div>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Prêmio Total Acumulado</span>
                        <div className="flex items-start text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                          <span className="text-sm font-bold mt-1.5 mr-1">R$</span>
                          <span className="text-4xl font-black leading-none">{featuredTournament.prize_pool}</span>
                        </div>
                      </div>
                    </div>

                    <Button onClick={(e) => { e.stopPropagation(); navigate("/tournaments"); }} className={`w-full relative overflow-hidden font-black uppercase tracking-widest border-0 h-12 rounded-xl group/btn ${btnColorClass}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                      Acessar Inscrições
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-white/5 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Nenhum torneio em destaque</p>
          </div>
        )}

        {/* 3. BOTÕES DE DEPÓSITO E SAQUE */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="ghost"
            className="group relative h-28 flex flex-col items-center justify-center gap-2 rounded-2xl overflow-hidden border-0 shadow-[0_0_20px_rgba(74,222,128,0.15)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(74,222,128,0.3)] bg-[#0A0A0A] hover:bg-[#0A0A0A]"
            onClick={() => navigate("/finance")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-600/5 to-transparent z-0 opacity-80 group-hover:opacity-100 group-hover:from-green-500/20 transition-all"></div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
            <div className="bg-green-500/20 p-3 rounded-full group-hover:bg-green-500/30 group-hover:scale-110 transition-all z-10 border border-green-500/30 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
              <ArrowUpCircle className="h-7 w-7 text-green-400" />
            </div>
            <div className="z-10 text-center">
              <span className="block font-black text-white text-lg tracking-tight uppercase">Depositar</span>
              <span className="text-[9px] text-green-300 font-bold uppercase tracking-widest mt-0.5 block opacity-80 group-hover:text-green-400 transition-colors">Via PIX Flash ⚡</span>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="group relative h-28 flex flex-col items-center justify-center gap-2 rounded-2xl overflow-hidden border-0 shadow-[0_0_20px_rgba(249,115,22,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] bg-[#0A0A0A] hover:bg-[#0A0A0A]"
            onClick={() => navigate("/finance")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-transparent z-0 opacity-80 group-hover:opacity-100 group-hover:from-orange-500/20 transition-all"></div>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:opacity-0 transition-opacity"></div>
            <div className="bg-white/5 p-3 rounded-full group-hover:bg-orange-500/20 group-hover:scale-110 transition-all z-10 border border-white/10 group-hover:border-orange-500/30 group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
              <ArrowDownCircle className="h-7 w-7 text-gray-400 group-hover:text-orange-400 transition-colors" />
            </div>
            <div className="z-10 text-center">
              <span className="block font-black text-white text-lg tracking-tight uppercase transition-colors">Sacar</span>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 block group-hover:text-orange-300 transition-colors">Retirada Rápida</span>
            </div>
          </Button>
        </div>

        {/* 4. TOP JOGADORES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500 animate-pulse drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" /> Top Ranking
            </h3>
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-[#111] px-2.5 py-1 rounded-md border border-white/10 shadow-inner">Ganhos Reais</span>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Glows de Fundo Dinâmicos */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-yellow-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-orange-600/10 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="relative z-10">
              {topPlayers.map((player, index) => {
                const isGold = index === 0;
                const isSilver = index === 1;
                const isBronze = index === 2;

                let rowBg = "hover:bg-white/[0.03]";
                let medalBadge = null;

                if (isGold) {
                  rowBg = "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 hover:from-yellow-500/20";
                  medalBadge = <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(234,179,8,0.5)]">🥇</div>;
                } else if (isSilver) {
                  rowBg = "bg-gradient-to-r from-gray-300/10 to-transparent border-l-4 border-gray-400 hover:from-gray-300/20";
                  medalBadge = <div className="w-8 h-8 rounded-full bg-gray-400/20 border border-gray-400/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(156,163,175,0.3)]">🥈</div>;
                } else if (isBronze) {
                  rowBg = "bg-gradient-to-r from-orange-700/10 to-transparent border-l-4 border-orange-600 hover:from-orange-700/20";
                  medalBadge = <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-600/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(234,88,12,0.3)]">🥉</div>;
                } else {
                  rowBg = "border-l-4 border-transparent hover:border-white/10 hover:bg-white/[0.02]";
                  medalBadge = <div className="w-8 flex justify-center font-bold text-gray-600 text-[11px] tracking-wider uppercase">#{index + 1}</div>;
                }

                return (
                  <div key={index} className={`flex items-center justify-between p-4 border-b border-white/[0.05] last:border-0 transition-all duration-300 group cursor-default hover:translate-x-1.5 ${rowBg}`}>
                    <div className="flex items-center gap-4">
                      {medalBadge}
                      <Avatar className={`h-11 w-11 border-2 transition-transform duration-300 group-hover:scale-110 ${isGold ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : isSilver ? 'border-gray-400' : isBronze ? 'border-orange-600' : 'border-white/10 hover:border-white/30'}`}>
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-gray-800 text-transparent bg-clip-text bg-gradient-to-b from-gray-300 to-gray-500 font-black text-lg">{player.nickname?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className={`font-black text-sm transition-colors ${isGold ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.6)]' : isSilver ? 'text-gray-200' : isBronze ? 'text-orange-300' : 'text-gray-300 group-hover:text-white'}`}>{player.nickname || "Jogador"}</p>
                        <p className={`text-[10px] font-bold tracking-wider mt-0.5 ${isGold ? 'text-yellow-600 uppercase' : 'text-gray-500'}`}>LVL {player.freefire_level || 0}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest block mb-0.5 font-bold">Lucro</span>
                      <span className={`block font-black text-base drop-shadow-md transition-all ${isGold ? 'text-green-400 scale-110 origin-right' : index < 3 ? 'text-green-400' : 'text-green-500/80 group-hover:text-green-400'}`}>
                        R$ {Number(player.total_winnings || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {topPlayers.length === 0 && (
                <div className="p-10 text-center flex flex-col items-center justify-center gap-3 opacity-60">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Trophy className="h-8 w-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Aguardando Campeões</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. SUAS ESTATÍSTICAS */}
        <div className="relative mt-8 rounded-3xl overflow-hidden p-[1px] group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/30 via-transparent to-orange-500/30 opacity-50 group-hover:opacity-100 transition-opacity"></div>

          <div className="relative bg-[#050505]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-zinc-500/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <User className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Sua Jornada</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Histórico de Performance</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center relative z-10">
              <div className="bg-white/5 border border-white/5 rounded-2xl py-4 flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <span className="text-3xl font-black text-white drop-shadow-md">{profile?.tournaments_played || 0}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Torneios</span>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl py-4 flex flex-col items-center justify-center hover:from-green-500/20 transition-colors shadow-[inset_0_0_10px_rgba(74,222,128,0.1)]">
                <span className="text-2xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">
                  <span className="text-xs mr-1 opacity-70">R$</span>
                  {(Number(profile?.total_winnings) || 0).toFixed(2).split('.')[0]}
                  <span className="text-sm opacity-70">.{(Number(profile?.total_winnings) || 0).toFixed(2).split('.')[1]}</span>
                </span>
                <span className="text-[9px] font-bold text-green-300/80 uppercase tracking-widest mt-1">Lucro Limpo</span>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl py-4 flex flex-col items-center justify-center hover:from-orange-500/20 transition-colors shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]">
                <span className="text-3xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">{profile?.victories || 0}</span>
                <span className="text-[9px] font-bold text-orange-300/80 uppercase tracking-widest mt-1">Vitórias Puras</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. INDIQUE E GANHE MOVIDO PARA PARCERIAS */}

        {/* 7. PLANOS VIP ASSINATURA */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-6 w-6 text-neon-orange" />
            <h2 className="text-xl font-black uppercase text-white">Planos VIP Real Fire</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">Assine e tenha direito a <b className="text-white">2 Passes Livres diários</b> para jogar sem gastar seu saldo!</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vipPlans.map((plan: any) => {
              const baseColor = plan.color || 'yellow';

              let bgGradientFrom = `from-${baseColor}-500/20`;
              let textColor = `text-${baseColor}-500`;
              let borderClass = `border-${baseColor}-500/30`;
              let shadowColor = baseColor === 'yellow' ? '234,179,8' : baseColor === 'cyan' ? '6,182,212' : baseColor === 'purple' ? '168,85,247' : baseColor === 'orange' ? '249,115,22' : '234,179,8';
              let customStyleClass = '';
              let btnClass = `bg-gradient-to-r from-${baseColor}-600 to-${baseColor}-500 hover:from-${baseColor}-500 hover:to-${baseColor}-400 shadow-[0_0_20px_rgba(${shadowColor},0.3)]`;
              let cardGlowClass = `from-${baseColor}-500/50 via-transparent to-${baseColor}-600/50`;

              if (baseColor === 'gold') {
                textColor = "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]";
                shadowColor = '234,179,8';
                bgGradientFrom = "from-yellow-400/20 via-yellow-600/10";
                btnClass = "bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 hover:from-yellow-200 hover:via-yellow-400 hover:to-amber-500 shadow-[0_0_25px_rgba(234,179,8,0.5)] text-black";
                cardGlowClass = "from-yellow-300/60 via-amber-500/20 to-yellow-600/60";
              } else if (baseColor === 'silver') {
                textColor = "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]";
                shadowColor = '209,213,219';
                bgGradientFrom = "from-gray-300/20 via-gray-500/10";
                btnClass = "bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600 hover:from-white hover:via-gray-300 hover:to-gray-500 shadow-[0_0_25px_rgba(209,213,219,0.4)] text-black";
                cardGlowClass = "from-gray-300/60 via-gray-500/20 to-gray-400/60";
              } else if (baseColor === 'bronze') {
                textColor = "text-amber-500 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]";
                shadowColor = '217,119,6';
                bgGradientFrom = "from-amber-600/20 via-orange-800/10";
                btnClass = "bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 hover:from-amber-400 hover:via-orange-500 hover:to-amber-700 shadow-[0_0_25px_rgba(217,119,6,0.5)]";
                cardGlowClass = "from-amber-500/60 via-orange-700/20 to-amber-700/60";
              } else if (baseColor === 'diamond') {
                textColor = "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]";
                shadowColor = '34,211,238';
                bgGradientFrom = "from-cyan-300/30 via-blue-500/10";
                btnClass = "bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600 hover:from-cyan-200 hover:via-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(34,211,238,0.6)] text-black";
                cardGlowClass = "from-cyan-300/60 via-blue-500/20 to-cyan-500/60";
              }

              return (
                <div key={plan.id} className="relative group/plan rounded-3xl p-[1px] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
                  {/* Borda Animada */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cardGlowClass} opacity-50 group-hover/plan:opacity-100 transition-opacity`}></div>

                  <Card className={`relative bg-[#050505]/95 backdrop-blur-xl border-0 h-full overflow-hidden shadow-[0_0_20px_rgba(${shadowColor},0.1)] group-hover/plan:shadow-[0_0_40px_rgba(${shadowColor},0.3)] rounded-3xl`}>
                    {/* Efeitos Internos de Vidro/Luz */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${bgGradientFrom} to-transparent blur-2xl opacity-60 group-hover/plan:opacity-100 transition-all`}></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                    <CardHeader className="text-center pb-2 relative z-10 pt-6">
                      <div className="text-5xl mb-4 flex justify-center group-hover/plan:scale-110 transition-transform duration-500 drop-shadow-2xl">{plan.icon}</div>
                      <CardTitle className={`text-2xl font-black uppercase ${textColor} tracking-tight`}>{plan.title}</CardTitle>
                      <CardDescription className="text-gray-400 font-bold tracking-widest uppercase text-xs mt-1">Salas de R$ {Number(plan.roomPrice).toFixed(2).replace('.', ',')}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 relative z-10 mt-2">
                      <div className="text-center mb-6">
                        <div className="inline-flex justify-center items-start">
                          <span className={`text-sm mt-1 mr-1 font-bold ${textColor}`}>R$</span>
                          <span className="text-5xl font-black text-white drop-shadow-md">{Number(plan.price).toFixed(2).split('.')[0]}</span>
                          <span className="text-xl text-gray-300 font-black mt-1">,{Number(plan.price).toFixed(2).split('.')[1]}</span>
                        </div>
                        <span className="text-gray-500 text-xs uppercase tracking-widest font-black block mt-1">/mês</span>
                      </div>

                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <ul className="space-y-3 text-sm text-gray-300 font-medium">
                          <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] rounded-full" /> <span className="text-white font-bold tracking-wide">2 Acessos Vips</span> / Dia</li>
                          <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] rounded-full" /> Salas de <b className="text-white ml-1">R$ {Number(plan.roomPrice).toFixed(2).replace('.', ',')}</b></li>
                          <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] rounded-full" /> Sem fidelidade</li>
                        </ul>
                      </div>

                      <Button onClick={() => navigate(`/checkout/${plan.id}`)} className={`w-full relative overflow-hidden font-black uppercase tracking-widest py-6 rounded-xl border-0 group/btn ${btnClass}`}>
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out"></div>
                        ASSINAR AGORA
                      </Button>

                      {plan.extra_text && (
                        <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold pt-1 opacity-70">
                          {plan.extra_text}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* 8. CAPTAÇÃO DE PARCEIROS E INDICAÇÕES */}
        <PartnershipCapture referralLink={referralLink} referralCount={referralCount} />

      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowUpCircle, ArrowDownCircle, Bell, Wallet, Flame, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Simulação de ganhadores recentes (Ticker)
const RECENT_WINNERS = [
  { name: "Drako_FF", amount: "R$ 250,00" },
  { name: "Nobru_Fake", amount: "R$ 1.500,00" },
  { name: "Mestra_Isa", amount: "R$ 85,00" },
  { name: "Joker_Kill", amount: "R$ 200,00" },
  { name: "Ghost_Rider", amount: "R$ 120,00" },
];

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [featuredTournament, setFeaturedTournament] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Pega usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // 2. Pega perfil do usuário
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);

      // 3. Pega Torneio em Destaque
      const { data: featured } = await supabase
        .from("tournaments")
        .select("*")
        .eq("is_featured", true)
        .maybeSingle();
      setFeaturedTournament(featured);

      // 4. Pega Top Jogadores (Ordenados por Saldo - Os mais ricos)
      const { data: players } = await supabase
        .from("profiles")
        .select("nickname, saldo, avatar_url, freefire_level")
        .order("saldo", { ascending: false })
        .limit(10); // Lista maior (Top 10)
      setTopPlayers(players || []);

    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-orange-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-orange-500/30">
      
      {/* --- CSS PARA ANIMAÇÃO DO LETREIRO --- */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          white-space: nowrap;
          animation: scroll 20s linear infinite;
        }
      `}</style>

      {/* 1. HEADER (Topo) */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(249,115,22,0.5)]">
            <Flame className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">REAL<span className="text-orange-500">FIRE</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          </Button>
          
          <div className="bg-[#1a1a1a] border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
            <Wallet className="h-3.5 w-3.5 text-green-500" />
            <span className="text-sm font-bold text-green-400">R$ {profile?.saldo?.toFixed(2) || "0.00"}</span>
          </div>
        </div>
      </header>

      {/* 2. LETREIRO DE GANHADORES (Ticker) */}
      <div className="bg-gradient-to-r from-black via-[#111] to-black border-y border-white/5 py-1.5 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#050505] to-transparent"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#050505] to-transparent"></div>
        
        <div className="animate-marquee">
          {/* Lista duplicada várias vezes para garantir o loop infinito sem buracos */}
          {[...RECENT_WINNERS, ...RECENT_WINNERS, ...RECENT_WINNERS, ...RECENT_WINNERS].map((winner, i) => (
            <span key={i} className="inline-flex items-center mx-6 text-xs font-medium text-gray-300">
              <Trophy className="h-3 w-3 text-yellow-500 mr-1.5" />
              <span className="text-white font-bold mr-1">{winner.name}</span> ganhou <span className="text-green-400 ml-1 font-bold">{winner.amount}</span> 
              <span className="mx-2 text-gray-600">•</span>
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* 3. TORNEIO EM DESTAQUE (Hero Banner) */}
        {featuredTournament ? (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-orange-500/30 group shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            {/* Imagem de Fundo */}
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" 
              alt="Torneio Banner" 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
            />
            {/* Gradiente Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-orange-500 hover:bg-orange-600 text-black font-bold border-0 animate-pulse">
                  🔥 EM DESTAQUE
                </Badge>
                <span className="text-xs font-bold text-orange-200 tracking-wider uppercase bg-orange-900/40 px-2 py-0.5 rounded border border-orange-500/30">
                  {featuredTournament.type}
                </span>
              </div>
              
              <h2 className="text-2xl font-black text-white italic tracking-tighter mb-1 drop-shadow-lg">
                {featuredTournament.title}
              </h2>
              
              <div className="flex items-end gap-1 mb-4">
                <span className="text-sm text-gray-400 mb-1">Prêmio Total:</span>
                <span className="text-3xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                  R$ {featuredTournament.prize_pool}
                </span>
              </div>

              <Button 
                onClick={() => navigate("/tournaments")}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase tracking-widest border-0 shadow-lg"
              >
                Inscrever-se Agora
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-[#111] border-dashed border-gray-800 p-8 text-center">
            <p className="text-gray-500">Nenhum torneio em destaque no momento.</p>
          </Card>
        )}

        {/* 4. AÇÕES RÁPIDAS (Botões Grandes) */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-orange-500/50 transition-all rounded-xl group"
            onClick={() => navigate("/deposit")}
          >
            <div className="bg-orange-500/10 p-3 rounded-full group-hover:bg-orange-500/20 transition-colors">
              <ArrowUpCircle className="h-6 w-6 text-orange-500" />
            </div>
            <span className="font-bold text-gray-200">Depositar</span>
            <span className="text-[10px] text-gray-500">Via PIX</span>
          </Button>

          <Button 
            className="h-24 flex flex-col items-center justify-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-green-500/50 transition-all rounded-xl group"
            onClick={() => navigate("/withdraw")}
          >
            <div className="bg-green-500/10 p-3 rounded-full group-hover:bg-green-500/20 transition-colors">
              <ArrowDownCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="font-bold text-gray-200">Sacar</span>
            <span className="text-[10px] text-gray-500">Rápido</span>
          </Button>
        </div>

        {/* 5. TOP JOGADORES (Leaderboard Estendida) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Top Jogadores
            </h3>
            <span className="text-xs text-orange-500 cursor-pointer hover:underline">Ver todos</span>
          </div>

          <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            {topPlayers.map((player, index) => (
              <div 
                key={index} 
                className={`
                  flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors
                  ${index === 0 ? 'bg-yellow-500/5' : ''}
                  ${index === 1 ? 'bg-gray-400/5' : ''}
                  ${index === 2 ? 'bg-orange-700/5' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Ícone de Rank */}
                  <div className="w-8 flex justify-center font-bold">
                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />}
                    {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                    {index === 2 && <Trophy className="h-5 w-5 text-[#cd7f32]" />}
                    {index > 2 && <span className="text-gray-600">#{index + 1}</span>}
                  </div>
                  
                  <Avatar className="h-10 w-10 border border-white/10">
                    <AvatarImage src={player.avatar_url} />
                    <AvatarFallback className="bg-gray-800 text-gray-400 font-bold">
                      {player.nickname?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <p className="font-bold text-sm text-gray-200">{player.nickname || "Jogador"}</p>
                    <p className="text-[10px] text-gray-500">Nível {player.freefire_level || 0}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`block font-bold text-sm ${index < 3 ? 'text-green-400' : 'text-green-600'}`}>
                    R$ {player.saldo?.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            
            {topPlayers.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                Nenhum jogador no ranking ainda.
              </div>
            )}
          </div>
        </div>

        {/* 6. SUAS ESTATÍSTICAS */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-400 uppercase">Suas Estatísticas</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-white/5">
            <div>
              <span className="block text-xl font-black text-white">0</span>
              <span className="text-[10px] text-gray-500 uppercase">Torneios</span>
            </div>
            <div>
              <span className="block text-xl font-black text-green-500">R$ {profile?.saldo?.toFixed(0)}</span>
              <span className="text-[10px] text-gray-500 uppercase">Ganhos</span>
            </div>
            <div>
              <span className="block text-xl font-black text-white">0</span>
              <span className="text-[10px] text-gray-500 uppercase">Vitórias</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

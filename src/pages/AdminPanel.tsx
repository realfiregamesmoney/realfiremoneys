import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, Swords, Trophy, RefreshCw, Activity, Crown,
  Gamepad2, Search, Signal, Clock, TrendingUp, Zap, Filter,
  ChevronUp, ChevronDown, Wifi, BarChart3, RotateCcw, Target, Trash2
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────
interface RoomRow {
  id: string;
  game_type: string;
  status: string;
  current_round: string | null;
  max_players: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  champion_id: string | null;
}

interface MatchRow {
  id: string;
  room_id: string;
  round: string;
  match_index: number;
  status: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar: string;
  wins: number;
  losses: number;
  created_at: string;
}

type SortField = "username" | "wins" | "losses" | "winrate" | "created_at";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────
const statusColor = (s: string) => {
  if (s === "waiting") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (s === "playing") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  return "bg-muted/50 text-muted-foreground border-border";
};

const statusDot = (s: string) => {
  if (s === "playing") return "bg-emerald-400 shadow-[0_0_8px_hsl(var(--neon-glow)/0.6)]";
  if (s === "waiting") return "bg-yellow-400 animate-pulse";
  return "bg-muted-foreground/40";
};

const roundLabel = (r: string | null) => {
  if (!r) return "—";
  const map: Record<string, string> = { quarters: "Quartas", semis: "Semi", final: "Final" };
  return map[r] || r;
};

const gameLabel = (g: string) => {
  const map: Record<string, string> = {
    checkers: "Damas", chess: "Xadrez", domino: "Dominó",
    battleship: "Batalha Naval", uno: "UNO", cacheta: "Cacheta",
  };
  return map[g] || g;
};

const gameIcon = (g: string) => {
  const map: Record<string, string> = {
    checkers: "⚫", chess: "♟️", domino: "🁣",
    battleship: "🚢", uno: "🃏", cacheta: "🂠",
  };
  return map[g] || "🎮";
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// ─── Debounced realtime to avoid flooding ─────────
function useDebouncedCallback(fn: () => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  }, [fn, delay]);
}

// ─── Animated counter ─────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="inline-block"
    >
      {value}
    </motion.span>
  );
}

// ─── Pulse dot ────────────────────────────────────
function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
    </span>
  );
}

// ─── Sort header ──────────────────────────────────
function SortableHead({
  label, field, current, dir, onSort
}: {
  label: string; field: SortField; current: SortField; dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );
}

// ─── Main component ───────────────────────────────
export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("wins");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Check admin role
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" } as any)
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [roomsRes, matchesRes, profilesRes, playersRes] = await Promise.all([
      supabase.from("tournament_rooms").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("tournament_matches").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("tournament_players").select("room_id"),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data as any);
    if (matchesRes.data) setMatches(matchesRes.data as any);
    if (profilesRes.data) setProfiles(profilesRes.data as any);

    if (playersRes.data) {
      const counts: Record<string, number> = {};
      (playersRes.data as any[]).forEach((p) => {
        counts[p.room_id] = (counts[p.room_id] || 0) + 1;
      });
      setPlayerCounts(counts);
    }

    setLoading(false);
    setLastUpdate(Date.now());
  }, []);

  const handleResetRooms = useCallback(async () => {
    setResetting(true);
    try {
      const { error } = await supabase.functions.invoke("reset-rooms");
      if (error) throw error;
      setShowResetConfirm(false);
      await fetchData();
    } catch (err) {
      console.error("Erro ao resetar salas:", err);
    } finally {
      setResetting(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // Debounced realtime — avoids re-fetching on every single row change
  const debouncedFetch = useDebouncedCallback(fetchData, 800);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_rooms" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_players" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, debouncedFetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, debouncedFetch]);

  // ─── Derived data ────────────────────────────────
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const getUsername = useCallback((id: string | null) => {
    if (!id) return "—";
    return profileMap.get(id)?.username || id.slice(0, 8);
  }, [profileMap]);

  const activeRooms = useMemo(() => rooms.filter((r) => r.status !== "finished"), [rooms]);
  const finishedRooms = useMemo(() => rooms.filter((r) => r.status === "finished"), [rooms]);
  const activeMatches = useMemo(() => matches.filter((m) => m.status === "playing"), [matches]);
  const waitingRooms = useMemo(() => rooms.filter((r) => r.status === "waiting"), [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    let list = rooms;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (gameFilter !== "all") list = list.filter((r) => r.game_type === gameFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.id.includes(q) || gameLabel(r.game_type).toLowerCase().includes(q));
    }
    return list;
  }, [rooms, statusFilter, gameFilter, search]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    let list = matches;
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.room_id.includes(q) ||
        getUsername(m.player1_id).toLowerCase().includes(q) ||
        getUsername(m.player2_id).toLowerCase().includes(q)
      );
    }
    return list;
  }, [matches, statusFilter, search, getUsername]);

  // Sorted & filtered profiles
  const sortedProfiles = useMemo(() => {
    let list = [...profiles];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.username.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortField === "username") { va = a.username.toLowerCase(); vb = b.username.toLowerCase(); }
      else if (sortField === "wins") { va = a.wins; vb = b.wins; }
      else if (sortField === "losses") { va = a.losses; vb = b.losses; }
      else if (sortField === "winrate") {
        const ta = a.wins + a.losses; const tb = b.wins + b.losses;
        va = ta > 0 ? a.wins / ta : -1; vb = tb > 0 ? b.wins / tb : -1;
      }
      else { va = a.created_at; vb = b.created_at; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [profiles, search, sortField, sortDir]);

  const handleSort = useCallback((field: SortField) => {
    setSortDir((d) => (sortField === field ? (d === "asc" ? "desc" : "asc") : "desc"));
    setSortField(field);
  }, [sortField]);

  // Game type distribution
  const gameDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    activeRooms.forEach((r) => { map[r.game_type] = (map[r.game_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeRooms]);

  const uniqueGames = useMemo(() => [...new Set(rooms.map((r) => r.game_type))], [rooms]);

  // ─── Chart data: daily players & matches ─────────
  const dailyPlayersData = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const day = new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map[day] = (map[day] || 0) + 1;
    });
    const entries = Object.entries(map);
    // Accumulate
    let acc = 0;
    return entries.map(([day, count]) => {
      acc += count;
      return { day, novos: count, total: acc };
    });
  }, [profiles]);

  const dailyMatchesData = useMemo(() => {
    const map: Record<string, { total: number; finished: number }> = {};
    matches.forEach((m) => {
      const day = new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!map[day]) map[day] = { total: 0, finished: 0 };
      map[day].total += 1;
      if (m.status === "finished") map[day].finished += 1;
    });
    return Object.entries(map).map(([day, v]) => ({ day, partidas: v.total, finalizadas: v.finished }));
  }, [matches]);

  const gameTypeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    rooms.forEach((r) => { map[r.game_type] = (map[r.game_type] || 0) + 1; });
    return Object.entries(map)
      .map(([game, count]) => ({ game: gameLabel(game), count }))
      .sort((a, b) => b.count - a.count);
  }, [rooms]);

  // Win rate by game type
  const winRateByGameData = useMemo(() => {
    // Map room_id -> game_type
    const roomGameMap = new Map(rooms.map((r) => [r.id, r.game_type]));
    // Aggregate wins/total per game
    const gameStats: Record<string, { wins: number; total: number }> = {};
    matches.filter((m) => m.status === "finished" && m.winner_id).forEach((m) => {
      const game = roomGameMap.get(m.room_id);
      if (!game) return;
      if (!gameStats[game]) gameStats[game] = { wins: 0, total: 0 };
      gameStats[game].total += 1;
      gameStats[game].wins += 1; // each finished match has a winner
    });
    // Calc average win rate per player per game
    const playerGameStats: Record<string, Record<string, { wins: number; played: number }>> = {};
    matches.filter((m) => m.status === "finished").forEach((m) => {
      const game = roomGameMap.get(m.room_id);
      if (!game) return;
      [m.player1_id, m.player2_id].forEach((pid) => {
        if (!pid) return;
        if (!playerGameStats[game]) playerGameStats[game] = {};
        if (!playerGameStats[game][pid]) playerGameStats[game][pid] = { wins: 0, played: 0 };
        playerGameStats[game][pid].played += 1;
        if (m.winner_id === pid) playerGameStats[game][pid].wins += 1;
      });
    });
    return Object.entries(playerGameStats)
      .map(([game, players]) => {
        const rates = Object.values(players).map((p) => (p.played > 0 ? (p.wins / p.played) * 100 : 0));
        const avg = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
        const max = rates.length > 0 ? Math.round(Math.max(...rates)) : 0;
        return { game: gameLabel(game), media: avg, melhor: max, jogadores: Object.keys(players).length };
      })
      .sort((a, b) => b.jogadores - a.jogadores);
  }, [matches, rooms]);

  // ─── Loading / denied states ─────────────────────
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-display text-primary text-lg tracking-wider">VERIFICANDO ACESSO</p>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <div className="text-5xl">⛔</div>
          <p className="font-display text-destructive text-2xl tracking-wider">ACESSO NEGADO</p>
          <p className="text-muted-foreground text-sm">Permissão de administrador necessária.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h1 className="font-display text-lg md:text-xl text-foreground tracking-wider">
                PAINEL <span className="text-primary">ADMIN</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span>Realtime ativo</span>
              <span className="text-muted-foreground/40">•</span>
              <Clock className="h-3 w-3" />
              <span>{new Date(lastUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Resetar Salas</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reset confirmation overlay */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => !resetting && setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-display text-foreground tracking-wider">RESETAR TODAS AS SALAS</h3>
                <p className="text-sm text-muted-foreground">
                  Esta ação irá excluir <strong>todas</strong> as salas, partidas, jogadores e jogadas do sistema. Essa ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 w-full mt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleResetRooms}
                    disabled={resetting}
                  >
                    {resetting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Resetando...
                      </>
                    ) : (
                      "Confirmar Reset"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* ── Stats row ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Jogadores" value={profiles.length} color="primary" />
          <StatCard icon={Activity} label="Salas Ativas" value={activeRooms.length} color="emerald" pulse />
          <StatCard icon={Signal} label="Aguardando" value={waitingRooms.length} color="yellow" />
          <StatCard icon={Swords} label="Em Jogo" value={activeMatches.length} color="blue" pulse />
          <StatCard icon={Trophy} label="Finalizados" value={finishedRooms.length} color="purple" />
        </div>

        {/* ── Live game distribution ─────────────────── */}
        {gameDistribution.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Distribuição ao Vivo</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {gameDistribution.map(([game, count]) => (
                  <div key={game} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
                    <span className="text-base">{gameIcon(game)}</span>
                    <span className="text-sm text-foreground font-medium">{gameLabel(game)}</span>
                    <Badge variant="outline" className="text-xs h-5 border-primary/30 text-primary font-display">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Toolbar + Tabs ─────────────────────────── */}
        <Tabs defaultValue="rooms" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <TabsList className="bg-card/80 border border-border h-9">
              <TabsTrigger value="rooms" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary h-7">
                <Gamepad2 className="h-3.5 w-3.5 mr-1" /> Salas
              </TabsTrigger>
              <TabsTrigger value="matches" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary h-7">
                <Swords className="h-3.5 w-3.5 mr-1" /> Partidas
              </TabsTrigger>
              <TabsTrigger value="players" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary h-7">
                <Users className="h-3.5 w-3.5 mr-1" /> Jogadores
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary h-7">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Gráficos
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-card/80 border-border"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2 text-xs rounded-md border border-border bg-card/80 text-foreground"
              >
                <option value="all">Todos status</option>
                <option value="waiting">Aguardando</option>
                <option value="playing">Em Jogo</option>
                <option value="finished">Finalizado</option>
              </select>
              {uniqueGames.length > 1 && (
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-border bg-card/80 text-foreground"
                >
                  <option value="all">Todos jogos</option>
                  {uniqueGames.map((g) => <option key={g} value={g}>{gameLabel(g)}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* ── Rooms ────────────────────────────────── */}
          <TabsContent value="rooms" className="mt-0">
            <Card className="border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <span className="text-sm font-display text-muted-foreground tracking-wider">
                  SALAS <span className="text-foreground font-medium">{filteredRooms.length}</span>
                </span>
              </div>
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Jogo</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Rodada</TableHead>
                      <TableHead className="text-xs">Jogadores</TableHead>
                      <TableHead className="text-xs">Campeão</TableHead>
                      <TableHead className="text-xs">Tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredRooms.map((room) => (
                        <motion.tr
                          key={room.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border/20 transition-colors hover:bg-muted/30"
                        >
                          <TableCell className="w-10 pr-0">
                            <PulseDot active={room.status === "playing"} />
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground">
                            {room.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-sm">
                              <span>{gameIcon(room.game_type)}</span>
                              <span className="text-foreground">{gameLabel(room.game_type)}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColor(room.status)}`}>
                              {room.status === "waiting" ? "AGUARDANDO" : room.status === "playing" ? "EM JOGO" : "FINALIZADO"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{roundLabel(room.current_round)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${((playerCounts[room.id] || 0) / room.max_players) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {playerCounts[room.id] || 0}/{room.max_players}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {room.champion_id ? (
                              <span className="text-primary flex items-center gap-1">
                                <Crown className="h-3 w-3" /> {getUsername(room.champion_id)}
                              </span>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{timeAgo(room.created_at)}</TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredRooms.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                          Nenhuma sala encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ── Matches ──────────────────────────────── */}
          <TabsContent value="matches" className="mt-0">
            <Card className="border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <span className="text-sm font-display text-muted-foreground tracking-wider">
                  PARTIDAS <span className="text-foreground font-medium">{filteredMatches.length}</span>
                </span>
              </div>
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs">Sala</TableHead>
                      <TableHead className="text-xs">Rodada</TableHead>
                      <TableHead className="text-xs">Jogador 1</TableHead>
                      <TableHead className="text-xs text-center">VS</TableHead>
                      <TableHead className="text-xs">Jogador 2</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Vencedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.map((match) => (
                      <TableRow key={match.id} className="border-b border-border/20 hover:bg-muted/30">
                        <TableCell className="w-10 pr-0">
                          <PulseDot active={match.status === "playing"} />
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{match.room_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] h-5 border-border">{roundLabel(match.round)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{getUsername(match.player1_id)}</TableCell>
                        <TableCell className="text-center text-[10px] text-muted-foreground font-display">VS</TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{getUsername(match.player2_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] h-5 ${statusColor(match.status)}`}>
                            {match.status === "waiting" ? "AGUARDANDO" : match.status === "playing" ? "EM JOGO" : "FINALIZADO"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {match.winner_id ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Trophy className="h-3 w-3" /> {getUsername(match.winner_id)}
                            </span>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMatches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-sm">
                          Nenhuma partida encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ── Players ──────────────────────────────── */}
          <TabsContent value="players" className="mt-0">
            <Card className="border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <span className="text-sm font-display text-muted-foreground tracking-wider">
                  JOGADORES <span className="text-foreground font-medium">{sortedProfiles.length}</span>
                </span>
              </div>
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="text-xs w-12">Avatar</TableHead>
                      <SortableHead label="Username" field="username" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Vitórias" field="wins" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Derrotas" field="losses" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Win Rate" field="winrate" current={sortField} dir={sortDir} onSort={handleSort} />
                      <SortableHead label="Cadastro" field="created_at" current={sortField} dir={sortDir} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProfiles.map((p) => {
                      const total = p.wins + p.losses;
                      const wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
                      return (
                        <TableRow key={p.id} className="border-b border-border/20 hover:bg-muted/30">
                          <TableCell className="text-lg">{p.avatar}</TableCell>
                          <TableCell className="font-medium text-foreground">{p.username}</TableCell>
                          <TableCell className="text-emerald-400 font-mono">{p.wins}</TableCell>
                          <TableCell className="text-destructive font-mono">{p.losses}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${wr}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">{wr}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {sortedProfiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-sm">
                          Nenhum jogador encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* ── Charts ───────────────────────────────── */}
          <TabsContent value="charts" className="mt-0 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchData} className="h-8 gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Resetar Gráficos
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Players over time */}
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-foreground tracking-wider">JOGADORES POR DIA</span>
                  </div>
                  {dailyPlayersData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyPlayersData}>
                        <defs>
                          <linearGradient id="gradPlayers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Area type="monotone" dataKey="total" name="Total acumulado" stroke="hsl(var(--primary))" fill="url(#gradPlayers)" strokeWidth={2} />
                        <Area type="monotone" dataKey="novos" name="Novos no dia" stroke="hsl(142, 71%, 45%)" fill="url(#gradNew)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                  )}
                </CardContent>
              </Card>

              {/* Matches over time */}
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Swords className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-foreground tracking-wider">PARTIDAS POR DIA</span>
                  </div>
                  {dailyMatchesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dailyMatchesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="partidas" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Bar dataKey="finalizadas" name="Finalizadas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                  )}
                </CardContent>
              </Card>

              {/* Game popularity */}
              <Card className="border-border/50 bg-card/50 lg:col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-foreground tracking-wider">POPULARIDADE DOS JOGOS</span>
                  </div>
                  {gameTypeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={gameTypeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                        <YAxis dataKey="game" type="category" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={100} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="count" name="Salas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
                  )}
                </CardContent>
              </Card>
              {/* Win rate by game */}
              <Card className="border-border/50 bg-card/50 lg:col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-foreground tracking-wider">WIN RATE MÉDIO POR JOGO</span>
                  </div>
                  {winRateByGameData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={winRateByGameData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="game" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                          formatter={(value: number, name: string) => [`${value}%`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="media" name="Win Rate Médio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                        <Bar dataKey="melhor" name="Melhor Win Rate" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} opacity={0.6} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de partidas finalizadas</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Stat Card component ──────────────────────────
function StatCard({
  icon: Icon, label, value, color, pulse
}: {
  icon: any; label: string; value: number; color: string; pulse?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <Card className={`${c.border} bg-card/50 hover:bg-card/80 transition-colors`}>
      <CardContent className="p-3 md:p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg} relative`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${c.text}`} />
          {pulse && value > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${c.text.replace("text-", "bg-")} animate-ping`} />
          )}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl md:text-2xl font-display text-foreground">
            <AnimatedNumber value={value} />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

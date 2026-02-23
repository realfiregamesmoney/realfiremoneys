import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Swords, Loader2, Link as LinkIcon, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatBattleCard({ battleId }: { battleId: string }) {
    const { profile, isAdmin } = useAuth();
    const [battle, setBattle] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [roomLinkInput, setRoomLinkInput] = useState("");
    const [showBattleModal, setShowBattleModal] = useState(false);

    useEffect(() => {
        const fetchBattle = async () => {
            const { data: b } = await supabase.from('chat_battles').select('*').eq('id', battleId).single();
            if (b) {
                setBattle(b);
                setRoomLinkInput(b.room_link || "");
            }
            const { data: p } = await supabase.from('chat_battle_participants').select('*, user:profiles(nickname, avatar_url)').eq('battle_id', battleId);
            if (p) setParticipants(p);
            setLoading(false);
        };
        fetchBattle();

        const channel = supabase.channel(`battle_${battleId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "chat_battles", filter: `id=eq.${battleId}` }, (payload) => {
                setBattle(payload.new);
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "chat_battle_participants", filter: `battle_id=eq.${battleId}` }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const { data: u } = await supabase.from('profiles').select('nickname, avatar_url').eq('user_id', payload.new.user_id).single();
                    setParticipants(prev => [...prev, { ...payload.new, user: u }]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [battleId]);

    useEffect(() => {
        if (!battle || !profile) return;
        const imIn = participants.some(p => p.user_id === profile.user_id);
        const isFull = participants.length >= battle.max_players_per_team * 2;
        if ((imIn || isAdmin) && isFull) {
            setShowBattleModal(true);
        }
    }, [battle, participants, profile, isAdmin]);

    const handleJoin = async (team: 'left' | 'right') => {
        if (!profile || actionLoading) return;
        setActionLoading(true);

        // Verifica saldo
        const { data: ud } = await supabase.from('profiles').select('saldo').eq('user_id', profile.user_id).single();
        if (!ud || Number(ud.saldo) < Number(battle.entry_fee)) {
            toast.error("Saldo insuficiente para entrar na batalha.");
            setActionLoading(false);
            return;
        }

        // Desconta saldo
        const newSaldo = Number(ud.saldo) - Number(battle.entry_fee);
        await supabase.from('profiles').update({ saldo: newSaldo }).eq('user_id', profile.user_id);

        // Registra transação e participante
        await supabase.from('transactions').insert({ user_id: profile.user_id, type: 'battle_entry', amount: Number(battle.entry_fee), status: 'approved' });

        const { error } = await supabase.from('chat_battle_participants').insert({
            battle_id: battle.id,
            user_id: profile.user_id,
            team: team
        });

        if (error) {
            toast.error("Erro ao entrar na equipe.");
            // Rollback saldo
            await supabase.from('profiles').update({ saldo: ud.saldo }).eq('user_id', profile.user_id);
        } else {
            toast.success("Você entrou na batalha!");
        }
        setActionLoading(false);
    };

    const handleReleaseRoom = async () => {
        if (!roomLinkInput) return toast.error("Insira o link da sala!");
        const { error } = await supabase.from('chat_battles').update({ room_link: roomLinkInput, status: 'active' }).eq('id', battleId);
        if (error) toast.error("Erro ao liberar sala.");
        else toast.success("Sala liberada com sucesso!");
    };

    if (loading) return <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin text-neon-orange" /></div>;
    if (!battle) return null;

    const leftTeam = participants.filter(p => p.team === 'left');
    const rightTeam = participants.filter(p => p.team === 'right');
    const leftFull = leftTeam.length >= battle.max_players_per_team;
    const rightFull = rightTeam.length >= battle.max_players_per_team;
    const imIn = participants.some(p => p.user_id === profile?.user_id);
    const isFull = leftFull && rightFull;

    return (
        <div className="w-full flex justify-center py-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-gradient-to-br from-red-900/30 via-black to-red-900/10 border border-red-500/30 rounded-[2rem] p-4 max-w-[95%] w-[400px] shadow-[0_10px_30px_rgba(255,0,0,0.2)]">

                <div className="text-center mb-4">
                    <Badge className="bg-red-600 font-black uppercase tracking-widest text-[10px] mb-2 animate-pulse">🔥 Batalha Relâmpago {battle.format_type}</Badge>
                    <h3 className="text-white font-black text-lg">Valendo R$ {((Number(battle.entry_fee) * battle.max_players_per_team * 2) * (1 - (battle.platform_tax || 30) / 100)).toFixed(2)}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Entrada: R$ {Number(battle.entry_fee).toFixed(2)}{isAdmin ? ` | Taxa: ${battle.platform_tax || 30}%` : ''}</p>
                </div>

                <div className="flex items-center justify-between gap-2 mb-4">
                    {/* Left Team */}
                    <div className="flex-1 flex flex-col gap-2 items-center bg-white/5 rounded-2xl p-3 border border-white/5">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Time Azul</span>
                        <div className="flex -space-x-2">
                            {Array.from({ length: battle.max_players_per_team }).map((_, i) => (
                                <Avatar key={i} className="h-8 w-8 border-2 border-black bg-zinc-800">
                                    {leftTeam[i] ? <AvatarImage src={leftTeam[i].user.avatar_url} /> : <AvatarFallback><Users size={12} className="text-white/20" /></AvatarFallback>}
                                </Avatar>
                            ))}
                        </div>
                        <Button
                            size="sm"
                            disabled={leftFull || imIn || isFull || actionLoading}
                            onClick={() => handleJoin('left')}
                            className="w-full h-8 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {leftFull ? "Lotado" : "Entrar Lado Azul"}
                        </Button>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0">
                        <Swords className="text-red-500 h-6 w-6" />
                        <span className="text-[12px] font-black text-red-500 italic">VS</span>
                    </div>

                    {/* Right Team */}
                    <div className="flex-1 flex flex-col gap-2 items-center bg-white/5 rounded-2xl p-3 border border-white/5">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Time Vermelho</span>
                        <div className="flex -space-x-2">
                            {Array.from({ length: battle.max_players_per_team }).map((_, i) => (
                                <Avatar key={i} className="h-8 w-8 border-2 border-black bg-zinc-800">
                                    {rightTeam[i] ? <AvatarImage src={rightTeam[i].user.avatar_url} /> : <AvatarFallback><Users size={12} className="text-white/20" /></AvatarFallback>}
                                </Avatar>
                            ))}
                        </div>
                        <Button
                            size="sm"
                            disabled={rightFull || imIn || isFull || actionLoading}
                            onClick={() => handleJoin('right')}
                            className="w-full h-8 text-[10px] font-black uppercase bg-red-600 hover:bg-red-700 text-white"
                        >
                            {rightFull ? "Lotado" : "Entrar Lado Vermelho"}
                        </Button>
                    </div>
                </div>

                {isFull && !showBattleModal && (
                    <Button onClick={() => setShowBattleModal(true)} className="w-full flex items-center justify-center gap-2 bg-neon-green hover:bg-neon-green/90 text-black font-black uppercase tracking-widest text-xs h-10 shadow-[0_0_15px_rgba(0,255,0,0.3)] animate-pulse">
                        <Swords size={16} /> Abrir Sala da Batalha
                    </Button>
                )}

                {/* MODAL DA SALA SEPARADA */}
                {showBattleModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <div className="bg-[#0c0c0c] border border-white/10 rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>

                            <div className="text-center mb-6 mt-4">
                                <h2 className="text-2xl font-black uppercase text-white italic tracking-wider flex items-center justify-center gap-2">
                                    <Shield className="text-red-500" /> Sala de Combate
                                </h2>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">Sala exclusiva {battle.format_type}</p>
                            </div>

                            <div className="bg-black/50 rounded-2xl p-4 mb-6 border border-white/5">
                                {!battle.room_link ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <Loader2 className="h-8 w-8 text-neon-orange animate-spin mb-3" />
                                        <p className="text-white font-bold text-sm">Aguarde...</p>
                                        <p className="text-xs text-gray-500 mt-1">O Admin está liberando a sala do jogo para os {battle.max_players_per_team * 2} jogadores.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in duration-500">
                                        <CheckCircle2 className="h-12 w-12 text-neon-green mb-3 drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]" />
                                        <p className="text-white font-black text-lg uppercase tracking-widest mb-1">Sala Liberada!</p>
                                        <p className="text-xs text-gray-400 mb-4">Aperte o botão abaixo para entrar na partida agora.</p>

                                        <Button
                                            onClick={() => window.open(battle.room_link, "_blank")}
                                            className="w-full h-14 bg-neon-green hover:bg-neon-green/90 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,255,0,0.4)] hover:scale-105 transition-transform"
                                        >
                                            <Swords className="mr-2 h-5 w-5" /> COMEÇAR BATALHA
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6">
                                    <p className="text-[10px] font-black uppercase text-red-400 mb-2">Ação do Admin - Liberar Partida</p>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                            <Input
                                                value={roomLinkInput}
                                                onChange={e => setRoomLinkInput(e.target.value)}
                                                placeholder="Link da Sala no Jogo"
                                                className="pl-9 bg-black border-red-500/30 text-xs"
                                            />
                                        </div>
                                        <Button onClick={handleReleaseRoom} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs">Liberar</Button>
                                    </div>
                                </div>
                            )}

                            <Button onClick={() => setShowBattleModal(false)} variant="outline" className="w-full border-white/5 text-gray-500 hover:text-white font-bold uppercase text-[10px] tracking-widest">
                                Fechar Aba temporariamente
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Lock, Star, MessageSquare, Smile, X, Pin, CheckCheck, Trash2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ChatBattleCard from "@/components/chat/ChatBattleCard";

const ALL_EMOJIS = [
    // Rosto e Emoções
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😭", "😊",
    "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙",
    "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
    "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
    "😖", "😫", "😩", "🥺", "😢", "😤", "😠", "😡", "🤬", "🤯",
    "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔", "🤫",
    "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮",
    "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮",
    "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺",
    "🤡", "💩", "👻", "💀", "👽", "👾", "🤖", "🙈", "🙉", "🙊",

    // Mãos e Corpo
    "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "💪", "👊", "✊",
    "🤛", "🤜", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈",
    "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙",
    "🖕", "✍️", "🙏", "💅", "🤳", "🙋", "🤷", "🤦", "💃", "🕺",

    // Símbolos, Ações, Fogo & Grana
    "💯", "🔥", "🚀", "💰", "💎", "🎮", "🕹️", "🎰", "🎯", "⚡",
    "👑", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "⭐", "🌟", "✨",
    "💥", "✅", "❌", "⚠️", "🛑", "💸", "💳", "💴", "💵", "💶",
    "💷", "🧾", "📈", "📉", "📊", "🚨", "🔔", "📢", "📣", "🔮"
];

export default function GlobalChat({ embedded = false }: { embedded?: boolean }) {
    const { profile, isAdmin } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [reactions, setReactions] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLocked, setIsLocked] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [pinnedMsg, setPinnedMsg] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [openBattleOptions, setOpenBattleOptions] = useState(false);
    const [battleFormat, setBattleFormat] = useState('1x1');
    const [battleFee, setBattleFee] = useState('10');
    const [battleTax, setBattleTax] = useState('30');
    const [battleLink, setBattleLink] = useState('');

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, reactions]);

    useEffect(() => {
        const loadInitData = async () => {
            const { data: config } = await supabase
                .from("notification_settings")
                .select("is_enabled")
                .eq("key_name", "global_chat_locked")
                .maybeSingle();
            if (config) setIsLocked(config.is_enabled);

            const { data: fetchMsgs } = await supabase
                .from("global_chat_messages")
                .select(`*, sender:profiles(nickname, avatar_url)`)
                .order("created_at", { ascending: false })
                .limit(100);

            if (fetchMsgs) setMessages(fetchMsgs.reverse().filter((m: any) => !m.message.startsWith('SYS_CMD_')));

            const { data: fetchReactions } = await supabase
                .from("global_chat_reactions")
                .select("*");
            if (fetchReactions) setReactions(fetchReactions);

            const { data: fetchPinned } = await supabase
                .from("notification_settings")
                .select("label, is_enabled")
                .eq("key_name", "global_chat_pinned_message")
                .maybeSingle();
            if (fetchPinned && fetchPinned.is_enabled) setPinnedMsg(fetchPinned.label);
        };

        if (profile) {
            loadInitData();
        }
    }, [profile]);

    useEffect(() => {
        if (!profile) return;

        const presenceChannel = supabase.channel("chat_presence", {
            config: { presence: { key: profile.user_id } },
        });

        presenceChannel.on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            const count = Object.keys(state).length;
            setOnlineCount(count);
        }).subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await presenceChannel.track({ user: profile.nickname, is_admin: isAdmin });
            }
        });

        const msgsChannel = supabase.channel("realtime_msgs")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_messages" }, async (payload) => {

                // Intercept system commands
                if (payload.new.message === 'SYS_CMD_RELOAD') {
                    setMessages([]);
                    return;
                }
                if (payload.new.message === 'SYS_CMD_UPDATE_PIN') {
                    const { data: fetchPinned } = await supabase.from("notification_settings").select("label, is_enabled").eq("key_name", "global_chat_pinned_message").maybeSingle();
                    if (fetchPinned && fetchPinned.is_enabled) setPinnedMsg(fetchPinned.label);
                    else setPinnedMsg("");
                    return;
                }
                if (payload.new.message === 'SYS_CMD_UPDATE_LOCK') {
                    const { data: config } = await supabase.from("notification_settings").select("is_enabled").eq("key_name", "global_chat_locked").maybeSingle();
                    if (config) setIsLocked(config.is_enabled);
                    return;
                }

                // Normal message
                const { data: sender } = await supabase.from("profiles").select("nickname, avatar_url").eq("user_id", payload.new.sender_id).single();
                const msgWithSender = { ...payload.new, sender };
                setMessages((prev) => [...prev, msgWithSender]);
            })
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "global_chat_messages" }, (payload) => {
                setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
            })
            .subscribe();

        const reactionsChannel = supabase.channel("realtime_reactions")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat_reactions" }, (payload) => {
                setReactions((prev) => [...prev, payload.new]);
            }).subscribe();

        return () => {
            supabase.removeChannel(presenceChannel);
            supabase.removeChannel(msgsChannel);
            supabase.removeChannel(reactionsChannel);
        };
    }, [profile, isAdmin]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !profile) return;
        if (isLocked && !isAdmin) {
            toast.error("O chat está trancado para jogadores.");
            return;
        }
        if (profile.is_chat_banned && !isAdmin) {
            toast.error("Você está banido do chat global.");
            return;
        }

        const currentMsg = newMessage;
        setNewMessage("");
        setShowEmojiPicker(false);

        const { error } = await supabase.from("global_chat_messages").insert({
            sender_id: profile.user_id,
            message: currentMsg,
            is_admin: isAdmin,
        });

        if (error) {
            toast.error("Erro ao enviar mensagem");
            setNewMessage(currentMsg);
            console.error(error);
        }
    };

    const handleGenerateBattle = async () => {
        if (!isAdmin || !profile) return;
        const maxPlayers = parseInt(battleFormat.split('x')[0]);

        const { data: battle, error: bError } = await supabase.from('chat_battles').insert({
            admin_id: profile.user_id,
            format_type: battleFormat,
            max_players_per_team: maxPlayers,
            entry_fee: parseFloat(battleFee),
            platform_tax: parseFloat(battleTax),
            room_link: battleLink.trim() ? battleLink.trim() : null,
            status: 'open'
        }).select().single();

        if (bError) {
            console.error(bError);
            return toast.error("Erro ao criar batalha.");
        }

        await supabase.from('global_chat_messages').insert({
            sender_id: profile.user_id,
            message: `SYS_BATTLE:${battle.id}`,
            is_admin: true
        });

        setOpenBattleOptions(false);
        toast.success("Batalha Lançada no Chat!");
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
    };

    const reactToMessage = async (messageId: string, emoji: string) => {
        if (!profile) return;
        if (profile.is_chat_banned && !isAdmin) {
            toast.error("Você está banido do chat global.");
            return;
        }

        const { error } = await supabase.from("global_chat_reactions").insert({
            message_id: messageId,
            user_id: profile.user_id,
            emoji: emoji,
        });
        if (error && error.code !== '23505') console.error(error);
    };

    const deleteMessage = async (msgId: string) => {
        if (!isAdmin) return;
        const { error } = await supabase.from("global_chat_messages").delete().eq("id", msgId);
        if (error) {
            toast.error("Erro ao apagar mensagem");
            console.error(error);
        }
    };

    const stringToHslColor = (str: string = "") => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const h = hash % 360;
        return `hsl(${h}, 70%, 65%)`;
    };

    return (
        <div className={`flex flex-col relative overflow-hidden bg-[#0a0a0a] ${embedded ? 'h-[600px] w-full rounded-2xl border border-white/10 shadow-2xl' : 'h-[calc(100vh-4rem)] max-w-full mx-auto pb-4'}`}>
            {/* WhatsApp Style Background Pattern Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('https://whatsapp-brand.com/wp-content/themes/whatsapp-br_v2/images/chat-bg-light.png')] bg-repeat"></div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-[#111111]/90 backdrop-blur-md border-b border-white/5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neon-orange/20 rounded-full border border-neon-orange/30">
                        <MessageSquare className="text-neon-orange h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-black text-sm text-white tracking-widest uppercase">Chat Global</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{onlineCount} Jogadores Online</span>
                        </div>
                    </div>
                </div>
                {isAdmin && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500 bg-orange-500/10 text-[10px] uppercase font-black">Admin Mode</Badge>
                )}
            </div>

            {isLocked && (
                <div className="relative z-10 bg-red-500/10 border-b border-red-500/20 py-2 px-4 flex items-center justify-center gap-2">
                    <Lock className="h-3 w-3 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] text-red-400 font-black uppercase tracking-widest">O Administrador trancou o chat temporariamente</span>
                </div>
            )}

            {pinnedMsg && (
                <div className="relative z-10 bg-yellow-500/10 border-b border-yellow-500/20 py-2.5 px-4 flex items-start gap-3 animate-in slide-in-from-top duration-500">
                    <Pin className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-yellow-200 leading-tight">MENSAGEM FIXADA</p>
                        <p className="text-xs text-yellow-100/90 mt-0.5 line-clamp-2">{pinnedMsg}</p>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 scroll-smooth hide-scrollbar flex flex-col gap-4">
                {messages.map((msg, idx) => {
                    // Admin sees all messages (including their own) exactly identical to how players see them
                    const isMe = msg.sender_id === profile?.user_id && !isAdmin;
                    const showHeader = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id || msg.is_admin || messages[idx - 1].is_admin;
                    const msgReactions = reactions.filter(r => r.message_id === msg.id);
                    const reactionCounts = msgReactions.reduce((acc, curr) => {
                        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    const isPriorityAdminMessage = msg.is_admin && msg.message.startsWith('📢 [PRIORIDADE]');
                    if (isPriorityAdminMessage) {
                        return (
                            <div key={msg.id} className="w-full flex justify-center py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-gradient-to-br from-orange-600/30 via-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-4 max-w-[90%] shadow-[0_10px_30px_rgba(255,100,0,0.15)] relative group transition-all hover:scale-[1.01]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1 bg-yellow-500/20 rounded-lg">
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                                        </div>
                                        <span className="font-black text-[11px] uppercase tracking-[0.2em] text-orange-400 drop-shadow-sm">Aviso do Administrador</span>
                                        <span className="text-[9px] text-gray-500/80 font-mono ml-auto bg-black/40 px-2 py-0.5 rounded-full">{format(new Date(msg.created_at), "HH:mm")}</span>
                                        {isAdmin && (
                                            <button onClick={() => deleteMessage(msg.id)} className="text-red-500 hover:text-red-400 p-1 ml-1 bg-black/40 rounded-full transition-colors" title="Apagar Aviso">
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white leading-relaxed mb-4 pl-1">{msg.message}</p>

                                    <div className="flex flex-wrap gap-2">
                                        {['🔥', '👍', '🚀', '💎'].map((emj) => (
                                            <button
                                                key={emj}
                                                onClick={() => reactToMessage(msg.id, emj)}
                                                className="bg-black/60 hover:bg-orange-500/20 text-xs px-3 py-1.5 rounded-full border border-white/5 transition-all flex items-center gap-2 active:scale-90 group/btn"
                                            >
                                                <span className="group-hover/btn:scale-125 transition-transform">{emj}</span>
                                                <span className="font-black text-gray-300 text-[10px]">{reactionCounts[emj] || 0}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (msg.message.startsWith('SYS_BATTLE:')) {
                        const bId = msg.message.replace('SYS_BATTLE:', '').trim();
                        return (
                            <div key={msg.id} className="relative">
                                {isAdmin && (
                                    <button onClick={() => deleteMessage(msg.id)} className="absolute -top-3 right-4 z-50 text-red-500 hover:text-red-400 bg-black/60 border border-red-500/20 rounded-full p-2 transition-transform hover:scale-110" title="Deletar Tela de Batalha">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <ChatBattleCard battleId={bId} />
                            </div>
                        );
                    }

                    const nickColor = stringToHslColor(msg.sender?.nickname || msg.sender_id);
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showHeader ? 'mt-2' : '-mt-2'}`}>
                            <div className={`flex gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isMe && showHeader && (
                                    <Avatar className="h-8 w-8 rounded-full border-2 border-white/5 shrink-0 mt-1 shadow-md">
                                        <AvatarImage src={msg.sender?.avatar_url || ""} />
                                        <AvatarFallback className="bg-gradient-to-br from-gray-800 to-black text-[10px] font-black">{msg.sender?.nickname?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                                    </Avatar>
                                )}
                                {!isMe && !showHeader && <div className="w-8 shrink-0" />}

                                <div className={`relative px-4 py-2.5 rounded-2xl shadow-lg border animate-in fade-in slide-in-from-bottom-1 duration-300 ${isMe ? 'bg-neon-orange/20 border-neon-orange/20 rounded-tr-none' : 'bg-[#1a1a1a] border-white/5 rounded-tl-none'}`}>
                                    {/* Tail effect */}
                                    {showHeader && (
                                        <div className={`absolute top-0 w-2 h-2 ${isMe ? '-right-1.5 bg-neon-orange/20' : '-left-1.5 bg-[#1a1a1a]'} clip-path-triangle`}></div>
                                    )}

                                    {showHeader && msg.is_admin && (
                                        <span className="font-black text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 text-orange-400 drop-shadow-sm">
                                            <Star className="h-3 w-3 fill-orange-400" /> ADMIN REAL FIRE
                                        </span>
                                    )}
                                    {!isMe && showHeader && !msg.is_admin && (
                                        <span className="font-black text-[10px] uppercase tracking-wider mb-1 block drop-shadow-sm text-white">
                                            {msg.sender?.nickname || 'Jogador'}
                                        </span>
                                    )}
                                    <p className="text-[13px] font-medium text-gray-100 break-words leading-relaxed">
                                        {msg.message}
                                    </p>
                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                        {isAdmin && (
                                            <button onClick={() => deleteMessage(msg.id)} className={`text-red-500/50 hover:text-red-400 p-0.5 transition-colors ${isMe ? 'ml-auto' : 'mr-auto'}`} title="Apagar Mensagem">
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                        <span className="text-[9px] font-mono text-white/40 text-right">{format(new Date(msg.created_at), "HH:mm")}</span>
                                        {isMe && <CheckCheck className="h-2.5 w-2.5 text-neon-orange/40" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative z-20 px-4 py-3 bg-[#0c0c0c] border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

                <form onSubmit={sendMessage} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Input
                            disabled={isLocked && !isAdmin}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isLocked && !isAdmin ? "Chat trancado pelo admin..." : "Escreva sua mensagem..."}
                            className="bg-[#1a1a1a] border-white/5 rounded-2xl h-11 pl-4 pr-12 focus-visible:ring-neon-orange/50 transition-all font-medium text-sm placeholder:text-gray-600 focus:bg-[#222]"
                        />
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white transition-colors p-0.5"
                                >
                                    <Smile className="h-5 w-5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full max-w-[320px] bg-[#0c0c0c] border-white/10 p-2 shadow-2xl rounded-2xl" side="top" align="end">
                                <div className="grid grid-cols-8 gap-1 max-h-[220px] overflow-y-auto no-scrollbar">
                                    {ALL_EMOJIS.map(emj => (
                                        <button
                                            key={emj}
                                            onClick={() => { addEmoji(emj); setShowEmojiPicker(false); }}
                                            className="text-2xl hover:bg-white/5 p-1.5 flex items-center justify-center rounded-lg transition-colors"
                                        >
                                            {emj}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button
                        type="submit"
                        disabled={(!newMessage.trim() || (isLocked && !isAdmin))}
                        className="bg-neon-orange hover:bg-orange-600 h-11 w-11 rounded-2xl shadow-[0_0_20px_rgba(255,100,0,0.2)] transition-all active:scale-90 p-0"
                    >
                        <Send className="h-5 w-5 text-white" />
                    </Button>

                    {isAdmin && (
                        <Popover open={openBattleOptions} onOpenChange={setOpenBattleOptions}>
                            <PopoverTrigger asChild>
                                <Button type="button" className="bg-red-600 hover:bg-red-700 h-11 w-11 rounded-2xl p-0 ml-1 shadow-[0_0_15px_rgba(255,0,0,0.4)]">
                                    <Swords className="h-5 w-5 text-white" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 bg-[#0a0a0a] border-white/10 p-4 rounded-3xl z-50 shadow-2xl" side="top" align="end">
                                <h4 className="text-white font-black uppercase text-sm mb-3.5 flex items-center justify-center gap-2">
                                    <Swords size={16} className="text-red-500" /> Batalha Relâmpago
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1.5">Formato</label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {['1x1', '2x2', '3x3', '4x4'].map(f => (
                                                <button key={f} onClick={() => setBattleFormat(f)} className={`py-1.5 text-[10px] font-black rounded-lg transition-colors border ${battleFormat === f ? 'bg-red-600 border-red-500 text-white' : 'bg-transparent border-white/10 text-gray-500'}`}>{f}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1.5">Taxa Plat. (%)</label>
                                            <Input type="number" value={battleTax} onChange={e => setBattleTax(e.target.value)} className="bg-black border-white/10 text-center font-bold text-red-500 h-9" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1.5">Entrada/P (R$)</label>
                                            <Input type="number" value={battleFee} onChange={e => setBattleFee(e.target.value)} className="bg-black border-white/10 text-center font-bold text-neon-green h-9" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-1.5">Link da Sala (Opcional)</label>
                                        <Input type="text" value={battleLink} onChange={e => setBattleLink(e.target.value)} placeholder="https://..." className="bg-black border-white/10 text-center font-bold text-white h-9" />
                                    </div>
                                    <Button onClick={handleGenerateBattle} className="w-full h-10 bg-gradient-to-r from-red-600 to-orange-600 uppercase font-black tracking-widest text-[10px] text-white rounded-xl shadow-[0_0_15px_rgba(255,50,0,0.3)]">
                                        Lançar Batalha no Chat
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </form>
            </div>
        </div>
    );
}

function CheckCheck({ className }: { className?: string }) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M2 13.5L7 18.5L14 9.5" />
            <path d="M12 18.5L22 6.5" />
        </svg>
    );
}

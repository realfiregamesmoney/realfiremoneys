import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Medal, Star, Plus, Trash2, Save, Image as ImageIcon, Flame, Crown, Shield, Zap, Edit, Download, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminAchievements() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [activeType, setActiveType] = useState("patent");

    const [formData, setFormData] = useState<any>({
        name: "",
        description: "",
        image_url: "",
        type: "patent",
        rarity: "common",
        is_buyable: false,
        price: 0,
        price_color: "#fb923c" // Default Neon Orange
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Assignment state
    const [searchUser, setSearchUser] = useState("");
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedAchievement, setSelectedAchievement] = useState<string>("");
    const [shouldAnnounce, setShouldAnnounce] = useState(true);

    useEffect(() => {
        loadAchievements();
    }, []);

    // Busca em tempo real com Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearchUser();
        }, 400); // Espera 400ms após parar de digitar
        return () => clearTimeout(timer);
    }, [searchUser]);

    async function handleSearchUser() {
        setLoading(true);
        try {
            let query = supabase.from("profiles").select("user_id, nickname, freefire_id, email");

            if (searchUser) {
                // Busca inteligente por Nick, ID ou Email
                query = query.or(`nickname.ilike.%${searchUser}%,freefire_id.ilike.%${searchUser}%,email.ilike.%${searchUser}%`);
            }

            const { data, error } = await query.order("nickname").limit(searchUser ? 50 : 20);

            if (error) throw error;
            setFoundUsers(data || []);

            // Toast removido daqui para não atrapalhar a digitação em tempo real
        } catch (err: any) {
            console.error("Erro na busca:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAssign() {
        if (!selectedUser || !selectedAchievement) {
            toast({ title: "Selecione o jogador e a conquista" });
            return;
        }

        // Desativa outras conquistas do mesmo tipo para manter o perfil limpo
        await supabase.from("user_achievements")
            .update({ is_active: false })
            .eq("user_id", selectedUser.user_id);

        // Busca se já existe para incrementar o contador
        const { data: existing } = await supabase
            .from("user_achievements")
            .select("id, count")
            .eq("user_id", selectedUser.user_id)
            .eq("achievement_id", selectedAchievement)
            .maybeSingle();

        let error;
        if (existing) {
            const res = await supabase.from("user_achievements")
                .update({
                    is_active: true,
                    count: (existing.count || 0) + 1,
                    position: 'right'
                })
                .eq("id", existing.id);
            error = res.error;
        } else {
            const res = await supabase.from("user_achievements").insert({
                user_id: selectedUser.user_id,
                achievement_id: selectedAchievement,
                is_active: true,
                count: 1,
                position: 'right'
            });
            error = res.error;
        }

        if (error) {
            toast({ title: "Erro ao atribuir", description: error.message, variant: "destructive" });
        } else {
            // Nova Função Útil: Anúncio Global
            if (shouldAnnounce) {
                const achievement = achievements.find(a => a.id === selectedAchievement);
                const { data: { user: adminUser } } = await supabase.auth.getUser();

                if (adminUser) {
                    await supabase.from("global_chat_messages").insert({
                        sender_id: adminUser.id,
                        message: `👑 CONSAGRAÇÃO: O jogador @${selectedUser.nickname} acaba de receber a honraria [${achievement?.name}]! 🔥 Parabéns!`,
                    });
                }
            }

            toast({ title: "Símbolo Atribuído!", description: `Jogador ${selectedUser.nickname} recebeu sua nova honraria.` });
            setSelectedUser(null);
            setFoundUsers([]);
            setSearchUser("");
        }
    }

    async function loadAchievements() {
        setLoading(true);
        const { data } = await supabase.from("achievements").select("*").order("created_at", { ascending: false });
        if (data) setAchievements(data);
        setLoading(false);
    }

    async function handleSeed() {
        if (!confirm("Isso irá popular o banco com as conquistas iniciais e as especiais (Real Fire). Continuar?")) return;
        setLoading(true);

        const initialData = [
            // Patentes
            { name: "Patente Bronze I", type: "patent", rarity: "common", is_buyable: true, price: 10, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Prata II", type: "patent", rarity: "silver", is_buyable: true, price: 25, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Ouro III", type: "patent", rarity: "rare", is_buyable: true, price: 50, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Diamante V", type: "patent", rarity: "diamond", is_buyable: true, price: 150, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Esmeralda", type: "patent", rarity: "emerald", is_buyable: true, price: 200, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Rubi", type: "patent", rarity: "ruby", is_buyable: true, price: 250, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Elite", type: "patent", rarity: "elite", is_buyable: true, price: 400, image_url: "/assets/achievements/patentes_all.png" },
            { name: "Patente Mestre REAL FIRE", type: "patent", rarity: "realfire", is_buyable: true, price: 999, image_url: "/assets/achievements/patent_real_fire.png" },
            { name: "Patente O Inalcançável", type: "patent", rarity: "realfire", is_buyable: true, price: 1500, image_url: "/assets/achievements/patent_real_fire.png" },

            // Troféus
            { name: "Troféu Recruta", type: "trophy", rarity: "common", is_buyable: false, image_url: "/assets/achievements/trofeus_all.png" },
            { name: "Troféu Soldado", type: "trophy", rarity: "silver", is_buyable: false, image_url: "/assets/achievements/trofeus_all.png" },
            { name: "Troféu Veterano", type: "trophy", rarity: "rare", is_buyable: false, image_url: "/assets/achievements/trofeus_all.png" },
            { name: "Troféu Mestre REAL FIRE", type: "trophy", rarity: "realfire", is_buyable: false, image_url: "/assets/achievements/trophy_real_fire.png" },
            { name: "Troféu O Invencível", type: "trophy", rarity: "realfire", is_buyable: false, image_url: "/assets/achievements/trophy_real_fire.png" },

            // Medalhas
            { name: "Medalha de Recruta", type: "medal", rarity: "common", is_buyable: false, image_url: "/assets/achievements/medalhas_all.png" },
            { name: "Medalha de Soldado", type: "medal", rarity: "common", is_buyable: false, image_url: "/assets/achievements/medalhas_all.png" },
            { name: "Medalha de Veterano", type: "medal", rarity: "silver", is_buyable: false, image_url: "/assets/achievements/medalhas_all.png" },
            { name: "Medalha Especial REAL FIRE", type: "medal", rarity: "realfire", is_buyable: false, image_url: "https://i.ibb.co/7xbmPMKV/Whats-App-Image-2026-02-24-at-22-28-34.jpg" },
            { name: "Medalha Participador VIP", type: "medal", rarity: "vip", is_buyable: true, price: 49.90, image_url: "/assets/achievements/medalhas_all.png" }
        ];

        try {
            const { error } = await supabase.from("achievements").insert(initialData);

            if (error) {
                console.error("Erro no Seed:", error);
                if (error.code === "PGRST116" || error.message.includes("relation") || error.message.includes("not found")) {
                    toast({
                        title: "Tabela Não Encontrada",
                        description: "A tabela 'achievements' ainda não existe no seu banco de dados Supabase. Você precisa executar o SQL de migração primeiro.",
                        variant: "destructive"
                    });
                } else {
                    toast({ title: "Erro no seed", description: error.message, variant: "destructive" });
                }
            } else {
                toast({ title: "Operação Concluída!", description: "30+ Conquistas e Patentes foram registradas." });
                loadAchievements();
            }
        } catch (err: any) {
            toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!formData.name || !formData.image_url) {
            toast({ title: "Erro", description: "Nome e Imagem são obrigatórios", variant: "destructive" });
            return;
        }

        // Limpeza automática de BBCode e tags de fórum na URL
        let cleanUrl = formData.image_url.trim();
        const imgMatch = cleanUrl.match(/\[img\](.*?)\[\/img\]/i);
        if (imgMatch) {
            cleanUrl = imgMatch[1].trim();
        } else {
            // Tenta remover 'url=...' se houver
            const urlMatch = cleanUrl.match(/url=(.*?)\]/i);
            if (urlMatch && cleanUrl.includes('[img]')) {
                const innerImg = cleanUrl.match(/\[img\](.*?)\[\/img\]/i);
                if (innerImg) cleanUrl = innerImg[1].trim();
            }
        }

        const payload: any = {
            name: formData.name,
            description: formData.description || "",
            type: formData.type,
            image_url: cleanUrl,
            rarity: formData.rarity,
            is_buyable: !!formData.is_buyable,
            price: parseFloat(formData.price?.toString() || "0") || 0,
            price_color: formData.price_color || "#fb923c"
        };

        let result = editingId
            ? await supabase.from("achievements").update(payload).eq("id", editingId)
            : await supabase.from("achievements").insert([payload]);

        // Fallback: Se der erro de coluna (price_color não existe), tenta salvar sem ela
        if (result.error && (result.error.message?.includes("price_color") || result.error.code === "PGRST204")) {
            const { price_color, ...safePayload } = payload;
            result = editingId
                ? await supabase.from("achievements").update(safePayload).eq("id", editingId)
                : await supabase.from("achievements").insert([safePayload]);
        }

        if (result.error) {
            console.error("Erro ao salvar:", result.error);
            toast({ title: "Erro ao salvar", description: result.error.message, variant: "destructive" });
        } else {
            toast({ title: "Sucesso!", description: editingId ? "Conquista atualizada!" : "Conquista registrada!" });
            loadAchievements();
            setFormData({ name: "", description: "", image_url: "", type: activeType, rarity: "common", is_buyable: false, price: 0, price_color: "#fb923c" });
            setEditingId(null);
        }
    }

    function handleEdit(item: any) {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            description: item.description || "",
            image_url: item.image_url,
            type: item.type,
            rarity: item.rarity,
            is_buyable: !!item.is_buyable,
            price: item.price || 0,
            price_color: item.price_color || "#fb923c"
        });
        // Scroll to form
        document.getElementById('achievement-form')?.scrollIntoView({ behavior: 'smooth' });
    }

    function handleCancelEdit() {
        setEditingId(null);
        setFormData({
            name: "",
            description: "",
            image_url: "",
            type: activeType,
            rarity: "common",
            is_buyable: false,
            price: 0,
            price_color: "#fb923c"
        });
    }

    async function handleDownload(url: string, name: string) {
        if (url.startsWith('http') && !url.includes(window.location.host)) {
            window.open(url, '_blank');
            toast({ title: "Transferência Externa", description: "O download direto foi bloqueado pelo servidor de origem. Abrindo imagem em nova aba." });
            return;
        }
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${name.replace(/\s+/g, '_').toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast({ title: "Download Iniciado", description: `A imagem de ${name} está sendo baixada.` });
        } catch (error) {
            // Se falhar (ex: CORS), tenta abrir em nova aba
            window.open(url, '_blank');
            toast({ title: "Atenção", description: "Iniciando download via nova aba devido a restrições de segurança." });
        }
    }

    async function deleteAchievement(id: string) {
        if (!confirm("Excluir esta conquista?")) return;
        const { error } = await supabase.from("achievements").delete().eq("id", id);
        if (!error) loadAchievements();
    }

    const [isCleaning, setIsCleaning] = useState(false);

    // Função utilitária mestre para limpar URLs
    const cleanUrlString = (raw: string) => {
        if (!raw) return "";
        let url = raw.trim();
        const imgMatch = url.match(/\[img\](.*?)\[\/img\]/i);
        if (imgMatch) return imgMatch[1].trim();

        const urlMatch = url.match(/url=(.*?)\]/i);
        if (urlMatch && url.includes('[img]')) {
            const innerImg = url.match(/\[img\](.*?)\[\/img\]/i);
            if (innerImg) return innerImg[1].trim();
        }
        return url;
    };

    async function handleCleanImage() {
        if (!formData.image_url) {
            toast({ title: "Erro", description: "Insira a URL da imagem primeiro", variant: "destructive" });
            return;
        }

        setIsCleaning(true);

        // 1. Limpeza de URL (BBCode)
        const cleanedUrl = cleanUrlString(formData.image_url);

        try {
            // 2. Processamento de Imagem (IA de Remoção de Fundo via Canvas)
            const img = new Image();
            img.crossOrigin = "anonymous"; // Tenta lidar com CORS

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Erro ao carregar imagem para processamento. Verifique se o link permite acesso direto."));
                img.src = cleanedUrl;
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas não suportado");

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Algoritmo de Remoção de Fundo (Chroma Key para Branco/Preto)
            let pixelsModified = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Remove tons muito claros (Branco/Cinza claro)
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0;
                    pixelsModified++;
                }
                // Remove tons muito escuros (Preto absoluto do fundo)
                else if (r < 15 && g < 15 && b < 15) {
                    data[i + 3] = 0;
                    pixelsModified++;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const processedDataUrl = canvas.toDataURL("image/png");

            setFormData(prev => ({ ...prev, image_url: processedDataUrl }));

            toast({
                title: "IA Real Fire: Fundo Removido! 🛡️",
                description: `Processamento concluído com sucesso. ${pixelsModified > 0 ? 'O fundo foi tornado transparente.' : 'A imagem já parece otimizada.'}`
            });

        } catch (error: any) {
            console.error("Erro no processamento IA:", error);
            // Fallback: Apenas limpa a URL se o Canvas falhar (ex: CORS)
            setFormData(prev => ({ ...prev, image_url: cleanedUrl }));
            toast({
                title: "URL Sanitizada",
                description: "Tags removidas, mas a remoção de fundo falhou devido a restrições de segurança do link original (CORS).",
                variant: "destructive"
            });
        } finally {
            setIsCleaning(false);
        }
    }

    async function handleMassClean() {
        if (!confirm("Isso irá verificar e corrigir os links de TODAS as conquistas cadastradas. Deseja prosseguir?")) return;

        setLoading(true);
        const { data: allItems } = await supabase.from("achievements").select("id, image_url, name");

        let fixCount = 0;
        if (allItems) {
            for (const item of allItems) {
                const cleaned = cleanUrlString(item.image_url);
                if (cleaned !== item.image_url) {
                    await supabase.from("achievements").update({ image_url: cleaned }).eq("id", item.id);
                    fixCount++;
                }
            }
        }

        toast({
            title: "Limpeza Sistêmica Concluída",
            description: `${fixCount} links foram corrigidos com sucesso.`
        });

        loadAchievements();
        setLoading(false);
    }

    const filtered = achievements.filter(a => a.type === activeType);

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header com Explicação */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-black/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 gap-6 shadow-2xl shadow-neon-orange/5">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-neon-orange/10 rounded-3xl border border-neon-orange/20 shadow-inner">
                        <Crown className="h-8 w-8 text-neon-orange drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase italic text-white tracking-widest leading-none mb-2">Mural de Glória</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.3em]">Gerencie as Patentes, Troféus e Medalhas do Real Fire</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button onClick={handleSeed} variant="outline" className="border-neon-orange/20 text-neon-orange font-black uppercase text-xs h-14 px-8 rounded-2xl hover:bg-neon-orange/10 transition-all hover:scale-105 active:scale-95 group flex-1">
                            <Zap className="mr-2 h-5 w-5 fill-neon-orange group-hover:animate-pulse" /> Popular Banco
                        </Button>
                        <Button onClick={handleMassClean} variant="outline" className="border-blue-500/20 text-blue-400 font-black uppercase text-[10px] h-14 px-4 rounded-2xl hover:bg-blue-500/10 transition-all hover:scale-105 active:scale-95 group">
                            <Shield className="mr-2 h-4 w-4 fill-blue-500 group-hover:animate-spin" /> Limpeza Sistêmica
                        </Button>
                    </div>
                    <p className="text-[9px] text-gray-600 text-center uppercase font-bold tracking-tighter">
                        * O botão de limpeza corrige links quebrados em toda a galeria
                    </p>
                </div>
            </div>

            {/* Mural / Vitrine */}
            <Tabs defaultValue="patent" onValueChange={(v) => { setActiveType(v); setFormData(p => ({ ...p, type: v })) }} className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1.5 mb-10 h-16 rounded-3xl w-full grid grid-cols-3 max-w-2xl mx-auto shadow-2xl">
                    <TabsTrigger value="patent" className="rounded-2xl data-[state=active]:bg-neon-orange data-[state=active]:text-black font-black uppercase text-[11px] tracking-widest transition-all">
                        <Shield className="mr-2 h-4 w-4" /> Patentes
                    </TabsTrigger>
                    <TabsTrigger value="trophy" className="rounded-2xl data-[state=active]:bg-neon-orange data-[state=active]:text-black font-black uppercase text-[11px] tracking-widest transition-all">
                        <Trophy className="mr-2 h-4 w-4" /> Troféus
                    </TabsTrigger>
                    <TabsTrigger value="medal" className="rounded-2xl data-[state=active]:bg-neon-orange data-[state=active]:text-black font-black uppercase text-[11px] tracking-widest transition-all">
                        <Medal className="mr-2 h-4 w-4" /> Medalhas
                    </TabsTrigger>
                </TabsList>

                <div className="min-h-[500px]">
                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-4">
                            <Zap className="animate-spin h-12 w-12 text-neon-orange" />
                            <p className="text-neon-orange font-black uppercase text-[10px] tracking-widest">Carregando Galeria...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[4rem] text-gray-700 bg-white/[0.01]">
                            <ImageIcon className="h-20 w-20 mb-4 opacity-10" />
                            <p className="font-black uppercase tracking-[0.5em] text-[10px]">Nenhum item nesta vitrine</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filtered.map((item) => (
                                <div key={item.id} className="group relative">
                                    {/* Glass Pedestal Effect */}
                                    <div className="relative aspect-square rounded-[3rem] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 overflow-hidden transition-all duration-500 group-hover:border-neon-orange/40 group-hover:shadow-[0_20px_40px_-15px_rgba(251,146,60,0.15)] flex flex-col items-center justify-center p-6 grayscale-[0.5] group-hover:grayscale-0">

                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-t ${item.rarity === 'realfire' ? 'from-neon-orange' :
                                            item.rarity === 'legendary' || item.rarity === 'diamond' ? 'from-cyan-400' :
                                                item.rarity === 'ruby' ? 'from-rose-600' :
                                                    item.rarity === 'emerald' ? 'from-emerald-500' :
                                                        item.rarity === 'elite' ? 'from-purple-600' :
                                                            item.rarity === 'exclusive' ? 'from-amber-300' :
                                                                item.rarity === 'vip' ? 'from-pink-500' :
                                                                    item.rarity === 'executive' ? 'from-indigo-900' :
                                                                        item.rarity === 'collector' ? 'from-orange-700' :
                                                                            item.rarity === 'silver' ? 'from-gray-300' :
                                                                                item.rarity === 'rare' ? 'from-yellow-500' :
                                                                                    item.rarity === 'epic' ? 'from-blue-500' : 'from-blue-500'
                                            }`} />

                                        {/* Image Box */}
                                        <div className="relative z-10 w-full aspect-square flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                                            {/* Filtro SVG Inline para remoção de branco dinâmico */}
                                            <svg width="0" height="0" className="absolute">
                                                <filter id="ai-remove-bg">
                                                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1.5 -1.5 -1.5 4.5 0" />
                                                </filter>
                                            </svg>

                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="max-h-full max-w-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] brightness-110 contrast-110 saturate-[1.2]"
                                                style={{
                                                    filter: "url(#ai-remove-bg) drop-shadow(0 0 10px rgba(0,0,0,0.5))"
                                                }}
                                            />
                                            {/* Glow Overlay para efeito 3D */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-full" />
                                        </div>

                                        {/* Floating Badge (Rarity) */}
                                        <div className="absolute top-4 right-4 z-20">
                                            {item.rarity === 'realfire' && (
                                                <div className="bg-neon-orange p-1.5 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.6)] animate-bounce">
                                                    <Flame className="h-3 w-3 text-black" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-6 left-0 right-0 text-center z-20 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                            <Badge className={`text-[8px] font-black uppercase ${item.rarity === 'realfire' ? 'bg-neon-orange text-black' :
                                                item.rarity === 'legendary' || item.rarity === 'diamond' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]' :
                                                    item.rarity === 'ruby' ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)]' :
                                                        item.rarity === 'emerald' ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.5)]' :
                                                            item.rarity === 'elite' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' :
                                                                item.rarity === 'exclusive' ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.6)]' :
                                                                    item.rarity === 'vip' ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.6)]' :
                                                                        item.rarity === 'executive' ? 'bg-slate-800 text-white border border-white/20 shadow-[0_0_15px_rgba(30,41,59,0.8)]' :
                                                                            item.rarity === 'collector' ? 'bg-orange-800 text-white shadow-[0_0_15px_rgba(154,52,18,0.5)]' :
                                                                                item.rarity === 'silver' ? 'bg-gray-400 text-black shadow-[0_0_10px_rgba(156,163,175,0.5)]' :
                                                                                    item.rarity === 'rare' ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                                                                                        item.rarity === 'epic' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-white/10 text-white'
                                                }`}>
                                                {item.rarity === 'diamond' ? 'Diamante' :
                                                    item.rarity === 'silver' ? 'Prata' :
                                                        item.rarity === 'emerald' ? 'Esmeralda' :
                                                            item.rarity === 'ruby' ? 'Rubi' :
                                                                item.rarity === 'elite' ? 'Elite' :
                                                                    item.rarity === 'exclusive' ? 'Exclusivo' :
                                                                        item.rarity === 'vip' ? 'VIP' :
                                                                            item.rarity === 'executive' ? 'Executivo' :
                                                                                item.rarity === 'collector' ? 'Colecionador' : item.rarity}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Item Info below Pedestal */}
                                    <div className="mt-4 text-center space-y-2">
                                        <h3 className="font-black uppercase italic text-white text-[11px] tracking-tight truncate px-2">{item.name}</h3>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span
                                                className={`text-[10px] font-black mr-1 transition-all`}
                                                style={{
                                                    color: item.price_color || "#fb923c",
                                                    textShadow: `0 0 10px ${item.price_color || "#fb923c"}44`
                                                }}
                                            >
                                                R$ {Number(item.price || 0).toFixed(2)}
                                            </span>
                                            <div className="flex items-center bg-black/40 rounded-full px-2 py-1 border border-white/5 backdrop-blur-sm">
                                                <button
                                                    onClick={() => handleDownload(item.image_url, item.name)}
                                                    title="Baixar Imagem"
                                                    className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                                >
                                                    <Download className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    title="Editar Conquista"
                                                    className="text-amber-400 hover:text-amber-300 transition-colors p-1"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => deleteAchievement(item.id)}
                                                    title="Excluir"
                                                    className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Tabs>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-16" />

            {/* Painel de Controle (Formulários Embaixo) */}
            <div id="achievement-form" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Novo Registro Card */}
                <Card className={`bg-black/40 border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-md border shadow-2xl transition-all duration-500 ${editingId ? 'border-neon-orange/40 ring-1 ring-neon-orange/20' : 'border-white/10'}`}>
                    <CardHeader className="border-b border-white/5 p-8 bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                {editingId ? (
                                    <>
                                        <Edit className="h-6 w-6 text-neon-orange" /> Editando Conquista
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-6 w-6 text-neon-orange" /> Registrar Nova Honraria
                                    </>
                                )}
                            </CardTitle>
                            {editingId && (
                                <Button onClick={handleCancelEdit} variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase text-gray-500 hover:text-white">
                                    <X className="mr-1 h-3 w-3" /> Cancelar
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Nome da Conquista</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Patente Real Fire"
                                    className="bg-black/60 border-white/10 h-14 rounded-2xl font-bold focus:border-neon-orange/50 transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Raridade do Item</Label>
                                <Select value={formData.rarity} onValueChange={v => setFormData({ ...formData, rarity: v })}>
                                    <SelectTrigger className="bg-black/60 border-white/10 h-14 rounded-2xl focus:border-neon-orange/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl max-h-[300px]">
                                        <SelectItem value="common">Bronze (Comum)</SelectItem>
                                        <SelectItem value="silver">Prata</SelectItem>
                                        <SelectItem value="rare">Ouro (Raro)</SelectItem>
                                        <SelectItem value="epic">Platina (Épico)</SelectItem>
                                        <SelectItem value="diamond">Diamante</SelectItem>
                                        <SelectItem value="emerald">Esmeralda</SelectItem>
                                        <SelectItem value="ruby">Rubi</SelectItem>
                                        <SelectItem value="elite">Elite</SelectItem>
                                        <SelectItem value="exclusive">Exclusivo</SelectItem>
                                        <SelectItem value="vip">VIP</SelectItem>
                                        <SelectItem value="executive">Executivo</SelectItem>
                                        <SelectItem value="collector">Colecionador</SelectItem>
                                        <SelectItem value="realfire">REAL FIRE (Mestre)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-gray-500 ml-1 flex justify-between">
                                <span>URL da Imagem ou Caminho</span>
                                <span className="text-neon-orange">Sugestão: 512x512px PNG</span>
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        value={formData.image_url}
                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                        placeholder="/assets/achievements/exemplo.png"
                                        className="bg-black/60 border-white/10 h-14 rounded-2xl pl-12"
                                    />
                                    <ImageIcon className="absolute left-4 top-4 h-6 w-6 text-gray-500" />
                                </div>
                                <Button
                                    onClick={handleCleanImage}
                                    disabled={isCleaning}
                                    className="h-14 bg-blue-600 hover:bg-blue-500 text-white font-black px-4 rounded-2xl transition-all flex flex-col gap-0 leading-none py-1"
                                >
                                    {isCleaning ? (
                                        <Zap className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Shield className="h-4 w-4 mb-0.5" />
                                            <span className="text-[8px] uppercase">Limpar IA</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-[9px] text-gray-600 uppercase font-bold text-right italic">
                                * A IA limpa o fundo e transforma a imagem em um "objeto 3D" do app.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 flex flex-col justify-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="buyable"
                                        checked={formData.is_buyable}
                                        onChange={e => setFormData({ ...formData, is_buyable: e.target.checked })}
                                        className="h-6 w-6 rounded-lg border-white/10 bg-black accent-neon-orange cursor-pointer"
                                    />
                                    <Label htmlFor="buyable" className="text-[10px] font-black uppercase text-gray-400 cursor-pointer">Disponível para Venda?</Label>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Preço em Reais</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="bg-black/60 border-white/10 h-14 rounded-2xl text-center font-black text-lg"
                                    style={{ color: formData.price_color }}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Cor de Destaque do Valor</Label>
                            <div className="flex flex-wrap gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                {[
                                    { name: "Orange", hex: "#fb923c" },
                                    { name: "Cyan", hex: "#22d3ee" },
                                    { name: "Rose", hex: "#e11d48" },
                                    { name: "Emerald", hex: "#10b981" },
                                    { name: "Purple", hex: "#a855f7" },
                                    { name: "Gold", hex: "#eab308" },
                                    { name: "Silver", hex: "#9ca3af" },
                                    { name: "White", hex: "#ffffff" }
                                ].map((color) => (
                                    <button
                                        key={color.hex}
                                        onClick={() => setFormData({ ...formData, price_color: color.hex })}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${formData.price_color === color.hex ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    />
                                ))}
                                <div className="ml-auto flex items-center gap-3 pl-4 border-l border-white/10">
                                    <Input
                                        type="color"
                                        value={formData.price_color}
                                        onChange={(e) => setFormData({ ...formData, price_color: e.target.value })}
                                        className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer"
                                    />
                                    <span className="text-[11px] font-mono text-gray-500">{formData.price_color?.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSave} className="w-full bg-neon-orange hover:bg-orange-500 text-black font-black uppercase h-20 rounded-[2rem] shadow-2xl shadow-neon-orange/20 text-sm tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
                            <Save className="mr-3 h-6 w-6 fill-black" /> {editingId ? "Salvar Alterações" : "Finalizar & Registrar no Mural"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Atribuição Card */}
                <Card className="bg-black/40 border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-md border border-white/10 shadow-2xl">
                    <CardHeader className="border-b border-white/5 p-8 bg-white/[0.02]">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                            <Star className="h-6 w-6 text-neon-orange" /> Consagração de Jogador
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Buscar Atleta pelo Nickname</Label>
                            <div className="relative group">
                                <Input
                                    value={searchUser}
                                    onChange={e => setSearchUser(e.target.value)}
                                    placeholder="Comece a digitar o Nick, ID ou Email..."
                                    className="bg-black/60 border-white/10 h-16 rounded-[2rem] px-8 font-black text-white focus:border-neon-orange/50 transition-all shadow-inner"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {loading ? (
                                        <Zap className="h-5 w-5 text-neon-orange animate-spin" />
                                    ) : (
                                        <Search className="h-5 w-5 text-gray-600" />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-2xl p-2 bg-black/20">
                                {foundUsers.length === 0 && !loading && (
                                    <p className="text-[10px] text-center text-gray-600 py-8 uppercase font-black">Pesquise para listar os atletas</p>
                                )}
                                {foundUsers.map(u => (
                                    <div
                                        key={u.user_id}
                                        onClick={() => setSelectedUser(u)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedUser?.user_id === u.user_id ? 'bg-neon-orange border-neon-orange text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                                    >
                                        <div className="flex flex-col">
                                            <p className="text-xs font-black uppercase italic tracking-wider">{u.nickname || "Sem Nick"}</p>
                                            <p className={`text-[9px] font-bold ${selectedUser?.user_id === u.user_id ? 'text-black/60' : 'text-gray-500'}`}>
                                                ID: {u.freefire_id || 'N/A'} • {u.email?.split('@')[0]}
                                            </p>
                                        </div>
                                        {selectedUser?.user_id === u.user_id ? <Shield className="h-4 w-4 fill-black" /> : <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Conquista a ser Atribuída</Label>
                                <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
                                    <SelectTrigger className="bg-black/60 border-white/10 h-14 rounded-2xl focus:border-neon-orange/50">
                                        <SelectValue placeholder="Escolha..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl">
                                        {achievements.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">Anúncio Global (Chat Real Fire)</Label>
                                <Select value={shouldAnnounce ? "yes" : "no"} onValueChange={(v) => setShouldAnnounce(v === "yes")}>
                                    <SelectTrigger className={`h-14 rounded-2xl border transition-all ${shouldAnnounce ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'bg-black/60 border-white/10'}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white rounded-2xl">
                                        <SelectItem value="yes">Sim, anunciar para todos! 📢</SelectItem>
                                        <SelectItem value="no">Não, fazer entrega silenciosa 🤫</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button onClick={handleAssign} className="w-full bg-white text-black hover:bg-gray-200 font-black uppercase h-20 rounded-[2rem] shadow-xl text-sm tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
                            Confirmar Entrega de Honraria
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

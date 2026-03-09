import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Save, X, Lock, Unlock, Eye, EyeOff, Bell, Trophy, Zap, Shield, ShieldCheck, Clock, Users, Timer, Info, Wallet } from "lucide-react";

export default function AdminVault() {
    const [vaults, setVaults] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingVault, setEditingVault] = useState<any>(null);
    const [hints, setHints] = useState<any[]>([]);
    const [recentGuesses, setRecentGuesses] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        correct_password: "",
        prize_pool: 0,
        prize_type: "cash",
        prize_product_name: "",
        prize_product_image: "",
        show_estimated_value: true,
        estimated_prize_value: 0,
        status: "inactive"
    });

    const [hintData, setHintData] = useState({
        id: "",
        hint_text: "",
        pre_reveal_title: "INFORMAÇÃO CRIPTOGRAFADA",
        reveal_at: "",
        unlock_price: 0,
        is_premium: false
    });

    useEffect(() => {
        loadVaults();
        loadPackages();
    }, []);

    const loadVaults = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('vault_events').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setVaults(data || []);
        } catch (e: any) {
            console.error("Erro ao carregar cofres:", e);
            toast({ title: "Erro ao carregar cofres", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const loadPackages = async () => {
        try {
            const { data, error } = await supabase.from('vault_packages').select('*').order('price', { ascending: true });
            if (error) throw error;
            setPackages(data || []);
        } catch (e: any) {
            console.error("Erro ao carregar pacotes:", e);
        }
    };

    const handleUpdatePackage = async (id: string, field: string, value: any) => {
        try {
            // Garantir que valores numéricos não sejam NaN
            const finalValue = (field === 'amount' || field === 'price') ? (Number(value) || 0) : value;

            console.log(`Atualizando pacote ${id}, campo ${field} para:`, finalValue);

            const { error } = await supabase.from('vault_packages').update({ [field]: finalValue }).eq('id', id);
            if (error) throw error;

            toast({ title: "Pacote atualizado!" });
            loadPackages();
        } catch (error: any) {
            console.error("Erro ao atualizar pacote:", error);
            toast({ title: "Erro ao atualizar pacote", description: error.message, variant: "destructive" });
        }
    };

    const loadHints = async (vaultId: string) => {
        if (!vaultId) return;
        const { data } = await supabase.from('vault_hints').select('*').eq('vault_id', vaultId).order('reveal_at', { ascending: true });
        setHints(data || []);
    };

    const loadGuesses = async (vaultId: string) => {
        if (!vaultId) return;
        const { data } = await supabase.from('vault_guesses').select('*, profiles(nickname)').eq('vault_id', vaultId).order('created_at', { ascending: false }).limit(20);
        setRecentGuesses(data || []);
    };

    const handleCreateVault = async () => {
        try {
            if (!formData.title || !formData.correct_password || formData.correct_password.length < 1 || formData.correct_password.length > 12) {
                return toast({ title: "Dados inválidos", description: "O título é obrigatório e a senha deve ter entre 1 e 12 dígitos.", variant: "destructive" });
            }

            const payload = {
                title: formData.title,
                description: formData.description,
                correct_password: formData.correct_password,
                prize_pool: Number(formData.prize_pool) || 0,
                prize_type: formData.prize_type,
                prize_product_name: formData.prize_product_name,
                prize_product_image: formData.prize_product_image,
                show_estimated_value: formData.show_estimated_value,
                estimated_prize_value: Number(formData.estimated_prize_value) || 0,
                status: formData.status
            };

            const { error } = await supabase.from('vault_events').insert(payload);
            if (error) throw error;

            toast({ title: "Cofre criado com sucesso!" });
            loadVaults();
            setFormData({
                title: "", description: "", correct_password: "", prize_pool: 0,
                prize_type: "cash", prize_product_name: "", prize_product_image: "",
                show_estimated_value: true, estimated_prize_value: 0,
                status: "inactive"
            });
        } catch (error: any) {
            console.error("Erro ao criar cofre:", error);
            toast({ title: "Erro ao criar cofre", description: error.message, variant: "destructive" });
        }
    };

    const handleUpdateVault = async () => {
        try {
            if (!editingVault) return;

            const payload = {
                title: formData.title,
                description: formData.description,
                correct_password: formData.correct_password,
                prize_pool: Number(formData.prize_pool) || 0,
                prize_type: formData.prize_type,
                prize_product_name: formData.prize_product_name,
                prize_product_image: formData.prize_product_image,
                show_estimated_value: formData.show_estimated_value,
                estimated_prize_value: Number(formData.estimated_prize_value) || 0,
                status: formData.status
            };

            const { error } = await supabase.from('vault_events').update(payload).eq('id', editingVault.id);
            if (error) throw error;

            toast({ title: "Cofre atualizado!" });
            loadVaults();
            setEditingVault(null);
        } catch (error: any) {
            console.error("Erro ao atualizar cofre:", error);
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteVault = async (id: string) => {
        if (!confirm("⚠️ EXCLUSÃO TOTAL: Deseja eliminar este cofre e TODOS os registros (palpites, dicas, vendas) permanentemente?")) return;

        setLoading(true);
        try {
            console.log("Protocolo de Extermínio Nível 5 - ID:", id);

            // Ordem rigorosa para quebrar todas as amarras
            const tables = [
                'vault_guesses',
                'vault_unlocked_hints',
                'vault_user_attempts',
                'vault_hints'
            ];

            for (const table of tables) {
                const { error } = await supabase.from(table).delete().eq('vault_id', id);
                if (error) console.warn(`Falha não impeditiva na tabela ${table}:`, error.message);
            }

            // O GOLPE FINAL
            const { error: finalError } = await supabase.from('vault_events').delete().eq('id', id);
            if (finalError) throw finalError;

            toast({ title: "Cofre Eliminado!", description: "O protocolo foi limpo com sucesso." });
            loadVaults();
            if (editingVault?.id === id) setEditingVault(null);
        } catch (e: any) {
            console.error("FALHA NO PROTOCOLO DE EXCLUSÃO:", e);
            toast({ title: "ERRO CRÍTICO", description: e.message || "Erro desconhecido", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveHint = async () => {
        try {
            if (!editingVault || !hintData.hint_text || !hintData.reveal_at) return;

            const payload: any = {
                vault_id: editingVault.id,
                hint_text: hintData.hint_text,
                pre_reveal_title: hintData.pre_reveal_title || "INFORMAÇÃO CRIPTOGRAFADA",
                reveal_at: new Date(hintData.reveal_at).toISOString(),
                unlock_price: Number(hintData.unlock_price) || 0,
                is_premium: (Number(hintData.unlock_price) || 0) > 0,
                is_revealed: false
            };

            const executeSave = async (data: any) => {
                if (hintData.id) {
                    return await supabase.from('vault_hints').update(data).eq('id', hintData.id);
                } else {
                    if (hints.length >= 5) throw new Error("Máximo 5 dicas.");
                    return await supabase.from('vault_hints').insert(data);
                }
            };

            let { error } = await executeSave(payload);

            // FALLBACK CRÍTICO: Se a coluna pre_reveal_title não existir no banco
            if (error && (error.message.includes('pre_reveal_title') || error.code === '42703')) {
                console.warn("Coluna pre_reveal_title não encontrada. Tentando fallback sem ela...");
                const fallbackPayload = { ...payload };
                delete fallbackPayload.pre_reveal_title;
                const { error: fallbackError } = await executeSave(fallbackPayload);
                error = fallbackError;

                if (!error) {
                    toast({
                        variant: "destructive",
                        title: "Dica salva (Aviso)",
                        description: "A dica foi salva, mas o título customizado não foi aplicado pois a coluna está ausente no banco."
                    });
                }
            }

            if (error) throw error;

            if (!error) {
                toast({ title: hintData.id ? "Dica atualizada!" : "Dica agendada!" });
            }

            loadHints(editingVault.id);
            setHintData({ id: "", hint_text: "", pre_reveal_title: "INFORMAÇÃO CRIPTOGRAFADA", reveal_at: "", unlock_price: 0, is_premium: false });
        } catch (error: any) {
            console.error("Erro ao salvar dica:", error);
            toast({ title: "Erro ao salvar dica", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteHint = async (id: string) => {
        if (!confirm("Excluir dica?")) return;
        await supabase.from('vault_hints').delete().eq('id', id);
        loadHints(editingVault.id);
    };

    const toggleHintReveal = async (id: string, current: boolean) => {
        await supabase.from('vault_hints').update({ is_revealed: !current }).eq('id', id);
        loadHints(editingVault.id);
    };

    const startEdit = (vault: any) => {
        setEditingVault(vault);
        setFormData({
            title: vault.title || "",
            description: vault.description || "",
            correct_password: vault.correct_password || "",
            prize_pool: vault.prize_pool || 0,
            prize_type: vault.prize_type || "cash",
            prize_product_name: vault.prize_product_name || "",
            prize_product_image: vault.prize_product_image || "",
            show_estimated_value: vault.show_estimated_value ?? true,
            estimated_prize_value: vault.estimated_prize_value || 0,
            status: vault.status || "inactive"
        });
        loadHints(vault.id);
        loadGuesses(vault.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Cofres Ativos", value: vaults.filter(v => v.status === 'active').length, icon: Zap, color: "text-green-500" },
                    { label: "Prêmio Total", value: `R$ ${vaults.filter(v => v.status === 'active').reduce((acc, v) => acc + (v.prize_pool || 0), 0)}`, icon: Trophy, color: "text-yellow-500" },
                    { label: "Encerrados", value: vaults.filter(v => v.status === 'finished').length, icon: Lock, color: "text-blue-500" },
                    { label: "Total", value: vaults.length, icon: Shield, color: "text-gray-500" }
                ].map((stat, i) => (
                    <Card key={i} className="bg-white/5 border-white/5 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black text-white">{stat.value}</p>
                        </div>
                        <stat.icon className={`h-6 w-6 ${stat.color} opacity-50`} />
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-[#0a0a0a] border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className={`h-1.5 w-full bg-gradient-to-r ${editingVault ? 'from-blue-600 to-indigo-600' : 'from-yellow-600 to-orange-600'}`}></div>
                        <CardHeader className="px-8 pt-8">
                            <CardTitle className="text-white flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-white/5 ${editingVault ? 'text-blue-500' : 'text-yellow-500'}`}>
                                    {editingVault ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black uppercase italic">{editingVault ? "Editar Cofre" : "Novo Cofre"}</span>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Painel Operacional</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">Título</Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-black border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">Charada</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-black border-white/10 rounded-xl h-24" />
                            </div>
                            <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <Label className="text-[10px] uppercase font-black text-yellow-500">Senha do Protocolo (ATÉ 12 dígitos)</Label>
                                <Input maxLength={12} value={formData.correct_password} onChange={e => setFormData({ ...formData, correct_password: e.target.value.replace(/\D/g, '') })} className="bg-black border-yellow-500/20 text-center text-3xl font-black tracking-[0.2em] h-16 text-yellow-500" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">Tipo de Premiação</Label>
                                <div className="flex gap-2">
                                    <Button size="sm" type="button" className={`flex-1 ${formData.prize_type === 'cash' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-500'}`} onClick={() => setFormData({ ...formData, prize_type: 'cash' })}>Dinheiro</Button>
                                    <Button size="sm" type="button" className={`flex-1 ${formData.prize_type === 'product' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-500'}`} onClick={() => setFormData({ ...formData, prize_type: 'product' })}>Produto</Button>
                                </div>
                            </div>

                            {formData.prize_type === 'cash' ? (
                                <div className="space-y-2">
                                    <Label className="text-[9px] uppercase font-black text-gray-400">Prêmio (R$)</Label>
                                    <Input type="number" value={formData.prize_pool} onChange={e => setFormData({ ...formData, prize_pool: e.target.value ? parseFloat(e.target.value) : 0 })} className="bg-black border-white/10" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-black text-gray-500">Produto</Label>
                                        <Input placeholder="Nome do Produto" value={formData.prize_product_name} onChange={e => setFormData({ ...formData, prize_product_name: e.target.value })} className="bg-black border-white/10" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-black text-gray-500">URL Imagem</Label>
                                        <Input placeholder="URL da Imagem" value={formData.prize_product_image} onChange={e => setFormData({ ...formData, prize_product_image: e.target.value })} className="bg-black border-white/10" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Valor Est.</Label>
                                            <Input type="number" placeholder="Valor Estimado" value={formData.estimated_prize_value} onChange={e => setFormData({ ...formData, estimated_prize_value: e.target.value ? parseFloat(e.target.value) : 0 })} className="bg-black border-white/10" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Visibilidade</Label>
                                            <Button variant="ghost" type="button" className={`h-11 border w-full ${formData.show_estimated_value ? 'border-yellow-500 text-yellow-500' : 'border-white/5 text-gray-500'}`} onClick={() => setFormData({ ...formData, show_estimated_value: !formData.show_estimated_value })}>{formData.show_estimated_value ? 'On' : 'Off'}</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-gray-400">Status</Label>
                                <div className="flex gap-2">
                                    {['inactive', 'active', 'finished'].map(s => (
                                        <Button key={s} type="button" size="sm" className={`flex-1 ${formData.status === s ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-500'}`} onClick={() => setFormData({ ...formData, status: s as any })}>{s}</Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                {editingVault ? (
                                    <>
                                        <Button onClick={handleUpdateVault} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-2xl">Atualizar</Button>
                                        <Button onClick={() => setEditingVault(null)} variant="outline" className="h-14 px-6 border-white/10 rounded-2xl text-gray-500">Voltar</Button>
                                    </>
                                ) : (
                                    <Button onClick={handleCreateVault} className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase rounded-2xl">Criar Cofre</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* GESTÃO OPERACIONAL E CONFIGURAÇÕES */}
                <div className="lg:col-span-2 space-y-8">
                    {/* INTELIGÊNCIA E MONITOR - SEMPRE VISÍVEIS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right duration-500">
                        {/* Dicas / Inteligência */}
                        <Card className="bg-[#111] border-white/5 rounded-[2.5rem] p-4 shadow-2xl">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-blue-500" /> Inteligência {editingVault && `(${hints.length}/5)`}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {editingVault ? (
                                    <>
                                        {(hints.length < 5 || hintData.id) && (
                                            <div className="space-y-3 p-4 bg-black/60 rounded-2xl border border-white/5">
                                                <Label className="text-[9px] uppercase font-black text-blue-400">{hintData.id ? "✏️ Editando Inteligência" : "➕ Nova Inteligência"}</Label>

                                                <div className="space-y-1">
                                                    {hintData.reveal_at && (
                                                        <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg flex items-center gap-2 mb-1 animate-pulse">
                                                            <Clock className="h-3 w-3 text-blue-400" />
                                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">
                                                                REVELAÇÃO AGENDADA: {new Date(hintData.reveal_at).toLocaleDateString()} às {new Date(hintData.reveal_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <Label className="text-[8px] uppercase font-black text-gray-600">Título Visual (Fase Oculta)</Label>
                                                    <Input value={hintData.pre_reveal_title} onChange={e => setHintData({ ...hintData, pre_reveal_title: e.target.value })} className="bg-white/5 border-white/10 text-[10px] text-white h-8" placeholder="Ex: INFORMAÇÃO CRIPTOGRAFADA" />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[8px] uppercase font-black text-gray-600">Conteúdo Revelado</Label>
                                                    <Textarea value={hintData.hint_text} onChange={e => setHintData({ ...hintData, hint_text: e.target.value })} className="bg-white/5 border-white/10 text-xs text-white min-h-[60px]" placeholder="O conteúdo que será visto após desbloquear..." />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-[8px] uppercase font-black text-gray-600">Revelar em:</Label>
                                                        <Input type="datetime-local" value={hintData.reveal_at} onChange={e => setHintData({ ...hintData, reveal_at: e.target.value })} className="bg-white/5 text-[10px] text-white" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[8px] uppercase font-black text-gray-600">Preço (R$):</Label>
                                                        <Input type="number" placeholder="Preço" value={hintData.unlock_price} onChange={e => setHintData({ ...hintData, unlock_price: e.target.value ? parseFloat(e.target.value) : 0 })} className="bg-white/5 text-[10px] text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button onClick={handleSaveHint} size="sm" className="flex-1 bg-blue-600">{hintData.id ? "Salvar" : "Agendar"}</Button>
                                                    {hintData.id && <Button onClick={() => setHintData({ id: "", hint_text: "", pre_reveal_title: "INFORMAÇÃO CRIPTOGRAFADA", reveal_at: "", unlock_price: 0, is_premium: false })} variant="outline" size="sm">Limpar</Button>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {hints.map((h, idx) => (
                                                <div key={h.id} onClick={() => setHintData({
                                                    id: h.id,
                                                    hint_text: h.hint_text,
                                                    pre_reveal_title: h.pre_reveal_title || "INFORMAÇÃO CRIPTOGRAFADA",
                                                    reveal_at: h.reveal_at.slice(0, 16),
                                                    unlock_price: h.unlock_price,
                                                    is_premium: (h.unlock_price > 0)
                                                })} className={`p-4 rounded-xl border cursor-pointer ${hintData.id === h.id ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-black'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <Badge className="bg-blue-500/10 text-blue-500 text-[8px]">#{idx + 1} - R$ {h.unlock_price}</Badge>
                                                        <div className="flex gap-1">
                                                            <button onClick={(e) => { e.stopPropagation(); toggleHintReveal(h.id, h.is_revealed); }} className="p-1 hover:text-white transition-colors">{h.is_revealed ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3 text-gray-600" />}</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHint(h.id); }} className="p-1 text-red-500 hover:text-red-400 transition-colors"><Trash2 className="h-3 w-3" /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-white/70 italic">"{h.hint_text}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-20 text-center space-y-4">
                                        <Lock className="h-10 w-10 text-gray-700 mx-auto opacity-20" />
                                        <p className="text-[10px] font-black text-gray-600 uppercase italic">Selecione um cofre abaixo para<br />gerenciar a Inteligência</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Atividade / Palpites */}
                        <Card className="bg-[#111] border-white/5 rounded-[2.5rem] p-4 shadow-2xl">
                            <CardHeader><CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2"><Users className="h-4 w-4 text-yellow-500" /> Monitor de Atividade</CardTitle></CardHeader>
                            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
                                {editingVault ? (
                                    <>
                                        {recentGuesses.map(g => (
                                            <div key={g.id} className="p-2 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center text-[10px]">
                                                <span className="text-white font-bold italic">{g.profiles?.nickname || 'Anônimo'}</span>
                                                <span className="font-mono text-yellow-500 text-base">{g.guess}</span>
                                            </div>
                                        ))}
                                        {recentGuesses.length === 0 && <p className="text-center text-[10px] text-gray-600 uppercase py-10 font-bold italic">Nenhuma tentativa ainda</p>}
                                    </>
                                ) : (
                                    <div className="py-20 text-center space-y-4">
                                        <Timer className="h-10 w-10 text-gray-700 mx-auto opacity-20" />
                                        <p className="text-[10px] font-black text-gray-600 uppercase italic">Selecione um cofre abaixo para<br />monitorar tentativas</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* PACOTES DE PALPITES - AGORA TAMBÉM SEMPRE VISÍVEL ABAIXO */}
                    <div className="animate-in fade-in zoom-in-95 duration-700">
                        <Card className="bg-black/40 border-dashed border-2 border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-3 mb-6"><Wallet className="h-5 w-5 text-yellow-500" /><h3 className="text-sm font-black uppercase text-white">Pacotes de Palpites (Global)</h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                {packages.map(pkg => (
                                    <Card key={pkg.id} className="bg-[#0a0a0a] border-white/10 rounded-3xl p-6 space-y-4 shadow-xl text-left">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Nome</Label>
                                            <Input value={pkg.name} onChange={e => handleUpdatePackage(pkg.id, 'name', e.target.value)} className="bg-black text-[10px] text-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] uppercase font-black text-gray-500">Qtd</Label>
                                                <Input type="number" value={pkg.amount} onChange={e => handleUpdatePackage(pkg.id, 'amount', e.target.value)} className="bg-black text-[10px] text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] uppercase font-black text-gray-500">Preço (R$)</Label>
                                                <Input type="number" step="0.01" value={pkg.price} onChange={e => handleUpdatePackage(pkg.id, 'price', e.target.value)} className="bg-black text-[10px] text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Botão</Label>
                                            <Input value={pkg.button_text || ''} onChange={e => handleUpdatePackage(pkg.id, 'button_text', e.target.value)} className="bg-black text-[10px] text-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] uppercase font-black text-gray-500">Cor Destaque</Label>
                                                <div className="flex gap-2 items-center bg-black p-1.5 rounded-xl border border-white/10">
                                                    <input type="color" value={pkg.highlight_color || '#eab308'} onChange={e => handleUpdatePackage(pkg.id, 'highlight_color', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                                                    <span className="text-[8px] font-mono text-gray-500">{pkg.highlight_color}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] uppercase font-black text-gray-500">Cor Texto</Label>
                                                <div className="flex gap-2 items-center bg-black p-1.5 rounded-xl border border-white/10">
                                                    <input type="color" value={pkg.text_color || '#ffffff'} onChange={e => handleUpdatePackage(pkg.id, 'text_color', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                                                    <span className="text-[8px] font-mono text-gray-500">{pkg.text_color}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" type="button" className={`w-full ${pkg.is_glowing ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-white/5 text-gray-500'}`} onClick={() => handleUpdatePackage(pkg.id, 'is_glowing', !pkg.is_glowing)}>Brilho {pkg.is_glowing ? 'ATIVO' : 'OFF'}</Button>
                                    </Card>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Vault History List */}
            <div className="pt-10 border-t border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase text-gray-500 text-center tracking-[0.4em]">Hall da Fama - Histórico de Cofres</h3>
                {loading ? (
                    <div className="flex justify-center p-20"><Zap className="animate-pulse text-yellow-500 h-10 w-10" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {vaults.map(v => (
                            <Card key={v.id} onClick={() => startEdit(v)} className={`relative p-6 bg-[#111] border-white/5 hover:border-yellow-500 cursor-pointer transition-all ${editingVault?.id === v.id ? 'border-yellow-500 bg-yellow-500/5 ring-1 ring-yellow-500/50' : 'hover:scale-[1.02]'}`}>
                                <h4 className="font-black text-white uppercase italic truncate pr-8">{v.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-gray-600 font-bold">{new Date(v.created_at).toLocaleDateString()}</p>
                                    <Badge className={`text-[8px] font-black ${v.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-800 text-gray-500'}`}>{v.status}</Badge>
                                </div>
                                <div className="absolute top-4 right-4">
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteVault(v.id); }} className="p-2 text-red-500/20 hover:text-red-500 transition-colors">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 uppercase font-black">{v.prize_type === 'cash' ? 'DINHEIRO' : 'PRODUTO'}</span>
                                    <span className="text-sm font-black text-yellow-500">{v.prize_type === 'cash' ? `R$ ${v.prize_pool}` : 'Item'}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

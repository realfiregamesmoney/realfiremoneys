import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Lock, Unlock, Zap, Bell, Clock, Edit, Shield, Eye, EyeOff, Users, Key, Trophy, Wallet, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sendPushNotification } from "@/utils/onesignal";

export default function AdminVault() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [vaults, setVaults] = useState<any[]>([]);
    const [editingVault, setEditingVault] = useState<any>(null);
    const [hints, setHints] = useState<any[]>([]);
    const [packages, setPackages] = useState<any[]>([]);
    const [recentGuesses, setRecentGuesses] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        correct_password: "",
        prize_pool: 0,
        status: "inactive"
    });

    const [hintData, setHintData] = useState({
        hint_text: "",
        reveal_at: ""
    });

    useEffect(() => {
        loadVaults();
        loadPackages();
    }, []);

    const loadVaults = async () => {
        setLoading(true);
        const { data } = await supabase.from('vault_events').select('*, profiles(nickname)').order('created_at', { ascending: false });
        setVaults(data || []);
        setLoading(false);
    };

    const loadHints = async (vaultId: string) => {
        const { data } = await supabase.from('vault_hints').select('*').eq('vault_id', vaultId).order('reveal_at', { ascending: true });
        setHints(data || []);
    };

    const loadPackages = async () => {
        const { data } = await supabase.from('vault_packages').select('*').order('price', { ascending: true });
        setPackages(data || []);
    };

    const handleUpdatePackage = async (id: string, field: string, value: any) => {
        const { error } = await supabase.from('vault_packages').update({ [field]: value }).eq('id', id);
        if (error) toast({ title: "Erro ao atualizar pacote", variant: "destructive" });
        else {
            toast({ title: "Pacote atualizado!" });
            loadPackages();
        }
    };

    const loadGuesses = async (vaultId: string) => {
        const { data } = await supabase
            .from('vault_guesses')
            .select('*, profiles(nickname)')
            .eq('vault_id', vaultId)
            .order('created_at', { ascending: false })
            .limit(10);
        setRecentGuesses(data || []);
    };

    const handleCreateVault = async () => {
        if (!formData.title || !formData.correct_password || formData.correct_password.length !== 6) {
            return toast({ title: "Dados inválidos", description: "O título é obrigatório e a senha deve ter 6 dígitos.", variant: "destructive" });
        }
        const { data, error } = await supabase.from('vault_events').insert(formData).select().single();
        if (error) toast({ title: "Erro ao criar cofre", variant: "destructive" });
        else {
            toast({ title: "Cofre criado com sucesso!" });
            loadVaults();
            setFormData({ title: "", description: "", correct_password: "", prize_pool: 0, status: "inactive" });
        }
    };

    const handleUpdateVault = async () => {
        if (!editingVault) return;
        const { error } = await supabase.from('vault_events').update(formData).eq('id', editingVault.id);
        if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
        else {
            toast({ title: "Cofre atualizado!" });
            loadVaults();
            setEditingVault(null);
        }
    };

    const handleDeleteVault = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este cofre? Isso apagará todas as dicas e palpites.")) return;
        const { error } = await supabase.from('vault_events').delete().eq('id', id);
        if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
        else {
            toast({ title: "Cofre excluído!" });
            loadVaults();
        }
    };

    const handleAddHint = async () => {
        if (!editingVault || !hintData.hint_text || !hintData.reveal_at) return;
        const { error } = await supabase.from('vault_hints').insert({
            vault_id: editingVault.id,
            hint_text: hintData.hint_text,
            reveal_at: hintData.reveal_at,
            is_revealed: false
        });

        if (error) toast({ title: "Erro ao adicionar dica", variant: "destructive" });
        else {
            toast({ title: "Dica agendada!" });
            loadHints(editingVault.id);
            setHintData({ hint_text: "", reveal_at: "" });
        }
    };

    const toggleHintReveal = async (hintId: string, current: boolean) => {
        const { error } = await supabase.from('vault_hints').update({ is_revealed: !current }).eq('id', hintId);
        if (!error) {
            if (!current) {
                try {
                    await sendPushNotification(
                        "vault_new_hint",
                        "🔥 NOVA DICA DO COFRE!",
                        "Uma nova dica foi revelada no Cofre Real Fire! Vá conferir!"
                    );
                } catch (e) {
                    console.error("Error sending push", e);
                }
            }
            loadHints(editingVault.id);
        }
    };

    const startEdit = (vault: any) => {
        setEditingVault(vault);
        setFormData({
            title: vault.title,
            description: vault.description,
            correct_password: vault.correct_password,
            prize_pool: vault.prize_pool,
            status: vault.status
        });
        loadHints(vault.id);
        loadGuesses(vault.id);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header com Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Cofres Ativos", value: vaults.filter(v => v.status === 'active').length, icon: Zap, color: "text-green-500" },
                    { label: "Prêmio Total", value: `R$ ${vaults.filter(v => v.status === 'active').reduce((acc, v) => acc + (v.prize_pool || 0), 0)}`, icon: Trophy, color: "text-yellow-500" },
                    { label: "Cofres Encerrados", value: vaults.filter(v => v.status === 'finished').length, icon: Lock, color: "text-blue-500" },
                    { label: "Total Registrados", value: vaults.length, icon: Shield, color: "text-gray-500" }
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
                {/* FORMULÁRIO DE CRIAÇÃO/EDIÇÃO */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-[#0a0a0a] border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className={`h-1.5 w-full bg-gradient-to-r ${editingVault ? 'from-blue-600 to-indigo-600' : 'from-yellow-600 to-orange-600'}`}></div>
                        <CardHeader className="px-8 pt-8">
                            <CardTitle className="text-white flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-white/5 ${editingVault ? 'text-blue-500' : 'text-yellow-500'}`}>
                                    {editingVault ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-black uppercase italic tracking-tighter">
                                        {editingVault ? "Editar Cofre" : "Novo Cofre"}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Painel Operacional</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">Título Público</Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-black border-white/10 rounded-xl h-12 focus:ring-yellow-500/50" placeholder="Ex: O Cofre de Ouro #1" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">A Charada (The Riddle)</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-black border-white/10 rounded-xl h-24 focus:ring-yellow-500/50 text-sm" placeholder="Escreva a charada lógica que levará à senha..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black text-gray-400">Senha (6 Dígitos)</Label>
                                    <div className="relative">
                                        <Input maxLength={6} type="text" value={formData.correct_password} onChange={e => setFormData({ ...formData, correct_password: e.target.value })} className="bg-black border-white/10 rounded-xl h-12 text-center font-mono text-xl tracking-widest text-yellow-500 focus:ring-yellow-500/50" placeholder="123456" />
                                        <Key className="absolute right-3 top-3.5 h-5 w-5 text-white/10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-black text-gray-400">Prêmio (R$)</Label>
                                    <div className="relative">
                                        <Input type="number" value={formData.prize_pool} onChange={e => setFormData({ ...formData, prize_pool: parseFloat(e.target.value) })} className="bg-black border-white/10 rounded-xl h-12 pl-10 focus:ring-yellow-500/50" />
                                        <span className="absolute left-3 top-3.5 text-xs font-black text-gray-600">R$</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-black text-gray-400">Status Operacional</Label>
                                <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                                    {['inactive', 'active', 'finished'].map(s => (
                                        <Button
                                            key={s}
                                            variant="ghost"
                                            className={`flex-1 h-9 text-[9px] uppercase font-black rounded-lg transition-all ${formData.status === s ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-gray-500 hover:bg-white/5'}`}
                                            onClick={() => setFormData({ ...formData, status: s })}
                                        >
                                            {s === 'inactive' ? 'Inativo' : s === 'active' ? 'Ao Vivo' : 'Finalizado'}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                {editingVault ? (
                                    <>
                                        <Button onClick={handleUpdateVault} className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all">
                                            Atualizar
                                        </Button>
                                        <Button onClick={() => setEditingVault(null)} variant="outline" className="h-14 px-6 border-white/10 rounded-2xl text-gray-500 hover:bg-white/5">
                                            Sair
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleCreateVault} className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase rounded-2xl shadow-xl shadow-yellow-500/10 transition-all">
                                        Lançar Desafio
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* GESTÃO DE DICAS E PALPITES (SÓ APARECE QUANDO EDITANDO) */}
                <div className="lg:col-span-2 space-y-8">
                    {editingVault ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Dicas */}
                                <Card className="bg-[#111] border-white/5 rounded-[2.5rem] p-4 flex flex-col">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                                            <Bell className="h-4 w-4 text-blue-500" /> Dicas Agendadas
                                        </CardTitle>
                                        <Badge className="bg-blue-500/10 text-blue-500 border-0">{hints.length}</Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-6 flex-1">
                                        <div className="space-y-3 p-4 bg-black rounded-2xl border border-white/5">
                                            <Input value={hintData.hint_text} onChange={e => setHintData({ ...hintData, hint_text: e.target.value })} className="bg-white/5 border-white/10 text-xs h-10" placeholder="Ex: O terceiro número é ímpar" />
                                            <Input type="datetime-local" value={hintData.reveal_at} onChange={e => setHintData({ ...hintData, reveal_at: e.target.value })} className="bg-white/5 border-white/10 text-xs h-10" />
                                            <Button onClick={handleAddHint} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] h-10 rounded-xl">Agendar Dica</Button>
                                        </div>

                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {hints.map((h, idx) => (
                                                <div key={h.id} className="group flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 transition-all hover:bg-white/5">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <p className="text-xs text-white font-bold leading-tight">"{h.hint_text}"</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Clock className="h-3 w-3 text-gray-500" />
                                                            <p className="text-[9px] text-gray-500 font-black uppercase">{new Date(h.reveal_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant={h.is_revealed ? 'default' : 'outline'}
                                                            className={`h-7 px-3 text-[9px] font-black uppercase rounded-lg ${h.is_revealed ? 'bg-green-600' : 'border-white/10 hover:bg-green-500/10'}`}
                                                            onClick={() => toggleHintReveal(h.id, h.is_revealed)}
                                                        >
                                                            {h.is_revealed ? 'Ativa' : 'Revelar'}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {hints.length === 0 && <p className="text-center py-10 text-[10px] uppercase font-black text-gray-600 italic">Nenhuma dica agendada</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Palpites Recentes */}
                                <Card className="bg-[#111] border-white/5 rounded-[2.5rem] p-4 flex flex-col">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                                            <Users className="h-4 w-4 text-yellow-500" /> Monitor de Palpites
                                        </CardTitle>
                                        <Badge variant="outline" className="border-yellow-500/20 text-yellow-500 font-black uppercase text-[8px]">Tempo Real</Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4 flex-1">
                                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar text-[10px]">
                                            {recentGuesses.map((g, idx) => (
                                                <div key={g.id} className={`flex items-center justify-between p-3 rounded-xl border ${g.is_correct ? 'bg-green-500/10 border-green-500/20' : 'bg-black/20 border-white/5'}`}>
                                                    <div>
                                                        <p className="font-black text-white uppercase italic">{g.profiles?.nickname}</p>
                                                        <p className="text-[8px] text-gray-500">{new Date(g.created_at).toLocaleTimeString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-base font-black tracking-widest text-white/40">{g.guess}</span>
                                                        {g.is_correct ? <Zap className="h-4 w-4 text-green-500" /> : <Loader2 className="h-3 w-3 text-red-500/30" />}
                                                    </div>
                                                </div>
                                            ))}
                                            {recentGuesses.length === 0 && (
                                                <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-20 py-20">
                                                    <Zap className="h-10 w-10" />
                                                    <p className="font-black uppercase tracking-widest">Nenhuma tentativa detectada</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center p-12 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3.5rem] text-center space-y-6">
                            <div className="relative">
                                <Shield className="h-20 w-20 text-gray-800" />
                                <Lock className="h-8 w-8 text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">Central do Cofre</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">
                                    Selecione um cofre na lista abaixo para gerenciar dicas e monitorar tentativas.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LISTA DE COFRES REGISTRADOS */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Arquivos do Sistema</h3>
                    </div>
                </div>

                {/* PACOTES DE PALPITES */}
                <div className="pt-10 border-t border-white/5 space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Wallet className="h-5 w-5 text-yellow-500" />
                        <div>
                            <h3 className="text-sm font-black uppercase text-white tracking-widest leading-none">Gestão de Pacotes de Palpites</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Configure Nomes, Preços e Detalhes Visuais</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {packages.map((pkg) => (
                            <Card key={pkg.id} className="bg-[#0a0a0a] border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-all">
                                <div className={`h-1.5 w-full ${pkg.color === 'yellow' ? 'bg-yellow-500' : pkg.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <Badge className="bg-white/5 text-gray-400 font-black uppercase text-[8px] hover:bg-white/10">{pkg.id}</Badge>
                                        {pkg.color === 'gray' ? <Zap className="h-4 w-4 text-gray-500" /> : pkg.color === 'blue' ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : <Trophy className="h-4 w-4 text-yellow-500" />}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-black text-gray-500">Nome do Pacote</Label>
                                        <Input value={pkg.name} onChange={e => handleUpdatePackage(pkg.id, 'name', e.target.value)} className="bg-black border-white/10 h-10 font-bold" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Qtd. Palpites</Label>
                                            <Input type="number" value={pkg.amount} onChange={e => handleUpdatePackage(pkg.id, 'amount', parseInt(e.target.value))} className="bg-black border-white/10 h-10 font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] uppercase font-black text-gray-500">Valor (R$)</Label>
                                            <Input type="number" step="0.01" value={pkg.price} onChange={e => handleUpdatePackage(pkg.id, 'price', parseFloat(e.target.value))} className="bg-black border-white/10 h-10 font-bold text-yellow-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[9px] uppercase font-black text-gray-500">Etiqueta (Badge)</Label>
                                        <Input value={pkg.badge || ''} onChange={e => handleUpdatePackage(pkg.id, 'badge', e.target.value)} className="bg-black border-white/10 h-10 font-bold" placeholder="..." />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="pt-10 border-t border-white/5 space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="h-5 w-5 text-gray-500" />
                        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Histórico de Cofres</h3>
                    </div>
                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-yellow-500" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {vaults.map(v => (
                                <Card key={v.id} onClick={() => startEdit(v)} className={`group relative bg-[#111] border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer overflow-hidden rounded-[2.5rem] ${editingVault?.id === v.id ? 'ring-2 ring-yellow-500 bg-yellow-500/5' : 'hover:scale-[1.02]'}`}>
                                    <div className={`h-1.5 w-full ${v.status === 'active' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : v.status === 'finished' ? 'bg-blue-600' : 'bg-red-600 opacity-50'}`}></div>

                                    <CardContent className="p-8 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">{v.title}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <Badge variant="outline" className={`uppercase text-[8px] font-black h-5 px-3 rounded-full ${v.status === 'active' ? 'text-green-500 border-green-500/20' : ''}`}>
                                                {v.status === 'active' ? 'Ao Vivo' : v.status === 'finished' ? 'Encerrado' : 'Inativo'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                                                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">Senha</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-sm tracking-[0.2em] font-black text-yellow-500">
                                                        {showPassword === v.id ? v.correct_password : "••••••"}
                                                    </span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-40 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setShowPassword(showPassword === v.id ? null : v.id); }}>
                                                        {showPassword === v.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                                                <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">Prêmio</p>
                                                <p className="text-sm font-black text-white italic">R$ {v.prize_pool}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button size="sm" className="bg-white hover:bg-yellow-500 hover:text-black text-black h-10 text-[10px] font-black uppercase rounded-xl flex-1 transition-all">
                                                Gerenciar
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteVault(v.id); }} className="h-10 w-10 p-0 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

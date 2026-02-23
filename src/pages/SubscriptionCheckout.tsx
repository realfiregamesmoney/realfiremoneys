import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, QrCode, ArrowLeft, CheckCircle2, ShieldCheck, Copy, Clock, Settings, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";



export default function SubscriptionCheckout() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');
    const [loading, setLoading] = useState(false);
    const [pixCode, setPixCode] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [loadingPlan, setLoadingPlan] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            if (!planId) { navigate("/dashboard"); return; }
            setLoadingPlan(true);
            const { data } = await supabase.from('notification_settings').select('label').eq('key_name', 'VIP_PLANS_V1').maybeSingle();
            if (data && data.label) {
                try {
                    const parsed = JSON.parse(data.label);
                    const found = parsed.find((p: any) => p.id === planId && p.is_active && !p.is_deleted);
                    if (found) {
                        setPlan(found);
                    } else {
                        navigate("/dashboard");
                    }
                } catch (e) { navigate("/dashboard"); }
            } else { navigate("/dashboard"); }
            setLoadingPlan(false);
        };
        fetchPlan();
    }, [planId, navigate]);

    if (loadingPlan) {
        return <div className="min-h-screen bg-[#050505] flex justify-center items-center"><Loader2 className="animate-spin text-orange-500 h-10 w-10" /></div>;
    }

    if (!plan) return null;

    const handlePayment = async () => {
        setLoading(true);
        setPixCode(null);
        setSuccess(false);

        try {
            if (paymentMethod === 'pix') {
                const { data: profile } = await supabase.from('profiles').select('full_name, cpf, nickname').eq('user_id', user?.id).single();

                const { data, error } = await supabase.functions.invoke("create-pix-charge", {
                    body: {
                        amount: Number(plan.price),
                        user_id: user?.id,
                        name: profile?.full_name || profile?.nickname || 'Usuario VIP',
                        cpf: profile?.cpf || '00000000000',
                        description_prefix: `Assinatura VIP Real Fire - PLAN: ${planId}`
                    }
                });

                if (error || !data || data.error) {
                    console.error("Erro ao gerar PIX:", error || data?.error);
                    toast({ variant: "destructive", title: "Erro no PIX", description: data?.error || "Verifique seu CPF no perfil." });
                    setLoading(false);
                    return;
                }

                setPixCode(data.payload);
                toast({ title: "PIX Asaas Gerado!", description: "Escaneie ou Copie o código para ativar sua assinatura automaticamente." });
                setLoading(false);
            } else {
                setTimeout(async () => {
                    // Simula Webhook Asaas - Pagamento Confirmado!
                    await processAsaasWebhookMock(planId as string);
                    setSuccess(true);
                    setLoading(false);
                }, 2500);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Erro no pagamento." });
            setLoading(false);
        }
    };

    const processAsaasWebhookMock = async (pid: string) => {
        if (!user || !plan) return;

        // Atualiza base de dados
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        await (supabase as any).from("profiles").update({
            plan_type: plan.title,
            passes_available: 2,
            pass_value: plan.roomPrice,
            plan_expiration: expirationDate.toISOString()
        }).eq("user_id", user.id);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#050505] p-6 text-white flex flex-col items-center justify-center">
                <CheckCircle2 className="h-20 w-20 text-green-500 mb-4 animate-bounce" />
                <h1 className="text-3xl font-black uppercase text-green-500 mb-2">Assinatura Ativa!</h1>
                <p className="text-gray-400 text-center mb-8">O pagamento foi confirmado e seu <b>{plan.title}</b> já está funcionando. Passes Livres recebidos!</p>
                <Button onClick={() => navigate("/profile")} className="bg-neon-orange text-black font-black uppercase">
                    Ver Meus Passes
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-4 text-white pb-24">
            <Button variant="ghost" className="mb-4 text-gray-400 p-0 hover:bg-transparent hover:text-white" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5 mr-1" /> Voltar
            </Button>

            <Card className="bg-[#111] border-white/5 max-w-lg mx-auto shadow-2xl">
                <CardHeader className="text-center border-b border-white/5 pb-6">
                    <div className="text-4xl mb-2">{plan.icon}</div>
                    <CardTitle className="text-2xl font-black uppercase text-neon-orange">{plan.title}</CardTitle>
                    <CardDescription className="text-gray-400">Assinatura Mensal VIP</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                        <span className="text-sm font-bold text-gray-400">Valor a pagar:</span>
                        <span className="text-3xl font-black text-green-400">R$ {plan.price.toFixed(2)}</span>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase text-gray-400 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Checkout Seguro Asaas
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className={`h-auto py-4 flex flex-col items-center gap-2 ${paymentMethod === 'pix' ? 'border-neon-orange bg-orange-500/10 text-orange-400' : 'border-white/10 bg-black text-gray-500 hover:text-white'}`}
                                onClick={() => setPaymentMethod('pix')}
                            >
                                <QrCode className="h-6 w-6" /> PIX Copia e Cola
                            </Button>
                            <Button
                                variant="outline"
                                className={`h-auto py-4 flex flex-col items-center gap-2 ${paymentMethod === 'credit_card' ? 'border-neon-orange bg-orange-500/10 text-orange-400' : 'border-white/10 bg-black text-gray-500 hover:text-white'}`}
                                onClick={() => setPaymentMethod('credit_card')}
                            >
                                <CreditCard className="h-6 w-6" /> Cartão de Crédito
                            </Button>
                        </div>
                    </div>

                    {paymentMethod === 'credit_card' && (
                        <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
                            <input type="text" placeholder="Número do Cartão" className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-orange outline-none transition-colors" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Validade (MM/AA)" className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-orange outline-none transition-colors" />
                                <input type="text" placeholder="CVC" className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-orange outline-none transition-colors" />
                            </div>
                            <input type="text" placeholder="Nome Impresso no Cartão" className="w-full bg-[#0c0c0c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-neon-orange outline-none transition-colors" />
                            <p className="text-[10px] text-gray-500 text-center pt-2">A renovação acontecerá automaticamente todo mês.</p>
                        </div>
                    )}

                    {pixCode ? (
                        <div className="space-y-4 bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
                            <QrCode className="h-10 w-10 text-green-500 mx-auto" />
                            <div>
                                <p className="text-xs text-green-400 font-bold uppercase mb-2">Código PIX Gerado</p>
                                <p className="text-[11px] text-gray-400 break-all bg-black/50 p-2 rounded selectable border border-white/5">
                                    {pixCode}
                                </p>
                            </div>
                            <Button onClick={() => { navigator.clipboard.writeText(pixCode); toast({ title: "Copiado!" }) }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold uppercase py-6 shadow-lg shadow-green-900/50">
                                <Copy className="h-4 w-4 mr-2" /> Copiar Código
                            </Button>
                            <div className="flex justify-center items-center gap-2 text-xs text-orange-400 bg-orange-500/10 p-2 rounded">
                                <Loader2 className="h-4 w-4 animate-spin" /> Aguardando Pagamento Processar...
                            </div>
                            <Button variant="ghost" className="w-full text-xs text-gray-500 uppercase mt-2" onClick={() => { processAsaasWebhookMock(planId as string); setSuccess(true); }}>
                                [DEV] Simular PIX Pago
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handlePayment} disabled={loading} className="w-full bg-neon-orange hover:bg-orange-600 text-black font-black uppercase tracking-widest py-6 text-lg transition-transform active:scale-95 shadow-lg shadow-orange-900/50">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pagar e Assinar o VIP"}
                        </Button>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

import { useState, useEffect } from "react";
import { ArrowLeft, Copy, CheckCircle, Wallet, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import KycModal from "@/components/KycModal";

export default function Finance() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <Wallet className="h-5 w-5 text-neon-orange" />
        <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">Carteira</h1>
      </div>

      <Tabs defaultValue="deposit" className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="deposit" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Depositar</TabsTrigger>
          <TabsTrigger value="withdraw" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sacar</TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit"><DepositTab /></TabsContent>
        <TabsContent value="withdraw"><WithdrawTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DepositTab() {
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "pix" | "pending">("amount");
  const [showKyc, setShowKyc] = useState(false);
  const [pixKey, setPixKey] = useState("realfiregamesmoney@gmail.com");

  // Fetch dynamic payment link
  useEffect(() => {
    supabase.from("payment_links").select("link").order("created_at", { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0 && data[0].link) setPixKey(data[0].link);
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    toast({ title: "Chave PIX copiada!" });
  };

  const handleContinueDeposit = () => {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      toast({ variant: "destructive", title: "Digite um valor válido" });
      return;
    }
    if (val < 15) {
      toast({ variant: "destructive", title: "Depósito mínimo é R$ 15,00" });
      return;
    }
    // KYC check - CPF obrigatório apenas no primeiro depósito
    if (!profile?.cpf || !profile?.full_name) {
      setShowKyc(true);
      return;
    }
    setStep("pix");
  };

  const handlePaid = async () => {
    if (!user) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id, type: "deposit", amount: parseFloat(amount), status: "pending",
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      // Log deposit request
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action_type: "deposit_request",
        details: `Jogador ${profile?.nickname} solicitou depósito de R$${parseFloat(amount).toFixed(2)}`
      });
      setStep("pending");
    }
  };

  if (step === "pending") {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Clock className="h-16 w-16 text-neon-orange mb-4" />
        <h3 className="text-lg font-bold text-foreground">Aguardando Aprovação</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Seu depósito de <span className="text-neon-green font-bold">R$ {parseFloat(amount).toFixed(2)}</span> está sendo analisado.
        </p>
        <p className="text-xs text-muted-foreground mt-1">O saldo será atualizado após a confirmação do admin.</p>
        <Button onClick={() => { setStep("amount"); setAmount(""); }} variant="outline" className="mt-6 border-border">
          Novo Depósito
        </Button>
      </div>
    );
  }

  if (step === "pix") {
    return (
      <div className="space-y-4 pt-4">
        <Card className="border-neon-orange bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs uppercase text-muted-foreground mb-2">Valor do Depósito</p>
            <p className="text-2xl font-bold text-neon-green">R$ {parseFloat(amount).toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground mb-2">Chave PIX (Email)</p>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
              <p className="flex-1 text-sm text-foreground break-all">{pixKey}</p>
              <button onClick={handleCopy} className="text-neon-orange">
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Envie o valor exato via PIX e clique em "Já Paguei"
            </p>
          </CardContent>
        </Card>

        <Button onClick={handlePaid} className="w-full gradient-orange font-bold uppercase glow-orange">
          <CheckCircle className="mr-2 h-5 w-5" />
          Já Paguei
        </Button>
        <Button onClick={() => setStep("amount")} variant="outline" className="w-full border-border">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <KycModal
        open={showKyc}
        onClose={() => setShowKyc(false)}
        onSuccess={() => { setShowKyc(false); setStep("pix"); }}
      />
      <p className="text-sm text-muted-foreground">Escolha o valor para depositar (mínimo R$ 15):</p>
      <div className="grid grid-cols-3 gap-2">
        {[15, 20, 50, 100, 200, 500].map((v) => (
          <Button
            key={v}
            variant={amount === String(v) ? "default" : "outline"}
            className={`border-border ${amount === String(v) ? "gradient-orange" : "bg-card"}`}
            onClick={() => setAmount(String(v))}
          >
            R$ {v}
          </Button>
        ))}
      </div>
      <Input
        placeholder="Outro valor (mín. R$ 15)"
        type="number"
        min={15}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="bg-secondary border-border"
      />
      <Button
        onClick={handleContinueDeposit}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full gradient-orange font-bold uppercase glow-orange"
      >
        <ArrowUpCircle className="mr-2 h-5 w-5" />
        Continuar
      </Button>
    </div>
  );
}

function WithdrawTab() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);

  const handleWithdraw = async () => {
    if (!user) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast({ variant: "destructive", title: "Preencha um valor válido" });
      return;
    }
    if (val < 20) {
      toast({ variant: "destructive", title: "Saque mínimo é R$ 20,00" });
      return;
    }
    const currentBalance = Number(profile?.saldo ?? 0);
    if (val > currentBalance) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: `Seu saldo é R$ ${currentBalance.toFixed(2)}. Você não pode sacar mais do que tem.` });
      return;
    }
    // Double-check: resulting balance must not be negative
    if (currentBalance - val < 0) {
      toast({ variant: "destructive", title: "Operação bloqueada", description: "Saque resultaria em saldo negativo." });
      return;
    }
    if (!profile?.cpf) {
      toast({ variant: "destructive", title: "CPF não cadastrado", description: "Faça um depósito primeiro para registrar seu CPF." });
      return;
    }
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id, type: "withdraw", amount: val, status: "pending",
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      await supabase.from("audit_logs").insert({
        admin_id: user.id,
        action_type: "withdraw_request",
        details: `Jogador ${profile?.nickname} solicitou saque de R$${val.toFixed(2)} (Saldo antes: R$${currentBalance.toFixed(2)})`
      });
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Clock className="h-16 w-16 text-neon-orange mb-4" />
        <h3 className="text-lg font-bold text-foreground">Saque Solicitado</h3>
        <p className="text-sm text-muted-foreground mt-2">Aguarde a aprovação do administrador.</p>
        <Button onClick={() => { setDone(false); setAmount(""); }} variant="outline" className="mt-6 border-border">
          Nova Solicitação
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <Card className="border-border bg-card">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Saldo Disponível</p>
          <p className="text-xl font-bold text-neon-green">R$ {(profile?.saldo ?? 0).toFixed(2).replace(".", ",")}</p>
        </CardContent>
      </Card>
      {profile?.cpf && (
        <div className="bg-secondary p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">CPF cadastrado: <span className="text-foreground font-bold">{profile.cpf}</span></p>
        </div>
      )}
      <Input placeholder="Valor do saque (mín. R$ 20)" type="number" min={20} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border" />
      <Button onClick={handleWithdraw} className="w-full gradient-orange font-bold uppercase glow-orange">
        <ArrowDownCircle className="mr-2 h-5 w-5" />
        Solicitar Saque
      </Button>
    </div>
  );
}

function HistoryTab() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setTransactions(data);
    });
  }, [user]);

  const statusColor = (s: string) => s === "approved" ? "text-neon-green" : s === "rejected" ? "text-destructive" : "text-yellow-400";
  const statusLabel = (s: string) => s === "approved" ? "Aprovado" : s === "rejected" ? "Rejeitado" : "Pendente";
  const typeLabel = (t: string) => t === "deposit" ? "Depósito" : t === "withdraw" ? "Saque" : "Inscrição";

  return (
    <div className="space-y-3 pt-4">
      {transactions.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma transação</p>}
      {transactions.map((tx) => (
        <Card key={tx.id} className="border-border bg-card">
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{typeLabel(tx.type)}</p>
              <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">R$ {Number(tx.amount).toFixed(2)}</p>
              <p className={`text-xs font-bold ${statusColor(tx.status)}`}>{statusLabel(tx.status)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

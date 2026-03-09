import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Mail, Lock, User, AlertTriangle, Loader2, Check, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { performBiometricVerification } from "@/utils/webauthn";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = searchParams.get("ref");

  // Persist refId so it survives page refreshes
  useEffect(() => {
    if (refId) localStorage.setItem("pending_referral", refId);
  }, [refId]);
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Estados de Controle
  const [view, setView] = useState<"login" | "register" | "reset">("login");
  const [isOver18, setIsOver18] = useState(false);

  // Estado para Modais Legais (Termos e Privacidade)
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  // Estados de Biometria
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const hasBiometricSetup = localStorage.getItem("biometrics_enabled") === "true";

  // --- 1. LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Erro ao entrar", { description: "Verifique seu e-mail e senha." });
    } else {
      // Check for pending referral from signup
      const pendingRef = localStorage.getItem("pending_referral");
      if (pendingRef) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("referrals").insert({
              referrer_id: pendingRef,
              referred_id: user.id,
              status: "pending",
            });
          }
        } catch (_) { /* ignore if already exists */ }
        localStorage.removeItem("pending_referral");
      }
      // Fetch global settings
      const { data: adminSettings } = await supabase.from('admin_security_settings').select('key_name, is_active').eq('key_name', 'bio_login').maybeSingle();
      const bioLoginActive = adminSettings?.is_active ?? true;

      toast.success("Login realizado com sucesso!");
      if (!hasBiometricSetup && bioLoginActive) {
        setShowBiometricSetup(true);
      } else {
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    toast.loading("Iniciando reconhecimento facial/digital...");
    const success = await performBiometricVerification("authenticate");
    toast.dismiss();
    if (success) {
      toast.success("Autenticado via DNA Digital com sucesso!");
      navigate("/dashboard");
    } else {
      toast.error("Leitura biométrica recusada.");
    }
  };

  // --- 2. CADASTRO ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOver18) {
      toast.error("Idade Obrigatória", {
        description: "Você deve confirmar que é maior de 18 anos.",
        icon: <AlertTriangle className="text-red-500" />
      });
      return;
    }

    setLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
    } else {
      // Save refId to localStorage so we can create the referral after first login
      if (refId) {
        localStorage.setItem("pending_referral", refId);
      }
      toast.success("Conta criada!", { description: "Verifique seu e-mail para confirmar." });
      setView("login");
    }
    setLoading(false);
  };

  // --- 3. RECUPERAÇÃO ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/update-password",
    });

    if (error) toast.error("Erro ao enviar", { description: error.message });
    else {
      toast.success("E-mail enviado!", { description: "Verifique sua caixa de entrada." });
      setView("login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4 py-8 font-sans text-white">

      {/* TELA DE CONFIGURAÇÃO DE BIOMETRIA */}
      {showBiometricSetup && (
        <div className="absolute inset-0 bg-[#09090b] z-50 flex items-center justify-center p-4">
          <Card className="bg-[#121212] border-white/10 p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(249,115,22,0.1)]">
            <Fingerprint className="h-20 w-20 text-orange-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
            <h2 className="text-2xl font-black uppercase text-white mb-2">Login Militar (Face ID)</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium">Deseja habilitar sua biometria para as próximas vezes? Sua conta ficará 100% à prova de roubos de senha.</p>
            <div className="space-y-3">
              <Button onClick={async () => {
                const verified = await performBiometricVerification("register");
                if (verified) {
                  localStorage.setItem("biometrics_enabled", "true");
                  toast.success("Cofre Biométrico Trancado! Segurança nível máximo ativada.", { duration: 4000 });
                  navigate("/dashboard");
                } else {
                  toast.error("Ocorreu um erro ao registrar sua Face/Digital");
                }
              }} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-12 uppercase tracking-widest">
                Ativar Escudo Biométrico
              </Button>
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-full text-gray-500 hover:text-white uppercase text-xs font-bold">
                Pular (Não Recomendado)
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="w-full max-w-md space-y-8">

        {/* LOGO PERSONALIZADA */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-black border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)] overflow-hidden p-1">
              <img
                src="https://i.ibb.co/LdDDvLTt/logo-real-fire-jpeg.jpg"
                alt="Real Fire Logo"
                className="h-full w-full object-cover rounded-2xl"
              />
            </div>
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-lg">
            REAL <span className="text-orange-500">F$RE</span>
          </h1>
          <p className="text-sm text-gray-400 font-medium tracking-wide mt-2">
            Torneios & Prêmios em Dinheiro Real
          </p>
        </div>

        <Card className="border border-white/10 bg-[#121212] shadow-2xl rounded-xl">

          {/* TELA: RECUPERAR SENHA */}
          {view === "reset" ? (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-orange-500 flex items-center gap-2">
                  <button onClick={() => setView("login")} className="hover:bg-white/10 p-1 rounded-full transition-colors"><ArrowLeft className="h-5 w-5 text-white" /></button>
                  Recuperar Senha
                </CardTitle>
                <CardDescription className="text-gray-400">Digite seu e-mail para receber o link.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">E-mail Cadastrado</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-9 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 uppercase tracking-wide" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Link"}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (

            /* TELA: LOGIN / CADASTRO */
            <Tabs defaultValue="login" className="w-full" onValueChange={(val) => setView(val as "login" | "register")}>
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a] p-1 rounded-lg">
                  <TabsTrigger value="login" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-bold text-xs py-2">Entrar</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white uppercase font-bold text-xs py-2">Criar Conta</TabsTrigger>
                </TabsList>
              </div>

              {/* ABA LOGIN */}
              <TabsContent value="login" className="mt-0">
                <CardContent className="pt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs uppercase font-bold">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                        <Input type="email" placeholder="Seu e-mail" className="pl-9 bg-[#1a1a1a] border-white/5 text-white placeholder:text-gray-600 focus:border-orange-500 h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs uppercase font-bold">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                        <Input type="password" placeholder="Sua senha" className="pl-9 bg-[#1a1a1a] border-white/5 text-white placeholder:text-gray-600 focus:border-orange-500 h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-12 uppercase tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.4)] mt-2" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "ENTRAR NA ARENA"}
                    </Button>

                    {hasBiometricSetup && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-700">
                        <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-white/5"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-600 text-[10px] uppercase font-bold tracking-widest">OU SUPER RÁPIDO</span>
                          <div className="flex-grow border-t border-white/5"></div>
                        </div>
                        <Button type="button" onClick={handleBiometricLogin} className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-orange-500/30 text-orange-400 font-black h-12 uppercase tracking-wider transition-all hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                          <Fingerprint className="mr-2 h-5 w-5" /> ENTRAR COM BIOMETRIA
                        </Button>
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <button type="button" onClick={() => setView("reset")} className="text-xs text-gray-500 hover:text-orange-500 transition-colors">
                        Esqueceu a senha? <span className="underline">Recuperar</span>
                      </button>
                    </div>
                  </form>
                </CardContent>
              </TabsContent>

              {/* ABA CADASTRO */}
              <TabsContent value="register" className="mt-0">
                <CardContent className="pt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs uppercase font-bold">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Nome real" className="pl-9 bg-[#1a1a1a] border-white/5 text-white placeholder:text-gray-600 focus:border-orange-500 h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs uppercase font-bold">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                        <Input type="email" placeholder="Melhor e-mail" className="pl-9 bg-[#1a1a1a] border-white/5 text-white placeholder:text-gray-600 focus:border-orange-500 h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs uppercase font-bold">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                        <Input type="password" placeholder="Crie uma senha" className="pl-9 bg-[#1a1a1a] border-white/5 text-white placeholder:text-gray-600 focus:border-orange-500 h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                    </div>

                    {/* CONFIRMAÇÃO DE IDADE */}
                    <div
                      className="flex items-center space-x-3 rounded-lg border border-white/5 bg-[#1a1a1a] p-3 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setIsOver18(!isOver18)}
                    >
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isOver18 ? "bg-orange-500 border-orange-500" : "border-gray-500"}`}>
                        {isOver18 && <Check className="h-3 w-3 text-black font-bold" />}
                      </div>
                      <Label className="text-xs text-gray-400 cursor-pointer pointer-events-none">
                        Declaro que sou <span className="font-bold text-white">maior de 18 anos</span> e aceito os termos.
                      </Label>
                    </div>

                    <Button type="submit" className="w-full bg-white hover:bg-gray-200 text-black font-black h-12 uppercase tracking-wider mt-2" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "CRIAR CONTA"}
                    </Button>

                    {/* LINKS PARA TERMOS E PRIVACIDADE */}
                    <div className="text-center pt-2 text-[10px] text-gray-500 space-y-1">
                      <p>Ao se cadastrar, você concorda com nossos:</p>
                      <div className="flex justify-center gap-2">
                        <span onClick={() => setLegalModal("terms")} className="cursor-pointer text-orange-500 hover:underline">Termos de Uso</span>
                        <span>&</span>
                        <span onClick={() => setLegalModal("privacy")} className="cursor-pointer text-orange-500 hover:underline">Política de Privacidade</span>
                      </div>
                    </div>

                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          )}

          <CardFooter className="justify-center border-t border-white/5 pt-4">
            <p className="text-xs text-gray-500">
              © 2026 Real Fire. Todos os direitos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* --- MODAL DE TERMOS DE USO --- */}
      <Dialog open={legalModal === "terms"} onOpenChange={() => setLegalModal(null)}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-neon-orange">Termos de Uso</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-2">
            <div><h3 className="text-orange-500 font-bold mb-1">1. Aceitação e Elegibilidade</h3><p>O uso deste aplicativo é estritamente reservado para maiores de 18 anos. Ao realizar o cadastro, você declara estar em plena capacidade civil e concorda integralmente com estes termos.</p></div>
            <div><h3 className="text-orange-500 font-bold mb-1">2. Regras de Conduta e Fair Play</h3><p>Prezamos pelo jogo limpo. O uso de hacks, macros, bugs, emuladores não autorizados ou qualquer vantagem desleal resultará em banimento permanente e perda irrevogável do saldo em conta.</p></div>
            <div><h3 className="text-orange-500 font-bold mb-1">3. Gestão de Saldo e Pagamentos</h3><p>Os depósitos são destinados exclusivamente para a participação em torneios. Os saques serão processados via PIX, unicamente para contas bancárias de mesma titularidade do CPF cadastrado, em até 48 horas úteis.</p></div>
            <div><h3 className="text-orange-500 font-bold mb-1">4. Propriedade Intelectual</h3><p>Todo o conteúdo, design e código deste aplicativo são propriedade exclusiva da Real Fire. É proibida a cópia, engenharia reversa ou distribuição não autorizada.</p></div>
            <div><h3 className="text-orange-500 font-bold mb-1">5. Limitação de Responsabilidade</h3><p>A Real Fire não se responsabiliza por instabilidades na conexão de internet do usuário, falhas nos servidores do jogo (Free Fire) ou manutenções programadas que afetem o andamento das partidas.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setLegalModal(null)} className="w-full bg-white/10 hover:bg-white/20">Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE POLÍTICA DE PRIVACIDADE --- */}
      <Dialog open={legalModal === "privacy"} onOpenChange={() => setLegalModal(null)}>
        <DialogContent className="border-white/10 bg-[#09090b] text-white w-[95%] rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-neon-orange">Política de Privacidade</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-400 space-y-4 leading-relaxed p-2">
            <div><h3 className="text-green-500 font-bold mb-1">1. Coleta de Dados</h3><p>Coletamos minimamente seu Nome Completo, CPF e E-mail. Também podemos coletar dados técnicos do dispositivo (IP, modelo) para fins de segurança e prevenção de fraudes.</p></div>
            <div><h3 className="text-green-500 font-bold mb-1">2. Finalidade do Tratamento</h3><p>Seus dados são utilizados exclusivamente para: validação de identidade (KYC), processamento de pagamentos e saques (PIX), suporte ao cliente e comunicação sobre torneios.</p></div>
            <div><h3 className="text-green-500 font-bold mb-1">3. Segurança da Informação</h3><p>Adotamos práticas rigorosas de segurança, incluindo criptografia de ponta a ponta e servidores protegidos. Recomendamos que nunca compartilhe sua senha com terceiros.</p></div>
            <div><h3 className="text-green-500 font-bold mb-1">4. Compartilhamento de Dados</h3><p>Não vendemos nem alugamos seus dados pessoais. O compartilhamento ocorre apenas com gateways de pagamento estritamente necessários para processar suas transações financeiras.</p></div>
            <div><h3 className="text-green-500 font-bold mb-1">5. Seus Direitos (LGPD)</h3><p>Você tem o direito de solicitar o acesso, correção ou exclusão dos seus dados pessoais a qualquer momento, entrando em contato através da nossa aba de Ajuda e Suporte.</p></div>
          </div>
          <DialogFooter><Button onClick={() => setLegalModal(null)} className="w-full bg-white/10 hover:bg-white/20">Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

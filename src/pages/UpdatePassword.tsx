import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Erro ao atualizar senha", { description: error.message });
    } else {
      toast.success("Senha atualizada com sucesso!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4 py-8 font-sans text-white">
      <div className="w-full max-w-md space-y-8">
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
        </div>

        <Card className="border border-white/10 bg-[#121212] shadow-2xl rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-orange-500 flex items-center gap-2">
              <Lock className="h-5 w-5" /> Nova Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!sessionReady ? (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                <p className="text-sm text-gray-400">Verificando link de recuperação...</p>
                <p className="text-xs text-gray-600">Se demorar, o link pode ter expirado. Solicite um novo.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-xs text-green-400">Link verificado! Defina sua nova senha.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs uppercase font-bold">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-9 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs uppercase font-bold">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="password"
                      placeholder="Repita a senha"
                      className="pl-9 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500 h-11"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-12 uppercase tracking-wider shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "SALVAR NOVA SENHA"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="justify-center border-t border-white/5 pt-4">
            <p className="text-xs text-gray-500">© 2026 Real Fire. Todos os direitos reservados.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

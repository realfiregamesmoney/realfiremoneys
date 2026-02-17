import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

interface KycModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function KycModal({ open, onClose, onSuccess }: KycModalProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cpf) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          cpf: cpf,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Dados salvos com sucesso!" });
      await refreshProfile(); // Atualiza os dados no sistema
      onSuccess();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white w-[95%] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <ShieldCheck className="h-5 w-5" />
            Verificação Obrigatória
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Para realizar depósitos e saques, precisamos do seu nome real e CPF para identificar suas transferências PIX.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase font-bold text-gray-500">Nome Completo</Label>
            <Input
              id="name"
              placeholder="Nome idêntico ao do banco"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-black border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf" className="text-xs uppercase font-bold text-gray-500">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="bg-black border-white/10 text-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "SALVAR E CONTINUAR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

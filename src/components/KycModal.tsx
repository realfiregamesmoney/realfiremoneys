import { useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface KycModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11;
}

export default function KycModal({ open, onClose, onSuccess }: KycModalProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim() || fullName.trim().length < 5) {
      toast({ variant: "destructive", title: "Digite seu nome completo" });
      return;
    }
    if (!validateCpf(cpf)) {
      toast({ variant: "destructive", title: "CPF inválido", description: "Digite os 11 dígitos do CPF" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), cpf: cpf.replace(/\D/g, "") })
      .eq("user_id", user.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      await refreshProfile();
      // Log KYC completion
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        action_type: 'kyc_complete',
        details: `Jogador completou KYC: Nome=${fullName.trim()}, CPF registrado`
      });
      toast({ title: "Dados salvos com sucesso! ✅" });
      onSuccess();
    }
    setSaving(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="border-neon-orange bg-card max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-neon-orange">
            <Lock className="h-5 w-5" /> Verificação Obrigatória
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Para sua segurança, precisamos verificar sua identidade antes do primeiro depósito.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">
              Esses dados são para sua segurança e saque. <strong>Não poderão ser alterados depois.</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nome Completo</Label>
            <Input
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-secondary border-border"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">CPF</Label>
            <Input
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              className="bg-secondary border-border"
              maxLength={14}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            disabled={saving}
            className="gradient-orange font-bold uppercase glow-orange"
          >
            {saving ? "Salvando..." : "Confirmar Dados"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

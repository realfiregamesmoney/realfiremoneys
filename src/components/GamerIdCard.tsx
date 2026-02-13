import { useState, useRef } from "react";
import { Gamepad2, Upload, Camera, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function GamerIdCard() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [freefireId, setFreefireId] = useState(profile?.freefire_id ?? "");
  const [freefireNick, setFreefireNick] = useState(profile?.freefire_nick ?? "");
  const [freefireLevel, setFreefireLevel] = useState(profile?.freefire_level?.toString() ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(profile?.freefire_proof_url ?? null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLinked = !!profile?.freefire_id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Máximo 5MB" });
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!freefireId.trim() || !freefireNick.trim()) {
      toast({ variant: "destructive", title: "Preencha ID e Nickname" });
      return;
    }

    setSaving(true);
    let proofUrl = profile?.freefire_proof_url ?? null;

    // Upload proof image if new file selected
    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const path = `${user.id}/proof-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile_proofs")
        .upload(path, proofFile, { upsert: true });

      if (upErr) {
        toast({ variant: "destructive", title: "Erro no upload", description: upErr.message });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("profile_proofs").getPublicUrl(path);
      proofUrl = urlData.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        freefire_id: freefireId.trim(),
        freefire_nick: freefireNick.trim(),
        freefire_level: freefireLevel ? parseInt(freefireLevel) : null,
        freefire_proof_url: proofUrl,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      await refreshProfile();
      toast({ title: "Conta vinculada com sucesso! 🎮" });
    }
    setSaving(false);
  };

  return (
    <Card className="border-neon-orange relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(0 0% 7%), hsl(20 30% 8%))" }}>
      {/* Badge decoration */}
      <div className="absolute right-0 top-0 h-20 w-20 opacity-10">
        <Gamepad2 className="h-20 w-20 text-neon-orange" />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neon-orange">
          <Gamepad2 className="h-4 w-4" />
          Identidade Gamer
          {isLinked && <CheckCircle className="h-4 w-4 text-neon-green" />}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Vincule sua conta do Free Fire para participar dos torneios</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">ID do Free Fire</Label>
          <Input
            placeholder="Ex: 123456789"
            value={freefireId}
            onChange={(e) => setFreefireId(e.target.value.replace(/\D/g, ""))}
            className="border-border bg-secondary font-mono"
            maxLength={20}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nickname (exato)</Label>
          <Input
            placeholder="Seu nick no Free Fire"
            value={freefireNick}
            onChange={(e) => setFreefireNick(e.target.value)}
            className="border-border bg-secondary"
            maxLength={50}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nível da Conta</Label>
          <Input
            placeholder="Ex: 65"
            type="number"
            value={freefireLevel}
            onChange={(e) => setFreefireLevel(e.target.value)}
            className="border-border bg-secondary"
            min={1}
            max={100}
          />
        </div>

        {/* Proof upload */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Print do Perfil (Prova)</Label>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-border bg-secondary text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4 text-neon-orange" />
            {proofFile ? proofFile.name : "Enviar Print do Perfil"}
          </Button>
          {proofPreview && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <img src={proofPreview} alt="Preview" className="h-32 w-full object-cover" />
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gradient-orange font-bold uppercase glow-orange"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : isLinked ? "Atualizar Conta" : "Vincular Conta"}
        </Button>
      </CardContent>
    </Card>
  );
}

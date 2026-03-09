import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function JumpingGame() {
    const [isLoading, setIsLoading] = useState(true);
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const hasConsumed = useRef(false);
    const oldHighScoreRef = useRef(0);
    const currentScoreRef = useRef(0);
    const lastSavedScoreRef = useRef(0);
    const notifiedRecordRef = useRef(false);
    const hasQuitRef = useRef(false);

    useEffect(() => {
        if (!user) {
            navigate("/minigames");
            return;
        }

        const consumeRaceAndInit = async () => {
            if (hasConsumed.current) return;
            hasConsumed.current = true;

            const { data: currentProfile } = await supabase.from("profiles").select("passes_available").eq("user_id", user.id).single();
            if (!currentProfile || (currentProfile.passes_available || 0) <= 0) {
                toast.error("Motor frio! Adquira mais corridas na loja.");
                navigate("/minigames");
                return;
            }

            try {
                // Fetch highest score for tracking
                const { data: previousScores } = await supabase.from("transactions")
                    .select("amount")
                    .eq("user_id", user.id)
                    .eq("type", "race_score")
                    .order("amount", { ascending: false })
                    .limit(1);

                oldHighScoreRef.current = previousScores && previousScores.length > 0 ? previousScores[0].amount : 0;
                lastSavedScoreRef.current = oldHighScoreRef.current;

                // Consome a corrida
                const newRaces = Math.max(0, currentProfile.passes_available - 1);
                await supabase.from("profiles").update({ passes_available: newRaces }).eq("user_id", user.id);
                await refreshProfile();
                toast.success("-1 Passe de Corrida. Acelere!");
            } catch (e) {
                navigate("/minigames");
            }
        };

        consumeRaceAndInit();

        // Salva pontos a cada 3 segundos se bater ou aumentar o recorde 
        // Isso resolve o problema de fechar a aba/sair da corrida e perder pontos.
        const saveInterval = setInterval(() => {
            if (currentScoreRef.current > lastSavedScoreRef.current) {
                const scoreToSave = currentScoreRef.current;
                lastSavedScoreRef.current = scoreToSave;
                oldHighScoreRef.current = scoreToSave;

                supabase.from("transactions").insert({
                    user_id: user.id,
                    type: 'race_score',
                    amount: scoreToSave,
                    status: 'approved'
                }).then();

                if (!notifiedRecordRef.current) {
                    toast.success("🔥 Novo Recorde Atingido!");
                    notifiedRecordRef.current = true;
                }
            }
        }, 3000);

        const handleMessage = async (event: MessageEvent) => {
            if (!event.data) return;

            if (event.data.type === 'SCORE_UPDATE') {
                currentScoreRef.current = event.data.score || 0;
            }

            if (event.data.type === 'TRY_AGAIN_REQUEST') {
                console.log("[DEBUG] Botão Tentar Novamente clicado.");
                const { data: currentProfile, error: fetchError } = await supabase.from("profiles").select("passes_available").eq("user_id", user.id).single();

                if (fetchError) {
                    console.error("[DEBUG] Erro ao ler perfil:", fetchError);
                    return;
                }

                console.log("[DEBUG] Saldo de passes antes de cobrar:", currentProfile?.passes_available);

                if (currentProfile && (currentProfile.passes_available || 0) > 0) {
                    console.log("[DEBUG] Iniciando cobrança de 1 passe...");
                    const newRaces = currentProfile.passes_available - 1;
                    const { error: updateError } = await supabase.from("profiles").update({ passes_available: newRaces }).eq("user_id", user.id);

                    if (updateError) {
                        console.error("[DEBUG] Falha na cobrança do passe:", updateError);
                        toast.error("Erro ao processar cobrança.");
                        return;
                    }

                    await refreshProfile();
                    console.log("[DEBUG] Passe cobrado com sucesso. Saldo atualizado.");

                    // Reset do tracking de recorde para proxima run
                    const { data: previousScores } = await supabase.from("transactions")
                        .select("amount")
                        .eq("user_id", user.id)
                        .eq("type", "race_score")
                        .order("amount", { ascending: false })
                        .limit(1);
                    oldHighScoreRef.current = previousScores && previousScores.length > 0 ? previousScores[0].amount : 0;
                    lastSavedScoreRef.current = oldHighScoreRef.current;
                    currentScoreRef.current = 0;
                    notifiedRecordRef.current = false;

                    const iframe = document.querySelector('iframe');
                    if (iframe && iframe.contentWindow) {
                        console.log("[DEBUG] Enviando RESTART_ALLOWED para o iframe.");
                        iframe.contentWindow.postMessage({ type: 'RESTART_ALLOWED' }, '*');
                    }
                    toast.success("-1 Passe de Corrida. Nova Volta!");
                } else {
                    console.log("[DEBUG] Saldo insuficiente para reiniciar.");
                    const iframe = document.querySelector('iframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'RESTART_DENIED' }, '*');
                    }
                    toast.error("Motor frio! Adquira mais corridas na loja.");
                    navigate("/minigames");
                }
            }

            if (event.data.type === 'GAME_OVER') {
                const finalScore = event.data.score || 0;
                currentScoreRef.current = finalScore;

                // Força último save imediato caso seja Game Over
                if (currentScoreRef.current > lastSavedScoreRef.current) {
                    lastSavedScoreRef.current = currentScoreRef.current;
                    await supabase.from("transactions").insert({
                        user_id: user.id,
                        type: 'race_score',
                        amount: currentScoreRef.current,
                        status: 'approved'
                    });
                    toast.success(`NOVO RECORDE FINAL: ${finalScore} PONTOS! 🏆`);
                } else {
                    toast.info(`Corrida Finalizada. Você fez ${finalScore} PONTOS.`);
                }
            }

            if (event.data.type === 'QUIT_GAME') {
                const finalScore = currentScoreRef.current;
                if (finalScore > 0 && !hasQuitRef.current) {
                    hasQuitRef.current = true;
                    if (finalScore > lastSavedScoreRef.current) {
                        await supabase.from("transactions").insert({
                            user_id: user.id,
                            type: 'race_score',
                            amount: finalScore,
                            status: 'approved'
                        });
                        toast.success(`Pista abandonada! Novo Recorde Salvo: ${finalScore} PONTOS! 🏆`);
                    } else {
                        toast.info(`Pista abandonada. Você fez ${finalScore} PONTOS.`);
                    }
                }
                navigate("/minigames");
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('message', handleMessage);

            // Final save & toast when leaving the screen (unmounting)
            const finalScore = currentScoreRef.current;
            if (finalScore > 0 && !hasQuitRef.current) {
                hasQuitRef.current = true;
                if (finalScore > lastSavedScoreRef.current) {
                    supabase.from("transactions").insert({
                        user_id: user.id,
                        type: 'race_score',
                        amount: finalScore,
                        status: 'approved'
                    }).then();
                    toast.success(`Pista abandonada! Novo Recorde Salvo: ${finalScore} PONTOS! 🏆`);
                } else {
                    toast.info(`Pista abandonada. Você fez ${finalScore} PONTOS.`);
                }
            }
        };
    }, [user, navigate, profile]);

    return (
        <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col pointer-events-auto">

            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-[110]">
                    <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                    <h2 className="text-xl font-black italic uppercase text-white tracking-widest animate-pulse">
                        Iniciando Motor...
                    </h2>
                </div>
            )}

            {/* Game Iframe */}
            <iframe
                src="/minigames/jumping/index.html"
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                title="Jumping Game Engine"
                allow="autoplay"
            />
        </div>
    );
}

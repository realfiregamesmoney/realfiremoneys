import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ShootingGame() {
    const [isLoading, setIsLoading] = useState(true);
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const hasConsumed = useRef(false);
    const oldHighScoreRef = useRef(0);
    const currentScoreRef = useRef(0);
    const lastSavedScoreRef = useRef(0);
    const notifiedRecordRef = useRef(false);
    const hasQuitRef = useRef(false);
    const sessionIdRef = useRef<string | null>(null);

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
                // Busca a data do último reset
                const { data: resetConfig } = await supabase.from("app_settings").select("value").eq("key", "race_ranking_last_reset").single();
                const resetDate = resetConfig ? (typeof resetConfig.value === 'string' ? JSON.parse(resetConfig.value) : resetConfig.value) : '2000-01-01T00:00:00.000Z';

                // Fetch highest score for tracking (APENAS desta temporada após reset)
                const { data: previousScores } = await supabase.from("transactions")
                    .select("amount")
                    .eq("user_id", user.id)
                    .eq("type", "race_score")
                    .gt("created_at", resetDate)
                    .order("amount", { ascending: false })
                    .limit(1);

                oldHighScoreRef.current = previousScores && previousScores.length > 0 ? previousScores[0].amount : 0;
                lastSavedScoreRef.current = oldHighScoreRef.current;

                // 1. Consome a corrida (ESSENCIAL)
                const newRaces = Math.max(0, (currentProfile.passes_available || 0) - 1);
                await supabase.from("profiles").update({ passes_available: newRaces }).eq("user_id", user.id);
                refreshProfile(); // Não precisa de await aqui para o jogo carregar logo

                // 2. RASTREAMENTO DO ADMIN (OPCIONAL - Se falhar o jogo continua)
                try {
                    const { data: sessionData } = await supabase.from('minigame_sessions').insert({
                        user_id: user.id,
                        game_id: 'shooting_game',
                        status: 'active',
                        played_at: new Date().toISOString()
                    }).select('id').maybeSingle();

                    if (sessionData) sessionIdRef.current = sessionData.id;
                } catch (err) {
                    console.error("Erro ao rastrear sessão admin (ignorado):", err);
                }

                toast.success("-1 Passe de Corrida. Acelere!");
            } catch (e) {
                console.error("Erro fatal ao iniciar jogo de tiro:", e);
                toast.error("Erro ao iniciar corrida. Tente novamente.");
                navigate("/minigames");
            }
        };

        consumeRaceAndInit();

        // O saveInterval foi removido para evitar poluir o histórico do admin.
        // Agora os pontos são salvos apenas ao final de cada crédito/vida.

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

                    // SALVA O PONTO FINAL DO CRÉDITO ANTERIOR ANTES DE REINICIAR
                    const finalScorePrev = currentScoreRef.current;
                    if (finalScorePrev > 0) {
                        await supabase.from("transactions").insert({
                            user_id: user.id,
                            type: 'race_score',
                            amount: finalScorePrev,
                            status: 'approved'
                        });

                        if (sessionIdRef.current) {
                            await supabase.from('minigame_sessions')
                                .update({ status: 'finished', score: finalScorePrev })
                                .eq('id', sessionIdRef.current);
                        }
                    }

                    // CRIA NOVA SESSÃO PARA O NOVO CRÉDITO
                    const { data: newSession } = await supabase.from('minigame_sessions').insert({
                        user_id: user.id,
                        game_id: 'shooting_game',
                        status: 'active',
                        played_at: new Date().toISOString()
                    }).select('id').single();
                    if (newSession) sessionIdRef.current = newSession.id;

                    // Reset do tracking de recorde para proxima run
                    oldHighScoreRef.current = Math.max(oldHighScoreRef.current, finalScorePrev);
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

                // Força save final APENAS se houver ponto
                if (currentScoreRef.current > 0) {
                    await supabase.from("transactions").insert({
                        user_id: user.id,
                        type: 'race_score',
                        amount: currentScoreRef.current,
                        status: 'approved'
                    });

                    // Atualiza sessão no admin
                    if (sessionIdRef.current) {
                        await supabase.from('minigame_sessions')
                            .update({ status: 'finished', score: currentScoreRef.current })
                            .eq('id', sessionIdRef.current);
                    }
                    toast.success(`Corrida Finalizada: ${finalScore} PONTOS! 🏁`);
                } else {
                    toast.info(`Corrida Finalizada. Tente novamente!`);
                }
            }

            if (event.data.type === 'QUIT_GAME') {
                const finalScore = currentScoreRef.current;
                if (finalScore > 0 && !hasQuitRef.current) {
                    hasQuitRef.current = true;
                    if (finalScore > 0) {
                        await supabase.from("transactions").insert({
                            user_id: user.id,
                            type: 'race_score',
                            amount: finalScore,
                            status: 'approved'
                        });

                        // Atualiza sessão no admin
                        if (sessionIdRef.current) {
                            await supabase.from('minigame_sessions')
                                .update({ status: 'finished', score: finalScore })
                                .eq('id', sessionIdRef.current);
                        }
                        toast.success(`Pista abandonada! Pontuação: ${finalScore} PONTOS.`);
                    } else {
                        toast.info(`Pista abandonada.`);
                    }
                }
                navigate("/minigames");
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);

            // Final save & toast when leaving the screen (unmounting)
            const finalScore = currentScoreRef.current;
            if (finalScore > 0 && !hasQuitRef.current) {
                hasQuitRef.current = true;
                supabase.from("transactions").insert({
                    user_id: user.id,
                    type: 'race_score',
                    amount: finalScore,
                    status: 'approved'
                }).then();

                if (sessionIdRef.current) {
                    supabase.from('minigame_sessions')
                        .update({ status: 'finished', score: finalScore })
                        .eq('id', sessionIdRef.current).then();
                }
            }
            toast.info(`Pista abandonada. Você fez ${finalScore} PONTOS.`);
        };
    }, [user, navigate]);

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
                src="/minigames/shooting/index.html"
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                title="Shooting Game Engine"
                allow="autoplay"
            />
        </div>
    );
}

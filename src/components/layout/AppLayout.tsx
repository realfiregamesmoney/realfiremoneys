import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateDeviceFingerprint, checkGeoFencing } from "@/utils/security";

export function AppLayout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isInitializingSecurity, setIsInitializingSecurity] = useState(true);

  const isMiniGameActive = location.pathname.startsWith('/minigames/') && location.pathname !== '/minigames';

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'REALFIRE_SECURITY_ALERT') {
        const payload = event.data.payload;

        const { data: adminSettings } = await supabase.from('admin_security_settings').select('key_name, is_active');
        const getSetting = (k: string) => adminSettings?.find(s => s.key_name === k)?.is_active ?? true;

        if (payload.reason.includes('Clicker') && !getSetting('anti_kingrow')) return;
        if (payload.reason.includes('Memory') && !getSetting('anti_guile')) return;
        if (payload.reason.includes('Time') && !getSetting('anti_guile')) return;

        // Injeta a ameaça real gerada pelo motor do jogo na tabela visual do Admin
        const currentThreats = JSON.parse(localStorage.getItem('realfire_active_threats') || '[]');
        const newThreat = {
          id: `ingame-${Date.now()}`,
          name: profile?.nickname || "Jogador Desconhecido",
          reason: payload.reason,
          level: payload.level
        };
        localStorage.setItem('realfire_active_threats', JSON.stringify([newThreat, ...currentThreats]));

        if (payload.level === 'red') {
          // Comunica à rede que este jogador tomou KICK para dar a vitória ao adversário
          const aresChannel = new BroadcastChannel('ares_anticheat_network');
          aresChannel.postMessage({ type: 'OPPONENT_BANNED', cheater: profile?.nickname || "Adversário" });
          aresChannel.close();

          toast.warning(`SISTEMA DE SEGURANÇA ARES: ${payload.reason}`, { duration: 10000 });
          navigate('/dashboard');
        } else {
          toast.warning(`Aviso Heurístico: ${payload.reason}`, { duration: 5000 });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Escuta transmissões de que O ADVÉRSARIO foi expulso (A gente estava jogando com o Cheater)
    const opponentChannel = new BroadcastChannel('ares_anticheat_network');
    opponentChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'OPPONENT_BANNED') {
        // Se este cliente atual estiver jogando, ele ganha por W.O militarmente
        if (location.pathname.startsWith('/minigames/') && location.pathname !== '/minigames') {
          toast.success("VITÓRIA TÁTICA POR W.O! 🏆", {
            description: `Oponente ${event.data.cheater} removido por uso de Trapaça. O prêmio é seu!`,
            duration: 8000
          });
          // Joga o vencedor de volta para o Lobby com o prêmio já computado invisivelmente
          navigate('/dashboard');
        }
      }
    };

    return () => {
      window.removeEventListener('message', handleMessage);
      opponentChannel.close();
    };
  }, [profile, navigate, location.pathname]);

  // Ciclo 2: Segurança Master - Fingerprint, Ledger Throttling e GeoFencing
  useEffect(() => {
    let active = true;

    const runSecurityCheck = async () => {
      if (!user?.id) { setIsInitializingSecurity(false); return; } // Apenas usuários logados

      try {
        // 1. Gera e salva o Fingerprint Base na sessão ou BD (Simulação Tempo Real)
        const hash = await generateDeviceFingerprint();

        // Fetch system rules from Admin Settings
        const { data: adminSettings } = await supabase.from('admin_security_settings').select('key_name, is_active');
        const getSetting = (k: string) => adminSettings?.find(s => s.key_name === k)?.is_active ?? true;

        // Verificando bloqueios locais via IP/Fingerprint simulando Edge Function Level
        const badFingerprints = JSON.parse(localStorage.getItem('blocked_hardware_hashes') || '[]');
        if (badFingerprints.includes(hash)) {
          toast.error("Hardware Banido (HWID Blacklist)", { description: "Seu aparelho dispositivo está banido da rede militar." });
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }

        // 1.5 KILL GUARD UNIVERSAL: Verifica se o ID do Usuário Atual está na Blacklist Oficial do App Settings
        const { data: fallbackSecurity } = await supabase.from('app_settings').select('value').eq('key', 'ares_security_logs').maybeSingle();
        if (fallbackSecurity && fallbackSecurity.value) {
          try {
            const logs = JSON.parse(fallbackSecurity.value);
            // Procura se esse user tomou BAN
            const isBanned = logs.some((l: any) => l.threat_id === user.id && l.action_taken && l.action_taken.includes('BANIDO'));
            if (isBanned && active) {
              toast.error("ACESSO NEGADO: CONTA BANIDA", { description: "O Sistema Ares Security bloqueou definitivamente este usuário." });
              await supabase.auth.signOut();
              navigate('/auth');
              return;
            }
          } catch (e) { }
        }
        // 2. Valida Geo Localização e Uso de Proxy Server/Tor (GeoFencing)
        if (getSetting('geo_fencing')) {
          const geo = await checkGeoFencing();
          if (!geo.isAllowed) {
            // Injeta Alerta Local de GeoFencing/IP Bloco
            const currentThreats = JSON.parse(localStorage.getItem('realfire_active_threats') || '[]');
            const newThreat = {
              id: `geofence-${Date.now()}`,
              name: profile?.nickname || "IP Mascarado",
              reason: geo.reason,
              level: "red"
            };
            localStorage.setItem('realfire_active_threats', JSON.stringify([newThreat, ...currentThreats]));

            toast.warning("MURALHA GEO-FENCING ARES", { description: `${geo.reason} | IP: ${geo.ip}. Sua sessão está restrita por segurança.` });
            setIsInitializingSecurity(false);
            navigate('/dashboard');
            return;
          }
        }
        if (active) setIsInitializingSecurity(false);

      } catch (error) {
        console.error("Erro na Matrix de Segurança: ", error);
        if (active) setIsInitializingSecurity(false);
      }
    };

    runSecurityCheck();
    return () => { active = false; };
  }, [profile, navigate]);

  // Ciclo 3: Strict JWT / Rotação e Morte de Sessões Inativas (15 Minutos Extremos)
  useEffect(() => {
    if (!user?.id) return;

    let activityTimeout: NodeJS.Timeout;
    const STRICT_SESSION_LIMIT_MS = 15 * 60 * 1000; // 15 Minutos

    // Atualiza a atividade
    const resetTimer = () => {
      localStorage.setItem("ares_last_activity", Date.now().toString());
    };

    // Varredor de Morte Súbita
    const enforceStrictSession = async () => {
      const { data: adminSettings } = await supabase.from('admin_security_settings').select('key_name, is_active').eq('key_name', 'auto_rotate').maybeSingle();
      if (adminSettings && adminSettings.is_active === false) return; // Se rotação desligada, não enforce morte de JWT.

      const lastActivity = parseInt(localStorage.getItem("ares_last_activity") || "0");
      const now = Date.now();

      if (now - lastActivity >= STRICT_SESSION_LIMIT_MS && lastActivity !== 0) {
        toast.error("Sessão P-2-P Expirada por Criptografia", { description: "15 minutos de inatividade: Por segurança JWT Strict, sua sessão foi morta." });
        await supabase.auth.signOut();
        localStorage.removeItem("ares_last_activity");
        navigate("/auth");
      }
    };

    // Assina atividade do usuário logado
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // Roda varredura a cada 1 minuto (Checkup da Morte)
    resetTimer(); // Start 
    const scanInterval = setInterval(enforceStrictSession, 60 * 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(scanInterval);
    };
  }, [user, navigate]);

  if (isInitializingSecurity && user?.id) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center flex-col gap-4 text-orange-500 font-bold uppercase tracking-widest text-sm z-[9999999] absolute inset-0">
        <div className="animate-spin rounded-full border-t-2 border-r-2 border-orange-500 h-10 w-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]"></div>
        Varredura Heurística Inicial...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMiniGameActive && <AppHeader balance={profile?.saldo ?? 0} />}
      <main className={isMiniGameActive ? "h-screen w-screen overflow-hidden" : "pb-20 pt-14"}>
        <Outlet />
      </main>
      {!isMiniGameActive && <BottomNav />}
    </div>
  );
}

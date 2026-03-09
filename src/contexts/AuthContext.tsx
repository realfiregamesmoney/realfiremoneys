import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  profile: {
    nickname: string;
    saldo: number;
    nivel: number;
    avatar_url: string | null;
    full_name: string | null;
    cpf: string | null;
    freefire_id: string | null;
    freefire_nick: string | null;
    freefire_level: number | null;
    freefire_proof_url: string | null;
    email: string | null;
    total_winnings: number;
    tournaments_played: number;
    victories: number;
    user_id: string;
    is_chat_banned: boolean;
    is_app_banned: boolean;
    is_balance_locked: boolean;
    plan_type: string | null;
    pass_value: number | null;
    passes_available: number | null;
    active_patent?: {
      image_url: string;
      position: 'left' | 'right';
    } | null;
  } | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  profile: null,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchProfile = async (userId: string) => {
    // Busca dados básicos separadamente para garantir carregamento mesmo sem tabelas de conquistas
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(`
        nickname, saldo, nivel, avatar_url, full_name, cpf, freefire_id, freefire_nick, 
        freefire_level, freefire_proof_url, total_winnings, tournaments_played, victories, 
        user_id, is_chat_banned, is_app_banned, is_balance_locked,
        plan_type, pass_value, passes_available, email
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Erro ao carregar perfil:", profileError);
      return;
    }

    // [SINCRONIZAÇÃO OBRIGATÓRIA DE E-MAIL]
    const authUser = (await supabase.auth.getUser()).data.user;
    if (authUser?.email && profileData && !profileData.email) {
      console.log("Sincronizando e-mail oficial no Dossiê...");
      await supabase.from("profiles").update({ email: authUser.email }).eq("user_id", userId);
      profileData.email = authUser.email;
    }

    if (profileData) {
      let active_patent = null;
      let active_badge = null;
      try {
        // Busca conquistas ativas (pode ser uma patente e um troféu/medalha simultaneamente)
        const { data: achievements } = await supabase
          .from("user_achievements")
          .select("is_active, achievements(image_url, type)")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (achievements) {
          achievements.forEach((ua: any) => {
            const ach = Array.isArray(ua.achievements) ? ua.achievements[0] : ua.achievements;
            if (ach) {
              if (ach.type === 'patent') {
                active_patent = { image_url: ach.image_url, type: 'patent' };
              } else if (ach.type === 'trophy' || ach.type === 'medal') {
                active_badge = { image_url: ach.image_url, type: ach.type };
              }
            }
          });
        }
      } catch (e) {
        console.warn("Erro ao buscar conquistas ativas:", e);
      }

      setProfile({
        ...profileData,
        active_patent,
        active_badge
      } as any);

      localStorage.setItem('rf_current_user', JSON.stringify({
        name: profileData.nickname || 'Anônimo',
        img: profileData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fallback&backgroundColor=ea580c'
      }));
    }
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    setIsAdmin(!!data && data.length > 0);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRole(session.user.id);
        }, 0);
        // Autentica o usuário no OneSignal para envio de campanhas ou notificações ativas
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(() => {
          window.OneSignal.login(session.user.id);
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        // Informa ao OneSignal que o user deslogou
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(() => {
          window.OneSignal.logout();
        });
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(() => {
          window.OneSignal.login(session.user.id);
        });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription para manter saldo sincronizado
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-balance-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Atualiza o profile com os dados mais recentes do banco
          const newData = payload.new as any;
          setProfile(prev => prev ? {
            ...prev,
            saldo: newData.saldo ?? prev.saldo,
            nickname: newData.nickname ?? prev.nickname,
            nivel: newData.nivel ?? prev.nivel,
            avatar_url: newData.avatar_url ?? prev.avatar_url,
            full_name: newData.full_name ?? prev.full_name,
            cpf: newData.cpf ?? prev.cpf,
            freefire_id: newData.freefire_id ?? prev.freefire_id,
            freefire_nick: newData.freefire_nick ?? prev.freefire_nick,
            freefire_level: newData.freefire_level ?? prev.freefire_level,
            freefire_proof_url: newData.freefire_proof_url ?? prev.freefire_proof_url,
            total_winnings: newData.total_winnings ?? prev.total_winnings,
            tournaments_played: newData.tournaments_played ?? prev.tournaments_played,
            victories: newData.victories ?? prev.victories,
            user_id: newData.user_id ?? prev.user_id,
            is_chat_banned: newData.is_chat_banned ?? prev.is_chat_banned,
            is_app_banned: newData.is_app_banned ?? prev.is_app_banned,
            is_balance_locked: newData.is_balance_locked ?? prev.is_balance_locked,
            plan_type: newData.plan_type ?? prev.plan_type,
            pass_value: newData.pass_value ?? prev.pass_value,
            passes_available: newData.passes_available ?? prev.passes_available,
            email: newData.email ?? prev.email,
          } : null);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = async () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(() => {
      window.OneSignal.logout();
    });
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

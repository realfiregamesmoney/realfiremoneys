import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    total_winnings: number;
    tournaments_played: number;
    victories: number;
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
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("nickname, saldo, nivel, avatar_url, full_name, cpf, freefire_id, freefire_nick, freefire_level, freefire_proof_url, total_winnings, tournaments_played, victories")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data as any);
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
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
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
            saldo: newData.saldo,
            nickname: newData.nickname,
            nivel: newData.nivel,
            avatar_url: newData.avatar_url,
            full_name: newData.full_name,
            cpf: newData.cpf,
            freefire_id: newData.freefire_id,
            freefire_nick: newData.freefire_nick,
            freefire_level: newData.freefire_level,
            freefire_proof_url: newData.freefire_proof_url,
            total_winnings: newData.total_winnings ?? prev.total_winnings,
            tournaments_played: newData.tournaments_played ?? prev.tournaments_played,
            victories: newData.victories ?? prev.victories,
          } : null);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

import { useState, useEffect } from "react";
import { Bell, Wallet, X, MessageSquare, Lightbulb, Settings } from "lucide-react";
import phoenixLogo from "@/assets/phoenix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/utils/notificationSound";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  balance?: number;
}

export function AppHeader({ balance = 0 }: AppHeaderProps) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
        playNotificationSound();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] flex h-14 items-center justify-between border-b border-white/10 bg-card/95 px-4 backdrop-blur-lg">
      <div className="flex items-center gap-2">
        <img src={phoenixLogo} alt="Real Fire" className="h-8 w-8 object-contain" />
        <span className="text-lg font-bold tracking-wider text-neon-orange">REAL FIRE</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
          <Wallet className="h-4 w-4 text-neon-green" />
          <span className="text-sm font-bold text-neon-green">
            R$ {balance.toFixed(2).replace(".", ",")}
          </span>
        </div>
        
        {/* BOTÃO DO SINO COM PRIORIDADE DE CLIQUE */}
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => { 
            e.preventDefault();
            e.stopPropagation();
            setShowPanel(!showPanel); 
            if (!showPanel) markAllRead(); 
          }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neon-orange text-[9px] font-bold text-black border-2 border-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* PAINEL DE NOTIFICAÇÕES ABAIXO DO SINO */}
      {showPanel && (
        <div className="absolute right-2 top-16 z-[1000] w-80 max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0c0c0c] shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0c0c0c]/90 p-3 backdrop-blur-md">
            <span className="text-sm font-bold text-white">Notificações</span>
            <div className="flex items-center gap-3">
              {/* ATALHO PARA CONFIGURAÇÕES (SÓ PARA ADMIN) */}
              {isAdmin && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/admin/notifications");
                    setShowPanel(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-md text-neon-orange transition-colors"
                  title="Configurações"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
              <button className="p-1 hover:bg-white/10 rounded-md" onClick={() => setShowPanel(false)}>
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="py-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-600 font-medium">
                Nenhuma notificação por aqui.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-4 border-b border-white/5 transition-colors ${!n.is_read ? 'bg-neon-orange/5' : 'hover:bg-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg ${n.type?.includes('support') ? 'bg-neon-orange/10' : 'bg-blue-500/10'}`}>
                      {n.type?.includes('support') ? (
                        <MessageSquare className="h-3.5 w-3.5 text-neon-orange" />
                      ) : (
                        <Lightbulb className="h-3.5 w-3.5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-200">{n.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-3">{n.message}</p>
                      <span className="text-[9px] text-gray-600 mt-2 block font-medium">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  );
}

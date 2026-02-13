import { useState, useEffect } from "react";
import { Bell, Wallet, X, MessageSquare, Lightbulb } from "lucide-react";
import phoenixLogo from "@/assets/phoenix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AppHeaderProps {
  balance?: number;
}

export function AppHeader({ balance = 0 }: AppHeaderProps) {
  const { user } = useAuth();
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
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-lg">
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
        <button
          className="relative p-1 text-muted-foreground hover:text-foreground"
          onClick={() => { setShowPanel(!showPanel); if (!showPanel) markAllRead(); }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neon-orange text-[9px] font-bold text-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-2 top-14 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-bold text-foreground">Notificações</span>
            <button onClick={() => setShowPanel(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Nenhuma notificação</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`border-b border-border p-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                <div className="flex items-start gap-2">
                  {n.type?.includes('support') ? (
                    <MessageSquare className="h-4 w-4 mt-0.5 text-neon-orange shrink-0" />
                  ) : (
                    <Lightbulb className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                    <span className="text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </header>
  );
}

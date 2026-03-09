import { LayoutDashboard, Trophy, ShoppingBag, User, Shield, MessageSquare, Zap, Gamepad2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Trophy, label: "Torneios", path: "/tournaments" },
  { icon: ShoppingBag, label: "Loja", path: "/store" },
  { icon: User, label: "Perfil", path: "/profile" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Zap, label: "Quiz Premiado", path: "/quiz" },
  { icon: Gamepad2, label: "Mini Jogos", path: "/minigames" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: "Admin", path: "/admin" }]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg pb-safe">
      <div className="flex h-16 items-center justify-start overflow-x-auto overflow-y-hidden px-4 gap-6 no-scrollbar snap-x">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-1 transition-colors min-w-[4.5rem] snap-center shrink-0",
                isActive ? "text-neon-orange" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(20,100%,50%)]")} />
              <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

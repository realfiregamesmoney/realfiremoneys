import { Bell, Wallet } from "lucide-react";
import phoenixLogo from "@/assets/phoenix-logo.png";

interface AppHeaderProps {
  balance?: number;
}

export function AppHeader({ balance = 0 }: AppHeaderProps) {
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
        <button className="relative p-1 text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-neon-orange" />
        </button>
      </div>
    </header>
  );
}

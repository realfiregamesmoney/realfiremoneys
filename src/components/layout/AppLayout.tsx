import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader balance={profile?.saldo ?? 0} />
      <main className="pb-20 pt-14">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

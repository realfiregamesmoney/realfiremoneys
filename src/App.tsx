import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentLobby from "./pages/TournamentLobby";
import Store from "./pages/Store";
import Profile from "./pages/Profile";
import Finance from "./pages/Finance";
import GlobalChat from "./pages/GlobalChat";
import Admin from "./pages/Admin";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import SubscriptionCheckout from "./pages/SubscriptionCheckout";
import Quiz from "./pages/Quiz";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/auth" replace />;

  if (profile?.is_app_banned) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-900/20 border-2 border-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,0,0,0.3)] pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"></circle><path d="m4.9 4.9 14.2 14.2"></path></svg>
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic mb-2 tracking-tighter shadow-black drop-shadow-lg">BANIMENTO PERMANENTE</h1>
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest max-w-sm mb-8">Esta conta violou os termos do aplicativo e teve seu saldo travado e o acesso à plataforma Exilado.</p>
        <button onClick={() => window.location.href = 'https://wa.me/5567999867083'} className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">
          Contatar Suporte
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournament/:id" element={<TournamentLobby />} />
        <Route path="/store" element={<Store />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<GlobalChat />} />
        <Route path="/quiz" element={<Quiz />} />
      </Route>
      <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/checkout/:planId" element={<ProtectedRoute><SubscriptionCheckout /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { CashRegisterProvider } from "./contexts/CashRegisterContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Schedule from "./pages/Schedule";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import CashHistory from "./pages/CashHistory";
import Accounts from "./pages/Accounts";
import AdminSaaS from "./pages/AdminSaaS";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

// Email do único administrador autorizado a acessar o sistema
const ADMIN_EMAIL = "edercaput@gmail.com";

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Bloqueia qualquer usuário que não seja o admin autorizado
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-6 relative overflow-hidden p-4">
        {/* Background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-destructive/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-destructive/5 blur-[150px] rounded-full pointer-events-none" />

        <div className="glass-card p-10 border-destructive/20 text-center max-w-md z-10 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-destructive mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Este sistema é de uso exclusivo do administrador.<br />
              A conta <strong className="text-foreground">{user.email}</strong> não tem permissão de acesso.
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full h-11 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            Sair e fazer login com outra conta
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CashRegisterProvider>
          <Toaster />
          <Sonner />
          <AuthWrapper>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<Schedule />} />
                  <Route path="/clientes" element={<Clients />} />
                  <Route path="/pdv" element={<POS />} />
                  <Route path="/servicos" element={<Services />} />
                  <Route path="/estoque" element={<Inventory />} />
                  <Route path="/caixa" element={<CashHistory />} />
                  <Route path="/contas" element={<Accounts />} />
                  <Route path="/admin" element={<AdminSaaS />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </AuthWrapper>
        </CashRegisterProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

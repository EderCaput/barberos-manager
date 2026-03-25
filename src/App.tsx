import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

// E-mails autorizados a acessar o sistema como Administradores
const ADMIN_EMAILS = ["edercaput@gmail.com", "atratusbpo@gmail.com"];

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email?.trim().toLowerCase() || '');
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

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
                  <Route path="/admin" element={<AdminRoute><AdminSaaS /></AdminRoute>} />
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

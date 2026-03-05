import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { CashRegisterProvider } from "./contexts/CashRegisterContext";
import Schedule from "./pages/Schedule";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import CashHistory from "./pages/CashHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CashRegisterProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Schedule />} />
              <Route path="/pdv" element={<POS />} />
              <Route path="/estoque" element={<Inventory />} />
              <Route path="/caixa" element={<CashHistory />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </CashRegisterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

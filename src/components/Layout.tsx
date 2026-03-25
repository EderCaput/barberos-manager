import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar, ShoppingCart, Package, Menu, X,
  Scissors, Landmark, LogOut, ClipboardList,
  Users, ShieldAlert, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Agenda', icon: Calendar },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/servicos', label: 'Serviços', icon: ClipboardList },
  { path: '/pdv', label: 'PDV', icon: ShoppingCart },
  { path: '/estoque', label: 'Estoque', icon: Package },
  { path: '/caixa', label: 'Caixa', icon: Landmark },
  { path: '/contas', label: 'Contas', icon: Wallet },
];

// Item especial de admin — aparece separado no menu
const adminItem = { path: '/admin', label: 'Painel Admin', icon: ShieldAlert };

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isAdminRoute = location.pathname === adminItem.path;

  const renderNavLink = (item: typeof navItems[0], onClick?: () => void) => {
    const active = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClick}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${active
            ? 'text-primary bg-primary/10 shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          }`}
      >
        {active && (
          <motion.div
            layoutId="active-nav-bg"
            className="absolute inset-0 bg-primary/10 backdrop-blur-md rounded-xl z-0"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className={`w-5 h-5 relative z-10 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className="relative z-10">{item.label}</span>
        {active && (
          <motion.div
            layoutId="active-nav-indicator"
            className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary z-10 shadow-[0_0_8px_rgba(255,255,255,0.7)]"
          />
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-20">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border bg-sidebar/50">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">BarberOS</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 relative overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => renderNavLink(item))}

          {/* Separador + Painel Admin */}
          {user?.email === 'edercaput@gmail.com' && (
            <div className="pt-3 mt-3 border-t border-sidebar-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-4 pb-2 font-semibold">Administração</p>
              <Link
                to={adminItem.path}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${isAdminRoute
                    ? 'text-primary bg-primary/10 shadow-sm'
                    : 'text-sidebar-foreground hover:bg-primary/5 hover:text-primary'
                  }`}
              >
                {isAdminRoute && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-primary/10 backdrop-blur-md rounded-xl z-0"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <ShieldAlert className={`w-5 h-5 relative z-10 ${isAdminRoute ? 'text-primary' : 'text-primary/60'}`} />
                <span className="relative z-10">Painel Admin SaaS</span>
                {isAdminRoute && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary z-10 shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  />
                )}
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border bg-sidebar/50 backdrop-blur-md space-y-2">
          <div className="flex items-center gap-2 px-2 pb-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between px-5 pt-safe py-4 bg-sidebar/80 backdrop-blur-xl border-b border-sidebar-border z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">BarberOS</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground p-2 rounded-lg hover:bg-secondary transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="md:hidden absolute top-[70px] left-4 right-4 z-50 bg-sidebar/95 backdrop-blur-3xl border border-sidebar-border rounded-2xl p-3 shadow-2xl"
            >
              <div className="space-y-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-secondary'
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}

                {/* Admin no mobile */}
                {user?.email === 'edercaput@gmail.com' && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-4 pb-2 font-semibold">Administração</p>
                    <Link
                      to={adminItem.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isAdminRoute ? 'bg-primary/10 text-primary' : 'text-primary/70 hover:bg-primary/5 hover:text-primary'
                        }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                      {adminItem.label} SaaS
                    </Link>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-border">
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair do Sistema
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden absolute inset-0 bg-background/50 backdrop-blur-sm z-20 mt-[70px]"
            />
          )}
        </AnimatePresence>

        {/* Mobile Bottom Nav — apenas os itens principais */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/90 backdrop-blur-xl border-t border-sidebar-border flex justify-around py-3 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          {[...navItems, ...(user?.email === 'edercaput@gmail.com' ? [adminItem] : [])].map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1.5 px-2 text-[10px] font-medium transition-all ${active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <div className={`p-1.5 rounded-full ${active ? 'bg-primary/20' : 'bg-transparent'}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-24 md:pb-0 relative z-10 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type CashRegisterSession, type CashMovement, type Payment, cashRegisterHistory } from '@/data/mockData';

interface CashRegisterContextType {
  currentSession: CashRegisterSession | null;
  history: CashRegisterSession[];
  isOpen: boolean;
  openRegister: (operator: string, initialFund: number) => void;
  closeRegister: (finalCashInDrawer: number) => void;
  addSale: (amount: number, description: string, payments: Payment[], commission: number) => void;
  addSangria: (amount: number, description: string) => void;
  addSuprimento: (amount: number, description: string) => void;
}

const CashRegisterContext = createContext<CashRegisterContextType | null>(null);

export function useCashRegister() {
  const ctx = useContext(CashRegisterContext);
  if (!ctx) throw new Error('useCashRegister must be inside CashRegisterProvider');
  return ctx;
}

export function CashRegisterProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(null);
  const [history, setHistory] = useState<CashRegisterSession[]>(cashRegisterHistory);

  const isOpen = !!currentSession && currentSession.status === 'open';

  const openRegister = useCallback((operator: string, initialFund: number) => {
    const now = new Date();
    setCurrentSession({
      id: `cr-${Date.now()}`,
      operator,
      date: now.toISOString().split('T')[0],
      openedAt: now.toISOString(),
      closedAt: null,
      initialFund,
      movements: [],
      status: 'open',
    });
  }, []);

  const closeRegister = useCallback((finalCashInDrawer: number) => {
    setCurrentSession(prev => {
      if (!prev) return null;
      const closed: CashRegisterSession = {
        ...prev,
        status: 'closed',
        closedAt: new Date().toISOString(),
        finalCashInDrawer,
      };
      setHistory(h => [closed, ...h]);
      return closed;
    });
  }, []);

  const addMovement = useCallback((movement: Omit<CashMovement, 'id' | 'timestamp'>) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        movements: [
          ...prev.movements,
          { ...movement, id: `m-${Date.now()}`, timestamp: new Date().toISOString() },
        ],
      };
    });
  }, []);

  const addSale = useCallback((amount: number, description: string, payments: Payment[], commission: number) => {
    addMovement({ type: 'sale', amount, description, payments, commission });
  }, [addMovement]);

  const addSangria = useCallback((amount: number, description: string) => {
    addMovement({ type: 'sangria', amount, description });
  }, [addMovement]);

  const addSuprimento = useCallback((amount: number, description: string) => {
    addMovement({ type: 'suprimento', amount, description });
  }, [addMovement]);

  return (
    <CashRegisterContext.Provider value={{ currentSession, history, isOpen, openRegister, closeRegister, addSale, addSangria, addSuprimento }}>
      {children}
    </CashRegisterContext.Provider>
  );
}

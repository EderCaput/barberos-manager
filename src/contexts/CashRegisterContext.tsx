import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type CashMovement, type Payment } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

export interface CartItem {
  id: string; // db id
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
  professionalId: string;
}

export interface CashRegisterSession {
  id: string;
  operator: string;
  date: string;
  openedAt: string;
  closedAt: string | null;
  initialFund: number;
  movements: CashMovement[];
  status: 'open' | 'closed';
  finalCashInDrawer?: number;
}

interface CashRegisterContextType {
  currentSession: CashRegisterSession | null;
  history: CashRegisterSession[];
  isOpen: boolean;
  openRegister: (operator: string, initialFund: number) => void;
  closeRegister: (finalCashInDrawer: number) => void;
  addSale: (amount: number, description: string, payments: Payment[], commission: number, cart: CartItem[], profId: string) => void;
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
  const [history, setHistory] = useState<CashRegisterSession[]>([]);

  const isOpen = !!currentSession && currentSession.status === 'open';

  // Using a real professional ID if available, otherwise fallback to the first one in the DB (since auth is missing)
  const getSimulatedUser = async () => {
    const { data } = await supabase.from('profissionais').select('id').limit(1);
    return data && data.length > 0 ? data[0].id : '00000000-0000-0000-0000-000000000000';
  };

  const openRegister = useCallback(async (operator: string, initialFund: number) => {
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

    const opId = await getSimulatedUser();
    supabase.from('movimentacao_caixa').insert({
      id_operador: opId,
      tipo: 'abertura',
      valor: initialFund,
      observacao: `Abertura por ${operator}`,
    }).then(({ error }) => { if (error) console.error("Erro Supabase:", error) });
  }, []);

  const closeRegister = useCallback(async (finalCashInDrawer: number) => {
    setCurrentSession(prev => {
      if (!prev) return null;
      const closed: CashRegisterSession = {
        ...prev,
        status: 'closed',
        closedAt: new Date().toISOString(),
        finalCashInDrawer,
      };
      setHistory(h => [closed, ...h]);

      getSimulatedUser().then(opId => {
        supabase.from('movimentacao_caixa').insert({
          id_operador: opId,
          tipo: 'fechamento',
          valor: finalCashInDrawer,
          observacao: `Fechamento de caixa`,
        }).then(({ error }) => { if (error) console.error("Erro Supabase:", error) });
      });

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

    if (movement.type === 'sangria' || movement.type === 'suprimento') {
      getSimulatedUser().then(opId => {
        supabase.from('movimentacao_caixa').insert({
          id_operador: opId,
          tipo: movement.type,
          valor: movement.amount,
          observacao: movement.description,
        }).then(({ error }) => { if (error) console.error("Erro Supabase:", error) });
      });
    }
  }, []);

  const addSale = useCallback(async (amount: number, description: string, payments: Payment[], commission: number, cart: CartItem[], profId: string) => {
    addMovement({ type: 'sale', amount, description, payments, commission });

    // Decrement stock for products in Supabase
    const products = cart.filter(c => c.type === 'product');
    for (const p of products) {
      // First get current qty
      const { data: stockData } = await supabase.from('estoque').select('quantidade').eq('id', p.id).single();
      if (stockData) {
        const newQty = Math.max(0, stockData.quantidade - p.quantity);
        await supabase.from('estoque').update({ quantidade: newQty }).eq('id', p.id);
      }
    }

    const jsonItems = cart.map(c => ({ id_produto: c.id, nome: c.name, qtd: c.quantity, preco: c.price, tipo: c.type }));

    // Insert into Supabase transacoes_pdv
    supabase.from('transacoes_pdv').insert({
      valor_total: amount,
      id_profissional: profId,
      metodo_pagamento: payments.length > 0 ? (payments[0].method === 'pix' ? 'pix' : (payments[0].method === 'cash' ? 'dinheiro' : 'cartao')) : 'dinheiro',
      total_comissao: commission,
      itens_vendidos: jsonItems
    }).then(({ error }) => { if (error) console.error("Erro Supabase PDV:", error) });

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

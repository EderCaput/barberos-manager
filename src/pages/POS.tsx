import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, CreditCard, Smartphone, Banknote, Wallet, X, Check, Lock, Unlock, ArrowDownFromLine, ArrowUpFromLine, BarChart3 } from 'lucide-react';
import { type Payment, type CashRegisterSession } from '@/data/mockData';
import { useCashRegister, type CartItem } from '@/contexts/CashRegisterContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const paymentMethods = [
  { key: 'pix' as const, label: 'PIX', icon: Smartphone },
  { key: 'credit' as const, label: 'Crédito', icon: CreditCard },
  { key: 'debit' as const, label: 'Débito', icon: CreditCard },
  { key: 'cash' as const, label: 'Dinheiro', icon: Banknote },
];

function getSessionTotals(session: CashRegisterSession) {
  let totalPix = 0, totalCredit = 0, totalDebit = 0, totalCash = 0, totalCommission = 0;
  let sangrias = 0, suprimentos = 0;
  session.movements.forEach(m => {
    if (m.type === 'sale') {
      m.payments?.forEach(p => {
        if (p.method === 'pix') totalPix += p.amount;
        else if (p.method === 'credit') totalCredit += p.amount;
        else if (p.method === 'debit') totalDebit += p.amount;
        else if (p.method === 'cash') totalCash += p.amount;
      });
      totalCommission += m.commission || 0;
    } else if (m.type === 'sangria') sangrias += m.amount;
    else if (m.type === 'suprimento') suprimentos += m.amount;
  });
  const grossRevenue = totalPix + totalCredit + totalDebit + totalCash;
  const expectedCashInDrawer = session.initialFund + totalCash - sangrias + suprimentos;
  return { totalPix, totalCredit, totalDebit, totalCash, grossRevenue, totalCommission, sangrias, suprimentos, expectedCashInDrawer };
}

interface Professional {
  id: string;
  name: string;
  serviceCommission: number;
  productCommission: number;
}

interface StockItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: 'sale' | 'internal';
  duration?: number;
}

export default function POS() {
  const { toast } = useToast();
  const { currentSession, isOpen, openRegister, closeRegister, addSale, addSangria, addSuprimento } = useCashRegister();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [dbProducts, setDbProducts] = useState<StockItem[]>([]);
  const [dbServices, setDbServices] = useState<StockItem[]>([]);

  // Open register modal
  const [showOpenModal, setShowOpenModal] = useState(!isOpen);
  const [operatorName, setOperatorName] = useState('');
  const [initialFund, setInitialFund] = useState('');

  // Close register
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [finalDrawer, setFinalDrawer] = useState('');
  const [showCloseSummary, setShowCloseSummary] = useState(false);
  const [closedSessionSnapshot, setClosedSessionSnapshot] = useState<CashRegisterSession | null>(null);

  // Sangria / Suprimento
  const [showSangria, setShowSangria] = useState(false);
  const [showSuprimento, setShowSuprimento] = useState(false);
  const [movAmount, setMovAmount] = useState('');
  const [movDescription, setMovDescription] = useState('');

  // POS state
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayMethod, setNewPayMethod] = useState<Payment['method']>('pix');
  const [newPayAmount, setNewPayAmount] = useState('');

  useEffect(() => {
    async function loadData() {
      const [profData, stockData] = await Promise.all([
        supabase.from('profissionais').select('*'),
        supabase.from('estoque').select('*')
      ]);

      if (profData.data) {
        const mappedProfs = profData.data.map(p => ({
          id: p.id,
          name: p.nome,
          serviceCommission: parseFloat(p.comissao_servico),
          productCommission: parseFloat(p.comissao_produto)
        }));
        setProfessionals(mappedProfs);
        if (mappedProfs.length > 0) setSelectedProfessional(mappedProfs[0].id);
      }

      if (stockData.data) {
        const saleList: StockItem[] = [];
        const internalList: StockItem[] = [];
        stockData.data.forEach(item => {
          const mapped: StockItem = {
            id: item.id,
            name: item.nome,
            price: parseFloat(item.preco_venda),
            quantity: item.quantidade,
            category: item.tipo === 'venda' ? 'sale' : 'internal',
            duration: item.tipo === 'uso_interno' ? 30 : undefined
          };
          if (mapped.category === 'sale') saleList.push(mapped);
          else if (mapped.category === 'internal' && mapped.price > 0) internalList.push(mapped);
        });
        setDbProducts(saleList);
        setDbServices(internalList);
      }
    }
    loadData();
  }, []);

  const catalog = useMemo(() => {
    const q = search.toLowerCase();
    return {
      services: dbServices.filter(s => s.name.toLowerCase().includes(q)),
      products: dbProducts.filter(p => p.name.toLowerCase().includes(q)),
    };
  }, [search, dbProducts, dbServices]);

  const addToCart = (item: { id: string; name: string; price: number }, type: 'service' | 'product') => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, type, name: item.name, price: item.price, quantity: 1, professionalId: selectedProfessional }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - paidTotal;

  const prof = professionals.find(p => p.id === selectedProfessional);

  const commissionBreakdown = useMemo(() => {
    if (!prof) return { serviceTotal: 0, productTotal: 0, serviceCommission: 0, productCommission: 0, totalCommission: 0 };
    let serviceTotal = 0, productTotal = 0;
    cart.forEach(c => {
      if (c.type === 'service') serviceTotal += c.price * c.quantity;
      else productTotal += c.price * c.quantity;
    });
    return {
      serviceTotal, productTotal,
      serviceCommission: serviceTotal * (prof.serviceCommission / 100),
      productCommission: productTotal * (prof.productCommission / 100),
      totalCommission: serviceTotal * (prof.serviceCommission / 100) + productTotal * (prof.productCommission / 100),
    };
  }, [cart, prof]);

  const addPayment = () => {
    const amount = parseFloat(newPayAmount);
    if (!amount || amount <= 0) return;
    setPayments(prev => [...prev, { method: newPayMethod, amount: Math.min(amount, remaining) }]);
    setNewPayAmount('');
  };

  const finalize = () => {
    if (remaining > 0.01) {
      toast({ title: 'Pagamento incompleto', description: `Faltam R$ ${remaining.toFixed(2)}`, variant: 'destructive' });
      return;
    }
    const desc = cart.map(c => c.name).join(', ');
    addSale(total, desc, [...payments], commissionBreakdown.totalCommission, [...cart], selectedProfessional);

    // update local stock state so ui reflects db operation
    setDbProducts(prev => prev.map(p => {
      const cartItem = cart.find(c => c.id === p.id && c.type === 'product');
      if (cartItem) return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
      return p;
    }));

    toast({ title: 'Venda finalizada!', description: `Total: R$ ${total.toFixed(2)} | Comissão: R$ ${commissionBreakdown.totalCommission.toFixed(2)}` });
    setCart([]);
    setPayments([]);
    setShowCheckout(false);
  };

  const handleOpenRegister = () => {
    const fund = parseFloat(initialFund);
    if (!operatorName.trim() || !fund || fund < 0) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    openRegister(operatorName.trim(), fund);
    setShowOpenModal(false);
    toast({ title: `Caixa aberto por ${operatorName}`, description: `Fundo: R$ ${fund.toFixed(2)}` });
  };

  const handleCloseRegister = () => {
    const finalVal = parseFloat(finalDrawer);
    if (isNaN(finalVal) || finalVal < 0) {
      toast({ title: 'Informe o valor em gaveta', variant: 'destructive' });
      return;
    }
    setClosedSessionSnapshot(currentSession ? { ...currentSession } : null);
    closeRegister(finalVal);
    setShowCloseModal(false);
    setShowCloseSummary(true);
  };

  const handleSangria = () => {
    const amt = parseFloat(movAmount);
    if (!amt || amt <= 0 || !movDescription.trim()) {
      toast({ title: 'Preencha valor e justificativa', variant: 'destructive' });
      return;
    }
    addSangria(amt, movDescription.trim());
    toast({ title: 'Sangria registrada', description: `R$ ${amt.toFixed(2)} — ${movDescription}` });
    setShowSangria(false);
    setMovAmount('');
    setMovDescription('');
  };

  const handleSuprimento = () => {
    const amt = parseFloat(movAmount);
    if (!amt || amt <= 0 || !movDescription.trim()) {
      toast({ title: 'Preencha valor e justificativa', variant: 'destructive' });
      return;
    }
    addSuprimento(amt, movDescription.trim());
    toast({ title: 'Suprimento registrado', description: `R$ ${amt.toFixed(2)} — ${movDescription}` });
    setShowSuprimento(false);
    setMovAmount('');
    setMovDescription('');
  };

  // Close summary totals
  const closeSummaryTotals = closedSessionSnapshot ? getSessionTotals(closedSessionSnapshot) : null;

  // If register not open, show open modal
  if (!isOpen && !showCloseSummary) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center h-full">
        <Dialog open={true} onOpenChange={() => { }}>
          <DialogContent hideCloseButton className="glass-card border-glass-border max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Unlock className="w-5 h-5 text-primary" /> Abrir Caixa
              </DialogTitle>
              <DialogDescription>Informe o operador e o fundo de caixa (troco inicial).</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Operador</label>
                <Input value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="Nome do operador" className="bg-secondary border-border" maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fundo de Caixa (R$)</label>
                <Input type="number" value={initialFund} onChange={e => setInitialFund(e.target.value)} placeholder="200.00" className="bg-secondary border-border" min="0" step="0.01" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleOpenRegister} className="w-full">
                <Unlock className="w-4 h-4 mr-2" /> Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Close summary dashboard
  if (showCloseSummary && closedSessionSnapshot && closeSummaryTotals) {
    const t = closeSummaryTotals;
    const diff = (closedSessionSnapshot.finalCashInDrawer ?? 0) - t.expectedCashInDrawer;
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Fechamento de Caixa</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Operador: <span className="text-foreground font-medium">{closedSessionSnapshot.operator}</span> · {new Date(closedSessionSnapshot.date + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>

        {/* Payment method cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'PIX', value: t.totalPix, icon: Smartphone, color: 'text-info' },
            { label: 'Crédito', value: t.totalCredit, icon: CreditCard, color: 'text-primary' },
            { label: 'Débito', value: t.totalDebit, icon: CreditCard, color: 'text-warning' },
            { label: 'Dinheiro', value: t.totalCash, icon: Banknote, color: 'text-success' },
          ].map(card => (
            <div key={card.label} className="glass-card p-4 text-center space-y-2">
              <card.icon className={`w-5 h-5 mx-auto ${card.color}`} />
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>R$ {card.value.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Faturamento Bruto</p>
            <p className="text-2xl font-bold text-primary">R$ {t.grossRevenue.toFixed(2)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Comissões</p>
            <p className="text-2xl font-bold text-warning">R$ {t.totalCommission.toFixed(2)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Saldo Líquido Gaveta</p>
            <p className="text-2xl font-bold text-success">R$ {(closedSessionSnapshot.finalCashInDrawer ?? 0).toFixed(2)}</p>
            {Math.abs(diff) > 0.01 && (
              <p className={`text-xs mt-1 ${diff > 0 ? 'text-success' : 'text-destructive'}`}>
                {diff > 0 ? '+' : ''}R$ {diff.toFixed(2)} vs esperado
              </p>
            )}
          </div>
        </div>

        <div className="glass-card p-4 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Fundo de Caixa</span><span>R$ {closedSessionSnapshot.initialFund.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">+ Entrada Dinheiro (vendas)</span><span>R$ {t.totalCash.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">+ Suprimentos</span><span>R$ {t.suprimentos.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">- Sangrias</span><span className="text-destructive">R$ {t.sangrias.toFixed(2)}</span></div>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>= Esperado em Gaveta</span>
            <span>R$ {t.expectedCashInDrawer.toFixed(2)}</span>
          </div>
        </div>

        <Button onClick={() => { setShowCloseSummary(false); setClosedSessionSnapshot(null); setShowOpenModal(true); setOperatorName(''); setInitialFund(''); }} className="w-full" size="lg">
          <Unlock className="w-4 h-4 mr-2" /> Abrir Novo Turno
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Frente de Caixa</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setMovAmount(''); setMovDescription(''); setShowSangria(true); }}>
            <ArrowUpFromLine className="w-4 h-4 mr-1" /> Sangria
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setMovAmount(''); setMovDescription(''); setShowSuprimento(true); }}>
            <ArrowDownFromLine className="w-4 h-4 mr-1" /> Suprimento
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { setFinalDrawer(''); setShowCloseModal(true); }}>
            <Lock className="w-4 h-4 mr-1" /> Fechar Caixa
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Catalog */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar serviço ou produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
            </div>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-auto space-y-4">
            {catalog.services.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Serviços</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {catalog.services.map(s => (
                    <button key={s.id} onClick={() => addToCart({ id: s.id, name: s.name, price: s.price }, 'service')} className="glass-card-hover p-3 text-left">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">R$ {s.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{s.duration}min</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {catalog.products.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Produtos</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {catalog.products.map(p => (
                    <button key={p.id} onClick={() => addToCart({ id: p.id, name: p.name, price: p.price }, 'product')} className="glass-card-hover p-3 text-left">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">R$ {p.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Estoque: {p.quantity}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:w-[380px] glass-card flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold">Carrinho</h2>
            <span className="text-xs text-muted-foreground">{cart.length} itens</span>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            <AnimatePresence>
              {cart.map(item => (
                <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-sm font-bold text-primary w-20 text-right">R$ {(item.price * item.quantity).toFixed(2)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>}
          </div>

          {cart.length > 0 && prof && (
            <div className="px-4 py-2 border-t border-border text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Comissão serviços ({prof.serviceCommission}%)</span>
                <span>R$ {commissionBreakdown.serviceCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Comissão produtos ({prof.productCommission}%)</span>
                <span>R$ {commissionBreakdown.productCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-primary">
                <span>Total comissão ({prof.name})</span>
                <span>R$ {commissionBreakdown.totalCommission.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={() => { setPayments([]); setShowCheckout(true); }}>
              <Wallet className="w-4 h-4 mr-2" /> Finalizar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="glass-card border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Pagamento — R$ {total.toFixed(2)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                <span>{paymentMethods.find(m => m.key === p.method)?.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">R$ {p.amount.toFixed(2)}</span>
                  <button onClick={() => setPayments(prev => prev.filter((_, j) => j !== i))} className="text-destructive"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {remaining > 0.01 && (
              <div className="flex gap-2">
                <Select value={newPayMethod} onValueChange={v => setNewPayMethod(v as Payment['method'])}>
                  <SelectTrigger className="w-[120px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder={`Restam R$ ${remaining.toFixed(2)}`} value={newPayAmount} onChange={e => setNewPayAmount(e.target.value)} className="bg-secondary border-border" />
                <Button variant="outline" onClick={addPayment}><Plus className="w-4 h-4" /></Button>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm">
              <span>Restante</span>
              <span className={remaining > 0.01 ? 'text-destructive' : 'text-success'}>R$ {Math.max(0, remaining).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancelar</Button>
            <Button onClick={finalize} disabled={remaining > 0.01}><Check className="w-4 h-4 mr-2" /> Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sangria Dialog */}
      <Dialog open={showSangria} onOpenChange={setShowSangria}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><ArrowUpFromLine className="w-5 h-5 text-destructive" /> Sangria</DialogTitle>
            <DialogDescription>Retirada de dinheiro da gaveta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input type="number" value={movAmount} onChange={e => setMovAmount(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Justificativa</label>
              <Textarea value={movDescription} onChange={e => setMovDescription(e.target.value)} placeholder="Ex: Pagamento motoboy" className="bg-secondary border-border" maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSangria(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleSangria}>Registrar Sangria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suprimento Dialog */}
      <Dialog open={showSuprimento} onOpenChange={setShowSuprimento}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><ArrowDownFromLine className="w-5 h-5 text-success" /> Suprimento</DialogTitle>
            <DialogDescription>Adição de troco extra na gaveta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input type="number" value={movAmount} onChange={e => setMovAmount(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Justificativa</label>
              <Textarea value={movDescription} onChange={e => setMovDescription(e.target.value)} placeholder="Ex: Troco extra para o dia" className="bg-secondary border-border" maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuprimento(false)}>Cancelar</Button>
            <Button onClick={handleSuprimento}>Registrar Suprimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Register Dialog */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Lock className="w-5 h-5 text-destructive" /> Fechar Caixa</DialogTitle>
            <DialogDescription>Conte o dinheiro na gaveta e informe o valor total realizado.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Valor Total na Gaveta (R$)</label>
            <Input type="number" value={finalDrawer} onChange={e => setFinalDrawer(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleCloseRegister}><Lock className="w-4 h-4 mr-2" /> Fechar Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

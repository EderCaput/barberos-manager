import { useState, useMemo } from 'react';
import { Search, Plus, Minus, CreditCard, Smartphone, Banknote, Wallet, X, Check } from 'lucide-react';
import { services, products, professionals, type CartItem, type Payment } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

const paymentMethods = [
  { key: 'pix' as const, label: 'PIX', icon: Smartphone },
  { key: 'credit' as const, label: 'Crédito', icon: CreditCard },
  { key: 'debit' as const, label: 'Débito', icon: CreditCard },
  { key: 'cash' as const, label: 'Dinheiro', icon: Banknote },
];

export default function POS() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState(professionals[0].id);
  const [showCheckout, setShowCheckout] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayMethod, setNewPayMethod] = useState<Payment['method']>('pix');
  const [newPayAmount, setNewPayAmount] = useState('');

  const saleProducts = products.filter(p => p.category === 'sale');
  const catalog = useMemo(() => {
    const q = search.toLowerCase();
    const filteredServices = services.filter(s => s.name.toLowerCase().includes(q));
    const filteredProducts = saleProducts.filter(p => p.name.toLowerCase().includes(q));
    return { services: filteredServices, products: filteredProducts };
  }, [search]);

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

  const prof = professionals.find(p => p.id === selectedProfessional)!;
  const commissionBreakdown = useMemo(() => {
    let serviceTotal = 0, productTotal = 0;
    cart.forEach(c => {
      if (c.type === 'service') serviceTotal += c.price * c.quantity;
      else productTotal += c.price * c.quantity;
    });
    return {
      serviceTotal,
      productTotal,
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
    toast({ title: 'Venda finalizada!', description: `Total: R$ ${total.toFixed(2)} | Comissão: R$ ${commissionBreakdown.totalCommission.toFixed(2)}` });
    setCart([]);
    setPayments([]);
    setShowCheckout(false);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <h1 className="font-display text-2xl font-bold mb-4">Frente de Caixa</h1>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Catalog */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviço ou produto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-[180px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto space-y-4">
            {catalog.services.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Serviços</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {catalog.services.map(s => (
                    <button
                      key={s.id}
                      onClick={() => addToCart({ id: s.id, name: s.name, price: s.price }, 'service')}
                      className="glass-card-hover p-3 text-left"
                    >
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
                    <button
                      key={p.id}
                      onClick={() => addToCart({ id: p.id, name: p.name, price: p.salePrice }, 'product')}
                      className="glass-card-hover p-3 text-left"
                    >
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">R$ {p.salePrice.toFixed(2)}</p>
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
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-primary w-20 text-right">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>
            )}
          </div>

          {/* Commission Preview */}
          {cart.length > 0 && (
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
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => { setPayments([]); setShowCheckout(true); }}
            >
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
            {/* Payment list */}
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
                <span>{paymentMethods.find(m => m.key === p.method)?.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">R$ {p.amount.toFixed(2)}</span>
                  <button onClick={() => setPayments(prev => prev.filter((_, j) => j !== i))} className="text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {remaining > 0.01 && (
              <div className="flex gap-2">
                <Select value={newPayMethod} onValueChange={v => setNewPayMethod(v as Payment['method'])}>
                  <SelectTrigger className="w-[120px] bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(m => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={`Restam R$ ${remaining.toFixed(2)}`}
                  value={newPayAmount}
                  onChange={e => setNewPayAmount(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button variant="outline" onClick={addPayment}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm">
              <span>Restante</span>
              <span className={remaining > 0.01 ? 'text-destructive' : 'text-success'}>
                R$ {Math.max(0, remaining).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancelar</Button>
            <Button onClick={finalize} disabled={remaining > 0.01}>
              <Check className="w-4 h-4 mr-2" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

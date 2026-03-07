import { useState, useEffect } from 'react';
import { Plus, Minus, AlertTriangle, Search, ArrowUpDown, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type SortKey = 'name' | 'quantity' | 'salePrice';

interface DbProduct {
  id: string;
  name: string;
  category: 'sale' | 'internal';
  quantity: number;
  minQuantity: number;
  costPrice: number;
  salePrice: number;
}

export default function Inventory() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<DbProduct[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 8;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'sale' | 'internal'>('sale');
  const [newCost, setNewCost] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('0');
  const [newMinQty, setNewMinQty] = useState('5');

  const loadInventory = async () => {
    const { data, error } = await supabase.from('estoque').select('*');
    if (error) {
      console.error("Erro ao puxar estoque:", error);
    } else if (data) {
      setInventory(data.map(item => ({
        id: item.id,
        name: item.nome,
        category: item.tipo === 'venda' ? 'sale' : 'internal',
        quantity: item.quantidade,
        minQuantity: item.qtd_minima,
        costPrice: parseFloat(item.custo),
        salePrice: parseFloat(item.preco_venda),
      })));
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filtered = inventory
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = sortAsc ? 1 : -1;
      if (sortKey === 'name') return a.name.localeCompare(b.name) * v;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * v;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const adjustQty = async (id: string, delta: number) => {
    const product = inventory.find(p => p.id === id);
    if (!product) return;

    const newQty = Math.max(0, product.quantity + delta);

    // Atualização otimista na tela
    setInventory(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (newQty <= p.minQuantity && p.quantity > p.minQuantity) {
        toast({ title: `⚠️ ${p.name}: estoque crítico!`, variant: 'destructive' });
      }
      return { ...p, quantity: newQty };
    }));

    // Atualiza no banco
    const { error } = await supabase.from('estoque').update({ quantidade: newQty }).eq('id', id);
    if (error) {
      console.error("Erro no supabase ao atualizar estoque:", error);
      toast({ title: 'Erro ao salvar no banco', variant: 'destructive' });
      // Reverte
      setInventory(prev => prev.map(p => p.id === id ? { ...p, quantity: product.quantity } : p));
    }
  };

  const handleAddProduct = async () => {
    if (!newName.trim()) {
      toast({ title: 'O nome é obrigatório', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('estoque').insert({
      nome: newName.trim(),
      tipo: newCategory === 'sale' ? 'venda' : 'uso_interno',
      custo: parseFloat(newCost) || 0,
      preco_venda: parseFloat(newPrice) || 0,
      quantidade: parseInt(newQty) || 0,
      qtd_minima: parseInt(newMinQty) || 5
    });

    if (error) {
      console.error("Erro ao adicionar produto:", error);
      toast({ title: 'Erro ao criar produto', variant: 'destructive' });
    } else {
      toast({ title: 'Produto adicionado com sucesso!' });
      setShowAddModal(false);

      // Reset form
      setNewName('');
      setNewCost('');
      setNewPrice('');
      setNewQty('0');
      setNewMinQty('5');

      loadInventory();
    }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button onClick={() => toggleSort(sortKeyName)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Estoque</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-destructive border-destructive/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {inventory.filter(p => p.quantity <= p.minQuantity).length} críticos
          </Badge>
          <Button onClick={() => setShowAddModal(true)} size="sm">
            <PackagePlus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar produto..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 bg-secondary border-border" />
      </div>

      <div className="glass-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3"><SortHeader label="Nome" sortKeyName="name" /></th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Categoria</th>
              <th className="p-3"><SortHeader label="Qtd" sortKeyName="quantity" /></th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Mín</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Custo</th>
              <th className="p-3"><SortHeader label="Venda" sortKeyName="salePrice" /></th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p, idx) => {
              const critical = p.quantity <= p.minQuantity;
              return (
                <motion.tr
                  key={`${p.id}-${idx}`}
                  layout
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.category === 'sale' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {p.category === 'sale' ? 'Venda' : 'Uso Interno / Serviço'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold">{p.quantity}</td>
                  <td className="p-3 text-center text-muted-foreground">{p.minQuantity}</td>
                  <td className="p-3 text-center text-muted-foreground">R$ {p.costPrice.toFixed(2)}</td>
                  <td className="p-3 text-center text-primary font-medium">{p.salePrice > 0 ? `R$ ${p.salePrice.toFixed(2)}` : '—'}</td>
                  <td className="p-3 text-center">
                    {critical ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Crítico
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-success border-success/30">OK</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => adjustQty(p.id, -1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <button onClick={() => adjustQty(p.id, 1)} className="w-7 h-7 rounded bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> Cadastrar Produto/Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Pomada Modeladora" className="bg-secondary border-border" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={newCategory} onValueChange={v => setNewCategory(v as 'sale' | 'internal')}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Produto para Venda</SelectItem>
                  <SelectItem value="internal">Uso Interno / Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço de Custo (R$)</label>
              <Input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço de Venda (R$)</label>
              <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Qtd. Inicial</label>
              <Input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} className="bg-secondary border-border" min="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Qtd. Mínima</label>
              <Input type="number" value={newMinQty} onChange={e => setNewMinQty(e.target.value)} className="bg-secondary border-border" min="0" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddProduct}>Salvar no Estoque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

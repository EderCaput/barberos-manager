import { useState, useEffect } from 'react';
import { Plus, Minus, AlertTriangle, Search, ArrowUpDown, PackagePlus, Edit, Trash2, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const [activeTab, setActiveTab] = useState<'sale' | 'internal' | 'reports'>('sale');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    .filter(p => activeTab === 'reports' ? true : p.category === activeTab)
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

    // Atualização otimista
    setInventory(prev => prev.map(p => p.id !== id ? p : { ...p, quantity: newQty }));

    const { error } = await supabase.from('estoque').update({ quantidade: newQty }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao salvar no banco', variant: 'destructive' });
      setInventory(prev => prev.map(p => p.id === id ? { ...p, quantity: product.quantity } : p));
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setNewName('');
    setNewCategory(activeTab === 'reports' ? 'sale' : activeTab);
    setNewCost('');
    setNewPrice('');
    setNewQty('0');
    setNewMinQty('5');
    setShowModal(true);
  };

  const openEditModal = (p: DbProduct) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewCategory(p.category);
    setNewCost(p.costPrice.toString());
    setNewPrice(p.salePrice.toString());
    setNewQty(p.quantity.toString());
    setNewMinQty(p.minQuantity.toString());
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${name}" do estoque?`)) {
      const { error } = await supabase.from('estoque').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro ao excluir', variant: 'destructive' });
      } else {
        toast({ title: 'Produto excluído com sucesso!' });
        loadInventory();
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!newName.trim()) {
      toast({ title: 'O nome é obrigatório', variant: 'destructive' });
      return;
    }

    const payload = {
      nome: newName.trim(),
      tipo: newCategory === 'sale' ? 'venda' : 'uso_interno',
      custo: parseFloat(newCost) || 0,
      preco_venda: parseFloat(newPrice) || 0,
      quantidade: parseInt(newQty) || 0,
      qtd_minima: parseInt(newMinQty) || 5
    };

    if (editingId) {
      const { error } = await supabase.from('estoque').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro ao editar', variant: 'destructive' });
      } else {
        toast({ title: 'Produto atualizado!' });
        setShowModal(false);
        loadInventory();
      }
    } else {
      const { error } = await supabase.from('estoque').insert(payload);
      if (error) {
        toast({ title: 'Erro ao criar', variant: 'destructive' });
      } else {
        toast({ title: 'Produto adicionado!' });
        setShowModal(false);
        loadInventory();
      }
    }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button onClick={() => toggleSort(sortKeyName)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  // Relatório Cálculos
  const totalInvestedSale = inventory.filter(p => p.category === 'sale').reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
  const totalInvestedInternal = inventory.filter(p => p.category === 'internal').reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
  const potentialRevenue = inventory.filter(p => p.category === 'sale').reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
  const criticalItemsCount = inventory.filter(p => p.quantity <= p.minQuantity).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Estoque & Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus produtos e veja os gastos.</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalItemsCount > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {criticalItemsCount} críticos
            </Badge>
          )}
          <Button onClick={openNewModal} size="sm">
            <PackagePlus className="w-4 h-4 mr-2" /> Novo Produto
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(0); }} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList className="bg-secondary/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Para Venda</TabsTrigger>
            <TabsTrigger value="internal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Uso Interno / Serviço</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <PieChart className="w-4 h-4 mr-2" /> Relatório de Gastos
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'reports' && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 bg-secondary border-border" />
            </div>
          )}
        </div>

        <TabsContent value="sale" className="mt-0 space-y-4">
          <InventoryTable paginated={paginated} inventoryLength={filtered.length} adjustQty={adjustQty} openEditModal={openEditModal} handleDeleteProduct={handleDeleteProduct} SortHeader={SortHeader} />
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </TabsContent>

        <TabsContent value="internal" className="mt-0 space-y-4">
          <InventoryTable paginated={paginated} inventoryLength={filtered.length} adjustQty={adjustQty} openEditModal={openEditModal} handleDeleteProduct={handleDeleteProduct} SortHeader={SortHeader} />
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-6 border-glass-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Gasto: Uso Interno</h3>
              <p className="text-3xl font-bold text-destructive">R$ {totalInvestedInternal.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Custo imobilizado em produtos de serviço</p>
            </div>
            <div className="glass-card p-6 border-glass-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Gasto: Para Venda</h3>
              <p className="text-3xl font-bold text-primary">R$ {totalInvestedSale.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Custo investido no estoque atual</p>
            </div>
            <div className="glass-card p-6 border-glass-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Lucro Potencial (Vendas)</h3>
              <p className="text-3xl font-bold text-success">R$ {(potentialRevenue - totalInvestedSale).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Estimativa de lucro do estoque atual</p>
            </div>
          </div>
          <div className="glass-card overflow-auto p-4 border-glass-border">
            <h3 className="font-semibold mb-3">Produtos de Maior Custo Total (Valor Acumulado)</h3>
            <div className="space-y-3">
              {[...inventory].sort((a, b) => (b.costPrice * b.quantity) - (a.costPrice * a.quantity)).slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({p.quantity} un x R$ {p.costPrice.toFixed(2)})</span>
                  </div>
                  <div className="font-bold text-right">
                    R$ {(p.quantity * p.costPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="glass-card border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> {editingId ? 'Editar Produto' : 'Cadastrar Produto/Serviço'}
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
              <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0.00" className="bg-secondary border-border" min="0" step="0.01" disabled={newCategory === 'internal'} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Qtd. em Estoque</label>
              <Input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} className="bg-secondary border-border" min="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Qtd. Mínima de Alerta</label>
              <Input type="number" value={newMinQty} onChange={e => setNewMinQty(e.target.value)} className="bg-secondary border-border" min="0" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduct}>{editingId ? 'Salvar Edição' : 'Salvar no Estoque'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom components isolated
function InventoryTable({ paginated, inventoryLength, adjustQty, openEditModal, handleDeleteProduct, SortHeader }: any) {
  return (
    <div className="glass-card overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3"><SortHeader label="Nome" sortKeyName="name" /></th>
            <th className="p-3"><SortHeader label="Qtd" sortKeyName="quantity" /></th>
            <th className="p-3 text-xs font-medium text-muted-foreground">Mín</th>
            <th className="p-3 text-xs font-medium text-muted-foreground">Custo</th>
            <th className="p-3"><SortHeader label="Venda" sortKeyName="salePrice" /></th>
            <th className="p-3 text-center text-xs font-medium text-muted-foreground">Status / Ações Qtd</th>
            <th className="p-3 text-right text-xs font-medium text-muted-foreground">Gerenciar</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((p: any, idx: number) => {
            const critical = p.quantity <= p.minQuantity;
            return (
              <motion.tr
                key={`${p.id}-${idx}`}
                layout
                className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
              >
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-center font-bold">{p.quantity}</td>
                <td className="p-3 text-center text-muted-foreground">{p.minQuantity}</td>
                <td className="p-3 text-center text-muted-foreground">R$ {p.costPrice.toFixed(2)}</td>
                <td className="p-3 text-center text-primary font-medium">{p.category === 'sale' && p.salePrice > 0 ? `R$ ${p.salePrice.toFixed(2)}` : '—'}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {critical ? (
                      <Badge variant="destructive" className="text-[10px] w-16 justify-center px-1">Crítico</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] w-16 justify-center px-1 text-success border-success/30">OK</Badge>
                    )}
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded ml-2">
                      <button onClick={() => adjustQty(p.id, -1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <button onClick={() => adjustQty(p.id, 1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(p)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
          {inventoryLength === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                Nenhum produto encontrado nesta categoria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, totalPages, setPage }: { page: number, totalPages: number, setPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
      <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
    </div>
  );
}

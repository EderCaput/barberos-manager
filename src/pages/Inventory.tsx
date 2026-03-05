import { useState } from 'react';
import { Plus, Minus, AlertTriangle, Search, ArrowUpDown } from 'lucide-react';
import { products, type Product } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

type SortKey = 'name' | 'quantity' | 'salePrice';

export default function Inventory() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<Product[]>(products);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 8;

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

  const adjustQty = (id: string, delta: number) => {
    setInventory(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newQty = Math.max(0, p.quantity + delta);
      if (newQty <= p.minQuantity && p.quantity > p.minQuantity) {
        toast({ title: `⚠️ ${p.name}: estoque crítico!`, variant: 'destructive' });
      }
      return { ...p, quantity: newQty };
    }));
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
            {paginated.map(p => {
              const critical = p.quantity <= p.minQuantity;
              return (
                <motion.tr
                  key={p.id}
                  layout
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.category === 'sale' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {p.category === 'sale' ? 'Venda' : 'Uso Interno'}
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
    </div>
  );
}

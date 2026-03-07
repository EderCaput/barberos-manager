import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface DbService {
    id: string;
    name: string;
    price: number;
}

export default function Services() {
    const { toast } = useToast();
    const [services, setServices] = useState<DbService[]>([]);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');

    const loadServices = async () => {
        const { data, error } = await supabase.from('estoque').select('*').eq('tipo', 'uso_interno');
        if (data) {
            setServices(data.map(s => ({
                id: s.id,
                name: s.nome,
                price: parseFloat(s.preco_venda),
            })));
        }
        if (error) console.error(error);
    };

    useEffect(() => {
        loadServices();
    }, []);

    const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    const handleAddService = async () => {
        if (!newName.trim()) return toast({ title: 'Nome obrigatório', variant: 'destructive' });
        const price = parseFloat(newPrice) || 0;

        // Cadastra como "estoque" do tipo "uso_interno" que é como o PDV lê os serviços
        const { error } = await supabase.from('estoque').insert({
            nome: newName.trim(),
            tipo: 'uso_interno',
            custo: 0,
            preco_venda: price,
            quantidade: 9999, // Serviço não acaba
            qtd_minima: 0
        });

        if (error) { toast({ title: 'Erro ao salvar', variant: 'destructive' }); return; }

        toast({ title: 'Serviço cadastrado com sucesso!' });
        setShowAddModal(false);
        setNewName('');
        setNewPrice('');
        loadServices();
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmDelete = window.confirm(`Deseja remover o serviço "${name}"?`);
        if (!confirmDelete) return;

        await supabase.from('estoque').delete().eq('id', id);
        toast({ title: 'Serviço removido!' });
        loadServices();
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="font-display text-2xl font-bold">Menu de Serviços</h1>
                </div>
                <Button onClick={() => setShowAddModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Novo Serviço
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border" />
            </div>

            <div className="glass-card overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/20">
                            <th className="text-left p-4 font-medium text-muted-foreground">Nome do Serviço</th>
                            <th className="p-4 text-center font-medium text-muted-foreground w-32">Valor Base</th>
                            <th className="p-4 text-center font-medium text-muted-foreground w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(s => (
                            <tr key={s.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                                <td className="p-4 font-medium text-foreground">{s.name}</td>
                                <td className="p-4 text-center text-primary font-bold">R$ {s.price.toFixed(2)}</td>
                                <td className="p-4 text-center">
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.name)} className="text-destructive hover:bg-destructive/10 h-8 w-8">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhum serviço encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="glass-card border-glass-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display">Cadastrar Serviço</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Nome do Serviço (*)</label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Corte Degrade" className="bg-secondary/50" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Valor do Serviço R$ (*)</label>
                            <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="45.00" className="bg-secondary/50" min="0" step="0.01" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                        <Button onClick={handleAddService}>Salvar Serviço</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

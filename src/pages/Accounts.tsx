import { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle2, Clock, Trash2, ArrowUpRight, ArrowDownRight, Wallet, Check } from 'lucide-react';
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

// Helper for dates
const formatDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
};

interface AccountItem {
    id: string;
    descricao: string;
    tipo: 'pagar' | 'receber';
    valor: number;
    data_vencimento: string;
    status: 'pendente' | 'pago';
}

export default function Accounts() {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<AccountItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'pagar' | 'receber'>('all');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [newDesc, setNewDesc] = useState('');
    const [newType, setNewType] = useState<'pagar' | 'receber'>('pagar');
    const [newAmount, setNewAmount] = useState('');
    const [newDate, setNewDate] = useState('');

    const loadAccounts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('contas').select('*').order('data_vencimento', { ascending: true });
        if (error) {
            if (error.code === '42P01') { // table does not exist
                toast({ title: 'Tabela ausente.', description: 'Por favor, rode a migração (SQL) de contas no seu Supabase.', variant: 'destructive' });
            } else {
                toast({ title: 'Erro ao carregar contas.', variant: 'destructive' });
            }
        } else if (data) {
            setAccounts(data as AccountItem[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAccounts();
        // Default today date for new inputs
        setNewDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleSave = async () => {
        if (!newDesc.trim() || !newAmount || !newDate) {
            toast({ title: 'Preencha todos os campos.', variant: 'destructive' });
            return;
        }

        const payload = {
            descricao: newDesc.trim(),
            tipo: newType,
            valor: parseFloat(newAmount),
            data_vencimento: newDate,
            status: 'pendente'
        };

        const { error } = await supabase.from('contas').insert(payload);

        if (error) {
            toast({ title: 'Erro ao salvar conta.', variant: 'destructive' });
        } else {
            toast({ title: 'Conta salva com sucesso!' });
            setShowModal(false);
            setNewDesc('');
            setNewAmount('');
            loadAccounts();
        }
    };

    const toggleStatus = async (item: AccountItem) => {
        const newStatus = item.status === 'pendente' ? 'pago' : 'pendente';
        const { error } = await supabase.from('contas').update({ status: newStatus }).eq('id', item.id);
        if (!error) {
            setAccounts(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a));
            toast({ title: `A conta foi marcada como ${newStatus}.` });
        } else {
            toast({ title: 'Erro ao atualizar status.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string, desc: string) => {
        if (window.confirm(`Tem certeza que deseja apagar a conta "${desc}"?`)) {
            const { error } = await supabase.from('contas').delete().eq('id', id);
            if (!error) {
                toast({ title: 'Conta removida.' });
                setAccounts(prev => prev.filter(a => a.id !== id));
            } else {
                toast({ title: 'Erro ao remover.', variant: 'destructive' });
            }
        }
    };

    // Filter and Summary
    const filteredList = accounts
        .filter(a => activeTab === 'all' ? true : a.tipo === activeTab)
        .filter(a => a.descricao.toLowerCase().includes(search.toLowerCase()));

    const totalPagar = accounts.filter(a => a.tipo === 'pagar' && a.status === 'pendente').reduce((sum, a) => sum + a.valor, 0);
    const totalReceber = accounts.filter(a => a.tipo === 'receber' && a.status === 'pendente').reduce((sum, a) => sum + a.valor, 0);
    const saldoPrevisto = totalReceber - totalPagar;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl font-bold">Financeiro: Contas</h1>
                        <p className="text-sm text-muted-foreground">Controle do que você tem a Pagar e a Receber.</p>
                    </div>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Conta
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 border-glass-border">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium text-muted-foreground">A Pagar (Pendentes)</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive">R$ {totalPagar.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5 border-glass-border">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-muted-foreground">A Receber (Pendentes)</span>
                    </div>
                    <p className="text-2xl font-bold text-success">R$ {totalReceber.toFixed(2)}</p>
                </div>
                <div className="glass-card p-5 border-glass-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Saldo Previsto</span>
                    </div>
                    <p className={`text-2xl font-bold ${saldoPrevisto >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        R$ {saldoPrevisto.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                    <TabsList className="bg-secondary/50 p-1">
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        <TabsTrigger value="pagar">A Pagar</TabsTrigger>
                        <TabsTrigger value="receber">A Receber</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar por descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
                </div>
            </div>

            <div className="glass-card overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-secondary/20">
                            <th className="text-left p-4 font-medium text-muted-foreground">Vencimento / Data</th>
                            <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
                            <th className="p-4 text-center font-medium text-muted-foreground">Valor</th>
                            <th className="p-4 text-center font-medium text-muted-foreground">Situação</th>
                            <th className="p-4 text-right font-medium text-muted-foreground">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando contas...</td></tr>
                        ) : filteredList.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma conta encontrada.</td></tr>
                        ) : (
                            filteredList.map((item, idx) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`border-b border-border/30 hover:bg-secondary/30 transition-colors ${item.status === 'pago' ? 'opacity-60 grayscale-[50%]' : ''}`}
                                >
                                    <td className="p-4 font-medium">{formatDate(item.data_vencimento)}</td>
                                    <td className="p-4 flex items-center gap-2">
                                        {item.tipo === 'pagar' ? <ArrowDownRight className="w-4 h-4 text-destructive" /> : <ArrowUpRight className="w-4 h-4 text-success" />}
                                        {item.descricao}
                                    </td>
                                    <td className={`p-4 text-center font-bold ${item.tipo === 'pagar' ? 'text-destructive' : 'text-success'}`}>
                                        R$ {item.valor.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge variant="outline" className={`gap-1 ${item.status === 'pago' ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30'}`}>
                                            {item.status === 'pago' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {item.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant={item.status === 'pago' ? "ghost" : "default"}
                                                size="sm"
                                                onClick={() => toggleStatus(item)}
                                                className={`h-8 px-2 text-xs ${item.status === 'pago' ? '' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                                            >
                                                {item.status === 'pago' ? 'Reabrir' : <><Check className="w-3 h-3 mr-1" /> Baixar</>}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.descricao)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="glass-card border-glass-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display">Cadastrar Conta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Tipo da Conta</label>
                            <Tabs value={newType} onValueChange={(v) => setNewType(v as 'pagar' | 'receber')} className="w-full">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="pagar" className="data-[state=active]:bg-destructive data-[state=active]:text-white">A Pagar (Despesa)</TabsTrigger>
                                    <TabsTrigger value="receber" className="data-[state=active]:bg-success data-[state=active]:text-white">A Receber (Receita)</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Descrição (*)</label>
                            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Conta de Luz, Recebimento João..." className="bg-secondary/50" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Valor R$ (*)</label>
                            <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" className="bg-secondary/50" min="0" step="0.01" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Data de Vencimento / Previsão (*)</label>
                            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-secondary/50" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Conta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

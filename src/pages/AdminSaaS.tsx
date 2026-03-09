import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Building, Banknote, ShieldAlert, BarChart3, Users, X, Check } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

interface Assinante {
    id: string;
    nome_barbearia: string;
    dono: string;
    email: string;
    telefone: string;
    status: 'ativo' | 'inativo';
    valor_assinatura: number;
}

export default function AdminSaaS() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [assinantes, setAssinantes] = useState<Assinante[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [newBarbearia, setNewBarbearia] = useState('');
    const [newDono, setNewDono] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newStatus, setNewStatus] = useState<'ativo' | 'inativo'>('ativo');
    const [newValor, setNewValor] = useState('55.00');
    const [newSenha, setNewSenha] = useState('');

    const loadAssinantes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('assinantes').select('*').order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01') {
                toast({ title: 'Tabela ausente.', description: 'Rode a migração (SQL) "assinantes" no Supabase.', variant: 'destructive' });
            } else {
                toast({ title: 'Erro ao carregar assinantes.', variant: 'destructive' });
            }
        } else if (data) {
            setAssinantes(data as Assinante[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAssinantes();
    }, []);

    const handleSave = async () => {
        if (!newBarbearia.trim() || !newEmail.trim() || !newValor || !newSenha.trim()) {
            toast({ title: 'Preencha os campos obrigatórios (incluindo senha).', variant: 'destructive' });
            return;
        }

        toast({ title: 'Criando conta de autenticação SaaS...' });

        // Primeiro: criar conta de autenticação (Auth) no Supabase de forma segura sem deslogar o admin
        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: newEmail.trim(),
            password: newSenha.trim(),
        });

        if (authError) {
            toast({ title: 'Erro ao criar conta Auth', description: authError.message, variant: 'destructive' });
            return;
        }

        // Segundo: Adicionar registro no assinantes (ainda usando a conta do admin logada para o admin ser dono do registro)
        const payload = {
            nome_barbearia: newBarbearia.trim(),
            dono: newDono.trim(),
            email: newEmail.trim(),
            telefone: newPhone.trim(),
            status: newStatus,
            valor_assinatura: parseFloat(newValor),
            user_id: user?.id
        };

        const { error } = await supabase.from('assinantes').insert(payload);

        if (error) {
            toast({ title: 'Erro ao salvar cliente/assinante.', variant: 'destructive' });
        } else {
            toast({ title: 'Conta e assinatura criadas com sucesso!' });
            setShowModal(false);
            setNewBarbearia('');
            setNewDono('');
            setNewEmail('');
            setNewPhone('');
            setNewSenha('');
            setNewValor('55.00');
            loadAssinantes();
        }
    };

    const toggleStatus = async (item: Assinante) => {
        const newStatus = item.status === 'ativo' ? 'inativo' : 'ativo';
        const { error } = await supabase.from('assinantes').update({ status: newStatus }).eq('id', item.id);
        if (!error) {
            setAssinantes(prev => prev.map(a => a.id === item.id ? { ...a, status: newStatus } : a));
            toast({ title: `Barbearia marcada como ${newStatus}.` });
        } else {
            toast({ title: 'Erro ao atualizar status.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Tem certeza que deseja apagar a conta "${name}" do sistema SaaS?`)) {
            const { error } = await supabase.from('assinantes').delete().eq('id', id);
            if (!error) {
                toast({ title: 'Barbearia descadastrada.' });
                setAssinantes(prev => prev.filter(a => a.id !== id));
            } else {
                toast({ title: 'Erro ao remover.', variant: 'destructive' });
            }
        }
    };

    // Filter and Summary
    const filteredList = assinantes.filter(a =>
        a.nome_barbearia.toLowerCase().includes(search.toLowerCase()) ||
        a.dono.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
    );

    const activeAccounts = assinantes.filter(a => a.status === 'ativo');
    const inactiveAccounts = assinantes.filter(a => a.status === 'inativo');

    // Cálculo de Renda Recorrente com base no valor de cada assinatura salva no banco (padrão 55, mas caso o admin altere para cliente específico)
    const totalMRR = activeAccounts.reduce((sum, a) => sum + Number(a.valor_assinatura), 0);

    return (
        <div className="p-4 md:p-6 space-y-6 bg-secondary/10 min-h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-display text-2xl font-bold">Painel SaaS Admin</h1>
                        <p className="text-sm text-muted-foreground">Logado como: {user?.email} | Gerencie Suas Contas Ativas</p>
                    </div>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Conta / Assinante
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Contas Ativas</span>
                    </div>
                    <p className="text-3xl font-bold text-primary">{activeAccounts.length}</p>
                </div>
                <div className="glass-card p-5 border-destructive/20 bg-destructive/5">
                    <div className="flex items-center gap-2 mb-2">
                        <X className="w-4 h-4 text-destructive" />
                        <span className="text-sm font-medium text-foreground">Inadimplentes / Inativos</span>
                    </div>
                    <p className="text-3xl font-bold text-destructive">{inactiveAccounts.length}</p>
                </div>
                <div className="glass-card p-5 border-success/20 bg-success/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Banknote className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-foreground">Faturamento Recorrente (MRR)</span>
                    </div>
                    <p className="text-3xl font-bold text-success">R$ {totalMRR.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-border/50">
                <div className="p-4 border-b border-border/50 bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="font-semibold flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground" /> Lista de Barbearias (Assinantes)</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Buscar por barbearia, dono, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-border h-9" />
                    </div>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                <th className="text-left p-4 font-medium text-muted-foreground">Barbearia / Empresa</th>
                                <th className="text-left p-4 font-medium text-muted-foreground">Responsável</th>
                                <th className="text-left p-4 font-medium text-muted-foreground">Contato / Email</th>
                                <th className="p-4 text-center font-medium text-muted-foreground">Valor (R$)</th>
                                <th className="p-4 text-center font-medium text-muted-foreground">Status SaaS</th>
                                <th className="p-4 text-right font-medium text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando carteira de clientes SaaS...</td></tr>
                            ) : filteredList.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta SaaS cadastrada no sistema.</td></tr>
                            ) : (
                                filteredList.map((item, idx) => (
                                    <motion.tr
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${item.status === 'inativo' ? 'opacity-80' : ''}`}
                                    >
                                        <td className="p-4 font-bold text-foreground">{item.nome_barbearia}</td>
                                        <td className="p-4 font-medium">{item.dono || 'Não informado'}</td>
                                        <td className="p-4 text-muted-foreground">
                                            {item.email}<br />
                                            <span className="text-xs">{item.telefone}</span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-primary">
                                            R$ {Number(item.valor_assinatura).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Badge variant="outline" className={`gap-1 px-2 py-0.5 ${item.status === 'ativo' ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                                                {item.status === 'ativo' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {item.status === 'ativo' ? 'Ativa' : 'Inativa/Suspensa'}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant={item.status === 'ativo' ? "ghost" : "default"}
                                                    size="sm"
                                                    onClick={() => toggleStatus(item)}
                                                    className={`h-8 px-2 text-xs ${item.status === 'ativo' ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'bg-success hover:bg-success/90 text-success-foreground'}`}
                                                >
                                                    {item.status === 'ativo' ? 'Suspender' : 'Reativar'}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.nome_barbearia)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
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
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="glass-card border-glass-border max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display">Registrar Nova Conta SaaS</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs text-muted-foreground block mb-1">Nome da Barbearia (*)</label>
                                <Input value={newBarbearia} onChange={e => setNewBarbearia(e.target.value)} placeholder="Ex: Barbearia do João" className="bg-secondary/50" />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Dono / Responsável</label>
                                <Input value={newDono} onChange={e => setNewDono(e.target.value)} placeholder="Nome do Dono" className="bg-secondary/50" />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Valor Combinado (R$)</label>
                                <Input type="number" value={newValor} onChange={e => setNewValor(e.target.value)} placeholder="55.00" className="bg-secondary/50 font-bold" min="0" step="0.01" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-muted-foreground block mb-1">Email de Login (*)</label>
                                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="joao@email.com" className="bg-secondary/50" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-muted-foreground block mb-1">Senha Inicial (*)</label>
                                <Input type="password" value={newSenha} onChange={e => setNewSenha(e.target.value)} placeholder="Senha definida para o cliente logar" className="bg-secondary/50" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-muted-foreground block mb-1">Telefone / WhatsApp</label>
                                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" className="bg-secondary/50" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Criar Conta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

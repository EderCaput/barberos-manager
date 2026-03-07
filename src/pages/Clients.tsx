import { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, Calendar as CalendarIcon, AlertCircle, Cake, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ClientData {
    id: string;
    name: string;
    phone: string;
    birthDate: string; // From historico
    lastServiceDate: string | null;
    lastServiceName: string | null;
    daysSinceLast: number | null;
}

export default function Clients() {
    const { toast } = useToast();
    const [clients, setClients] = useState<ClientData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newBirth, setNewBirth] = useState('');

    const loadData = async () => {
        setLoading(true);

        // Fetch all clients
        const { data: dbClients, error: errClients } = await supabase.from('clientes').select('*');

        // Fetch all concluded appointments to find the last service for each client
        const { data: dbApts, error: errApts } = await supabase.from('agendamentos')
            .select('id_cliente, servico, data_hora')
            .eq('status', 'concluido')
            .order('data_hora', { ascending: false });

        if (errClients || errApts) {
            console.error(errClients || errApts);
            setLoading(false);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const merged: ClientData[] = (dbClients || []).map(c => {
            // Parse historico to find birthDate if it's saved as JSON
            let birthDate = '';
            try {
                if (c.historico && c.historico.startsWith('{')) {
                    const parsed = JSON.parse(c.historico);
                    birthDate = parsed.birthDate || '';
                } else {
                    birthDate = c.historico || ''; // fallback
                }
            } catch (e) {
                birthDate = c.historico || '';
            }

            // Find the latest service
            const clientApts = (dbApts || []).filter(a => a.id_cliente === c.id);
            const latestApt = clientApts.length > 0 ? clientApts[0] : null;

            let daysSinceLast = null;
            if (latestApt) {
                const aptDate = new Date(latestApt.data_hora);
                aptDate.setHours(0, 0, 0, 0);
                const diffTime = Math.abs(today.getTime() - aptDate.getTime());
                daysSinceLast = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            return {
                id: c.id,
                name: c.nome,
                phone: c.whatsapp,
                birthDate: birthDate,
                lastServiceDate: latestApt ? new Date(latestApt.data_hora).toISOString() : null,
                lastServiceName: latestApt ? latestApt.servico : null,
                daysSinceLast
            };
        });

        // Sort by most critical alerts first (birthdays and maintenance > 25 days)
        merged.sort((a, b) => {
            const aNeedsMaint = a.daysSinceLast !== null && a.daysSinceLast >= 25 ? 1 : 0;
            const bNeedsMaint = b.daysSinceLast !== null && b.daysSinceLast >= 25 ? 1 : 0;

            const aBday = isBirthday(a.birthDate) ? 1 : 0;
            const bBday = isBirthday(b.birthDate) ? 1 : 0;

            const aScore = aBday * 2 + aNeedsMaint;
            const bScore = bBday * 2 + bNeedsMaint;

            return bScore - aScore; // Descending score
        });

        setClients(merged);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const isBirthday = (dateStr: string) => {
        if (!dateStr || dateStr.length < 5) return false;
        const today = new Date();
        const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
        const currentDay = today.getDate().toString().padStart(2, '0');
        const mmdd = `${currentMonth}-${currentDay}`;
        return dateStr.includes(mmdd); // Matches formats like YYYY-MM-DD or MM-DD
    };

    const handleSaveClient = async () => {
        if (!newName.trim()) {
            toast({ title: 'Nome é obrigatório', variant: 'destructive' });
            return;
        }

        const historicoData = JSON.stringify({ birthDate: newBirth });

        const { error } = await supabase.from('clientes').insert({
            nome: newName.trim(),
            whatsapp: newPhone.trim() || 'Não informado',
            historico: historicoData
        });

        if (error) {
            toast({ title: 'Erro ao salvar', variant: 'destructive' });
            return;
        }

        toast({ title: 'Cliente registrado com sucesso!' });
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewBirth('');
        loadData();
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="font-display text-2xl font-bold">Meus Clientes</h1>
                </div>
                <Button onClick={() => setShowAddModal(true)} size="sm" className="shadow-primary/20 shadow-lg">
                    <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar cliente por nome ou celular..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-secondary/50 border-border"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        Carregando sua lista de clientes...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        Nenhum cliente encontrado na base.
                    </div>
                ) : (
                    filtered.map(c => {
                        const maintNeeded = c.daysSinceLast !== null && c.daysSinceLast >= 25;
                        const bdayToday = isBirthday(c.birthDate);

                        return (
                            <div key={c.id} className="glass-card-hover p-5 space-y-4 group relative overflow-hidden">
                                {/* Glowing border effect for alerts */}
                                {(maintNeeded || bdayToday) && (
                                    <div className={`absolute top-0 left-0 w-1 h-full ${bdayToday ? 'bg-primary' : 'bg-warning'}`}></div>
                                )}

                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-foreground">{c.name}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                            <Phone className="w-3 h-3" /> {c.phone}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {bdayToday && (
                                            <Badge variant="default" className="bg-primary text-primary-foreground shadow-sm px-2.5 py-1">
                                                <Cake className="w-3 h-3 mr-1" /> Hoje!
                                            </Badge>
                                        )}
                                        {maintNeeded && !bdayToday && (
                                            <Badge variant="outline" className="text-warning border-warning/50 px-2.5 py-1">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Manutenção
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Último Serviço
                                        </p>
                                        {c.lastServiceName ? (
                                            <div>
                                                <p className="font-medium text-sm text-foreground truncate" title={c.lastServiceName}>{c.lastServiceName}</p>
                                                <p className="text-xs text-muted-foreground">Há {c.daysSinceLast} dias</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Nenhum serviço</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" /> Aniversário
                                        </p>
                                        <p className="font-medium text-sm text-foreground">
                                            {c.birthDate ? new Date(c.birthDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="glass-card border-glass-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-display flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Novo Cliente
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Nome Completo</label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Marcos Antônio" className="bg-secondary/50 border-border/50" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">WhatsApp</label>
                            <Input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(11) 99999-9999" className="bg-secondary/50 border-border/50" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Data de Nascimento <span className="text-primary/70">(para alertas)</span></label>
                            <Input type="date" value={newBirth} onChange={e => setNewBirth(e.target.value)} className="bg-secondary/50 border-border/50" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveClient}>Salvar Registro</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

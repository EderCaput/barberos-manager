import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, ChevronLeft, ChevronRight, Send, Plus, UserPlus, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type AppointmentStatus, type Professional, type Client, type Service } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  no_show: 'Não compareceu',
  canceled: 'Cancelado',
};

const statusStyles: Record<AppointmentStatus, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  completed: 'status-completed',
  no_show: 'status-no-show',
  canceled: 'status-canceled',
};

const statusCardBorder: Record<AppointmentStatus, string> = {
  pending: 'border-l-warning',
  confirmed: 'border-l-info',
  completed: 'border-l-success',
  no_show: 'border-l-destructive',
  canceled: 'border-l-muted-foreground',
};

interface DbAppointment {
  id: string;
  clientId: string;
  professionalId: string;
  serviceText: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
}

export default function Schedule() {
  const { toast } = useToast();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pdvModal, setPdvModal] = useState<DbAppointment | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Modals state
  const [showProfModal, setShowProfModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAptModal, setShowAptModal] = useState(false);

  // Forms state
  const [newProfName, setNewProfName] = useState('');
  const [newProfServComm, setNewProfServComm] = useState('50');
  const [newProfProdComm, setNewProfProdComm] = useState('10');

  const [newCliName, setNewCliName] = useState('');
  const [newCliPhone, setNewCliPhone] = useState('');

  const [newAptClient, setNewAptClient] = useState('');
  const [newAptProf, setNewAptProf] = useState('');
  const [newAptService, setNewAptService] = useState('');
  const [newAptTime, setNewAptTime] = useState(timeSlots[0]);

  async function fetchData() {
    const [profReq, cliReq, srvReq, aptReq] = await Promise.all([
      supabase.from('profissionais').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('estoque').select('*').eq('tipo', 'uso_interno'),
      supabase.from('agendamentos').select('*')
    ]);

    if (profReq.data) {
      setProfessionals(profReq.data.map(p => ({
        id: p.id,
        name: p.nome,
        avatar: p.nome.substring(0, 2).toUpperCase(),
        serviceCommission: p.comissao_servico,
        productCommission: p.comissao_produto
      })));
    }

    if (cliReq.data) {
      setClients(cliReq.data.map(c => ({
        id: c.id,
        name: c.nome,
        phone: c.whatsapp,
        email: ''
      })));
    }

    if (srvReq.data) {
      setServices(srvReq.data.map(s => ({
        id: s.id,
        name: s.nome,
        price: parseFloat(s.preco_venda),
        duration: 30,
        category: s.tipo
      })));
    }

    if (aptReq.data) {
      setAppointments(aptReq.data.map(a => {
        const dt = new Date(a.data_hora);
        return {
          id: a.id,
          clientId: a.id_cliente,
          professionalId: a.id_profissional,
          serviceText: a.servico,
          date: dt.toISOString().split('T')[0],
          time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          duration: 30,
          status: a.status === 'pendente' ? 'pending' : a.status === 'concluido' ? 'completed' : a.status === 'cancelado' ? 'canceled' : 'confirmed'
        };
      }));
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = useMemo(() => appointments.filter(a => a.date === dateStr), [appointments, dateStr]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast({ title: `Status atualizado para "${statusLabels[status]}"` });

    const dbStatus = status === 'pending' ? 'pendente' : (status === 'completed' ? 'concluido' : (status === 'canceled' ? 'cancelado' : 'confirmed'));
    const { error } = await supabase.from('agendamentos').update({ status: dbStatus }).eq('id', id);
    if (error) console.error("Erro no Supabase:", error);
  };

  const handleCardClick = (apt: DbAppointment) => {
    if (apt.status === 'completed') {
      setPdvModal(apt);
    } else if (apt.status === 'pending') {
      updateStatus(apt.id, 'confirmed');
    } else if (apt.status === 'confirmed') {
      updateStatus(apt.id, 'completed');
    }
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = async (time: string, profId: string) => {
    if (!draggedId) return;

    const newDateTime = new Date(`${dateStr}T${time}:00-03:00`);

    setAppointments(prev => prev.map(a =>
      a.id === draggedId ? { ...a, time, professionalId: profId } : a
    ));
    setDraggedId(null);
    toast({ title: 'Horário reagendado com sucesso!' });

    const { error } = await supabase
      .from('agendamentos')
      .update({
        data_hora: newDateTime.toISOString(),
        id_profissional: profId
      }).eq('id', draggedId);

    if (error) console.error("Erro Supabase:", error);
  };

  const handleSaveProf = async () => {
    if (!newProfName.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    const { error } = await supabase.from('profissionais').insert({
      nome: newProfName,
      comissao_servico: parseFloat(newProfServComm) || 50,
      comissao_produto: parseFloat(newProfProdComm) || 10
    });
    if (error) { toast({ title: 'Erro ao cadastrar profissional', variant: 'destructive' }); return; }

    toast({ title: 'Profissional cadastrado!' });
    setShowProfModal(false);
    setNewProfName('');
    setNewProfServComm('50');
    setNewProfProdComm('10');
    fetchData();
  };

  const handleSaveClient = async () => {
    if (!newCliName.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    const { error } = await supabase.from('clientes').insert({
      nome: newCliName,
      whatsapp: newCliPhone || 'Não informado',
      historico: ''
    });
    if (error) { toast({ title: 'Erro ao cadastrar cliente', variant: 'destructive' }); return; }

    toast({ title: 'Cliente cadastrado!' });
    setShowClientModal(false);
    setNewCliName('');
    setNewCliPhone('');
    fetchData();
  };

  const handleSaveApt = async () => {
    if (!newAptClient || !newAptProf || !newAptService) {
      toast({ title: 'Preencha todos os campos do agendamento', variant: 'destructive' });
      return;
    }

    const dateTimeStr = `${dateStr}T${newAptTime}:00-03:00`;

    const { error } = await supabase.from('agendamentos').insert({
      id_cliente: newAptClient,
      id_profissional: newAptProf,
      data_hora: new Date(dateTimeStr).toISOString(),
      servico: newAptService,
      status: 'pendente'
    });

    if (error) { toast({ title: 'Erro ao criar agendamento', variant: 'destructive' }); return; }

    toast({ title: 'Agendamento criado!' });
    setShowAptModal(false);
    setNewAptClient('');
    setNewAptProf('');
    setNewAptService('');
    fetchData();
  };

  const pdvClient = pdvModal ? clients.find(c => c.id === pdvModal.clientId) : null;
  const pdvProf = pdvModal ? professionals.find(p => p.id === pdvModal.professionalId) : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Agenda</h1>
          <div className="flex items-center bg-secondary/50 rounded-full px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => changeDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProfModal(true)} className="text-xs">
            <Scissors className="w-4 h-4 mr-1" /> Barbeiro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowClientModal(true)} className="text-xs">
            <UserPlus className="w-4 h-4 mr-1" /> Cliente
          </Button>
          <Button size="sm" onClick={() => setShowAptModal(true)} className="text-xs shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-1" /> Agendar
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-card overflow-auto">
        <div className="min-w-[700px]">
          {/* Header Row */}
          <div className="grid sticky top-0 z-10 bg-card border-b border-border shadow-sm" style={{ gridTemplateColumns: `80px repeat(${Math.max(1, professionals.length)}, 1fr)` }}>
            <div className="p-3 text-xs text-muted-foreground font-medium flex items-center justify-center bg-card">Horário</div>
            {professionals.length === 0 && <div className="p-4 text-sm text-center text-muted-foreground bg-card">Cadastre um profissional para iniciar</div>}
            {professionals.map(p => (
              <div key={p.id} className="p-3 text-center border-l border-border bg-card">
                <div className="w-8 h-8 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mb-1 shadow-inner">
                  {p.avatar}
                </div>
                <p className="text-xs font-medium truncate">{p.name}</p>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {timeSlots.map(time => (
            <div
              key={time}
              className="grid border-b border-border/40 hover:bg-secondary/10 transition-colors"
              style={{ gridTemplateColumns: `80px repeat(${Math.max(1, professionals.length)}, 1fr)` }}
            >
              <div className="p-2 text-xs text-muted-foreground flex items-start justify-center pt-3 border-r border-border/40 bg-secondary/5">
                <Clock className="w-3 h-3 mr-1 mt-[2px]" />{time}
              </div>
              {professionals.length === 0 && <div className="border-l border-border/40"></div>}
              {professionals.map(prof => {
                const apt = dayAppointments.find(a => a.time === time && a.professionalId === prof.id);
                return (
                  <div
                    key={prof.id}
                    className="border-l border-border/40 min-h-[52px] p-1 relative"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(time, prof.id)}
                  >
                    {apt && (
                      <motion.div
                        layout
                        draggable
                        onDragStart={() => handleDragStart(apt.id)}
                        onClick={() => handleCardClick(apt)}
                        className={`absolute inset-x-1 top-1 p-2 rounded-lg bg-secondary/90 backdrop-blur-sm border-l-4 ${statusCardBorder[apt.status]} cursor-pointer hover:bg-secondary transition-all shadow-sm z-10 text-xs flex flex-col justify-between`}
                        style={{ height: `calc(${Math.max(apt.duration / 30, 1) * 100}% - 8px)` }}
                        whileHover={{ scale: 1.01, zIndex: 20 }}
                      >
                        <div className="flex items-start justify-between gap-1 overflow-hidden">
                          <span className="font-bold truncate text-foreground">
                            {clients.find(c => c.id === apt.clientId)?.name || 'Cliente'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between opacity-80">
                          <span className="truncate flex-1 pr-2">{apt.serviceText}</span>
                          <span className={`text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded-sm ${statusStyles[apt.status]} bg-background/50`}>{statusLabels[apt.status]}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* PDV Modal */}
      <Dialog open={!!pdvModal} onOpenChange={() => setPdvModal(null)}>
        <DialogContent className="glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Enviar para PDV
            </DialogTitle>
          </DialogHeader>
          {pdvModal && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium bg-secondary/50 p-2 rounded-md">{pdvClient?.name || 'Não identificado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Profissional</p>
                <p className="font-medium bg-secondary/50 p-2 rounded-md">{pdvProf?.name || 'Não identificado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Serviço Agendado</p>
                <div className="flex justify-between font-medium bg-secondary/50 p-2 rounded-md">
                  <span>{pdvModal.serviceText}</span>
                  <span className="text-primary text-xs uppercase tracking-wider flex items-center pb-0.5 border-b border-primary/30">A faturar</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setPdvModal(null)}>Voltar</Button>
            <Button onClick={() => { setPdvModal(null); toast({ title: 'Acesse o Caixa Módulo PDV' }); }}>
              <Send className="w-4 h-4 mr-2" /> Prosseguir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cadastrar Barbeiro Modal */}
      <Dialog open={showProfModal} onOpenChange={setShowProfModal}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" /> Novo Barbeiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground ml-1">Nome Completo</label>
              <Input value={newProfName} onChange={e => setNewProfName(e.target.value)} placeholder="Ex: João Silva" className="bg-secondary/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground ml-1">Comissão Serviço (%)</label>
                <Input type="number" value={newProfServComm} onChange={e => setNewProfServComm(e.target.value)} placeholder="50" className="bg-secondary/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground ml-1">Comissão Produto (%)</label>
                <Input type="number" value={newProfProdComm} onChange={e => setNewProfProdComm(e.target.value)} placeholder="10" className="bg-secondary/50" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowProfModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProf}>Salvar Barbeiro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cadastrar Cliente Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground ml-1">Nome Completo</label>
              <Input value={newCliName} onChange={e => setNewCliName(e.target.value)} placeholder="Ex: Marcos Antônio" className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground ml-1">WhatsApp / Telefone</label>
              <Input value={newCliPhone} onChange={e => setNewCliPhone(e.target.value)} placeholder="(11) 98888-7777" className="bg-secondary/50" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowClientModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveClient}>Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agendar Modal */}
      <Dialog open={showAptModal} onOpenChange={setShowAptModal}>
        <DialogContent className="glass-card border-glass-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Novo Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {clients.length === 0 || professionals.length === 0 ? (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                Você precisa cadastrar pelo menos um <strong>Cliente</strong> e um <strong>Barbeiro</strong> para realizar agendamentos.
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">Cliente</label>
                  <Select value={newAptClient} onValueChange={setNewAptClient}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">Barbeiro</label>
                  <Select value={newAptProf} onValueChange={setNewAptProf}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground ml-1">Serviço Desejado (Ex: Corte, Barba)</label>
                  <Input value={newAptService} onChange={e => setNewAptService(e.target.value)} placeholder="Corte Clássico" className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Data</label>
                    <div className="h-10 px-3 flex items-center bg-secondary/30 border border-border rounded-md text-sm text-muted-foreground">
                      {selectedDate.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Horário</label>
                    <Select value={newAptTime} onValueChange={setNewAptTime}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowAptModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveApt} disabled={clients.length === 0 || professionals.length === 0}>
              Confirmar Agenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

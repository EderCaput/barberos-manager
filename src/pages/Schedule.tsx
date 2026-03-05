import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { professionals, services, clients, initialAppointments, type Appointment, type AppointmentStatus } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

export default function Schedule() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pdvModal, setPdvModal] = useState<Appointment | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = useMemo(() => appointments.filter(a => a.date === dateStr), [appointments, dateStr]);

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const updateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast({ title: `Status atualizado para "${statusLabels[status]}"` });
  };

  const handleCardClick = (apt: Appointment) => {
    if (apt.status === 'completed') {
      setPdvModal(apt);
    } else if (apt.status === 'pending') {
      updateStatus(apt.id, 'confirmed');
    } else if (apt.status === 'confirmed') {
      updateStatus(apt.id, 'completed');
    }
  };

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDrop = (time: string, profId: string) => {
    if (!draggedId) return;
    setAppointments(prev => prev.map(a =>
      a.id === draggedId ? { ...a, time, professionalId: profId } : a
    ));
    setDraggedId(null);
    toast({ title: 'Horário reagendado com sucesso!' });
  };

  const pdvClient = pdvModal ? clients.find(c => c.id === pdvModal.clientId) : null;
  const pdvServices = pdvModal ? services.filter(s => pdvModal.serviceIds.includes(s.id)) : [];
  const pdvProf = pdvModal ? professionals.find(p => p.id === pdvModal.professionalId) : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Agenda</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-card overflow-auto">
        <div className="min-w-[700px]">
          {/* Header Row */}
          <div className="grid sticky top-0 z-10 bg-card border-b border-border" style={{ gridTemplateColumns: '80px repeat(4, 1fr)' }}>
            <div className="p-3 text-xs text-muted-foreground font-medium">Horário</div>
            {professionals.map(p => (
              <div key={p.id} className="p-3 text-center border-l border-border">
                <div className="w-8 h-8 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mb-1">
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
              className="grid border-b border-border/50"
              style={{ gridTemplateColumns: '80px repeat(4, 1fr)' }}
            >
              <div className="p-2 text-xs text-muted-foreground flex items-start pt-3">
                <Clock className="w-3 h-3 mr-1 mt-0.5" />{time}
              </div>
              {professionals.map(prof => {
                const apt = dayAppointments.find(a => a.time === time && a.professionalId === prof.id);
                return (
                  <div
                    key={prof.id}
                    className="border-l border-border/50 min-h-[52px] p-1"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(time, prof.id)}
                  >
                    {apt && (
                      <motion.div
                        layout
                        draggable
                        onDragStart={() => handleDragStart(apt.id)}
                        onClick={() => handleCardClick(apt)}
                        className={`p-2 rounded-lg bg-secondary/80 border-l-4 ${statusCardBorder[apt.status]} cursor-pointer hover:bg-secondary transition-colors text-xs space-y-1`}
                        style={{ minHeight: `${Math.max(apt.duration / 30, 1) * 26}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            <User className="w-3 h-3 inline mr-1" />
                            {clients.find(c => c.id === apt.clientId)?.name}
                          </span>
                          <span className={statusStyles[apt.status]}>{statusLabels[apt.status]}</span>
                        </div>
                        <p className="text-muted-foreground truncate">
                          {services.filter(s => apt.serviceIds.includes(s.id)).map(s => s.name).join(', ')}
                        </p>
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{pdvClient?.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Profissional</p>
                <p className="font-medium">{pdvProf?.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Serviços</p>
                {pdvServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-primary font-medium">R$ {s.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {pdvServices.reduce((s, sv) => s + sv.price, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdvModal(null)}>Cancelar</Button>
            <Button onClick={() => { setPdvModal(null); toast({ title: 'Enviado para o PDV!' }); }}>
              <Send className="w-4 h-4 mr-2" /> Enviar ao Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

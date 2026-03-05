import { useCashRegister } from '@/contexts/CashRegisterContext';
import { type CashRegisterSession } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Landmark, Calendar as CalendarIcon } from 'lucide-react';

function getSessionTotals(session: CashRegisterSession) {
  let totalPix = 0, totalCredit = 0, totalDebit = 0, totalCash = 0, totalCommission = 0;
  let sangrias = 0, suprimentos = 0;

  session.movements.forEach(m => {
    if (m.type === 'sale') {
      m.payments?.forEach(p => {
        if (p.method === 'pix') totalPix += p.amount;
        else if (p.method === 'credit') totalCredit += p.amount;
        else if (p.method === 'debit') totalDebit += p.amount;
        else if (p.method === 'cash') totalCash += p.amount;
      });
      totalCommission += m.commission || 0;
    } else if (m.type === 'sangria') sangrias += m.amount;
    else if (m.type === 'suprimento') suprimentos += m.amount;
  });

  const grossRevenue = totalPix + totalCredit + totalDebit + totalCash;
  const expectedCashInDrawer = session.initialFund + totalCash - sangrias + suprimentos;

  return { totalPix, totalCredit, totalDebit, totalCash, grossRevenue, totalCommission, sangrias, suprimentos, expectedCashInDrawer };
}

export default function CashHistory() {
  const { history } = useCashRegister();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Histórico de Caixas</h1>
      </div>

      <div className="glass-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Data</th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">Operador</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Saldo Inicial</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Faturamento</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Comissões</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Saldo Final Gaveta</th>
              <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum turno registrado
                </td>
              </tr>
            )}
            {history.map(session => {
              const totals = getSessionTotals(session);
              return (
                <tr key={session.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-medium">
                    {new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="p-3">{session.operator}</td>
                  <td className="p-3 text-center">R$ {session.initialFund.toFixed(2)}</td>
                  <td className="p-3 text-center text-primary font-medium">R$ {totals.grossRevenue.toFixed(2)}</td>
                  <td className="p-3 text-center text-warning font-medium">R$ {totals.totalCommission.toFixed(2)}</td>
                  <td className="p-3 text-center font-bold">
                    R$ {(session.finalCashInDrawer ?? totals.expectedCashInDrawer).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={session.status === 'open' ? 'default' : 'outline'} className={session.status === 'open' ? '' : 'text-success border-success/30'}>
                      {session.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

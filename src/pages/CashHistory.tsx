import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Landmark, Calendar as CalendarIcon, Loader2, ArrowRight, PieChartIcon, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface DbSession {
  id: string;
  operatorId: string;
  date: string;
  openedAt: Date;
  closedAt: Date | null;
  initialFund: number;
  finalCashInDrawer: number | null;
  status: 'open' | 'closed';

  totalPix: number;
  totalCredit: number;
  totalDebit: number;
  totalCash: number;
  totalCommission: number;
  grossRevenue: number;
  sangrias: number;
  suprimentos: number;
  expectedCashInDrawer: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']; // Success/Primary/Warning/Purple

export default function CashHistory() {
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DbSession | null>(null);

  useEffect(() => {
    async function fetchReports() {
      const [movimentosRes, transacoesRes] = await Promise.all([
        supabase.from('movimentacao_caixa').select('*').order('data_hora', { ascending: true }),
        supabase.from('transacoes_pdv').select('*').order('created_at', { ascending: true })
      ]);

      if (movimentosRes.error || transacoesRes.error) {
        console.error("Erro ao carregar relatórios", movimentosRes.error || transacoesRes.error);
        setLoading(false);
        return;
      }

      const movimentos = movimentosRes.data || [];
      const transacoes = transacoesRes.data || [];

      const builtSessions: DbSession[] = [];
      let currentSession: DbSession | null = null;

      for (const m of movimentos) {
        const mDate = new Date(m.data_hora);
        const floatVal = parseFloat(m.valor);

        if (m.tipo === 'abertura') {
          currentSession = {
            id: m.id,
            operatorId: m.id_operador,
            date: mDate.toISOString().split('T')[0],
            openedAt: mDate,
            closedAt: null,
            initialFund: floatVal,
            finalCashInDrawer: null,
            status: 'open',
            totalPix: 0,
            totalCredit: 0,
            totalDebit: 0,
            totalCash: 0,
            totalCommission: 0,
            grossRevenue: 0,
            sangrias: 0,
            suprimentos: 0,
            expectedCashInDrawer: floatVal
          };
          builtSessions.unshift(currentSession);
        } else if (currentSession) {
          if (m.tipo === 'fechamento') {
            currentSession.closedAt = mDate;
            currentSession.finalCashInDrawer = floatVal;
            currentSession.status = 'closed';
            currentSession = null;
          } else if (m.tipo === 'sangria') {
            currentSession.sangrias += floatVal;
            currentSession.expectedCashInDrawer -= floatVal;
          } else if (m.tipo === 'suprimento') {
            currentSession.suprimentos += floatVal;
            currentSession.expectedCashInDrawer += floatVal;
          }
        }
      }

      for (const t of transacoes) {
        const tDate = new Date(t.created_at);
        const val = parseFloat(t.valor_total);
        const comm = parseFloat(t.total_comissao);

        const targetSession = builtSessions.find(
          s => s.openedAt <= tDate && (s.closedAt === null || s.closedAt >= tDate)
        );

        if (targetSession) {
          targetSession.totalCommission += comm;
          targetSession.grossRevenue += val;

          if (t.metodo_pagamento === 'pix') targetSession.totalPix += val;
          else if (t.metodo_pagamento === 'cartao') targetSession.totalCredit += val;
          else if (t.metodo_pagamento === 'dinheiro') {
            targetSession.totalCash += val;
            targetSession.expectedCashInDrawer += val;
          }
        }
      }

      setSessions(builtSessions);
      setLoading(false);
    }

    fetchReports();
  }, []);

  const getPieData = (s: DbSession) => [
    { name: 'Dinheiro', value: s.totalCash },
    { name: 'Cartão', value: s.totalCredit + s.totalDebit },
    { name: 'PIX', value: s.totalPix }
  ].filter(d => d.value > 0);

  const getBarData = (s: DbSession) => [
    {
      name: 'Resumo Financeiro',
      'Faturamento Bruto': s.grossRevenue,
      'Comissões Pagas': s.totalCommission,
      'Lucro Salão (Bruto)': s.grossRevenue - s.totalCommission
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Relatório Financeiro</h1>
      </div>

      <div className="glass-card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground">Turno (Abertura)</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Faturamento</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Comissões</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-xs font-medium text-muted-foreground text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2 opacity-50" />
                  Carregando relatórios...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum turno registrado.
                </td>
              </tr>
            ) : (
              sessions.map(session => (
                <tr key={session.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors group">
                  <td className="p-4 font-medium">
                    {session.openedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {session.openedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4 text-center text-primary font-bold">R$ {session.grossRevenue.toFixed(2)}</td>
                  <td className="p-4 text-center text-warning font-medium">R$ {session.totalCommission.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <Badge variant={session.status === 'open' ? 'default' : 'outline'} className={session.status === 'open' ? 'bg-primary' : 'text-success border-success/30'}>
                      {session.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="text-xs font-bold text-primary hover:text-primary/80 flex items-center justify-center gap-1 mx-auto transition-transform group-hover:translate-x-1"
                    >
                      Analisar <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        {selectedSession && (
          <DialogContent className="max-w-4xl glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Análise de Turno — {selectedSession.openedAt.toLocaleDateString('pt-BR')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-2 max-h-[80vh] overflow-y-auto px-1 pb-4">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Faturamento Total</p>
                  <p className="text-2xl font-bold text-primary">R$ {selectedSession.grossRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Comissões</p>
                  <p className="text-2xl font-bold text-warning">R$ {selectedSession.totalCommission.toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lucro Retido</p>
                  <p className="text-2xl font-bold text-success">R$ {(selectedSession.grossRevenue - selectedSession.totalCommission).toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Em Gaveta (Espera)</p>
                  <p className="text-2xl font-bold text-foreground">R$ {selectedSession.expectedCashInDrawer.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Métodos de Pagamento */}
                <div className="glass-card p-5 border-border/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Métodos de Pagamento</h3>
                  </div>
                  {getPieData(selectedSession).length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieData(selectedSession)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {getPieData(selectedSession).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem vendas no turno.</div>
                  )}
                </div>

                {/* Gráfico Comparativo de Vendas vs Comissão */}
                <div className="glass-card p-5 border-border/30 rounded-2xl">
                  <h3 className="font-semibold text-sm mb-4">Faturamento vs Retenção</h3>
                  {selectedSession.grossRevenue > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getBarData(selectedSession)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                          <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--secondary))' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          />
                          <Bar dataKey="Lucro Salão (Bruto)" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Comissões Pagas" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem vendas no turno.</div>
                  )}
                </div>

              </div>

              {/* Tabela Resumo do Caixa Fisico */}
              <div className="bg-secondary/10 rounded-xl p-4 border border-border/30">
                <h3 className="font-semibold text-sm mb-3">Movimentação Física da Gaveta</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Fundo Inicial de Caixa</span>
                    <span>R$ {selectedSession.initialFund.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Entradas Físicas (Dinheiro de Venda)</span>
                    <span className="text-success">+ R$ {selectedSession.totalCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Suprimentos (Troco adicionado)</span>
                    <span className="text-success">+ R$ {selectedSession.suprimentos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Sangrias (Retiradas da gaveta)</span>
                    <span className="text-destructive">- R$ {selectedSession.sangrias.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 text-lg">
                    <span>Dinheiro Esperado na Gaveta Física</span>
                    <span className="text-primary">R$ {selectedSession.expectedCashInDrawer.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Landmark, Calendar as CalendarIcon, Loader2, ArrowRight, PieChartIcon, TrendingUp, Scissors, UserCog, Package, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface ProfCommissionInfo {
  profId: string;
  profName: string;
  totalServiceSales: number;
  totalProductSales: number;
  totalCommissionEarned: number;
  itemsSold: { name: string; qty: number; type: 'service' | 'product'; price: number }[];
}

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

  profCommissions: Record<string, ProfCommissionInfo>;

  isGroup?: boolean;
  groupTitle?: string;
  sessionsCount?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']; // Success/Primary/Warning/Purple

function getDayStr(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getWeekStr(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  const startStr = date.toLocaleDateString('pt-BR');
  date.setDate(date.getDate() + 6);
  const endStr = date.toLocaleDateString('pt-BR');
  return `${startStr} a ${endStr}`;
}

function getMonthStr(d: Date) {
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mergeSessions(sessionsList: DbSession[], title: string, reverseTime: boolean = false): DbSession {
  const baseOpenedAt = sessionsList[reverseTime ? sessionsList.length - 1 : 0]?.openedAt || new Date();
  const merged: DbSession = {
    id: `merged-${title}-${Date.now()}`,
    operatorId: 'N/A',
    date: title,
    openedAt: baseOpenedAt,
    closedAt: sessionsList[reverseTime ? 0 : sessionsList.length - 1]?.closedAt || null,
    initialFund: sessionsList.reduce((sum, s) => sum + s.initialFund, 0),
    finalCashInDrawer: sessionsList.reduce((sum, s) => sum + (s.finalCashInDrawer || 0), 0),
    status: 'closed',

    totalPix: sessionsList.reduce((sum, s) => sum + s.totalPix, 0),
    totalCredit: sessionsList.reduce((sum, s) => sum + s.totalCredit, 0),
    totalDebit: sessionsList.reduce((sum, s) => sum + s.totalDebit, 0),
    totalCash: sessionsList.reduce((sum, s) => sum + s.totalCash, 0),
    totalCommission: sessionsList.reduce((sum, s) => sum + s.totalCommission, 0),
    grossRevenue: sessionsList.reduce((sum, s) => sum + s.grossRevenue, 0),
    sangrias: sessionsList.reduce((sum, s) => sum + s.sangrias, 0),
    suprimentos: sessionsList.reduce((sum, s) => sum + s.suprimentos, 0),
    expectedCashInDrawer: sessionsList.reduce((sum, s) => sum + s.expectedCashInDrawer, 0),

    profCommissions: {},
    isGroup: true,
    groupTitle: title,
    sessionsCount: sessionsList.length
  };

  sessionsList.forEach(s => {
    Object.values(s.profCommissions).forEach(p => {
      if (!merged.profCommissions[p.profId]) {
        merged.profCommissions[p.profId] = {
          profId: p.profId,
          profName: p.profName,
          totalServiceSales: 0,
          totalProductSales: 0,
          totalCommissionEarned: 0,
          itemsSold: []
        };
      }
      const mp = merged.profCommissions[p.profId];
      mp.totalServiceSales += p.totalServiceSales;
      mp.totalProductSales += p.totalProductSales;
      mp.totalCommissionEarned += p.totalCommissionEarned;

      p.itemsSold.forEach(item => {
        const exist = mp.itemsSold.find(i => i.name === item.name && i.type === item.type);
        if (exist) {
          exist.qty += item.qty;
        } else {
          mp.itemsSold.push({ ...item });
        }
      });
    });
  });

  return merged;
}

export default function CashHistory() {
  const [activeTab, setActiveTab] = useState('shifts');
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [daily, setDaily] = useState<DbSession[]>([]);
  const [weekly, setWeekly] = useState<DbSession[]>([]);
  const [monthly, setMonthly] = useState<DbSession[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DbSession | null>(null);

  useEffect(() => {
    async function fetchReports() {
      const [movimentosRes, transacoesRes] = await Promise.all([
        supabase.from('movimentacao_caixa').select('*').order('data_hora', { ascending: true }),
        supabase.from('transacoes_pdv').select('*, profissionais (nome)').order('created_at', { ascending: true })
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
            expectedCashInDrawer: floatVal,
            profCommissions: {}
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

          // Atribuindo venda ao profissional
          const profId = t.id_profissional || 'desconhecido';
          const profName = t.profissionais?.nome || 'Profissional Desconhecido';

          if (!targetSession.profCommissions[profId]) {
            targetSession.profCommissions[profId] = {
              profId, profName,
              totalServiceSales: 0, totalProductSales: 0,
              totalCommissionEarned: 0,
              itemsSold: []
            };
          }

          const profRecord = targetSession.profCommissions[profId];
          profRecord.totalCommissionEarned += comm;

          let items: any[] = [];
          if (typeof t.itens_vendidos === 'string') {
            try { items = JSON.parse(t.itens_vendidos); } catch (e) { }
          } else if (Array.isArray(t.itens_vendidos)) {
            items = t.itens_vendidos;
          }

          for (const item of items) {
            const type = item.tipo || 'service';
            const totalItemValue = (item.preco || 0) * (item.qtd || 1);

            if (type === 'product') {
              profRecord.totalProductSales += totalItemValue;
            } else {
              profRecord.totalServiceSales += totalItemValue;
            }

            const existingItem = profRecord.itemsSold.find(i => i.name === item.nome && i.type === type);
            if (existingItem) {
              existingItem.qty += (item.qtd || 1);
            } else {
              profRecord.itemsSold.push({
                name: item.nome || 'Item Desconhecido',
                qty: item.qtd || 1,
                type: type,
                price: item.preco || 0
              });
            }
          }
        }
      }

      setSessions(builtSessions);

      // Agrupamentos (usando reduce num array reverso pq original foi pra unshift)
      // Reverse builtSessions back to chronological to do groupings easily
      const chronological = [...builtSessions].reverse();

      const dRecords: Record<string, DbSession[]> = {};
      const wRecords: Record<string, DbSession[]> = {};
      const mRecords: Record<string, DbSession[]> = {};

      chronological.forEach(s => {
        const dk = getDayStr(s.openedAt);
        const wk = getWeekStr(s.openedAt);
        const mk = getMonthStr(s.openedAt);

        if (!dRecords[dk]) dRecords[dk] = [];
        dRecords[dk].push(s);

        if (!wRecords[wk]) wRecords[wk] = [];
        wRecords[wk].push(s);

        if (!mRecords[mk]) mRecords[mk] = [];
        mRecords[mk].push(s);
      });

      setDaily(Object.keys(dRecords).map(k => mergeSessions(dRecords[k], k)).reverse());
      setWeekly(Object.keys(wRecords).map(k => mergeSessions(wRecords[k], k)).reverse());
      setMonthly(Object.keys(mRecords).map(k => mergeSessions(mRecords[k], k)).reverse());

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
      'Faturamento': s.grossRevenue,
      'Comissões': s.totalCommission,
      'Lucro Líquido': s.grossRevenue - s.totalCommission
    }
  ];

  const TableLayout = ({ dataList, isGrouped }: { dataList: DbSession[], isGrouped: boolean }) => (
    <div className="glass-card overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-4 text-xs font-medium text-muted-foreground">{isGrouped ? 'Período' : 'Turno (Abertura)'}</th>
            {isGrouped && <th className="p-4 text-xs font-medium text-muted-foreground">Turnos</th>}
            <th className="p-4 text-xs font-medium text-muted-foreground">Faturamento</th>
            <th className="p-4 text-xs font-medium text-muted-foreground">Comissões</th>
            {!isGrouped && <th className="p-4 text-xs font-medium text-muted-foreground">Status</th>}
            <th className="p-4 text-xs font-medium text-muted-foreground text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={isGrouped ? 5 : 5} className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2 opacity-50" />
                Carregando relatórios...
              </td>
            </tr>
          ) : dataList.length === 0 ? (
            <tr>
              <td colSpan={isGrouped ? 5 : 5} className="p-8 text-center text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhum dado registrado.
              </td>
            </tr>
          ) : (
            dataList.map(session => (
              <tr key={session.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors group">
                <td className="p-4 font-medium">
                  {isGrouped ? (
                    session.groupTitle
                  ) : (
                    <>{session.openedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {session.openedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </td>
                {isGrouped && (
                  <td className="p-4 text-center">
                    <Badge variant="outline"><Layers className="w-3 h-3 mr-1" />{session.sessionsCount}</Badge>
                  </td>
                )}
                <td className="p-4 text-center text-primary font-bold">R$ {session.grossRevenue.toFixed(2)}</td>
                <td className="p-4 text-center text-warning font-medium">R$ {session.totalCommission.toFixed(2)}</td>
                {!isGrouped && (
                  <td className="p-4 text-center">
                    <Badge variant={session.status === 'open' ? 'default' : 'outline'} className={session.status === 'open' ? 'bg-primary' : 'text-success border-success/30'}>
                      {session.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </td>
                )}
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
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="w-6 h-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Relatórios Financeiros</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/50 p-1 flex-wrap h-auto mb-4 w-full md:w-fit">
          <TabsTrigger value="shifts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Turnos por Operador</TabsTrigger>
          <TabsTrigger value="daily" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Diário</TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Semanal</TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-0 space-y-4">
          <TableLayout dataList={sessions} isGrouped={false} />
        </TabsContent>
        <TabsContent value="daily" className="mt-0 space-y-4">
          <TableLayout dataList={daily} isGrouped={true} />
        </TabsContent>
        <TabsContent value="weekly" className="mt-0 space-y-4">
          <TableLayout dataList={weekly} isGrouped={true} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-0 space-y-4">
          <TableLayout dataList={monthly} isGrouped={true} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        {selectedSession && (
          <DialogContent className="max-w-4xl glass-card border-glass-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {selectedSession.isGroup ? `Relatório Consolidado — ${selectedSession.groupTitle}` : `Análise de Turno — ${selectedSession.openedAt.toLocaleDateString('pt-BR')}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-2 max-h-[80vh] overflow-y-auto px-1 pb-4">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Faturamento Bruto</p>
                  <p className="text-2xl font-bold text-primary">R$ {selectedSession.grossRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Comissões</p>
                  <p className="text-2xl font-bold text-warning">R$ {selectedSession.totalCommission.toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lucro Salão</p>
                  <p className="text-2xl font-bold text-success">R$ {(selectedSession.grossRevenue - selectedSession.totalCommission).toFixed(2)}</p>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 shadow-sm">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dinheiro em Caixa</p>
                  <p className="text-2xl font-bold text-foreground">R$ {selectedSession.expectedCashInDrawer.toFixed(2)}</p>
                </div>
              </div>

              {/* Detalhamento de Comissões por Profissional */}
              <div className="glass-card p-5 border-border/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Resumo por Profissional {selectedSession.isGroup && '(Soma de Todos os Turnos)'}</h3>
                </div>

                {Object.values(selectedSession.profCommissions).length > 0 ? (
                  <div className="space-y-4">
                    {Object.values(selectedSession.profCommissions).map(prof => (
                      <div key={prof.profId} className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                          <h4 className="font-bold text-lg text-primary">{prof.profName}</h4>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <div className="text-muted-foreground">Serviços: <span className="text-foreground font-medium">R$ {prof.totalServiceSales.toFixed(2)}</span></div>
                            <div className="text-muted-foreground">Produtos: <span className="text-foreground font-medium">R$ {prof.totalProductSales.toFixed(2)}</span></div>
                            <div className="text-warning font-bold p-1 px-2 bg-yellow-500/10 rounded border border-warning/10 drop-shadow-sm">
                              Comissão: R$ {prof.totalCommissionEarned.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase mt-2">Volume vendido neste período:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {[...prof.itemsSold].sort((a, b) => b.qty - a.qty).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border/30 text-xs shadow-sm">
                                {item.type === 'service' ? <Scissors className="w-3 h-3 text-muted-foreground" /> : <Package className="w-3 h-3 text-primary" />}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium">{item.name}</p>
                                  <p className="text-muted-foreground">{item.qty} un geraram R$ {(item.price * item.qty).toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma transação atrelada a profissionais neste período.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Métodos de Pagamento */}
                <div className="glass-card p-5 border-border/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Proporção por Método</h3>
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
                    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem vendas.</div>
                  )}
                </div>

                {/* Gráfico Comparativo de Vendas vs Comissão */}
                <div className="glass-card p-5 border-border/30 rounded-2xl">
                  <h3 className="font-semibold text-sm mb-4">Retenção de Lucro</h3>
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
                          <Bar dataKey="Lucro Líquido" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Comissões" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem vendas.</div>
                  )}
                </div>

              </div>

            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

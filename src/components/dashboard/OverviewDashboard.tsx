import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  formatBRL,
  formatPercent,
  formatDateBR,
  calculateFinancials,
  calculateWorkHealth,
  calculatePhysicalProgressWeighted,
  calculateIntegratedComparisonMetrics,
} from '../../lib/utils';
import {
  Building2,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  Filter,
  MapPin,
  UserCheck,
  LayoutDashboard,
  Activity,
  DollarSign,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  History,
  FileSpreadsheet,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface OverviewDashboardProps {
  onSelectWork: (workId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onSelectWork }) => {
  const {
    works,
    stages,
    budgetItems,
    orders,
    incurredCosts,
    revenues,
    budgetAccounts,
    erpCostAccounts,
    budgetToErpMappings,
    erpToBudgetTotalizerMappings,
    budgetVersions,
    inccAdjustments,
  } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Seletor de Dimensão do Dashboard (Seção 14 da Especificação)
  const [dashboardView, setDashboardView] = useState<'geral' | 'fisica' | 'financeira' | 'integrada'>('geral');

  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedManager, setSelectedManager] = useState<string>('todos');
  const [selectedUf, setSelectedUf] = useState<string>('todos');
  const [selectedCity, setSelectedCity] = useState<string>('todos');
  const [selectedEngineer, setSelectedEngineer] = useState<string>('todos');

  // Estado para destaque interativo das barras nos gráficos ao passar o mouse
  const [hoveredFinIndex, setHoveredFinIndex] = useState<number | null>(null);
  const [hoveredProgressIndex, setHoveredProgressIndex] = useState<number | null>(null);

  // Listas únicas de filtros
  const uniqueUfs = Array.from(new Set(works.map((w) => w.state || w.city_state?.split('/')[1] || '').filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(works
    .filter((w) => selectedUf === 'todos' || (w.state || w.city_state?.split('/')[1]) === selectedUf)
    .map((w) => w.city || w.city_state?.split('/')[0] || '')
    .filter(Boolean)
  )).sort();
  const uniqueEngineers = Array.from(new Set(works.map((w) => w.engineer_name || w.manager_name).filter(Boolean))).sort();
  const managersList = Array.from(new Set(works.map((w) => w.manager_name)));

  // Filtros combinados
  const filteredWorks = works.filter((w) => {
    const workState = w.state || w.city_state?.split('/')[1] || '';
    const workCity = w.city || w.city_state?.split('/')[0] || '';
    const workEng = w.engineer_name || w.manager_name || '';

    if (selectedStatus !== 'todos' && w.status !== selectedStatus) return false;
    if (selectedManager !== 'todos' && w.manager_name !== selectedManager) return false;
    if (selectedUf !== 'todos' && workState !== selectedUf) return false;
    if (selectedCity !== 'todos' && workCity !== selectedCity) return false;
    if (selectedEngineer !== 'todos' && workEng !== selectedEngineer) return false;
    return true;
  });

  // Métricas Consolidadas baseadas no conjunto filtrado
  const activeWorks = filteredWorks.filter((w) => w.status === 'em_andamento');
  
  // Detecção de atraso
  const today = new Date().toISOString().split('T')[0];
  const delayedWorksCount = filteredWorks.filter((w) => {
    return stages.some((s) => s.work_id === w.id && s.planned_end < today && s.progress_percent < 100);
  }).length;

  // Totais orçamentários consolidados do filtro
  const filteredWorkIds = new Set(filteredWorks.map((w) => w.id));
  const totalApprovedBudget = budgetItems
    .filter((b) => filteredWorkIds.has(b.work_id))
    .reduce((acc, b) => acc + (b.total_planned || 0), 0);
  const totalIncurred = incurredCosts
    .filter((c) => filteredWorkIds.has(c.work_id))
    .reduce((acc, c) => acc + (c.net_value || 0), 0);
  const totalCommitted = orders
    .filter((o) => filteredWorkIds.has(o.work_id) && ['aprovado', 'enviado', 'parcialmente_recebido'].includes(o.status))
    .reduce((acc, o) => acc + (o.total_amount || 0), 0);

  const totalRecognizedRevenue = revenues
    .filter((r) => filteredWorkIds.has(r.work_id))
    .reduce((acc, r) => acc + (r.recognized_value || 0), 0);
  const accumulatedResult = totalRecognizedRevenue - totalIncurred;
  const consolidatedMargin = totalRecognizedRevenue > 0
    ? (accumulatedResult / totalRecognizedRevenue) * 100
    : 0;

  // Avanço físico médio ponderado das obras ativas
  const avgProgress = activeWorks.length > 0
    ? activeWorks.reduce((acc, w) => acc + (w.progress_percent || 0), 0) / activeWorks.length
    : 0;

  // Pedidos em aberto pendentes de entrega
  const pendingOrders = orders.filter((o) => filteredWorkIds.has(o.work_id) && ['aprovado', 'enviado'].includes(o.status));

  // Etapas em atraso crítico
  const todayStr = new Date().toISOString().split('T')[0];
  const delayedStages = stages.filter(
    (s) => filteredWorkIds.has(s.work_id) && s.planned_end < todayStr && s.progress_percent < 100
  );

  // Dados para Gráficos
  const financialComparisonData = filteredWorks.map((w) => {
    const fin = calculateFinancials(w, budgetItems, orders, incurredCosts, revenues);
    return {
      name: w.name.length > 18 ? w.name.slice(0, 18) + '...' : w.name,
      fullName: w.name,
      Orçado: fin.approvedBudget,
      Incorrido: fin.incurredCosts,
      Comprometido: fin.committedOrders,
    };
  });

  const progressComparisonData = filteredWorks.map((w) => ({
    name: w.name.length > 20 ? w.name.slice(0, 20) + '...' : w.name,
    fullName: w.name,
    Avanço: w.progress_percent,
  }));

  // Métricas do Acompanhamento Físico (Seção 14 da Especificação)
  const filteredStages = stages.filter((s) => filteredWorkIds.has(s.work_id));
  const completedStagesCount = filteredStages.filter((s) => s.progress_percent >= 100).length;
  const inProgressStagesCount = filteredStages.filter((s) => s.progress_percent > 0 && s.progress_percent < 100).length;
  const delayedStagesCountTotal = filteredStages.filter((s) => s.planned_end < todayStr && s.progress_percent < 100).length;

  const worksPhysical = filteredWorks.map((w) => {
    const wAccounts = budgetAccounts.filter((b) => b.work_id === w.id);
    const weighted = calculatePhysicalProgressWeighted(wAccounts);
    const wStages = stages.filter((s) => s.work_id === w.id);
    return {
      work: w,
      accounts: wAccounts,
      weightedProgress: wAccounts.length > 0 ? weighted.weightedProgress : w.progress_percent,
      totalWeight: weighted.totalWeight,
      isValidWeight: weighted.isValidWeightSum,
      stages: wStages,
      expectedEnd: w.actual_end || w.planned_end,
    };
  });

  const overallWeightedAvg = worksPhysical.length > 0
    ? worksPhysical.reduce((acc, wp) => acc + wp.weightedProgress, 0) / worksPhysical.length
    : 0;

  // Métricas do Acompanhamento Financeiro (Seção 14 da Especificação)
  const totalFinancialProjected = totalApprovedBudget;
  const totalFinancialRealized = totalIncurred;
  const totalFinancialCommitted = totalCommitted;
  const totalFinancialBalance = totalFinancialProjected - totalFinancialRealized;
  const totalFinancialVariance = totalFinancialRealized - totalFinancialProjected;
  const totalFinancialVariancePercent = totalFinancialProjected > 0
    ? ((totalFinancialRealized - totalFinancialProjected) / totalFinancialProjected) * 100
    : 0;

  // Custo por Etapa
  const stageCosts = filteredStages.map((s) => {
    const stageIncurred = incurredCosts
      .filter((c) => c.stage_id === s.id)
      .reduce((sum, c) => sum + (c.net_value || 0), 0);
    const stageBudget = s.budget_planned || 0;
    const stageVariance = stageIncurred - stageBudget;
    return {
      stage: s,
      incurred: stageIncurred,
      budget: stageBudget,
      variance: stageVariance,
      variancePercent: stageBudget > 0 ? ((stageIncurred - stageBudget) / stageBudget) * 100 : 0,
    };
  });

  // Custo por Conta Totalizadora do ERP
  const totalizerCosts = erpCostAccounts
    .filter((a) => a.is_totalizer)
    .map((tot) => {
      const detailedChildIds = erpToBudgetTotalizerMappings
        .filter((m) => (m.totalizer_erp_account_id === tot.id || m.totalizer_account_id === tot.id) && m.is_active)
        .map((m) => m.detailed_erp_account_id || m.erp_cost_account_id);
      const detailedAccounts = erpCostAccounts.filter(
        (a) => detailedChildIds.includes(a.id) || a.parent_id === tot.id
      );
      const allCodes = [tot.code, ...detailedAccounts.map((d) => d.code)];
      const totalValue = incurredCosts
        .filter((c) => filteredWorkIds.has(c.work_id) && ((c.erp_account_code && allCodes.includes(c.erp_account_code)) || (c.cost_account_id && [tot.id, ...detailedAccounts.map((d) => d.id)].includes(c.cost_account_id))))
        .reduce((sum, c) => sum + (c.net_value || 0), 0);
      return {
        totalizer: tot,
        detailedCount: detailedAccounts.length,
        totalValue,
      };
    })
    .filter((t) => t.totalValue > 0 || t.detailedCount > 0);

  // Custo por Conta Detalhada do ERP
  const detailedCostsList = erpCostAccounts
    .filter((a) => !a.is_totalizer)
    .map((acc) => {
      const costVal = incurredCosts
        .filter((c) => filteredWorkIds.has(c.work_id) && (c.erp_account_code === acc.code || c.cost_account_id === acc.id))
        .reduce((sum, c) => sum + (c.net_value || 0), 0);
      return {
        account: acc,
        costVal,
      };
    })
    .filter((d) => d.costVal > 0);

  // Custos ainda não classificados
  const unclassifiedCosts = incurredCosts.filter(
    (c) => filteredWorkIds.has(c.work_id) && (!c.erp_account_code && !c.cost_account_id)
  );
  const totalUnclassifiedValue = unclassifiedCosts.reduce((sum, c) => sum + (c.net_value || 0), 0);

  // Evolução Mensal dos custos
  const monthlyCostsMap = new Map<string, number>();
  incurredCosts
    .filter((c) => filteredWorkIds.has(c.work_id))
    .forEach((c) => {
      const m = c.competence_month || (c.date ? c.date.slice(0, 7) : '2026-01');
      monthlyCostsMap.set(m, (monthlyCostsMap.get(m) || 0) + (c.net_value || 0));
    });
  const monthlyCostsData = Array.from(monthlyCostsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, valor]) => ({ mes, Realizado: valor }));

  // Impacto de revisões e INCC
  const filteredIncc = inccAdjustments.filter((a) => filteredWorkIds.has(a.work_id));
  const totalInccAdjustment = filteredIncc.reduce((sum, a) => sum + (a.total_adjusted_amount || a.total_adjustment_value || a.difference_amount || 0), 0);
  const revisedVersions = budgetVersions.filter((v) => filteredWorkIds.has(v.work_id) && v.version_number > 1);

  // Métricas do Comparativo Integrado (Seção 14 da Especificação)
  const integratedMetricsList = filteredWorks.map((w) => {
    return {
      work: w,
      metrics: calculateIntegratedComparisonMetrics(w, budgetAccounts, incurredCosts, orders),
    };
  });
  const worksWithCostAbovePhysical = integratedMetricsList.filter((im) => im.metrics.statusAlert === 'alerta_custo_alto' || im.metrics.alerta_custo_alto);
  const worksWithPhysicalAboveCost = integratedMetricsList.filter((im) => im.metrics.statusAlert === 'alerta_avanco_alto' || im.metrics.alerta_avanco_alto);
  const stagesWithHighestVariance = [...stageCosts].sort((a, b) => b.variance - a.variance).slice(0, 6);
  const stagesWithDeadlineChanges = filteredStages.filter((s) => s.actual_end && s.actual_end !== s.planned_end);

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Executivo e Barra de Filtros por UF, Cidade e Engenheiro */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Painel Executivo Geral</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Visão consolidada da performance física, orçamentária e financeira com filtros por Estado, Cidade e Engenheiro.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3.5 py-1.5 rounded-xl font-bold border transition-colors bg-sky-100 text-[#004171] border-sky-200 dark:bg-[#004171]/40 dark:border-[#1c3e5c] dark:text-[#38bdf8] shadow-sm">
              {filteredWorks.length} obra(s) filtrada(s)
            </span>
          </div>
        </div>

        {/* Filtros em Linha: UF + Cidade + Engenheiro + Gestor + Status */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />
            <span className="text-slate-800 dark:text-slate-400 font-bold">UF:</span>
            <select
              value={selectedUf}
              onChange={(e) => {
                setSelectedUf(e.target.value);
                setSelectedCity('todos');
              }}
              className="bg-transparent text-[#004171] dark:text-[#38bdf8] focus:outline-none cursor-pointer font-bold"
            >
              <option value="todos" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Todas as UFs</option>
              {uniqueUfs.map((uf) => (
                <option key={uf} value={uf} className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">{uf}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            <span className="text-slate-800 dark:text-slate-400 font-bold">Cidade:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer font-bold max-w-[150px] truncate"
            >
              <option value="todos" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Todas as Cidades</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c} className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />
            <span className="text-slate-800 dark:text-slate-400 font-bold">Engenheiro:</span>
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="bg-transparent text-[#004171] dark:text-[#38bdf8] focus:outline-none cursor-pointer font-bold max-w-[180px] truncate"
            >
              <option value="todos" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Todos os Engenheiros</option>
              {uniqueEngineers.map((eng) => (
                <option key={eng} value={eng} className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">{eng}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-800 dark:text-slate-400 font-bold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="todos" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Todos os Status</option>
              <option value="planejamento" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Planejamento</option>
              <option value="em_andamento" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Em Andamento</option>
              <option value="pausada" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Pausada</option>
              <option value="concluida" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Concluída</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
            <span className="text-slate-800 dark:text-slate-400 font-bold">Gestor:</span>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="todos" className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">Todos os Gestores</option>
              {managersList.map((m) => (
                <option key={m} value={m} className="bg-white text-slate-900 dark:bg-[#081d2c] dark:text-slate-100">{m}</option>
              ))}
            </select>
          </div>

          {(selectedUf !== 'todos' || selectedCity !== 'todos' || selectedEngineer !== 'todos' || selectedStatus !== 'todos' || selectedManager !== 'todos') && (
            <button
              onClick={() => {
                setSelectedUf('todos');
                setSelectedCity('todos');
                setSelectedEngineer('todos');
                setSelectedStatus('todos');
                setSelectedManager('todos');
              }}
              className="px-2.5 py-1 text-[11px] text-slate-700 hover:text-black rounded-lg bg-slate-200 hover:bg-slate-300 dark:text-slate-400 dark:hover:text-white dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Dimensões do Dashboard (Seção 14 da Especificação) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setDashboardView('geral')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            dashboardView === 'geral'
              ? 'bg-[#004171] text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Visão Executiva Geral</span>
        </button>

        <button
          onClick={() => setDashboardView('fisica')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            dashboardView === 'fisica'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Área Física</span>
        </button>

        <button
          onClick={() => setDashboardView('financeira')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            dashboardView === 'financeira'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Área Financeira</span>
        </button>

        <button
          onClick={() => setDashboardView('integrada')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
            dashboardView === 'integrada'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Comparativo Integrado</span>
        </button>
      </div>

      {dashboardView === 'geral' && (
        <div className="space-y-6">
          {/* Grid de Cards de Indicadores Principais (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Obras Ativas & Atrasos */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Obras em Andamento</span>
            <div className="p-2 rounded-xl bg-sky-100 text-[#004171] dark:bg-[#004171]/25 dark:text-[#38bdf8]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{activeWorks.length}</div>
          <div className="mt-2 flex items-center text-xs space-x-2">
            {delayedWorksCount > 0 ? (
              <span className="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {delayedWorksCount} com atraso no cronograma
              </span>
            ) : (
              <span className="flex items-center text-sky-700 dark:text-[#38bdf8] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Todas no prazo previsto
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Avanço Físico Médio */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avanço Físico Médio</span>
            <div className="p-2 rounded-xl bg-sky-100 text-[#004171] dark:bg-[#0284c7]/20 dark:text-[#38bdf8]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{formatPercent(avgProgress)}</div>
          <div className="mt-2 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#004171] to-[#38bdf8] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, avgProgress)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Orçamento e Custos */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Custos Incorridos</span>
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-600/20 dark:text-cyan-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{formatBRL(totalIncurred)}</div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Orçado Aprovado:</span>
            <strong className="text-slate-900 dark:text-slate-200">{formatBRL(totalApprovedBudget)}</strong>
          </div>
        </div>

        {/* Card 4: Resultado & Margem Consolidada */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resultado Acumulado</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatBRL(accumulatedResult)}</div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Margem Média:</span>
            <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-transparent">
              {formatPercent(consolidatedMargin)}
            </span>
          </div>
        </div>
      </div>

      {/* Faixa de Destaques Secundários: Comprometido & Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-700 dark:text-slate-400 block font-semibold">Comprometido em Aberto</span>
              <strong className="text-sm text-slate-900 dark:text-white font-bold">{formatBRL(totalCommitted)}</strong>
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Pedidos ativos</span>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-100 text-[#004171] dark:bg-blue-500/10 dark:text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-700 dark:text-slate-400 block font-semibold">Pedidos Aguardando Entrega</span>
              <strong className="text-sm text-slate-900 dark:text-white font-bold">{pendingOrders.length} pedido(s)</strong>
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Em trânsito</span>
        </div>

        <div className="glass-card p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-700 dark:text-slate-400 block font-semibold">Etapas em Atraso</span>
              <strong className="text-sm text-red-600 dark:text-red-400 font-bold">{delayedStages.length} etapa(s) crítica(s)</strong>
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ação requerida</span>
        </div>
      </div>

      {/* Gráficos Analíticos Gerenciais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Orçado vs Incorrido vs Comprometido */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Comparativo Financeiro por Obra</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Orçamento Aprovado vs Custos Incorridos vs Comprometido (R$)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={financialComparisonData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                onMouseMove={(state) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setHoveredFinIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredFinIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#334155', fontWeight: 600 }}
                />
                <YAxis
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#334155', fontWeight: 600 }}
                  tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const fullName = payload[0]?.payload?.fullName || label;
                      return (
                        <div className={`p-3.5 rounded-xl border shadow-2xl text-xs space-y-2 min-w-[220px] ${
                          isDark ? 'bg-[#081d2c] border-[#1c3e5c] text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
                        }`}>
                          <p className={`font-bold border-b pb-1.5 text-xs tracking-tight ${isDark ? 'border-slate-700/60 text-white' : 'border-slate-200 text-slate-900'}`}>
                            {fullName}
                          </p>
                          <div className="space-y-1.5 pt-0.5">
                            {payload.map((entry: any, index: number) => (
                              <div key={`fin-${index}`} className="flex items-center justify-between space-x-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                                  <span className={isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}>{entry.name}:</span>
                                </div>
                                <span className={`font-bold font-mono ${
                                  entry.name === 'Incorrido'
                                    ? isDark ? 'text-[#38bdf8]' : 'text-[#0284c7]'
                                    : entry.name === 'Comprometido'
                                    ? isDark ? 'text-amber-400' : 'text-amber-600'
                                    : isDark ? 'text-slate-100' : 'text-slate-900'
                                }`}>
                                  {formatBRL(Number(entry.value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Orçado" radius={[4, 4, 0, 0]}>
                  {financialComparisonData.map((_, index) => {
                    const isHovered = hoveredFinIndex === index;
                    const defaultColor = isDark ? "#0284c7" : "#004171";
                    const hoverColor = isDark ? "#38bdf8" : "#0ea5e9";
                    return (
                      <Cell
                        key={`bar-orc-${index}`}
                        fill={isHovered ? hoverColor : defaultColor}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isHovered
                            ? (isDark ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))' : 'drop-shadow(0 2px 5px rgba(14, 165, 233, 0.45))')
                            : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Bar>
                <Bar dataKey="Incorrido" radius={[4, 4, 0, 0]}>
                  {financialComparisonData.map((_, index) => {
                    const isHovered = hoveredFinIndex === index;
                    const defaultColor = "#38bdf8";
                    const hoverColor = isDark ? "#7dd3fc" : "#0284c7";
                    return (
                      <Cell
                        key={`bar-inc-${index}`}
                        fill={isHovered ? hoverColor : defaultColor}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isHovered
                            ? (isDark ? 'drop-shadow(0 0 6px rgba(125, 211, 252, 0.7))' : 'drop-shadow(0 2px 5px rgba(2, 132, 199, 0.45))')
                            : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Bar>
                <Bar dataKey="Comprometido" radius={[4, 4, 0, 0]}>
                  {financialComparisonData.map((_, index) => {
                    const isHovered = hoveredFinIndex === index;
                    const defaultColor = "#c59042";
                    const hoverColor = isDark ? "#fbbf24" : "#d97706";
                    return (
                      <Cell
                        key={`bar-comp-${index}`}
                        fill={isHovered ? hoverColor : defaultColor}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isHovered
                            ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))'
                            : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Avanço Físico Ponderado por Obra */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Avanço Físico Realizado (%)</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Percentual ponderado das etapas concluídas</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={progressComparisonData}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                onMouseMove={(state) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setHoveredProgressIndex(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredProgressIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#334155', fontWeight: 600 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke={isDark ? "#64748b" : "#94a3b8"}
                  tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#1e293b', fontWeight: 600 }}
                  width={120}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const fullName = payload[0]?.payload?.fullName || label;
                      const val = payload[0]?.value;
                      return (
                        <div className={`p-3.5 rounded-xl border shadow-2xl text-xs space-y-1.5 min-w-[200px] ${
                          isDark ? 'bg-[#081d2c] border-[#1c3e5c] text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
                        }`}>
                          <p className={`font-bold text-xs tracking-tight border-b pb-1.5 ${isDark ? 'border-slate-700/60 text-white' : 'border-slate-200 text-slate-900'}`}>
                            {fullName}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#38bdf8]" />
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}>Avanço Ponderado:</span>
                            </div>
                            <span className="font-bold text-sm font-mono text-[#38bdf8]">{val}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Avanço" radius={[0, 6, 6, 0]}>
                  {progressComparisonData.map((_, index) => {
                    const isHovered = hoveredProgressIndex === index;
                    const defaultColor = isDark ? "#0284c7" : "#004171";
                    const hoverColor = isDark ? "#38bdf8" : "#0ea5e9";
                    return (
                      <Cell
                        key={`bar-prog-${index}`}
                        fill={isHovered ? hoverColor : defaultColor}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isHovered
                            ? (isDark ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))' : 'drop-shadow(0 0 6px rgba(14, 165, 233, 0.55))')
                            : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Comparativa Geral de Obras com Indicador de Saúde */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quadro Resumo de Empreendimentos</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Clique em qualquer obra para acessar o painel detalhado analítico</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold border bg-sky-50 text-[#004171] border-sky-200 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent">
            {filteredWorks.length} obra(s) listada(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Código / Obra</th>
                <th className="px-4 py-3">Incorporação</th>
                <th className="px-4 py-3">UF / Cidade</th>
                <th className="px-4 py-3">Engenheiro / Gestor</th>
                <th className="px-4 py-3 text-center">Avanço Físico</th>
                <th className="px-4 py-3 text-right">Orçamento</th>
                <th className="px-4 py-3 text-right">Incorrido</th>
                <th className="px-4 py-3 text-center">Saúde</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredWorks.map((work) => {
                const fin = calculateFinancials(work, budgetItems, orders, incurredCosts, revenues);
                const health = calculateWorkHealth(work, fin, stages);

                return (
                  <tr
                    key={work.id}
                    onClick={() => onSelectWork(work.id)}
                    className="hover:bg-slate-100/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#004171] border border-sky-200 dark:bg-slate-800 dark:text-blue-400 font-mono text-[10px] font-bold">
                          {work.code}
                        </span>
                        <span className="group-hover:text-[#004171] dark:group-hover:text-blue-400 transition-colors font-bold">{work.name}</span>
                      </div>
                      {work.erp_code && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">ERP: {work.erp_code}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-400">
                      <div className="font-medium text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Própria (Monteplan)</div>
                    </td>

                    <td className="px-4 py-3 text-slate-800 dark:text-slate-300">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-[#004171] border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/50 mr-1.5">
                        {work.state || 'UF'}
                      </span>
                      <span className="text-xs text-slate-800 dark:text-slate-300 font-semibold">{work.city || work.city_state}</span>
                    </td>

                    <td className="px-4 py-3 text-slate-800 dark:text-slate-300">
                      <div className="font-bold text-slate-900 dark:text-slate-200">{work.engineer_name || 'Eng. Não informado'}</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-500 font-medium">Gestor: {work.manager_name}</div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#004171] dark:bg-blue-500 h-full rounded-full"
                            style={{ width: `${work.progress_percent}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-200">{formatPercent(work.progress_percent)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-300">
                      {formatBRL(fin.approvedBudget)}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-[#004171] dark:text-cyan-400">
                      {formatBRL(fin.incurredCosts)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          health.status === 'normal'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                            : health.status === 'atencao'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                            : 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                        }`}
                        title={health.reasons.join(', ')}
                      >
                        {health.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent capitalize">
                        {work.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWork(work.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                        title="Ver Detalhes da Obra"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* ========================================================================= */}
  {/* ÁREA FÍSICA (Seção 14 da Especificação)                                   */}
  {/* ========================================================================= */}
  {dashboardView === 'fisica' && (
    <div className="space-y-6">
      {/* Banner Explicativo de Metodologia Física */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50 flex items-start space-x-3">
        <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-emerald-900 dark:text-emerald-200">Metodologia do Acompanhamento Físico: </span>
          <span className="text-emerald-800 dark:text-emerald-300">
            Mede exclusivamente a produção no canteiro conforme o plano de contas e etapas do orçamento do engenheiro.
            O cálculo do avanço geral da obra é ponderado com base no peso físico de cada etapa (evitando distorções por média simples). Custos do ERP nunca são somados para calcular avanço físico.
          </span>
        </div>
      </div>

      {/* Grid de Indicadores da Área Física */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Avanço Físico Geral Ponderado */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avanço Físico Ponderado</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatPercent(overallWeightedAvg)}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, overallWeightedAvg))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Média ponderada pelos pesos das etapas ativas
          </p>
        </div>

        {/* Card 2: Status das Etapas */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Etapas em Execução</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {inProgressStagesCount}
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 mt-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{completedStagesCount} concluídas</span>
            <span>•</span>
            <span>{filteredStages.length} no total</span>
          </div>
        </div>

        {/* Card 3: Etapas Atrasadas */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Etapas Atrasadas</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {delayedStagesCountTotal}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            {delayedStagesCountTotal > 0 ? 'Exigem replanejamento de cronograma' : 'Nenhuma etapa com prazo vencido'}
          </p>
        </div>

        {/* Card 4: Previsão de Conclusão */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Previsão de Conclusão</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {filteredWorks.length > 0 ? (filteredWorks[0].actual_end ? formatDateBR(filteredWorks[0].actual_end) : formatDateBR(filteredWorks[0].planned_end)) : 'N/D'}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Prazo vigente da obra em acompanhamento
          </p>
        </div>
      </div>

      {/* Gráfico de Avanço por Etapa: Planejado vs Realizado */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Avanço por Etapa: Planejado versus Realizado</span>
        </h3>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredStages.slice(0, 10).map((s) => ({
                name: s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name,
                Planejado: s.progress_planned || 0,
                Realizado: s.progress_percent || 0,
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} angle={-15} textAnchor="end" />
              <YAxis unit="%" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
              <Tooltip
                formatter={(val: number) => [`${val}%`, '']}
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  borderRadius: '12px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Planejado" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela do Acompanhamento Físico */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Detalhamento de Etapas do Orçamento Físico
          </h4>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {filteredStages.length} etapa(s) listada(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Etapa / Atividade</th>
                <th className="px-4 py-3 text-center">Peso Físico</th>
                <th className="px-4 py-3 text-center">Planejado</th>
                <th className="px-4 py-3 text-center">Realizado</th>
                <th className="px-4 py-3 text-center">Prazo Planejado</th>
                <th className="px-4 py-3 text-center">Prazo Real / Novo</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredStages.map((stg) => (
                <tr key={stg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-200">
                    {stg.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-slate-200">{stg.name}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">Resp: {stg.responsible || 'Engenharia'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-200">
                    {formatPercent(stg.weight_percent)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                    {formatPercent(stg.progress_planned)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {formatPercent(stg.progress_percent)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                    {formatDateBR(stg.planned_start)} até {formatDateBR(stg.planned_end)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">
                    {stg.actual_end ? formatDateBR(stg.actual_end) : (stg.actual_start ? `Iniciado em ${formatDateBR(stg.actual_start)}` : '-')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      stg.status === 'concluida'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : stg.status === 'em_andamento'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        : stg.status === 'atrasada'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {stg.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* ========================================================================= */}
  {/* ÁREA FINANCEIRA (Seção 14 da Especificação)                               */}
  {/* ========================================================================= */}
  {dashboardView === 'financeira' && (
    <div className="space-y-6">
      {/* Banner Explicativo de Metodologia Financeira */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-blue-900 dark:text-blue-200">Metodologia do Acompanhamento Financeiro: </span>
          <span className="text-blue-800 dark:text-blue-300">
            Confronta o orçamento projetado com os valores realizados, organizados pelas contas de custo e despesa do ERP através dos dois níveis de de-para:
            De-para 1 (Orçamento x ERP) e De-para 2 (Contas Detalhadas x Conta Totalizadora do ERP).
          </span>
        </div>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Projetado */}
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Orçado / Projetado</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBRL(totalFinancialProjected)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Base orçamentária aprovada</div>
        </div>

        {/* Realizado */}
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Realizado (ERP)</div>
          <div className="text-xl font-black text-blue-600 dark:text-cyan-400 mt-1">
            {formatBRL(totalFinancialRealized)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Custos efetivamente incorridos</div>
        </div>

        {/* Comprometido */}
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Comprometido</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {formatBRL(totalFinancialCommitted)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Pedidos de compra aprovados</div>
        </div>

        {/* Saldo */}
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Saldo Disponível</div>
          <div className={`text-xl font-black mt-1 ${totalFinancialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatBRL(totalFinancialBalance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Projetado − Realizado</div>
        </div>

        {/* Desvio */}
        <div className="glass-card p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Desvio Financeiro</div>
          <div className={`text-xl font-black mt-1 ${totalFinancialVariance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatBRL(totalFinancialVariance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {totalFinancialVariancePercent > 0 ? `+${totalFinancialVariancePercent.toFixed(1)}% sobre projetado` : `${totalFinancialVariancePercent.toFixed(1)}% economizado`}
          </div>
        </div>
      </div>

      {/* Gráficos Financeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Custo por Etapa */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Custo por Etapa: Orçado versus Realizado</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageCosts.slice(0, 8).map((sc) => ({
                  name: sc.stage.name.length > 18 ? sc.stage.name.slice(0, 18) + '...' : sc.stage.name,
                  Orçado: sc.budget,
                  Realizado: sc.incurred,
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => [formatBRL(val), '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realizado" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Evolução Mensal */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Evolução Mensal de Custos Realizados</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyCostsData.length > 0 ? monthlyCostsData : [{ mes: '2026-01', Realizado: totalFinancialRealized }]}
                margin={{ top: 10, right: 30, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="mes" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => [formatBRL(val), 'Realizado']}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                />
                <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seção 2 Níveis de ERP: Totalizadoras e Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas Totalizadoras do ERP */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Custo por Conta Totalizadora do ERP (De-para 2)</span>
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {totalizerCosts.map((tc) => (
              <div key={tc.totalizer.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mr-2">{tc.totalizer.code}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{tc.totalizer.description || tc.totalizer.name}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">{tc.detailedCount} conta(s) detalhada(s) consolidada(s)</div>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{formatBRL(tc.totalValue)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contas Detalhadas do ERP */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Custo por Conta Detalhada do ERP</span>
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {detailedCostsList.map((dc) => (
              <div key={dc.account.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mr-2">{dc.account.code}</span>
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">{dc.account.description || dc.account.name}</span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-200">{formatBRL(dc.costVal)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta de Contas Não Classificadas e Impacto do INCC/Revisões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerta de Contas Não Classificadas */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          totalUnclassifiedValue > 0
            ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-200'
            : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300'
        }`}>
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-xs">Custos Pendentes de Classificação</div>
              <div className="text-[11px] opacity-80">{unclassifiedCosts.length} lançamento(s) sem de-para completo</div>
            </div>
          </div>
          <div className="font-mono font-bold text-sm">
            {formatBRL(totalUnclassifiedValue)}
          </div>
        </div>

        {/* Impacto do INCC e Revisões */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <History className="w-5 h-5 text-[#004171] dark:text-[#38bdf8] shrink-0" />
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Impacto do INCC e Revisões</div>
              <div className="text-[11px] text-slate-500">{revisedVersions.length} versão(ões) revisada(s)</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {formatBRL(totalInccAdjustment)}
            </div>
            <div className="text-[10px] text-slate-500">Ajustes registrados pelo INCC</div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* ========================================================================= */}
  {/* COMPARATIVO INTEGRADO (Seção 14 da Especificação)                          */}
  {/* ========================================================================= */}
  {dashboardView === 'integrada' && (
    <div className="space-y-6">
      {/* Box Pedagógico Central da Integração */}
      <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/50 space-y-2">
        <div className="flex items-center space-x-2 text-purple-900 dark:text-purple-200 font-bold text-sm">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Diretriz Metodológica: Separação Clara entre Físico e Financeiro</span>
        </div>
        <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
          O <strong>Acompanhamento Físico</strong> afere o avanço real da construção no canteiro conforme a ponderação das etapas orçadas pelo engenheiro.
          O <strong>Acompanhamento Financeiro</strong> confronta os valores orçados com as despesas e custos realizados do ERP através do de-para em 2 níveis.
          Essas duas dimensões devem ser confrontadas para sinalizar divergências gerenciais, sem que suas fórmulas de cálculo sejam confundidas ou misturadas.
        </p>
      </div>

      {/* Grid de Cards de Destaque de Desvios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Custo Acima do Físico */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">Custo &gt; Físico</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {worksWithCostAbovePhysical.length} obra(s)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Desembolso financeiro adiantado em relação à produção
          </p>
        </div>

        {/* Card 2: Físico Acima do Custo */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">Físico &gt; Custo</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {worksWithPhysicalAboveCost.length} obra(s)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Produção avançada ou pendência de faturamento/lançamento
          </p>
        </div>

        {/* Card 3: Etapas com Maior Desvio */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">Desvios Críticos</span>
            <div className="p-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stagesWithHighestVariance.filter((s) => s.variance > 0).length} etapa(s)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Com custo realizado superior ao orçamento
          </p>
        </div>

        {/* Card 4: Alterações de Prazo */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">Ajustes de Prazo</span>
            <div className="p-2 rounded-xl bg-sky-100 text-[#004171] dark:bg-[#004171]/25 dark:text-[#38bdf8]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stagesWithDeadlineChanges.length} etapa(s)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-medium">
            Com datas reais ou revisadas divergentes do plano original
          </p>
        </div>
      </div>

      {/* Tabela Comparativa: Avanço Físico vs Consumo Financeiro por Obra */}
      <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Confronto Integrado por Obra
          </h4>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {filteredWorks.length} obra(s) avaliada(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3 text-center">Avanço Físico</th>
                <th className="px-4 py-3 text-center">Consumo Financeiro</th>
                <th className="px-4 py-3 text-center">Diferença (Fin − Fís)</th>
                <th className="px-4 py-3 text-right">Orçamento</th>
                <th className="px-4 py-3 text-right">Realizado</th>
                <th className="px-4 py-3 text-center">Diagnóstico Integrado</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {integratedMetricsList.map(({ work, metrics }) => (
                <tr key={work.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-slate-200">{work.name}</div>
                    <div className="text-[10px] text-slate-500">{work.city || work.city_state}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPercent(metrics.physicalProgressWeighted)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-blue-600 dark:text-cyan-400">
                      {formatPercent(metrics.financialConsumedPercent)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold">
                    <span className={metrics.deviationPercent < -5 ? 'text-amber-600 dark:text-amber-400' : metrics.deviationPercent > 5 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}>
                      {metrics.deviationPercent > 0 ? `+${metrics.deviationPercent.toFixed(1)} pp` : `${metrics.deviationPercent.toFixed(1)} pp`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-300">
                    {formatBRL(metrics.totalBudgetPlanned)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-200">
                    {formatBRL(metrics.totalCostsIncurred)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {metrics.statusAlert === 'alerta_custo_alto' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Custo &gt; Físico
                      </span>
                    ) : metrics.statusAlert === 'alerta_avanco_alto' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        <Activity className="w-3 h-3 mr-1" />
                        Físico &gt; Custo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Equilibrado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onSelectWork(work.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                      title="Ver Obra"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking de Etapas com Maior Desvio Financeiro */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Ranking das Etapas com Maior Desvio Financeiro</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stagesWithHighestVariance.map((sc) => (
            <div key={sc.stage.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{sc.stage.name}</span>
                <span className={`font-bold ${sc.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatBRL(sc.variance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Orçado: {formatBRL(sc.budget)}</span>
                <span>Realizado: {formatBRL(sc.incurred)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}
</div>
);
};

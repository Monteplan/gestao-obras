import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowRight,
  TrendingUp,
  Percent,
  DollarSign,
  Scale,
  Eye,
  Info,
  Layers,
  FileText,
} from 'lucide-react';
import {
  calculateIntegratedComparisonMetrics,
  formatBRL,
  formatDateBR,
} from '../../lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const IntegratedProgressView: React.FC<{ defaultWorkId?: string }> = ({ defaultWorkId }) => {
  const {
    works,
    budgetVersions,
    budgetAccounts,
    incurredCosts,
    orders,
    stages,
    budgetToErpMappings,
    erpToBudgetTotalizerMappings,
  } = useData();

  const [selectedWorkId, setSelectedWorkId] = useState<string>(
    defaultWorkId || works[0]?.id || 'work-1'
  );
  const selectedWork = works.find((w) => w.id === selectedWorkId) || works[0];

  // Métricas do comparativo integrado para a obra selecionada
  const metrics = useMemo(() => {
    return calculateIntegratedComparisonMetrics(
      selectedWork,
      budgetAccounts,
      incurredCosts,
      orders
    );
  }, [selectedWork, budgetAccounts, incurredCosts, orders]);

  // Modal para consultar Etapa Lado a Lado
  const [selectedStageForInspection, setSelectedStageForInspection] = useState<any | null>(null);

  // Etapas / Grupos com comparativo individual
  const stagesComparison = useMemo(() => {
    const workBudgetAccounts = budgetAccounts.filter(
      (a) => a.work_id === selectedWorkId && a.status !== 'inativo'
    );
    const groups = workBudgetAccounts.filter(
      (a) => a.account_type === 'grupo' || a.account_type === 'etapa'
    );

    return groups.map((grp) => {
      // Atividades filhas deste grupo
      const childActivities = workBudgetAccounts.filter(
        (a) => a.account_type === 'atividade' && a.code.startsWith(grp.code + '.')
      );

      const plannedAmount = childActivities.reduce((s, a) => s + (Number(a.total_amount) || 0), 0);
      const totalWeight = childActivities.reduce((s, a) => s + (Number(a.physical_weight_percent) || 0), 0);
      const weightedSum = childActivities.reduce(
        (s, a) => s + (Number(a.progress_actual || 0) * (Number(a.physical_weight_percent) || 0)),
        0
      );
      const stagePhysicalProgress = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

      // Custos vinculados às atividades deste grupo
      const childCodes = childActivities.map((c) => c.code);
      const linkedMappings = budgetToErpMappings.filter((m) => childCodes.includes(m.budget_account_code || ''));
      const linkedErpCodes = linkedMappings.map((m) => m.erp_account_code);

      // Inclui contas detalhadas do ERP via De-para 2
      const detailedMappings = erpToBudgetTotalizerMappings.filter((m) =>
        linkedErpCodes.includes(m.totalizer_erp_account_code)
      );
      const allEligibleErpCodes = [
        ...linkedErpCodes,
        ...detailedMappings.map((m) => m.detailed_erp_account_code),
      ];

      const stageRealizedCosts = incurredCosts
        .filter(
          (c) =>
            c.work_id === selectedWorkId &&
            c.erp_account_code &&
            allEligibleErpCodes.includes(c.erp_account_code)
        )
        .reduce((s, c) => s + (Number(c.net_value) || 0), 0);

      const stageFinancialConsumed = plannedAmount > 0
        ? Math.round((stageRealizedCosts / plannedAmount) * 1000) / 10
        : 0;

      const deltaStage = Math.round((stageFinancialConsumed - stagePhysicalProgress) * 10) / 10;

      return {
        group: grp,
        activities: childActivities,
        plannedAmount,
        physicalProgress: stagePhysicalProgress,
        realizedCosts: stageRealizedCosts,
        financialConsumed: stageFinancialConsumed,
        delta: deltaStage,
        linkedErpCodes,
      };
    });
  }, [budgetAccounts, selectedWorkId, budgetToErpMappings, erpToBudgetTotalizerMappings, incurredCosts]);

  // Gráfico comparativo de todas as obras (Avanço Físico x Consumo Financeiro)
  const allWorksComparisonData = useMemo(() => {
    return works.map((w) => {
      const m = calculateIntegratedComparisonMetrics(w, budgetAccounts, incurredCosts, orders);
      return {
        name: w.code,
        obra: w.name,
        avancoFisico: m.physicalProgressWeighted,
        consumoFinanceiro: m.financialConsumedPercent,
      };
    });
  }, [works, budgetAccounts, incurredCosts, orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Visão Integrada Físico-Financeira
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Sem mistura de fórmulas
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Confronto direto entre o Avanço Físico da Engenharia (%) e o Consumo Financeiro do ERP (%), gerando alertas de gestão.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#004171]"
          >
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerta Gerencial Inteligente (Conforme Especificação) */}
      <div
        className={`p-5 rounded-2xl border flex items-start space-x-3 transition-all ${
          metrics.statusAlert === 'alerta_custo_alto'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
            : metrics.statusAlert === 'alerta_avanco_alto'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
        }`}
      >
        {metrics.statusAlert === 'alerta_custo_alto' ? (
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        ) : metrics.statusAlert === 'alerta_avanco_alto' ? (
          <Info className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        )}

        <div className="space-y-1">
          <h4
            className={`text-sm font-bold ${
              metrics.statusAlert === 'alerta_custo_alto'
                ? 'text-rose-900 dark:text-rose-200'
                : metrics.statusAlert === 'alerta_avanco_alto'
                ? 'text-amber-900 dark:text-amber-200'
                : 'text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {metrics.statusAlert === 'alerta_custo_alto'
              ? 'ALERTA: Consumo Financeiro Muito Acima do Avanço Físico'
              : metrics.statusAlert === 'alerta_avanco_alto'
              ? 'ANÁLISE RECOMENDADA: Avanço Físico Acima do Consumo Financeiro'
              : 'SITUAÇÃO REGULAR: Físico e Financeiro Equilibrados'}
          </h4>
          <p
            className={`text-xs ${
              metrics.statusAlert === 'alerta_custo_alto'
                ? 'text-rose-800 dark:text-rose-300'
                : metrics.statusAlert === 'alerta_avanco_alto'
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {metrics.alertMessage}
          </p>
          <p className="text-[10px] text-slate-500 italic mt-1">
            * Este alerta é informativo e orienta a auditoria de medições e faturamentos pelo gestor da Monteplan.
          </p>
        </div>
      </div>

      {/* KPI Cards: Lado a Lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Avanço Físico */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Avanço Físico (Engenharia)</span>
            <Percent className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {metrics.physicalProgressWeighted}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Calculado pelos pesos físicos de cada etapa
          </p>
        </div>

        {/* Card 2: Consumo Financeiro */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Consumo Financeiro (ERP)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {metrics.financialConsumedPercent}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Realizado: {formatBRL(metrics.totalCostsIncurred)} de {formatBRL(metrics.totalBudgetPlanned)}
          </p>
        </div>

        {/* Card 3: Delta Físico vs Financeiro */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Divergência (Físico - Financeiro)</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <div
            className={`mt-2 text-3xl font-extrabold ${
              metrics.deviationPercent < -15
                ? 'text-rose-600 dark:text-rose-400'
                : metrics.deviationPercent > 15
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {metrics.deviationPercent > 0 ? '+' : ''}{metrics.deviationPercent}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.deviationPercent < 0 ? 'Consumo financeiro superando obra' : 'Obra física à frente do financeiro'}
          </p>
        </div>

        {/* Card 4: Comprometido a Faturar */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pedidos Comprometidos</span>
            <TrendingUp className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatBRL(metrics.committedOrders)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ordens de compra emitidas pendentes de entrega
          </p>
        </div>
      </div>

      {/* Gráfico Comparativo de Todas as Obras */}
      <div className="bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
              <span>Comparativo Entre Todas as Obras: Avanço Físico (%) vs Consumo Financeiro (%)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Permite aos diretores identificar rapidamente empreendimentos com descompasso entre campo e contabilidade.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allWorksComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} unit="%" stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(value: any) => [`${value}%`]}
                labelFormatter={(label, payload) => {
                  const item = payload[0]?.payload;
                  return `${label} - ${item?.obra || ''}`;
                }}
                contentStyle={{
                  backgroundColor: '#081d2c',
                  border: '1px solid #1c3e5c',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="avancoFisico" name="Avanço Físico Ponderado (%)" fill="#004171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumoFinanceiro" name="Consumo Financeiro ERP (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Etapas com Consulta Lado a Lado */}
      <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-[#0c2336] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Análise das Macroetapas: Físico versus Financeiro
            </h3>
            <p className="text-[11px] text-slate-500">
              Clique em "Inspecionar Lado a Lado" para analisar atividades, pedidos, contas ERP e custos associados.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">
            {stagesComparison.length} macroetapas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#081d2c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1c3e5c]">
              <tr>
                <th className="py-3 px-4">Etapa da Obra</th>
                <th className="py-3 px-4 text-center">Avanço Físico (%)</th>
                <th className="py-3 px-4 text-center">Consumo Financeiro (%)</th>
                <th className="py-3 px-4 text-center">Desvio (Fin - Fís)</th>
                <th className="py-3 px-4 text-right">Orçado</th>
                <th className="py-3 px-4 text-right">Realizado</th>
                <th className="py-3 px-4 text-center">Diagnóstico</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
              {stagesComparison.map((row) => (
                <tr
                  key={row.group.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-[#0c2336]/60 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {row.group.code} - {row.group.description}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {row.activities.length} atividades orçamentárias detalhadas
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#004171] dark:text-[#38bdf8]">
                    {row.physicalProgress}%
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {row.financialConsumed}%
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                        row.delta > 15
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : row.delta < -15
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {row.delta > 0 ? '+' : ''}{row.delta}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                    {formatBRL(row.plannedAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {formatBRL(row.realizedCosts)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.delta > 15 ? (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Custo Acima
                      </span>
                    ) : row.delta < -15 ? (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center">
                        <Info className="w-3.5 h-3.5 mr-1" /> Físico Adiantado
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Equilibrado
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedStageForInspection(row)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-[11px] font-bold"
                    >
                      Consultar Lado a Lado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Consulta Lado a Lado da Etapa */}
      {selectedStageForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1c3e5c] pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Consulta Lado a Lado: {selectedStageForInspection.group.code} - {selectedStageForInspection.group.description}
                </h3>
                <p className="text-xs text-slate-500">
                  Inspeção detalhada de avanço físico versus custos incorridos e pedidos da etapa.
                </p>
              </div>
              <button
                onClick={() => setSelectedStageForInspection(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Painéis Lado a Lado: Físico vs Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Dimensão Física */}
              <div className="bg-slate-50 dark:bg-[#0c2336] p-4 rounded-xl border border-slate-200 dark:border-[#1c3e5c] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1c3e5c] pb-2">
                  <span className="text-xs font-bold text-[#004171] dark:text-[#38bdf8] flex items-center space-x-1">
                    <Percent className="w-4 h-4" />
                    <span>Dimensão Física (Engenharia)</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Avanço: {selectedStageForInspection.physicalProgress}%
                  </span>
                </div>

                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Atividades da Etapa no Orçamento:
                  </h5>
                  <div className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60 max-h-56 overflow-y-auto">
                    {selectedStageForInspection.activities.map((act: any) => (
                      <div key={act.id} className="py-2 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {act.code} - {act.description}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            Peso: {act.physical_weight_percent}% | Prazo: {formatDateBR(act.planned_start)} a {formatDateBR(act.planned_end)}
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                          {act.progress_actual || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Dimensão Financeira */}
              <div className="bg-slate-50 dark:bg-[#0c2336] p-4 rounded-xl border border-slate-200 dark:border-[#1c3e5c] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1c3e5c] pb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Dimensão Financeira (ERP)</span>
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Consumido: {selectedStageForInspection.financialConsumed}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white dark:bg-[#081d2c] rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                      <span className="text-[10px] text-slate-500 block">Valor Orçado</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatBRL(selectedStageForInspection.plannedAmount)}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-[#081d2c] rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                      <span className="text-[10px] text-slate-500 block">Valor Realizado</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatBRL(selectedStageForInspection.realizedCosts)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contas ERP Vinculadas (De-Para 1 e 2):
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStageForInspection.linkedErpCodes.map((code: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white dark:bg-[#081d2c] border border-slate-200 dark:border-[#1c3e5c] rounded text-[11px] font-mono text-[#004171] dark:text-[#38bdf8]"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-[#1c3e5c]">
              <button
                onClick={() => setSelectedStageForInspection(null)}
                className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white rounded-xl text-xs font-bold"
              >
                Fechar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

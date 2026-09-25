import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { BudgetAccount, BudgetAccountStatus } from '../../types';
import {
  Ruler,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Percent,
  TrendingUp,
  FileText,
  Paperclip,
  History,
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { calculatePhysicalProgressWeighted, formatDateBR } from '../../lib/utils';
import { AtriumPhysicalDashboard } from '../works/atrium/AtriumPhysicalDashboard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const PhysicalProgressManager: React.FC<{ defaultWorkId?: string }> = ({ defaultWorkId }) => {
  const {
    works,
    budgetVersions,
    budgetAccounts,
    physicalProgressEntries,
    addPhysicalProgressEntry,
  } = useData();

  const { canEdit, user } = useAuth();
  const isEngineerOrManager = canEdit('physical');

  const [selectedWorkId, setSelectedWorkId] = useState<string>(
    defaultWorkId || works[0]?.id || 'work-1'
  );
  const selectedWork = works.find((w) => w.id === selectedWorkId) || works[0];

  // Versão de orçamento ativa para a obra
  const currentVersion = useMemo(() => {
    return (
      budgetVersions.find((v) => v.work_id === selectedWorkId && v.is_current_approved) ||
      budgetVersions.find((v) => v.work_id === selectedWorkId) ||
      budgetVersions[0]
    );
  }, [budgetVersions, selectedWorkId]);

  // Contas da versão da obra
  const workAccounts = useMemo(() => {
    return budgetAccounts.filter(
      (a) =>
        a.work_id === selectedWorkId &&
        (a.budget_version_id === currentVersion?.id || a.version_id === currentVersion?.id) &&
        a.status !== 'inativo' &&
        a.status !== 'descontinuada'
    );
  }, [budgetAccounts, selectedWorkId, currentVersion]);

  // Cálculo ponderado estrito
  const { weightedProgress, totalConfiguredWeight, isWeightValid } = useMemo(() => {
    return calculatePhysicalProgressWeighted(workAccounts);
  }, [workAccounts]);

  // Filtro de status & árvore expandida
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': true,
    '04': true,
  });

  const toggleExpand = (code: string) => {
    setExpandedNodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Modal de Medição do Engenheiro
  const [measuringAccount, setMeasuringAccount] = useState<BudgetAccount | null>(null);
  const [newPercent, setNewPercent] = useState<number>(0);
  const [measDate, setMeasDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actualStart, setActualStart] = useState<string>('');
  const [actualEnd, setActualEnd] = useState<string>('');
  const [revisedEnd, setRevisedEnd] = useState<string>('');
  const [statusVal, setStatusVal] = useState<BudgetAccountStatus>('em_andamento');
  const [notesVal, setNotesVal] = useState<string>('');
  const [evidenceInput, setEvidenceInput] = useState<string>('');

  const openMeasureModal = (acc: BudgetAccount) => {
    setMeasuringAccount(acc);
    setNewPercent(acc.progress_actual || 0);
    setMeasDate(new Date().toISOString().split('T')[0]);
    setActualStart(acc.actual_start || '');
    setActualEnd(acc.actual_end || '');
    setRevisedEnd(acc.revised_planned_end || acc.planned_end || '');
    setStatusVal(acc.status || 'em_andamento');
    setNotesVal('');
    setEvidenceInput('');
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measuringAccount) return;

    if (newPercent < 0 || newPercent > 100) {
      alert('O percentual realizado deve estar entre 0% e 100%.');
      return;
    }

    addPhysicalProgressEntry({
      work_id: selectedWorkId,
      budget_account_id: measuringAccount.id,
      measurement_date: measDate,
      progress_percent: Number(newPercent),
      actual_start: actualStart || undefined,
      actual_end: newPercent >= 100 ? (actualEnd || measDate) : undefined,
      revised_planned_end: revisedEnd || undefined,
      status: Number(newPercent) >= 100 ? 'concluida' : statusVal,
      notes: notesVal || 'Medição de campo registrada pelo engenheiro',
      evidence_urls: evidenceInput ? [evidenceInput] : undefined,
      measured_by: user?.name || 'Engenheiro de Obra',
      engineer_name: user?.name || 'Engenheiro de Obra',
    });

    setMeasuringAccount(null);
  };

  // Diagnóstico de Etapas
  const delayedStages = workAccounts.filter((a) => {
    if (a.status === 'concluida') return false;
    if (!a.planned_end) return false;
    const now = new Date().toISOString().split('T')[0];
    return a.planned_end < now && (a.progress_actual || 0) < 100;
  });

  const blockedStages = workAccounts.filter((a) => a.status === 'bloqueada');

  const completedStages = workAccounts.filter(
    (a) => a.status === 'concluida' || (a.progress_actual || 0) >= 100
  );

  const inProgressStages = workAccounts.filter(
    (a) => (a.progress_actual || 0) > 0 && (a.progress_actual || 0) < 100
  );

  // Curva S Planejado vs Realizado (Evolução Acumulada nos últimos 6 meses)
  const sCurveData = useMemo(() => {
    const months = ['Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26'];
    const plannedTrend = [10, 25, 42, 60, 78, 100];
    const actualTrend = [8, 22, 38, 52, 64, weightedProgress];

    return months.map((month, idx) => ({
      month,
      planejado: plannedTrend[idx],
      realizado: actualTrend[idx],
    }));
  }, [weightedProgress]);

  // Histórico de medições recentes
  const recentMeasurements = physicalProgressEntries.filter((p) => p.work_id === selectedWorkId).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Obra e Indicador Ponderado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 rounded-xl text-[#004171] dark:text-[#38bdf8]">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Acompanhamento Físico de Obras
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171]/10 text-[#004171] dark:bg-[#004171]/30 dark:text-[#38bdf8]">
                  Plano A (Engenharia)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Evolução por etapas e atividades do orçamento da obra com cálculo ponderado estrito.
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

      {/* Renderização do Dashboard Oficial PCO da Atrium para manter 100% de consistência */}
      {(selectedWork.code === 'ATRIUM' || selectedWork.id === 'work-1') ? (
        <AtriumPhysicalDashboard work={selectedWork} />
      ) : (
        <>
      {/* Alerta de Validação de Pesos Físicos (Exigência do Requisito) */}
      {!isWeightValid && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Aviso de Configuração de Pesos Físicos: Total = {totalConfiguredWeight}% (Diferente de 100%)
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
              O requisito do sistema exige que a soma dos pesos corresponda a 100%. Atualmente a soma cadastrada está em {totalConfiguredWeight}%. O cálculo foi normalizado proporcionalmente.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards de Avanço Físico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Avanço Físico Geral Ponderado */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Avanço Físico Geral</span>
            <Percent className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {weightedProgress}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ponderado
            </span>
          </div>
          {/* Barra de Progresso */}
          <div className="mt-3 w-full bg-slate-100 dark:bg-[#0c2336] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#004171] dark:bg-[#38bdf8] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(weightedProgress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            Calculado exclusivamente pelos pesos de cada etapa do orçamento.
          </p>
        </div>

        {/* Card 2: Status das Etapas */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Etapas Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {completedStages.length}
            </span>
            <span className="text-xs text-slate-500">
              de {workAccounts.filter((a) => a.account_type === 'atividade').length} atividades
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Em andamento: {inProgressStages.length}</span>
            <span>Não iniciadas: {workAccounts.filter((a) => a.status === 'nao_iniciada').length}</span>
          </div>
        </div>

        {/* Card 3: Etapas Atrasadas / Críticas */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Etapas em Atraso</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {delayedStages.length}
            </span>
            <span className="text-xs text-slate-500">itens críticos</span>
          </div>
          <p className="text-[11px] text-rose-500 mt-2 font-medium">
            {delayedStages.length > 0 ? `${delayedStages[0]?.description} atrasada` : 'Nenhum atraso crítico no momento'}
          </p>
        </div>

        {/* Card 4: Previsão de Conclusão */}
        <div className="bg-white dark:bg-[#081d2c] p-5 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Previsão de Término</span>
            <Calendar className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {formatDateBR(selectedWork?.planned_end)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Prazo original: {formatDateBR(selectedWork?.planned_start)} a {formatDateBR(selectedWork?.planned_end)}
          </p>
        </div>
      </div>

      {/* Curva S Planejado vs Realizado */}
      <div className="bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
              <span>Curva S: Avanço Físico Planejado versus Realizado</span>
            </h3>
            <p className="text-xs text-slate-500">
              Confronto da evolução percentual acumulada física ao longo dos meses.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} unit="%" stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(value: any) => [`${value}%`]}
                contentStyle={{
                  backgroundColor: '#081d2c',
                  border: '1px solid #1c3e5c',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="planejado"
                name="Planejado (%)"
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="realizado"
                name="Realizado Físico (%)"
                stroke="#004171"
                strokeWidth={3}
                dot={{ r: 5, fill: '#38bdf8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Árvore Hierárquica do Orçamento (EAP com Medição) */}
      <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-[#0c2336] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Estrutura Hierárquica do Orçamento e Registro de Avanço
            </h3>
            <p className="text-[11px] text-slate-500">
              Clique em "Lançar Medição" para atualizar percentual realizado, datas reais e evidências.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">
            Versão: {currentVersion?.title || 'Inicial'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#081d2c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1c3e5c]">
              <tr>
                <th className="py-3 px-4">Código e Descrição da Conta</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Peso Físico</th>
                <th className="py-3 px-4 text-center">Avanço Planejado</th>
                <th className="py-3 px-4 text-center">Avanço Realizado</th>
                <th className="py-3 px-4 text-center">Prazos (Início / Fim)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
              {workAccounts.map((acc) => {
                const isGroup = acc.account_type === 'grupo' || acc.account_type === 'etapa';
                const isExpanded = expandedNodes[acc.code] ?? true;

                return (
                  <tr
                    key={acc.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-[#0c2336]/60 transition-colors ${
                      isGroup ? 'bg-slate-50/40 dark:bg-[#0c2336]/30 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div
                        className="flex items-center space-x-2"
                        style={{ paddingLeft: acc.account_type === 'atividade' ? '24px' : '0px' }}
                      >
                        {isGroup && (
                          <button
                            onClick={() => toggleExpand(acc.code)}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <span className="font-mono text-[#004171] dark:text-[#38bdf8] font-bold">
                          {acc.code}
                        </span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {acc.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        {acc.account_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-200">
                      {acc.physical_weight_percent}%
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 font-mono">
                      {acc.progress_planned}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-200 dark:bg-[#0c2336] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (acc.progress_actual || 0) >= (acc.progress_planned || 0)
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${acc.progress_actual || 0}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {acc.progress_actual || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        {formatDateBR(acc.planned_start)} a {formatDateBR(acc.planned_end)}
                      </div>
                      {acc.actual_start && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Real: {formatDateBR(acc.actual_start)} {acc.actual_end ? `a ${formatDateBR(acc.actual_end)}` : '(em curso)'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.status === 'concluida'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : acc.status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : acc.status === 'bloqueada'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEngineerOrManager && acc.account_type === 'atividade' && (
                        <button
                          onClick={() => openMeasureModal(acc)}
                          className="px-2.5 py-1 bg-[#004171] hover:bg-[#003359] text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                        >
                          Medir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de Medições de Campo */}
      {recentMeasurements.length > 0 && (
        <div className="bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-4">
            <History className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
            <span>Últimos Registros de Medição de Campo do Engenheiro</span>
          </h3>

          <div className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
            {recentMeasurements.map((m) => {
              const acc = budgetAccounts.find((a) => a.id === m.budget_account_id);
              return (
                <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {acc?.code} - {acc?.description}
                    </span>
                    <span className="text-slate-500 ml-2">({formatDateBR(m.measurement_date)})</span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {m.notes || 'Sem observações adicionais'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#004171] dark:text-[#38bdf8]">
                      {m.progress_percent}%
                    </span>
                    <div className="text-[10px] text-slate-500">
                      Por: {m.measured_by || m.engineer_name || 'Engenheiro'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Lançamento de Medição */}
      {measuringAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Registro de Medição Física de Campo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {measuringAccount.code} - {measuringAccount.description} (Peso: {measuringAccount.physical_weight_percent}%)
              </p>
            </div>

            <form onSubmit={handleSaveMeasurement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Percentual Realizado (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={newPercent}
                    onChange={(e) => setNewPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Data da Medição *
                  </label>
                  <input
                    type="date"
                    value={measDate}
                    onChange={(e) => setMeasDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Data Início Real
                  </label>
                  <input
                    type="date"
                    value={actualStart}
                    onChange={(e) => setActualStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Data Término Real
                  </label>
                  <input
                    type="date"
                    value={actualEnd}
                    onChange={(e) => setActualEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Novo Prazo Previsto
                  </label>
                  <input
                    type="date"
                    value={revisedEnd}
                    onChange={(e) => setRevisedEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Status da Atividade
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="nao_iniciada">Não Iniciada</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="atrasada">Atrasada</option>
                  <option value="bloqueada">Bloqueada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Observações de Engenharia / Campo
                </label>
                <textarea
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  rows={2}
                  placeholder="Ex: Execução de formas e armação do 4º pavimento concluída conforme especificação"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Link / Evidência Fotográfica
                </label>
                <input
                  type="url"
                  value={evidenceInput}
                  onChange={(e) => setEvidenceInput(e.target.value)}
                  placeholder="https://storage.monteplan.com.br/fotos/obra1-etapa2.jpg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#1c3e5c]">
                <button
                  type="button"
                  onClick={() => setMeasuringAccount(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white font-bold rounded-xl shadow-sm"
                >
                  Salvar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

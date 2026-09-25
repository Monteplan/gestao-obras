import React, { useState } from 'react';
import { Work, MonthlyPlannedPeriod } from '../../../types';
import { ATRIUM_PCO_STAGES } from '../../../lib/atrium-pco-data';
import {
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  Building,
  Target,
  FileCheck,
  Search,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { DataProvenanceBadge } from '../../common/DataProvenanceBadge';

interface AtriumPhysicalDashboardProps {
  work: Work;
  macroPeriods?: MonthlyPlannedPeriod[];
}

export const AtriumPhysicalDashboard: React.FC<AtriumPhysicalDashboardProps> = ({
  work,
  macroPeriods = [],
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'diretos' | 'indiretos' | 'curva_s'>('geral');
  const [searchTerm, setSearchTerm] = useState('');

  // Indicadores de Controle Físico Real da Atrium (Aba PLANEJAMENTO MACRO)
  const rawProg = work.progress_percent || 46.22;
  const execAcc = rawProg > 100 ? Number((rawProg / 100).toFixed(2)) : Number(rawProg.toFixed(2));
  const plannedAcc = 48.59; // 48,5864% (Set/2026)
  const physicalDeviation = Number((execAcc - plannedAcc).toFixed(2)); // -2,37 p.p.
  const physicalBalance = Number((100 - execAcc).toFixed(2)); // 53,78%
  const executedMonth = 2.56; // 2,5631% no mês

  // Divisão Indiretos vs Diretos
  const indirects = {
    budget: 4520310.52,
    weight: 17.5851,
    executedPrev: 10.2661,
    executedMonth: 0.4495,
    executedAcc: 10.7156,
    balance: 6.8695,
  };

  const directs = {
    budget: 21185048.96,
    weight: 82.4149,
    executedPrev: 33.3861,
    executedMonth: 2.1136,
    executedAcc: 35.4997,
    balance: 46.9152,
  };

  // 23 Macroetapas Reais Importadas da Planilha PCO (Abertura % INDIRETOS e % DIRETOS)
  const macroStages = ATRIUM_PCO_STAGES.filter((s) => !s.parent_id).map((s) => {
    const codeNum = parseInt(s.code, 10);
    const isDirect = codeNum >= 6;
    return {
      code: s.code.replace('.0', '').padStart(2, '0'),
      name: s.name,
      weight: s.weight_percent,
      progress: s.progress_percent,
      status: s.status,
      isDirect,
    };
  });

  const filteredStages = macroStages.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.includes(searchTerm);
    if (!matchesSearch) return false;
    if (activeTab === 'diretos') return s.isDirect;
    if (activeTab === 'indiretos') return !s.isDirect;
    return true;
  });

  // Curva S Mock/Real de períodos caso macroPeriods esteja vazio
  const sCurvePeriods = macroPeriods.length > 0 ? macroPeriods : [
    { period_key: '2026-09', period_label: 'Set/26', planned_percent_month: 2.37, planned_percent_accumulated: 48.59, actual_percent_accumulated: 46.22 },
    { period_key: '2026-10', period_label: 'Out/26', planned_percent_month: 2.69, planned_percent_accumulated: 51.28 },
    { period_key: '2026-11', period_label: 'Nov/26', planned_percent_month: 2.91, planned_percent_accumulated: 54.19 },
    { period_key: '2026-12', period_label: 'Dez/26', planned_percent_month: 2.75, planned_percent_accumulated: 56.94 },
    { period_key: '2027-01', period_label: 'Jan/27', planned_percent_month: 2.66, planned_percent_accumulated: 59.60 },
    { period_key: '2027-02', period_label: 'Fev/27', planned_percent_month: 2.56, planned_percent_accumulated: 62.16 },
    { period_key: '2027-03', period_label: 'Mar/27', planned_percent_month: 2.91, planned_percent_accumulated: 65.06 },
    { period_key: '2027-04', period_label: 'Abr/27', planned_percent_month: 2.97, planned_percent_accumulated: 68.03 },
    { period_key: '2027-05', period_label: 'Mai/27', planned_percent_month: 3.34, planned_percent_accumulated: 71.37 },
    { period_key: '2027-06', period_label: 'Jun/27', planned_percent_month: 3.89, planned_percent_accumulated: 75.26 },
    { period_key: '2027-07', period_label: 'Jul/27', planned_percent_month: 3.96, planned_percent_accumulated: 79.22 },
    { period_key: '2027-08', period_label: 'Ago/27', planned_percent_month: 3.98, planned_percent_accumulated: 83.20 },
    { period_key: '2027-09', period_label: 'Set/27', planned_percent_month: 4.26, planned_percent_accumulated: 87.47 },
    { period_key: '2027-10', period_label: 'Out/27', planned_percent_month: 3.85, planned_percent_accumulated: 91.32 },
    { period_key: '2027-11', period_label: 'Nov/27', planned_percent_month: 2.89, planned_percent_accumulated: 94.21 },
    { period_key: '2027-12', period_label: 'Dez/27', planned_percent_month: 3.03, planned_percent_accumulated: 97.25 },
    { period_key: '2028-01', period_label: 'Jan/28', planned_percent_month: 1.59, planned_percent_accumulated: 98.84 },
    { period_key: '2028-02', period_label: 'Fev/28', planned_percent_month: 1.16, planned_percent_accumulated: 100.00 },
  ];

  return (
    <div className="space-y-6">
      {/* BARRA DE PROCEDÊNCIA E AUDITORIA DA MEDIÇÃO FÍSICA (ITEM 10 DO PROMPT) */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <DataProvenanceBadge
            type="pco"
            sourceFile="ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx"
            baseDate="Set/2026"
            details="Aba PLANEJAMENTO MACRO e % DIRETOS / % INDIRETOS"
          />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Competência Oficial da Medição:</span>{' '}
            <span className="font-mono text-cyan-300 font-bold">Setembro/2026</span>
            <span className="text-slate-500 mx-2">|</span>
            <span className="text-slate-400">Importado em: 21/09/2026</span>
            <span className="text-slate-500 mx-2">|</span>
            <span className="text-slate-400">Versão: PCO Baseline 1.0</span>
          </div>
        </div>
        <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
          Metodologia: Avanço físico por pesos da EAP (independe dos desembolsos financeiros)
        </div>
      </div>

      {/* 1. CARDS DE DESTAQUE FÍSICO (ÚLTIMA MEDIÇÃO IMPORTADA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Executado Acumulado Real */}
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
            <span>Executado Acumulado</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {execAcc.toFixed(2)}%
          </div>
          <div className="text-[11px] text-cyan-300/80 mt-1 flex items-center gap-1">
            <span>Última medição: Set/2026</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-950">
            <div className="h-full bg-cyan-400" style={{ width: `${Math.min(execAcc, 100)}%` }} />
          </div>
        </div>

        {/* Planejado Acumulado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Planejado na Data</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-300 font-mono mt-1">
            {plannedAcc.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Meta PCO: 48,59%
          </div>
        </div>

        {/* Desvio Físico (p.p.) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Desvio Físico</span>
            {physicalDeviation >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${
            physicalDeviation >= 0 ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {physicalDeviation > 0 ? `+${physicalDeviation.toFixed(2)}` : physicalDeviation.toFixed(2)} p.p.
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {physicalDeviation < 0 ? 'Leve atraso no cronograma' : 'Ritmo adiantado'}
          </div>
        </div>

        {/* Executado no Mês */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Executado no Mês</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono mt-1">
            +{executedMonth.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Produção física de Set/26
          </div>
        </div>

        {/* Saldo Físico a Executar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Saldo Físico</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono mt-1">
            {physicalBalance.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avanço até fev/2028
          </div>
        </div>
      </div>

      {/* 2. DESDOBRAMENTO: GRUPOS INDIRETOS VS GRUPOS DIRETOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Indiretos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Itens Indiretos (Aba % INDIRETOS)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold">
              Peso: {indirects.weight.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Custo Orçado</span>
              <span className="text-xs font-bold text-white font-mono">
                R$ {indirects.budget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Executado Acum.</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {indirects.executedAcc.toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Saldo</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                {indirects.balance.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${(indirects.executedAcc / indirects.weight) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5 text-right">
            {((indirects.executedAcc / indirects.weight) * 100).toFixed(1)}% do grupo indireto concluído
          </span>
        </div>

        {/* Card Diretos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              Itens Diretos (Aba % DIRETOS)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
              Peso: {directs.weight.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Custo Orçado</span>
              <span className="text-xs font-bold text-white font-mono">
                R$ {directs.budget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Executado Acum.</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {directs.executedAcc.toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800/40">
              <span className="text-[11px] text-slate-400 block">Saldo</span>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {directs.balance.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
            <div
              className="h-full bg-cyan-400 rounded-full"
              style={{ width: `${(directs.executedAcc / directs.weight) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1.5 text-right">
            {((directs.executedAcc / directs.weight) * 100).toFixed(1)}% do grupo direto concluído
          </span>
        </div>
      </div>

      {/* 3. CURVA S: PLANEJAMENTO MENSAL E ACUMULADO DINÂMICO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Curva S de Planejamento Físico PCO (Mensal e Acumulado)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Projeção mensal de avanço físico ponderado de Setembro de 2026 até Fevereiro de 2028.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
            {sCurvePeriods.length} competências mapeadas
          </span>
        </div>

        {/* Visualização de barras de avanço acumulado */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px] flex items-end gap-2.5 h-60 pt-20 px-2 border-b border-slate-800">
            {sCurvePeriods.map((p, idx) => {
              const isCurrent = p.period_key === '2026-09';
              const heightPct = Math.max(8, p.planned_percent_accumulated);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip com posicionamento desobstruído e indicador */}
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-16 z-30 pointer-events-none bg-slate-950/95 border border-cyan-400/80 rounded-lg px-2.5 py-1.5 text-[11px] text-white shadow-2xl backdrop-blur-md whitespace-nowrap">
                    <div className="font-bold">{p.period_label}: {p.planned_percent_accumulated.toFixed(1)}% Acum.</div>
                    <div className="text-cyan-300 font-medium">+{p.planned_percent_month.toFixed(2)}% no mês</div>
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-cyan-400/80 rotate-45" />
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 mb-0.5">
                    {p.planned_percent_accumulated.toFixed(0)}%
                  </span>

                  <div className="w-full flex items-end justify-center h-28 bg-slate-800/30 rounded-t overflow-hidden">
                    <div
                      className={`w-full transition-all rounded-t ${
                        isCurrent
                          ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 ring-2 ring-cyan-400'
                          : 'bg-gradient-to-t from-blue-900 to-blue-600 hover:from-cyan-800 hover:to-cyan-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <span className={`text-[10px] font-mono mt-1 ${isCurrent ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                    {p.period_label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. TABELA DAS ETAPAS DA OBRA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('geral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'geral' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas as Etapas ({macroStages.length})
            </button>
            <button
              onClick={() => setActiveTab('diretos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'diretos' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Itens Diretos
            </button>
            <button
              onClick={() => setActiveTab('indiretos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'indiretos' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Itens Indiretos
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar etapa ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Etapa / Atividade</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Peso Físico</th>
                <th className="p-3 text-right">Executado Acum.</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 w-36">Barra de Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStages.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-400">{s.code}</td>
                  <td className="p-3 font-semibold text-white">{s.name}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      s.isDirect ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {s.isDirect ? 'Direto' : 'Indireto'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-300">
                    {s.weight.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400">
                    {s.progress.toFixed(2)}%
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      s.status === 'concluida'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : s.status === 'em_andamento'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.status === 'concluida' ? 'Concluída' : s.status === 'em_andamento' ? 'Em Andamento' : 'Não Iniciada'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.progress === 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

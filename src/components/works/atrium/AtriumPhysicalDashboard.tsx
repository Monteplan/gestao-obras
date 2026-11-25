import React, { useState, useMemo } from 'react';
import { Work, MonthlyPlannedPeriod } from '../../../types';
import { ATRIUM_PCO_STAGES } from '../../../lib/atrium-pco-data';
import { useData } from '../../../contexts/DataContext';
import { calculateWeightedProgress, formatDateBR } from '../../../lib/utils';
import {
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Search,
  GitFork,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';

interface AtriumPhysicalDashboardProps {
  work: Work;
  macroPeriods?: MonthlyPlannedPeriod[];
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatPeriodKeyShort(periodKey: string): string {
  const parts = (periodKey || '2026-10').split('-');
  if (parts.length < 2) return periodKey;
  const mIdx = parseInt(parts[1], 10) - 1;
  const mName = MONTHS_SHORT[mIdx] || 'Out';
  return `${mName}/${parts[0].slice(2)}`;
}

export function formatPeriodKeyLong(periodKey: string): string {
  const parts = (periodKey || '2026-10').split('-');
  if (parts.length < 2) return periodKey;
  const mIdx = parseInt(parts[1], 10) - 1;
  const mName = MONTHS_SHORT[mIdx] || 'Out';
  return `${mName}/${parts[0]}`;
}

export const AtriumPhysicalDashboard: React.FC<AtriumPhysicalDashboardProps> = ({
  work,
  macroPeriods = [],
}) => {
  const {
    stages,
    stageProgressHistory,
    getWorkMeasurementCompetency,
    setWorkMeasurementCompetency,
  } = useData();
  const [activeTab, setActiveTab] = useState<'geral' | 'diretos' | 'indiretos'>('geral');
  const [searchTerm, setSearchTerm] = useState('');

  const isAtrium = work.id === 'work-1' || work.code === 'OBR-001' || work.code === 'ATRIUM';
  const currentCompetencyKey = getWorkMeasurementCompetency(work.id);
  const currentCompetencyShort = formatPeriodKeyShort(currentCompetencyKey); // Ex: "Out/26"
  const currentCompetencyLong = formatPeriodKeyLong(currentCompetencyKey);   // Ex: "Out/2026"

  // 1. Obter etapas ativas da obra no DataContext (100% interligadas com a aba Etapas & EAP)
  const workStages = useMemo(
    () => stages.filter((s) => s.work_id === work.id || (isAtrium && s.work_id === 'work-1')),
    [stages, work.id, isAtrium]
  );
  const activeRootStages = useMemo(
    () => workStages.filter((s) => !s.parent_id),
    [workStages]
  );
  const currentRootList = useMemo(
    () =>
      activeRootStages.length > 0
        ? activeRootStages
        : isAtrium
        ? ATRIUM_PCO_STAGES.filter((s) => !s.parent_id)
        : [],
    [activeRootStages, isAtrium]
  );

  // 2. Cálculo do Avanço Físico Ponderado Total da Obra em Tempo Real (a partir de Etapas & EAP)
  const dynamicWeightedProgress =
    currentRootList.length > 0
      ? calculateWeightedProgress(currentRootList)
      : work.progress_percent || (isAtrium ? 46.22 : 0);
  const execAcc =
    dynamicWeightedProgress > 100
      ? Number((dynamicWeightedProgress / 100).toFixed(2))
      : Number(dynamicWeightedProgress.toFixed(2));

  // 3. Curva S Mensal e Acumulada (Padronizada para o Atrium e para todas as demais obras como Unique, Bela Vitta, etc.)
  const sCurvePeriods: MonthlyPlannedPeriod[] = useMemo(() => {
    if (macroPeriods.length > 0) return macroPeriods;

    if (isAtrium) {
      const atriumBasePeriods: MonthlyPlannedPeriod[] = [
        { period_key: '2026-04', period_label: 'Abr/26', planned_percent_month: 2.40, planned_percent_accumulated: 36.20, actual_percent_accumulated: 34.80 },
        { period_key: '2026-05', period_label: 'Mai/26', planned_percent_month: 2.45, planned_percent_accumulated: 38.65, actual_percent_accumulated: 37.10 },
        { period_key: '2026-06', period_label: 'Jun/26', planned_percent_month: 2.50, planned_percent_accumulated: 41.15, actual_percent_accumulated: 39.45 },
        { period_key: '2026-07', period_label: 'Jul/26', planned_percent_month: 2.52, planned_percent_accumulated: 43.67, actual_percent_accumulated: 41.80 },
        { period_key: '2026-08', period_label: 'Ago/26', planned_percent_month: 2.55, planned_percent_accumulated: 46.22, actual_percent_accumulated: 43.66 },
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
      return atriumBasePeriods.map((p) => {
        if (p.period_key === currentCompetencyKey) {
          return { ...p, actual_percent_accumulated: execAcc };
        }
        if (p.period_key < currentCompetencyKey && p.actual_percent_accumulated === undefined) {
          return { ...p, actual_percent_accumulated: Number(Math.min(execAcc, p.planned_percent_accumulated * 0.95).toFixed(2)) };
        }
        if (p.period_key > currentCompetencyKey) {
          return { ...p, actual_percent_accumulated: undefined };
        }
        return p;
      });
    }

    // Para as demais obras (Unique, Bela Vitta, Alameda Paradiso, etc.), gera a Curva S no mesmo padrão visual
    // a partir do cronograma da obra (planned_start a planned_end) e das etapas da EAP
    const startStr = work.planned_start || '2025-09-01';
    const endStr = work.planned_end || '2027-06-30';
    const startYear = parseInt(startStr.slice(0, 4), 10) || 2025;
    const startMonth = parseInt(startStr.slice(5, 7), 10) || 9;
    const endYear = parseInt(endStr.slice(0, 4), 10) || 2027;
    const endMonth = parseInt(endStr.slice(5, 7), 10) || 6;

    const allMonths: { key: string; label: string }[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
      allMonths.push({ key, label });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
      if (allMonths.length >= 36) break;
    }

    // Garante que o mês da medição atual esteja presente na janela exibida
    if (!allMonths.some((it) => it.key === currentCompetencyKey)) {
      allMonths.push({
        key: currentCompetencyKey,
        label: formatPeriodKeyShort(currentCompetencyKey),
      });
      allMonths.sort((a, b) => a.key.localeCompare(b.key));
    }

    const n = Math.max(1, allMonths.length);
    const currIdxInAll = Math.max(0, allMonths.findIndex((it) => it.key === currentCompetencyKey));
    let prevAcc = 0;
    const fullCurve: MonthlyPlannedPeriod[] = allMonths.map((item, idx) => {
      // Curva S sigmoide realista de engenharia (0% -> 100%)
      const t = (idx + 1) / n;
      const sVal = idx === n - 1 ? 100 : Number((100 * (3 * t * t - 2 * t * t * t)).toFixed(2));
      const monthGain = Number(Math.max(0.5, sVal - prevAcc).toFixed(2));
      prevAcc = sVal;

      let actualVal: number | undefined = undefined;
      if (idx === currIdxInAll) {
        actualVal = execAcc;
      } else if (idx < currIdxInAll && currIdxInAll > 0) {
        const ratio = (idx + 1) / (currIdxInAll + 1);
        actualVal = Number((execAcc * (3 * ratio * ratio - 2 * ratio * ratio * ratio)).toFixed(2));
      }

      return {
        period_key: item.key,
        period_label: item.label,
        planned_percent_month: monthGain,
        planned_percent_accumulated: sVal,
        actual_percent_accumulated: actualVal,
      };
    });

    if (fullCurve.length > 18) {
      const currIdx = fullCurve.findIndex((p) => p.period_key === currentCompetencyKey);
      const startSlice = Math.max(0, Math.min(currIdx - 5, fullCurve.length - 18));
      return fullCurve.slice(startSlice, startSlice + 18);
    }
    return fullCurve;
  }, [macroPeriods, isAtrium, work.planned_start, work.planned_end, currentCompetencyKey, execAcc]);

  // Dados formatados para o LineChart animado da Curva S (Planejado vs Realizado + Projeção Pontilhada até 100%)
  const { lineChartData, projectionInfo } = useMemo(() => {
    const currIdx = Math.max(
      0,
      sCurvePeriods.findIndex((p) => p.period_key === currentCompetencyKey)
    );
    const originalEndLabel = sCurvePeriods[sCurvePeriods.length - 1]?.period_label || 'Fev/28';
    const originalEndKey = sCurvePeriods[sCurvePeriods.length - 1]?.period_key || '2028-02';

    let runningProj = execAcc;
    let reached100 = execAcc >= 100;
    let projectedEndMonth = originalEndLabel;
    let projectedEndKey = originalEndKey;

    const baseChartRows = sCurvePeriods.map((p, idx) => {
      let projVal: number | null = null;
      let isProjectedEnd = false;

      if (idx === currIdx) {
        projVal = Number(execAcc.toFixed(2));
        if (reached100) {
          isProjectedEnd = true;
          projectedEndMonth = p.period_label;
          projectedEndKey = p.period_key;
        }
      } else if (idx > currIdx && !reached100) {
        runningProj = Number(Math.min(100, runningProj + p.planned_percent_month).toFixed(2));
        projVal = runningProj;
        if (runningProj >= 100) {
          reached100 = true;
          isProjectedEnd = true;
          projectedEndMonth = p.period_label;
          projectedEndKey = p.period_key;
        }
      }

      return {
        month: p.period_label,
        period_key: p.period_key,
        planejado: Number(p.planned_percent_accumulated.toFixed(2)),
        realizado:
          p.actual_percent_accumulated !== undefined
            ? Number(p.actual_percent_accumulated.toFixed(2))
            : null,
        projecao: projVal,
        planejadoMes: Number(p.planned_percent_month.toFixed(2)),
        isProjectedEnd,
      };
    });

    // Se ao final do cronograma planejado (100% planejado) a linha projetada ainda não atingiu 100%,
    // estende os meses subsequentes mantendo o ritmo mensal planejado até atingir 100%!
    const remainingFuturePeriods = sCurvePeriods.slice(currIdx + 1);
    const avgMonthlyPace =
      remainingFuturePeriods.length > 0
        ? Math.max(
            1.8,
            remainingFuturePeriods.reduce((acc, it) => acc + it.planned_percent_month, 0) /
              remainingFuturePeriods.length
          )
        : 2.5;

    const lastParts = originalEndKey.split('-');
    let extYear = parseInt(lastParts[0], 10) || 2028;
    let extMonth = parseInt(lastParts[1], 10) || 2;
    let safety = 0;

    while (!reached100 && safety < 24) {
      safety++;
      extMonth++;
      if (extMonth > 12) {
        extMonth = 1;
        extYear++;
      }
      const nextKey = `${extYear}-${String(extMonth).padStart(2, '0')}`;
      const nextLabel = `${MONTHS_SHORT[extMonth - 1]}/${String(extYear).slice(2)}`;
      runningProj = Number(Math.min(100, runningProj + avgMonthlyPace).toFixed(2));
      const isEnd = runningProj >= 100;
      if (isEnd) {
        reached100 = true;
        projectedEndMonth = nextLabel;
        projectedEndKey = nextKey;
      }
      baseChartRows.push({
        month: nextLabel,
        period_key: nextKey,
        planejado: null as any,
        realizado: null,
        projecao: runningProj,
        planejadoMes: Number(avgMonthlyPace.toFixed(2)),
        isProjectedEnd: isEnd,
      });
    }

    // Calcula a diferença em meses entre o Término Planejado e o Término Projetado
    const origY = parseInt(originalEndKey.split('-')[0], 10) || 2028;
    const origM = parseInt(originalEndKey.split('-')[1], 10) || 2;
    const projY = parseInt(projectedEndKey.split('-')[0], 10) || origY;
    const projM = parseInt(projectedEndKey.split('-')[1], 10) || origM;
    const diffMonths = (projY - origY) * 12 + (projM - origM);

    let diffMonthsText = 'No prazo planejado';
    if (diffMonths > 0) {
      diffMonthsText = `+${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} após ${originalEndLabel}`;
    } else if (diffMonths < 0) {
      const abs = Math.abs(diffMonths);
      diffMonthsText = `${abs} ${abs === 1 ? 'mês' : 'meses'} antes de ${originalEndLabel}`;
    }

    return {
      lineChartData: baseChartRows,
      projectionInfo: {
        originalEndLabel,
        projectedEndMonth,
        projectedEndKey,
        diffMonths,
        diffMonthsText,
        avgMonthlyPace: Number(avgMonthlyPace.toFixed(2)),
      },
    };
  }, [sCurvePeriods, currentCompetencyKey, execAcc]);

  // 4. Metas Planejadas, Executado no Mês e Data de Atualização sincronizados com a competência ativa e a EAP
  const activeCurvePeriod = useMemo(
    () =>
      sCurvePeriods.find((p) => p.period_key === currentCompetencyKey) ||
      sCurvePeriods.find((p) => p.period_key >= currentCompetencyKey) ||
      sCurvePeriods[0],
    [sCurvePeriods, currentCompetencyKey]
  );

  const plannedAcc = activeCurvePeriod ? Number(activeCurvePeriod.planned_percent_accumulated.toFixed(2)) : 51.28;
  const physicalDeviation = Number((execAcc - plannedAcc).toFixed(2));
  const physicalBalance = Number(Math.max(0, 100 - execAcc).toFixed(2));

  // Calcula a produção física do mês e a data da última atualização na aba Etapas & EAP
  const { executedMonth, lastUpdateDisplay } = useMemo(() => {
    const workHistory = (stageProgressHistory || []).filter((h) => h.work_id === work.id && !h.is_substage);
    let updateLabel = 'Atualizado em Nov/2026';

    if (workHistory.length > 0) {
      const latest = workHistory.reduce((a, b) => (a.created_at > b.created_at ? a : b));
      const dt = new Date(latest.created_at);
      if (!isNaN(dt.getTime())) {
        const mAbbr = MONTHS_SHORT[dt.getMonth()] || 'Nov';
        updateLabel = `Atualiz. em ${formatDateBR(latest.created_at.slice(0, 10))} (${mAbbr}/${dt.getFullYear()})`;
      }
    }

    // Se for o Atrium e o avanço acumulado subiu além da base de Set/26 (46.2153%), a diferença é a produção medida em Out/26
    if (isAtrium) {
      if (currentCompetencyKey === '2026-09') {
        return { executedMonth: 2.56, lastUpdateDisplay: 'Base PCO Set/2026' };
      }
      const deltaOverSept = Number((execAcc - 46.2153).toFixed(2));
      if (deltaOverSept > 0.01) {
        return { executedMonth: deltaOverSept, lastUpdateDisplay: updateLabel };
      }
      // Se houver histórico de apontamentos na EAP, soma o ganho ponderado na obra
      if (workHistory.length > 0) {
        const totalWorkGain = workHistory.reduce((acc, h) => {
          const gain = (h.work_progress_after ?? 0) - (h.work_progress_before ?? 0);
          return acc + (gain > 0 ? gain : 0);
        }, 0);
        if (totalWorkGain > 0.01) {
          return { executedMonth: Number(totalWorkGain.toFixed(2)), lastUpdateDisplay: updateLabel };
        }
      }
      return {
        executedMonth: activeCurvePeriod?.planned_percent_month || 2.56,
        lastUpdateDisplay: updateLabel,
      };
    }

    // Para demais obras (Unique, etc.)
    if (workHistory.length > 0) {
      const totalWorkGain = workHistory.reduce((acc, h) => {
        const gain = (h.work_progress_after ?? 0) - (h.work_progress_before ?? 0);
        return acc + (gain > 0 ? gain : 0);
      }, 0);
      if (totalWorkGain > 0.01) {
        return { executedMonth: Number(totalWorkGain.toFixed(2)), lastUpdateDisplay: updateLabel };
      }
    }
    return {
      executedMonth: activeCurvePeriod?.planned_percent_month || 2.45,
      lastUpdateDisplay: updateLabel,
    };
  }, [stageProgressHistory, work.id, isAtrium, currentCompetencyKey, execAcc, activeCurvePeriod]);

  // 5. Divisão Dinâmica de Indiretos vs Diretos para qualquer obra
  const isIndirectStage = (s: { code: string; name: string }) => {
    if (isAtrium) {
      return parseInt(s.code, 10) < 6;
    }
    const upper = (s.name || '').toUpperCase();
    return (
      upper.includes('PRELIMINAR') ||
      upper.includes('ADMINISTRA') ||
      upper.includes('PROJETO') ||
      upper.includes('CANTEIRO') ||
      upper.includes('LICEN') ||
      parseInt(s.code, 10) === 1
    );
  };

  const indirectStages = currentRootList.filter((s) => isIndirectStage(s));
  const directStages = currentRootList.filter((s) => !isIndirectStage(s));

  const indWeight =
    indirectStages.length > 0
      ? Number(indirectStages.reduce((acc, s) => acc + (s.weight_percent || 0), 0).toFixed(4))
      : isAtrium
      ? 17.5851
      : 15.0;
  const indWeightedContribution =
    indirectStages.length > 0
      ? Number(
          (
            indirectStages.reduce(
              (acc, s) => acc + (s.progress_percent || 0) * (s.weight_percent || 0),
              0
            ) / 100
          ).toFixed(4)
        )
      : 10.7156;
  const indBudgetSum = indirectStages.reduce((acc, s) => acc + Number(s.budget_planned || 0), 0);

  const dirWeight =
    directStages.length > 0
      ? Number(directStages.reduce((acc, s) => acc + (s.weight_percent || 0), 0).toFixed(4))
      : isAtrium
      ? 82.4149
      : 85.0;
  const dirWeightedContribution =
    directStages.length > 0
      ? Number(
          (
            directStages.reduce(
              (acc, s) => acc + (s.progress_percent || 0) * (s.weight_percent || 0),
              0
            ) / 100
          ).toFixed(4)
        )
      : 35.4997;
  const dirBudgetSum = directStages.reduce((acc, s) => acc + Number(s.budget_planned || 0), 0);

  const totalWorkBudget = Number(work.pco_budget_total || work.contract_value || 25705359.47);

  const indirects = {
    budget: isAtrium ? 4520310.52 : indBudgetSum > 0 ? indBudgetSum : totalWorkBudget * (indWeight / 100),
    weight: indWeight,
    executedAcc: indWeightedContribution,
    balance: Number(Math.max(0, indWeight - indWeightedContribution).toFixed(4)),
  };

  const directs = {
    budget: isAtrium ? 21185048.96 : dirBudgetSum > 0 ? dirBudgetSum : totalWorkBudget * (dirWeight / 100),
    weight: dirWeight,
    executedAcc: dirWeightedContribution,
    balance: Number(Math.max(0, dirWeight - dirWeightedContribution).toFixed(4)),
  };

  // 6. Lista consolidada das Macroetapas conectadas ao DataContext (Etapas & EAP)
  const macroStages = currentRootList.map((s) => {
    const isDirect = !isIndirectStage(s);
    return {
      id: s.id,
      code: s.code.replace('.0', '').padStart(2, '0'),
      name: s.name,
      weight: s.weight_percent,
      progress: s.progress_percent,
      status: s.status,
      isDirect,
    };
  });

  const filteredStages = macroStages.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.includes(searchTerm);
    if (!matchesSearch) return false;
    if (activeTab === 'diretos') return s.isDirect;
    if (activeTab === 'indiretos') return !s.isDirect;
    return true;
  });

  const endMonthLabel = sCurvePeriods[sCurvePeriods.length - 1]?.period_label || 'Fev/28';

  return (
    <div className="space-y-6">
      {/* Banner de Interligação em Tempo Real com Etapas & EAP + Seletor de Competência da Medição */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold text-[11px]">
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interligado com Etapas & EAP ({macroStages.length} macroetapas)</span>
          </span>
          <span className="text-slate-300">
            Qualquer apontamento feito na aba <strong>Etapas & EAP</strong> recalcula automaticamente os indicadores e a Curva S abaixo.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-semibold text-[11px]">Mês Ref. da Medição:</span>
          <select
            value={currentCompetencyKey}
            onChange={(e) => setWorkMeasurementCompetency(work.id, e.target.value)}
            className="bg-slate-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
          >
            {sCurvePeriods.map((p) => (
              <option key={p.period_key} value={p.period_key} className="bg-slate-900 text-white">
                {p.period_label} ({formatPeriodKeyLong(p.period_key)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. CARDS DE DESTAQUE FÍSICO (SINCRONIZADOS COM ETAPAS & EAP E COMPETÊNCIA ATIVA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Executado Acumulado Real */}
        <div className="bg-white dark:bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 shadow-sm dark:shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-1">
            <span>Executado Acumulado</span>
            <Target className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
            {execAcc.toFixed(2)}%
          </div>
          <div className="text-[11px] text-cyan-700 dark:text-cyan-300/80 mt-1 flex flex-col font-medium leading-tight">
            <span>Medição: {currentCompetencyLong}</span>
            <span className="text-[10px] text-slate-400">{lastUpdateDisplay}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-100 dark:bg-cyan-950">
            <div
              className="h-full bg-cyan-500 dark:bg-cyan-400"
              style={{ width: `${Math.min(execAcc, 100)}%` }}
            />
          </div>
        </div>

        {/* Planejado Acumulado na Competência */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span>Planejado na Data</span>
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-300 font-mono mt-1">
            {plannedAcc.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Meta PCO ({currentCompetencyShort}): {plannedAcc.toFixed(2)}%
          </div>
        </div>

        {/* Desvio Físico (p.p.) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span>Desvio Físico</span>
            {physicalDeviation >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            )}
          </div>
          <div
            className={`text-2xl font-extrabold font-mono mt-1 ${
              physicalDeviation >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {physicalDeviation > 0 ? `+${physicalDeviation.toFixed(2)}` : physicalDeviation.toFixed(2)} p.p.
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {physicalDeviation < 0 ? `Em relação à meta de ${currentCompetencyShort}` : 'Ritmo adiantado'}
          </div>
        </div>

        {/* Executado no Mês */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span>Executado no Mês</span>
            <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300 font-mono mt-1">
            +{executedMonth.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Produção física de {currentCompetencyShort}
          </div>
        </div>

        {/* Saldo Físico a Executar & Nova Data de Término Pulsante */}
        <div className="bg-white dark:bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 shadow-sm dark:shadow relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span>Saldo Físico & Término</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-300 font-mono mt-1">
            {physicalBalance.toFixed(2)}%
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  projectionInfo.diffMonths > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  projectionInfo.diffMonths > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300">
              Término Proj.: {projectionInfo.projectedEndMonth}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DESDOBRAMENTO: GRUPOS INDIRETOS VS GRUPOS DIRETOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Indiretos */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Itens Indiretos (Aba % INDIRETOS)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 font-mono font-bold">
              Peso: {indirects.weight.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Custo Orçado</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                R$ {indirects.budget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Executado Acum.</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {indirects.executedAcc.toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Saldo</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                {indirects.balance.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-3">
            <div
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${Math.min(100, (indirects.executedAcc / (indirects.weight || 1)) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1.5 text-right">
            {((indirects.executedAcc / (indirects.weight || 1)) * 100).toFixed(1)}% do grupo indireto concluído
          </span>
        </div>

        {/* Card Diretos */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500 dark:bg-cyan-400 inline-block" />
              Itens Diretos (Aba % DIRETOS)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 font-mono font-bold">
              Peso: {directs.weight.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Custo Orçado</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                R$ {directs.budget.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Executado Acum.</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {directs.executedAcc.toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Saldo</span>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                {directs.balance.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-3">
            <div
              className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full"
              style={{ width: `${Math.min(100, (directs.executedAcc / (directs.weight || 1)) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1.5 text-right">
            {((directs.executedAcc / (directs.weight || 1)) * 100).toFixed(1)}% do grupo direto concluído
          </span>
        </div>
      </div>

      {/* 3. CURVA S EM LINHA ANIMADA: AVANÇO FÍSICO PLANEJADO VERSUS REALIZADO + PROJEÇÃO DE TÉRMINO PULSANTE */}
      <div className="bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
              <span>Curva S: Avanço Físico Planejado vs. Realizado & Projeção de Término ({work.name})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Confronto da evolução acumulada e projeção pontilhada do saldo ({physicalBalance.toFixed(2)}%) conforme ritmo do planejamento • Medição ({currentCompetencyShort}):{' '}
              <strong className="text-sky-500 dark:text-sky-400">
                {execAcc.toFixed(2)}% Realizado vs. {plannedAcc.toFixed(2)}% Planejado
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Badge Pulsante da Nova Data de Término Projetada (Estilo Mapa) */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-md ${
                projectionInfo.diffMonths > 0
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-amber-500/10'
                  : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-emerald-500/10'
              }`}
            >
              <span className="relative flex h-3 w-3 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                    projectionInfo.diffMonths > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    projectionInfo.diffMonths > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </span>
              <div className="text-xs leading-tight">
                <span className="font-semibold text-slate-300">Término Projetado: </span>
                <strong className="font-mono font-black text-white text-sm">
                  {projectionInfo.projectedEndMonth}
                </strong>
                <span className="text-[10px] ml-1.5 font-bold opacity-90">
                  ({projectionInfo.diffMonthsText})
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0c2336] text-[#004171] dark:text-[#38bdf8] border border-slate-200 dark:border-[#1c3e5c]">
              Prazo Planejado: {projectionInfo.originalEndLabel}
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 28, right: 44, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.25} />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const isProjEnd = payload?.value === projectionInfo.projectedEndMonth;
                  if (isProjEnd) {
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <rect
                          x={-26}
                          y={4}
                          width={52}
                          height={20}
                          rx={6}
                          fill="#f59e0b"
                          fillOpacity={0.2}
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                        />
                        <text
                          x={0}
                          y={18}
                          textAnchor="middle"
                          fill="#fbbf24"
                          fontSize={11}
                          fontWeight="bold"
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={16} textAnchor="middle" fill="#64748b" fontSize={11}>
                        {payload?.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis domain={[0, 100]} unit="%" stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
                contentStyle={{
                  backgroundColor: '#081d2c',
                  border: '1px solid #1c3e5c',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '14px' }} />
              <ReferenceLine
                x={currentCompetencyShort}
                stroke="#38bdf8"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              <ReferenceLine
                x={projectionInfo.projectedEndMonth}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeOpacity={0.75}
              />
              <Line
                type="monotone"
                dataKey="planejado"
                name="Planejado (%)"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1100}
              />
              <Line
                type="monotone"
                dataKey="realizado"
                name="Realizado EAP (%)"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0ea5e9' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1200}
              />
              <Line
                type="monotone"
                dataKey="projecao"
                name={`Projeção Término (${projectionInfo.projectedEndMonth})`}
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1500}
                dot={(dotProps: any) => {
                  const { cx, cy, payload, index } = dotProps;
                  if (cx === undefined || cy === undefined || payload?.projecao === null) {
                    return <g key={`empty-${index}`} />;
                  }
                  if (payload?.isProjectedEnd) {
                    return (
                      <g key={`proj-end-${index}`}>
                        {/* Ondas pulsantes idênticas aos marcadores do mapa */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={16}
                          fill="#f59e0b"
                          fillOpacity={0.35}
                          className="animate-ping"
                          style={{ transformOrigin: `${cx}px ${cy}px` }}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="#f59e0b"
                          fillOpacity={0.3}
                          stroke="#fbbf24"
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5.5}
                          fill="#fbbf24"
                          stroke="#081d2c"
                          strokeWidth={2}
                        />
                        {/* Rótulo destacado da Nova Data de Término no topo do ponto 100% */}
                        <g transform={`translate(${cx - 46}, ${cy - 28})`}>
                          <rect
                            x={0}
                            y={0}
                            width={92}
                            height={20}
                            rx={6}
                            fill="#081d2c"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                          />
                          <text
                            x={46}
                            y={13.5}
                            textAnchor="middle"
                            fill="#fbbf24"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            100% • {payload.month}
                          </text>
                        </g>
                      </g>
                    );
                  }
                  return (
                    <circle
                      key={`proj-dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="#f59e0b"
                      stroke="#081d2c"
                      strokeWidth={1}
                    />
                  );
                }}
                activeDot={{ r: 6, fill: '#fbbf24' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. TABELA DAS ETAPAS DA OBRA (CONECTADA EM TEMPO REAL À ABA ETAPAS & EAP) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('geral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'geral'
                  ? 'bg-cyan-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas as Etapas ({macroStages.length})
            </button>
            <button
              onClick={() => setActiveTab('diretos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'diretos'
                  ? 'bg-cyan-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Itens Diretos ({directStages.length})
            </button>
            <button
              onClick={() => setActiveTab('indiretos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'indiretos'
                  ? 'bg-cyan-500 text-white dark:text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Itens Indiretos ({indirectStages.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar etapa ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Etapa / Atividade (EAP)</th>
                <th className="p-3 text-center">Tipo</th>
                <th className="p-3 text-right">Peso Físico</th>
                <th className="p-3 text-right">Executado Acum.</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 w-32">Barra de Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredStages.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{s.code}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        s.isDirect
                          ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'
                      }`}
                    >
                      {s.isDirect ? 'Direto' : 'Indireto'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    {s.weight.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {s.progress.toFixed(2)}%
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        s.status === 'concluida'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                          : s.status === 'em_andamento'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.status === 'concluida'
                        ? 'Concluída'
                        : s.status === 'em_andamento'
                        ? 'Em Andamento'
                        : 'Não Iniciada'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          s.progress === 100
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-cyan-500 dark:bg-cyan-400'
                        }`}
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

import React, { useState, useMemo, useEffect } from 'react';
import { Work, BudgetItem, PurchaseOrder, IncurredCost, Revenue } from '../../types';
import { formatBRL, formatPercent, formatDateBR } from '../../lib/utils';
import { useData } from '../../contexts/DataContext';
import {
  ATRIUM_COMMERCIAL_UNITS,
  CommercialUnit,
  calculateCommercialSummary,
  getCommercialStorageKey,
  fetchCommercialDataFromSupabase,
} from '../../lib/atrium-commercial-data';
import {
  ATRIUM_DRE_SUMMARY,
  ATRIUM_DRE_LINES,
  DreItem,
  isConstructionAccount,
} from '../../lib/atrium-dre-data';
import { DreAccountEntriesCard } from './DreAccountEntriesCard';
import {
  TrendingUp,
  Building,
  DollarSign,
  Scale,
  Home,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Layers,
  Info,
  Briefcase,
  Hammer,
  Receipt,
  PieChart,
  Ruler,
  Award,
  Sparkles,
  Activity,
  Calculator,
  Gauge,
  SlidersHorizontal,
  Target,
} from 'lucide-react';
import { computeDynamicDre } from '../../lib/dre-calculator';

interface WorkResultAnalysisProps {
  work?: Work;
  budgetItems?: BudgetItem[];
  orders?: PurchaseOrder[];
  incurredCosts?: IncurredCost[];
  revenues?: Revenue[];
}

export const WorkResultAnalysis: React.FC<WorkResultAnalysisProps> = ({ work: propWork }) => {
  const {
    works,
    stages,
    revenues,
    incurredCosts,
    customDeParaRules,
    importBatches,
    lastSyncedAt,
    stageProgressHistory,
    getWorkMeasurementCompetency,
  } = useData();
  const currentWork = propWork || works.find(w => w.id === 'work-1' || w.code === 'OBR-001' || w.name.toLowerCase().includes('atrium')) || works[0];

  // Carrega e sincroniza as unidades reais do módulo Comercial (vendasgeral.xlsx / Supabase)
  const [commercialUnits, setCommercialUnits] = useState<CommercialUnit[]>(() => {
    const wId = currentWork?.id || 'work-1';
    try {
      const saved = localStorage.getItem(getCommercialStorageKey(wId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return wId === 'work-1' ? ATRIUM_COMMERCIAL_UNITS : [];
  });

  useEffect(() => {
    let active = true;
    const wId = currentWork?.id || 'work-1';
    const storageKey = getCommercialStorageKey(wId);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCommercialUnits(JSON.parse(saved));
      } else {
        setCommercialUnits(wId === 'work-1' ? ATRIUM_COMMERCIAL_UNITS : []);
      }
    } catch {
      setCommercialUnits(wId === 'work-1' ? ATRIUM_COMMERCIAL_UNITS : []);
    }

    fetchCommercialDataFromSupabase(wId).then((remoteUnits) => {
      if (active && remoteUnits && remoteUnits.length > 0) {
        setCommercialUnits(remoteUnits);
        try {
          localStorage.setItem(storageKey, JSON.stringify(remoteUnits));
        } catch {}
      }
    });

    return () => {
      active = false;
    };
  }, [currentWork?.id]);

  const commercialSummary = useMemo(
    () => calculateCommercialSummary(commercialUnits, currentWork?.vgv_total),
    [commercialUnits, currentWork?.vgv_total]
  );

  const [activeSubTab, setActiveSubTab] = useState<'dre' | 'indicadores'>('dre');
  // Modo de comparação: 'total' = Orçamento Global (100%) vs Realizado | 'measured' = Orçado até a Medição EAP vs Realizado
  const [comparisonMode, setComparisonMode] = useState<'total' | 'measured'>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedDreLine, setSelectedDreLine] = useState<DreItem | null>(null);
  const [lastViewedLineId, setLastViewedLineId] = useState<string | null>(null);

  const handleSelectLine = (line: DreItem) => {
    setSelectedDreLine(line);
    setLastViewedLineId(line.id);
  };
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    RECEITAS: true,
    'DEDUÇÕES DA RECEITA': true,
    CUSTOS: true,
    DESPESAS: true,
    'RECEITAS OPERACIONAIS': true,
    'IMPOSTO SOBRE RECEITA': true,
    'MATERIAIS E SERVIÇOS DE EXECUÇÃO DE OBRA': true,
    'CUSTO COM MÃO DE OBRA': true,
    'CUSTOS ADMINISTRATIVO DE OBRA': true,
    'CUSTOS COM TERRENOS E LEGALIZAÇÕES': true,
    'DESPESAS COMERCIAIS E MARKETING': true,
    'DESPESAS VARIÁVEIS COM VENDAS': true,
    'DESPESAS ADMINISTRATIVAS': true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    ATRIUM_DRE_LINES.forEach((item) => {
      if (item.isGroup) all[item.name] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Motor de Cálculo Dinâmico de Toda a DRE (Receitas, Deduções, Custos Civis, Mão de Obra e Despesas)
  // com suporte simultâneo à Visão de Orçamento Total e Visão de Medição EAP
  const dynamicDreData = useMemo(() => {
    return computeDynamicDre(
      ATRIUM_DRE_LINES,
      ATRIUM_DRE_SUMMARY,
      incurredCosts,
      revenues,
      customDeParaRules,
      currentWork.id,
      stages
    );
  }, [incurredCosts, revenues, customDeParaRules, currentWork.id, stages]);

  const summary = dynamicDreData.summary;
  const measuredSummary = dynamicDreData.measuredSummary;

  // Identificação dinâmica do Mês da Medição Física (EAP) e Data de Atualização dos Dados Financeiros (ERP)
  const referenceMetadata = useMemo(() => {
    const monthsAbbr = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const isAtrium = currentWork?.id === 'work-1' || currentWork?.code === 'OBR-001';

    // 1. Mês de referência da Medição Física EAP (sincronizado com Etapas & EAP e Acomp. Físico)
    const competencyKey = getWorkMeasurementCompetency(currentWork?.id || 'work-1');
    const compParts = (competencyKey || '2026-10').split('-');
    const compMonthIdx = compParts.length === 2 ? parseInt(compParts[1], 10) - 1 : 9;
    let measurementMonthLabel =
      compMonthIdx >= 0 && compMonthIdx < 12
        ? `${monthsAbbr[compMonthIdx]}/${compParts[0]}`
        : 'OUT/2026';
    let measurementDateDisplay = 'Atualizado em Nov/2026';
    const workStageHistory = (stageProgressHistory || []).filter((h) => h.work_id === currentWork?.id);
    if (workStageHistory.length > 0) {
      const latestHist = workStageHistory.reduce((a, b) => (a.created_at > b.created_at ? a : b));
      const d = latestHist.created_at.slice(0, 10);
      measurementDateDisplay = formatDateBR(d);
    }

    // 2. Último lançamento financeiro real da obra (Data de corte do ERP)
    const workCosts = incurredCosts.filter((c) =>
      isAtrium ? !c.work_id || c.work_id === 'work-1' : c.work_id === currentWork?.id
    );
    const workRevs = revenues.filter((r) =>
      isAtrium ? !r.work_id || r.work_id === 'work-1' : r.work_id === currentWork?.id
    );
    let maxEntryDate = '';
    workCosts.forEach((c) => {
      if (c.date && c.date.slice(0, 10) > maxEntryDate) maxEntryDate = c.date.slice(0, 10);
    });
    workRevs.forEach((r) => {
      if (r.date && r.date.slice(0, 10) > maxEntryDate) maxEntryDate = r.date.slice(0, 10);
    });

    let financialMonthLabel = isAtrium ? 'SET/2026' : 'ATUAL';
    let latestEntryDateBR = isAtrium ? '30/09/2026' : '—';
    if (maxEntryDate) {
      latestEntryDateBR = formatDateBR(maxEntryDate);
      const parts = maxEntryDate.split('-');
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          financialMonthLabel = `${monthsAbbr[mIdx]}/${parts[0]}`;
        }
      }
    }

    // 3. Data/hora da última atualização/importação de dados
    const workBatches = (importBatches || []).filter(
      (b) => !b.work_id || b.work_id === currentWork?.id
    );
    const latestBatch = workBatches[0];
    const rawUpdateIso =
      latestBatch?.created_at ||
      lastSyncedAt ||
      currentWork?.pco_last_imported_at ||
      currentWork?.updated_at;

    let lastUpdatedLabel = 'Sincronizado com Supabase';
    if (rawUpdateIso) {
      const dt = new Date(rawUpdateIso);
      if (!isNaN(dt.getTime())) {
        const dStr = dt.toLocaleDateString('pt-BR');
        const tStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        lastUpdatedLabel = `${dStr} às ${tStr}`;
      }
    }

    return {
      measurementMonthLabel,
      measurementDateDisplay,
      financialMonthLabel,
      latestEntryDateBR,
      lastUpdatedLabel,
      latestBatchFileName: latestBatch?.file_name,
      totalEntriesCount: workCosts.length + workRevs.length,
    };
  }, [currentWork, incurredCosts, revenues, importBatches, lastSyncedAt, stageProgressHistory, getWorkMeasurementCompetency]);

  // Filtragem da DRE com todas as 200+ contas recalculadas dinamicamente
  const filteredDreLines = useMemo(() => {
    let lines = dynamicDreData.lines;

    if (selectedCategory !== 'todos') {
      lines = lines.filter((l) => l.category === selectedCategory || l.isTotal);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      lines = lines.filter(
        (l) => l.name.toLowerCase().includes(q) || (l.subgroup && l.subgroup.toLowerCase().includes(q))
      );
    }

    return lines;
  }, [dynamicDreData.lines, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* SELETOR DE MODO DE COMPARAÇÃO DO ORÇAMENTO E QUADRO DE REFERÊNCIA DA MEDIÇÃO EAP (MÊS & VALORES EM R$) */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-700/80 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex flex-wrap items-center gap-2">
                <span>Quadro da DRE & Referência da Medição EAP</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/70 flex items-center space-x-1">
                  <Gauge className="w-3 h-3 text-blue-400" />
                  <span>
                    Mês da Medição EAP: {referenceMetadata.measurementMonthLabel} ({formatPercent(dynamicDreData.globalProgressPercent, 2)})
                  </span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/70">
                  Realizado ERP até: {referenceMetadata.financialMonthLabel} ({referenceMetadata.latestEntryDateBR})
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Atualizado em: {referenceMetadata.lastUpdatedLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {comparisonMode === 'total'
                  ? `Modo 1 Ativo: Orçamento Total (100%) vs Realizado (com coluna de referência da Medição de ${referenceMetadata.measurementMonthLabel} em R$).`
                  : `Modo 2 Ativo: Orçado até a Medição EAP (${referenceMetadata.measurementMonthLabel} • ${formatPercent(dynamicDreData.globalProgressPercent, 2)}) vs Realizado ERP (${referenceMetadata.financialMonthLabel}).`}
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setComparisonMode('total')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                comparisonMode === 'total'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>1. Orçamento Total (100%)</span>
            </button>
            <button
              onClick={() => setComparisonMode('measured')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                comparisonMode === 'measured'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>2. Orçado na Medição ({referenceMetadata.measurementMonthLabel})</span>
            </button>
          </div>
        </div>

        {/* FAIXA DE VALORES EM R$ DA MEDIÇÃO ATUAL vs ORÇAMENTO TOTAL vs REALIZADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800/90 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
              <span>Mês & Avanço da Medição EAP</span>
              <span className="text-blue-400 font-mono">{referenceMetadata.measurementMonthLabel}</span>
            </div>
            <div className="text-base font-black text-white font-mono mt-1">
              {formatPercent(dynamicDreData.globalProgressPercent, 2)} executado
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Orçado 100% Obra: <strong className="text-slate-200 font-mono">{formatBRL(summary.custoObra.orcado)}</strong>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-[10px] text-blue-300 uppercase font-bold">
              <span>Custo Orçado na Medição ({referenceMetadata.measurementMonthLabel})</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-200 font-mono">R$ Medido</span>
            </div>
            <div className="text-base font-black text-blue-300 font-mono mt-1">
              {formatBRL(measuredSummary.custoObra.orcadoMedido)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Receita Medida ({referenceMetadata.measurementMonthLabel}):{' '}
              <strong className="text-slate-200 font-mono">{formatBRL(measuredSummary.receita.orcadoMedido)}</strong>
            </div>
          </div>

          <div className="bg-amber-950/25 border border-amber-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between text-[10px] text-amber-300 uppercase font-bold">
              <span>Custo de Obra Realizado (até {referenceMetadata.financialMonthLabel})</span>
              <span className="text-amber-400 font-mono">{referenceMetadata.latestEntryDateBR}</span>
            </div>
            <div className="text-base font-black text-white font-mono mt-1">
              {formatBRL(summary.custoObra.realizado)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Receita Bruta Realizada:{' '}
              <strong className="text-emerald-400 font-mono">{formatBRL(summary.receita.realizadoBruto)}</strong>
            </div>
          </div>

          <div
            className={`rounded-xl p-3 border ${
              measuredSummary.custoObra.variacaoMedido <= 0
                ? 'bg-emerald-950/30 border-emerald-800/50'
                : 'bg-rose-950/30 border-rose-800/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-bold">
              <span
                className={
                  measuredSummary.custoObra.variacaoMedido <= 0 ? 'text-emerald-300' : 'text-rose-300'
                }
              >
                Desvio Custo Obra s/ Medição ({referenceMetadata.measurementMonthLabel})
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  measuredSummary.custoObra.variacaoMedido <= 0
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                {measuredSummary.custoObra.variacaoMedido <= 0 ? 'Economia' : 'Estouro'}
              </span>
            </div>
            <div
              className={`text-base font-black font-mono mt-1 ${
                measuredSummary.custoObra.variacaoMedido <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {measuredSummary.custoObra.variacaoMedido > 0
                ? `+${formatBRL(measuredSummary.custoObra.variacaoMedido)}`
                : formatBRL(measuredSummary.custoObra.variacaoMedido)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Base: {referenceMetadata.totalEntriesCount.toLocaleString('pt-BR')} lançamentos reais
            </div>
          </div>
        </div>
      </div>

      {/* 4 CARDS PRINCIPAIS: RECEITA, CUSTO DE OBRA, DESPESAS E RESULTADO FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Receitas */}
        <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-sky-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              1. Receitas de Vendas
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.receita.realizadoBruto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {comparisonMode === 'total' ? (
              <>Orçado Previsto: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.receita.orcadoBruto)}</strong></>
            ) : (
              <>Orçado até Medição ({formatPercent(dynamicDreData.globalProgressPercent, 1)}): <strong className="text-sky-600 dark:text-sky-400">{formatBRL(measuredSummary.receita.orcadoMedido)}</strong></>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">
                {comparisonMode === 'total' ? '% Realizado s/ Total:' : '% Desempenho s/ Medição:'}
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {formatPercent(comparisonMode === 'total' ? summary.receita.percentBruto : measuredSummary.receita.percentDesempenho, 2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.min(100, comparisonMode === 'total' ? summary.receita.percentBruto : measuredSummary.receita.percentDesempenho)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{comparisonMode === 'total' ? 'Receita Líquida Real:' : 'Variação s/ Medido:'}</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {comparisonMode === 'total'
                  ? formatBRL(summary.receita.liquidaRealizado)
                  : (measuredSummary.receita.variacaoMedido >= 0 ? `+${formatBRL(measuredSummary.receita.variacaoMedido)}` : formatBRL(measuredSummary.receita.variacaoMedido))}
              </strong>
            </div>
            <div className="text-[10px] text-slate-400">
              Deduções/Impostos RET: {formatBRL(summary.receita.deducoesRealizado)}
            </div>
          </div>
        </div>

        {/* Card 2: Custo de Obra */}
        <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              2. Custos de Obra
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.custoObra.realizado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {comparisonMode === 'total' ? (
              <>Orçado Obra (100%): <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.custoObra.orcado)}</strong></>
            ) : (
              <>Orçado até Medição EAP: <strong className="text-amber-500 dark:text-amber-400">{formatBRL(measuredSummary.custoObra.orcadoMedido)}</strong></>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">
                {comparisonMode === 'total' ? '% Executado s/ Total:' : 'Desempenho s/ Medição:'}
              </span>
              <span className={`font-bold ${
                comparisonMode === 'total'
                  ? 'text-amber-600 dark:text-amber-400'
                  : measuredSummary.custoObra.variacaoMedido <= 0
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              }`}>
                {comparisonMode === 'total'
                  ? formatPercent(summary.custoObra.percent, 2)
                  : `${formatPercent(measuredSummary.custoObra.percentDesempenho, 1)} (${measuredSummary.custoObra.variacaoMedido <= 0 ? 'Econômico' : 'Estouro'})`}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  comparisonMode === 'total'
                    ? 'bg-amber-500'
                    : measuredSummary.custoObra.variacaoMedido <= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, comparisonMode === 'total' ? summary.custoObra.percent : measuredSummary.custoObra.percentDesempenho)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{comparisonMode === 'total' ? 'Materiais & Serviços:' : 'Desvio s/ Medição:'}</span>
              <strong className={comparisonMode === 'total' ? 'text-slate-800 dark:text-slate-200' : measuredSummary.custoObra.variacaoMedido <= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {comparisonMode === 'total'
                  ? formatBRL(summary.custoObra.materiaisServicos.realizado)
                  : (measuredSummary.custoObra.variacaoMedido > 0 ? `+${formatBRL(measuredSummary.custoObra.variacaoMedido)}` : formatBRL(measuredSummary.custoObra.variacaoMedido))}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{comparisonMode === 'total' ? 'Mão de Obra:' : 'Status da Fase:'}</span>
              <span>
                {comparisonMode === 'total'
                  ? formatBRL(summary.custoObra.maoDeObra.realizado)
                  : (measuredSummary.custoObra.variacaoMedido <= 0 ? 'Dentro do Orçado Medido' : 'Sobrecusto na Execução')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Despesas Operacionais e Comerciais */}
        <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              3. Despesas Operacionais
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBRL(summary.despesas.realizado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {comparisonMode === 'total' ? (
              <>Orçado Total (100%): <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.despesas.orcado)}</strong></>
            ) : (
              <>Orçado até Medição: <strong className="text-purple-400">{formatBRL(measuredSummary.despesas.orcadoMedido)}</strong></>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">
                {comparisonMode === 'total' ? '% Consumido s/ Total:' : 'Desempenho s/ Medição:'}
              </span>
              <span className={`font-bold ${
                comparisonMode === 'total'
                  ? 'text-purple-600 dark:text-purple-400'
                  : measuredSummary.despesas.variacaoMedido <= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {comparisonMode === 'total'
                  ? formatPercent(summary.despesas.percent, 2)
                  : `${formatPercent(measuredSummary.despesas.percentDesempenho, 1)} (${measuredSummary.despesas.variacaoMedido <= 0 ? 'Econômico' : 'Estouro'})`}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  comparisonMode === 'total'
                    ? 'bg-purple-500'
                    : measuredSummary.despesas.variacaoMedido <= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, comparisonMode === 'total' ? summary.despesas.percent : measuredSummary.despesas.percentDesempenho)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{comparisonMode === 'total' ? 'Comissão Corretores:' : 'Desvio s/ Medição:'}</span>
              <strong className={comparisonMode === 'total' ? 'text-slate-800 dark:text-slate-200' : measuredSummary.despesas.variacaoMedido <= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {comparisonMode === 'total'
                  ? formatBRL(summary.despesas.comissoesVendas.realizado)
                  : (measuredSummary.despesas.variacaoMedido > 0 ? `+${formatBRL(measuredSummary.despesas.variacaoMedido)}` : formatBRL(measuredSummary.despesas.variacaoMedido))}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{comparisonMode === 'total' ? 'MKT & Propaganda:' : 'Status da Fase:'}</span>
              <span>
                {comparisonMode === 'total'
                  ? formatBRL(summary.despesas.comerciaisMkt.realizado)
                  : (measuredSummary.despesas.variacaoMedido <= 0 ? 'Dentro da Proporção' : 'Acima da Proporção')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Resultado Financeiro e Margem */}
        <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {comparisonMode === 'total' ? '4. Resultado do Empreendimento' : '4. Resultado da Fase Atual'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black ${
            summary.resultadoFinanceiro.resultadoOperacionalRealizado >= 0
              ? 'text-slate-900 dark:text-white'
              : 'text-amber-500 dark:text-amber-400'
          }`}>
            {formatBRL(summary.resultadoFinanceiro.resultadoOperacionalRealizado)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {comparisonMode === 'total' ? (
              <>Orçado Global: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.resultadoFinanceiro.resultadoOperacionalOrcado)}</strong></>
            ) : (
              <>Resultado Orçado da Fase: <strong className="text-emerald-500">{formatBRL(measuredSummary.resultadoFinanceiro.resultadoOperacionalMedido)}</strong></>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">
                {comparisonMode === 'total' ? 'Margem Orçada:' : 'Desvio da Margem:'}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {comparisonMode === 'total'
                  ? formatPercent(summary.resultadoFinanceiro.margemOperacionalOrcada, 2)
                  : formatBRL(measuredSummary.resultadoFinanceiro.desvioOperacionalFase)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{comparisonMode === 'total' ? 'Resultado Caixa (F.C.):' : 'Diagnóstico da Fase:'}</span>
              <strong className={comparisonMode === 'total' ? 'text-slate-800 dark:text-slate-200' : measuredSummary.resultadoFinanceiro.statusFase === 'economia' ? 'text-emerald-500' : 'text-amber-500'}>
                {comparisonMode === 'total'
                  ? formatBRL(summary.resultadoFinanceiro.resultadoCaixaRealizado)
                  : (measuredSummary.resultadoFinanceiro.statusFase === 'economia' ? 'Superávit Operacional' : 'Pressão por Antecipação de Custos')}
              </strong>
            </div>
            <div className="text-[10px] text-slate-400 italic leading-snug pt-1">
              {comparisonMode === 'total'
                ? 'Fase construtiva de investimento; repasses concentram no término.'
                : 'Custos civis incorridos frente ao avanço de 46,22% medido na EAP.'}
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Demonstração da Fórmula do Resultado */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Scale className="w-4 h-4 shrink-0" />
            <span>
              {comparisonMode === 'total'
                ? 'Fórmula do Orçamento Total = Receitas (100%) (-) Custos de Obra (100%) (-) Despesas (100%)'
                : `Fórmula da Medição EAP (${formatPercent(dynamicDreData.globalProgressPercent, 1)} Medido) = Receitas Medidas (-) Custos Medidos (-) Despesas Medidas`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {comparisonMode === 'total' ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Orçado Total:</span>
                <span className="text-sky-400 font-semibold">{formatBRL(summary.receita.orcadoBruto)}</span>
                <span className="text-slate-500">-</span>
                <span className="text-amber-400 font-semibold">{formatBRL(summary.custoObra.orcado)}</span>
                <span className="text-slate-500">-</span>
                <span className="text-purple-400 font-semibold">{formatBRL(summary.despesas.orcado)}</span>
                <span className="text-slate-500">=</span>
                <strong className="text-emerald-400 font-black">{formatBRL(summary.resultadoFinanceiro.resultadoOperacionalOrcado)}</strong>
                <span className="text-emerald-500 text-[11px]">({formatPercent(summary.resultadoFinanceiro.margemOperacionalOrcada, 2)})</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Orçado Medição EAP:</span>
                <span className="text-sky-400 font-semibold">{formatBRL(measuredSummary.receita.orcadoMedido)}</span>
                <span className="text-slate-500">-</span>
                <span className="text-amber-400 font-semibold">{formatBRL(measuredSummary.custoObra.orcadoMedido)}</span>
                <span className="text-slate-500">-</span>
                <span className="text-purple-400 font-semibold">{formatBRL(measuredSummary.despesas.orcadoMedido)}</span>
                <span className="text-slate-500">=</span>
                <strong className="text-emerald-400 font-black">{formatBRL(measuredSummary.resultadoFinanceiro.resultadoOperacionalMedido)}</strong>
              </div>
            )}

            <div className="hidden xl:inline text-slate-600">|</div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Realizado ERP:</span>
              <span className="text-sky-400 font-semibold">{formatBRL(summary.receita.realizadoBruto)}</span>
              <span className="text-slate-500">-</span>
              <span className="text-amber-400 font-semibold">{formatBRL(summary.custoObra.realizado)}</span>
              <span className="text-slate-500">-</span>
              <span className="text-purple-400 font-semibold">{formatBRL(summary.despesas.realizado)}</span>
              <span className="text-slate-500">=</span>
              <strong className="text-amber-400 font-black">{formatBRL(summary.resultadoFinanceiro.resultadoOperacionalRealizado)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navegação: DRE Completa | Matriz De-Para | Indicadores Imobiliários */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('dre')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'dre'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>DRE Comparativa Completa (Orçado vs Realizado)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('indicadores')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'indicadores'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Indicadores do Empreendimento (VGV / CUB)</span>
          </button>
        </div>
      </div>

      {/* SUB-ABA 1: DRE COMPARATIVA COMPLETA */}
      {activeSubTab === 'dre' && (
        <div className="space-y-4">
          {/* Card Detalhado de Lançamentos da Conta Selecionada */}
          {selectedDreLine && (
            <DreAccountEntriesCard
              line={selectedDreLine}
              onClose={() => setSelectedDreLine(null)}
            />
          )}

          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            {/* Barra de Filtros e Ferramentas */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar conta na DRE..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-500">Grupo:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <option value="todos">Todos os Grupos</option>
                    <option value="receita">Receitas</option>
                    <option value="deducao">Deduções da Receita</option>
                    <option value="custo_obra">Custos de Obra</option>
                    <option value="despesa">Despesas Operacionais</option>
                    <option value="financeiro">Resultado Financeiro</option>
                    <option value="investimento">Investimentos</option>
                  </select>
                </div>

                <div className="hidden lg:flex items-center space-x-1.5 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 rounded-xl">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Clique em qualquer linha da tabela para abrir o pop-up de lançamentos</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={expandAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Expandir Todos
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Recolher Todos
                </button>
              </div>
            </div>

            {/* Tabela Multinível da DRE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3 min-w-[280px]">
                      {comparisonMode === 'total'
                        ? 'Grupo / Conta DRE (RESUMO ORÇAMENTO X REAL)'
                        : 'Conta DRE / Etapa Vinculada na EAP'}
                    </th>
                    {comparisonMode === 'total' ? (
                      <>
                        <th className="p-3 text-right">Orçado Total 100% (R$)</th>
                        <th className="p-3 text-right bg-blue-500/5 border-x border-blue-500/15 text-blue-600 dark:text-blue-400">
                          Medição {referenceMetadata.measurementMonthLabel} (% e R$)
                        </th>
                        <th className="p-3 text-right">
                          Realizado ({referenceMetadata.financialMonthLabel} - R$)
                        </th>
                        <th className="p-3 text-right">Variação Saldo (R$)</th>
                        <th className="p-3 text-center min-w-[100px]">% Realizado</th>
                        <th className="p-3 text-right">% s/ Receita Orç.</th>
                        <th className="p-3 text-right">% s/ Receita Real.</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 text-center min-w-[90px]">
                          % Medido ({referenceMetadata.measurementMonthLabel})
                        </th>
                        <th className="p-3 text-right min-w-[130px]">
                          Orçado Medido ({referenceMetadata.measurementMonthLabel} - R$)
                        </th>
                        <th className="p-3 text-right min-w-[130px]">
                          Realizado ERP ({referenceMetadata.financialMonthLabel} - R$)
                        </th>
                        <th className="p-3 text-right min-w-[130px]">Desvio na Fase (R$)</th>
                        <th className="p-3 text-center min-w-[110px]">% Desempenho</th>
                        <th className="p-3 text-center min-w-[130px]">Diagnóstico</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {filteredDreLines.map((line) => {
                    const isLvl1 = line.level === 1;
                    const isLvl2 = line.level === 2;
                    const isLvl3 = line.level === 3;
                    const isTotal = line.isTotal;
                    const isSelected = selectedDreLine?.id === line.id;
                    const isLastViewed = lastViewedLineId === line.id;

                    // Se for nível 3 e o grupo pai estiver recolhido, oculta
                    if (isLvl3 && line.subgroup && !expandedGroups[line.subgroup] && !searchTerm) {
                      return null;
                    }
                    if (isLvl2 && line.category && !expandedGroups[line.category.toUpperCase()] && !searchTerm) {
                      return null;
                    }

                    const isExpanded = expandedGroups[line.name] ?? false;

                    const receitaTotalOrcada = summary.receita.orcadoBruto;
                    const receitaTotalRealizada = summary.receita.realizadoBruto;

                    const pctSobreReceitaOrc = receitaTotalOrcada > 0 ? (line.orcado / receitaTotalOrcada) * 100 : 0;
                    const pctSobreReceitaReal = receitaTotalRealizada > 0 ? (line.realizado / receitaTotalRealizada) * 100 : 0;

                    const isResultadoOrReceita = line.name.includes('RECEITA') || line.name.includes('RESULTADO');
                    const isFavorable = isResultadoOrReceita
                      ? line.variacao >= 0
                      : line.variacao <= 0;

                    const isFavorableMeasured = isResultadoOrReceita
                      ? (line.variacaoMedido ?? 0) >= 0
                      : (line.variacaoMedido ?? 0) <= 0;

                    // Estilos de linha
                    let rowStyle = 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors';
                    if (isTotal) {
                      rowStyle = 'bg-blue-50/80 dark:bg-blue-950/40 font-black text-slate-900 dark:text-white border-y border-blue-200 dark:border-blue-900';
                    } else if (isLvl1) {
                      rowStyle = 'bg-slate-100/90 dark:bg-slate-900/90 font-bold text-slate-900 dark:text-white border-y border-slate-300 dark:border-slate-800';
                    } else if (isLvl2) {
                      rowStyle = 'bg-slate-50/60 dark:bg-slate-900/40 font-semibold text-slate-800 dark:text-slate-200';
                    } else {
                      rowStyle = 'text-slate-600 dark:text-slate-400 text-[11px]';
                    }

                    let highlightClass = '';
                    if (isSelected) {
                      highlightClass = 'ring-2 ring-blue-500 bg-blue-100/60 dark:bg-blue-900/50 border-l-4 border-l-blue-600 font-bold';
                    } else if (isLastViewed) {
                      highlightClass = 'bg-blue-50/80 dark:bg-blue-950/50 border-l-4 border-l-blue-500/80 font-semibold';
                    }

                    return (
                      <tr
                        key={line.id}
                        onClick={() => handleSelectLine(line)}
                        className={`${rowStyle} ${highlightClass} cursor-pointer transition-all select-none`}
                        title="Clique para abrir o pop-up com todos os lançamentos contábeis desta conta"
                      >
                        <td className="p-2.5 text-center">
                          {line.isGroup && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(line.name);
                              }}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className={`p-2.5 ${isLvl2 ? 'pl-6' : isLvl3 ? 'pl-11' : ''}`}>
                          <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-2">
                              <span className={isTotal ? 'text-blue-600 dark:text-blue-400' : ''}>
                                {line.name}
                              </span>
                              {isConstructionAccount(line.name) && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  Obra
                                </span>
                              )}
                            </div>
                            {isSelected ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold flex items-center space-x-1 shadow-sm">
                                <Receipt className="w-3 h-3" />
                                <span>Pop-up Aberto</span>
                              </span>
                            ) : isLastViewed ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold flex items-center space-x-1 border border-blue-300 dark:border-blue-700">
                                <Receipt className="w-3 h-3" />
                                <span>Conta Selecionada</span>
                              </span>
                            ) : (
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 dark:text-blue-400 hidden xl:inline-flex items-center space-x-1">
                                <Receipt className="w-3 h-3" />
                                <span>Ver lançamentos</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {comparisonMode === 'total' ? (
                          <>
                            <td className="p-2.5 text-right font-mono">
                              {formatBRL(line.orcado)}
                            </td>
                            <td className="p-2.5 text-right font-mono bg-blue-500/[0.03] border-x border-blue-500/10">
                              <div className="font-bold text-blue-600 dark:text-blue-400">
                                {formatBRL(line.orcadoMedido ?? 0)}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {referenceMetadata.measurementMonthLabel} • {formatPercent(line.measuredPercent ?? 0, 1)}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {formatBRL(line.realizado)}
                            </td>
                            <td className={`p-2.5 text-right font-mono ${
                              isTotal
                                ? line.variacao >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
                                : isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                            }`}>
                              {line.variacao > 0 ? `+${formatBRL(line.variacao)}` : formatBRL(line.variacao)}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                line.percentRealizado > 100
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                  : line.percentRealizado > 0
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {formatPercent(line.percentRealizado, 2)}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500 text-[10px]">
                              {formatPercent(pctSobreReceitaOrc, 2)}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500 text-[10px]">
                              {formatPercent(pctSobreReceitaReal, 2)}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* % Medido na EAP */}
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                                {formatPercent(line.measuredPercent ?? 0, 1)}
                              </span>
                            </td>

                            {/* Orçado até a Medição */}
                            <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              {formatBRL(line.orcadoMedido ?? 0)}
                            </td>

                            {/* Realizado ERP */}
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatBRL(line.realizado)}
                            </td>

                            {/* Desvio de Custo na Fase */}
                            <td className={`p-2.5 text-right font-mono font-bold ${
                              isTotal
                                ? (line.variacaoMedido ?? 0) >= 0 ? 'text-emerald-500' : 'text-amber-500'
                                : isFavorableMeasured ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {(line.variacaoMedido ?? 0) > 0 ? `+${formatBRL(line.variacaoMedido ?? 0)}` : formatBRL(line.variacaoMedido ?? 0)}
                            </td>

                            {/* % Desempenho Medido */}
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFavorableMeasured
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                              }`}>
                                {formatPercent(line.percentDesempenhoMedido ?? 0, 1)}
                              </span>
                            </td>

                            {/* Diagnóstico da Fase */}
                            <td className="p-2.5 text-center text-[10px]">
                              {isFavorableMeasured ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Econômico</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Estouro na Fase</span>
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA: INDICADORES DO EMPREENDIMENTO (VGV / CUB) - ORÇADO VS. REAL (INTEGRADO AO COMERCIAL) */}
      {activeSubTab === 'indicadores' && (() => {
        const hasCommercialUnits = commercialUnits.length > 0;

        // Indicadores do Empreendimento alimentados diretamente pelo Módulo Comercial (vendasgeral.xlsx)
        const totalUnits = hasCommercialUnits
          ? commercialSummary.totalUnits
          : currentWork?.total_units || 80;
        const unitsSold = hasCommercialUnits
          ? commercialSummary.soldUnits
          : currentWork?.units_sold !== undefined
          ? currentWork.units_sold
          : 23;
        const salesPercent = hasCommercialUnits
          ? commercialSummary.salesPercent
          : totalUnits > 0
          ? (unitsSold / totalUnits) * 100
          : 28.75;

        const privateArea = hasCommercialUnits && commercialSummary.totalPrivateAreaM2 > 0
          ? commercialSummary.totalPrivateAreaM2
          : currentWork?.private_area_m2 || 4840.0;
        const constructedArea = currentWork?.total_area_m2 || 6850.0;
        const cubReference = currentWork?.cub_reference_m2 || 2850.0;

        // Avanço físico ponderado da obra
        const rawProgress = currentWork?.progress_percent || 46.22;
        const progressPercent = rawProgress > 100 ? rawProgress / 100 : rawProgress;

        // Áreas equivalentes executadas pelo avanço físico
        const executedPrivateArea = privateArea * (progressPercent / 100);
        const executedConstructedArea = constructedArea * (progressPercent / 100);

        // 1. VGV (Valor Geral de Vendas) - Alimentado pelos dados reais do Comercial:
        // VGV real = valor vendido até o momento (VL_CNT) + valor de unidades em estoque (SALDO tabela)
        const vgvOrcado = summary.receita.orcadoBruto; // R$ 55.206.000,00
        const vgvVendido = hasCommercialUnits
          ? commercialSummary.vgvVendido
          : currentWork?.vgv_sold || 16760154.94;
        const unitsAvailable = hasCommercialUnits
          ? commercialSummary.availableUnits
          : Math.max(0, totalUnits - unitsSold);
        const unitsBlocked = hasCommercialUnits ? commercialSummary.blockedUnits : 0;
        const unitsStock = hasCommercialUnits
          ? commercialSummary.stockUnits
          : unitsAvailable + unitsBlocked;
        const vgvEstoque = hasCommercialUnits
          ? commercialSummary.vgvEstoqueTotal
          : Math.max(0, vgvOrcado - vgvVendido);
        const vgvReal = hasCommercialUnits
          ? commercialSummary.vgvReal
          : vgvVendido + vgvEstoque;
        const vgvRealizadoFaturado = summary.receita.realizadoBruto; // Recebido até o momento na DRE
        const vgvRecebidoComercial = hasCommercialUnits
          ? commercialSummary.totalReceived
          : vgvRealizadoFaturado;
        const vgvAReceber = hasCommercialUnits
          ? commercialSummary.totalReceivable
          : Math.max(0, vgvVendido - vgvRealizadoFaturado);
        const vgvVendidoAtualizado = vgvRecebidoComercial + vgvAReceber;
        const correcaoInccVendas = Math.max(0, vgvVendidoAtualizado - vgvVendido);

        // 2. Preço Médio por m² - Alimentado pela metragem real vendida no Comercial:
        // Preço médio do m² = valor vendido dividido pela metragem vendida
        const metragemVendida = hasCommercialUnits
          ? commercialSummary.soldPrivateAreaM2
          : privateArea * (unitsSold / Math.max(1, totalUnits));
        const precoMedioM2Vendido =
          metragemVendida > 0 ? vgvVendido / metragemVendida : 11406.2;
        const precoM2PrivativoOrcado = privateArea > 0 ? vgvOrcado / privateArea : 11406.2;
        const variacaoPrecoM2PrivativoPercent =
          precoM2PrivativoOrcado > 0
            ? ((precoMedioM2Vendido - precoM2PrivativoOrcado) / precoM2PrivativoOrcado) * 100
            : 0;
        const precoM2ConstruidoOrcado = constructedArea > 0 ? vgvOrcado / constructedArea : 8059.27;
        const soldConstructedArea =
          privateArea > 0 ? constructedArea * (metragemVendida / privateArea) : constructedArea * (unitsSold / Math.max(1, totalUnits));
        const precoM2ConstruidoRealVendido =
          soldConstructedArea > 0 ? vgvVendido / soldConstructedArea : 8059.27;
        const variacaoPrecoM2ConstruidoPercent =
          precoM2ConstruidoOrcado > 0
            ? ((precoM2ConstruidoRealVendido - precoM2ConstruidoOrcado) / precoM2ConstruidoOrcado) * 100
            : 0;
        const ticketMedioVendido = unitsSold > 0 ? vgvVendido / unitsSold : 0;

        // 3. Custo de Obra & CUB
        const custoObraOrcado = summary.custoObra.orcado; // R$ 25.705.359,47
        const custoM2PrivativoOrcado = privateArea > 0 ? custoObraOrcado / privateArea : 5311.02; // R$ 5.311,02 /m²
        const cubConstruidoOrcado = constructedArea > 0 ? custoObraOrcado / constructedArea : 3752.61; // R$ 3.752,61 /m²

        const custoObraRealizado = summary.custoObra.realizado; // R$ 11.292.416,61
        const custoM2PrivativoRealizado = executedPrivateArea > 0 ? custoObraRealizado / executedPrivateArea : 5047.91; // R$ 5.047,91 /m²
        const cubConstruidoRealizado = executedConstructedArea > 0 ? custoObraRealizado / executedConstructedArea : 3566.70; // R$ 3.566,70 /m²

        const variacaoCustoM2Privativo = custoM2PrivativoRealizado - custoM2PrivativoOrcado; // -R$ 263,11 /m²
        const percentVariacaoCustoM2 = custoM2PrivativoOrcado > 0 ? (variacaoCustoM2Privativo / custoM2PrivativoOrcado) * 100 : -4.95; // -4,95%

        const variacaoCubConstruido = cubConstruidoRealizado - cubConstruidoOrcado; // -R$ 185,91 /m²
        const percentVariacaoCub = cubConstruidoOrcado > 0 ? (variacaoCubConstruido / cubConstruidoOrcado) * 100 : -4.95; // -4,95%

        // Custo Projetado Final de Obra com base na performance real executada
        const custoObraProjetadoFinal = custoM2PrivativoRealizado * privateArea; // R$ 24.431.868,00
        const economiaProjetadaObra = custoObraOrcado - custoObraProjetadoFinal; // R$ 1.273.491,47

        // 4. Margem Operacional & Resultado
        const resultadoOperacionalOrcado = summary.resultadoFinanceiro.resultadoOperacionalOrcado; // R$ 23.749.249,25
        const margemOperacionalOrcada = summary.resultadoFinanceiro.margemOperacionalOrcada; // 43,02%

        const resultadoOperacionalRealizado = summary.resultadoFinanceiro.resultadoOperacionalRealizado; // -R$ 9.259.263,35

        // Margem Projetada Final com a Performance Real da Obra
        const despesasTotaisOrcadas = summary.despesas.orcado; // R$ 5.751.391,28
        const resultadoProjetadoComPerformance = vgvOrcado - custoObraProjetadoFinal - despesasTotaisOrcadas; // R$ 25.022.740,72
        const margemProjetadaComPerformance = vgvOrcado > 0 ? (resultadoProjetadoComPerformance / vgvOrcado) * 100 : 45.33; // 45,33%
        const ganhoMargemPp = margemProjetadaComPerformance - margemOperacionalOrcada; // +2,31 p.p.

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 4 CARDS PRINCIPAIS: VGV, PREÇO M², CUSTO OBRA/CUB E MARGEM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: VGV Real (Vendido + Estoque) */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-sky-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-sky-500" />
                    <span>1. VGV Real (Vendido + Estoque)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                    {formatPercent(salesPercent, 0)} Vendido
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {formatBRL(vgvReal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Vendido: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(vgvVendido)}</strong> + Estoque: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(vgvEstoque)}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Unidades Vendidas:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {unitsSold} de {totalUnits} un. ({salesPercent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min(100, salesPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">Unidades em Estoque ({unitsStock} un.):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{unitsAvailable} disp. | {unitsBlocked} bloq.</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>Correção INCC s/ Vendas:</span>
                    <span className="font-mono font-bold">
                      +{formatBRL(correcaoInccVendas)} (Atualiz.: {formatBRL(vgvVendidoAtualizado)})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Recebido das Vendas (Comercial):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatBRL(vgvRecebidoComercial)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Saldo a Receber Atualizado (INCC):</span>
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{formatBRL(vgvAReceber)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Preço Médio do m² (Valor Vendido ÷ Metragem Vendida) */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-blue-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-blue-500" />
                    <span>2. Preço Médio do m²</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    Vendido ÷ Metragem
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {formatBRL(precoMedioM2Vendido)} <span className="text-xs font-normal text-slate-400">/m² priv.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Fórmula: <strong className="text-slate-700 dark:text-slate-300">Vendido ÷ Metragem Vendida</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Cálculo Exato:</span>
                    <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {formatBRL(vgvVendido)} ÷ {metragemVendida.toLocaleString('pt-BR')} m²
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Orçado Estudo de Viabilidade:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatBRL(precoM2PrivativoOrcado)} /m²</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Ticket Médio Vendido:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{formatBRL(ticketMedioVendido)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>Preço p/ m² Construído:</span>
                    <span className="font-mono text-slate-400">{formatBRL(precoM2ConstruidoRealVendido)} /m²</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Metragem Vendida: {metragemVendida.toLocaleString('pt-BR')} m² ({unitsSold} un.) de {privateArea.toLocaleString('pt-BR')} m²
                  </div>
                </div>
              </div>

              {/* Card 3: Custo de Obra & CUB */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Hammer className="w-3.5 h-3.5 text-amber-500" />
                    <span>3. Custo de Obra & CUB</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    <span>{formatPercent(Math.abs(percentVariacaoCustoM2), 2)} Economia</span>
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {formatBRL(custoM2PrivativoRealizado)} <span className="text-xs font-normal text-slate-400">/m² priv.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Orçado Obra: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(custoM2PrivativoOrcado)} /m²</strong> ({formatBRL(variacaoCustoM2Privativo)} /m²)
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">CUB Próprio Construído Real:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatBRL(cubConstruidoRealizado)} /m²</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>CUB Orçado: {formatBRL(cubConstruidoOrcado)} /m²</span>
                    <span>Sinduscon: {formatBRL(cubReference)} /m²</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500">Custo Real DRE (46,22% Físico):</span>
                    <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatBRL(custoObraRealizado)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Economia Projetada Final:</span>
                    <span className="font-mono">+{formatBRL(economiaProjetadaObra)}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Margem Operacional */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" />
                    <span>4. Margem Operacional</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>+{ganhoMargemPp.toFixed(2)} p.p.</span>
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatPercent(margemProjetadaComPerformance, 2)} <span className="text-xs font-normal text-slate-400">Projetada</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Orçada Viabilidade: <strong className="text-slate-700 dark:text-slate-300">{formatPercent(margemOperacionalOrcada, 2)}</strong> ({formatBRL(resultadoOperacionalOrcado)})
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Resultado Projetado Final:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatBRL(resultadoProjetadoComPerformance)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Resultado Realizado Caixa (DRE):</span>
                    <strong className="text-amber-500 font-mono">{formatBRL(resultadoOperacionalRealizado)}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 leading-tight">
                    Performance favorecida pelo custo unitário executado (-4,95% vs. orçado).
                  </div>
                </div>
              </div>
            </div>

            {/* TABELA COMPARATIVA COMPLETA: ORÇADO VS. REAL (EXECUÇÃO E PERFORMANCE) */}
            <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-blue-500" />
                    <span>Quadro Comparativo: Indicadores Orçados vs. Performance Real da Obra</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Demonstração detalhada de cada indicador de viabilidade calculado conforme a evolução física e contábil
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    Área Priv.: {privateArea.toLocaleString('pt-BR')} m² | Const.: {constructedArea.toLocaleString('pt-BR')} m²
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Indicador de Viabilidade</th>
                      <th className="p-3.5">Métrica / Base</th>
                      <th className="p-3.5 text-right">Valor Orçado</th>
                      <th className="p-3.5 text-right">Valor Real / Executado</th>
                      <th className="p-3.5 text-right">Variação / Desvio</th>
                      <th className="p-3.5 text-center">Desempenho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {/* Linha 1: VGV Total */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Home className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>VGV Total do Empreendimento (Vendido + Estoque)</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{totalUnits} unidades ({privateArea.toLocaleString('pt-BR')} m²)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(vgvOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {formatBRL(vgvReal)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Vendido: {formatBRL(vgvVendido)} | Estoque: {formatBRL(vgvEstoque)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {unitsSold} de {totalUnits} un. ({formatPercent(salesPercent, 1)})
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400">
                          {formatPercent(salesPercent, 1)} Vendido
                        </span>
                      </td>
                    </tr>

                    {/* Linha 2: Preço Médio Privativo */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Ruler className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>Preço Médio por m² Privativo (Vendido)</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">R$/m² privativo ({metragemVendida.toLocaleString('pt-BR')} m² vendidos)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(precoM2PrivativoOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBRL(precoMedioM2Vendido)}</td>
                      <td className={`p-3.5 text-right font-mono font-bold ${variacaoPrecoM2PrivativoPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                        {variacaoPrecoM2PrivativoPercent >= 0 ? '+' : ''}{formatPercent(variacaoPrecoM2PrivativoPercent, 2)} s/ tabela base
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          {variacaoPrecoM2PrivativoPercent > 0 ? 'Valorização s/ Tabela' : 'Aderente à Tabela'}
                        </span>
                      </td>
                    </tr>

                    {/* Linha 3: Preço Médio Construído */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>Preço Médio por m² Construído</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">R$/m² área construída ({constructedArea.toLocaleString('pt-BR')} m²)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(precoM2ConstruidoOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBRL(precoM2ConstruidoRealVendido)}</td>
                      <td className={`p-3.5 text-right font-mono ${variacaoPrecoM2ConstruidoPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {variacaoPrecoM2ConstruidoPercent >= 0 ? '+' : ''}{formatPercent(variacaoPrecoM2ConstruidoPercent, 2)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400">
                          {variacaoPrecoM2ConstruidoPercent > 0 ? 'Acima do Orçado' : 'Em Linha'}
                        </span>
                      </td>
                    </tr>

                    {/* Linha 4: Custo Total de Obra */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Hammer className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Custo Total de Obra (Engenharia)</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">23 etapas EAP / 47 contas obra</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(custoObraOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatBRL(custoObraRealizado)}
                        <span className="block text-[10px] text-emerald-500 font-normal">Proj. Final: {formatBRL(custoObraProjetadoFinal)}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        -{formatBRL(economiaProjetadaObra)} (-4,95%)
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Economia Projetada
                        </span>
                      </td>
                    </tr>

                    {/* Linha 5: Custo por m² Privativo */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Custo Unitário por m² Privativo</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">Custo incorrido ÷ m² privativo executado</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(custoM2PrivativoOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(custoM2PrivativoRealizado)}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatBRL(variacaoCustoM2Privativo)} ({percentVariacaoCustoM2.toFixed(2)}%)
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Eficiência Construtiva
                        </span>
                      </td>
                    </tr>

                    {/* Linha 6: CUB Próprio Construído */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>CUB Próprio por m² Construído</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">Custo incorrido ÷ m² constr. executado</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(cubConstruidoOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{formatBRL(cubConstruidoRealizado)}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatBRL(variacaoCubConstruido)} ({percentVariacaoCub.toFixed(2)}%)
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Abaixo do Orçado
                        </span>
                      </td>
                    </tr>

                    {/* Linha 7: Avanço Físico PCO */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-cyan-500 shrink-0" />
                          <span>Avanço Físico Ponderado da Obra</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">Avanço acumulado EAP (Set/2026)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">48,59% (Previsto)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {formatPercent(progressPercent, 2)} (Executado)
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-500 font-semibold">-2,37 p.p.</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                          Ritmo Controlado
                        </span>
                      </td>
                    </tr>

                    {/* Linha 8: Resultado Operacional */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Resultado Operacional do Empreendimento</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">Receitas (-) Custos Obra (-) Despesas</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(resultadoOperacionalOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(resultadoProjetadoComPerformance)}
                        <span className="block text-[10px] text-amber-500 font-normal">Real Caixa: {formatBRL(resultadoOperacionalRealizado)}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        +{formatBRL(resultadoProjetadoComPerformance - resultadoOperacionalOrcado)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Margem Expandida
                        </span>
                      </td>
                    </tr>

                    {/* Linha 9: Margem Operacional */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 font-bold border-t border-emerald-200 dark:border-emerald-800/40">
                      <td className="p-3.5 text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Margem Operacional de Viabilidade</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 text-[11px]">% s/ VGV do Empreendimento</td>
                      <td className="p-3.5 text-right font-mono text-slate-800 dark:text-slate-200">{formatPercent(margemOperacionalOrcada, 2)}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatPercent(margemProjetadaComPerformance, 2)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        +{ganhoMargemPp.toFixed(2)} p.p.
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                          +2,31 p.p. de Ganho
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* MEMÓRIA DE CÁLCULO E FÓRMULAS DE PERFORMANCE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Info className="w-4 h-4" />
                  <span>Metodologia do Custo Real por m² Executado</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  O custo real unitário é calculado confrontando o <strong>Custo Incorrido Realizado de Obra (R$ 11.292.416,61)</strong> com a <strong>Área Equivalente Executada</strong> ({executedPrivateArea.toFixed(2)} m² privativos, resultante dos 4.840 m² × 46,22% de avanço físico medido no PCO):
                </p>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 font-mono text-xs text-blue-900 dark:text-blue-300">
                  Custo Real/m² = R$ 11.292.416,61 ÷ 2.237,05 m² = <strong>R$ 5.047,91 /m²</strong>
                  <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-sans">
                    ↳ Economia real de R$ 263,11 /m² (-4,95%) em relação ao orçado de R$ 5.311,02 /m².
                  </span>
                </div>
              </div>

              <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Projeção de Margem com Base na Performance</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Extrapolando a economia de -4,95% para os 100% da área do empreendimento, o custo final da obra é projetado em <strong>R$ 24.431.868,00</strong>, gerando economia de R$ 1.273.491,47 e ampliando a margem operacional final:
                </p>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 font-mono text-xs text-emerald-900 dark:text-emerald-300">
                  Margem Projetada = (R$ 55,2M VGV - R$ 24,4M Custo Obra - R$ 5,75M Desp.) ÷ R$ 55,2M = <strong>45,33%</strong>
                  <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-sans">
                    ↳ Ganho de +2,31 p.p. sobre a margem orçada original de 43,02%.
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

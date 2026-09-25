import React, { useState, useMemo } from 'react';
import { Work, BudgetItem, PurchaseOrder, IncurredCost, Revenue } from '../../types';
import { formatBRL, formatPercent } from '../../lib/utils';
import { useData } from '../../contexts/DataContext';
import {
  ATRIUM_DRE_SUMMARY,
  ATRIUM_DRE_LINES,
  ATRIUM_DEPARA_RULES,
  ATRIUM_OBRA_ACCOUNTS,
  isConstructionAccount,
  DreItem,
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
  ArrowRightLeft,
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
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { DataProvenanceBadge } from '../common/DataProvenanceBadge';
import { logAudit } from '../../lib/supabase';

interface WorkResultAnalysisProps {
  work?: Work;
  budgetItems?: BudgetItem[];
  orders?: PurchaseOrder[];
  incurredCosts?: IncurredCost[];
  revenues?: Revenue[];
}

export const WorkResultAnalysis: React.FC<WorkResultAnalysisProps> = ({ work: propWork }) => {
  const { works } = useData();
  const currentWork = propWork || works.find(w => w.id === 'work-1' || w.code === 'OBR-001' || w.name.toLowerCase().includes('atrium')) || works[0];

  const [activeSubTab, setActiveSubTab] = useState<'dre' | 'depara' | 'indicadores'>('dre');
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

  // Filtragem da DRE
  const filteredDreLines = useMemo(() => {
    let lines = ATRIUM_DRE_LINES;

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
  }, [searchTerm, selectedCategory]);

  // Matriz De-Para Editável com Persistência
  type EscopoType = 'Custo de Obra' | 'DRE / Corporativo';

  const [deparaRules, setDeparaRules] = useState<Array<{ origem: string; destino: string; escopo?: EscopoType }>>(() => {
    try {
      const saved = localStorage.getItem('atrium_custom_depara_rules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading custom depara rules', e);
    }
    return ATRIUM_DEPARA_RULES.map((r) => ({
      ...r,
      escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
    }));
  });

  const [savedBaseline, setSavedBaseline] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('atrium_custom_depara_rules');
      if (saved) return saved;
    } catch {}
    return JSON.stringify(
      ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }))
    );
  });

  const [isSavingDepara, setIsSavingDepara] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Lista de Contas DRE / Orçamento para Sugestão Automática
  const destinationAccountOptions = useMemo(() => {
    const set = new Set<string>();
    ATRIUM_DEPARA_RULES.forEach((r) => {
      if (r.destino && r.destino !== '-') set.add(r.destino);
    });
    ATRIUM_OBRA_ACCOUNTS.forEach((a) => set.add(a));
    ATRIUM_DRE_LINES.forEach((l) => {
      if (!l.isGroup) set.add(l.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const modifiedCount = useMemo(() => {
    let count = 0;
    let baselineRules: Array<{ origem: string; destino: string; escopo?: EscopoType }> = [];
    try {
      baselineRules = JSON.parse(savedBaseline);
    } catch {
      baselineRules = ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }));
    }
    const baselineMap = new Map(
      baselineRules.map((r) => [
        r.origem,
        { destino: r.destino, escopo: r.escopo || (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') },
      ])
    );
    deparaRules.forEach((r) => {
      const base = baselineMap.get(r.origem);
      const curEscopo = r.escopo || (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo');
      if (!base || base.destino !== r.destino || base.escopo !== curEscopo) {
        count++;
      }
    });
    if (deparaRules.length !== baselineRules.length) {
      count += Math.abs(deparaRules.length - baselineRules.length);
    }
    return count;
  }, [deparaRules, savedBaseline]);

  const hasUnsavedChanges = useMemo(() => {
    return modifiedCount > 0;
  }, [modifiedCount]);

  const handleUpdateRule = (index: number, field: 'destino' | 'escopo', value: string) => {
    setDeparaRules((prev) => {
      const next = [...prev];
      const current = next[index];
      if (field === 'destino') {
        const autoEscopo = (isConstructionAccount(value) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType;
        next[index] = {
          ...current,
          destino: value,
          // Se o escopo não foi alterado manualmente ou se a conta de destino muda, podemos sugerir o escopo correspondente
          escopo: current.escopo || autoEscopo,
        };
      } else if (field === 'escopo') {
        next[index] = {
          ...current,
          escopo: value as EscopoType,
        };
      }
      return next;
    });
  };

  const handleAddRule = () => {
    setDeparaRules((prev) => [
      { origem: `Conta ERP Adicional #${prev.length + 1}`, destino: 'Salários - Obra', escopo: 'Custo de Obra' },
      ...prev,
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setDeparaRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDepara = () => {
    setIsSavingDepara(true);
    try {
      const json = JSON.stringify(deparaRules);
      localStorage.setItem('atrium_custom_depara_rules', json);
      setSavedBaseline(json);
      logAudit(
        'UPDATE_DEPARA_MATRIX',
        'atrium_depara',
        currentWork?.id || 'work-1',
        `Matriz De-Para salva pelo gestor com ${deparaRules.length} regras vinculadas.`
      );
      setSaveSuccessMessage(
        hasUnsavedChanges
          ? 'Matriz De-Para salva com sucesso no sistema!'
          : 'Matriz De-Para confirmada e sincronizada com sucesso!'
      );
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (e) {
      console.error('Error saving custom depara rules', e);
    } finally {
      setIsSavingDepara(false);
    }
  };

  const handleDiscardChanges = () => {
    try {
      setDeparaRules(JSON.parse(savedBaseline));
    } catch {
      setDeparaRules(
        ATRIUM_DEPARA_RULES.map((r) => ({
          ...r,
          escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
        }))
      );
    }
  };

  const handleRestoreDefault = () => {
    if (window.confirm('Deseja restaurar as 115 regras de De-Para originais da planilha oficial?')) {
      const defaults = ATRIUM_DEPARA_RULES.map((r) => ({
        ...r,
        escopo: (isConstructionAccount(r.destino) ? 'Custo de Obra' : 'DRE / Corporativo') as EscopoType,
      }));
      setDeparaRules(defaults);
    }
  };

  // Filtragem do De-Para
  const [deparaSearch, setDeparaSearch] = useState('');
  const filteredDeparaWithIndex = useMemo(() => {
    const list = deparaRules.map((r, i) => ({ ...r, originalIndex: i }));
    if (!deparaSearch.trim()) return list;
    const q = deparaSearch.toLowerCase();
    return list.filter(
      (r) =>
        r.origem.toLowerCase().includes(q) ||
        r.destino.toLowerCase().includes(q) ||
        (r.escopo && r.escopo.toLowerCase().includes(q))
    );
  }, [deparaRules, deparaSearch]);

  const summary = ATRIUM_DRE_SUMMARY;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner de Diferenciação Conceitual */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>2. Acompanhamento do Resultado da Obra (Visão Econômico-Financeira / DRE)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Resultado Consolidado e DRE do Empreendimento Atrium
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Visão gerencial conforme a aba <strong>RESUMO ORÇAMENTO X REAL</strong> da planilha oficial do PCO. Diferente do orçamento técnico de obra (restrito às etapas civis), esta visão engloba a viabilidade total: <strong>Receitas de Vendas</strong>, <strong>Impostos</strong>, <strong>Custos de Obra</strong>, <strong>Despesas Comerciais/MKT</strong> e <strong>Margem Final</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-2">
          <DataProvenanceBadge
            type="pco"
            sourceFile="Aba RESUMO ORÇAMENTO X REAL"
            baseDate="Set/2026"
            details="Conciliação DRE do Empreendimento"
          />
          <DataProvenanceBadge
            type="erp"
            sourceFile="Aba REAL (5.635 lançamentos)"
            details="Contas de Custo e Despesa"
          />
          <DataProvenanceBadge
            type="calculado"
            details="Margem e Resultado Operacional"
          />
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
            Orçado Previsto: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.receita.orcadoBruto)}</strong>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">% Realizado:</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {formatPercent(summary.receita.percentBruto, 2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.min(100, summary.receita.percentBruto)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Receita Líquida Real:</span>
              <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.receita.liquidaRealizado)}</strong>
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
            Orçado Obra: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.custoObra.orcado)}</strong>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">% Executado:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {formatPercent(summary.custoObra.percent, 2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, summary.custoObra.percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Materiais & Serviços:</span>
              <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.custoObra.materiaisServicos.realizado)}</strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Mão de Obra:</span>
              <span>{formatBRL(summary.custoObra.maoDeObra.realizado)}</span>
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
            Orçado Total: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.despesas.orcado)}</strong>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">% Consumido:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {formatPercent(summary.despesas.percent, 2)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.min(100, summary.despesas.percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Comissão Corretores:</span>
              <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.despesas.comissoesVendas.realizado)}</strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>MKT & Propaganda:</span>
              <span>{formatBRL(summary.despesas.comerciaisMkt.realizado)}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Resultado Financeiro e Margem */}
        <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              4. Resultado do Empreendimento
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
            Orçado Previsto: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(summary.resultadoFinanceiro.resultadoOperacionalOrcado)}</strong>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Margem Orçada:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatPercent(summary.resultadoFinanceiro.margemOperacionalOrcada, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Resultado Caixa (F.C.):</span>
              <strong className="text-slate-800 dark:text-slate-200">{formatBRL(summary.resultadoFinanceiro.resultadoCaixaRealizado)}</strong>
            </div>
            <div className="text-[10px] text-slate-400 italic leading-snug pt-1">
              Fase construtiva de investimento; repasses concentram no término.
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Demonstração da Fórmula do Resultado */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Scale className="w-4 h-4 shrink-0" />
            <span>Fórmula do Resultado do Empreendimento = Receita de Vendas (-) Custos de Obra (-) Despesas</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Orçado:</span>
              <span className="text-sky-400 font-semibold">{formatBRL(summary.receita.orcadoBruto)}</span>
              <span className="text-slate-500">-</span>
              <span className="text-amber-400 font-semibold">{formatBRL(summary.custoObra.orcado)}</span>
              <span className="text-slate-500">-</span>
              <span className="text-purple-400 font-semibold">{formatBRL(summary.despesas.orcado)}</span>
              <span className="text-slate-500">=</span>
              <strong className="text-emerald-400 font-black">{formatBRL(summary.resultadoFinanceiro.resultadoOperacionalOrcado)}</strong>
              <span className="text-emerald-500 text-[11px]">({formatPercent(summary.resultadoFinanceiro.margemOperacionalOrcada, 2)})</span>
            </div>

            <div className="hidden xl:inline text-slate-600">|</div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Realizado:</span>
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
            onClick={() => setActiveSubTab('depara')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'depara'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Matriz De-Para (86 Contas Mapeadas)</span>
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
                    <th className="p-3 min-w-[280px]">Grupo / Conta DRE (RESUMO ORÇAMENTO X REAL)</th>
                    <th className="p-3 text-right">Orçado Total (R$)</th>
                    <th className="p-3 text-right">Realizado (R$)</th>
                    <th className="p-3 text-right">Variação (R$)</th>
                    <th className="p-3 text-center min-w-[100px]">% Realizado</th>
                    <th className="p-3 text-right">% s/ Receita Orç.</th>
                    <th className="p-3 text-right">% s/ Receita Real.</th>
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

                    const isFavorable = line.name.includes('RECEITA')
                      ? line.variacao >= 0
                      : line.variacao <= 0;

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
                        <td className="p-2.5 text-right font-mono">
                          {formatBRL(line.orcado)}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: MATRIZ DE-PARA E CLASSIFICAÇÃO DE CONTAS */}
      {activeSubTab === 'depara' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Explicativo: Contas de Obra vs Contas da DRE */}
            <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Contas Exclusivas do Orçamento da Obra ({ATRIUM_OBRA_ACCOUNTS.length} Contas)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Estas 47 contas compõem o <strong>Custo de Obra / Orçamento Técnico de Engenharia (R$ 25.705.359,47)</strong>, vinculadas diretamente às 23 etapas da EAP.
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2 pt-1">
                {ATRIUM_OBRA_ACCOUNTS.map((acc, idx) => (
                  <div key={idx} className="text-[11px] px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                    {acc}
                  </div>
                ))}
              </div>
            </div>

            {/* Card Explicativo: Contas que NÃO Entram na Obra */}
            <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Info className="w-4 h-4" />
                <span>Contas que NÃO Participam da Obra (Exclusivas da DRE / Resultado)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Não entram no custo de engenharia: Receitas de vendas, impostos de faturamento (PIS, COFINS, IRPJ, CSLL), comissões de corretores, publicidade, honorários advocatícios e despesas corporativas da sede.
              </p>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div>• <strong>Receitas:</strong> Venda de Unidades (VGV R$ 55,2M)</div>
                <div>• <strong>Deduções Tributárias:</strong> PIS, COFINS, CSLL, IRPJ, Distratos</div>
                <div>• <strong>Despesas Comerciais & MKT:</strong> Campanhas, Publicidade, Stand Conservação</div>
                <div>• <strong>Comissões:</strong> Corretores de Imóveis</div>
                <div>• <strong>Administração Central:</strong> Tarifas Bancárias, Multas Sede, Diretoria</div>
              </div>
            </div>
          </div>

          {/* Datalist com Todas as Opções Oficiais de Contas para Autocompletar */}
          <datalist id="dre-destination-accounts">
            {destinationAccountOptions.map((opt, i) => (
              <option key={i} value={opt} />
            ))}
          </datalist>

          {/* Tabela da Matriz De-Para Completa com Edição na Hora */}
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-0 shadow-lg">
            {/* Header do Card */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Matriz De-Para: Lançamento Bruto ERP → Conta Ajustada DRE / Obra
                  </h3>
                  {hasUnsavedChanges && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                      {modifiedCount} {modifiedCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mapeamento interativo que unifica os 5.635 lançamentos contábeis nas 86 contas sintéticas da DRE. Você pode editar qualquer conta na hora e salvar ao final.
                </p>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handleAddRule}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Adicionar uma nova regra de mapeamento de conta do ERP"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Regra</span>
                </button>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={deparaSearch}
                    onChange={(e) => setDeparaSearch(e.target.value)}
                    placeholder="Filtrar origem ou destino..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Tabela de Regras com Edição em Tempo Real */}
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-800 dark:text-slate-300">
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-2/5">Conta de Origem no ERP (Extrato)</th>
                    <th className="p-3 w-2/5">Conta Ajustada DRE / Orçamento (Editável)</th>
                    <th className="p-3 text-center w-48">Tipo de Escopo (Editável)</th>
                    <th className="p-3 w-12 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {filteredDeparaWithIndex.map((rule) => {
                    const currentEscopo = rule.escopo || (isConstructionAccount(rule.destino) ? 'Custo de Obra' : 'DRE / Corporativo');
                    const isObra = currentEscopo === 'Custo de Obra';

                    return (
                      <tr key={rule.originalIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-400 text-[10px] text-center font-mono">
                          {rule.originalIndex + 1}
                        </td>
                        <td className="p-3">
                          <span
                            className="font-mono text-xs text-slate-800 dark:text-slate-200 select-all font-medium"
                            title="Conta de origem no ERP (Extrato) - Fixa / Não editável"
                          >
                            {rule.origem}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="relative flex items-center w-full">
                            <input
                              type="text"
                              list="dre-destination-accounts"
                              value={rule.destino}
                              onChange={(e) => handleUpdateRule(rule.originalIndex, 'destino', e.target.value)}
                              className="w-full font-semibold text-xs text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 focus:bg-white dark:focus:bg-slate-900 border border-blue-200/80 dark:border-blue-800/40 focus:border-blue-500 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                              placeholder="Selecione ou digite a conta de destino..."
                              title="Altere na hora a conta de destino ajustada para a DRE e Obra"
                            />
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2 pointer-events-none opacity-60" />
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center justify-center">
                            <select
                              value={currentEscopo}
                              onChange={(e) => handleUpdateRule(rule.originalIndex, 'escopo', e.target.value)}
                              className={`text-[11px] font-bold rounded-full px-3 py-1 cursor-pointer border shadow-sm outline-none transition-all ${
                                isObra
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-200/80 dark:hover:bg-purple-900/60'
                              }`}
                              title="Clique para alterar o Tipo de Escopo desta regra"
                            >
                              <option value="Custo de Obra" className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold py-1">
                                ● Custo de Obra
                              </option>
                              <option value="DRE / Corporativo" className="bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 font-bold py-1">
                                ● DRE / Corporativo
                              </option>
                            </select>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveRule(rule.originalIndex)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                            title="Excluir regra de mapeamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDeparaWithIndex.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        Nenhuma regra De-Para encontrada para o termo "{deparaSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ DO CARD COM AÇÕES E BOTÃO DE SALVAR (SOLICITADO PELO USUÁRIO) */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Total: <strong>{deparaRules.length}</strong> regras mapeadas
                </span>

                {hasUnsavedChanges ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{modifiedCount} {modifiedCount === 1 ? 'alteração não salva' : 'alterações não salvas'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Todas as alterações salvas</span>
                  </span>
                )}

                <button
                  onClick={handleRestoreDefault}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Restaurar valores de fábrica da planilha oficial"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão Oficial</span>
                </button>
              </div>

              <div className="flex items-center space-x-2.5 justify-end">
                {saveSuccessMessage && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>{saveSuccessMessage}</span>
                  </span>
                )}

                {hasUnsavedChanges && (
                  <button
                    onClick={handleDiscardChanges}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    Descartar
                  </button>
                )}

                <button
                  onClick={handleSaveDepara}
                  disabled={isSavingDepara}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                    hasUnsavedChanges
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 cursor-pointer transform hover:-translate-y-0.5'
                      : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm'
                  }`}
                  title="Salvar matriz De-Para atualizada no sistema"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingDepara ? 'Salvando...' : 'Salvar Matriz De-Para'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: INDICADORES DO EMPREENDIMENTO (VGV / CUB) - ORÇADO VS. REAL */}
      {activeSubTab === 'indicadores' && (() => {
        // Indicadores do Empreendimento: Orçado vs. Real (Performance da Obra)
        const totalUnits = currentWork?.total_units || 80;
        const unitsSold = currentWork?.units_sold !== undefined ? currentWork.units_sold : 64;
        const unitsAvailable = Math.max(0, totalUnits - unitsSold);
        const salesPercent = totalUnits > 0 ? (unitsSold / totalUnits) * 100 : 80;

        const privateArea = currentWork?.private_area_m2 || 4840.0;
        const constructedArea = currentWork?.total_area_m2 || 6850.0;
        const cubReference = currentWork?.cub_reference_m2 || 2850.0;

        // Avanço físico ponderado da obra
        const rawProgress = currentWork?.progress_percent || 46.22;
        const progressPercent = rawProgress > 100 ? rawProgress / 100 : rawProgress;

        // Áreas equivalentes executadas pelo avanço físico
        const executedPrivateArea = privateArea * (progressPercent / 100);
        const executedConstructedArea = constructedArea * (progressPercent / 100);

        // 1. VGV (Valor Geral de Vendas)
        const vgvOrcado = summary.receita.orcadoBruto; // R$ 55.206.000,00
        const vgvVendido = currentWork?.vgv_sold || 44164800.0; // R$ 44.164.800,00 (80%)
        const vgvRealizadoFaturado = summary.receita.realizadoBruto; // R$ 4.789.007,29 (8,68%)
        const vgvDisponivel = Math.max(0, vgvOrcado - vgvVendido); // R$ 11.041.200,00 (20%)

        // 2. Preço Médio por m²
        const precoM2PrivativoOrcado = privateArea > 0 ? vgvOrcado / privateArea : 11406.2; // R$ 11.406,20 /m²
        const precoM2ConstruidoOrcado = constructedArea > 0 ? vgvOrcado / constructedArea : 8059.27; // R$ 8.059,27 /m²
        const soldPrivateArea = totalUnits > 0 ? privateArea * (unitsSold / totalUnits) : 3872.0;
        const precoM2PrivativoRealVendido = soldPrivateArea > 0 ? vgvVendido / soldPrivateArea : 11406.2; // R$ 11.406,20 /m²
        const precoM2ConstruidoRealVendido = (constructedArea * (unitsSold / totalUnits)) > 0 ? vgvVendido / (constructedArea * (unitsSold / totalUnits)) : 8059.27; // R$ 8.059,27 /m²
        const receitaFaturadaPorM2Executado = executedPrivateArea > 0 ? vgvRealizadoFaturado / executedPrivateArea : 2140.77; // R$ 2.140,77 /m²
        const ticketMedioVendido = unitsSold > 0 ? vgvVendido / unitsSold : 690075.0; // R$ 690.075,00

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
            {/* Banner de Contexto de Performance */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-950/40 border border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Indicadores Econômicos de Viabilidade & Performance Construtiva (Orçado vs. Real)</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Viabilidade Imobiliária e Desempenho Real da Obra
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                  Comparativo entre as premissas orçadas no estudo de viabilidade e os indicadores reais calculados conforme a evolução física (<strong>{formatPercent(progressPercent, 2)} executado</strong>) e os dados contábeis da <strong>DRE Oficial</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>PCO: {formatPercent(progressPercent, 2)} Físico</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Custo: {formatPercent(Math.abs(percentVariacaoCustoM2), 2)} Economia</span>
                </span>
              </div>
            </div>

            {/* 4 CARDS PRINCIPAIS: VGV, PREÇO M², CUSTO OBRA/CUB E MARGEM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: VGV e Comercialização */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-sky-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-sky-500" />
                    <span>1. VGV e Comercialização</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                    {formatPercent(salesPercent, 0)} Vendido
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {formatBRL(vgvVendido)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    VGV Orçado Total: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(vgvOrcado)}</strong>
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
                    <span className="text-slate-500">Faturamento Realizado (DRE):</span>
                    <strong className="text-sky-600 dark:text-sky-400 font-mono">{formatBRL(vgvRealizadoFaturado)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Saldo a Vender ({unitsAvailable} un.):</span>
                    <span className="font-mono">{formatBRL(vgvDisponivel)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Preço Médio do m² */}
              <div className="glass-card p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-blue-500/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-blue-500" />
                    <span>2. Preço Médio do m²</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    100% da Tabela
                  </span>
                </div>

                <div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {formatBRL(precoM2PrivativoRealVendido)} <span className="text-xs font-normal text-slate-400">/m² priv.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Orçado Tabela: <strong className="text-slate-700 dark:text-slate-300">{formatBRL(precoM2PrivativoOrcado)} /m²</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Preço p/ m² Construído:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatBRL(precoM2ConstruidoRealVendido)} /m²</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Ticket Médio Vendido:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{formatBRL(ticketMedioVendido)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>Faturado / m² Executado:</span>
                    <span className="font-mono text-slate-400">{formatBRL(receitaFaturadaPorM2Executado)} /m²</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Área Privativa Total: {privateArea.toLocaleString('pt-BR')} m² (80 unidades)
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
                          <span>VGV Total do Empreendimento</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">80 unidades ({privateArea.toLocaleString('pt-BR')} m²)</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(vgvOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {formatBRL(vgvVendido)}
                        <span className="block text-[10px] text-slate-400 font-normal">Faturado: {formatBRL(vgvRealizadoFaturado)}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatPercent(salesPercent, 1)} comercializado
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400">
                          80% Vendido
                        </span>
                      </td>
                    </tr>

                    {/* Linha 2: Preço Médio Privativo */}
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Ruler className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>Preço Médio por m² Privativo</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">R$/m² privativo</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{formatBRL(precoM2PrivativoOrcado)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBRL(precoM2PrivativoRealVendido)}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        0,00% (100% da tabela)
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Aderente à Tabela
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
                      <td className="p-3.5 text-right font-mono text-slate-500">0,00%</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400">
                          Em Linha
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

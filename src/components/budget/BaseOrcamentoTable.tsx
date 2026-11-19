import React, { useState, useMemo, useEffect } from 'react';
import {
  ATRIUM_BASE_ORCAMENTO_GROUPS,
  BaseBudgetItem,
  BaseBudgetGroup,
} from '../../lib/atrium-base-orcamento';
import { useData } from '../../contexts/DataContext';
import { formatBRL } from '../../lib/utils';
import {
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  UploadCloud,
} from 'lucide-react';

interface BaseOrcamentoTableProps {
  workId?: string;
  workName?: string;
  onOpenNewVersion?: () => void;
  onOpenImport?: () => void;
  readOnly?: boolean;
}

export const BaseOrcamentoTable: React.FC<BaseOrcamentoTableProps> = ({
  workId = 'work-1',
  workName = 'Atrium Select',
  onOpenNewVersion,
  onOpenImport,
  readOnly = false,
}) => {
  const { budgetAccounts, budgetItems, stages } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Constrói os grupos de orçamento dinamicamente para a obra selecionada
  const activeGroups: BaseBudgetGroup[] = useMemo(() => {
    const isAtrium = workId === 'work-1';
    const workAccounts = budgetAccounts.filter((a) => a.work_id === workId);

    // Para o Atrium (work-1), se não houver importação customizada substituindo as 298 contas, usa os grupos oficiais
    if (isAtrium && workAccounts.length === 0) {
      return ATRIUM_BASE_ORCAMENTO_GROUPS;
    }

    // Se a obra tiver contas em budgetAccounts (vindas do Supabase ou de importação PCO)
    if (workAccounts.length > 0 && (!isAtrium || workAccounts.some((a) => a.id.startsWith('ba-work-1-')))) {
      const groupMap = new Map<string, BaseBudgetItem[]>();
      workAccounts.forEach((acc, idx) => {
        const gName = acc.group_etapa || 'ORÇAMENTO GERAL';
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        const val = Number(acc.total_amount || 0);
        const expType = (acc.expense_type || 'MATERIAL').toUpperCase();
        groupMap.get(gName)!.push({
          id: acc.id || `item-${workId}-${idx}`,
          code: acc.code || acc.account_code || `${String(idx + 1).padStart(2, '0')}.01`,
          substageName: acc.description,
          erpAccount: acc.erp_account || 'Custo de Obra',
          unit: acc.unit || 'VB',
          quantity: Number(acc.quantity || 1),
          maoAmount: expType.includes('MÃO') || expType.includes('MAO') ? val : 0,
          matAmount: expType.includes('MÃO') || expType.includes('MAO') ? 0 : val,
          totalAmount: val,
          budgetAmount: val,
          stageGroup: gName,
          expenseType: expType,
          measuredPercent: acc.progress_actual ?? 0,
          measuredAmount: (val * (acc.progress_actual ?? 0)) / 100,
        });
      });

      return Array.from(groupMap.entries()).map(([name, items], gIdx) => {
        const totalMat = items.reduce((s, i) => s + i.matAmount, 0);
        const totalMao = items.reduce((s, i) => s + i.maoAmount, 0);
        const totalBudget = items.reduce((s, i) => s + i.budgetAmount, 0);
        return {
          name,
          code: `${String(gIdx + 1).padStart(2, '0')}.00`,
          itemsCount: items.length,
          totalMat,
          totalMao,
          totalBudget,
          items,
        };
      });
    }

    if (isAtrium) {
      return ATRIUM_BASE_ORCAMENTO_GROUPS;
    }

    // Fallback para obras que ainda não importaram planilha PCO completa mas possuem budgetItems ou stages
    const workBudgetItems = budgetItems.filter((b) => b.work_id === workId);
    const workStages = stages.filter((s) => s.work_id === workId);

    if (workBudgetItems.length > 0) {
      const groupMap = new Map<string, BaseBudgetItem[]>();
      workBudgetItems.forEach((bi, idx) => {
        const st = workStages.find((s) => s.id === bi.stage_id);
        const gName = st?.name || (bi.cost_group || 'ETAPA GERAL').toUpperCase();
        if (!groupMap.has(gName)) groupMap.set(gName, []);
        const val = Number(bi.total_planned || 0);
        const isMao = bi.cost_group === 'mao_de_obra' || bi.cost_group === 'empreiteiro';
        groupMap.get(gName)!.push({
          id: bi.id || `bi-${workId}-${idx}`,
          code: st?.code ? `${st.code}.${idx + 1}` : `${String(idx + 1).padStart(2, '0')}.01`,
          substageName: bi.description,
          erpAccount: bi.cost_center || 'Custo de Obra',
          unit: bi.unit || 'VB',
          quantity: Number(bi.quantity_planned || 1),
          maoAmount: isMao ? val : 0,
          matAmount: isMao ? 0 : val,
          totalAmount: val,
          budgetAmount: val,
          stageGroup: gName,
          expenseType: isMao ? 'MÃO DE OBRA' : 'MATERIAL',
        });
      });

      return Array.from(groupMap.entries()).map(([name, items], gIdx) => ({
        name,
        code: `${String(gIdx + 1).padStart(2, '0')}.00`,
        itemsCount: items.length,
        totalMat: items.reduce((s, i) => s + i.matAmount, 0),
        totalMao: items.reduce((s, i) => s + i.maoAmount, 0),
        totalBudget: items.reduce((s, i) => s + i.budgetAmount, 0),
        items,
      }));
    }

    if (workStages.length > 0) {
      return workStages.map((st, idx) => {
        const val = Number(st.budget_planned || 0);
        const item: BaseBudgetItem = {
          id: st.id,
          code: st.code || `${String(idx + 1).padStart(2, '0')}.01`,
          substageName: st.name,
          erpAccount: 'Custo de Obra',
          unit: 'VB',
          quantity: 1,
          maoAmount: 0,
          matAmount: val,
          totalAmount: val,
          budgetAmount: val,
          stageGroup: st.name,
          expenseType: 'MATERIAL',
        };
        return {
          name: st.name,
          code: st.code || `${String(idx + 1).padStart(2, '0')}.00`,
          itemsCount: 1,
          totalMat: val,
          totalMao: 0,
          totalBudget: val,
          items: [item],
        };
      });
    }

    return [];
  }, [workId, budgetAccounts, budgetItems, stages]);

  useEffect(() => {
    setSelectedGroup('todos');
    const init: Record<string, boolean> = {};
    activeGroups.forEach((g) => {
      init[g.name] = true;
    });
    setExpandedGroups(init);
  }, [workId, activeGroups]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    activeGroups.forEach((g) => {
      all[g.name] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Filtered items
  const filteredGroups = useMemo(() => {
    return activeGroups
      .map((group) => {
        if (selectedGroup !== 'todos' && group.name !== selectedGroup) {
          return null;
        }

        const matchingItems = group.items.filter((item) => {
          const matchesSearch =
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.substageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.erpAccount.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.stageGroup.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesType =
            selectedType === 'todos' ||
            item.expenseType.toUpperCase() === selectedType.toUpperCase();

          return matchesSearch && matchesType;
        });

        if (matchingItems.length === 0 && (searchTerm || selectedType !== 'todos')) {
          return null;
        }

        return {
          ...group,
          items: matchingItems,
          totalBudgetFiltered: matchingItems.reduce((acc, it) => acc + it.budgetAmount, 0),
          totalMatFiltered: matchingItems.reduce((acc, it) => acc + it.matAmount, 0),
          totalMaoFiltered: matchingItems.reduce((acc, it) => acc + it.maoAmount, 0),
        };
      })
      .filter(Boolean) as (BaseBudgetGroup & {
      totalBudgetFiltered: number;
      totalMatFiltered: number;
      totalMaoFiltered: number;
    })[];
  }, [activeGroups, searchTerm, selectedGroup, selectedType]);

  const currentTotalBudget = filteredGroups.reduce((acc, g) => acc + g.totalBudgetFiltered, 0);
  const totalItemsCount = activeGroups.reduce((acc, g) => acc + g.items.length, 0);
  const distinctErpAccountsCount = useMemo(() => {
    const set = new Set<string>();
    activeGroups.forEach((g) => g.items.forEach((it) => it.erpAccount && set.add(it.erpAccount)));
    return set.size;
  }, [activeGroups]);

  return (
    <div className="space-y-4">
      {/* Banner Informativo da BASE ORÇAMENTO */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-sky-900 dark:text-sky-300 block">
            Base Orçamentária Inicial ({workName} — Modelo BASE ORÇAMENTO / PCO)
          </span>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            Contém <strong>{totalItemsCount} subetapas</strong> e{' '}
            <strong>{activeGroups.length} etapas macro</strong> de <strong>{workName}</strong>, com
            vínculo direto às contas do ERP e acompanhamento físico-financeiro.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {onOpenImport && !readOnly && (
            <button
              onClick={onOpenImport}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Importar Orçamento (.xlsx)</span>
            </button>
          )}
          {onOpenNewVersion && !readOnly && (
            <button
              onClick={onOpenNewVersion}
              className="px-4 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow-md shadow-[#004171]/20 transition-all flex items-center space-x-1.5 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
              <span>Criar Nova Versão / Revisão INCC</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Orçamento Total ({workName})
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatBRL(currentTotalBudget)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {filteredGroups.length} etapas ({totalItemsCount} subetapas)
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block flex items-center space-x-1">
            <Layers className="w-3 h-3" />
            <span>Contas Mapeadas no ERP (DRE)</span>
          </span>
          <div className="text-lg font-bold text-sky-700 dark:text-sky-400 mt-1">
            {distinctErpAccountsCount} Contas Conciliadas
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            100% integradas à DRE e ao Realizado
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold block flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Mapeamento De-Para Oficial</span>
          </span>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {totalItemsCount} Subetapas Vinculadas
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Sincronizado com Supabase Cloud ({workId})
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código, subetapa, conta ERP ou etapa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="todos" className="bg-white dark:bg-slate-900">
                Todas as Etapas ({activeGroups.length})
              </option>
              {activeGroups.map((g) => (
                <option key={g.name} value={g.name} className="bg-white dark:bg-slate-900">
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
          >
            Expandir Tudo
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors"
          >
            Recolher Tudo
          </button>
        </div>
      </div>

      {/* Tabela de Etapas e Subetapas */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3 w-20">Código</th>
              <th className="p-3 min-w-[280px]">Etapa / Subetapa (CONTA ORÇAMENTO)</th>
              <th className="p-3 min-w-[220px]">Conta ERP Vinculada (CONTA ERP)</th>
              <th className="p-3 text-center w-20">Unid.</th>
              <th className="p-3 text-center w-24">Qtd.</th>
              <th className="p-3 text-right w-36">Valor Orçado (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups[group.name] ?? true;

              return (
                <React.Fragment key={group.name}>
                  {/* Linha da Macroetapa (Grupo Orçamento) */}
                  <tr
                    onClick={() => toggleGroup(group.name)}
                    className="bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer font-bold text-slate-900 dark:text-white transition-colors"
                  >
                    <td className="p-3 text-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-sky-500 inline" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                      )}
                    </td>
                    <td className="p-3 text-sky-600 dark:text-sky-400 font-mono text-[11px]">
                      {group.code || 'ETAPA'}
                    </td>
                    <td className="p-3" colSpan={4}>
                      <span className="flex items-center space-x-2">
                        <Layers className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />
                        <span>{group.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({group.items.length} subetapas)
                        </span>
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatBRL(group.totalBudgetFiltered)}
                    </td>
                  </tr>

                  {/* Linhas das Subetapas */}
                  {isExpanded &&
                    group.items.map((item) => {
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-sky-50/50 dark:hover:bg-slate-800/30 transition-colors text-[11px]"
                        >
                          <td className="p-2.5"></td>
                          <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">
                            {item.code}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {item.substageName}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                              {item.erpAccount || '—'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-slate-500 font-mono">
                            {item.unit || 'UN'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                            {item.quantity.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatBRL(item.budgetAmount)}
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-900/90 font-bold border-t border-slate-300 dark:border-slate-700">
            <tr>
              <td colSpan={6} className="p-3 text-right uppercase text-[11px] text-slate-700 dark:text-slate-300">
                Total Geral ({filteredGroups.length} etapas exibidas):
              </td>
              <td className="p-3 text-right text-slate-900 dark:text-white font-mono text-sm font-black">
                {formatBRL(currentTotalBudget)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

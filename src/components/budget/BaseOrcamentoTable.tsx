import React, { useState, useMemo } from 'react';
import {
  ATRIUM_BASE_ORCAMENTO_ITEMS,
  ATRIUM_BASE_ORCAMENTO_GROUPS,
  ATRIUM_BASE_TOTALS,
  BaseBudgetItem,
} from '../../lib/atrium-base-orcamento';
import { formatBRL } from '../../lib/utils';
import {
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  HardHat,
  Package,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface BaseOrcamentoTableProps {
  onOpenNewVersion?: () => void;
  readOnly?: boolean;
}

export const BaseOrcamentoTable: React.FC<BaseOrcamentoTableProps> = ({
  onOpenNewVersion,
  readOnly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Expand all by default
  useState(() => {
    const init: Record<string, boolean> = {};
    ATRIUM_BASE_ORCAMENTO_GROUPS.forEach((g) => {
      init[g.name] = true;
    });
    setExpandedGroups(init);
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    ATRIUM_BASE_ORCAMENTO_GROUPS.forEach((g) => {
      all[g.name] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Filtered items
  const filteredGroups = useMemo(() => {
    return ATRIUM_BASE_ORCAMENTO_GROUPS.map((group) => {
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
    }).filter(Boolean) as (typeof ATRIUM_BASE_ORCAMENTO_GROUPS[0] & {
      totalBudgetFiltered: number;
      totalMatFiltered: number;
      totalMaoFiltered: number;
    })[];
  }, [searchTerm, selectedGroup, selectedType]);

  const currentTotalBudget = filteredGroups.reduce((acc, g) => acc + g.totalBudgetFiltered, 0);
  const currentTotalMat = filteredGroups.reduce((acc, g) => acc + g.totalMatFiltered, 0);
  const currentTotalMao = filteredGroups.reduce((acc, g) => acc + g.totalMaoFiltered, 0);

  return (
    <div className="space-y-4">
      {/* Banner Informativo da BASE ORÇAMENTO */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-sky-900 dark:text-sky-300 block">
            Base Orçamentária Inicial (Aba BASE ORÇAMENTO - PCO Oficial)
          </span>
          <p className="text-slate-600 dark:text-slate-400 mt-0.5">
            Contém todas as <strong>{ATRIUM_BASE_TOTALS.totalItems} subetapas</strong> e{' '}
            <strong>{ATRIUM_BASE_TOTALS.totalGroups} etapas macro</strong> do projeto Atrium. Subetapas
            estão discriminadas em linhas separadas para <strong>MATERIAL</strong> e{' '}
            <strong>MÃO DE OBRA</strong> com vínculo à conta do ERP.
          </p>
        </div>
        {onOpenNewVersion && !readOnly && (
          <button
            onClick={onOpenNewVersion}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow-md shadow-[#004171]/20 transition-all flex items-center space-x-1.5 whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
            <span>Criar Nova Versão / Revisão INCC</span>
          </button>
        )}
      </div>

      {/* Cards de Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Orçamento Total da Obra
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatBRL(currentTotalBudget)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {filteredGroups.length} etapas ({ATRIUM_BASE_TOTALS.totalItems} subetapas)
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold block flex items-center space-x-1">
            <Package className="w-3 h-3" />
            <span>Total Material (MAT)</span>
          </span>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">
            {formatBRL(currentTotalMat)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {currentTotalBudget > 0 ? ((currentTotalMat / currentTotalBudget) * 100).toFixed(1) : 0}% do orçamento
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold block flex items-center space-x-1">
            <HardHat className="w-3 h-3" />
            <span>Total Mão de Obra (MAO)</span>
          </span>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
            {formatBRL(currentTotalMao)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {currentTotalBudget > 0 ? ((currentTotalMao / currentTotalBudget) * 100).toFixed(1) : 0}% do orçamento
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
              <option value="todos" className="bg-white dark:bg-slate-900">Todas as Etapas ({ATRIUM_BASE_ORCAMENTO_GROUPS.length})</option>
              {ATRIUM_BASE_ORCAMENTO_GROUPS.map((g) => (
                <option key={g.name} value={g.name} className="bg-white dark:bg-slate-900">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 text-[10px]">Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="todos" className="bg-white dark:bg-slate-900">Todos os Tipos</option>
              <option value="MATERIAL" className="bg-white dark:bg-slate-900">Material (MAT)</option>
              <option value="MÃO DE OBRA" className="bg-white dark:bg-slate-900">Mão de Obra (MAO)</option>
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
              <th className="p-3 min-w-[240px]">Etapa / Subetapa (CONTA ORÇAMENTO)</th>
              <th className="p-3 min-w-[180px]">Conta ERP Vinculada (CONTA ERP)</th>
              <th className="p-3 text-center w-16">Unid.</th>
              <th className="p-3 text-center w-20">Qtd.</th>
              <th className="p-3 text-center w-28">Tipo</th>
              <th className="p-3 text-right w-28">Mão de Obra</th>
              <th className="p-3 text-right w-28">Material</th>
              <th className="p-3 text-right w-32">Total Orçado (R$)</th>
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
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Consolidado
                      </span>
                    </td>
                    <td className="p-3 text-right text-amber-700 dark:text-amber-400 font-mono text-[11px]">
                      {formatBRL(group.totalMaoFiltered)}
                    </td>
                    <td className="p-3 text-right text-blue-700 dark:text-blue-400 font-mono text-[11px]">
                      {formatBRL(group.totalMatFiltered)}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                      {formatBRL(group.totalBudgetFiltered)}
                    </td>
                  </tr>

                  {/* Linhas das Subetapas */}
                  {isExpanded &&
                    group.items.map((item) => {
                      const isMat = item.expenseType.toUpperCase().includes('MAT');
                      const isMao = item.expenseType.toUpperCase().includes('MÃO');

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
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 italic">
                            {item.erpAccount || '—'}
                          </td>
                          <td className="p-2.5 text-center text-slate-500 font-mono">
                            {item.unit || 'UN'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-700 dark:text-slate-300">
                            {item.quantity.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMat
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50'
                                  : isMao
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.expenseType}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.maoAmount > 0 ? formatBRL(item.maoAmount) : '—'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.matAmount > 0 ? formatBRL(item.matAmount) : '—'}
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
              <td colSpan={7} className="p-3 text-right uppercase text-[11px] text-slate-700 dark:text-slate-300">
                Totais ({filteredGroups.length} etapas exibidas):
              </td>
              <td className="p-3 text-right text-amber-700 dark:text-amber-400 font-mono">
                {formatBRL(currentTotalMao)}
              </td>
              <td className="p-3 text-right text-blue-700 dark:text-blue-400 font-mono">
                {formatBRL(currentTotalMat)}
              </td>
              <td className="p-3 text-right text-slate-900 dark:text-white font-mono text-sm">
                {formatBRL(currentTotalBudget)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

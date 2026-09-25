import React, { useState, useMemo } from 'react';
import {
  ATRIUM_REAL_TOTALS,
  ATRIUM_CONSOLIDATED_ACCOUNTS,
  ConsolidatedRealAccount,
} from '../../lib/atrium-real-data';
import { formatBRL } from '../../lib/utils';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Layers,
  Building2,
  PieChart,
  HardHat,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from 'lucide-react';

export const RealIncurredCompositionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'obra' | 'extra_obra'>('resumo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'todos' | 'obra' | 'extra'>('todos');

  // Segregated list of consolidated accounts
  const obraAccounts = useMemo(
    () => ATRIUM_CONSOLIDATED_ACCOUNTS.filter((a) => a.isObra),
    []
  );
  const extraObraAccounts = useMemo(
    () => ATRIUM_CONSOLIDATED_ACCOUNTS.filter((a) => !a.isObra),
    []
  );

  const filteredAccounts = useMemo(() => {
    return ATRIUM_CONSOLIDATED_ACCOUNTS.filter((acc) => {
      if (selectedFilter === 'obra' && !acc.isObra) return false;
      if (selectedFilter === 'extra' && acc.isObra) return false;
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();
      const matchAccount = acc.adjustedAccount.toLowerCase().includes(term);
      const matchStage = acc.budgetStage?.toLowerCase().includes(term);
      const matchOrig = acc.originalAccounts.some((o) => o.toLowerCase().includes(term));
      return matchAccount || matchStage || matchOrig;
    });
  }, [selectedFilter, searchTerm]);

  const handleDownloadExcel = () => {
    // Direct link to the generated Excel file in public/downloads
    const link = document.createElement('a');
    link.href = '/downloads/ATRIUM - Composicao Realizado Incorrido (Obra x Extra Obra).xlsx';
    link.download = 'ATRIUM - Composicao Realizado Incorrido (Obra x Extra Obra).xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner com Botão de Download da Planilha Gerada */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-sky-900/10 via-slate-900/40 to-blue-900/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171] text-white">
                Composição do Realizado Incorrido
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                Arquivo: <code>T:\ANÁLISES (TIAGO E TANIA)\Orçamentos\Atrium\...</code>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Segregação de Custos Incorridos: Obra vs. Extra Obra
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
              Identificação completa das contas com <strong>etapa do orçamento vinculada</strong> (custo direto
              e indireto de canteiro) versus contas <strong>sem etapa do orçamento</strong> (aquisição de
              terreno, receitas de vendas, comissões de corretores, despesas advocatícias e administrativas).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={handleDownloadExcel}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Planilha Excel Gerada (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Comparativos: Obra vs Extra Obra */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Geral */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Total Geral Realizado Incorrido (ERP)
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatBRL(ATRIUM_REAL_TOTALS.totalGeral)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>5.635 lançamentos contábeis</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">100% da base</span>
          </div>
        </div>

        {/* Card 2: Realizado da Obra */}
        <div className="glass-card p-5 rounded-2xl border border-sky-300/40 dark:border-sky-800/60 bg-sky-50/30 dark:bg-sky-950/20">
          <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block flex items-center space-x-1.5">
            <HardHat className="w-3.5 h-3.5" />
            <span>1. Realizado Incorrido da Obra (Etapas Vinculadas)</span>
          </span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {formatBRL(ATRIUM_REAL_TOTALS.totalObra)}
          </div>
          <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 mt-2 pt-2 border-t border-sky-200 dark:border-sky-800/40">
            <span>{ATRIUM_REAL_TOTALS.countObra.toLocaleString('pt-BR')} registros vinculados</span>
            <span className="font-bold">
              {((ATRIUM_REAL_TOTALS.totalObra / ATRIUM_REAL_TOTALS.totalGeral) * 100).toFixed(1)}% do ERP
            </span>
          </div>
        </div>

        {/* Card 3: Realizado Extra Obra */}
        <div className="glass-card p-5 rounded-2xl border border-purple-300/40 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/20">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-semibold block flex items-center space-x-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>2. Realizado Incorrido Extra Obra (Demais Custos/Desp.)</span>
          </span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {formatBRL(ATRIUM_REAL_TOTALS.totalExtraObra)}
          </div>
          <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 mt-2 pt-2 border-t border-purple-200 dark:border-purple-800/40">
            <span>{ATRIUM_REAL_TOTALS.countExtraObra.toLocaleString('pt-BR')} registros corporativos</span>
            <span className="font-bold">
              {((ATRIUM_REAL_TOTALS.totalExtraObra / ATRIUM_REAL_TOTALS.totalGeral) * 100).toFixed(1)}% do ERP
            </span>
          </div>
        </div>
      </div>

      {/* Navegação entre Visualizações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveTab('resumo');
              setSelectedFilter('todos');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              activeTab === 'resumo' && selectedFilter === 'todos'
                ? 'bg-[#004171] text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Todas as Contas ({ATRIUM_CONSOLIDATED_ACCOUNTS.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('obra');
              setSelectedFilter('obra');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1 ${
              selectedFilter === 'obra'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Contas da Obra ({obraAccounts.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('extra_obra');
              setSelectedFilter('extra');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1 ${
              selectedFilter === 'extra'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Contas Extra Obra ({extraObraAccounts.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar conta, etapa ou de-para..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tabela de Contas e Etapas */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3 min-w-[220px]">Conta De-Para (Ajustada)</th>
              <th className="p-3 min-w-[220px]">Etapa do Orçamento Vinculada</th>
              <th className="p-3 text-center w-36">Classificação</th>
              <th className="p-3 text-center w-24">Lançamentos</th>
              <th className="p-3 text-right w-36">Valor Incorrido (R$)</th>
              <th className="p-3 text-right w-24">% do Grupo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
            {filteredAccounts.map((acc, index) => {
              const baseGroupTotal = acc.isObra
                ? ATRIUM_REAL_TOTALS.totalObra
                : ATRIUM_REAL_TOTALS.totalExtraObra;
              const pctOfGroup = baseGroupTotal > 0 ? (acc.totalAmount / baseGroupTotal) * 100 : 0;

              return (
                <tr
                  key={acc.adjustedAccount}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-3 text-center font-mono text-slate-400 text-[10px]">
                    {index + 1}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{acc.adjustedAccount}</div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Mapeia {acc.originalAccounts.length} conta(s) do ERP
                    </span>
                  </td>
                  <td className="p-3">
                    {acc.budgetStage ? (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#004171] dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 font-bold text-[10px]">
                        <Layers className="w-3 h-3" />
                        <span>{acc.budgetStage}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">
                        Sem etapa vinculada (Demais custos / despesas)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {acc.isObra ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800/50">
                        Custo da Obra
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/50">
                        Extra Obra
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                    {acc.count.toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                    {formatBRL(acc.totalAmount)}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">
                    {pctOfGroup.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-900/90 font-bold border-t border-slate-300 dark:border-slate-700">
            <tr>
              <td colSpan={4} className="p-3 text-right uppercase text-[11px] text-slate-700 dark:text-slate-300">
                Total das Contas Filtradas:
              </td>
              <td className="p-3 text-center font-mono">
                {filteredAccounts.reduce((acc, a) => acc + a.count, 0).toLocaleString('pt-BR')}
              </td>
              <td className="p-3 text-right font-mono text-sm text-slate-900 dark:text-white">
                {formatBRL(filteredAccounts.reduce((acc, a) => acc + a.totalAmount, 0))}
              </td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

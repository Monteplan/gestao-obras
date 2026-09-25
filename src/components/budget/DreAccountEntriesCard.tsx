import React, { useState, useMemo, useEffect } from 'react';
import { DreItem } from '../../lib/atrium-dre-data';
import { getEntriesForDreItem, RealEntry } from '../../lib/atrium-real-entries';
import { formatBRL, formatPercent } from '../../lib/utils';
import {
  X,
  Search,
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  Building2,
  DollarSign,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface DreAccountEntriesCardProps {
  line: DreItem;
  onClose: () => void;
}

type SortField = 'date_desc' | 'date_asc' | 'val_desc' | 'val_asc' | 'supplier_asc';

export const DreAccountEntriesCard: React.FC<DreAccountEntriesCardProps> = ({ line, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortField>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fechar com ESC e bloquear scroll do fundo enquanto o pop-up estiver aberto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  // Obtém todos os lançamentos da linha (diretos ou agregados caso seja grupo)
  const allEntries = useMemo(() => {
    return getEntriesForDreItem(line);
  }, [line]);

  // Totalizadores gerais da conta
  const totalEntriesCount = allEntries.length;
  const totalEntriesSum = useMemo(() => {
    return allEntries.reduce((acc, curr) => acc + curr.val, 0);
  }, [allEntries]);

  // Filtragem
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return allEntries;
    const q = searchTerm.toLowerCase();
    return allEntries.filter(
      (e) =>
        e.doc.toLowerCase().includes(q) ||
        e.supplier.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q) ||
        e.originalAccount.toLowerCase().includes(q) ||
        e.date.includes(q)
    );
  }, [allEntries, searchTerm]);

  // Ordenação
  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    switch (sortOption) {
      case 'date_desc':
        return list.sort((a, b) => {
          // formato DD/MM/AAAA
          const parseD = (s: string) => {
            const [d, m, y] = s.split('/').map(Number);
            return new Date(y || 2000, (m || 1) - 1, d || 1).getTime();
          };
          return parseD(b.date) - parseD(a.date);
        });
      case 'date_asc':
        return list.sort((a, b) => {
          const parseD = (s: string) => {
            const [d, m, y] = s.split('/').map(Number);
            return new Date(y || 2000, (m || 1) - 1, d || 1).getTime();
          };
          return parseD(a.date) - parseD(b.date);
        });
      case 'val_desc':
        return list.sort((a, b) => b.val - a.val);
      case 'val_asc':
        return list.sort((a, b) => a.val - b.val);
      case 'supplier_asc':
        return list.sort((a, b) => a.supplier.localeCompare(b.supplier));
      default:
        return list;
    }
  }, [filteredEntries, sortOption]);

  // Total filtrado
  const filteredSum = useMemo(() => {
    return sortedEntries.reduce((acc, curr) => acc + curr.val, 0);
  }, [sortedEntries]);

  // Paginação
  const totalPages = Math.ceil(sortedEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Data', 'Documento', 'Fornecedor_Favorecido', 'Descricao_Historico', 'Conta_Origem_ERP', 'Conta_DRE', 'Valor_RS'];
    const rows = sortedEntries.map((e) => [
      e.id,
      e.date,
      `"${e.doc.replace(/"/g, '""')}"`,
      `"${e.supplier.replace(/"/g, '""')}"`,
      `"${e.desc.replace(/"/g, '""')}"`,
      `"${e.originalAccount.replace(/"/g, '""')}"`,
      `"${e.account.replace(/"/g, '""')}"`,
      e.val.toFixed(2).replace('.', ','),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lancamentos_${line.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFavorable = line.name.includes('RECEITA') ? line.variacao >= 0 : line.variacao <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="dre-account-entries-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-blue-500/50 bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho do Card Pop-up */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/80 border-b border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/40">
                <Receipt className="w-3 h-3" />
                <span>Detalhamento de Lançamentos Contábeis</span>
              </span>
            {line.isGroup && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Grupo Consolidado (Nível {line.level})
              </span>
            )}
            {line.subgroup && (
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <span>{line.category.toUpperCase()}</span>
                <span>›</span>
                <span className="text-slate-300 font-semibold">{line.subgroup}</span>
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <span>{line.name}</span>
          </h3>

          <p className="text-xs text-slate-300">
            Origem: <strong>Razão ERP (Aba REAL do PCO)</strong> • Exibindo cada lançamento individual que compõe o saldo realizado.
          </p>
        </div>

        {/* Botão Fechar e Ações */}
        <div className="flex items-center space-x-2 self-start md:self-center">
          <button
            onClick={handleExportCSV}
            title="Exportar lançamentos para planilha Excel / CSV"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={onClose}
            title="Fechar detalhamento"
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 hover:border-red-500/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Métricas e Resumo da Linha Selecionada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
        {/* Total de Lançamentos */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Total Lançamentos
          </div>
          <div className="text-lg font-black text-white mt-0.5">
            {totalEntriesCount}{' '}
            <span className="text-[10px] font-normal text-slate-400">registros</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {searchTerm ? `${filteredEntries.length} filtrados` : 'Todos registros'}
          </div>
        </div>

        {/* Realizado ERP (Soma dos Lançamentos) */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
            Realizado na DRE (ERP)
          </div>
          <div className="text-lg font-black text-blue-400 mt-0.5 font-mono">
            {formatBRL(line.realizado)}
          </div>
          <div className="text-[10px] text-blue-300/80 mt-0.5">
            Soma lançamentos: <strong>{formatBRL(totalEntriesSum)}</strong>
          </div>
        </div>

        {/* Orçado na DRE */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Orçado Aprovado
          </div>
          <div className="text-lg font-black text-slate-200 mt-0.5 font-mono">
            {formatBRL(line.orcado)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            % Realizado: <strong className="text-slate-200">{formatPercent(line.percentRealizado, 2)}</strong>
          </div>
        </div>

        {/* Variação */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Variação (Orç x Real)
          </div>
          <div
            className={`text-lg font-black mt-0.5 font-mono ${
              isFavorable ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {line.variacao > 0 ? `+${formatBRL(line.variacao)}` : formatBRL(line.variacao)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFavorable ? 'Variação favorável' : 'Atenção ao saldo'}
          </div>
        </div>

        {/* Ticket Médio por Lançamento */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Valor Médio / Lançamento
          </div>
          <div className="text-lg font-black text-amber-300 mt-0.5 font-mono">
            {formatBRL(totalEntriesCount > 0 ? totalEntriesSum / totalEntriesCount : 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalEntriesCount > 0 ? 'Média por documento' : 'Sem histórico'}
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca nos Lançamentos */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por fornecedor, documento ou histórico..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortField)}
              className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="date_desc">Data (Mais recentes primeiro)</option>
              <option value="date_asc">Data (Mais antigas primeiro)</option>
              <option value="val_desc">Maior Valor (Decrescente)</option>
              <option value="val_asc">Menor Valor (Crescente)</option>
              <option value="supplier_asc">Fornecedor (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Badge do Filtro Ativo */}
        <div className="flex items-center space-x-3 text-slate-400">
          <span>
            Exibindo <strong className="text-white">{sortedEntries.length}</strong> de{' '}
            <strong className="text-slate-300">{totalEntriesCount}</strong>
          </span>
          {searchTerm && (
            <span className="text-blue-400 font-semibold font-mono">
              (Soma: {formatBRL(filteredSum)})
            </span>
          )}
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        {sortedEntries.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">
              {totalEntriesCount === 0
                ? 'Nenhum lançamento contábil realizado encontrado para esta conta'
                : 'Nenhum lançamento corresponde ao filtro de busca informado'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {totalEntriesCount === 0
                ? 'Esta conta possui apenas previsão orçamentária ou ainda não teve notas fiscais/pagamentos registrados na aba REAL do PCO.'
                : 'Tente limpar o campo de busca para visualizar todos os registros desta conta.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 sticky top-0 z-10 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3 w-28">Data</th>
                <th className="p-3 w-28">Documento</th>
                <th className="p-3 min-w-[200px]">Fornecedor / Favorecido / Cliente</th>
                <th className="p-3 min-w-[260px]">Descrição / Histórico</th>
                <th className="p-3 min-w-[160px]">Conta Origem ERP</th>
                <th className="p-3 text-right w-36">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {paginatedEntries.map((entry, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-800/60 transition-colors group"
                  >
                    <td className="p-2.5 text-center text-slate-500 font-mono text-[11px]">
                      {globalIndex}
                    </td>
                    <td className="p-2.5 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      {entry.date}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-blue-300 font-mono text-[11px]">
                        {entry.doc || 'S/N'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {entry.supplier || '-'}
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-300 text-[11px]">
                      <div className="line-clamp-2" title={entry.desc}>
                        {entry.desc || '-'}
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      <span className="truncate block max-w-[220px]" title={entry.originalAccount}>
                        {entry.originalAccount}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatBRL(entry.val)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé do Card com Paginação */}
      {sortedEntries.length > 0 && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span>Itens por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-200 text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-500">|</span>
            <span>
              Exibindo {(currentPage - 1) * pageSize + 1} a{' '}
              {Math.min(currentPage * pageSize, sortedEntries.length)} de {sortedEntries.length}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-xs font-semibold text-slate-300">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="ml-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {sortedEntries.length === 0 && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

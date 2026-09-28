import React, { useState, useMemo } from 'react';
import {
  ATRIUM_COMMERCIAL_UNITS,
  calculateCommercialSummary,
  CommercialUnit,
  CommercialUnitStatus,
} from '../../lib/atrium-commercial-data';
import { formatBRL, formatPercent } from '../../lib/utils';
import {
  Building2,
  Home,
  CheckCircle2,
  DollarSign,
  Ruler,
  Lock,
  Search,
  Filter,
  Download,
  Eye,
  Layers,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export const CommercialPage: React.FC = () => {

  // Estado das unidades (carregado com dados padrão e permitindo edição se desejado)
  const [units, setUnits] = useState<CommercialUnit[]>(() => {
    try {
      const saved = localStorage.getItem('atrium_custom_commercial_units');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ATRIUM_COMMERCIAL_UNITS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | CommercialUnitStatus>('todos');
  const [typologyFilter, setTypologyFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'tower'>('table');
  const [selectedUnit, setSelectedUnit] = useState<CommercialUnit | null>(null);

  // Cálculos consolidados
  const summary = useMemo(() => calculateCommercialSummary(units), [units]);

  // Filtragem da lista
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (statusFilter !== 'todos' && u.status !== statusFilter) return false;
      if (typologyFilter !== 'todos' && !u.typology.includes(typologyFilter)) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        u.unitNumber.toLowerCase().includes(q) ||
        (u.buyerName && u.buyerName.toLowerCase().includes(q)) ||
        (u.contractNumber && u.contractNumber.toLowerCase().includes(q)) ||
        (u.blockedReason && u.blockedReason.toLowerCase().includes(q)) ||
        u.typology.toLowerCase().includes(q)
      );
    });
  }, [units, statusFilter, typologyFilter, searchTerm]);

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = [
      'Unidade',
      'Andar',
      'Tipologia',
      'Area Privativa (m2)',
      'Preco / m2',
      'Valor Total (R$)',
      'Status',
      'Comprador',
      'Contrato',
      'Data Contrato',
      'Valor Recebido (R$)',
      'Valor a Receber (R$)',
      'Motivo Bloqueio',
    ];

    const rows = filteredUnits.map((u) => [
      u.unitNumber,
      u.floor,
      `"${u.typology}"`,
      u.privateAreaM2.toFixed(2),
      u.priceM2.toFixed(2),
      u.unitValue.toFixed(2),
      u.status.toUpperCase(),
      `"${u.buyerName || '-'}"`,
      `"${u.contractNumber || '-'}"`,
      `"${u.contractDate || '-'}"`,
      u.paidValue.toFixed(2),
      u.receivableValue.toFixed(2),
      `"${u.blockedReason || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `relatorio_comercial_atrium_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header do Módulo Comercial */}
      <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900/20 via-sky-900/10 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Módulo Comercial & Vendas • Edifício Atrium Select</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestão Comercial, Vendas Incorridas & Carteira de Recebíveis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Acompanhamento em tempo real das <strong>80 unidades</strong> do empreendimento: vendas incorridas,
            fluxo de valores recebidos versus a receber, estoque disponível e unidades bloqueadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Exportar CSV ({filteredUnits.length})</span>
          </button>
        </div>
      </div>

      {/* 4 CARDS PRINCIPAIS EXIGIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: VGV Real (Vendido até o momento + Unidades em Estoque) */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-4 h-4 text-blue-500" />
              <span>1. VGV Real (Total)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              Vendido + Estoque
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatBRL(summary.vgvReal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Fórmula: <strong className="text-slate-700 dark:text-slate-300">Vendido + Estoque</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Vendido até o Momento (64 un.):</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono">{formatBRL(summary.vgvVendido)}</strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Unidades em Estoque (16 un.):</span>
              <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatBRL(summary.vgvEstoqueTotal)}</strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span>VGV Orçado na Viabilidade:</span>
              <span className="font-mono">{formatBRL(summary.vgvOrcado)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Vendas Incorridas Real */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>2. Vendas Incorridas Real</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              {formatPercent(summary.salesPercent, 0)} Vendido
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatBRL(summary.vgvVendido)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <strong>{summary.soldUnits}</strong> de <strong>{summary.totalUnits}</strong> unidades comercializadas
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, summary.salesPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-500">Metragem Privativa Vendida:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {summary.soldPrivateAreaM2.toLocaleString('pt-BR')} m²
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Ticket Médio por Unidade:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBRL(summary.vgvVendido / (summary.soldUnits || 1))}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Preço Médio do m² (Valor Vendido ÷ Metragem Vendida) */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-indigo-500" />
              <span>3. Preço Médio do m²</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
              Vendido ÷ Metragem
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatBRL(summary.averagePriceM2Vendido)} <span className="text-xs font-normal text-slate-400">/m² priv.</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Fórmula: <strong className="text-slate-700 dark:text-slate-300">Valor Vendido ÷ Metragem Vendida</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Cálculo Efetivo:</span>
              <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                R$ 44,16M ÷ {summary.soldPrivateAreaM2.toLocaleString('pt-BR')} m²
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Tabela de Viabilidade:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatBRL(11406.20)} /m²</strong>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span>Área Privativa Total:</span>
              <span className="font-mono">{summary.totalPrivateAreaM2.toLocaleString('pt-BR')} m²</span>
            </div>
          </div>
        </div>

        {/* Card 4: Fluxo de Valores Recebidos e a Receber */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>4. Fluxo de Vendas</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              Recebido vs A Receber
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatBRL(summary.totalReceived)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Recebido até o Momento <strong className="text-emerald-600 dark:text-emerald-400">(DRE Oficial)</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Valores a Receber (Saldo):</span>
              <strong className="text-amber-600 dark:text-amber-400 font-mono">
                {formatBRL(summary.totalReceivable)}
              </strong>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(summary.totalReceived / summary.vgvVendido) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>% Recebido das Vendas:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatPercent((summary.totalReceived / summary.vgvVendido) * 100, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARDS RESUMO DO ESTOQUE (DISPONÍVEIS & BLOQUEADAS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unidades Vendidas */}
        <div className="glass-card p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Unidades Vendidas (80%)</span>
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {summary.soldUnits} <span className="text-xs font-normal text-slate-500">unidades</span>
            </div>
            <div className="text-xs text-slate-500">
              VGV Vendido: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatBRL(summary.vgvVendido)}</strong>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Área Vendida</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
              {summary.soldPrivateAreaM2.toLocaleString('pt-BR')} m²
            </span>
          </div>
        </div>

        {/* Unidades Disponíveis para Venda */}
        <div className="glass-card p-4 rounded-2xl border border-sky-200 dark:border-sky-800/50 bg-sky-50/30 dark:bg-sky-950/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>Unidades Disponíveis para Venda</span>
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {summary.availableUnits} <span className="text-xs font-normal text-slate-500">unidades em estoque</span>
            </div>
            <div className="text-xs text-slate-500">
              Valor Disponível: <strong className="text-sky-600 dark:text-sky-400 font-mono">{formatBRL(summary.vgvEstoqueDisponivel)}</strong>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Área Disponível</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
              {summary.availablePrivateAreaM2.toLocaleString('pt-BR')} m²
            </span>
          </div>
        </div>

        {/* Unidades Bloqueadas para Venda */}
        <div className="glass-card p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Unidades Bloqueadas para Venda</span>
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {summary.blockedUnits} <span className="text-xs font-normal text-slate-500">unidades estratégicas</span>
            </div>
            <div className="text-xs text-slate-500">
              Valor Bloqueado: <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatBRL(summary.vgvEstoqueBloqueado)}</strong>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Permutas & Reservas</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
              {summary.blockedPrivateAreaM2.toLocaleString('pt-BR')} m²
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS & NAVEGAÇÃO DA TABELA / ESPELHO DE VENDAS */}
      <div className="glass-card rounded-3xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Alternância de Modo de Visualização */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tabela Nominal (80 Unidades)</span>
            </button>
            <button
              onClick={() => setViewMode('tower')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'tower'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Espelho de Vendas da Torre</span>
            </button>
          </div>

          {/* Filtros por Status */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'todos'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Todas ({units.length})
            </button>
            <button
              onClick={() => setStatusFilter('vendida')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'vendida'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              Vendidas ({summary.soldUnits})
            </button>
            <button
              onClick={() => setStatusFilter('disponivel')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'disponivel'
                  ? 'bg-sky-600 text-white'
                  : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              }`}
            >
              Disponíveis ({summary.availableUnits})
            </button>
            <button
              onClick={() => setStatusFilter('bloqueada')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'bloqueada'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Bloqueadas ({summary.blockedUnits})
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa e Filtro de Tipologia */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por unidade, comprador, contrato ou motivo de bloqueio..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Tipologia:</span>
            <select
              value={typologyFilter}
              onChange={(e) => setTypologyFilter(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="todos">Todas as Tipologias</option>
              <option value="Tipo 01">Tipo 01 (3 Quartos - 72m²)</option>
              <option value="Tipo 02">Tipo 02 (2 Quartos - 49m²)</option>
            </select>
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO 1: TABELA NOMINAL COMPLETA DAS 80 UNIDADES */}
      {viewMode === 'table' && (
        <div className="glass-card rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-16 text-center">Unid.</th>
                  <th className="p-3 w-16 text-center">Andar</th>
                  <th className="p-3 min-w-[180px]">Tipologia</th>
                  <th className="p-3 text-right">Área Priv.</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 min-w-[200px]">Comprador / Contrato / Destinação</th>
                  <th className="p-3 text-right">Valor Venda (R$)</th>
                  <th className="p-3 text-right">Preço / m²</th>
                  <th className="p-3 text-right">Recebido (R$)</th>
                  <th className="p-3 text-right">A Receber (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {filteredUnits.map((u) => {
                  const isSold = u.status === 'vendida';
                  const isAvailable = u.status === 'disponivel';
                  const isBlocked = u.status === 'bloqueada';

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUnit(u)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-center font-bold font-mono text-slate-900 dark:text-white">
                        {u.unitNumber}
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">
                        {u.floor}º
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {u.typology}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {u.bedrooms} quartos • {u.privateAreaM2} m²
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {u.privateAreaM2.toFixed(2)} m²
                      </td>
                      <td className="p-3 text-center">
                        {isSold && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            ● Vendida
                          </span>
                        )}
                        {isAvailable && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            ● Disponível
                          </span>
                        )}
                        {isBlocked && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            ● Bloqueada
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isSold && (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {u.buyerName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {u.contractNumber} • {u.contractDate}
                            </span>
                          </div>
                        )}
                        {isAvailable && (
                          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                            Disponível para comercialização
                          </span>
                        )}
                        {isBlocked && (
                          <div className="text-amber-700 dark:text-amber-300 text-xs">
                            <span className="font-semibold block">{u.blockedReason}</span>
                            <span className="text-[10px] text-slate-400">Sem autorização de venda</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatBRL(u.unitValue)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500 text-xs">
                        {formatBRL(u.priceM2)}/m²
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {isSold ? formatBRL(u.paidValue) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {isSold ? formatBRL(u.receivableValue) : formatBRL(u.unitValue)}
                      </td>
                    </tr>
                  );
                })}

                {filteredUnits.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                      Nenhuma unidade encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé com Totais da Seleção */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-mono">
              Mostrando <strong>{filteredUnits.length}</strong> de <strong>{units.length}</strong> unidades totais
            </span>
            <div className="flex items-center space-x-4 font-mono">
              <div>
                <span className="text-slate-400 mr-1.5">Soma VGV:</span>
                <strong className="text-slate-900 dark:text-white">
                  {formatBRL(filteredUnits.reduce((acc, u) => acc + u.unitValue, 0))}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">Recebido:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatBRL(filteredUnits.reduce((acc, u) => acc + u.paidValue, 0))}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 mr-1.5">A Receber:</span>
                <strong className="text-amber-600 dark:text-amber-400">
                  {formatBRL(filteredUnits.reduce((acc, u) => acc + u.receivableValue, 0))}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZAÇÃO 2: ESPELHO DE VENDAS DA TORRE (DO 20º AO 1º ANDAR) */}
      {viewMode === 'tower' && (
        <div className="glass-card rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span>Espelho de Vendas da Torre Única (20 Pavimentos)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Representação arquitetônica vertical dos 20 pavimentos tipo com as 4 unidades por andar.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                <span className="text-slate-600 dark:text-slate-400">Vendida (64)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-sky-500 inline-block" />
                <span className="text-slate-600 dark:text-slate-400">Disponível (12)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                <span className="text-slate-600 dark:text-slate-400">Bloqueada (4)</span>
              </span>
            </div>
          </div>

          {/* Grid dos Andares de Cima para Baixo (20º ao 1º) */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-2">
            {Array.from({ length: 20 }, (_, i) => 20 - i).map((floor) => {
              const floorUnits = units.filter((u) => u.floor === floor);

              return (
                <div
                  key={floor}
                  className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                >
                  <div className="w-16 shrink-0 text-center font-bold text-xs font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 pr-2">
                    {floor}º Andar
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                    {floorUnits.map((u) => {
                      const isSold = u.status === 'vendida';
                      const isAvailable = u.status === 'disponivel';
                      const isBlocked = u.status === 'bloqueada';

                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUnit(u)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                            isSold
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                              : isAvailable
                              ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>Apto {u.unitNumber}</span>
                            <span className="text-[10px] font-normal">{u.privateAreaM2} m²</span>
                          </div>
                          <div className="text-[11px] truncate mt-0.5">
                            {isSold && <span>{u.buyerName}</span>}
                            {isAvailable && <span className="font-semibold">Disponível</span>}
                            {isBlocked && <span className="font-semibold">{u.blockedReason}</span>}
                          </div>
                          <div className="text-[10px] font-mono mt-1 font-bold">
                            {formatBRL(u.unitValue)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA UNIDADE SELECIONADA */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs text-blue-500 font-bold uppercase tracking-wider block">
                  Ficha da Unidade
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Apartamento {selectedUnit.unitNumber} • {selectedUnit.floor}º Andar
                </h3>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tipologia & Área</span>
                <strong className="text-slate-900 dark:text-white text-sm block mt-0.5">
                  {selectedUnit.typology}
                </strong>
                <span className="text-slate-500">{selectedUnit.privateAreaM2} m² privativos</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Valor da Unidade</span>
                <strong className="text-blue-600 dark:text-blue-400 text-sm block mt-0.5 font-mono">
                  {formatBRL(selectedUnit.unitValue)}
                </strong>
                <span className="text-slate-500">{formatBRL(selectedUnit.priceM2)} /m²</span>
              </div>
            </div>

            {/* Status e Comprador */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Status Comercial</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedUnit.status === 'vendida'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedUnit.status === 'disponivel'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  ● {selectedUnit.status.toUpperCase()}
                </span>
              </div>

              {selectedUnit.status === 'vendida' && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cliente Comprador:</span>
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      {selectedUnit.buyerName}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Número do Contrato:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                      {selectedUnit.contractNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Data da Assinatura:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {selectedUnit.contractDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Valores Recebidos até o Momento:</span>
                    <span className="font-mono">{formatBRL(selectedUnit.paidValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold">
                    <span>Saldo a Receber das Vendas:</span>
                    <span className="font-mono">{formatBRL(selectedUnit.receivableValue)}</span>
                  </div>
                </div>
              )}

              {selectedUnit.status === 'bloqueada' && (
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-amber-700 dark:text-amber-300 font-bold block">
                    Motivo do Bloqueio:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">{selectedUnit.blockedReason}</p>
                </div>
              )}

              {selectedUnit.status === 'disponivel' && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400">
                  Unidade livre em estoque na tabela de vendas para contratação imediata.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setSelectedUnit(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

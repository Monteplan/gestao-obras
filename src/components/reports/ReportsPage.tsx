import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { MonteplanLogo } from '../common/MonteplanLogo';
import { formatBRL, formatPercent, formatDateBR, calculateFinancials, buildStageHierarchy, BRAZILIAN_STATES } from '../../lib/utils';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  AlertTriangle,
  MapPin,
  UserCheck,
  Calculator,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ReportsPage: React.FC = () => {
  const {
    works,
    stages,
    budgetItems,
    orders,
    incurredCosts,
    revenues,
    laborEntries,
    importBatches,
  } = useData();

  const [selectedReport, setSelectedReport] = useState<string>('resumo_executivo');
  const [selectedWorkId, setSelectedWorkId] = useState<string>('todas');
  const [selectedState, setSelectedState] = useState<string>('todos');
  const [selectedCity, setSelectedCity] = useState<string>('todas');
  const [selectedEngineer, setSelectedEngineer] = useState<string>('todos');

  // Listas para dropdowns de filtros
  const availableStates = useMemo(() => {
    const statesSet = new Set<string>();
    works.forEach(w => { if (w.state) statesSet.add(w.state); });
    return Array.from(statesSet).sort();
  }, [works]);

  const availableCities = useMemo(() => {
    const citiesSet = new Set<string>();
    works.forEach(w => {
      if (selectedState === 'todos' || w.state === selectedState) {
        if (w.city) citiesSet.add(w.city);
      }
    });
    return Array.from(citiesSet).sort();
  }, [works, selectedState]);

  const availableEngineers = useMemo(() => {
    const engsSet = new Set<string>();
    works.forEach(w => {
      if (w.engineer_name) engsSet.add(w.engineer_name);
    });
    return Array.from(engsSet).sort();
  }, [works]);

  // Obras filtradas
  const filteredWorks = useMemo(() => {
    return works.filter(w => {
      if (selectedWorkId !== 'todas' && w.id !== selectedWorkId) return false;
      if (selectedState !== 'todos' && w.state !== selectedState) return false;
      if (selectedCity !== 'todas' && w.city !== selectedCity) return false;
      if (selectedEngineer !== 'todos' && w.engineer_name !== selectedEngineer) return false;
      return true;
    });
  }, [works, selectedWorkId, selectedState, selectedCity, selectedEngineer]);

  const activeWork = selectedWorkId === 'todas' ? null : works.find((w) => w.id === selectedWorkId);

  // Exportador CSV / XLSX genérico
  const handleExport = (format: 'csv' | 'xlsx') => {
    let exportData: Record<string, any>[] = [];
    let reportTitle = selectedReport;

    if (selectedReport === 'resumo_executivo') {
      exportData = filteredWorks.map((w) => {
        const fin = calculateFinancials(w, budgetItems, orders, incurredCosts, revenues);
        return {
          'Código': w.code,
          'Obra': w.name,
          'Incorporação': 'Própria (Monteplan)',
          'UF': w.state || '-',
          'Cidade': w.city || w.city_state,
          'Engenheiro Responsável': w.engineer_name || '-',
          'Gestor': w.manager_name,
          'Avanço Físico (%)': `${w.progress_percent}%`,
          'Orçado Aprovado (R$)': fin.approvedBudget,
          'Custos Incorridos (R$)': fin.incurredCosts,
          'Comprometido Aberto (R$)': fin.committedOrders,
          'Saldo Disponível (R$)': fin.availableBalance,
          'Receita Faturada (R$)': fin.recognizedRevenue,
          'Resultado Realizado (R$)': fin.calculatedResult,
          'Margem Realizada (%)': `${fin.calculatedMarginPercent}%`,
        };
      });
    } else if (selectedReport === 'fisico_financeiro_etapas') {
      filteredWorks.forEach((w) => {
        const wStages = stages.filter(s => s.work_id === w.id);
        const hier = buildStageHierarchy(wStages);

        hier.forEach((macro) => {
          const mBudget = macro.budget_planned || 0;
          const mIncurred = macro.cost_incurred || 0;
          const mCommitted = macro.cost_committed || 0;
          const mBalance = mBudget - (mIncurred + mCommitted);

          exportData.push({
            'Obra': w.name,
            'Código': macro.code,
            'Nível': 'Macroetapa (N1)',
            'Etapa / Subetapa': macro.name,
            'Responsável': macro.responsible,
            'Peso (%)': `${macro.weight_percent}%`,
            'Avanço Físico (%)': `${macro.progress_percent}%`,
            'Orçado Previsto (R$)': mBudget,
            'Custo Incorrido (R$)': mIncurred,
            'Comprometido (R$)': mCommitted,
            'Saldo Disponível (R$)': mBalance,
            'Status': macro.status,
          });

          if (macro.substages) {
            macro.substages.forEach((sub) => {
              const sBudget = sub.budget_planned || 0;
              const sIncurred = sub.cost_incurred || 0;
              const sCommitted = sub.cost_committed || 0;
              const sBalance = sBudget - (sIncurred + sCommitted);

              exportData.push({
                'Obra': w.name,
                'Código': sub.code,
                'Nível': 'Subetapa (N2)',
                'Etapa / Subetapa': `  ↳ ${sub.name}`,
                'Responsável': sub.responsible,
                'Peso (%)': `${sub.weight_percent}% da macro`,
                'Avanço Físico (%)': `${sub.progress_percent}%`,
                'Orçado Previsto (R$)': sBudget,
                'Custo Incorrido (R$)': sIncurred,
                'Comprometido (R$)': sCommitted,
                'Saldo Disponível (R$)': sBalance,
                'Status': sub.status,
              });
            });
          }
        });
      });
    } else if (selectedReport === 'orcado_vs_realizado') {
      const allowedWorkIds = new Set(filteredWorks.map(w => w.id));
      const targetItems = budgetItems.filter((b) => allowedWorkIds.has(b.work_id));

      exportData = targetItems.map((item) => {
        const w = works.find((work) => work.id === item.work_id);
        return {
          'Obra': w?.name || '-',
          'Código Item': item.item_code || '-',
          'Descrição': item.description,
          'Categoria': item.cost_group,
          'Centro de Custo': item.cost_center,
          'Unidade': item.unit,
          'Qtd Prevista': item.quantity_planned,
          'Custo Unitário (R$)': item.unit_cost_planned,
          'Total Orçado (R$)': item.total_planned,
        };
      });
    } else if (selectedReport === 'etapas_atrasadas') {
      const today = new Date().toISOString().split('T')[0];
      const allowedWorkIds = new Set(filteredWorks.map(w => w.id));
      const delayed = stages.filter((s) => allowedWorkIds.has(s.work_id) && s.planned_end < today && s.progress_percent < 100);
      exportData = delayed.map((s) => {
        const w = works.find((work) => work.id === s.work_id);
        return {
          'Obra': w?.name || '-',
          'Código Etapa': s.code,
          'Nome': s.name,
          'Responsável': s.responsible,
          'Início Previsto': s.planned_start,
          'Término Previsto': s.planned_end,
          'Progresso (%)': `${s.progress_percent}%`,
          'Status': s.status,
        };
      });
    } else if (selectedReport === 'pedidos_abertos') {
      const allowedWorkIds = new Set(filteredWorks.map(w => w.id));
      const open = orders.filter((o) => allowedWorkIds.has(o.work_id) && ['aprovado', 'enviado', 'parcialmente_recebido', 'atrasado'].includes(o.status));
      exportData = open.map((o) => {
        const w = works.find((work) => work.id === o.work_id);
        return {
          'Obra': w?.name || '-',
          'Número Pedido': o.internal_number,
          'Fornecedor': o.supplier_name,
          'Data Emissão': o.order_date,
          'Previsão Entrega': o.delivery_forecast,
          'Valor Total (R$)': o.total_amount,
          'Status': o.status,
        };
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');

    if (format === 'csv') {
      XLSX.writeFile(wb, `relatorio_${reportTitle}_${Date.now()}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `relatorio_${reportTitle}_${Date.now()}.xlsx`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const reportsList = [
    { id: 'resumo_executivo', label: '1. Resumo Executivo Consolidado por Obra' },
    { id: 'fisico_financeiro_etapas', label: '2. Orçamento Físico-Financeiro por Etapas (2 Níveis)' },
    { id: 'orcado_vs_realizado', label: '3. Orçamento versus Realizado Detalhado' },
    { id: 'etapas_atrasadas', label: '4. Etapas em Atraso Crítico' },
    { id: 'pedidos_abertos', label: '5. Pedidos de Compra em Aberto / Comprometido' },
  ];

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* Header com Ações de Exportação */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Central de Relatórios Executivos</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gere resumos executivos, conciliações orçamentárias e exporte em CSV, XLSX ou visualize para impressão.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>Exportar Excel (XLSX)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros dos Relatórios */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3 text-xs print:hidden">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Relatório:</span>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-bold"
          >
            {reportsList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Obra:</span>
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-semibold"
          >
            <option value="todas">Todas as Obras ({filteredWorks.length})</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">UF:</span>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedCity('todas');
            }}
            className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-white font-semibold"
          >
            <option value="todos">Todos os Estados</option>
            {availableStates.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Cidade:</span>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-white font-semibold"
          >
            <option value="todas">Todas as Cidades</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Engenheiro:</span>
          <select
            value={selectedEngineer}
            onChange={(e) => setSelectedEngineer(e.target.value)}
            className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-white font-semibold"
          >
            <option value="todos">Todos os Engenheiros</option>
            {availableEngineers.map((eng) => (
              <option key={eng} value={eng}>
                {eng}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO / VISUALIZAÇÃO DO RELATÓRIO SELECIONADO */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-6 print:border-none print:bg-white print:text-black print:p-0">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MonteplanLogo variant="full" size="md" />
            <div className="pl-3 border-l border-slate-700">
              <span className="text-xs text-slate-400 print:text-slate-600 block">
                Relatório Executivo: <strong className="text-white print:text-black">{reportsList.find((r) => r.id === selectedReport)?.label}</strong>
              </span>
              <span className="text-[10px] text-[#38bdf8] font-medium">Controle Físico e Financeiro Integrado</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 print:text-slate-600">
            <div>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</div>
            <div className="font-semibold text-[#004171] print:text-black">Monteplan Engenharia S/A</div>
          </div>
        </div>

        {/* RELATÓRIO 1: RESUMO EXECUTIVO */}
        {selectedReport === 'resumo_executivo' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800 print:bg-slate-100 print:text-black uppercase text-[10px]">
                <tr>
                  <th className="p-3">Obra / Código</th>
                  <th className="p-3">UF / Cidade</th>
                  <th className="p-3">Engenheiro / Gestor</th>
                  <th className="p-3 text-center">Avanço Físico</th>
                  <th className="p-3 text-right">Orçamento Aprovado</th>
                  <th className="p-3 text-right">Custo Incorrido</th>
                  <th className="p-3 text-right">Comprometido</th>
                  <th className="p-3 text-right">Saldo Disponível</th>
                  <th className="p-3 text-right">Faturamento</th>
                  <th className="p-3 text-right">Resultado</th>
                  <th className="p-3 text-center">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                {filteredWorks.map((w) => {
                  const fin = calculateFinancials(w, budgetItems, orders, incurredCosts, revenues);
                  return (
                    <tr key={w.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-white print:text-black">
                        <div>{w.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{w.code} • Incorporação Própria</span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-800/50 mr-1.5">
                          {w.state || 'UF'}
                        </span>
                        <span className="text-slate-300">{w.city || w.city_state}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-200 font-medium">{w.engineer_name || '-'}</div>
                        <div className="text-[10px] text-slate-500">Gestor: {w.manager_name}</div>
                      </td>
                      <td className="p-3 text-center font-bold">{formatPercent(w.progress_percent)}</td>
                      <td className="p-3 text-right font-medium">{formatBRL(fin.approvedBudget)}</td>
                      <td className="p-3 text-right font-bold text-cyan-400 print:text-black">{formatBRL(fin.incurredCosts)}</td>
                      <td className="p-3 text-right text-amber-400 print:text-black">{formatBRL(fin.committedOrders)}</td>
                      <td className="p-3 text-right font-bold text-emerald-400 print:text-black">{formatBRL(fin.availableBalance)}</td>
                      <td className="p-3 text-right">{formatBRL(fin.recognizedRevenue)}</td>
                      <td className="p-3 text-right font-bold text-emerald-400 print:text-black">{formatBRL(fin.calculatedResult)}</td>
                      <td className="p-3 text-center font-bold text-indigo-400 print:text-black">{formatPercent(fin.calculatedMarginPercent)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO 2: ORÇAMENTO FÍSICO-FINANCEIRO POR ETAPAS (2 NÍVEIS) */}
        {selectedReport === 'fisico_financeiro_etapas' && (
          <div className="space-y-8">
            {filteredWorks.map((w) => {
              const wStages = stages.filter(s => s.work_id === w.id);
              const hier = buildStageHierarchy(wStages);

              return (
                <div key={w.id} className="rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 font-mono font-bold text-xs">
                        {w.code}
                      </span>
                      <strong className="text-white text-sm">{w.name}</strong>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-slate-300">{w.city || w.city_state} - {w.state}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-sky-400">{w.engineer_name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      Avanço Físico Global: {formatPercent(w.progress_percent)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300 print:text-black">
                      <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Etapa / Subetapa</th>
                          <th className="p-2.5">Nível</th>
                          <th className="p-2.5">Responsável</th>
                          <th className="p-2.5 text-center">Peso</th>
                          <th className="p-2.5 text-center">Avanço Físico</th>
                          <th className="p-2.5 text-right">Orçado Previsto</th>
                          <th className="p-2.5 text-right">Custo Incorrido</th>
                          <th className="p-2.5 text-right">Comprometido</th>
                          <th className="p-2.5 text-right">Saldo Disponível</th>
                          <th className="p-2.5 text-center">% Consumo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {hier.map((macro) => {
                          const mBudget = macro.budget_planned || 0;
                          const mIncurred = macro.cost_incurred || 0;
                          const mCommitted = macro.cost_committed || 0;
                          const mBalance = mBudget - (mIncurred + mCommitted);
                          const mConsumed = mBudget > 0 ? Math.round(((mIncurred + mCommitted) / mBudget) * 1000) / 10 : 0;

                          return (
                            <React.Fragment key={macro.id}>
                              {/* Macroetapa */}
                              <tr className="bg-slate-900/40 font-semibold text-white">
                                <td className="p-2.5 font-mono text-blue-400">{macro.code}</td>
                                <td className="p-2.5">{macro.name}</td>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800/50">
                                    Macroetapa (N1)
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-300 font-normal">{macro.responsible}</td>
                                <td className="p-2.5 text-center">{macro.weight_percent}%</td>
                                <td className="p-2.5 text-center font-bold text-white">{macro.progress_percent}%</td>
                                <td className="p-2.5 text-right">{formatBRL(mBudget)}</td>
                                <td className="p-2.5 text-right text-cyan-400">{formatBRL(mIncurred)}</td>
                                <td className="p-2.5 text-right text-amber-400">{formatBRL(mCommitted)}</td>
                                <td className={`p-2.5 text-right font-bold ${mBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {formatBRL(mBalance)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className={`text-[10px] font-bold ${mConsumed > 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {mConsumed}%
                                  </span>
                                </td>
                              </tr>

                              {/* Subetapas */}
                              {macro.substages && macro.substages.map((sub) => {
                                const sBudget = sub.budget_planned || 0;
                                const sIncurred = sub.cost_incurred || 0;
                                const sCommitted = sub.cost_committed || 0;
                                const sBalance = sBudget - (sIncurred + sCommitted);
                                const sConsumed = sBudget > 0 ? Math.round(((sIncurred + sCommitted) / sBudget) * 1000) / 10 : 0;

                                return (
                                  <tr key={sub.id} className="bg-slate-950/40 text-slate-300 text-[11px]">
                                    <td className="p-2.5 font-mono text-sky-400 pl-4">{sub.code}</td>
                                    <td className="p-2.5 pl-6 text-slate-200">↳ {sub.name}</td>
                                    <td className="p-2.5">
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400">
                                        Subetapa (N2)
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-slate-400">{sub.responsible}</td>
                                    <td className="p-2.5 text-center text-slate-400">{sub.weight_percent}%</td>
                                    <td className="p-2.5 text-center text-sky-300 font-medium">{sub.progress_percent}%</td>
                                    <td className="p-2.5 text-right">{formatBRL(sBudget)}</td>
                                    <td className="p-2.5 text-right text-cyan-300">{formatBRL(sIncurred)}</td>
                                    <td className="p-2.5 text-right text-amber-300">{formatBRL(sCommitted)}</td>
                                    <td className={`p-2.5 text-right font-medium ${sBalance < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                      {formatBRL(sBalance)}
                                    </td>
                                    <td className="p-2.5 text-center text-slate-400">{sConsumed}%</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RELATÓRIO 3: ORÇADO VS REALIZADO */}
        {selectedReport === 'orcado_vs_realizado' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Item / Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-center">Unidade</th>
                  <th className="p-3 text-right">Qtd</th>
                  <th className="p-3 text-right">Custo Unitário</th>
                  <th className="p-3 text-right">Total Previsto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {budgetItems
                  .filter((b) => filteredWorks.some((w) => w.id === b.work_id))
                  .map((bi) => {
                    const w = works.find((work) => work.id === bi.work_id);
                    return (
                      <tr key={bi.id}>
                        <td className="p-3 font-semibold text-white print:text-black">{w?.code}</td>
                        <td className="p-3 font-mono text-blue-400">{bi.item_code || '-'}</td>
                        <td className="p-3 font-medium text-white print:text-black">{bi.description}</td>
                        <td className="p-3 uppercase text-[10px] text-slate-400">{bi.cost_group}</td>
                        <td className="p-3 text-center">{bi.unit}</td>
                        <td className="p-3 text-right">{bi.quantity_planned}</td>
                        <td className="p-3 text-right">{formatBRL(bi.unit_cost_planned)}</td>
                        <td className="p-3 text-right font-bold text-white print:text-black">{formatBRL(bi.total_planned)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO 4: ETAPAS ATRASADAS */}
        {selectedReport === 'etapas_atrasadas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Término Previsto</th>
                  <th className="p-3 text-center">Progresso Atual</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stages
                  .filter((s) => filteredWorks.some((w) => w.id === s.work_id) && s.planned_end < new Date().toISOString().split('T')[0] && s.progress_percent < 100)
                  .map((s) => {
                    const w = works.find((work) => work.id === s.work_id);
                    return (
                      <tr key={s.id}>
                        <td className="p-3 font-semibold text-white print:text-black">{w?.name}</td>
                        <td className="p-3 font-mono font-bold text-blue-400">{s.code}</td>
                        <td className="p-3 font-medium text-white print:text-black">{s.name}</td>
                        <td className="p-3">{s.responsible}</td>
                        <td className="p-3 text-red-400 font-bold">{formatDateBR(s.planned_end)}</td>
                        <td className="p-3 text-center font-bold text-amber-400">{s.progress_percent}%</td>
                        <td className="p-3 text-center font-bold text-red-400">Atrasada</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* RELATÓRIO 5: PEDIDOS EM ABERTO */}
        {selectedReport === 'pedidos_abertos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 print:text-black">
              <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Número Pedido</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Data Pedido</th>
                  <th className="p-3">Previsão Entrega</th>
                  <th className="p-3 text-right">Total Comprometido</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders
                  .filter((o) => filteredWorks.some((w) => w.id === o.work_id) && ['aprovado', 'enviado', 'parcialmente_recebido', 'atrasado'].includes(o.status))
                  .map((o) => {
                    const w = works.find((work) => work.id === o.work_id);
                    return (
                      <tr key={o.id}>
                        <td className="p-3 font-semibold text-white print:text-black">{w?.name}</td>
                        <td className="p-3 font-mono font-bold text-cyan-400">{o.internal_number}</td>
                        <td className="p-3 font-medium text-white print:text-black">{o.supplier_name}</td>
                        <td className="p-3 text-slate-400">{formatDateBR(o.order_date)}</td>
                        <td className="p-3 text-slate-400">{formatDateBR(o.delivery_forecast)}</td>
                        <td className="p-3 text-right font-bold text-white print:text-black">{formatBRL(o.total_amount)}</td>
                        <td className="p-3 text-center capitalize">{o.status.replace('_', ' ')}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

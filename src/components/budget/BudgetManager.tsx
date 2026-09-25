import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { BaseOrcamentoTable } from './BaseOrcamentoTable';
import { BudgetRevisionModal, BudgetRevisionData } from './BudgetRevisionModal';
import { ErpImportWithDeParaModal } from './ErpImportWithDeParaModal';
import { WorkResultAnalysis } from './WorkResultAnalysis';
import {
  ATRIUM_DEPARA_RULES,
  DeParaRule,
} from '../../lib/atrium-real-data';
import {
  ATRIUM_BASE_TOTALS,
  ATRIUM_BASE_ORCAMENTO_GROUPS,
} from '../../lib/atrium-base-orcamento';
import { formatBRL, formatDateBR } from '../../lib/utils';
import {
  Calculator,
  Plus,
  History,
  TrendingUp,
  Layers,
  UploadCloud,
  FileSpreadsheet,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface BudgetManagerProps {
  selectedWorkId?: string;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ selectedWorkId }) => {
  const { works } = useData();
  const { canEdit } = useAuth();

  const [currentWorkId, setCurrentWorkId] = useState<string>(
    selectedWorkId || works[0]?.id || ''
  );

  // Abas do Módulo de Orçamento
  const [activeTab, setActiveTab] = useState<
    'base_orcamento' | 'incc_versoes' | 'depara' | 'resultado_dre'
  >('base_orcamento');

  // Modais
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Versões de Orçamento Criadas (com a inicial da BASE ORÇAMENTO)
  const [budgetVersionsList, setBudgetVersionsList] = useState<BudgetRevisionData[]>([
    {
      versionCode: 'REV-00',
      title: 'Orçamento Inicial de Implantação (Aba BASE ORÇAMENTO)',
      notes: 'Implantação base aprovada com 298 subetapas e 23 grupos macro.',
      createdAt: '2024-01-15T10:00:00.000Z',
      author: 'Engenharia de Custos / Tiago Caetano',
      inccPercent: 0,
      inccAppliedOnlyNewVersion: true,
      updateOnlyPendingStages: true,
      totalBudgetOriginal: ATRIUM_BASE_TOTALS.totalBudget,
      totalBudgetRevised: ATRIUM_BASE_TOTALS.totalBudget,
      items: [],
      justifications: {},
    },
  ]);

  const [selectedVersionCode, setSelectedVersionCode] = useState<string>('REV-00');

  // Regras de De-Para (115 oficiais + customizadas)
  const [deParaRules, setDeParaRules] = useState<DeParaRule[]>(ATRIUM_DEPARA_RULES);
  const [deParaSearch, setDeParaSearch] = useState('');
  const [deParaFilter, setDeParaFilter] = useState<'todos' | 'obra' | 'extra'>('todos');

  // Modal para adicionar nova regra de De-Para avulsa
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    originalAccount: '',
    adjustedAccount: '',
    isObra: true,
    budgetStage: ATRIUM_BASE_ORCAMENTO_GROUPS[0]?.name || '',
  });

  const handleSaveNewVersion = (newVer: BudgetRevisionData) => {
    setBudgetVersionsList((prev) => [newVer, ...prev]);
    setSelectedVersionCode(newVer.versionCode);
    alert(
      `Nova versão ${newVer.versionCode} criada com sucesso!\nTotal Orçado: ${formatBRL(
        newVer.totalBudgetRevised
      )}\nReajuste INCC: ${newVer.inccPercent}%`
    );
  };

  const handleAddNewDeParaRule = (rule: DeParaRule) => {
    setDeParaRules((prev) => [rule, ...prev]);
  };

  const handleManualAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleForm.originalAccount || !newRuleForm.adjustedAccount) return;

    const created: DeParaRule = {
      id: `depara-manual-${Date.now()}`,
      originalAccount: newRuleForm.originalAccount.trim(),
      adjustedAccount: newRuleForm.adjustedAccount.trim(),
      isObra: newRuleForm.isObra,
      budgetStage: newRuleForm.isObra ? newRuleForm.budgetStage : undefined,
    };

    handleAddNewDeParaRule(created);
    setShowNewRuleModal(false);
    setNewRuleForm({
      originalAccount: '',
      adjustedAccount: '',
      isObra: true,
      budgetStage: ATRIUM_BASE_ORCAMENTO_GROUPS[0]?.name || '',
    });
  };

  const filteredDePara = deParaRules.filter((r) => {
    if (deParaFilter === 'obra' && !r.isObra) return false;
    if (deParaFilter === 'extra' && r.isObra) return false;
    if (!deParaSearch) return true;
    const term = deParaSearch.toLowerCase();
    return (
      r.originalAccount.toLowerCase().includes(term) ||
      r.adjustedAccount.toLowerCase().includes(term) ||
      (r.budgetStage && r.budgetStage.toLowerCase().includes(term))
    );
  });

  const activeVersionObj =
    budgetVersionsList.find((v) => v.versionCode === selectedVersionCode) ||
    budgetVersionsList[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior de Identificação e Ações */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171] text-white">
              Engenharia & Custos
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Edifício Atrium</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Orçamento da Obra & Gestão de Versões (INCC)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Acompanhamento técnico do orçamento baseado na aba <strong>BASE ORÇAMENTO</strong> (298 subetapas,
            23 etapas), revisões periódicas pelo índice <strong>INCC</strong> e mapeamento de contas <strong>De-Para</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Planilha ERP (.xlsx)</span>
          </button>

          <button
            onClick={() => setShowRevisionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow-md shadow-[#004171]/20 transition-all flex items-center space-x-1.5"
          >
            <TrendingUp className="w-4 h-4 text-sky-300" />
            <span>Criar Nova Versão / INCC</span>
          </button>
        </div>
      </div>

      {/* Navegação entre Abas do Módulo */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('base_orcamento')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'base_orcamento'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>1. Orçamento da Obra (BASE ORÇAMENTO)</span>
        </button>

        <button
          onClick={() => setActiveTab('incc_versoes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'incc_versoes'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>2. Orçamento & INCC (Revisões & Histórico)</span>
        </button>

        <button
          onClick={() => setActiveTab('depara')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'depara'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>3. Gestão dos De-Para ERP ({deParaRules.length} Regras)</span>
        </button>

        <button
          onClick={() => setActiveTab('resultado_dre')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'resultado_dre'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-400" />
          <span>4. Resultado da Obra (DRE)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            Acomp. Fin.
          </span>
        </button>
      </div>

      {/* ABA 1: BASE ORÇAMENTO */}
      {activeTab === 'base_orcamento' && (
        <BaseOrcamentoTable onOpenNewVersion={() => setShowRevisionModal(true)} />
      )}

      {/* ABA 2: ORÇAMENTO & INCC */}
      {activeTab === 'incc_versoes' && (
        <div className="space-y-6">
          {/* Card da Versão Ativa */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-sky-900/10 to-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white">
                    Versão Selecionada: {activeVersionObj.versionCode}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    Criada em: {formatDateBR(activeVersionObj.createdAt)} por {activeVersionObj.author}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeVersionObj.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {activeVersionObj.notes || 'Sem observações adicionais.'}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Valor Total do Orçamento
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatBRL(activeVersionObj.totalBudgetRevised)}
                  </div>
                  {activeVersionObj.inccPercent > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold block">
                      Reajuste INCC aplicado: +{activeVersionObj.inccPercent}%
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowRevisionModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Nova Revisão</span>
                </button>
              </div>
            </div>
          </div>

          {/* Histórico de Versões Criadas */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-[#004171] dark:text-sky-400" />
              <span>Histórico de Versões e Justificativas de Alteração</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-20">Versão</th>
                    <th className="p-3 min-w-[200px]">Título da Revisão</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3 text-center">INCC (%)</th>
                    <th className="p-3 text-right">Valor Aprovado</th>
                    <th className="p-3 text-center">Justificativas</th>
                    <th className="p-3 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                  {budgetVersionsList.map((ver) => {
                    const justCount = Object.keys(ver.justifications || {}).length;

                    return (
                      <tr
                        key={ver.versionCode}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                          ver.versionCode === selectedVersionCode
                            ? 'bg-sky-50/50 dark:bg-sky-950/20 font-medium'
                            : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-[#004171] dark:text-sky-400">
                          {ver.versionCode}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {ver.title}
                        </td>
                        <td className="p-3 font-mono">{formatDateBR(ver.createdAt)}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{ver.author}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          {ver.inccPercent > 0 ? `+${ver.inccPercent}%` : '0%'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatBRL(ver.totalBudgetRevised)}
                        </td>
                        <td className="p-3 text-center">
                          {justCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {justCount} etapa(s) justificada(s)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem exceções</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedVersionCode(ver.versionCode)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] transition-colors"
                          >
                            Visualizar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quadro de Justificativas Guardadas da Versão Selecionada */}
            {Object.keys(activeVersionObj.justifications || {}).length > 0 && (
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs space-y-2">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>
                    Justificativas Registradas para Etapas Concluídas ({activeVersionObj.versionCode})
                  </span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {Object.entries(activeVersionObj.justifications).map(([cod, just]) => (
                    <div
                      key={cod}
                      className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px]"
                    >
                      <strong className="text-amber-800 dark:text-amber-400 font-mono">
                        Etapa/Código {cod}:
                      </strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{just}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: GESTÃO DE DE-PARA */}
      {activeTab === 'depara' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Tabela Permanente de Regras De-Para ({deParaRules.length} Regras Mapeadas)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Parâmetro oficial importado da aba <code>de-para</code> com ajustes para mapeamento contínuo de novas contas do ERP.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNewRuleModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Associação De-Para</span>
              </button>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por conta ERP original ou conta ajustada..."
                value={deParaSearch}
                onChange={(e) => setDeParaSearch(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDeParaFilter('todos')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                  deParaFilter === 'todos'
                    ? 'bg-[#004171] text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                Todas ({deParaRules.length})
              </button>
              <button
                onClick={() => setDeParaFilter('obra')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                  deParaFilter === 'obra'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                Custo de Obra ({deParaRules.filter((r) => r.isObra).length})
              </button>
              <button
                onClick={() => setDeParaFilter('extra')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                  deParaFilter === 'extra'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                Extra Obra ({deParaRules.filter((r) => !r.isObra).length})
              </button>
            </div>
          </div>

          {/* Tabela de De-Para */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1322] shadow-sm max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 min-w-[240px]">Conta ERP Original (NM_CTA_CST)</th>
                  <th className="p-3 min-w-[240px]">Conta De-Para (Ajustada)</th>
                  <th className="p-3 text-center w-36">Natureza</th>
                  <th className="p-3 min-w-[220px]">Etapa do Orçamento Vinculada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                {filteredDePara.map((rule, idx) => (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                      {rule.originalAccount}
                    </td>
                    <td className="p-2.5 text-sky-600 dark:text-sky-400 font-medium">
                      {rule.adjustedAccount}
                    </td>
                    <td className="p-2.5 text-center">
                      {rule.isObra ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                          Custo de Obra
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                          Extra Obra (DRE)
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {rule.budgetStage || (
                        <span className="text-slate-400 italic text-[10px]">Sem etapa vinculada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: RESULTADO DA OBRA (DRE) */}
      {activeTab === 'resultado_dre' && (
        <div className="space-y-4">
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-sky-900 dark:text-sky-300 block">
                Módulo Integrado com o Menu Acompanhamento Financeiro
              </span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Esta mesma demonstração financeira e DRE consolidada pode ser acessada diretamente no menu lateral{' '}
                <strong>Acomp. Financeiro</strong>.
              </p>
            </div>
          </div>
          <WorkResultAnalysis />
        </div>
      )}

      {/* Modal Nova Revisão / INCC */}
      <BudgetRevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSaveVersion={handleSaveNewVersion}
        currentVersionNumber={budgetVersionsList.length}
      />

      {/* Modal Importação ERP */}
      <ErpImportWithDeParaModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={(summary) => {
          alert(
            `Importação de ${summary.importedCount} lançamentos concluída com sucesso!\nObra: ${formatBRL(
              summary.totalObra
            )}\nExtra Obra: ${formatBRL(summary.totalExtraObra)}`
          );
        }}
        existingRules={deParaRules}
        onAddNewRule={handleAddNewDeParaRule}
      />

      {/* Modal Manual de Cadastro de Regra De-Para */}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Nova Associação De-Para
              </h3>
              <button
                onClick={() => setShowNewRuleModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddRule} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Conta ERP Original (exata como vem no ERP)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 13º Salário - Obra"
                  value={newRuleForm.originalAccount}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, originalAccount: e.target.value })
                  }
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Conta De-Para (Conta Ajustada Consolidadora)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salários - Obra"
                  value={newRuleForm.adjustedAccount}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, adjustedAccount: e.target.value })
                  }
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Natureza da Conta
                </label>
                <select
                  value={newRuleForm.isObra ? 'obra' : 'extra'}
                  onChange={(e) =>
                    setNewRuleForm({ ...newRuleForm, isObra: e.target.value === 'obra' })
                  }
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  <option value="obra">Custo de Obra (Etapa Vinculada)</option>
                  <option value="extra">Extra Obra (Demais custos e despesas / DRE)</option>
                </select>
              </div>

              {newRuleForm.isObra && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Etapa do Orçamento (BASE ORÇAMENTO)
                  </label>
                  <select
                    value={newRuleForm.budgetStage}
                    onChange={(e) =>
                      setNewRuleForm({ ...newRuleForm, budgetStage: e.target.value })
                    }
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  >
                    {ATRIUM_BASE_ORCAMENTO_GROUPS.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { BaseOrcamentoTable } from './BaseOrcamentoTable';
import { BudgetRevisionModal, BudgetRevisionData } from './BudgetRevisionModal';
import { ATRIUM_BASE_TOTALS } from '../../lib/atrium-base-orcamento';
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

  // Abas do Módulo de Orçamento (Apenas Itens 1 e 2 solicitados)
  const [activeTab, setActiveTab] = useState<'base_orcamento' | 'incc_versoes'>('base_orcamento');

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

  const handleSaveNewVersion = (newVer: BudgetRevisionData) => {
    setBudgetVersionsList((prev) => [newVer, ...prev]);
    setSelectedVersionCode(newVer.versionCode);
    alert(
      `Nova versão ${newVer.versionCode} criada com sucesso!\nTotal Orçado: ${formatBRL(
        newVer.totalBudgetRevised
      )}\nReajuste INCC: ${newVer.inccPercent}%`
    );
  };

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

      {/* Modal Nova Revisão / INCC */}
      <BudgetRevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSaveVersion={handleSaveNewVersion}
        currentVersionNumber={budgetVersionsList.length}
      />
    </div>
  );
};

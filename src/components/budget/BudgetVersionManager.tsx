import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  BudgetVersion,
  BudgetAccount,
  InccScope,
  VersionComparisonResult,
} from '../../types';
import {
  GitCompare,
  Plus,
  TrendingUp,
  History,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Copy,
  ArrowRight,
  ShieldCheck,
  Calculator,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  formatBRL,
  formatDateBR,
  compareBudgetVersions,
  simulateInccAdjustment,
} from '../../lib/utils';

export const BudgetVersionManager: React.FC<{ selectedWorkId: string }> = ({ selectedWorkId }) => {
  const {
    works,
    budgetVersions,
    budgetAccounts,
    inccAdjustments,
    createBudgetVersionWithAccounts,
    approveBudgetVersion,
    applyInccAdjustment,
    updateBudgetAccount,
  } = useData();

  const { canEdit, user } = useAuth();
  const canManageVersions = canEdit('budget');
  const canApprove = user?.role === 'gestor' || user?.role === 'admin';

  const workVersions = useMemo(() => {
    return budgetVersions.filter((v) => v.work_id === selectedWorkId);
  }, [budgetVersions, selectedWorkId]);

  const [activeVersionId, setActiveVersionId] = useState<string>(
    workVersions.find((v) => v.is_current_approved)?.id || workVersions[0]?.id || ''
  );

  // Modais
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneTitle, setCloneTitle] = useState('');
  const [cloneReason, setCloneReason] = useState('');

  // Modal INCC
  const [isInccModalOpen, setIsInccModalOpen] = useState(false);
  const [inccRate, setInccRate] = useState<number>(4.5);
  const [inccScope, setInccScope] = useState<InccScope>('apenas_a_executar');
  const [inccBaseOld, setInccBaseOld] = useState('2025-10');
  const [inccBaseNew, setInccBaseNew] = useState('2026-03');
  const [inccJustification, setInccJustification] = useState('Reajuste anual contratual pelo INCC-M da FGV');
  const [selectedAccountIdsForIncc, setSelectedAccountIdsForIncc] = useState<string[]>([]);
  const [showInccSimulation, setShowInccSimulation] = useState(false);

  // Modal Comparação de Versões
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareFromVersionId, setCompareFromVersionId] = useState<string>('');
  const [compareToVersionId, setCompareToVersionId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<VersionComparisonResult | null>(null);

  // Contas da versão ativa
  const currentAccounts = useMemo(() => {
    return budgetAccounts.filter(
      (a) =>
        a.work_id === selectedWorkId &&
        (a.budget_version_id === activeVersionId || a.version_id === activeVersionId) &&
        a.status !== 'inativo' &&
        a.status !== 'descontinuada'
    );
  }, [budgetAccounts, selectedWorkId, activeVersionId]);

  const activeVersion = workVersions.find((v) => v.id === activeVersionId) || workVersions[0];

  // Simulação do INCC
  const inccSimulationResult = useMemo(() => {
    if (!isInccModalOpen) return null;
    return simulateInccAdjustment(
      currentAccounts,
      inccRate,
      inccScope,
      selectedAccountIdsForIncc
    );
  }, [isInccModalOpen, currentAccounts, inccRate, inccScope, selectedAccountIdsForIncc]);

  // Handlers
  const handleOpenClone = () => {
    setCloneTitle(`Revisão ${workVersions.length + 1} - ${activeVersion?.title || 'Orçamento'}`);
    setCloneReason('');
    setIsCloneModalOpen(true);
  };

  const handleConfirmClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneTitle || !cloneReason) {
      alert('Informe o título e o motivo da nova revisão do orçamento.');
      return;
    }
    const newVerId = createBudgetVersionWithAccounts(
      selectedWorkId,
      activeVersionId,
      cloneTitle,
      cloneReason
    );
    setIsCloneModalOpen(false);
    setActiveVersionId(newVerId);
  };

  const handleApprove = (versionId: string) => {
    if (confirm('Deseja aprovar esta versão e torná-la a versão vigente oficial da obra?')) {
      approveBudgetVersion(versionId);
    }
  };

  const handleApplyIncc = () => {
    if (!inccJustification) {
      alert('Informe a justificativa do reajuste pelo INCC.');
      return;
    }
    const { newVersionId } = applyInccAdjustment(
      selectedWorkId,
      activeVersionId,
      inccRate,
      inccScope,
      inccBaseOld,
      inccBaseNew,
      inccJustification,
      selectedAccountIdsForIncc
    );
    setIsInccModalOpen(false);
    setShowInccSimulation(false);
    setActiveVersionId(newVersionId);
    alert('Nova versão com reajuste pelo INCC gerada com sucesso em rascunho!');
  };

  const handleRunComparison = () => {
    const fromVer = workVersions.find((v) => v.id === compareFromVersionId);
    const toVer = workVersions.find((v) => v.id === compareToVersionId);
    if (!fromVer || !toVer) {
      alert('Selecione duas versões para comparar.');
      return;
    }

    const fromAccs = budgetAccounts.filter(
      (a) =>
        (a.budget_version_id === fromVer.id || a.version_id === fromVer.id) &&
        a.status !== 'inativo'
    );
    const toAccs = budgetAccounts.filter(
      (a) =>
        (a.budget_version_id === toVer.id || a.version_id === toVer.id) &&
        a.status !== 'inativo'
    );

    const diff = compareBudgetVersions(fromVer, toVer, fromAccs, toAccs);
    setComparisonResult(diff);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Versões da Obra */}
      <div className="bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Versionamento Aberto do Orçamento & INCC
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171]/10 text-[#004171] dark:bg-[#004171]/30 dark:text-[#38bdf8]">
                Controle Estrutural e Histórico
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie novas versões sem sobrescrever o histórico aprovado. Aplique reajustes formais de INCC.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCompareFromVersionId(workVersions[0]?.id || '');
                setCompareToVersionId(activeVersionId);
                setIsCompareModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-200 dark:border-[#1c3e5c]"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Comparar Versões</span>
            </button>

            {canManageVersions && (
              <>
                <button
                  onClick={() => setIsInccModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Atualizar pelo INCC</span>
                </button>

                <button
                  onClick={handleOpenClone}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#004171] hover:bg-[#003359] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Criar Nova Versão</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Seletor em Cards das Versões Disponíveis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {workVersions.map((v) => {
            const isSelected = v.id === activeVersionId;
            return (
              <div
                key={v.id}
                onClick={() => setActiveVersionId(v.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-50/50 dark:bg-[#0c2336] border-[#004171] dark:border-[#38bdf8] ring-1 ring-[#004171]'
                    : 'bg-white dark:bg-[#081d2c] border-slate-200 dark:border-[#1c3e5c] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    v{v.version_number} - {v.title}
                  </span>
                  {v.is_current_approved ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Vigente
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">
                      {v.status}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs font-extrabold text-[#004171] dark:text-[#38bdf8]">
                  {formatBRL(v.total_amount)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Por: {v.user_name} em {formatDateBR(v.created_at)}
                </div>
                {v.reason && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic">
                    "{v.reason}"
                  </p>
                )}

                {canApprove && !v.is_current_approved && (
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1c3e5c]/60 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(v.id);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors"
                    >
                      Aprovar Versão
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela de Contas da Versão Ativa */}
      <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 dark:bg-[#0c2336] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Estrutura Orçamentária da Versão: {activeVersion?.title}
            </h3>
            <p className="text-[11px] text-slate-500">
              {activeVersion?.is_current_approved
                ? 'Versão aprovada oficial. Alterações devem gerar nova revisão formal.'
                : 'Versão em rascunho aberta para edição técnica pelo engenheiro.'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#004171] dark:text-[#38bdf8]">
            Total: {formatBRL(activeVersion?.total_amount || 0)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-[#081d2c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1c3e5c]">
              <tr>
                <th className="py-3 px-4">Código e Descrição da Conta</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-center">Unidade</th>
                <th className="py-3 px-4 text-right">Qtd</th>
                <th className="py-3 px-4 text-right">Valor Unitário</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-center">Peso Físico</th>
                <th className="py-3 px-4 text-center">Reajuste INCC</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
              {currentAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-[#0c2336]/60 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#004171] dark:text-[#38bdf8] mr-2">
                      {acc.code}
                    </span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {acc.description}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center uppercase text-[10px] text-slate-500">
                    {acc.account_type}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                    {acc.unit || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {acc.quantity || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {acc.unit_cost ? formatBRL(acc.unit_cost) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatBRL(acc.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                    {acc.physical_weight_percent}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    {acc.is_reajustavel_incc !== false ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        Sim
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Não</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {acc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Clonar / Criar Nova Versão */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Criar Nova Versão do Orçamento
            </h3>
            <p className="text-xs text-slate-500">
              O sistema criará uma cópia editável completa da versão "{activeVersion?.title}". A versão anterior será preservada com integridade histórica.
            </p>

            <form onSubmit={handleConfirmClone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Título da Nova Versão *
                </label>
                <input
                  type="text"
                  value={cloneTitle}
                  onChange={(e) => setCloneTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Motivo da Revisão *
                </label>
                <textarea
                  value={cloneReason}
                  onChange={(e) => setCloneReason(e.target.value)}
                  rows={3}
                  placeholder="Ex: Adequação do projeto executivo de fundações e revisão de custos de formas"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#1c3e5c]">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white font-bold rounded-xl shadow-sm"
                >
                  Confirmar e Criar Versão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Atualização pelo INCC */}
      {isInccModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Atualização do Orçamento pelo INCC (FGV)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fórmula: Valor Reajustado = Valor Base × (1 + Índice Acumulado / 100).
                Gera nova versão formal com auditoria completa.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Índice Acumulado (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inccRate}
                  onChange={(e) => setInccRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Data-Base Atual
                </label>
                <input
                  type="month"
                  value={inccBaseOld}
                  onChange={(e) => setInccBaseOld(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nova Data-Base
                </label>
                <input
                  type="month"
                  value={inccBaseNew}
                  onChange={(e) => setInccBaseNew(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Escopo Obrigatório
                </label>
                <select
                  value={inccScope}
                  onChange={(e) => setInccScope(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="apenas_a_executar">Apenas Etapas a Executar</option>
                  <option value="total_orcamento">Todo o Orçamento</option>
                  <option value="selecao_manual">Seleção Manual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold text-xs mb-1">
                Justificativa Formal do Reajuste *
              </label>
              <input
                type="text"
                value={inccJustification}
                onChange={(e) => setInccJustification(e.target.value)}
                placeholder="Ex: Reajuste anual acordado conforme Cláusula 4.1 do Contrato de Obra"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Painel de Simulação Prévia */}
            {inccSimulationResult && (
              <div className="p-4 bg-slate-50 dark:bg-[#0c2336] rounded-xl border border-slate-200 dark:border-[#1c3e5c] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Resultado da Simulação Prévia:
                  </span>
                  <span className="text-slate-500">
                    {inccSimulationResult.reajustadosCount} itens reajustados | {inccSimulationResult.ignoradosCount} não elegíveis
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-white dark:bg-[#081d2c] rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-500 block">Valor Base Atual</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatBRL(inccSimulationResult.totalBaseAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-[#081d2c] rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-500 block">Novo Valor com INCC</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {formatBRL(inccSimulationResult.totalAdjustedAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-[#081d2c] rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-500 block">Impacto Financeiro (Δ)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatBRL(inccSimulationResult.differenceAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#1c3e5c] text-xs">
              <button
                type="button"
                onClick={() => setIsInccModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyIncc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
              >
                Confirmar e Gerar Versão Reajustada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Comparação Entre Versões */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1c3e5c] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-[#004171] dark:text-[#38bdf8]" />
                <span>Comparação Estrutural e Financeira Entre Versões</span>
              </h3>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Versão de Origem (Anterior)
                </label>
                <select
                  value={compareFromVersionId}
                  onChange={(e) => setCompareFromVersionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                >
                  {workVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} - {v.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Versão de Destino (Nova)
                </label>
                <select
                  value={compareToVersionId}
                  onChange={(e) => setCompareToVersionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                >
                  {workVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} - {v.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleRunComparison}
                className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Executar Comparação Diferencial (Diff)
              </button>
            </div>

            {/* Resultado do Comparativo */}
            {comparisonResult && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#1c3e5c] text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-[#0c2336] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Total Versão Anterior</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatBRL(comparisonResult.oldTotalBudget)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#0c2336] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Total Nova Versão</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatBRL(comparisonResult.newTotalBudget)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#0c2336] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Impacto Orçamentário (Δ)</span>
                    <span
                      className={`font-bold ${
                        comparisonResult.deltaBudget >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {comparisonResult.deltaBudget > 0 ? '+' : ''}{formatBRL(comparisonResult.deltaBudget)} ({comparisonResult.deltaBudgetPercent}%)
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#0c2336] rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Itens Modificados</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {comparisonResult.itemsModified.length} itens
                    </span>
                  </div>
                </div>

                {/* Itens com Alterações */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">
                    Detalhamento dos Itens Alterados:
                  </h4>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
                    {comparisonResult.itemsModified.map(({ account, changes }, idx) => (
                      <div key={idx} className="py-2.5 space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {account.code} - {account.description}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {changes.map((ch, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-1.5 bg-slate-50 dark:bg-[#0c2336] rounded border border-slate-200 dark:border-[#1c3e5c]"
                            >
                              <span className="text-slate-500 block capitalize">{ch.field}:</span>
                              <span className="line-through text-rose-500 mr-2">
                                {typeof ch.old_value === 'number' ? formatBRL(ch.old_value) : ch.old_value}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {typeof ch.new_value === 'number' ? formatBRL(ch.new_value) : ch.new_value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

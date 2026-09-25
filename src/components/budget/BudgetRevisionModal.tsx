import React, { useState, useMemo } from 'react';
import {
  ATRIUM_BASE_ORCAMENTO_ITEMS,
  ATRIUM_BASE_ORCAMENTO_GROUPS,
  BaseBudgetItem,
} from '../../lib/atrium-base-orcamento';
import { ATRIUM_PCO_STAGES } from '../../lib/atrium-pco-data';
import { formatBRL } from '../../lib/utils';
import {
  X,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  Unlock,
  Save,
  Percent,
  Search,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export interface BudgetRevisionData {
  versionCode: string;
  title: string;
  notes: string;
  createdAt: string;
  author: string;
  inccPercent: number;
  inccAppliedOnlyNewVersion: boolean;
  updateOnlyPendingStages: boolean;
  totalBudgetOriginal: number;
  totalBudgetRevised: number;
  items: (BaseBudgetItem & {
    revisedAmount: number;
    weightPercent: number;
    plannedStart: string;
    plannedEnd: string;
    isCompleted: boolean;
    justification?: string;
  })[];
  justifications: Record<string, string>; // stage/item code -> justification
}

interface BudgetRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVersion: (version: BudgetRevisionData) => void;
  currentVersionNumber?: number;
}

export const BudgetRevisionModal: React.FC<BudgetRevisionModalProps> = ({
  isOpen,
  onClose,
  onSaveVersion,
  currentVersionNumber = 1,
}) => {
  if (!isOpen) return null;

  // Find physical progress for each stage from PCO data
  const stageProgressMap = useMemo(() => {
    const map = new Map<string, number>();
    ATRIUM_PCO_STAGES.forEach((s) => {
      const codeClean = s.code.replace('.0', '').padStart(2, '0');
      map.set(codeClean, s.progress_percent || 0);
      map.set(s.code, s.progress_percent || 0);
    });
    return map;
  }, []);

  // Form states
  const [versionCode, setVersionCode] = useState(`REV-0${currentVersionNumber}`);
  const [versionTitle, setVersionTitle] = useState(
    `Revisão Orçamentária e Correção INCC - ${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
  );
  const [versionNotes, setVersionNotes] = useState('');
  const [authorName, setAuthorName] = useState('Eng. Tiago Caetano');

  // INCC Controls
  const [inccPercent, setInccPercent] = useState<number>(4.85); // Padrão ex. 4,85%
  const [inccAppliedOnlyNewVersion, setInccAppliedOnlyNewVersion] = useState<boolean>(true);
  const [updateOnlyPendingStages, setUpdateOnlyPendingStages] = useState<boolean>(true);

  // Search in modal
  const [searchModal, setSearchModal] = useState('');

  // Editable items
  const [editableItems, setEditableItems] = useState(() => {
    return ATRIUM_BASE_ORCAMENTO_ITEMS.map((item) => {
      const macroCode = item.code.split('.')[0];
      const prog = stageProgressMap.get(macroCode) || stageProgressMap.get(item.code) || 0;
      const isCompleted = prog >= 100;

      // Match dates from PCO stages if available
      const pcoStage = ATRIUM_PCO_STAGES.find(
        (s) => s.code.replace('.0', '').padStart(2, '0') === macroCode
      );

      return {
        ...item,
        revisedAmount: item.budgetAmount,
        weightPercent: pcoStage?.weight_percent || 0,
        plannedStart: pcoStage?.planned_start || '2024-01-15',
        plannedEnd: pcoStage?.planned_end || '2026-12-31',
        isCompleted,
        justification: '',
      };
    });
  });

  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Apply INCC Simulation
  const handleApplyINCC = () => {
    if (inccPercent <= 0) return;
    const factor = 1 + inccPercent / 100;

    setEditableItems((prev) =>
      prev.map((item) => {
        // Se a opção padrão "atualizar apenas as etapas a executar" estiver ativa,
        // etapas com progresso 100% não são alteradas automaticamente pelo INCC.
        if (updateOnlyPendingStages && item.isCompleted) {
          return item;
        }

        const newAmount = Number((item.budgetAmount * factor).toFixed(2));
        return {
          ...item,
          revisedAmount: newAmount,
        };
      })
    );
  };

  // Handle single item change
  const handleItemChange = (
    itemId: string,
    field: 'revisedAmount' | 'weightPercent' | 'plannedStart' | 'plannedEnd' | 'justification',
    value: any
  ) => {
    setEditableItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = { ...it, [field]: value };
        if (field === 'justification') {
          setJustifications((jPrev) => ({ ...jPrev, [it.code]: String(value) }));
        }
        return updated;
      })
    );
  };

  // Totals
  const totalOriginal = useMemo(() => {
    return editableItems.reduce((acc, it) => acc + it.budgetAmount, 0);
  }, [editableItems]);

  const totalRevised = useMemo(() => {
    return editableItems.reduce((acc, it) => acc + (it.revisedAmount || 0), 0);
  }, [editableItems]);

  const diffAmount = totalRevised - totalOriginal;
  const diffPercent = totalOriginal > 0 ? (diffAmount / totalOriginal) * 100 : 0;

  // Save Validation
  const handleSave = () => {
    setValidationError(null);

    // Rule: As etapas já concluídas somente poderão ser alteradas se incluir justificativa!
    const completedItemsChangedWithoutJustification: string[] = [];

    editableItems.forEach((it) => {
      if (it.isCompleted) {
        const isAmountChanged = Math.abs((it.revisedAmount || 0) - it.budgetAmount) > 0.01;
        const just = it.justification || justifications[it.code] || '';
        if (isAmountChanged && (!just || just.trim().length < 5)) {
          completedItemsChangedWithoutJustification.push(
            `${it.code} - ${it.substageName}`
          );
        }
      }
    });

    if (completedItemsChangedWithoutJustification.length > 0) {
      setValidationError(
        `Atenção: As seguintes etapas já foram concluídas (100%) e foram alteradas sem justificativa: \n• ${completedItemsChangedWithoutJustification.slice(0, 3).join('\n• ')}${
          completedItemsChangedWithoutJustification.length > 3
            ? ` (+${completedItemsChangedWithoutJustification.length - 3} itens)`
            : ''
        }. Por favor, informe uma justificativa válida para cada etapa concluída alterada.`
      );
      return;
    }

    const versionPayload: BudgetRevisionData = {
      versionCode,
      title: versionTitle,
      notes: versionNotes,
      createdAt: new Date().toISOString(),
      author: authorName,
      inccPercent,
      inccAppliedOnlyNewVersion,
      updateOnlyPendingStages,
      totalBudgetOriginal: totalOriginal,
      totalBudgetRevised: totalRevised,
      items: editableItems,
      justifications,
    };

    onSaveVersion(versionPayload);
    onClose();
  };

  const filteredItems = useMemo(() => {
    if (!searchModal) return editableItems;
    const term = searchModal.toLowerCase();
    return editableItems.filter(
      (it) =>
        it.code.toLowerCase().includes(term) ||
        it.substageName.toLowerCase().includes(term) ||
        it.stageGroup.toLowerCase().includes(term) ||
        it.erpAccount.toLowerCase().includes(term)
    );
  }, [editableItems, searchModal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-[#004171] dark:text-sky-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Criar Nova Versão do Orçamento & Revisão INCC
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#004171] text-white">
                  {versionCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revise prazos, pesos e valores por etapa/subetapa ou aplique reajuste automático pelo índice INCC.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Metadados da Versão */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Identificador da Versão
              </label>
              <input
                type="text"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Título / Descrição da Revisão
              </label>
              <input
                type="text"
                value={versionTitle}
                onChange={(e) => setVersionTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Engenheiro Responsável
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Painel de Reajuste pelo INCC */}
          <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  Correção de Preços pelo INCC (Índice Nacional de Custo da Construção)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Taxa do INCC (%):</span>
                <input
                  type="number"
                  step="0.01"
                  value={inccPercent}
                  onChange={(e) => setInccPercent(Number(e.target.value))}
                  className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleApplyINCC}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow transition-colors flex items-center space-x-1"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Calcular Reajuste</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-sky-200/60 dark:border-sky-800/40">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-[11px] text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={inccAppliedOnlyNewVersion}
                  onChange={(e) => setInccAppliedOnlyNewVersion(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>
                  <strong>Atualizar pelo INCC apenas na nova versão</strong> (mantém versão anterior congelada)
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none text-[11px] text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={updateOnlyPendingStages}
                  onChange={(e) => setUpdateOnlyPendingStages(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>
                  <strong>Atualizar apenas as etapas a executar</strong> (padrão de controle de obras)
                </span>
              </label>
            </div>
          </div>

          {/* Cards de Comparação do Orçamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Orçamento Base Original
              </span>
              <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatBRL(totalOriginal)}
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block">
                Novo Orçamento Revisado ({versionCode})
              </span>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                {formatBRL(totalRevised)}
              </div>
            </div>

            <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Variação do Orçamento
              </span>
              <div
                className={`text-base font-bold mt-0.5 ${
                  diffAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {diffAmount > 0 ? '+' : ''}
                {formatBRL(diffAmount)} ({diffPercent > 0 ? '+' : ''}
                {diffPercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Alerta de Validação se houver */}
          {validationError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start space-x-3 text-xs text-red-700 dark:text-red-300">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="whitespace-pre-line">{validationError}</div>
            </div>
          )}

          {/* Busca na Tabela de Subetapas */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar etapas por nome, código ou grupo..."
                value={searchModal}
                onChange={(e) => setSearchModal(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <span className="text-slate-500 text-xs">
              Exibindo {filteredItems.length} de {editableItems.length} subetapas
            </span>
          </div>

          {/* Tabela de Edição de Etapas / Subetapas */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[380px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5 w-16">Código</th>
                  <th className="p-2.5 min-w-[200px]">Subetapa (CONTA ORÇAMENTO)</th>
                  <th className="p-2.5 w-24 text-center">Tipo</th>
                  <th className="p-2.5 w-24 text-center">Status Físico</th>
                  <th className="p-2.5 w-32">Prazo Previsto</th>
                  <th className="p-2.5 w-24 text-center">Peso (%)</th>
                  <th className="p-2.5 w-28 text-right">Valor Atual</th>
                  <th className="p-2.5 w-32 text-right">Novo Valor (R$)</th>
                  <th className="p-2.5 min-w-[220px]">
                    Justificativa{' '}
                    <span className="text-red-500 font-bold">*se concluída</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                {filteredItems.map((item) => {
                  const isChanged =
                    Math.abs((item.revisedAmount || 0) - item.budgetAmount) > 0.01;
                  const needsJustification = item.isCompleted && isChanged;
                  const hasJustification =
                    (item.justification && item.justification.trim().length >= 5) ||
                    (justifications[item.code] && justifications[item.code].trim().length >= 5);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        item.isCompleted ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''
                      }`}
                    >
                      <td className="p-2 font-mono text-slate-500">{item.code}</td>
                      <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                        <div>{item.substageName}</div>
                        <span className="text-[10px] text-slate-400 block">{item.stageGroup}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.expenseType.toUpperCase().includes('MAT')
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {item.expenseType}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {item.isCompleted ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <Lock className="w-2.5 h-2.5" />
                            <span>100% Concluída</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-300 dark:border-sky-800">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>A Executar</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={`${item.plannedStart} a ${item.plannedEnd}`}
                          onChange={(e) => {
                            const [start, end] = e.target.value.split(' a ');
                            if (start) handleItemChange(item.id, 'plannedStart', start.trim());
                            if (end) handleItemChange(item.id, 'plannedEnd', end.trim());
                          }}
                          placeholder="AAAA-MM-DD a AAAA-MM-DD"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={item.weightPercent || 0}
                          onChange={(e) =>
                            handleItemChange(item.id, 'weightPercent', Number(e.target.value))
                          }
                          className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-center text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-slate-500">
                        {formatBRL(item.budgetAmount)}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={item.revisedAmount}
                          onChange={(e) =>
                            handleItemChange(item.id, 'revisedAmount', Number(e.target.value))
                          }
                          className={`w-28 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 text-right font-mono font-bold text-[11px] focus:outline-none focus:ring-1 ${
                            isChanged
                              ? 'border-sky-500 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        />
                      </td>
                      <td className="p-2">
                        {item.isCompleted ? (
                          <input
                            type="text"
                            placeholder="Obrigatória justificativa para alterar etapa concluída..."
                            value={item.justification || justifications[item.code] || ''}
                            onChange={(e) =>
                              handleItemChange(item.id, 'justification', e.target.value)
                            }
                            className={`w-full bg-white dark:bg-slate-900 border rounded px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 ${
                              needsJustification && !hasJustification
                                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-600 placeholder-red-400 focus:ring-red-500'
                                : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-sky-500'
                            }`}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Motivo da alteração (opcional)..."
                            value={item.justification || ''}
                            onChange={(e) =>
                              handleItemChange(item.id, 'justification', e.target.value)
                            }
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <div className="text-slate-500 text-[11px]">
            * As justificativas de etapas concluídas são gravadas de forma permanente no histórico desta versão.
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold shadow-lg shadow-[#004171]/25 transition-all flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar e Ativar Versão ({versionCode})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ATRIUM_DEPARA_RULES,
  DeParaRule,
  findDeParaRule,
} from '../../lib/atrium-real-data';
import { ATRIUM_BASE_ORCAMENTO_GROUPS } from '../../lib/atrium-base-orcamento';
import { formatBRL } from '../../lib/utils';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Save,
  HelpCircle,
} from 'lucide-react';

interface ErpImportWithDeParaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (data: {
    importedCount: number;
    totalAmount: number;
    totalObra: number;
    totalExtraObra: number;
    newRulesRegistered: DeParaRule[];
  }) => void;
  existingRules: DeParaRule[];
  onAddNewRule: (rule: DeParaRule) => void;
}

interface UnmappedAccountItem {
  originalAccount: string;
  count: number;
  totalAmount: number;
  sampleDoc: string;
  selectedAdjusted: string;
  isObra: boolean;
  selectedStage: string;
}

export const ErpImportWithDeParaModal: React.FC<ErpImportWithDeParaModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingRules,
  onAddNewRule,
}) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [unmappedAccounts, setUnmappedAccounts] = useState<UnmappedAccountItem[]>([]);
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    totalAmount: number;
    obraAmount: number;
    extraObraAmount: number;
    mappedRowsCount: number;
    unmappedRowsCount: number;
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'success'>('upload');

  // Parse Excel file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      // Pick first sheet or sheet called 'REAL' or 'DADOS'
      const sheetName =
        workbook.SheetNames.find((s) => s.toUpperCase() === 'REAL') ||
        workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      if (rawRows.length < 2) {
        alert('Planilha vazia ou formato inválido.');
        setParsing(false);
        return;
      }

      const headers = rawRows[0] as string[];
      const idxCta = headers.findIndex(
        (h) => h && h.toString().toUpperCase().includes('NM_CTA_CST')
      );
      const idxVal = headers.findIndex(
        (h) =>
          h &&
          (h.toString().toUpperCase().includes('VL_LNC_CST') ||
            h.toString().toUpperCase().includes('VALOR'))
      );
      const idxDoc = headers.findIndex(
        (h) => h && h.toString().toUpperCase().includes('DOCUMENTO')
      );

      const actualIdxCta = idxCta !== -1 ? idxCta : 5; // fallback index
      const actualIdxVal = idxVal !== -1 ? idxVal : 10;
      const actualIdxDoc = idxDoc !== -1 ? idxDoc : 2;

      let totalAmount = 0;
      let obraAmount = 0;
      let extraObraAmount = 0;
      let mappedCount = 0;
      let unmappedCount = 0;

      const unmappedMap = new Map<string, UnmappedAccountItem>();

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const ctaName = row[actualIdxCta] ? String(row[actualIdxCta]).trim() : '';
        const val = Number(row[actualIdxVal] || 0);
        const doc = row[actualIdxDoc] ? String(row[actualIdxDoc]).trim() : '';

        if (!ctaName && val === 0) continue;
        totalAmount += val;

        const rule = findDeParaRule(ctaName, existingRules);

        if (rule) {
          mappedCount++;
          if (rule.isObra) {
            obraAmount += val;
          } else {
            extraObraAmount += val;
          }
        } else {
          unmappedCount++;
          if (!unmappedMap.has(ctaName)) {
            unmappedMap.set(ctaName, {
              originalAccount: ctaName,
              count: 0,
              totalAmount: 0,
              sampleDoc: doc,
              selectedAdjusted: ctaName,
              isObra: true,
              selectedStage: ATRIUM_BASE_ORCAMENTO_GROUPS[0]?.name || '',
            });
          }
          const item = unmappedMap.get(ctaName)!;
          item.count++;
          item.totalAmount += val;
        }
      }

      setImportSummary({
        totalRows: rawRows.length - 1,
        totalAmount,
        obraAmount,
        extraObraAmount,
        mappedRowsCount: mappedCount,
        unmappedRowsCount: unmappedCount,
      });

      const unmappedList = Array.from(unmappedMap.values());
      setUnmappedAccounts(unmappedList);

      if (unmappedList.length > 0) {
        setStep('mapping');
      } else {
        setStep('success');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar planilha: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  // Update unmapped account mapping choice
  const handleUpdateUnmappedItem = (
    account: string,
    field: 'selectedAdjusted' | 'isObra' | 'selectedStage',
    value: any
  ) => {
    setUnmappedAccounts((prev) =>
      prev.map((it) => (it.originalAccount === account ? { ...it, [field]: value } : it))
    );
  };

  // Confirm mappings and complete import
  const handleConfirmMappings = () => {
    const newRules: DeParaRule[] = unmappedAccounts.map((item, idx) => ({
      id: `depara-custom-${Date.now()}-${idx}`,
      originalAccount: item.originalAccount,
      adjustedAccount: item.selectedAdjusted,
      isObra: item.isObra,
      budgetStage: item.isObra ? item.selectedStage : undefined,
    }));

    // Register all new rules
    newRules.forEach((r) => onAddNewRule(r));

    // Recalculate summary with new mappings
    let addedObra = 0;
    let addedExtra = 0;
    unmappedAccounts.forEach((item) => {
      if (item.isObra) addedObra += item.totalAmount;
      else addedExtra += item.totalAmount;
    });

    onImportComplete({
      importedCount: importSummary?.totalRows || 0,
      totalAmount: importSummary?.totalAmount || 0,
      totalObra: (importSummary?.obraAmount || 0) + addedObra,
      totalExtraObra: (importSummary?.extraObraAmount || 0) + addedExtra,
      newRulesRegistered: newRules,
    });

    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importar Planilha do ERP (.xlsx) & Associação de De-Para
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Importação contínua de lançamentos reais extraídos do ERP sem a coluna de-para.
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

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-sky-900 dark:text-sky-300 block mb-1">
                  Diretrizes de Importação do ERP:
                </span>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>
                    O arquivo gerado pelo ERP contém as colunas padrão (ex: <code>CD_UP</code>,{' '}
                    <code>NM_CTA_CST</code>, <code>VL_LNC_CST</code>, <code>DOCUMENTO</code>, etc.) e{' '}
                    <strong>NÃO contém a coluna De-Para</strong>.
                  </li>
                  <li>
                    O sistema aplica automaticamente o De-Para mapeando para a conta consolidadora com
                    base na tabela de <strong>{ATRIUM_DEPARA_RULES.length} regras cadastradas</strong>.
                  </li>
                  <li>
                    Se aparecerem contas novas no ERP sem De-Para associado, o sistema abrirá a tela de
                    cadastro para vincular a conta imediatamente antes de gravar no banco de dados.
                  </li>
                </ul>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-3xl p-8 text-center bg-slate-50 dark:bg-slate-900/40 transition-colors">
                <input
                  type="file"
                  id="erp-file-input"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="erp-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      {parsing ? 'Processando planilha...' : 'Clique para selecionar a planilha do ERP (.xlsx)'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      Compatível com relatórios e extratos de contas de custos do ERP
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Novas Contas Detectadas ({unmappedAccounts.length} sem De-Para associado)
                  </span>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                    As seguintes contas extraídas do ERP ainda não possuem regra de De-Para cadastrada.
                    Por favor, defina para qual conta consolidada elas devem apontar e se participam do
                    orçamento da obra. Essas associações serão gravadas na tabela permanente de De-Para.
                  </p>
                </div>
              </div>

              {/* Tabela de Associação de Contas */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[360px]">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Conta ERP Original (NM_CTA_CST)</th>
                      <th className="p-3 text-center w-20">Lançamentos</th>
                      <th className="p-3 text-right w-28">Valor (R$)</th>
                      <th className="p-3 min-w-[200px]">Conta De-Para (Ajustada)</th>
                      <th className="p-3 text-center w-36">Natureza</th>
                      <th className="p-3 min-w-[200px]">Etapa do Orçamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                    {unmappedAccounts.map((item) => (
                      <tr key={item.originalAccount} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          <div>{item.originalAccount}</div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Ex. Doc: {item.sampleDoc || 'N/D'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{item.count}</td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {formatBRL(item.totalAmount)}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.selectedAdjusted}
                            onChange={(e) =>
                              handleUpdateUnmappedItem(
                                item.originalAccount,
                                'selectedAdjusted',
                                e.target.value
                              )
                            }
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <select
                            value={item.isObra ? 'obra' : 'extra'}
                            onChange={(e) =>
                              handleUpdateUnmappedItem(
                                item.originalAccount,
                                'isObra',
                                e.target.value === 'obra'
                              )
                            }
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="obra">Custo de Obra</option>
                            <option value="extra">Extra Obra (DRE)</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          {item.isObra ? (
                            <select
                              value={item.selectedStage}
                              onChange={(e) =>
                                handleUpdateUnmappedItem(
                                  item.originalAccount,
                                  'selectedStage',
                                  e.target.value
                                )
                              }
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-sky-500"
                            >
                              {ATRIUM_BASE_ORCAMENTO_GROUPS.map((g) => (
                                <option key={g.name} value={g.name}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">
                              Sem etapa vinculada
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-5 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Planilha do ERP Importada com Sucesso!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Os lançamentos foram processados e classificados conforme as regras de De-Para.
                </p>
              </div>

              {/* Resumo Card */}
              {importSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                  <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Total de Lançamentos
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {importSummary.totalRows.toLocaleString('pt-BR')} registros
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-semibold block">
                      Realizado Obra
                    </span>
                    <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-1">
                      {formatBRL(importSummary.obraAmount)}
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Realizado Extra Obra
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {formatBRL(importSummary.extraObraAmount)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors"
          >
            {step === 'success' ? 'Fechar' : 'Cancelar'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleConfirmMappings}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Regras de De-Para e Confirmar Importação</span>
            </button>
          )}

          {step === 'success' && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold shadow-lg shadow-[#004171]/25 transition-all"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
  Calculator,
  ShieldCheck,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import { Work, PcoParsedData, PcoValidationResult } from '../../types';
import { parsePcoWorkbook, validatePcoParsedData } from '../../lib/pco-importer';
import { formatBRL } from '../../lib/utils';
import { useData } from '../../contexts/DataContext';

interface PcoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWork?: Work;
  onImportComplete?: (parsedData: PcoParsedData) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const PcoImportModal: React.FC<PcoImportModalProps> = ({
  isOpen,
  onClose,
  targetWork,
  onImportComplete,
}) => {
  const { works, importPcoWorkbook: applyPcoImport } = useData();

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedWorkId, setSelectedWorkId] = useState<string>(targetWork?.id || works[0]?.id || 'work-1');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [parsedData, setParsedData] = useState<PcoParsedData | null>(null);
  const [validationResult, setValidationResult] = useState<PcoValidationResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentWork = works.find((w) => w.id === selectedWorkId) || targetWork || works[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleQuickLoadDemo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch the bundled copy from public/data/imports if available, or simulate buffer
      const response = await fetch('/data/imports/ATRIUM-PlanejamentoeControledeObra(PCO)-SET26-IMPORT.xlsx');
      if (!response.ok) {
        throw new Error('Arquivo de demonstração não localizado na pasta pública. Por favor selecione o arquivo local baixado.');
      }
      const blob = await response.blob();
      const mockFile = new File([blob], 'ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      setFile(mockFile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar arquivo de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  const processFileParsing = async () => {
    if (!file) {
      setErrorMsg('Selecione um arquivo .xlsx ou .xls para continuar.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setStep(2);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parsePcoWorkbook(arrayBuffer, selectedWorkId, {
        fileName: file.name,
        uploadedBy: 'Engenharia / Planejamento',
      });

      const validation = validatePcoParsedData(parsed);

      setParsedData(parsed);
      setValidationResult(validation);
      setLoading(false);
      setStep(3);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(`Falha na leitura do arquivo PCO: ${err.message || err}`);
      setStep(1);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setLoading(true);
    setStep(5);

    try {
      if (applyPcoImport) {
        await applyPcoImport(parsedData);
      }
      if (onImportComplete) {
        onImportComplete(parsedData);
      }
      setTimeout(() => {
        setLoading(false);
        setStep(6);
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(`Erro ao salvar importação: ${err.message || err}`);
    }
  };

  const handleExportJson = () => {
    if (!parsedData) return;
    const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PCO-Export-${parsedData.workId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Importador PCO & Acompanhamento
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Universal
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assistente em 6 etapas para integração de Planejamento, Orçamento, ERP e De-Para
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium">
          {[
            { s: 1, label: '1. Arquivo & Obra' },
            { s: 2, label: '2. Leitura' },
            { s: 3, label: '3. Prévia' },
            { s: 4, label: '4. Validação' },
            { s: 5, label: '5. Integração' },
            { s: 6, label: '6. Conclusão' },
          ].map((item) => {
            const isActive = step === item.s;
            const isDone = step > item.s;
            return (
              <div
                key={item.s}
                className={`flex items-center gap-1.5 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : isDone
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : item.s}
                </div>
                <span className="hidden sm:inline">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <strong className="block font-semibold">Atenção no processamento:</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* STEP 1: Identification & Selection */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  1. Obra de Destino para o PCO
                </label>
                <select
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Os dados físicos, orçamentários e conciliações serão vinculados a esta obra.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  2. Planilha PCO (Formato .XLSX com as 6 Abas Padrão)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Upload className="w-10 h-10 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {file ? file.name : 'Clique para selecionar ou arraste o arquivo PCO'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Suporta arquivos padrão PCO da Engenharia (contendo PLANEJAMENTO MACRO, % DIRETOS, BASE ORÇAMENTO, REAL, de-para)
                  </p>
                  {file && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo pronto ({Math.round(file.size / 1024)} KB)
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Deseja testar com a planilha oficial do <strong>Atrium Select (SET/26)</strong>?</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickLoadDemo}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0 shadow-sm"
                >
                  {loading ? 'Carregando...' : 'Carregar Planilha PCO Atrium'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Parsing Progress */}
          {step === 2 && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Processando e Validando Estrutura PCO...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Lendo abas PLANEJAMENTO MACRO, % INDIRETOS, % DIRETOS, BASE ORÇAMENTO, REAL e de-para.
                Mapeando curva S, contas ERP e regras analíticas.
              </p>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 3 && parsedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Físico Acumulado
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {(parsedData.macro.accumulatedExecutedProgress <= 1.0 ? parsedData.macro.accumulatedExecutedProgress * 100 : parsedData.macro.accumulatedExecutedProgress).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {parsedData.macro.monthlyPlannedPeriods.length} períodos na curva
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Orçamento Total
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatBRL(parsedData.macro.totalPlannedBudget)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {parsedData.budget.items.length} itens orçamentários
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Realizado ERP
                  </span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(parsedData.real.totalSpent)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {parsedData.real.recordCount.toLocaleString('pt-BR')} lançamentos
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Mapeamento De-Para
                  </span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {parsedData.dePara.ruleCount} Regras
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {parsedData.dePara.uniqueAdjustedCount} contas sintetizadas
                  </span>
                </div>
              </div>

              {/* Breakdown detail */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Estrutura de Abas Encontradas</span>
                  <span className="text-slate-500 font-normal">Arquivo: {parsedData.fileName}</span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">1. PLANEJAMENTO MACRO</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Curva S e Marcos Físicos</span>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">2. % INDIRETOS</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ {parsedData.indirects.length} contas ({formatBRL(parsedData.indirects.reduce((a, b) => a + b.totalBudget, 0))})
                    </span>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">3. % DIRETOS</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ {parsedData.directs.length} etapas ({formatBRL(parsedData.directs.reduce((a, b) => a + b.totalBudget, 0))})
                    </span>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">4. BASE ORÇAMENTO</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ {parsedData.budget.items.length} itens analíticos
                    </span>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">5. REAL</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ {parsedData.real.recordCount} registros contábeis/financeiros
                    </span>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-slate-900">
                    <span className="font-medium text-slate-700 dark:text-slate-200">6. de-para</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ {parsedData.dePara.ruleCount} regras ativas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Validation Results */}
          {step === 4 && validationResult && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  validationResult.isValid
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
                }`}
              >
                {validationResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {validationResult.isValid
                      ? 'Planilha Validada com Sucesso!'
                      : 'Validação Concluída com Avisos'}
                  </h4>
                  <p className="text-xs mt-0.5">
                    Foram executadas as 4 baterias de testes de conformidade com os dados do PCO.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {validationResult.checks.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.status === 'pass'
                            ? 'bg-emerald-500'
                            : c.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-600 dark:text-slate-300 block">{c.details}</span>
                      {c.expected && (
                        <span className="text-[10px] text-slate-400 block">
                          Esperado: {c.expected} | Obtido: {c.found}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Processing */}
          {step === 5 && (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Atualizando Banco de Dados da Obra...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Gravando perfis de importação, atualizando cronogramas, curva S de custos e registrando histórico para auditoria.
              </p>
            </div>
          )}

          {/* STEP 6: Completion Report */}
          {step === 6 && parsedData && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Importação PCO Concluída!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                A obra <strong>{currentWork?.name}</strong> foi sincronizada com a versão mais recente do PCO. Os dados físicos e financeiros já estão disponíveis nas abas especializadas.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Progresso Físico Gravado:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {(parsedData.macro.accumulatedExecutedProgress <= 1.0 ? parsedData.macro.accumulatedExecutedProgress * 100 : parsedData.macro.accumulatedExecutedProgress).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Orçamento Consolidado:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatBRL(parsedData.macro.totalPlannedBudget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Realizado Contábil ERP:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBRL(parsedData.real.totalSpent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lançamentos Processados:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {parsedData.real.recordCount.toLocaleString('pt-BR')} registros
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Exportar Relatório JSON
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                disabled={!file || loading}
                onClick={processFileParsing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                Analisar Planilha <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                Verificar Validações <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                Confirmar e Integrar Obra <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 6 && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
              >
                Fechar e Ver Painéis
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

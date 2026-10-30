import React, { useState, useRef } from 'react';
import {
  UnifiedCommercialErpRow,
  CommercialUnit,
  INITIAL_UNIFIED_ROWS,
  parseVendasGeralExcelFile,
  buildCommercialUnitsFromUnifiedRows,
  calculateCommercialSummary,
  syncUnifiedCommercialToSupabase,
  COMMERCIAL_UNITS_STORAGE_KEY,
} from '../../lib/atrium-commercial-data';
import { formatBRL } from '../../lib/utils';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Database,
  RefreshCw,
} from 'lucide-react';

interface CommercialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (updatedUnits: CommercialUnit[]) => void;
}

export const CommercialImportModal: React.FC<CommercialImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<UnifiedCommercialErpRow[]>(INITIAL_UNIFIED_ROWS);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const rows = await parseVendasGeralExcelFile(f);
      if (rows.length === 0) {
        setErrorMsg(
          'Nenhuma unidade encontrada no arquivo. Verifique se possui as colunas do relatório geral (DE_EMP, DE_UNI, DE_STA, CD_CNT, DT_CNT, VL_CNT, RZ_SCL, ValorPago, SALDO).'
        );
        return;
      }
      setSelectedFile(f);
      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg(`Erro ao ler arquivo Excel: ${err?.message || 'Formato inválido'}`);
    }
  };

  const previewUnits = buildCommercialUnitsFromUnifiedRows(parsedRows);
  const previewSummary = calculateCommercialSummary(previewUnits);

  const handleConfirmImport = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);

    const units = buildCommercialUnitsFromUnifiedRows(parsedRows);
    try {
      localStorage.setItem(COMMERCIAL_UNITS_STORAGE_KEY, JSON.stringify(units));
    } catch {}

    const syncRes = await syncUnifiedCommercialToSupabase(parsedRows);
    setIsSaving(false);

    onImportSuccess(units);

    if (syncRes.ok) {
      setStatusMsg('Relatório Geral de Vendas importado e sincronizado com o Supabase com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMsg(
        `Dados aplicados no sistema! (Aviso Supabase: ${syncRes.error || 'Execute a migration SQL da tabela commercial_units no Supabase'})`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-500 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Importar Relatório Geral de Vendas ERP (vendasgeral.xlsx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Importação unificada das 80 unidades, contratos, compradores, valores pagos e saldos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Área de Upload do Arquivo Único */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Planilha Unificada do ERP (<code className="font-mono text-blue-500">vendasgeral.xlsx</code>)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
              {parsedRows.length} unidades lidas
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Colunas reconhecidas automaticamente:{' '}
            <code className="font-mono">DE_EMP, DE_UNI, DE_STA, CD_CNT, DT_CNT, VL_CNT, RZ_SCL, DE_FRM_REA, NM_IND_REA_CNS, NM_IND_REA_HAB, PC_JRS_HAB, ValorPago, SALDO</code>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>{selectedFile ? `Arquivo carregado: ${selectedFile.name}` : 'Selecionar arquivo vendasgeral.xlsx'}</span>
          </button>
        </div>

        {/* Resumo de Conferência */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Resumo do Relatório Carregado
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {previewSummary.totalUnits} unidades • {previewSummary.totalPrivateAreaM2.toLocaleString('pt-BR')} m²
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Vendidas ({previewSummary.soldUnits} un.)</span>
              <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBRL(previewSummary.vgvVendido)}
              </strong>
              <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                Média: {formatBRL(previewSummary.averagePriceM2Vendido)}/m²
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Pago (ERP)</span>
              <strong className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                {formatBRL(previewSummary.totalReceived)}
              </strong>
              <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                Saldo: {formatBRL(previewSummary.totalReceivable)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Livres ({previewSummary.availableUnits}) + Contr./Res. ({previewSummary.blockedUnits})</span>
              <strong className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                {formatBRL(previewSummary.vgvEstoqueTotal)}
              </strong>
              <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                VGV Real: {formatBRL(previewSummary.vgvReal)}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirmImport}
            className="px-4 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            <span>{isSaving ? 'Gravando no Supabase...' : 'Confirmar & Sincronizar com Supabase'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { WorkResultAnalysis } from '../budget/WorkResultAnalysis';
import { RealIncurredCompositionView } from './RealIncurredCompositionView';
import { ErpImportWithDeParaModal } from '../budget/ErpImportWithDeParaModal';
import { ATRIUM_DEPARA_RULES, DeParaRule } from '../../lib/atrium-real-data';
import {
  TrendingUp,
  FileSpreadsheet,
  UploadCloud,
  Layers,
  Building2,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface FinancialProgressManagerProps {
  defaultWorkId?: string;
}

export const FinancialProgressManager: React.FC<FinancialProgressManagerProps> = () => {
  const [activeTab, setActiveTab] = useState<'resultado_dre' | 'composicao_realizado'>('resultado_dre');
  const [showImportModal, setShowImportModal] = useState(false);
  const [customRules, setCustomRules] = useState<DeParaRule[]>([]);

  const handleAddNewRule = (rule: DeParaRule) => {
    setCustomRules((prev) => [...prev, rule]);
  };

  const handleImportComplete = (summary: any) => {
    alert(
      `Importação concluída!\n${summary.importedCount} lançamentos processados.\nObra: R$ ${summary.totalObra.toLocaleString(
        'pt-BR',
        { minimumFractionDigits: 2 }
      )}\nExtra Obra: R$ ${summary.totalExtraObra.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
      })}`
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header do Acompanhamento Financeiro */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171] text-white">
              Controladoria & Finanças
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Edifício Atrium</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Acompanhamento Financeiro & Resultado da Obra
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Visão consolidada da saúde econômico-financeira do empreendimento: DRE multi-nível,
            composição do realizado incorrido (Obra vs. Extra Obra) e integração com o ERP.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Planilha ERP (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Navegação entre Abas Principais */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('resultado_dre')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'resultado_dre'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Acompanhamento do Resultado da Obra (Financeiro & DRE)</span>
        </button>

        <button
          onClick={() => setActiveTab('composicao_realizado')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
            activeTab === 'composicao_realizado'
              ? 'bg-[#004171] text-white shadow-lg shadow-[#004171]/25 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Composição do Realizado Incorrido (Obra x Extra Obra)</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'resultado_dre' && <WorkResultAnalysis />}
      {activeTab === 'composicao_realizado' && <RealIncurredCompositionView />}

      {/* Modal de Importação do ERP */}
      <ErpImportWithDeParaModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
        existingRules={[...ATRIUM_DEPARA_RULES, ...customRules]}
        onAddNewRule={handleAddNewRule}
      />
    </div>
  );
};

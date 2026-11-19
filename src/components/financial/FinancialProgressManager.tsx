import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { WorkResultAnalysis } from '../budget/WorkResultAnalysis';
import { RealIncurredCompositionView } from './RealIncurredCompositionView';
import {
  TrendingUp,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';

interface FinancialProgressManagerProps {
  defaultWorkId?: string;
}

export const FinancialProgressManager: React.FC<FinancialProgressManagerProps> = ({ defaultWorkId }) => {
  const { works } = useData();

  const [selectedWorkId, setSelectedWorkId] = useState<string>(
    defaultWorkId || works[0]?.id || 'work-1'
  );
  const currentWork = useMemo(
    () => works.find((w) => w.id === selectedWorkId) || works[0],
    [works, selectedWorkId]
  );

  const [activeTab, setActiveTab] = useState<'resultado_dre' | 'composicao_realizado'>('resultado_dre');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header do Acompanhamento Financeiro com Seletor de Obra */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171] text-white">
              Controladoria & Finanças
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
              {currentWork?.code} — {currentWork?.name}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Acompanhamento Financeiro & Resultado da Obra
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Visão consolidada da saúde econômico-financeira do empreendimento: DRE multi-nível,
            composição do realizado incorrido (Obra vs. Extra Obra) e integração com o ERP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Obra */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <Building2 className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                Obra Selecionada
              </span>
              <select
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2 mt-0.5"
              >
                {works.map((w) => (
                  <option key={w.id} value={w.id} className="bg-white dark:bg-slate-900">
                    {w.code} — {w.name} ({w.city_state})
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          <span>Acompanhamento do Resultado da Obra (Financeiro & DRE — {currentWork?.name})</span>
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
      {activeTab === 'resultado_dre' && <WorkResultAnalysis work={currentWork} />}
      {activeTab === 'composicao_realizado' && (
        <RealIncurredCompositionView workId={selectedWorkId} workName={currentWork?.name} />
      )}
    </div>
  );
};

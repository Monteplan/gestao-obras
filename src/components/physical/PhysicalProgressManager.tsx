import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Ruler, Building2 } from 'lucide-react';
import { AtriumPhysicalDashboard } from '../works/atrium/AtriumPhysicalDashboard';

export const PhysicalProgressManager: React.FC<{ defaultWorkId?: string }> = ({ defaultWorkId }) => {
  const { works } = useData();

  const [selectedWorkId, setSelectedWorkId] = useState<string>(
    defaultWorkId || works[0]?.id || 'work-1'
  );
  const selectedWork = works.find((w) => w.id === selectedWorkId) || works[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Seletor de Obra */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 rounded-xl text-[#004171] dark:text-[#38bdf8]">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Acompanhamento Físico de Obras
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#004171]/10 text-[#004171] dark:bg-[#004171]/30 dark:text-[#38bdf8]">
                  Plano A (Engenharia & EAP)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Evolução por etapas e subetapas interligada em tempo real com a aba <strong>Etapas & EAP</strong> e Curva S padronizada.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#004171]"
          >
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Oficial Padronizado (Curva S PCO + Etapas EAP) para TODAS as obras */}
      <AtriumPhysicalDashboard work={selectedWork} />
    </div>
  );
};

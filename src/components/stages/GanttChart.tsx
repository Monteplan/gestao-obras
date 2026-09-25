import React, { useState, useMemo } from 'react';
import { Stage } from '../../types';
import { formatDateBR, formatPercent, buildStageHierarchy, compareStageCodes } from '../../lib/utils';
import { Clock, AlertTriangle, CheckCircle2, Search, Layers, GitFork } from 'lucide-react';

interface GanttChartProps {
  stages: Stage[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ stages }) => {
  const [viewMode, setViewMode] = useState<'macro' | 'todas'>('macro');
  const [searchTerm, setSearchTerm] = useState<string>('');

  if (!stages || stages.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 glass-panel rounded-2xl">
        Nenhuma etapa cadastrada para exibição do cronograma.
      </div>
    );
  }

  const hasSubstages = stages.some((s) => !!s.parent_id);

  // Filtra e organiza as etapas mantendo estritamente a ordem numérica da EAP
  // e cada macroetapa imediatamente acompanhada de todas as suas subetapas
  const displayStages = useMemo(() => {
    const hierarchical = buildStageHierarchy(stages);

    let list: Stage[] = [];
    if (viewMode === 'macro' && hasSubstages) {
      list = hierarchical;
    } else {
      hierarchical.forEach((macro) => {
        list.push(macro);
        if (macro.substages && macro.substages.length > 0) {
          list.push(...macro.substages);
        }
      });

      // Caso haja alguma etapa órfã que não foi incluída
      const includedIds = new Set(list.map((s) => s.id));
      const orphans = stages
        .filter((s) => !includedIds.has(s.id))
        .sort((a, b) => compareStageCodes(a.code, b.code));
      if (orphans.length > 0) {
        list.push(...orphans);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }

    return list;
  }, [stages, viewMode, hasSubstages, searchTerm]);

  // Encontra a data mínima e máxima estável para a escala do Gantt
  const allStarts = stages.map((s) => new Date(s.planned_start).getTime()).filter((t) => !isNaN(t));
  const allEnds = stages.map((s) => new Date(s.planned_end).getTime()).filter((t) => !isNaN(t));

  const minTime = Math.min(...allStarts, Date.now() - 30 * 86400000);
  const maxTime = Math.max(...allEnds, Date.now() + 90 * 86400000);
  const totalDuration = maxTime - minTime || 1;

  const today = new Date().toISOString().split('T')[0];
  const todayTime = Date.now();
  const todayLeftPercent = Math.max(0, Math.min(100, ((todayTime - minTime) / totalDuration) * 100));

  const macroCount = stages.filter((s) => !s.parent_id).length;
  const subCount = stages.filter((s) => !!s.parent_id).length;

  return (
    <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4 overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-4 h-4 text-blue-400" />
            <span>Cronograma Gantt Executivo PCO</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Prazos e cronograma ponderado conforme aba Planejamento Macro da obra Atrium
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Visão Macro vs Subetapas */}
          {hasSubstages && (
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('macro')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'macro'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Macroetapas ({macroCount})
              </button>
              <button
                onClick={() => setViewMode('todas')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  viewMode === 'todas'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas as Etapas e Subetapas ({stages.length})
              </button>
            </div>
          )}

          {/* Busca rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Buscar etapa no Gantt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span className="text-slate-400">Em Andamento</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600"></span>
              <span className="text-slate-400">Concluída</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              <span className="text-slate-400">Atrasada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Escala Temporal do Gantt */}
      <div className="relative min-w-[700px]">
        {/* Linha vertical do "Hoje" */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-red-500/80 z-20 pointer-events-none"
          style={{ left: `${todayLeftPercent}%` }}
        >
          <div className="bg-red-500 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-b shadow -translate-x-1/2">
            Hoje
          </div>
        </div>

        {/* Linhas das Etapas */}
        <div className="space-y-3 pt-4">
          {displayStages.map((stage) => {
            const isSub = !!stage.parent_id;
            const startTime = new Date(stage.planned_start).getTime();
            const endTime = new Date(stage.planned_end).getTime();

            const leftPercent = Math.max(0, Math.min(100, ((startTime - minTime) / totalDuration) * 100));
            const widthPercent = Math.max(4, Math.min(100 - leftPercent, ((endTime - startTime) / totalDuration) * 100));

            const isDelayed = stage.planned_end < today && stage.progress_percent < 100;
            const isDone = stage.progress_percent === 100;

            const barColor = isDone
              ? 'bg-emerald-600'
              : isDelayed
              ? 'bg-amber-500'
              : isSub
              ? 'bg-sky-600'
              : 'bg-blue-600';

            return (
              <div key={stage.id} className="group relative">
                <div className="flex items-center justify-between text-xs mb-1 px-1">
                  <div className={`flex items-center space-x-2 truncate ${isSub ? 'pl-5' : ''}`}>
                    <span className={`font-mono text-[10px] font-semibold ${isSub ? 'text-sky-400' : 'text-blue-400 font-bold'}`}>
                      {isSub ? `↳ ${stage.code}` : stage.code}
                    </span>
                    <span className={`truncate ${isSub ? 'text-slate-300 font-normal text-[11px]' : 'font-bold text-white'}`}>
                      {stage.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({formatPercent(stage.weight_percent, 2)} {isSub ? 'da macro' : 'peso'})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-x-2 shrink-0">
                    <span>{formatDateBR(stage.planned_start)} a {formatDateBR(stage.planned_end)}</span>
                    <strong className="text-white ml-2">{formatPercent(stage.progress_percent, 2)}</strong>
                  </div>
                </div>

                {/* Track da Barra */}
                <div className={`w-full bg-slate-900/90 rounded-lg relative overflow-hidden border border-slate-800 ${isSub ? 'h-4.5' : 'h-6'}`}>
                  {/* Barra da Etapa */}
                  <div
                    className={`absolute top-0 bottom-0 rounded-md transition-all ${barColor} shadow-md flex items-center justify-between px-2 overflow-hidden`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    title={`${stage.name}: ${formatPercent(stage.progress_percent, 2)} concluído (${formatDateBR(stage.planned_start)} a ${formatDateBR(stage.planned_end)})`}
                  >
                    {/* Barra de preenchimento interno de progresso */}
                    <div
                      className="absolute inset-0 bg-white/20 rounded-md"
                      style={{ width: `${stage.progress_percent}%` }}
                    />
                    <span className="text-[10px] font-bold text-white drop-shadow relative z-10 truncate">
                      {formatPercent(stage.progress_percent, 2)}
                    </span>
                    {isDelayed && (
                      <AlertTriangle className="w-3 h-3 text-white drop-shadow relative z-10 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


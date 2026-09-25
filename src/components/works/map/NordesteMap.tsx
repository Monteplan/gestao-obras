import React, { useState } from 'react';
import { Work } from '../../../types';
import { NORDESTE_STATES, BRAZIL_OTHER_REGIONS, NORDESTE_OUTER_CONTOUR } from './map-data';
import { Sparkles, Building2, TrendingUp, DollarSign, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

interface NordesteMapProps {
  works: Work[];
  selectedState: string | null;
  onSelectState: (uf: string) => void;
}

export const NordesteMap: React.FC<NordesteMapProps> = ({
  works,
  selectedState,
  onSelectState,
}) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Agrupamento consolidado de obras por UF
  const worksByState = React.useMemo(() => {
    const stats: Record<string, { count: number; active: number; totalValue: number; avgProgress: number }> = {};
    Object.keys(NORDESTE_STATES).forEach((uf) => {
      stats[uf] = { count: 0, active: 0, totalValue: 0, avgProgress: 0 };
    });

    works.forEach((w) => {
      if (stats[w.state]) {
        stats[w.state].count += 1;
        if (w.status === 'em_andamento') stats[w.state].active += 1;
        stats[w.state].totalValue += w.contract_value || 0;
        stats[w.state].avgProgress += w.progress_percent || 0;
      }
    });

    Object.keys(stats).forEach((uf) => {
      if (stats[uf].count > 0) {
        stats[uf].avgProgress = Math.round(stats[uf].avgProgress / stats[uf].count);
      }
    });

    return stats;
  }, [works]);

  const activeStateInfo = hoveredState ? NORDESTE_STATES[hoveredState] : (selectedState ? NORDESTE_STATES[selectedState] : null);
  const activeStats = activeStateInfo ? worksByState[activeStateInfo.uf] : null;

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-900 via-[#071829] to-[#040e19] border border-cyan-500/20 shadow-2xl p-4 sm:p-6 overflow-hidden">
      {/* Blueprint grid pattern background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(14, 165, 233, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(14, 165, 233, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Mapa do Brasil • Destaque Regional Nordeste</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Visão Cartográfica — Região Nordeste
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            O contorno do Nordeste está destacado. Selecione um dos 9 estados para visualizar suas cidades e obras.
          </p>
        </div>

        {/* Dynamic State Badge */}
        {activeStateInfo && activeStats && (
          <div className="bg-slate-800/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 sm:px-4 sm:py-2.5 shadow-lg flex items-center gap-3 transition-all duration-300 animate-fadeIn">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-cyan-500/30">
              {activeStateInfo.uf}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{activeStateInfo.name}</span>
                <span className="text-[11px] text-slate-400 font-normal">({activeStateInfo.capital})</span>
              </div>
              <div className="text-xs text-cyan-300 font-medium flex items-center gap-2">
                <span>{activeStats.count} {activeStats.count === 1 ? 'obra' : 'obras'}</span>
                <span>•</span>
                <span className="text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(activeStats.totalValue)}
                </span>
              </div>
            </div>
            <button
              onClick={() => onSelectState(activeStateInfo.uf)}
              className="ml-2 p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white transition-colors"
              title={`Acessar obras de ${activeStateInfo.name}`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Brazil Map on Left (7 cols), Aba Resumo por Estado on Right (5 cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Brazil Vector Map with Northeast Glowing Perimeter (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[440px] sm:min-h-[520px] bg-slate-950/40 rounded-2xl border border-slate-800/80 p-3">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[11px] text-slate-300 shadow">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '40s' }} />
            <span className="font-mono">MAPA DO BRASIL • NORDESTE ATIVO</span>
          </div>

          <div className="w-full max-w-[620px] aspect-[900/850] relative flex items-center justify-center">
            <svg
              viewBox="0 0 900 850"
              className="w-full h-full filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Neon glow filter specifically for Northeast boundaries */}
                <filter id="glow-nordeste-boundary" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* State gradients */}
                <linearGradient id="grad-active-ne" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#004171" />
                </linearGradient>

                <linearGradient id="grad-works-ne" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="100%" stopColor="#0c4a6e" />
                </linearGradient>

                <linearGradient id="grad-idle-ne" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#162c46" />
                  <stop offset="100%" stopColor="#0e1f32" />
                </linearGradient>
              </defs>

              {/* 1. Other Brazilian Regions (Background context, non-selectable) */}
              <g id="other-regions" opacity="0.35">
                {BRAZIL_OTHER_REGIONS.map((region) => (
                  <path
                    key={region.name}
                    d={region.path}
                    fill="#0b1726"
                    stroke="#1e293b"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className="cursor-not-allowed"
                  >
                    <title>{region.name} (Região fora da cobertura ativa)</title>
                  </path>
                ))}
              </g>

              {/* 2. Destaque Marcante do Contorno da Região Nordeste */}
              <path
                d={NORDESTE_OUTER_CONTOUR}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinejoin="round"
                filter="url(#glow-nordeste-boundary)"
                opacity="0.85"
                className="pointer-events-none"
              />

              {/* 3. Os 9 Estados do Nordeste (Interativos e Clicáveis) */}
              <g id="nordeste-states">
                {Object.values(NORDESTE_STATES).map((state) => {
                  const stateStats = worksByState[state.uf];
                  const hasWorks = stateStats.count > 0;
                  const isHovered = hoveredState === state.uf;
                  const isSelected = selectedState === state.uf;

                  return (
                    <g
                      key={state.uf}
                      className="cursor-pointer transition-all duration-300 group"
                      onMouseEnter={() => setHoveredState(state.uf)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => onSelectState(state.uf)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Estado ${state.name}: ${stateStats.count} obras`}
                    >
                      <path
                        d={state.path}
                        fill={
                          isSelected
                            ? 'url(#grad-active-ne)'
                            : isHovered
                            ? '#0284c7'
                            : hasWorks
                            ? 'url(#grad-works-ne)'
                            : 'url(#grad-idle-ne)'
                        }
                        stroke={
                          isSelected || isHovered
                            ? '#38bdf8'
                            : hasWorks
                            ? '#0ea5e9'
                            : '#224666'
                        }
                        strokeWidth={isSelected || isHovered ? '2.5' : hasWorks ? '2' : '1.5'}
                        strokeLinejoin="round"
                        className="transition-colors duration-200"
                      />

                      {/* Pulsing ring if has works */}
                      {hasWorks && (
                        <circle
                          cx={state.badgePos.x}
                          cy={state.badgePos.y}
                          r={isHovered ? '16' : '12'}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          className="animate-ping opacity-75 origin-center pointer-events-none"
                        />
                      )}

                      {/* State UF Label */}
                      <text
                        x={state.labelPos.x}
                        y={state.labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-bold text-xs pointer-events-none select-none tracking-wider"
                        fill={isSelected || isHovered ? '#ffffff' : hasWorks ? '#e0f2fe' : '#94a3b8'}
                        style={{
                          fontFamily: 'Inter, system-ui, sans-serif',
                          fontWeight: 700,
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                        }}
                      >
                        {state.uf}
                      </text>

                      {/* Works count badge */}
                      {hasWorks && (
                        <g className="pointer-events-none">
                          <circle
                            cx={state.badgePos.x}
                            cy={state.badgePos.y}
                            r="10"
                            fill={isSelected || isHovered ? '#0ea5e9' : '#004171'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                          />
                          <text
                            x={state.badgePos.x}
                            y={state.badgePos.y + 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="700"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            {stateStats.count}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between w-full px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Apenas os 9 estados da Região Nordeste estão ativos para seleção
            </span>
            <span className="text-cyan-400 font-medium">Clique no estado ou na aba ao lado</span>
          </div>
        </div>

        {/* ABA RESUMO LATERAL: RESUMO POR ESTADO (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Aba Resumo — Estados do Nordeste
            </h3>
            <span className="text-xs text-cyan-400 font-medium">
              Total: {works.length} obras
            </span>
          </div>

          <div className="space-y-2.5 max-h-[530px] overflow-y-auto pr-1 custom-scrollbar">
            {Object.values(NORDESTE_STATES).map((state) => {
              const stats = worksByState[state.uf];
              const isSelected = selectedState === state.uf;
              const isHovered = hoveredState === state.uf;
              const hasWorks = stats.count > 0;

              return (
                <div
                  key={state.uf}
                  onClick={() => onSelectState(state.uf)}
                  onMouseEnter={() => setHoveredState(state.uf)}
                  onMouseLeave={() => setHoveredState(null)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20'
                      : isHovered
                      ? 'bg-slate-800/90 border-cyan-500/60 translate-x-1'
                      : hasWorks
                      ? 'bg-slate-900/80 border-cyan-500/20 hover:border-cyan-500/50'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                        isSelected || isHovered
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                          : hasWorks
                          ? 'bg-[#004171] text-cyan-200 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {state.uf}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{state.name}</h4>
                        <span className="text-[11px] text-slate-400">Capital: {state.capital}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        hasWorks ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {stats.count} {stats.count === 1 ? 'obra' : 'obras'}
                      </span>
                    </div>
                  </div>

                  {hasWorks && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-800/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Avanço Físico Médio:</span>
                        <span className="font-bold text-cyan-300">{stats.avgProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${stats.avgProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] pt-0.5">
                        <span className="text-slate-400">Investimento Total:</span>
                        <span className="font-semibold text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.totalValue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

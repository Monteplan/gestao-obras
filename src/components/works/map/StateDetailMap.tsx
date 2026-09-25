import React, { useState } from 'react';
import { Work } from '../../../types';
import { NORDESTE_STATES, STATE_MUNICIPALITIES } from './map-data';
import { ArrowLeft, Building2, MapPin, ChevronRight, TrendingUp, DollarSign, Compass, Layers } from 'lucide-react';

interface StateDetailMapProps {
  uf: string;
  works: Work[];
  selectedCity: string | null;
  onSelectCity: (cityName: string) => void;
  onBackToNordeste: () => void;
}

export const StateDetailMap: React.FC<StateDetailMapProps> = ({
  uf,
  works,
  selectedCity,
  onSelectCity,
  onBackToNordeste,
}) => {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const stateInfo = NORDESTE_STATES[uf] || {
    uf,
    name: uf,
    capital: '',
    path: '',
    labelPos: { x: 0, y: 0 },
    badgePos: { x: 0, y: 0 },
  };

  // Filtrar apenas as obras deste estado
  const stateWorks = works.filter((w) => w.state === uf);

  // Resumo agrupado por cidade
  const citiesWithWorks = React.useMemo(() => {
    const map: Record<string, { count: number; works: Work[]; totalValue: number; avgProgress: number }> = {};
    stateWorks.forEach((w) => {
      if (!map[w.city]) {
        map[w.city] = { count: 0, works: [], totalValue: 0, avgProgress: 0 };
      }
      map[w.city].count += 1;
      map[w.city].works.push(w);
      map[w.city].totalValue += w.contract_value || 0;
      map[w.city].avgProgress += w.progress_percent || 0;
    });

    Object.keys(map).forEach((c) => {
      map[c].avgProgress = Math.round(map[c].avgProgress / map[c].count);
    });

    return map;
  }, [stateWorks]);

  // Lista de municípios e delimitações cartográficas cadastradas para este estado
  const rawMunicipalities = STATE_MUNICIPALITIES[uf] || [];

  // Se houver alguma cidade nas obras que não conste na delimitação vetorial padrão, adicionamos um fallback
  const municipalities = React.useMemo(() => {
    const list = [...rawMunicipalities];
    Object.keys(citiesWithWorks).forEach((cityName, idx) => {
      if (!list.some((m) => m.name.toLowerCase() === cityName.toLowerCase())) {
        list.push({
          id: `fallback-${idx}`,
          name: cityName,
          uf,
          hasWorks: true,
          path: `M ${220 + idx * 80},${220 + idx * 60} L ${300 + idx * 80},${210 + idx * 60} L ${310 + idx * 80},${290 + idx * 60} L ${230 + idx * 80},${300 + idx * 60} Z`,
          center: { x: 265 + idx * 80, y: 255 + idx * 60 },
        });
      }
    });
    return list;
  }, [rawMunicipalities, citiesWithWorks, uf]);

  const totalValue = stateWorks.reduce((acc, w) => acc + (w.contract_value || 0), 0);
  const avgProgress = stateWorks.length > 0
    ? Math.round(stateWorks.reduce((acc, w) => acc + (w.progress_percent || 0), 0) / stateWorks.length)
    : 0;

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-900 via-[#071829] to-[#040e19] border border-cyan-500/30 shadow-2xl p-4 sm:p-6 overflow-hidden">
      {/* Blueprint grid background */}
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

      {/* Top Header & Breadcrumb */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToNordeste}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-200 border border-slate-700 hover:border-cyan-400/50 transition-all flex items-center gap-1 text-xs font-semibold shadow"
            title="Retornar ao Mapa do Brasil / Nordeste"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nordeste</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Estado ({stateInfo.uf})
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {stateInfo.name} — Delimitação Municipal
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Delimitação de cidades visível. Apenas municípios com obras ativas estão destacados e disponíveis para clique.
            </p>
          </div>
        </div>

        {/* State Summary KPIs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2.5 sm:px-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total de Obras</span>
            <span className="text-base sm:text-lg font-bold text-cyan-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              {stateWorks.length}
            </span>
          </div>
          <div className="flex flex-col border-x border-slate-700/60 px-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Progresso Médio</span>
            <span className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              {avgProgress}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Investimento</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-0.5">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              {new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL' }).format(totalValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: State Map with Municipalities on Left (7 cols), Aba Resumo por Cidade on Right (5 cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* State Map Canvas with Municipal Boundaries (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[440px] sm:min-h-[520px] bg-slate-950/40 rounded-2xl border border-slate-800/80 p-4">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[11px] text-slate-300 shadow">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">MALHA MUNICIPAL • {stateInfo.name.toUpperCase()}</span>
          </div>

          <div className="w-full max-w-[540px] aspect-square relative flex items-center justify-center">
            <svg
              viewBox="0 0 650 650"
              className="w-full h-full filter drop-shadow-[0_12px_30px_rgba(0,180,216,0.15)] select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Glow filter for active municipality */}
                <filter id="glow-municipality" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <linearGradient id="grad-active-muni" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#004171" />
                </linearGradient>

                <linearGradient id="grad-work-muni" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="100%" stopColor="#0a3d62" />
                </linearGradient>
              </defs>

              {/* Render all Municipal Boundaries */}
              {municipalities.map((muni) => {
                const hasWorks = muni.hasWorks && Boolean(citiesWithWorks[muni.name]);
                const isHovered = hoveredCity === muni.name;
                const isSelected = selectedCity === muni.name;
                const cityStats = citiesWithWorks[muni.name];

                if (!hasWorks) {
                  // Cidades sem obras: delimitação sutil, sem clique, sem destaque
                  return (
                    <path
                      key={muni.id}
                      d={muni.path}
                      fill="#071828"
                      stroke="#162e47"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                      className="cursor-default transition-colors opacity-70 hover:opacity-90"
                    >
                      <title>{muni.name} (Sem obras cadastradas)</title>
                    </path>
                  );
                }

                // Cidades COM OBRAS: destaque, brilho, hover e clique habilitado
                return (
                  <g
                    key={muni.id}
                    className="cursor-pointer transition-all duration-300 group"
                    onMouseEnter={() => setHoveredCity(muni.name)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => onSelectCity(muni.name)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Cidade ${muni.name}: ${cityStats?.count || 0} obras`}
                  >
                    {/* Municipal Polygon */}
                    <path
                      d={muni.path}
                      fill={
                        isSelected
                          ? 'url(#grad-active-muni)'
                          : isHovered
                          ? '#0284c7'
                          : 'url(#grad-work-muni)'
                      }
                      stroke={
                        isSelected || isHovered
                          ? '#38bdf8'
                          : '#0ea5e9'
                      }
                      strokeWidth={isSelected || isHovered ? '2.5' : '2'}
                      strokeLinejoin="round"
                      filter={isSelected || isHovered ? 'url(#glow-municipality)' : undefined}
                      className="transition-colors duration-200"
                    />

                    {/* Ping wave at center */}
                    <circle
                      cx={muni.center.x}
                      cy={muni.center.y}
                      r={isHovered ? '16' : '12'}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      className="animate-ping opacity-75 origin-center pointer-events-none"
                    />

                    {/* Marker circle */}
                    <circle
                      cx={muni.center.x}
                      cy={muni.center.y}
                      r="10"
                      fill={isSelected || isHovered ? '#0ea5e9' : '#004171'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter="drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
                    />

                    {/* Number of works text inside marker */}
                    <text
                      x={muni.center.x}
                      y={muni.center.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="700"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {cityStats?.count || 1}
                    </text>

                    {/* City Label Box */}
                    <g className="pointer-events-none">
                      <rect
                        x={muni.center.x - 45}
                        y={muni.center.y + 14}
                        width="90"
                        height="20"
                        rx="5"
                        fill="#021526"
                        stroke="#0ea5e9"
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x={muni.center.x}
                        y={muni.center.y + 24}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="700"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {muni.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between w-full px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Delimitações municipais ativas apenas onde constam obras
            </span>
            <span className="text-cyan-400 font-medium">Clique na cidade destacada</span>
          </div>
        </div>

        {/* ABA RESUMO LATERAL: RESUMO POR CIDADE (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Aba Resumo — Cidades de {stateInfo.uf}
            </h3>
            <span className="text-xs text-slate-400">
              {Object.keys(citiesWithWorks).length} com obras
            </span>
          </div>

          {Object.keys(citiesWithWorks).length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Nenhuma obra cadastrada em {stateInfo.name}.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[530px] overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(citiesWithWorks).map(([cityName, data]) => {
                const isHovered = hoveredCity === cityName;
                const isSelected = selectedCity === cityName;

                return (
                  <div
                    key={cityName}
                    onClick={() => onSelectCity(cityName)}
                    onMouseEnter={() => setHoveredCity(cityName)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : isHovered
                        ? 'bg-slate-800/90 border-cyan-500/60 translate-x-1'
                        : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{cityName}</h4>
                          <span className="text-[11px] text-slate-400">
                            {data.count} {data.count === 1 ? 'obra em execução' : 'obras em execução'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-5 h-5 transition-transform ${isHovered ? 'text-cyan-400 translate-x-1' : 'text-slate-500'}`} />
                    </div>

                    <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-800/80">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Avanço Físico Médio:</span>
                        <span className="font-bold text-cyan-300">{data.avgProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${data.avgProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Investimento Previsto:</span>
                        <span className="font-semibold text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(data.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

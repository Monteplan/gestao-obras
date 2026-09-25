import React, { useState } from 'react';
import { Work } from '../../../types';
import { ArrowLeft, MapPin, Building2, ExternalLink, Compass, CheckCircle2, AlertCircle, Clock, Copy, Check, X } from 'lucide-react';

interface CityWorksMapProps {
  cityName: string;
  uf: string;
  works: Work[];
  onBackToState: () => void;
  onOpenWorkCard: (work: Work) => void;
  onNavigateToWorkDetail: (workId: string) => void;
}

export const CityWorksMap: React.FC<CityWorksMapProps> = ({
  cityName,
  uf,
  works,
  onBackToState,
  onOpenWorkCard,
  onNavigateToWorkDetail,
}) => {
  const [activePinWorkId, setActivePinWorkId] = useState<string | null>(null);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);

  // Filtrar apenas obras da cidade e estado selecionados
  const cityWorks = works.filter(
    (w) => w.city.toLowerCase() === cityName.toLowerCase() && w.state === uf
  );

  const handleCopyAddress = (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullAddress = `${work.address || ''}${work.neighborhood ? ` - ${work.neighborhood}` : ''}, ${work.city} - ${work.state}${work.postal_code ? `, CEP: ${work.postal_code}` : ''}`;
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddressId(work.id);
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  // Coordenadas calculadas ou distribuídas para renderização uniforme na malha urbana da cidade
  const worksWithCoords = cityWorks.map((work, index) => {
    let x = work.map_coordinates?.x;
    let y = work.map_coordinates?.y;

    if (x === undefined || y === undefined) {
      const fallbackPoints = [
        { x: 42, y: 36 },
        { x: 68, y: 52 },
        { x: 30, y: 64 },
        { x: 58, y: 72 },
        { x: 74, y: 32 },
      ];
      const point = fallbackPoints[index % fallbackPoints.length];
      x = point.x;
      y = point.y;
    }

    return { ...work, computedX: x, computedY: y };
  });

  const getStatusBadge = (status: Work['status']) => {
    switch (status) {
      case 'em_andamento':
        return { label: 'Em Andamento', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: Clock };
      case 'concluida':
        return { label: 'Concluída', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 };
      case 'pausada':
        return { label: 'Pausada', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: AlertCircle };
      case 'planejamento':
        return { label: 'Planejamento', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: Clock };
      case 'cancelada':
        return { label: 'Cancelada', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: AlertCircle };
      default:
        return { label: status, color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock };
    }
  };

  const activeWorkForCard = worksWithCoords.find((w) => w.id === activePinWorkId);

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-900 via-[#071829] to-[#040e19] border border-cyan-500/30 shadow-2xl p-4 sm:p-6 overflow-hidden">
      {/* Blueprint grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(14, 165, 233, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(14, 165, 233, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}
      />

      {/* Header & Breadcrumb */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToState}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-200 border border-slate-700 hover:border-cyan-400/50 transition-all flex items-center gap-1.5 text-xs font-semibold shadow"
            title={`Retornar ao Mapa de ${uf}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Estado ({uf})</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Visão Completa da Cidade
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {cityName} — {uf}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualização limpa com símbolos das obras. Clique no símbolo para abrir o card resumo.
            </p>
          </div>
        </div>

        {/* Count Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-cyan-500/30 text-xs font-medium text-slate-300">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span>{cityWorks.length} {cityWorks.length === 1 ? 'obra localizada' : 'obras localizadas'}</span>
        </div>
      </div>

      {/* Main Grid: Full City Map on Left (7 cols), Aba Resumo: Relação de Obras on Right (5 cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Full City Map Canvas (7 cols) */}
        <div 
          className="lg:col-span-7 flex flex-col relative min-h-[440px] sm:min-h-[520px] bg-slate-950/70 rounded-2xl border border-cyan-500/30 p-3 overflow-hidden"
          onClick={() => setActivePinWorkId(null)}
        >
          {/* Top overlay badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs text-cyan-300 shadow pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '30s' }} />
            <span className="font-mono font-semibold">PERÍMETRO URBANO • {cityName.toUpperCase()}</span>
          </div>

          {/* SVG Urban Grid Map */}
          <div className="relative w-full h-[410px] sm:h-[480px] rounded-xl overflow-hidden bg-[#03111f]">
            <svg
              viewBox="0 0 800 600"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="city-road-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Waterway / Coastal curve if coastal city */}
              <path
                d="M 50,0 C 200,60 450,40 800,90 L 800,0 L 50,0 Z"
                fill="#032b49"
                opacity="0.6"
              />
              <path
                d="M 50,5 C 200,65 450,45 800,95"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 4"
                fill="none"
                opacity="0.5"
              />

              {/* Urban Sector Blocks / City Perimeter Layout */}
              <rect x="120" y="110" width="160" height="120" rx="10" fill="#082238" stroke="#0e3a5f" strokeWidth="1.5" />
              <rect x="310" y="110" width="200" height="140" rx="10" fill="#092740" stroke="#0e3a5f" strokeWidth="1.5" />
              <rect x="540" y="130" width="180" height="160" rx="10" fill="#082238" stroke="#0e3a5f" strokeWidth="1.5" />

              <rect x="100" y="260" width="170" height="150" rx="10" fill="#092740" stroke="#0e3a5f" strokeWidth="1.5" />
              <rect x="300" y="280" width="190" height="170" rx="10" fill="#0a2e4c" stroke="#0e3a5f" strokeWidth="1.5" />
              <rect x="520" y="320" width="210" height="180" rx="10" fill="#092740" stroke="#0e3a5f" strokeWidth="1.5" />

              <rect x="130" y="440" width="220" height="120" rx="10" fill="#082238" stroke="#0e3a5f" strokeWidth="1.5" />
              <rect x="380" y="470" width="260" height="100" rx="10" fill="#092740" stroke="#0e3a5f" strokeWidth="1.5" />

              {/* Expressways and Arterials */}
              <line x1="0" y1="245" x2="800" y2="245" stroke="url(#city-road-grad)" strokeWidth="4" />
              <line x1="0" y1="245" x2="800" y2="245" stroke="#38bdf8" strokeWidth="1" strokeDasharray="10 10" />

              <line x1="0" y1="420" x2="800" y2="420" stroke="url(#city-road-grad)" strokeWidth="3.5" />
              <line x1="0" y1="420" x2="800" y2="420" stroke="#38bdf8" strokeWidth="1" strokeDasharray="8 8" />

              <line x1="285" y1="0" x2="285" y2="600" stroke="url(#city-road-grad)" strokeWidth="4" />
              <line x1="285" y1="0" x2="285" y2="600" stroke="#38bdf8" strokeWidth="1" strokeDasharray="10 10" />

              <line x1="505" y1="0" x2="505" y2="600" stroke="url(#city-road-grad)" strokeWidth="3.5" />
              <line x1="505" y1="0" x2="505" y2="600" stroke="#38bdf8" strokeWidth="1" strokeDasharray="8 8" />

              <path d="M 80,520 L 400,245 L 720,100" stroke="#0ea5e9" strokeWidth="2.5" strokeOpacity="0.7" fill="none" />

              {/* Radar rings */}
              <circle cx="400" cy="300" r="280" fill="none" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />
              <circle cx="400" cy="300" r="180" fill="none" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />
            </svg>

            {/* SÍMBOLOS DAS OBRAS NO MAPA (APENAS O SÍMBOLO, SEM CARDS CONTINUOS) */}
            {worksWithCoords.map((work) => {
              const isActive = activePinWorkId === work.id;

              return (
                <div
                  key={work.id}
                  style={{ left: `${work.computedX}%`, top: `${work.computedY}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePinWorkId(isActive ? null : work.id);
                  }}
                  title={`Clique para abrir o card resumo de ${work.name}`}
                >
                  {/* Radar wave */}
                  <span className="absolute -inset-2.5 rounded-full bg-cyan-400 opacity-60 animate-ping pointer-events-none" />

                  {/* Símbolo Limpo da Obra */}
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-11 h-11 bg-cyan-400 text-slate-950 ring-4 ring-white shadow-2xl shadow-cyan-400/80 scale-125'
                        : 'w-9 h-9 bg-gradient-to-tr from-[#004171] to-[#0284c7] hover:bg-cyan-500 text-white border-2 border-cyan-300 hover:scale-110 shadow-lg shadow-cyan-500/40'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} />
                  </div>
                </div>
              );
            })}

            {/* CARD RESUMO NO MAPA: SOMENTE APARECE QUANDO CLICADO */}
            {activeWorkForCard && (
              <div
                style={{
                  left: `${activeWorkForCard.computedX}%`,
                  top: `${activeWorkForCard.computedY}%`,
                }}
                className="absolute z-40 transform -translate-x-1/2 -translate-y-full mb-3 min-w-[280px] max-w-[340px] animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-400/90 rounded-2xl p-4 shadow-2xl shadow-cyan-950/90 text-left">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                      {activeWorkForCard.code}
                    </span>
                    <button
                      onClick={() => setActivePinWorkId(null)}
                      className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                      title="Fechar resumo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-2 leading-tight">
                    {activeWorkForCard.name}
                  </h4>

                  {/* ENDEREÇO EM DESTAQUE NO CARD RESUMO */}
                  <div className="bg-cyan-950/70 border border-cyan-500/50 rounded-xl p-2.5 mb-3">
                    <div className="flex items-start gap-2 text-cyan-200 text-xs font-medium">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {activeWorkForCard.address || 'Endereço em cadastramento'}
                        {activeWorkForCard.neighborhood ? ` - ${activeWorkForCard.neighborhood}` : ''}
                      </span>
                    </div>
                    {activeWorkForCard.postal_code && (
                      <div className="text-[10px] text-cyan-300 font-mono mt-1 pl-5">
                        CEP: {activeWorkForCard.postal_code}
                      </div>
                    )}
                  </div>

                  {/* Progress & Value */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Avanço Físico:</span>
                      <span className="font-bold text-cyan-300">{activeWorkForCard.progress_percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                        style={{ width: `${activeWorkForCard.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenWorkCard(activeWorkForCard)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#004171] to-[#0284c7] hover:from-[#003358] hover:to-[#0369a1] text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Abrir Card Individual Completo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Símbolos georreferenciados. Clique no símbolo para abrir o card resumo.
            </span>
            <span className="text-cyan-400 font-medium">Card individual na aba ao lado</span>
          </div>
        </div>

        {/* ABA RESUMO LATERAL: RELAÇÃO DE OBRAS DA CIDADE (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Aba Resumo — Relação de Obras ({cityWorks.length})
            </h3>
            <span className="text-xs text-slate-400">{cityName} - {uf}</span>
          </div>

          {cityWorks.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Nenhuma obra cadastrada em {cityName}.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[530px] overflow-y-auto pr-1 custom-scrollbar">
              {cityWorks.map((work) => {
                const isActive = activePinWorkId === work.id;
                const badge = getStatusBadge(work.status);

                return (
                  <div
                    key={work.id}
                    onClick={() => {
                      setActivePinWorkId(work.id);
                      onOpenWorkCard(work);
                    }}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/95 border-cyan-400 shadow-xl shadow-cyan-950/60 translate-x-1'
                        : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Top Row: Code & Status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                        {work.code}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badge.color}`}>
                        <badge.icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>

                    {/* Work Name */}
                    <h4 className="text-sm font-bold text-white mb-2 line-clamp-1 hover:text-cyan-300">
                      {work.name}
                    </h4>

                    {/* ENDEREÇO EM DESTAQUE NA RELAÇÃO DE OBRAS */}
                    <div className="bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/40 rounded-xl p-2.5 mb-3 shadow-inner">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="p-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 block">
                              Endereço em Destaque
                            </span>
                            <p className="text-xs font-medium text-slate-100 leading-snug">
                              {work.address || 'Endereço em cadastramento'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300 mt-1">
                              {work.neighborhood && (
                                <span>Bairro: <strong className="text-cyan-200">{work.neighborhood}</strong></span>
                              )}
                              {work.postal_code && (
                                <span className="font-mono text-cyan-300">CEP: {work.postal_code}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleCopyAddress(work, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-200 transition-colors shrink-0"
                          title="Copiar endereço"
                        >
                          {copiedAddressId === work.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Avanço Físico Real</span>
                        <span className="font-bold text-cyan-300">{work.progress_percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${work.progress_percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-bold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(work.contract_value || 0)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWorkCard(work);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-colors"
                        >
                          Card Individual
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToWorkDetail(work.id);
                          }}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Acessar página completa da obra"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
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

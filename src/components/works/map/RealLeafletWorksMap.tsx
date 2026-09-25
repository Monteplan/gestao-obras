import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Work } from '../../../types';
import { REAL_STATE_GEOS, REAL_CITIES, NORDESTE_STATES } from './map-data';
import { NORDESTE_GEOJSON } from './nordeste-geojson';
import { WorkQuickCardModal } from './WorkQuickCardModal';
import {
  Map as MapIcon,
  Layers,
  Sparkles,
  Building2,
  MapPin,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export type MapTileTheme = 'google' | 'monteplan' | 'satellite';
export type NavigationLevel = 'nordeste' | 'state' | 'city';

interface RealLeafletWorksMapProps {
  works: Work[];
  onNavigateToWorkDetail: (workId: string) => void;
  onFilterChange?: (filter: { state?: string; city?: string }) => void;
}

export const RealLeafletWorksMap: React.FC<RealLeafletWorksMapProps> = ({
  works,
  onNavigateToWorkDetail,
  onFilterChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [tileTheme, setTileTheme] = useState<MapTileTheme>('google');
  const [level, setLevel] = useState<NavigationLevel>('nordeste');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [modalWork, setModalWork] = useState<Work | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mapeamento de Obras por Estado
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

  // Obras do Estado Selecionado
  const stateWorks = React.useMemo(() => {
    if (!selectedState) return [];
    return works.filter((w) => w.state === selectedState);
  }, [works, selectedState]);

  // Cidades do Estado com Obras
  const stateCitiesWithWorks = React.useMemo(() => {
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

  // Obras da Cidade Selecionada
  const cityWorks = React.useMemo(() => {
    if (!selectedCity || !selectedState) return [];
    return works.filter(
      (w) => w.city.toLowerCase() === selectedCity.toLowerCase() && w.state === selectedState
    );
  }, [works, selectedCity, selectedState]);

  // Inicialização do Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Criar instância Leaflet com visão inicial no Nordeste do Brasil
    const map = L.map(mapContainerRef.current, {
      center: [-7.8, -38.8],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
    });

    // Adicionar controle de zoom estilizado
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    vectorLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Troca de Estilo de Mapa (TileLayer)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    let attribution = '&copy; Esri &mdash; World Street Map';
    let maxZoom = 19;

    if (tileTheme === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; World Imagery';
    } else if (tileTheme === 'monteplan') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Dark Canvas';
    }

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom,
      className: tileTheme === 'monteplan' ? 'monteplan-map-tiles' : undefined,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [tileTheme]);

  // Atualização dos Elementos Vetoriais no Mapa conforme o Nível
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = vectorLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // ========================================================
    // NÍVEL 1: REGIONAL (NORDESTE / BRASIL COM DELIMITAÇÃO REAL DO IBGE)
    // ========================================================
    if (level === 'nordeste') {
      // 1. Malha Geográfica Oficial do IBGE: 9 estados contíguos sem nenhum espaço vazio
      const geoJsonLayer = L.geoJSON(NORDESTE_GEOJSON, {
        style: (feature) => {
          const uf = feature?.properties?.uf || '';
          const stats = worksByState[uf] || { count: 0 };
          const hasWorks = stats.count > 0;
          const isSelected = selectedState === uf;

          return {
            color: isSelected ? '#38bdf8' : hasWorks ? '#0284c7' : '#475569',
            weight: isSelected ? 3 : hasWorks ? 2 : 1.2,
            fillColor: isSelected ? '#0284c7' : hasWorks ? '#004171' : '#1e293b',
            fillOpacity: isSelected ? 0.65 : hasWorks ? 0.5 : 0.25,
            className: 'state-polygon-interactive',
          };
        },
        onEachFeature: (feature, layer) => {
          const uf = feature?.properties?.uf || '';
          layer.on({
            click: () => handleSelectState(uf),
            mouseover: () => {
              setHoveredEntity(uf);
              (layer as L.Path).setStyle({
                color: '#38bdf8',
                weight: 3,
                fillOpacity: 0.75,
              });
            },
            mouseout: () => {
              setHoveredEntity(null);
              geoJsonLayer.resetStyle(layer as any);
            },
          });
        },
      });

      geoJsonLayer.addTo(layerGroup);

      // 2. Badges com a Sigla e Contagem no Centro de cada Estado
      Object.entries(REAL_STATE_GEOS).forEach(([uf, stateGeo]) => {
        const stats = worksByState[uf];
        const hasWorks = stats.count > 0;

        const badgeHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
            <div class="px-2.5 py-1 rounded-lg border-2 shadow-xl font-bold text-xs flex items-center gap-1.5 backdrop-blur-md" style="background-color: ${hasWorks ? '#004171' : '#1e293b'} !important; border-color: ${hasWorks ? '#38bdf8' : '#475569'} !important; color: #ffffff !important;">
              <span style="color: #ffffff !important; font-weight: 700;">${uf}</span>
              ${hasWorks ? `<span style="background-color: #38bdf8 !important; color: #020617 !important; font-weight: 900; font-size: 10px; line-height: 1;" class="px-1.5 py-0.5 rounded-full">${stats.count}</span>` : ''}
            </div>
            ${hasWorks ? `<span class="absolute -inset-1 rounded-lg bg-cyan-400 opacity-40 animate-ping pointer-events-none"></span>` : ''}
          </div>
        `;

        const badgeIcon = L.divIcon({
          html: badgeHtml,
          className: 'custom-leaflet-div-icon',
          iconSize: [60, 30],
          iconAnchor: [30, 15],
        });

        const marker = L.marker(stateGeo.center, { icon: badgeIcon });
        marker.on('click', () => handleSelectState(uf));
        marker.addTo(layerGroup);
      });
    }

    // ========================================================
    // NÍVEL 2: ESTADUAL (COM DELIMITAÇÃO REAL DO IBGE)
    // ========================================================
    else if (level === 'state' && selectedState) {
      // Contorno Oficial do IBGE para o Estado Selecionado
      const selectedFeature = NORDESTE_GEOJSON.features.find(
        (f: any) => f.properties?.uf === selectedState
      );
      if (selectedFeature) {
        L.geoJSON(selectedFeature, {
          style: {
            color: '#38bdf8',
            weight: 3,
            fillColor: '#004171',
            fillOpacity: 0.18,
            dashArray: '4 4',
          },
        }).addTo(layerGroup);
      }

      // Cidades do Estado
      Object.entries(REAL_CITIES).forEach(([cityName, cityGeo]) => {
        if (cityGeo.uf !== selectedState) return;

        const cityStats = stateCitiesWithWorks[cityName];
        const hasWorks = Boolean(cityStats && cityStats.count > 0);

        if (!hasWorks) {
          // Cidade sem obras: apenas delimitador sutil de referência (círculo pontilhado)
          L.circle(cityGeo.center, {
            radius: 9000,
            color: '#334155',
            weight: 1,
            fillColor: '#0f172a',
            fillOpacity: 0.1,
            dashArray: '3 3',
          }).addTo(layerGroup);
          return;
        }

        // Cidade COM OBRAS: Destaque, perímetro e pino de clique
        L.circle(cityGeo.center, {
          radius: 12000,
          color: '#0ea5e9',
          weight: 2,
          fillColor: '#0284c7',
          fillOpacity: 0.25,
        }).addTo(layerGroup);

        const cityBadgeHtml = `
          <div class="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-115">
            <div class="w-9 h-9 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-950/80" style="background-color: #004171 !important;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="mt-1 px-2.5 py-1 rounded-md border border-cyan-400 shadow-xl flex items-center gap-1.5" style="background-color: #003358 !important; color: #ffffff !important;">
              <span style="color: #ffffff !important; font-weight: 700; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.6);">${cityName}</span>
              <span style="background-color: #38bdf8 !important; color: #020617 !important; font-weight: 900; font-size: 10px; line-height: 1;" class="px-1.5 py-0.5 rounded-full">${cityStats.count}</span>
            </div>
            <span class="absolute -inset-1 rounded-full bg-cyan-400 opacity-50 animate-ping pointer-events-none"></span>
          </div>
        `;

        const cityIcon = L.divIcon({
          html: cityBadgeHtml,
          className: 'custom-leaflet-div-icon',
          iconSize: [90, 50],
          iconAnchor: [45, 25],
        });

        const cityMarker = L.marker(cityGeo.center, { icon: cityIcon });
        cityMarker.on('click', () => handleSelectCity(cityName));
        cityMarker.addTo(layerGroup);
      });
    }

    // ========================================================
    // NÍVEL 3: MUNICIPAL (VISÃO COMPLETA DA CIDADE COM SÍMBOLOS LIMPOS)
    // ========================================================
    else if (level === 'city' && selectedCity) {
      cityWorks.forEach((work) => {
        const lat = work.latitude || -3.7319;
        const lng = work.longitude || -38.5267;

        // NO MAPA DA CIDADE: APENAS O SÍMBOLO DA OBRA (ESTILO GOOGLE MAPS LIMPO)
        const symbolHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125 group">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#004171] to-[#0284c7] border-2 border-white shadow-2xl flex items-center justify-center text-white ring-4 ring-cyan-500/40">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            </div>
            <span class="absolute -inset-1 rounded-full bg-cyan-400 opacity-60 animate-ping pointer-events-none"></span>
          </div>
        `;

        const workPinIcon = L.divIcon({
          html: symbolHtml,
          className: 'custom-leaflet-div-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([lat, lng], { icon: workPinIcon });

        // CARD RESUMO NO MAPA: SOMENTE APARECE QUANDO CLICADO
        const popupHtml = document.createElement('div');
        popupHtml.className = 'custom-map-popup-card';
        popupHtml.innerHTML = `
          <div class="p-3.5 bg-slate-900 border border-cyan-500/60 rounded-xl shadow-2xl text-left min-w-[260px]" style="background-color: #0f172a !important; color: #ffffff !important;">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/40">${work.code}</span>
              <span class="text-[10px] font-bold text-emerald-400">${work.progress_percent}% Físico</span>
            </div>
            <h4 class="text-xs font-bold mb-2 leading-snug" style="color: #ffffff !important;">${work.name}</h4>
            <div class="rounded-lg p-2.5 mb-2.5 border border-cyan-500/40" style="background-color: #00223d !important;">
              <span class="text-[9px] uppercase font-bold text-cyan-300 block mb-0.5">Endereço em Destaque:</span>
              <p class="text-[11px] font-semibold leading-tight" style="color: #ffffff !important;">${work.address || ''}${work.neighborhood ? ` - ${work.neighborhood}` : ''}</p>
              ${work.postal_code ? `<span class="text-[10px] text-cyan-300 font-mono mt-0.5 block">CEP: ${work.postal_code}</span>` : ''}
            </div>
            <button id="btn-popup-${work.id}" class="w-full py-2 px-2.5 rounded-lg text-[11px] font-bold shadow flex items-center justify-center gap-1 transition-all cursor-pointer" style="background: linear-gradient(to right, #004171, #0284c7) !important; color: #ffffff !important;">
              <span style="color: #ffffff !important; font-weight: 700;">Abrir Card Individual Completo</span>
            </button>
          </div>
        `;

        // Event listener para o botão dentro do popup quando for aberto
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-${work.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalWork(work);
            };
          }
        });

        marker.bindPopup(popupHtml, {
          offset: [0, -10],
          closeButton: true,
          className: 'custom-leaflet-popup',
        });

        marker.addTo(layerGroup);
      });
    }
  }, [level, selectedState, selectedCity, worksByState, stateCitiesWithWorks, cityWorks, tileTheme]);

  // Transição Suave de Câmera (FlyTo)
  const handleSelectState = (uf: string) => {
    setSelectedState(uf);
    setSelectedCity(null);
    setLevel('state');

    if (onFilterChange) {
      onFilterChange({ state: uf, city: undefined });
    }

    const stateGeo = REAL_STATE_GEOS[uf];
    if (mapInstanceRef.current && stateGeo) {
      mapInstanceRef.current.flyTo(stateGeo.center, stateGeo.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  };

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setLevel('city');

    if (onFilterChange && selectedState) {
      onFilterChange({ state: selectedState, city: cityName });
    }

    const cityGeo = REAL_CITIES[cityName];
    if (mapInstanceRef.current && cityGeo) {
      mapInstanceRef.current.flyTo(cityGeo.center, cityGeo.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  };

  const handleResetToNordeste = () => {
    setLevel('nordeste');
    setSelectedState(null);
    setSelectedCity(null);

    if (onFilterChange) {
      onFilterChange({ state: undefined, city: undefined });
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([-7.8, -38.8], 5, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  };

  const handleBackToState = () => {
    if (!selectedState) {
      handleResetToNordeste();
      return;
    }

    setLevel('state');
    setSelectedCity(null);

    if (onFilterChange) {
      onFilterChange({ state: selectedState, city: undefined });
    }

    const stateGeo = REAL_STATE_GEOS[selectedState];
    if (mapInstanceRef.current && stateGeo) {
      mapInstanceRef.current.flyTo(stateGeo.center, stateGeo.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  };

  const handleCopyAddress = (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    const full = `${work.address || ''}${work.neighborhood ? `, ${work.neighborhood}` : ''}, ${work.city} - ${work.state}${work.postal_code ? `, CEP: ${work.postal_code}` : ''}`;
    navigator.clipboard.writeText(full);
    setCopiedId(work.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      default:
        return { label: status, color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock };
    }
  };

  const currentStateInfo = selectedState ? NORDESTE_STATES[selectedState] : null;

  return (
    <div className="w-full space-y-4">
      {/* Top Breadcrumb & Layer Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Breadcrumb Steps */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={handleResetToNordeste}
            style={{ color: level === 'nordeste' ? '#ffffff' : undefined }}
            className={`flex items-center gap-1 font-bold transition-colors px-2.5 py-1 rounded-lg ${
              level === 'nordeste'
                ? 'bg-[#004171] text-white border border-[#004171] shadow-sm'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            <MapIcon className={`w-3.5 h-3.5 ${level === 'nordeste' ? 'text-cyan-300' : 'text-[#004171] dark:text-cyan-400'}`} />
            <span>Brasil / Nordeste</span>
          </button>

          {selectedState && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <button
                onClick={handleBackToState}
                style={{ color: level === 'state' ? '#ffffff' : undefined }}
                className={`flex items-center gap-1 font-bold transition-colors px-2.5 py-1 rounded-lg ${
                  level === 'state'
                    ? 'bg-[#004171] text-white border border-[#004171] shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                <span>Estado: {currentStateInfo?.name || selectedState}</span>
              </button>
            </>
          )}

          {selectedCity && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span
                style={{ color: '#ffffff' }}
                className="flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-[#004171] text-white border border-[#004171] shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                <span>Município: {selectedCity}</span>
              </span>
            </>
          )}

          {level !== 'nordeste' && (
            <button
              onClick={handleResetToNordeste}
              className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white text-[11px] font-medium transition-colors"
              title="Redefinir visualização para o Nordeste"
            >
              <RotateCcw className="w-3 h-3 text-[#004171] dark:text-cyan-400" />
              <span>Visão Geral</span>
            </button>
          )}
        </div>

        {/* Real Map Appearance / Tile Theme Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setTileTheme('google')}
            style={{ color: tileTheme === 'google' ? '#ffffff' : undefined }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              tileTheme === 'google'
                ? 'bg-[#004171] text-white shadow'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
            }`}
            title="Cartografia Realista estilo Google Maps"
          >
            🗺️ Google Maps
          </button>
          <button
            onClick={() => setTileTheme('monteplan')}
            style={{ color: tileTheme === 'monteplan' ? '#ffffff' : undefined }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              tileTheme === 'monteplan'
                ? 'bg-[#004171] text-white shadow'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
            }`}
            title="Cartografia em tons corporativos Monteplan"
          >
            🌌 Monteplan Azul
          </button>
          <button
            onClick={() => setTileTheme('satellite')}
            style={{ color: tileTheme === 'satellite' ? '#ffffff' : undefined }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              tileTheme === 'satellite'
                ? 'bg-[#004171] text-white shadow'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
            }`}
            title="Visualização Fotográfica de Satélite Real"
          >
            🛰️ Satélite Real
          </button>
        </div>
      </div>

      {/* Main Map Viewport & Dynamic Side Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Real Leaflet Map Container (7 cols) */}
        <div className="lg:col-span-7 flex flex-col relative rounded-2xl border border-slate-200 dark:border-cyan-500/30 overflow-hidden shadow-xl bg-slate-950">
          {/* Top overlay indicator */}
          <div
            className="absolute top-3 left-3 z-[400] flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-cyan-400 text-xs shadow-2xl pointer-events-none"
            style={{ backgroundColor: '#004171', color: '#ffffff' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="font-bold tracking-wide" style={{ color: '#ffffff' }}>
              {level === 'nordeste' && 'MAPA REAL DO BRASIL — DESTAQUE NORDESTE'}
              {level === 'state' && `MAPA REAL DE ${selectedState} — DELIMITAÇÃO DE CIDADES`}
              {level === 'city' && `MAPA REAL URBANO — ${selectedCity?.toUpperCase()}`}
            </span>
          </div>

          {/* Leaflet Map DOM Element */}
          <div
            ref={mapContainerRef}
            className="w-full h-[460px] sm:h-[540px] z-10"
            style={{ minHeight: '460px' }}
          />

          {/* Bottom helper text */}
          <div className="px-4 py-2 bg-white dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#004171] dark:bg-cyan-400 animate-pulse" />
              {level === 'nordeste' && 'Selecione um estado no mapa ou na aba ao lado'}
              {level === 'state' && 'Selecione uma cidade com obras no mapa ou na aba ao lado'}
              {level === 'city' && 'Símbolos limpos. Clique no símbolo no mapa para abrir o card resumo'}
            </span>
            <span className="text-[#004171] dark:text-cyan-400 font-bold">Navegação e zoom habilitados</span>
          </div>
        </div>

        {/* DYNAMIC SIDE SUMMARY PANEL (ABA RESUMO) - 5 cols */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* ========================================================
              ABA RESUMO NÍVEL 1: POR ESTADO
             ======================================================== */}
          {level === 'nordeste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#004171] dark:text-cyan-400" />
                  Aba Resumo — Estados do Nordeste
                </h3>
                <span className="text-xs text-[#004171] dark:text-cyan-400 font-bold">{works.length} obras</span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.values(NORDESTE_STATES).map((state) => {
                  const stats = worksByState[state.uf];
                  const hasWorks = stats.count > 0;
                  const isHovered = hoveredEntity === state.uf;
                  const isSelected = selectedState === state.uf;

                  return (
                    <div
                      key={state.uf}
                      onClick={() => handleSelectState(state.uf)}
                      onMouseEnter={() => setHoveredEntity(state.uf)}
                      onMouseLeave={() => setHoveredEntity(null)}
                      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-cyan-950/80 border-[#004171] dark:border-cyan-400 shadow-md ring-2 ring-[#004171]/20 dark:ring-cyan-500/20'
                          : isHovered
                          ? 'bg-slate-50 dark:bg-slate-800/90 border-[#004171]/60 dark:border-cyan-500/60 translate-x-1 shadow-sm'
                          : hasWorks
                          ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-cyan-500/20 hover:border-[#004171]/50 shadow-sm'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border"
                            style={{
                              backgroundColor: hasWorks ? '#004171' : '#f1f5f9',
                              color: hasWorks ? '#ffffff' : '#64748b',
                              borderColor: hasWorks ? '#38bdf8' : '#cbd5e1',
                            }}
                          >
                            {state.uf}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{state.name}</h4>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">Capital: {state.capital}</span>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            hasWorks
                              ? 'bg-sky-100 text-[#004171] border border-sky-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {stats.count} {stats.count === 1 ? 'obra' : 'obras'}
                        </span>
                      </div>

                      {hasWorks && (
                        <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Avanço Físico Médio:</span>
                            <span className="font-bold text-[#004171] dark:text-cyan-300">{stats.avgProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#004171] to-[#0284c7] dark:from-cyan-500 dark:to-emerald-400 rounded-full"
                              style={{ width: `${stats.avgProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] pt-0.5">
                            <span className="text-slate-600 dark:text-slate-400">Investimento Total:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
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
          )}

          {/* ========================================================
              ABA RESUMO NÍVEL 2: POR CIDADE
             ======================================================== */}
          {level === 'state' && selectedState && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#004171] dark:text-cyan-400" />
                  Aba Resumo — Cidades de {selectedState}
                </h3>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{Object.keys(stateCitiesWithWorks).length} com obras</span>
              </div>

              {Object.keys(stateCitiesWithWorks).length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Nenhuma obra cadastrada em {selectedState}.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(stateCitiesWithWorks).map(([cityName, data]) => {
                    return (
                      <div
                        key={cityName}
                        onClick={() => handleSelectCity(cityName)}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#004171]/50 dark:hover:border-cyan-500/50 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/90 shadow-sm transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#004171] border border-sky-200 dark:bg-cyan-500/20 dark:border-cyan-500/40 flex items-center justify-center dark:text-cyan-300">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#004171] dark:group-hover:text-cyan-300">{cityName}</h4>
                              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                {data.count} {data.count === 1 ? 'obra em execução' : 'obras em execução'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#004171] dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                        </div>

                        <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Avanço Físico Médio:</span>
                            <span className="font-bold text-[#004171] dark:text-cyan-300">{data.avgProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#004171] to-[#0284c7] dark:from-cyan-500 dark:to-emerald-400 rounded-full"
                              style={{ width: `${data.avgProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] pt-1">
                            <span className="text-slate-600 dark:text-slate-400">Investimento Total:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
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
          )}

          {/* ========================================================
              ABA RESUMO NÍVEL 3: RELAÇÃO DE OBRAS DA CIDADE
             ======================================================== */}
          {level === 'city' && selectedCity && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#004171] dark:text-cyan-400" />
                  Aba Resumo — Relação de Obras ({cityWorks.length})
                </h3>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{selectedCity} - {selectedState}</span>
              </div>

              {cityWorks.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Nenhuma obra cadastrada em {selectedCity}.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {cityWorks.map((work) => {
                    const badge = getStatusBadge(work.status);

                    return (
                      <div
                        key={work.id}
                        onClick={() => setModalWork(work)}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#004171]/50 dark:hover:border-cyan-500/50 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/90 shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-mono font-bold text-[#004171] bg-sky-50 dark:text-cyan-400 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-sky-200 dark:border-cyan-500/30">
                            {work.code}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badge.color}`}>
                            <badge.icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 hover:text-[#004171] dark:hover:text-cyan-300">
                          {work.name}
                        </h4>

                        {/* ENDEREÇO EM DESTAQUE */}
                        <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-cyan-950/80 dark:to-slate-900 border border-slate-200 dark:border-cyan-500/40 rounded-xl p-2.5 mb-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <div className="p-1 rounded bg-sky-100 dark:bg-cyan-500/20 text-[#004171] dark:text-cyan-300 shrink-0 mt-0.5">
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#004171] dark:text-cyan-400 block">
                                  Endereço da Obra
                                </span>
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                  {work.address || 'Endereço em cadastramento'}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                                  {work.neighborhood && (
                                    <span>Bairro: <strong className="text-slate-900 dark:text-cyan-200">{work.neighborhood}</strong></span>
                                  )}
                                  {work.postal_code && (
                                    <span className="font-mono text-[#004171] dark:text-cyan-300">CEP: {work.postal_code}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleCopyAddress(work, e)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-cyan-500/20 text-slate-600 dark:text-slate-400 hover:text-[#004171] dark:hover:text-cyan-200 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                              title="Copiar endereço"
                            >
                              {copiedId === work.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Avanço Físico Real</span>
                            <span className="font-bold text-[#004171] dark:text-cyan-300">{work.progress_percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#004171] to-[#0284c7] dark:from-cyan-500 dark:to-emerald-400 rounded-full"
                              style={{ width: `${work.progress_percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(work.contract_value || 0)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalWork(work);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#004171] dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:text-cyan-300 text-xs font-semibold border border-sky-200 dark:border-cyan-500/40 transition-colors"
                            >
                              Card Individual
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToWorkDetail(work.id);
                              }}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors"
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
          )}
        </div>
      </div>

      {/* Individual Work Card Modal */}
      {modalWork && (
        <WorkQuickCardModal
          work={modalWork}
          onClose={() => setModalWork(null)}
          onNavigateToDetail={onNavigateToWorkDetail}
        />
      )}
    </div>
  );
};

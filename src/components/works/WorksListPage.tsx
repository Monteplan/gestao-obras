import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Work } from '../../types';
import { formatBRL, formatPercent, formatDateBR, calculateFinancials, calculateWorkHealth } from '../../lib/utils';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  UserCheck,
  MapPin,
  LayoutGrid,
  List,
  ChevronRight,
  TrendingUp,
  Map,
  Edit3,
} from 'lucide-react';
import { WorkFormModal } from './WorkFormModal';
import { WorksInteractiveMapContainer } from './map/WorksInteractiveMapContainer';
import { DataProvenanceBadge } from '../common/DataProvenanceBadge';

interface WorksListPageProps {
  onSelectWork: (workId: string) => void;
}

export const WorksListPage: React.FC<WorksListPageProps> = ({ onSelectWork }) => {
  const { works, stages, budgetItems, orders, incurredCosts, revenues, addWork, updateWork } = useData();
  const { canEdit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [ufFilter, setUfFilter] = useState('todos');
  const [cityFilter, setCityFilter] = useState('todos');
  const [engineerFilter, setEngineerFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'map' | 'cards' | 'table'>('map');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);

  // Listas de opções para filtros
  const uniqueUfs = Array.from(new Set(works.map(w => w.state || w.city_state?.split('/')[1] || '').filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(works
    .filter(w => ufFilter === 'todos' || (w.state || w.city_state?.split('/')[1]) === ufFilter)
    .map(w => w.city || w.city_state?.split('/')[0] || '')
    .filter(Boolean)
  )).sort();
  const uniqueEngineers = Array.from(new Set(works.map(w => w.engineer_name || w.manager_name).filter(Boolean))).sort();

  const filteredWorks = works.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.manager_name && w.manager_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.engineer_name && w.engineer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.erp_code && w.erp_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const workState = w.state || w.city_state?.split('/')[1] || '';
    const workCity = w.city || w.city_state?.split('/')[0] || '';
    const workEng = w.engineer_name || w.manager_name || '';

    const matchesStatus = statusFilter === 'todos' || w.status === statusFilter;
    const matchesUf = ufFilter === 'todos' || workState === ufFilter;
    const matchesCity = cityFilter === 'todos' || workCity === cityFilter;
    const matchesEng = engineerFilter === 'todos' || workEng === engineerFilter;

    return matchesSearch && matchesStatus && matchesUf && matchesCity && matchesEng;
  });

  const handleSaveWork = (data: any) => {
    if (editingWork) {
      updateWork(editingWork.id, data);
    } else {
      addWork(data);
    }
  };

  const renderCardsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredWorks.map((work) => {
        const fin = calculateFinancials(work, budgetItems, orders, incurredCosts, revenues);
        const health = calculateWorkHealth(work, fin, stages);
        const workUf = work.state || work.city_state?.split('/')[1] || 'BR';
        const workCity = work.city || work.city_state?.split('/')[0] || '';
        const workEng = work.engineer_name || work.manager_name || 'Engenheiro Responsável';

        return (
          <div
            key={work.id}
            onClick={() => onSelectWork(work.id)}
            className="glass-card rounded-2xl border border-slate-800/80 p-5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Header do Card */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold">
                    {work.code}
                  </span>
                  {(work.id === 'work-1' || work.code === 'OBR-001' || work.name.toLowerCase().includes('atrium')) ? (
                    <DataProvenanceBadge type="pco" compact sourceFile="PCO SET/26" />
                  ) : (
                    <DataProvenanceBadge type="demonstracao" compact details="Demonstração" />
                  )}
                  {work.erp_code && (
                    <span className="text-[10px] text-slate-500 font-mono">ERP: {work.erp_code}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 capitalize border border-slate-700">
                    {work.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      health.status === 'normal'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : health.status === 'atencao'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {health.label}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-[#38bdf8] transition-colors tracking-tight">
                {work.name}
              </h3>
              
              <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#004171]/30 text-[#38bdf8] border border-[#1c3e5c] text-[11px] font-semibold">
                  <MapPin className="w-3 h-3 mr-1" />
                  {workCity} - {workUf}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Gestor: <strong className="text-slate-300 font-medium">{work.manager_name}</strong>
                </span>
              </div>
            </div>

            {/* Barra de Avanço Físico Ponderado */}
            <div className="my-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-[#38bdf8]" />
                  Avanço Físico Ponderado
                </span>
                <strong className="text-white font-bold">{formatPercent(work.progress_percent)}</strong>
              </div>
              <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#004171] to-[#38bdf8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${work.progress_percent}%` }}
                />
              </div>
            </div>

            {/* Métricas Financeiras */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Orçado Aprovado</span>
                <strong className="text-slate-200 font-bold">{formatBRL(fin.approvedBudget)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Custo Incorrido</span>
                <strong className="text-cyan-400 font-bold">{formatBRL(fin.incurredCosts)}</strong>
              </div>
            </div>

            {/* Rodapé do Card com Engenheiro Responsável e Ações */}
            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5" title="Engenheiro Responsável da Obra">
                <UserCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span className="font-medium text-slate-300">{workEng}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingWork(work);
                    setIsModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-[#004171] text-[#38bdf8] hover:text-white border border-slate-700/80 hover:border-blue-400 font-semibold transition-all flex items-center space-x-1"
                  title="Editar Gestor, Engenheiro, Status e Dados Cadastrais"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
                <div className="flex items-center space-x-1 text-slate-300 group-hover:text-[#38bdf8] font-medium group-hover:translate-x-0.5 transition-all">
                  <span>Painel</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Busca e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão de Obras</h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastro e acompanhamento de empreendimentos gerenciáveis por Estado (UF), Cidade e Engenheiro Responsável.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canEdit('works') && (
            <button
              onClick={() => {
                setEditingWork(null);
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow-lg shadow-[#004171]/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Obra</span>
            </button>
          )}

          {/* Toggle de Visualização */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-[#004171] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mapa Regional Interativo"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs ${viewMode === 'cards' ? 'bg-[#004171] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs ${viewMode === 'table' ? 'bg-[#004171] text-white' : 'text-slate-400 hover:text-white'}`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avançados: Busca + Status + UF + Cidade + Engenheiro */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por obra, código, ERP, engenheiro ou gestor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Filtro por UF */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">UF:</span>
            <select
              value={ufFilter}
              onChange={(e) => {
                setUfFilter(e.target.value);
                setCityFilter('todos');
              }}
              className="bg-transparent text-[#38bdf8] focus:outline-none cursor-pointer font-bold"
            >
              <option value="todos" className="bg-[#081d2c]">Todas as UFs</option>
              {uniqueUfs.map((uf) => (
                <option key={uf} value={uf} className="bg-[#081d2c]">{uf}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Cidade */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Cidade:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold max-w-[160px] truncate"
            >
              <option value="todos" className="bg-[#081d2c]">Todas as Cidades</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c} className="bg-[#081d2c]">{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Engenheiro Responsável */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Engenheiro:</span>
            <select
              value={engineerFilter}
              onChange={(e) => setEngineerFilter(e.target.value)}
              className="bg-transparent text-[#38bdf8] focus:outline-none cursor-pointer font-bold max-w-[180px] truncate"
            >
              <option value="todos" className="bg-[#081d2c]">Todos os Engenheiros</option>
              {uniqueEngineers.map((eng) => (
                <option key={eng} value={eng} className="bg-[#081d2c]">{eng}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Status */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-semibold"
            >
              <option value="todos" className="bg-[#081d2c]">Todos</option>
              <option value="planejamento" className="bg-[#081d2c]">Planejamento</option>
              <option value="em_andamento" className="bg-[#081d2c]">Em Andamento</option>
              <option value="pausada" className="bg-[#081d2c]">Pausada</option>
              <option value="concluida" className="bg-[#081d2c]">Concluída</option>
            </select>
          </div>

          {(statusFilter !== 'todos' || ufFilter !== 'todos' || cityFilter !== 'todos' || engineerFilter !== 'todos' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('todos');
                setUfFilter('todos');
                setCityFilter('todos');
                setEngineerFilter('todos');
                setSearchTerm('');
              }}
              className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
          <span>Mostrando <strong>{filteredWorks.length}</strong> de {works.length} obras cadastradas</span>
          <span className="text-slate-500">Filtrado por: {ufFilter !== 'todos' ? `UF: ${ufFilter}` : 'Brasil'} {cityFilter !== 'todos' ? `• Cidade: ${cityFilter}` : ''} {engineerFilter !== 'todos' ? `• Resp: ${engineerFilter}` : ''}</span>
        </div>
      </div>

      {/* Visualização em MAPA REGIONAL INTERATIVO */}
      {viewMode === 'map' && (
        <div className="space-y-6 animate-fadeIn">
          <WorksInteractiveMapContainer
            works={works}
            onNavigateToWorkDetail={onSelectWork}
            onFilterChange={({ state, city }) => {
              if (state) setUfFilter(state);
              else setUfFilter('todos');
              if (city) setCityFilter(city);
              else setCityFilter('todos');
            }}
          />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#38bdf8]" />
                <span>
                  Obras Listadas {ufFilter !== 'todos' ? `(${ufFilter}${cityFilter !== 'todos' ? ` • ${cityFilter}` : ''})` : '(Região Nordeste)'}
                </span>
              </h3>
              <span className="text-xs text-slate-400">
                {filteredWorks.length} {filteredWorks.length === 1 ? 'obra encontrada' : 'obras encontradas'}
              </span>
            </div>

            {filteredWorks.length === 0 ? (
              <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-slate-400">
                Nenhuma obra encontrada para esta seleção no mapa.
              </div>
            ) : (
              renderCardsGrid()
            )}
          </div>
        </div>
      )}

      {/* Visualização em CARDS */}
      {viewMode === 'cards' && (
        renderCardsGrid()
      )}

      {/* Visualização em TABELA */}
      {viewMode === 'table' && (
        /* Visualização em TABELA */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nome da Obra</th>
                  <th className="px-4 py-3">Localização (UF / Cidade)</th>
                  <th className="px-4 py-3">Engenheiro Resp.</th>
                  <th className="px-4 py-3">Gestor Contrato</th>
                  <th className="px-4 py-3 text-center">Avanço Físico</th>
                  <th className="px-4 py-3 text-right">Orçamento</th>
                  <th className="px-4 py-3 text-right">Incorrido</th>
                  <th className="px-4 py-3 text-center">Saúde</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWorks.map((work) => {
                  const fin = calculateFinancials(work, budgetItems, orders, incurredCosts, revenues);
                  const health = calculateWorkHealth(work, fin, stages);
                  const workUf = work.state || work.city_state?.split('/')[1] || 'BR';
                  const workCity = work.city || work.city_state?.split('/')[0] || '';
                  const workEng = work.engineer_name || work.manager_name || 'Engenheiro Responsável';

                  return (
                    <tr
                      key={work.id}
                      onClick={() => onSelectWork(work.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-[#38bdf8] font-semibold">{work.code}</td>
                      <td className="px-4 py-3 font-bold text-white group-hover:text-[#38bdf8] transition-colors">{work.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#004171]/25 text-[#38bdf8] font-medium text-[11px]">
                          <MapPin className="w-3 h-3 mr-1" />
                          {workCity} ({workUf})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        <span className="flex items-center">
                          <UserCheck className="w-3 h-3 mr-1 text-[#38bdf8]" />
                          {workEng}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{work.manager_name}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-200">{formatPercent(work.progress_percent)}</td>
                      <td className="px-4 py-3 text-right">{formatBRL(fin.approvedBudget)}</td>
                      <td className="px-4 py-3 text-right font-bold text-cyan-400">{formatBRL(fin.incurredCosts)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                          {health.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={work.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateWork(work.id, { status: e.target.value as any })}
                          className="bg-slate-900 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          title="Alterar status cadastral da obra"
                        >
                          <option value="planejamento">Planejamento</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="pausada">Pausada</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWork(work);
                              setIsModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#38bdf8] hover:text-white font-semibold transition-colors flex items-center space-x-1"
                            title="Editar dados cadastrais: Gestor, Engenheiro, Status"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button className="text-slate-400 hover:text-white font-semibold">Detalhar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <WorkFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWork}
        initialWork={editingWork}
      />
    </div>
  );
};

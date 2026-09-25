import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Stage, Work } from '../../types';
import { formatDateBR, formatPercent, buildStageHierarchy } from '../../lib/utils';
import {
  GitFork,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Percent,
  Sliders,
  TrendingUp,
  X,
  FileEdit,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { GanttChart } from './GanttChart';

interface StagesManagerProps {
  selectedWorkId?: string;
}

export const StagesManager: React.FC<StagesManagerProps> = ({ selectedWorkId }) => {
  const { works, stages, addStage, updateStageProgress, deleteStage } = useData();
  const { canEdit } = useAuth();

  const [currentWorkId, setCurrentWorkId] = useState<string>(selectedWorkId || works[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [newProgress, setNewProgress] = useState<number>(0);
  const [progressInput, setProgressInput] = useState<string>('0.00');
  const [progressReason, setProgressReason] = useState<string>('');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  const toggleStageExpand = (id: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  // Form de Nova Etapa
  const [formData, setFormData] = useState({
    parent_id: '',
    is_substage: false,
    code: '',
    name: '',
    responsible: '',
    weight_percent: 10,
    planned_start: '',
    planned_end: '',
    budget_planned: 0,
    notes: '',
  });

  const activeWork = works.find((w) => w.id === currentWorkId);
  const workStages = stages.filter((s) => s.work_id === currentWorkId);
  const rootStages = workStages.filter((s) => !s.parent_id);
  const hierarchicalStages = buildStageHierarchy(workStages);

  // Soma de pesos das macroetapas e verificação de balanço (100.00%)
  const rootWeightsSum = rootStages.reduce((acc, s) => acc + (s.weight_percent || 0), 0);
  const isWeightBalanced = Math.abs(rootWeightsSum - 100) < 0.05;
  const today = new Date().toISOString().split('T')[0];

  const handleOpenProgressModal = (stage: Stage) => {
    setSelectedStage(stage);
    const initialVal = Math.round((stage.progress_percent || 0) * 100) / 100;
    setNewProgress(initialVal);
    setProgressInput(initialVal.toFixed(2));
    setProgressReason('');
    setShowProgressModal(true);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setNewProgress(val);
    setProgressInput(val.toFixed(2));
  };

  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setProgressInput(raw);
    const sanitized = raw.replace(',', '.');
    const num = parseFloat(sanitized);
    if (!isNaN(num)) {
      const clamped = Math.min(100, Math.max(0, num));
      setNewProgress(Math.round(clamped * 100) / 100);
    }
  };

  const handleProgressInputBlur = () => {
    const sanitized = progressInput.replace(',', '.');
    let num = parseFloat(sanitized);
    if (isNaN(num)) {
      num = 0;
    }
    const clamped = Math.min(100, Math.max(0, Math.round(num * 100) / 100));
    setNewProgress(clamped);
    setProgressInput(clamped.toFixed(2));
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStage) {
      const sanitized = progressInput.replace(',', '.');
      let finalVal = parseFloat(sanitized);
      if (isNaN(finalVal)) {
        finalVal = newProgress;
      }
      finalVal = Math.min(100, Math.max(0, Math.round(finalVal * 100) / 100));
      updateStageProgress(selectedStage.id, finalVal, progressReason);
      setShowProgressModal(false);
    }
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkId) return;

    const parentId = formData.is_substage && formData.parent_id ? formData.parent_id : null;

    addStage({
      work_id: currentWorkId,
      parent_id: parentId,
      code: formData.code || (parentId ? '1.1' : `${rootStages.length + 1}.0`),
      name: formData.name,
      responsible: formData.responsible || activeWork?.engineer_name || activeWork?.manager_name || 'Engenheiro',
      order_index: workStages.length + 1,
      weight_percent: Number(formData.weight_percent) || 0,
      planned_start: formData.planned_start,
      planned_end: formData.planned_end,
      progress_planned: 0,
      progress_percent: 0,
      budget_planned: Number(formData.budget_planned) || 0,
      cost_incurred: 0,
      cost_committed: 0,
      status: 'nao_iniciada',
      notes: formData.notes,
    });

    setShowAddModal(false);
    setFormData({
      parent_id: '',
      is_substage: false,
      code: '',
      name: '',
      responsible: '',
      weight_percent: 10,
      planned_start: '',
      planned_end: '',
      budget_planned: 0,
      notes: '',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Seletor de Obra e Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Etapas & Avanço Físico (EAP - 2 Níveis)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Estrutura analítica com Macroetapas (Nível 1) e Subetapas executivas (Nível 2), cronograma e medições.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Obra:</span>
            <select
              value={currentWorkId}
              onChange={(e) => setCurrentWorkId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900">{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {canEdit('stages') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Etapa / Subetapa</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Validação dos Pesos e Avanço Total da Obra */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Avanço Físico Ponderado */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Avanço Físico Ponderado</span>
            <div className="text-2xl font-black text-white mt-1">
              {formatPercent(activeWork?.progress_percent || 0, 2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Balanço de Pesos das Etapas */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Distribuição de Pesos (Macroetapas)</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-2xl font-black ${isWeightBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>
                {formatPercent(rootWeightsSum, 2)}
              </span>
              <span className="text-xs text-slate-400">/ 100%</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {rootStages.length} macroetapas • {workStages.filter(s => !!s.parent_id).length} subetapas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Status das Etapas */}
        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total de Itens na EAP</span>
            <div className="text-2xl font-black text-white mt-1">{workStages.length}</div>
            <span className="text-[10px] text-slate-400">
              {workStages.filter((s) => s.status === 'concluida').length} concluídas •{' '}
              {workStages.filter((s) => s.planned_end < today && s.progress_percent < 100).length} atrasadas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400">
            <GitFork className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gráfico Gantt */}
      <GanttChart stages={workStages} />

      {/* Tabela de Etapas com 2 Níveis de Detalhe e Atualização de Progresso */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Estrutura Analítica com 2 Níveis de Detalhes</h3>
            <p className="text-[11px] text-slate-400">Apontamento de progresso nas subetapas reflete automaticamente no avanço da macroetapa e da obra</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const allOpen: Record<string, boolean> = {};
                hierarchicalStages.forEach(s => { allOpen[s.id] = true; });
                setExpandedStages(allOpen);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              Expandir Todos
            </button>
            <button
              onClick={() => setExpandedStages({})}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              Recolher Todos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10"></th>
                <th className="px-3 py-3">Código</th>
                <th className="px-4 py-3">Etapa / Subetapa</th>
                <th className="px-3 py-3">Nível</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-3 py-3 text-center">Peso</th>
                <th className="px-4 py-3">Início / Término</th>
                <th className="px-4 py-3 text-center">Progresso Físico</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {hierarchicalStages.map((macro) => {
                const hasSubstages = macro.substages && macro.substages.length > 0;
                const isExpanded = expandedStages[macro.id] ?? true;
                const isDelayed = macro.planned_end < today && macro.progress_percent < 100;

                return (
                  <React.Fragment key={macro.id}>
                    {/* Linha da Macroetapa */}
                    <tr className="bg-slate-900/50 hover:bg-slate-800/40 transition-colors font-medium">
                      <td className="px-3 py-3 text-center">
                        {hasSubstages ? (
                          <button
                            onClick={() => toggleStageExpand(macro.id)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title={isExpanded ? 'Recolher subetapas' : 'Expandir subetapas'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-blue-400">{macro.code}</td>
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <span>{macro.name}</span>
                          {hasSubstages && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 font-normal">
                              {macro.substages!.length} subetapas
                            </span>
                          )}
                        </div>
                        {macro.notes && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{macro.notes}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/50">
                          Macro (N1)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{macro.responsible}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-200">{formatPercent(macro.weight_percent, 2)}</td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        <div>{formatDateBR(macro.planned_start)} a {formatDateBR(macro.planned_end)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                macro.progress_percent === 100
                                  ? 'bg-emerald-500'
                                  : isDelayed
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${macro.progress_percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-white">{formatPercent(macro.progress_percent, 2)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            macro.progress_percent === 100
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isDelayed
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {macro.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit('stages') && (
                          <button
                            onClick={() => handleOpenProgressModal(macro)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white font-semibold transition-colors text-xs"
                          >
                            Atualizar %
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Linhas das Subetapas */}
                    {hasSubstages && isExpanded && macro.substages!.map((sub) => {
                      const isSubDelayed = sub.planned_end < today && sub.progress_percent < 100;

                      return (
                        <tr key={sub.id} className="bg-slate-950/40 hover:bg-slate-900/40 transition-colors text-slate-300">
                          <td className="px-3 py-3 text-center"></td>
                          <td className="px-3 py-3 font-mono text-sky-400 pl-4">{sub.code}</td>
                          <td className="px-4 py-3 pl-8">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 text-xs">↳</span>
                              <span className="text-slate-200 font-medium">{sub.name}</span>
                            </div>
                            {sub.notes && <div className="text-[10px] text-slate-500 pl-4">{sub.notes}</div>}
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400">
                              Sub (N2)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{sub.responsible}</td>
                          <td className="px-3 py-3 text-center text-slate-400 font-medium text-[11px]">{formatPercent(sub.weight_percent, 2)} da macro</td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            <div>{formatDateBR(sub.planned_start)} a {formatDateBR(sub.planned_end)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-sky-400 h-full rounded-full"
                                  style={{ width: `${sub.progress_percent}%` }}
                                />
                              </div>
                              <span className="font-bold text-sky-300 text-[11px]">{formatPercent(sub.progress_percent, 2)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 capitalize">
                              {sub.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canEdit('stages') && (
                              <button
                                onClick={() => handleOpenProgressModal(sub)}
                                className="px-2 py-0.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white font-medium transition-colors text-[11px]"
                              >
                                Atualizar %
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Atualização de Progresso com Histórico */}
      {showProgressModal && selectedStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Apontar Progresso Físico</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block">Etapa Selecionada:</span>
                <strong className="text-white text-sm font-bold block">{selectedStage.code} - {selectedStage.name}</strong>
                {selectedStage.parent_id && (
                  <span className="text-[10px] text-sky-400 block mt-0.5">
                    Subetapa (Nível 2) - o avanço atualizará automaticamente a macroetapa correspondente
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor="progress-percent-input" className="block text-slate-300 font-semibold text-xs">
                    Percentual Realizado Concluído:
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      id="progress-percent-input"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={progressInput}
                      onChange={handleProgressInputChange}
                      onBlur={handleProgressInputBlur}
                      placeholder="0.00"
                      className="w-24 px-2.5 py-1 text-right text-xs font-bold bg-slate-900 border border-slate-700 rounded-lg text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                    <span className="text-xs font-bold text-blue-400">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.min(100, Math.max(0, Math.round(newProgress)))}
                  onChange={handleSliderChange}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motivo / Evidência da Medição</label>
                <textarea
                  rows={2}
                  value={progressReason}
                  onChange={(e) => setProgressReason(e.target.value)}
                  placeholder="Ex: Conclusão das formas e armações da subetapa..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Salvar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Etapa / Subetapa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Adicionar Etapa ou Subetapa à EAP</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="mt-4 space-y-4 text-xs">
              {/* Seleção do Tipo de Etapa (Nível 1 ou Nível 2) */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-semibold">Nível Hierárquico da Etapa *</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_substage"
                      checked={!formData.is_substage}
                      onChange={() => setFormData({ ...formData, is_substage: false, parent_id: '' })}
                      className="accent-blue-500"
                    />
                    <span className="text-white font-medium">Macroetapa (Nível 1)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="is_substage"
                      checked={formData.is_substage}
                      onChange={() => setFormData({
                        ...formData,
                        is_substage: true,
                        parent_id: rootStages[0]?.id || '',
                      })}
                      className="accent-blue-500"
                    />
                    <span className="text-white font-medium">Subetapa (Nível 2)</span>
                  </label>
                </div>

                {formData.is_substage && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <label className="block text-slate-300 font-semibold mb-1">Macroetapa Vinculada *</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl glass-input bg-slate-900 text-white"
                      required
                    >
                      {rootStages.map((macro) => (
                        <option key={macro.id} value={macro.id}>
                          {macro.code} - {macro.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código EAP *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={formData.is_substage ? 'Ex: 1.1' : 'Ex: 7.0'}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Nome da Etapa/Subetapa *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.is_substage ? 'Ex: Locação da Obra e Topografia' : 'Ex: Pintura e Esquadrias'}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Responsável</label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    placeholder="Eng. Lucas Pinho"
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {formData.is_substage ? 'Peso na Macroetapa (%) *' : 'Peso no Total da Obra (%) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={formData.weight_percent}
                    onChange={(e) => setFormData({ ...formData, weight_percent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Início Previsto *</label>
                  <input
                    type="date"
                    required
                    value={formData.planned_start}
                    onChange={(e) => setFormData({ ...formData, planned_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Término Previsto *</label>
                  <input
                    type="date"
                    required
                    value={formData.planned_end}
                    onChange={(e) => setFormData({ ...formData, planned_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Orçamento Previsto (R$)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.budget_planned}
                    onChange={(e) => setFormData({ ...formData, budget_planned: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Observações</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ex: Licença ou liberação..."
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Criar {formData.is_substage ? 'Subetapa' : 'Macroetapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

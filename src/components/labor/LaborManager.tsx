import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { LaborPerson, LaborEntry } from '../../types';
import { formatBRL, formatDateBR } from '../../lib/utils';
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  HardHat,
  Filter,
  ShieldCheck,
  X,
} from 'lucide-react';

export const LaborManager: React.FC = () => {
  const {
    works,
    stages,
    laborPeople,
    laborEntries,
    addLaborPerson,
    addLaborEntry,
    updateLaborEntryStatus,
  } = useData();
  const { canEdit } = useAuth();

  const [activeTab, setActiveTab] = useState<'apontamentos' | 'equipe'>('apontamentos');
  const [selectedWorkId, setSelectedWorkId] = useState<string>(works[0]?.id || '');
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Form Colaborador
  const [personForm, setPersonForm] = useState({
    work_id: works[0]?.id || '',
    name: '',
    role_function: 'Pedreiro',
    team_contractor: 'Equipe Própria',
    rate_type: 'hora' as 'hora' | 'dia',
    unit_rate: 30.0,
    is_active: true,
  });

  // Form Apontamento
  const [entryForm, setEntryForm] = useState({
    work_id: works[0]?.id || '',
    stage_id: '',
    person_id: '',
    date: new Date().toISOString().split('T')[0],
    activity_description: '',
    units_worked: 8,
    status: 'enviado' as LaborEntry['status'],
    notes: '',
  });

  const activeWork = works.find((w) => w.id === selectedWorkId);
  const workStages = stages.filter((s) => s.work_id === selectedWorkId);
  const workPeople = laborPeople.filter((p) => p.work_id === selectedWorkId);
  const workEntries = laborEntries.filter((e) => e.work_id === selectedWorkId);

  // Totais
  const totalApprovedLaborCost = workEntries
    .filter((e) => e.status === 'aprovado')
    .reduce((acc, e) => acc + e.total_calculated, 0);

  const pendingApprovalCount = workEntries.filter((e) => e.status === 'enviado').length;

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    addLaborPerson({
      work_id: personForm.work_id,
      name: personForm.name,
      role_function: personForm.role_function,
      team_contractor: personForm.team_contractor,
      rate_type: personForm.rate_type,
      unit_rate: Number(personForm.unit_rate),
      is_active: true,
    });
    setShowPersonModal(false);
    setPersonForm({
      work_id: selectedWorkId,
      name: '',
      role_function: 'Pedreiro',
      team_contractor: 'Equipe Própria',
      rate_type: 'hora',
      unit_rate: 30.0,
      is_active: true,
    });
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const person = laborPeople.find((p) => p.id === entryForm.person_id);
    if (!person) return;

    addLaborEntry({
      work_id: selectedWorkId,
      stage_id: entryForm.stage_id || undefined,
      person_id: person.id,
      person_name: person.name,
      function_name: person.role_function,
      date: entryForm.date,
      activity_description: entryForm.activity_description,
      units_worked: Number(entryForm.units_worked),
      unit_cost: person.unit_rate,
      status: 'enviado',
      notes: entryForm.notes,
    });

    setShowEntryModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Seletor de Obra */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Apontamento de Mão de Obra</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold">
              Módulo Opcional
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle diário de presença, atividades de campo, equipes próprias ou terceirizadas e custos de produção.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Obra:</span>
            <select
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900">
                  {w.name} {w.labor_enabled ? '' : '(Mão de Obra Desabilitada)'}
                </option>
              ))}
            </select>
          </div>

          {canEdit('labor') && activeWork?.labor_enabled && (
            <>
              <button
                onClick={() => setShowPersonModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors"
              >
                <HardHat className="w-4 h-4 text-blue-400" />
                <span>Cadastrar Operário</span>
              </button>

              <button
                onClick={() => setShowEntryModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Lançamento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Se a obra estiver com mão de obra desabilitada */}
      {!activeWork?.labor_enabled && (
        <div className="p-8 rounded-2xl glass-card border border-amber-800/40 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <HardHat className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Mão de Obra Desabilitada para esta Obra</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Esta funcionalidade é opcional. Para habilitar o apontamento de equipes e operários nesta obra, ative o toggle na tela de detalhes da obra.
          </p>
        </div>
      )}

      {activeWork?.labor_enabled && (
        <>
          {/* Cards de Métricas de Mão de Obra */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl glass-card border border-slate-800">
              <span className="text-slate-400 block font-medium">Equipe Cadastrada na Obra</span>
              <strong className="text-xl font-black text-white mt-1 block">{workPeople.length} operário(s)</strong>
              <span className="text-[10px] text-slate-500">Próprios e empreiteiros</span>
            </div>

            <div className="p-4 rounded-xl glass-card border border-slate-800">
              <span className="text-slate-400 block font-medium">Custo Aprovado de Mão de Obra</span>
              <strong className="text-xl font-black text-emerald-400 mt-1 block">
                {formatBRL(totalApprovedLaborCost)}
              </strong>
              <span className="text-[10px] text-slate-500">Consolidado com custos da obra</span>
            </div>

            <div className="p-4 rounded-xl glass-card border border-slate-800">
              <span className="text-slate-400 block font-medium">Apontamentos Aguardando Aprovação</span>
              <strong className="text-xl font-black text-amber-400 mt-1 block">
                {pendingApprovalCount} pendência(s)
              </strong>
              <span className="text-[10px] text-slate-500">Validação pelo gestor da obra</span>
            </div>
          </div>

          {/* Toggle de Abas: Apontamentos vs Equipe */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('apontamentos')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'apontamentos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lançamentos Diários ({workEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('equipe')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'equipe' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Colaboradores & Equipes ({workPeople.length})
            </button>
          </div>

          {/* Tabela de Lançamentos */}
          {activeTab === 'apontamentos' && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Função</th>
                      <th className="p-3">Atividade Realizada</th>
                      <th className="p-3 text-center">Horas/Dias</th>
                      <th className="p-3 text-right">Custo Unitário</th>
                      <th className="p-3 text-right">Total Calculado</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {workEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-400">{formatDateBR(entry.date)}</td>
                        <td className="p-3 font-semibold text-white">{entry.person_name}</td>
                        <td className="p-3 text-slate-400">{entry.function_name}</td>
                        <td className="p-3 text-slate-300">{entry.activity_description}</td>
                        <td className="p-3 text-center font-bold text-white">{entry.units_worked}</td>
                        <td className="p-3 text-right text-slate-300">{formatBRL(entry.unit_cost)}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatBRL(entry.total_calculated)}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.status === 'aprovado'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : entry.status === 'enviado'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {canEdit('labor') && entry.status === 'enviado' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => updateLaborEntryStatus(entry.id, 'aprovado')}
                                className="p-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                title="Aprovar Lançamento"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateLaborEntryStatus(entry.id, 'rejeitado')}
                                className="p-1 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
                                title="Rejeitar Lançamento"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela de Equipe */}
          {activeTab === 'equipe' && (
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Função</th>
                      <th className="p-3">Equipe / Empresa</th>
                      <th className="p-3 text-center">Tipo Remuneração</th>
                      <th className="p-3 text-right">Taxa / Custo Unitário</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {workPeople.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-white">{p.name}</td>
                        <td className="p-3 text-slate-300">{p.role_function}</td>
                        <td className="p-3 text-slate-400">{p.team_contractor || 'Equipe Própria'}</td>
                        <td className="p-3 text-center capitalize">{p.rate_type === 'hora' ? 'Por Hora' : 'Diária'}</td>
                        <td className="p-3 text-right font-bold text-white">{formatBRL(p.unit_rate)}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Novo Colaborador */}
      {showPersonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Cadastrar Colaborador / Operário</h3>
              <button onClick={() => setShowPersonModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={personForm.name}
                  onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Função / Cargo *</label>
                  <input
                    type="text"
                    required
                    value={personForm.role_function}
                    onChange={(e) => setPersonForm({ ...personForm, role_function: e.target.value })}
                    placeholder="Pedreiro, Servente..."
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Equipe / Empreiteiro</label>
                  <input
                    type="text"
                    value={personForm.team_contractor}
                    onChange={(e) => setPersonForm({ ...personForm, team_contractor: e.target.value })}
                    placeholder="Equipe Própria"
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Medição</label>
                  <select
                    value={personForm.rate_type}
                    onChange={(e) => setPersonForm({ ...personForm, rate_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  >
                    <option value="hora" className="bg-slate-900">Por Hora</option>
                    <option value="dia" className="bg-slate-900">Por Diária</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Custo Unitário (R$) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={personForm.unit_rate}
                    onChange={(e) => setPersonForm({ ...personForm, unit_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPersonModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Lançamento de Horas */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Lançar Horas Trabalhadas</h3>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Colaborador *</label>
                <select
                  required
                  value={entryForm.person_id}
                  onChange={(e) => setEntryForm({ ...entryForm, person_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input font-semibold"
                >
                  <option value="">Selecione o operário</option>
                  {workPeople.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.name} ({p.role_function} - {formatBRL(p.unit_rate)}/{p.rate_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Horas / Dias *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={entryForm.units_worked}
                    onChange={(e) => setEntryForm({ ...entryForm, units_worked: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl glass-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Etapa Vinculada (Opcional)</label>
                <select
                  value={entryForm.stage_id}
                  onChange={(e) => setEntryForm({ ...entryForm, stage_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  <option value="">Sem vínculo com etapa específica</option>
                  {workStages.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Atividade Realizada *</label>
                <textarea
                  rows={2}
                  required
                  value={entryForm.activity_description}
                  onChange={(e) => setEntryForm({ ...entryForm, activity_description: e.target.value })}
                  placeholder="Ex: Assentamento de blocos de vedação no 12º andar..."
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
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
    </div>
  );
};

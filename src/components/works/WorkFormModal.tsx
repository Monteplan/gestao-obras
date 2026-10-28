import React, { useState, useEffect } from 'react';
import { Work, WorkStatus, UserProfile } from '../../types';
import { X, Building2, MapPin, UserCheck } from 'lucide-react';
import { BRAZILIAN_STATES } from '../../lib/utils';
import { INITIAL_PROFILES } from '../../lib/seed-data';
import { useAuth } from '../../contexts/AuthContext';

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialWork?: Work | null;
}

export const WorkFormModal: React.FC<WorkFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWork,
}) => {
  const { user } = useAuth();

  // Carrega a lista oficial de usuários cadastrados no sistema
  const [userProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('gestao_obras_v2_user_profiles');
      let list: UserProfile[] = saved ? JSON.parse(saved) : [...INITIAL_PROFILES];
      INITIAL_PROFILES.forEach((init) => {
        if (!list.some((p) => p.email.toLowerCase() === init.email.toLowerCase())) {
          list.push(init);
        }
      });
      if (user && user.email && !list.some((p) => p.email.toLowerCase() === user.email.toLowerCase())) {
        list = [user, ...list];
      }
      return list;
    } catch (e) {
      console.warn('Erro ao carregar perfis de usuários:', e);
    }
    return INITIAL_PROFILES;
  });

  const defaultManager = userProfiles.find((u) => u.role === 'gestor')?.name || userProfiles[0]?.name || 'Mariana Duarte';
  const defaultEngineer = userProfiles.find((u) => u.role === 'engenharia')?.name || userProfiles[0]?.name || 'Lucas Pinho';

  const [formData, setFormData] = useState({
    code: '',
    erp_code: '',
    name: '',
    client: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    city_state: 'São Paulo/SP',
    project_type: 'Residencial',
    manager_name: defaultManager,
    engineer_name: defaultEngineer,
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    contract_value: 0,
    status: 'planejamento' as WorkStatus,
    labor_enabled: true,
    notes: '',
  });

  useEffect(() => {
    if (initialWork) {
      setFormData({
        code: initialWork.code,
        erp_code: initialWork.erp_code || '',
        name: initialWork.name,
        client: initialWork.client,
        address: initialWork.address,
        city: initialWork.city || initialWork.city_state?.split('/')[0] || 'São Paulo',
        state: initialWork.state || initialWork.city_state?.split('/')[1] || 'SP',
        city_state: initialWork.city_state,
        project_type: initialWork.project_type,
        manager_name: initialWork.manager_name,
        engineer_name: initialWork.engineer_name || initialWork.manager_name,
        planned_start: initialWork.planned_start,
        planned_end: initialWork.planned_end,
        actual_start: initialWork.actual_start || '',
        actual_end: initialWork.actual_end || '',
        contract_value: initialWork.contract_value,
        status: initialWork.status,
        labor_enabled: initialWork.labor_enabled,
        notes: initialWork.notes || '',
      });
    } else {
      setFormData({
        code: `OBR-${Math.floor(100 + Math.random() * 900)}`,
        erp_code: '',
        name: '',
        client: '',
        address: '',
        city: 'São Paulo',
        state: 'SP',
        city_state: 'São Paulo/SP',
        project_type: 'Residencial Vertical',
        manager_name: defaultManager,
        engineer_name: defaultEngineer,
        planned_start: new Date().toISOString().split('T')[0],
        planned_end: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        actual_start: '',
        actual_end: '',
        contract_value: 5000000,
        status: 'planejamento',
        labor_enabled: true,
        notes: '',
      });
    }
  }, [initialWork, isOpen, defaultManager, defaultEngineer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      organization_id: 'org-1',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl relative bg-white dark:bg-[#0c2336] text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {initialWork ? 'Editar Dados da Obra' : 'Cadastrar Nova Obra'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Código Interno *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                placeholder="Ex: OBR-004"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Código no ERP (Opcional)</label>
              <input
                type="text"
                value={formData.erp_code}
                onChange={(e) => setFormData({ ...formData, erp_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input font-mono"
                placeholder="Ex: ERP-SP-3091"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nome do Empreendimento / Obra *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
              placeholder="Ex: Residencial Parque das Águas"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Gestor do Empreendimento *
              </label>
              <select
                required
                value={formData.manager_name}
                onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="" disabled>Selecione um gestor...</option>
                {userProfiles.map((user) => (
                  <option key={user.id} value={user.name} className="bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white">
                    {user.name} ({user.role.toUpperCase()})
                  </option>
                ))}
                {formData.manager_name && !userProfiles.some((u) => u.name === formData.manager_name) && (
                  <option value={formData.manager_name} className="bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white">
                    {formData.manager_name}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />
                <span>Engenheiro Responsável *</span>
              </label>
              <select
                required
                value={formData.engineer_name}
                onChange={(e) => setFormData({ ...formData, engineer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="" disabled>Selecione um engenheiro...</option>
                {userProfiles.map((user) => (
                  <option key={user.id} value={user.name} className="bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white">
                    {user.name} ({user.role.toUpperCase()})
                  </option>
                ))}
                {formData.engineer_name && !userProfiles.some((u) => u.name === formData.engineer_name) && (
                  <option value={formData.engineer_name} className="bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white">
                    {formData.engineer_name}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status da Obra *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as WorkStatus })}
                className="w-full px-3 py-2 rounded-xl glass-input bg-white dark:bg-[#081d2c] text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="planejamento" className="bg-[#081d2c]">Planejamento</option>
                <option value="em_andamento" className="bg-[#081d2c]">Em Andamento</option>
                <option value="pausada" className="bg-[#081d2c]">Pausada</option>
                <option value="concluida" className="bg-[#081d2c]">Concluída</option>
                <option value="cancelada" className="bg-[#081d2c]">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Endereço da Obra</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                placeholder="Ex: Av. Paulista, 1000"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Estado (UF) *</span>
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => {
                  const newState = e.target.value;
                  setFormData({
                    ...formData,
                    state: newState,
                    city_state: `${formData.city}/${newState}`,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl glass-input bg-[#081d2c] text-white cursor-pointer"
              >
                {BRAZILIAN_STATES.map((st) => (
                  <option key={st.uf} value={st.uf} className="bg-[#081d2c]">
                    {st.uf} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Cidade *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  setFormData({
                    ...formData,
                    city: newCity,
                    city_state: `${newCity}/${formData.state}`,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl glass-input"
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Tipo de Empreendimento</label>
              <select
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input bg-[#081d2c] text-white cursor-pointer"
              >
                <option value="Residencial Vertical" className="bg-[#081d2c]">Residencial Vertical</option>
                <option value="Residencial Horizontal" className="bg-[#081d2c]">Residencial Horizontal</option>
                <option value="Comercial / Escritórios" className="bg-[#081d2c]">Comercial / Escritórios</option>
                <option value="Industrial / Galpão" className="bg-[#081d2c]">Industrial / Galpão</option>
                <option value="Infraestrutura" className="bg-[#081d2c]">Infraestrutura</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Valor Contratado / VGV Estimado (R$)</label>
              <input
                type="number"
                step="any"
                required
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl glass-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Início Real</label>
              <input
                type="date"
                value={formData.actual_start}
                onChange={(e) => setFormData({ ...formData, actual_start: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Término Real</label>
              <input
                type="date"
                value={formData.actual_end}
                onChange={(e) => setFormData({ ...formData, actual_end: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
              />
            </div>
          </div>

          {/* Toggle de Mão de Obra Opcional */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-semibold block">Habilitar Módulo de Mão de Obra nesta Obra</span>
              <p className="text-[11px] text-slate-400">
                Se desabilitado, os menus de apontamento de horas e equipes ficarão ocultos para esta obra.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.labor_enabled}
                onChange={(e) => setFormData({ ...formData, labor_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Observações Gerais</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
              placeholder="Anotações técnicas, premissas de projeto..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30"
            >
              Salvar Obra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  BudgetToErpMapping,
  ErpToBudgetTotalizerMapping,
  MappingType,
} from '../../types';
import {
  Layers,
  ArrowRight,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Eye,
  Trash2,
  Edit2,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { resolveClassificationTrail, formatBRL } from '../../lib/utils';

export const DeParaManager: React.FC = () => {
  const {
    works,
    budgetVersions,
    budgetAccounts,
    erpCostAccounts,
    budgetToErpMappings,
    erpToBudgetTotalizerMappings,
    incurredCosts,
    addBudgetToErpMapping,
    updateBudgetToErpMapping,
    deleteBudgetToErpMapping,
    addErpToBudgetTotalizerMapping,
    updateErpToBudgetTotalizerMapping,
    deleteErpToBudgetTotalizerMapping,
  } = useData();

  const { canEdit } = useAuth();
  const isEditable = canEdit('depara');

  const [activeTab, setActiveTab] = useState<'depara1' | 'depara2' | 'trail'>('depara1');
  const [selectedWorkId, setSelectedWorkId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

  // Modal states
  const [isModal1Open, setIsModal1Open] = useState(false);
  const [isModal2Open, setIsModal2Open] = useState(false);
  const [editingMapping1, setEditingMapping1] = useState<BudgetToErpMapping | null>(null);
  const [editingMapping2, setEditingMapping2] = useState<ErpToBudgetTotalizerMapping | null>(null);

  // Form states 1
  const [form1BudgetAccountId, setForm1BudgetAccountId] = useState('');
  const [form1ErpAccountId, setForm1ErpAccountId] = useState('');
  const [form1MappingType, setForm1MappingType] = useState<MappingType>('direto');
  const [form1Percent, setForm1Percent] = useState<number>(100);
  const [form1Priority, setForm1Priority] = useState<number>(10);
  const [form1Notes, setForm1Notes] = useState('');

  // Form states 2
  const [form2DetailedErpId, setForm2DetailedErpId] = useState('');
  const [form2TotalizerErpId, setForm2TotalizerErpId] = useState('');
  const [form2Notes, setForm2Notes] = useState('');

  // Filtering
  const filteredMappings1 = useMemo(() => {
    return budgetToErpMappings.filter((m) => {
      if (selectedWorkId !== 'all' && m.work_id && m.work_id !== selectedWorkId) return false;
      if (statusFilter === 'ativo' && !m.is_active) return false;
      if (statusFilter === 'inativo' && m.is_active) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const bMatch = m.budget_account_code?.toLowerCase().includes(q) || m.budget_account_description?.toLowerCase().includes(q);
        const eMatch = m.erp_account_code?.toLowerCase().includes(q) || m.erp_account_description?.toLowerCase().includes(q);
        return bMatch || eMatch;
      }
      return true;
    });
  }, [budgetToErpMappings, selectedWorkId, statusFilter, searchTerm]);

  const filteredMappings2 = useMemo(() => {
    return erpToBudgetTotalizerMappings.filter((m) => {
      if (selectedWorkId !== 'all' && m.work_id && m.work_id !== selectedWorkId) return false;
      if (statusFilter === 'ativo' && !m.is_active) return false;
      if (statusFilter === 'inativo' && m.is_active) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const dMatch = m.detailed_erp_account_code?.toLowerCase().includes(q) || m.detailed_erp_account_description?.toLowerCase().includes(q);
        const tMatch = m.totalizer_erp_account_code?.toLowerCase().includes(q) || m.totalizer_erp_account_description?.toLowerCase().includes(q);
        return dMatch || tMatch;
      }
      return true;
    });
  }, [erpToBudgetTotalizerMappings, selectedWorkId, statusFilter, searchTerm]);

  // Alertas de Inconsistência
  const unmappedErpAccounts = useMemo(() => {
    return erpCostAccounts.filter(
      (acc) =>
        acc.account_type === 'detalhada' &&
        !erpToBudgetTotalizerMappings.some((m) => m.detailed_erp_account_code === acc.code && m.is_active)
    );
  }, [erpCostAccounts, erpToBudgetTotalizerMappings]);

  const unmappedBudgetAccounts = useMemo(() => {
    return budgetAccounts.filter(
      (acc) =>
        acc.account_type === 'atividade' &&
        acc.status !== 'inativo' &&
        !budgetToErpMappings.some((m) => m.budget_account_code === acc.code && m.is_active)
    );
  }, [budgetAccounts, budgetToErpMappings]);

  // Trilha de auditoria para custos incorridos
  const costsClassificationTrails = useMemo(() => {
    return incurredCosts.slice(0, 30).map((cost) => {
      const work = works.find((w) => w.id === cost.work_id);
      const trail = resolveClassificationTrail(
        cost,
        budgetToErpMappings,
        erpToBudgetTotalizerMappings,
        erpCostAccounts,
        budgetAccounts,
        work?.name || 'Obra Padrão'
      );
      return { cost, trail };
    });
  }, [incurredCosts, erpCostAccounts, erpToBudgetTotalizerMappings, budgetToErpMappings, budgetAccounts, works]);

  // Handlers Modal 1
  const handleOpenAdd1 = () => {
    setEditingMapping1(null);
    setForm1BudgetAccountId(budgetAccounts[0]?.id || '');
    setForm1ErpAccountId(erpCostAccounts[0]?.id || '');
    setForm1MappingType('direto');
    setForm1Percent(100);
    setForm1Priority(10);
    setForm1Notes('');
    setIsModal1Open(true);
  };

  const handleSave1 = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetAcc = budgetAccounts.find((a) => a.id === form1BudgetAccountId);
    const erpAcc = erpCostAccounts.find((a) => a.id === form1ErpAccountId);

    if (!budgetAcc || !erpAcc) {
      alert('Selecione contas válidas do orçamento e do ERP.');
      return;
    }

    if (form1MappingType === 'rateado' && (form1Percent <= 0 || form1Percent > 100)) {
      alert('O percentual de rateio deve estar entre 1% e 100%.');
      return;
    }

    // Validação se a soma de rateio ultrapassa 100%
    if (form1MappingType === 'rateado') {
      const existingPercentSum = budgetToErpMappings
        .filter((m) => m.erp_account_code === erpAcc.code && m.id !== editingMapping1?.id && m.is_active)
        .reduce((sum, m) => sum + (m.apportionment_percent || 0), 0);

      if (existingPercentSum + Number(form1Percent) > 100) {
        alert(
          `Aviso: A soma de rateios para a conta ERP ${erpAcc.code} ultrapassaria 100% (atual: ${existingPercentSum}% + novo: ${form1Percent}%). Ajuste os percentuais.`
        );
        return;
      }
    }

    if (editingMapping1) {
      updateBudgetToErpMapping(editingMapping1.id, {
        budget_account_id: budgetAcc.id,
        budget_account_code: budgetAcc.code,
        budget_account_description: budgetAcc.description,
        erp_account_id: erpAcc.id,
        erp_account_code: erpAcc.code,
        erp_account_description: erpAcc.description,
        mapping_type: form1MappingType,
        apportionment_percent: Number(form1Percent),
        priority: Number(form1Priority),
        notes: form1Notes,
        work_id: selectedWorkId === 'all' ? undefined : selectedWorkId,
      });
    } else {
      addBudgetToErpMapping({
        budget_account_id: budgetAcc.id,
        budget_account_code: budgetAcc.code,
        budget_account_description: budgetAcc.description,
        erp_account_id: erpAcc.id,
        erp_account_code: erpAcc.code,
        erp_account_description: erpAcc.description,
        mapping_type: form1MappingType,
        apportionment_percent: Number(form1Percent),
        priority: Number(form1Priority),
        is_active: true,
        notes: form1Notes,
        work_id: selectedWorkId === 'all' ? undefined : selectedWorkId,
      });
    }
    setIsModal1Open(false);
  };

  // Handlers Modal 2
  const handleOpenAdd2 = () => {
    setEditingMapping2(null);
    setForm2DetailedErpId(erpCostAccounts.find((a) => a.account_type === 'detalhada')?.id || '');
    setForm2TotalizerErpId(erpCostAccounts.find((a) => a.account_type === 'totalizadora')?.id || '');
    setForm2Notes('');
    setIsModal2Open(true);
  };

  const handleSave2 = (e: React.FormEvent) => {
    e.preventDefault();
    const detailedAcc = erpCostAccounts.find((a) => a.id === form2DetailedErpId);
    const totalizerAcc = erpCostAccounts.find((a) => a.id === form2TotalizerErpId);

    if (!detailedAcc || !totalizerAcc) {
      alert('Selecione uma conta detalhada e uma conta totalizadora válidas.');
      return;
    }

    // Validação: uma conta detalhada não deve estar associada a duas totalizadoras ativas
    const alreadyLinked = erpToBudgetTotalizerMappings.find(
      (m) =>
        m.detailed_erp_account_code === detailedAcc.code &&
        m.id !== editingMapping2?.id &&
        m.is_active &&
        (m.work_id === selectedWorkId || !m.work_id || selectedWorkId === 'all')
    );
    if (alreadyLinked) {
      alert(
        `Regra de Validação: A conta detalhada ${detailedAcc.code} - ${detailedAcc.description} já está consolidada na totalizadora ${alreadyLinked.totalizer_erp_account_code}. Desative o vínculo anterior antes de criar outro.`
      );
      return;
    }

    if (editingMapping2) {
      updateErpToBudgetTotalizerMapping(editingMapping2.id, {
        detailed_erp_account_id: detailedAcc.id,
        detailed_erp_account_code: detailedAcc.code,
        detailed_erp_account_description: detailedAcc.description,
        totalizer_erp_account_id: totalizerAcc.id,
        totalizer_erp_account_code: totalizerAcc.code,
        totalizer_erp_account_description: totalizerAcc.description,
        notes: form2Notes,
        work_id: selectedWorkId === 'all' ? undefined : selectedWorkId,
      });
    } else {
      addErpToBudgetTotalizerMapping({
        detailed_erp_account_id: detailedAcc.id,
        detailed_erp_account_code: detailedAcc.code,
        detailed_erp_account_description: detailedAcc.description,
        totalizer_erp_account_id: totalizerAcc.id,
        totalizer_erp_account_code: totalizerAcc.code,
        totalizer_erp_account_description: totalizerAcc.description,
        is_active: true,
        notes: form2Notes,
        work_id: selectedWorkId === 'all' ? undefined : selectedWorkId,
      });
    }
    setIsModal2Open(false);
  };

  const handleExportJson = () => {
    const dataToExport = {
      budgetToErpMappings,
      erpToBudgetTotalizerMappings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `de_para_config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header com Contexto das Duas Dimensões */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#081d2c] p-6 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#004171]/10 dark:bg-[#004171]/30 rounded-xl text-[#004171] dark:text-[#38bdf8]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Gestão dos De-Para (Duplo Nível)
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ponte entre o Plano A (Orçamento das Etapas da Engenharia) e o Plano B (Plano de Contas de Custos do ERP).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportJson}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-200 dark:border-[#1c3e5c]"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Configuração</span>
          </button>
        </div>
      </div>

      {/* Alertas de Inconsistências */}
      {(unmappedErpAccounts.length > 0 || unmappedBudgetAccounts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unmappedErpAccounts.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {unmappedErpAccounts.length} Conta(s) detalhada(s) do ERP sem consolidação
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                  Existem contas do ERP que ainda não foram vinculadas a uma conta totalizadora no De-para 2 (ex: FGTS, Benefícios).
                </p>
              </div>
            </div>
          )}

          {unmappedBudgetAccounts.length > 0 && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-[#004171] dark:text-[#38bdf8] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  {unmappedBudgetAccounts.length} Atividade(s) do Orçamento sem conta ERP vinculada
                </h4>
                <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-1">
                  Itens orçamentários que não possuem correspondente no De-para 1 não captarão custos automáticos do ERP.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Abas e Filtros */}
      <div className="bg-white dark:bg-[#081d2c] p-4 rounded-2xl border border-slate-200 dark:border-[#1c3e5c] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1c3e5c] pb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('depara1')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'depara1'
                  ? 'bg-[#004171] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2336]'
              }`}
            >
              <span>De-para 1: Orçamento x Conta ERP</span>
              <span className="px-2 py-0.5 text-[10px] bg-white/20 dark:bg-white/10 rounded-full">
                {budgetToErpMappings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('depara2')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'depara2'
                  ? 'bg-[#004171] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2336]'
              }`}
            >
              <span>De-para 2: ERP Detalhado x Totalizador</span>
              <span className="px-2 py-0.5 text-[10px] bg-white/20 dark:bg-white/10 rounded-full">
                {erpToBudgetTotalizerMappings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('trail')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'trail'
                  ? 'bg-[#004171] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0c2336]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Trilha de Classificação Completa</span>
            </button>
          </div>

          {isEditable && (
            <div>
              {activeTab === 'depara1' && (
                <button
                  onClick={handleOpenAdd1}
                  className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo De-para 1</span>
                </button>
              )}
              {activeTab === 'depara2' && (
                <button
                  onClick={handleOpenAdd2}
                  className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo De-para 2</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filtros e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#004171]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#004171]"
            >
              <option value="all">Todas as Obras (Regras Globais e Específicas)</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#004171]"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Apenas Ativos</option>
              <option value="inativo">Apenas Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* ABA 1: De-para 1 (Orçamento x ERP) */}
      {activeTab === 'depara1' && (
        <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-[#0c2336] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Vínculos entre Atividades do Orçamento e Contas de Custo do ERP
            </span>
            <span className="text-[11px] text-slate-500">
              {filteredMappings1.length} registros encontrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#081d2c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1c3e5c]">
                <tr>
                  <th className="py-3 px-4">Conta Orçamento (Engenharia)</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4">Conta de Custo do ERP</th>
                  <th className="py-3 px-4 text-center">Rateio</th>
                  <th className="py-3 px-4 text-center">Prioridade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
                {filteredMappings1.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#0c2336]/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {m.budget_account_code} - {m.budget_account_description}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {m.work_id ? `Obra Específica: ${works.find((w) => w.id === m.work_id)?.name}` : 'Regra Geral da Empresa'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.mapping_type === 'direto'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : m.mapping_type === 'rateado'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {m.mapping_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-[#004171] dark:text-[#38bdf8]">
                        {m.erp_account_code}
                      </div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        {m.erp_account_description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                      {m.apportionment_percent}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {m.priority}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.is_active ? (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-500 dark:text-rose-400 text-[11px] font-semibold">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditable && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              updateBudgetToErpMapping(m.id, { is_active: !m.is_active });
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            title={m.is_active ? 'Inativar' : 'Ativar'}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir este mapeamento De-para 1?')) {
                                deleteBudgetToErpMapping(m.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ABA 2: De-para 2 (Contas Detalhadas ERP x Totalizadora) */}
      {activeTab === 'depara2' && (
        <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-[#0c2336] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Consolidação Interna do ERP: Contas Detalhadas agrupadas na Conta Totalizadora
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Exemplo Obrigatório: Salários, FGTS, INSS, Plano de Saúde, Vale-transporte totalizados em Salários.
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {filteredMappings2.length} consolidações
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#081d2c] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#1c3e5c]">
                <tr>
                  <th className="py-3 px-4">Conta Detalhada do ERP</th>
                  <th className="py-3 px-4 text-center">Fluxo</th>
                  <th className="py-3 px-4">Conta Totalizadora do ERP</th>
                  <th className="py-3 px-4">Observações</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#1c3e5c]/60">
                {filteredMappings2.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#0c2336]/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {m.detailed_erp_account_code}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {m.detailed_erp_account_description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ArrowRight className="w-4 h-4 mx-auto text-[#004171] dark:text-[#38bdf8]" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#004171] dark:text-[#38bdf8]">
                        {m.totalizer_erp_account_code}
                      </div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        {m.totalizer_erp_account_description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {m.notes || 'Consolidação direta de despesas'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.is_active ? (
                        <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-500 dark:text-rose-400 text-[11px] font-semibold">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditable && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              updateErpToBudgetTotalizerMapping(m.id, { is_active: !m.is_active });
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            title={m.is_active ? 'Inativar' : 'Ativar'}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir este mapeamento De-para 2?')) {
                                deleteErpToBudgetTotalizerMapping(m.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ABA 3: Trilha de Classificação Completa */}
      {activeTab === 'trail' && (
        <div className="bg-white dark:bg-[#081d2c] rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Visualização da Cadeia Completa de Classificação
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hierarquia: Conta Detalhada do ERP → Conta Totalizadora do ERP → Conta do Orçamento → Etapa → Atividade → Obra.
            </p>
          </div>

          <div className="space-y-3">
            {costsClassificationTrails.map(({ cost, trail }) => (
              <div
                key={cost.id}
                className="p-4 bg-slate-50 dark:bg-[#0c2336] rounded-xl border border-slate-200 dark:border-[#1c3e5c] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#1c3e5c]/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      Doc: {cost.document_number}
                    </span>
                    <span className="text-xs text-slate-500">| {cost.description}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatBRL(cost.net_value)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        trail.status === 'completa'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {trail.status === 'completa' ? 'CLASSIFICAÇÃO COMPLETA' : 'PENDENTE DE DE-PARA'}
                    </span>
                  </div>
                </div>

                {/* Trilha visual */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="bg-white dark:bg-[#081d2c] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-400 block">Conta ERP Detalhada</span>
                    <span className="font-mono font-bold text-[#004171] dark:text-[#38bdf8]">
                      {trail.detailedErpCode}
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 block">
                      {trail.detailedErpDescription}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="bg-white dark:bg-[#081d2c] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-400 block">Conta Totalizadora ERP (De-para 2)</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {trail.totalizerErpCode}
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 block">
                      {trail.totalizerErpDescription}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="bg-white dark:bg-[#081d2c] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-400 block">Conta Orçamento (De-para 1)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {trail.budgetAccountCode}
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 block">
                      {trail.budgetAccountDescription}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="bg-white dark:bg-[#081d2c] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1c3e5c]">
                    <span className="text-[10px] text-slate-400 block">Obra</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {trail.workName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal De-para 1 */}
      {isModal1Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingMapping1 ? 'Editar De-para 1' : 'Novo De-para 1 (Orçamento x ERP)'}
            </h3>

            <form onSubmit={handleSave1} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Conta / Atividade do Orçamento (Engenharia) *
                </label>
                <select
                  value={form1BudgetAccountId}
                  onChange={(e) => setForm1BudgetAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  {budgetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.description} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Conta de Custo do ERP *
                </label>
                <select
                  value={form1ErpAccountId}
                  onChange={(e) => setForm1ErpAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  {erpCostAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.description} ({acc.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Tipo de Relacionamento
                  </label>
                  <select
                    value={form1MappingType}
                    onChange={(e) => setForm1MappingType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="direto">Direto (100%)</option>
                    <option value="rateado">Rateado (%)</option>
                    <option value="manual">Manual por Lançamento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    % de Rateio
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form1Percent}
                    disabled={form1MappingType === 'direto'}
                    onChange={(e) => setForm1Percent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={form1Notes}
                  onChange={(e) => setForm1Notes(e.target.value)}
                  placeholder="Ex: Aplica-se à mão de obra direta de campo"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#1c3e5c]">
                <button
                  type="button"
                  onClick={() => setIsModal1Open(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white font-bold rounded-xl"
                >
                  Salvar Mapeamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal De-para 2 */}
      {isModal2Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#081d2c] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#1c3e5c] p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingMapping2 ? 'Editar De-para 2' : 'Novo De-para 2 (Consolidação ERP)'}
            </h3>

            <form onSubmit={handleSave2} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Conta Detalhada do ERP (Origem dos Custos) *
                </label>
                <select
                  value={form2DetailedErpId}
                  onChange={(e) => setForm2DetailedErpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  {erpCostAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.description} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Conta Totalizadora do ERP (Destino da Consolidação) *
                </label>
                <select
                  value={form2TotalizerErpId}
                  onChange={(e) => setForm2TotalizerErpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  {erpCostAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={form2Notes}
                  onChange={(e) => setForm2Notes(e.target.value)}
                  placeholder="Ex: Encargos sociais consolidados em Salários"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0c2336] border border-slate-200 dark:border-[#1c3e5c] rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-[#1c3e5c]">
                <button
                  type="button"
                  onClick={() => setIsModal2Open(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0c2336] dark:hover:bg-[#13334d] text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#004171] hover:bg-[#003359] text-white font-bold rounded-xl"
                >
                  Salvar Consolidação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

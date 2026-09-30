import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Work,
  Stage,
  BudgetVersion,
  BudgetItem,
  PurchaseRequisition,
  PurchaseOrder,
  Receipt,
  IncurredCost,
  Revenue,
  LaborPerson,
  LaborEntry,
  ErpImportBatch,
  ErpImportError,
  ErpImportType,
  DeduplicationStrategy,
  SystemAuditLog,
  BudgetAccount,
  ErpCostAccount,
  BudgetToErpMapping,
  ErpToBudgetTotalizerMapping,
  PhysicalProgressEntry,
  BudgetIndexAdjustment,
  InccScope,
  BudgetAccountStatus,
  PcoImportProfile,
  PcoParsedData,
} from '../types';
import {
  INITIAL_WORKS,
  INITIAL_STAGES,
  INITIAL_BUDGET_VERSIONS,
  INITIAL_BUDGET_ITEMS,
  INITIAL_PURCHASE_REQUISITIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RECEIPTS,
  INITIAL_INCURRED_COSTS,
  INITIAL_REVENUES,
  INITIAL_LABOR_PEOPLE,
  INITIAL_LABOR_ENTRIES,
  INITIAL_IMPORT_BATCHES,
  INITIAL_BUDGET_ACCOUNTS,
  INITIAL_ERP_COST_ACCOUNTS,
  INITIAL_DE_PARA_1,
  INITIAL_DE_PARA_2,
  INITIAL_PHYSICAL_PROGRESS_ENTRIES,
} from '../lib/seed-data';
import { calculateWeightedProgress, calculatePhysicalProgressWeighted, simulateInccAdjustment, formatBRL } from '../lib/utils';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchAllFromSupabase, saveImportedEntriesToSupabase } from '../lib/supabase-sync';

interface DataContextType {
  // Supabase Cloud Sync Status
  isSyncingWithSupabase: boolean;
  supabaseSyncStatus: 'synced' | 'local' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  syncWithSupabase: () => Promise<void>;

  works: Work[];
  stages: Stage[];
  budgetVersions: BudgetVersion[];
  budgetItems: BudgetItem[];
  requisitions: PurchaseRequisition[];
  orders: PurchaseOrder[];
  receipts: Receipt[];
  incurredCosts: IncurredCost[];
  revenues: Revenue[];
  laborPeople: LaborPerson[];
  laborEntries: LaborEntry[];
  importBatches: ErpImportBatch[];
  auditLogs: SystemAuditLog[];
  
  // Evolução Físico-Financeira
  budgetAccounts: BudgetAccount[];
  erpCostAccounts: ErpCostAccount[];
  budgetToErpMappings: BudgetToErpMapping[];
  erpToBudgetTotalizerMappings: ErpToBudgetTotalizerMapping[];
  physicalProgressEntries: PhysicalProgressEntry[];
  inccAdjustments: BudgetIndexAdjustment[];

  // Works CRUD
  addWork: (work: Omit<Work, 'id' | 'created_at' | 'updated_at' | 'progress_percent'>) => Work;
  updateWork: (id: string, updates: Partial<Work>) => void;
  deleteWork: (id: string) => void;
  
  // Stages CRUD
  addStage: (stage: Omit<Stage, 'id' | 'created_at' | 'updated_at'>) => void;
  updateStage: (id: string, updates: Partial<Stage>) => void;
  deleteStage: (id: string) => void;
  updateStageProgress: (id: string, newPercent: number, reason?: string) => void;

  // Budget Legado & Versões
  addBudgetItem: (item: Omit<BudgetItem, 'id' | 'created_at'>) => void;
  updateBudgetItem: (id: string, updates: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;
  createBudgetVersion: (workId: string, title: string, reason: string) => void;
  approveBudgetVersion: (versionId: string) => void;

  // Plano A: Contas do Orçamento & Versionamento Aberto
  addBudgetAccount: (account: Omit<BudgetAccount, 'id' | 'created_at'>) => void;
  updateBudgetAccount: (id: string, updates: Partial<BudgetAccount>, reason?: string) => void;
  deleteBudgetAccount: (id: string) => void;
  createBudgetVersionWithAccounts: (workId: string, baseVersionId: string, title: string, reason: string) => string;
  applyInccAdjustment: (
    workId: string,
    fromVersionId: string,
    indexPercent: number,
    scope: InccScope,
    baseDateOld: string,
    baseDateNew: string,
    justification: string,
    selectedAccountIds?: string[]
  ) => { newVersionId: string; adjustment: BudgetIndexAdjustment };

  // Plano B: Contas do ERP
  addErpCostAccount: (account: Omit<ErpCostAccount, 'id' | 'created_at'>) => void;
  updateErpCostAccount: (id: string, updates: Partial<ErpCostAccount>) => void;

  // De-para 1: Orçamento -> ERP
  addBudgetToErpMapping: (mapping: Omit<BudgetToErpMapping, 'id' | 'created_at'>) => void;
  updateBudgetToErpMapping: (id: string, updates: Partial<BudgetToErpMapping>) => void;
  deleteBudgetToErpMapping: (id: string) => void;

  // De-para 2: Contas Detalhadas ERP -> Conta Totalizadora ERP
  addErpToBudgetTotalizerMapping: (mapping: Omit<ErpToBudgetTotalizerMapping, 'id' | 'created_at'>) => void;
  updateErpToBudgetTotalizerMapping: (id: string, updates: Partial<ErpToBudgetTotalizerMapping>) => void;
  deleteErpToBudgetTotalizerMapping: (id: string) => void;

  // Medições Físicas
  addPhysicalProgressEntry: (entry: Omit<PhysicalProgressEntry, 'id' | 'created_at'>) => void;

  // Purchasing Flow
  addRequisition: (req: Omit<PurchaseRequisition, 'id' | 'created_at' | 'internal_number'>) => void;
  updateRequisitionStatus: (id: string, status: PurchaseRequisition['status'], notes?: string) => void;
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id' | 'created_at' | 'internal_number'>) => void;
  updateOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  addReceipt: (receipt: Omit<Receipt, 'id' | 'created_at'>) => void;
  addIncurredCost: (cost: Omit<IncurredCost, 'id' | 'created_at'>) => void;

  // Labor
  toggleWorkLabor: (workId: string, enabled: boolean) => void;
  addLaborPerson: (person: Omit<LaborPerson, 'id' | 'created_at'>) => void;
  addLaborEntry: (entry: Omit<LaborEntry, 'id' | 'created_at' | 'total_calculated'>) => void;
  updateLaborEntryStatus: (id: string, status: LaborEntry['status']) => void;

  // ERP Import
  processErpImport: (
    type: ErpImportType,
    fileName: string,
    rows: Record<string, any>[],
    strategy: DeduplicationStrategy
  ) => { batch: ErpImportBatch; errors: ErpImportError[] };

  // PCO Import Engine
  pcoImportProfiles: PcoImportProfile[];
  importPcoWorkbook: (parsed: PcoParsedData) => Promise<void>;

  // System
  resetToSeedData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const SCHEMA_VERSION = 'v10';

  const loadInitial = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`gestao_obras_${SCHEMA_VERSION}_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [works, setWorks] = useState<Work[]>(() => loadInitial('works', INITIAL_WORKS));
  const [stages, setStages] = useState<Stage[]>(() => loadInitial('stages', INITIAL_STAGES));
  const [budgetVersions, setBudgetVersions] = useState<BudgetVersion[]>(() => loadInitial('budget_versions', INITIAL_BUDGET_VERSIONS));
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => loadInitial('budget_items', INITIAL_BUDGET_ITEMS));
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(() => loadInitial('requisitions', INITIAL_PURCHASE_REQUISITIONS));
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => loadInitial('orders', INITIAL_PURCHASE_ORDERS));
  const [receipts, setReceipts] = useState<Receipt[]>(() => loadInitial('receipts', INITIAL_RECEIPTS));
  const [incurredCosts, setIncurredCosts] = useState<IncurredCost[]>(() => loadInitial('incurred_costs', INITIAL_INCURRED_COSTS));
  const [revenues, setRevenues] = useState<Revenue[]>(() => loadInitial('revenues', INITIAL_REVENUES));
  const [laborPeople, setLaborPeople] = useState<LaborPerson[]>(() => loadInitial('labor_people', INITIAL_LABOR_PEOPLE));
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>(() => loadInitial('labor_entries', INITIAL_LABOR_ENTRIES));
  const [importBatches, setImportBatches] = useState<ErpImportBatch[]>(() => loadInitial('import_batches', INITIAL_IMPORT_BATCHES));
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => loadInitial('audit_logs', []));

  // Perfis PCO
  const [pcoImportProfiles, setPcoImportProfiles] = useState<PcoImportProfile[]>(() =>
    loadInitial('pco_profiles', [
      {
        id: 'pco-profile-1',
        work_id: 'work-1',
        sheet_names: {
          macro: 'PLANEJAMENTO MACRO',
          indirects: '% INDIRETOS',
          directs: '% DIRETOS',
          budget: 'BASE ORÇAMENTO',
          real: 'REAL',
          de_para: 'de-para',
        },
        header_rows: {
          macro: 1,
          indirects: 5,
          directs: 5,
          budget: 1,
          real: 1,
          de_para: 1,
        },
        last_file_name: 'ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx',
        last_imported_at: '2026-09-21T12:00:00Z',
        is_active: true,
        created_at: '2026-09-21T12:00:00Z',
        updated_at: '2026-09-21T12:00:00Z',
      },
    ])
  );

  // Evolução Físico-Financeira
  const [budgetAccounts, setBudgetAccounts] = useState<BudgetAccount[]>(() => loadInitial('budget_accounts', INITIAL_BUDGET_ACCOUNTS));
  const [erpCostAccounts, setErpCostAccounts] = useState<ErpCostAccount[]>(() => loadInitial('erp_cost_accounts', INITIAL_ERP_COST_ACCOUNTS));
  const [budgetToErpMappings, setBudgetToErpMappings] = useState<BudgetToErpMapping[]>(() => loadInitial('budget_to_erp_mappings', INITIAL_DE_PARA_1));
  const [erpToBudgetTotalizerMappings, setErpToBudgetTotalizerMappings] = useState<ErpToBudgetTotalizerMapping[]>(() => loadInitial('erp_to_budget_totalizer_mappings', INITIAL_DE_PARA_2));
  const [physicalProgressEntries, setPhysicalProgressEntries] = useState<PhysicalProgressEntry[]>(() => loadInitial('physical_progress_entries', INITIAL_PHYSICAL_PROGRESS_ENTRIES));
  const [inccAdjustments, setInccAdjustments] = useState<BudgetIndexAdjustment[]>(() => loadInitial('incc_adjustments', []));

  // Estados de Sincronização com Supabase Cloud
  const [isSyncingWithSupabase, setIsSyncingWithSupabase] = useState<boolean>(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'synced' | 'local' | 'syncing' | 'error'>(
    isSupabaseConfigured() ? 'syncing' : 'local'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseSyncStatus('local');
      return;
    }
    setIsSyncingWithSupabase(true);
    setSupabaseSyncStatus('syncing');
    try {
      const result = await fetchAllFromSupabase();
      if (result) {
        if (result.works.length > 0) {
          setWorks(prev => {
            const others = prev.filter(w => w.code !== 'OBR-001' && w.id !== 'work-1');
            return [result.works[0], ...others];
          });
        }
        if (result.incurredCosts.length > 0) {
          setIncurredCosts(result.incurredCosts);
        }
        if (result.revenues.length > 0) {
          setRevenues(result.revenues);
        }
        if (result.budgetAccounts.length > 0) {
          setBudgetAccounts(result.budgetAccounts);
        }
        if (result.erpToBudgetTotalizerMappings.length > 0) {
          setErpToBudgetTotalizerMappings(result.erpToBudgetTotalizerMappings);
        }
        setSupabaseSyncStatus('synced');
        setLastSyncedAt(result.meta.syncedAt);
      } else {
        setSupabaseSyncStatus('local');
      }
    } catch (err) {
      console.warn('Erro ao sincronizar com Supabase:', err);
      setSupabaseSyncStatus('error');
    } finally {
      setIsSyncingWithSupabase(false);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured()) {
      syncWithSupabase();
    }
  }, []);


  // Sincronização automática com localStorage versionado
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_works`, JSON.stringify(works)); }, [works]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_stages`, JSON.stringify(stages)); }, [stages]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_budget_versions`, JSON.stringify(budgetVersions)); }, [budgetVersions]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_budget_items`, JSON.stringify(budgetItems)); }, [budgetItems]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_requisitions`, JSON.stringify(requisitions)); }, [requisitions]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_orders`, JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_receipts`, JSON.stringify(receipts)); }, [receipts]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_incurred_costs`, JSON.stringify(incurredCosts)); }, [incurredCosts]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_revenues`, JSON.stringify(revenues)); }, [revenues]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_labor_people`, JSON.stringify(laborPeople)); }, [laborPeople]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_labor_entries`, JSON.stringify(laborEntries)); }, [laborEntries]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_import_batches`, JSON.stringify(importBatches)); }, [importBatches]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_audit_logs`, JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_budget_accounts`, JSON.stringify(budgetAccounts)); }, [budgetAccounts]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_erp_cost_accounts`, JSON.stringify(erpCostAccounts)); }, [erpCostAccounts]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_budget_to_erp_mappings`, JSON.stringify(budgetToErpMappings)); }, [budgetToErpMappings]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_erp_to_budget_totalizer_mappings`, JSON.stringify(erpToBudgetTotalizerMappings)); }, [erpToBudgetTotalizerMappings]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_physical_progress_entries`, JSON.stringify(physicalProgressEntries)); }, [physicalProgressEntries]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_incc_adjustments`, JSON.stringify(inccAdjustments)); }, [inccAdjustments]);
  useEffect(() => { localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_pco_profiles`, JSON.stringify(pcoImportProfiles)); }, [pcoImportProfiles]);

  const addAuditLog = (action: string, entity: string, entity_id?: string, details?: string) => {
    const log: SystemAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: user?.id || 'sys',
      user_name: user?.name || 'Sistema',
      action,
      entity,
      entity_id,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [log, ...prev.slice(0, 199)]);
  };

  // Recalcular avanço ponderado da obra
  const recalculateWorkProgress = (workId: string, currentStages: Stage[]) => {
    const workStages = currentStages.filter(s => s.work_id === workId);
    const weightedProgress = calculateWeightedProgress(workStages);
    setWorks(prev => prev.map(w => w.id === workId ? { ...w, progress_percent: weightedProgress, updated_at: new Date().toISOString() } : w));
  };

  // Works CRUD
  const addWork = (data: Omit<Work, 'id' | 'created_at' | 'updated_at' | 'progress_percent'>): Work => {
    const newWork: Work = {
      ...data,
      id: 'work-' + Date.now(),
      progress_percent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setWorks(prev => [newWork, ...prev]);
    addAuditLog('Criar Obra', 'works', newWork.id, `Obra ${newWork.name} (${newWork.code}) cadastrada`);
    return newWork;
  };

  const updateWork = (id: string, updates: Partial<Work>) => {
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.progress_percent !== undefined && sanitizedUpdates.progress_percent > 100) {
      sanitizedUpdates.progress_percent = Number((sanitizedUpdates.progress_percent / 100).toFixed(2));
    }
    setWorks(prev => prev.map(w => w.id === id ? { ...w, ...sanitizedUpdates, updated_at: new Date().toISOString() } : w));
    addAuditLog('Atualizar Obra', 'works', id, `Atualização dos dados da obra`);
  };

  const deleteWork = (id: string) => {
    const target = works.find(w => w.id === id);
    setWorks(prev => prev.filter(w => w.id !== id));
    addAuditLog('Excluir Obra', 'works', id, `Obra ${target?.name || id} removida`);
  };

  // Stages CRUD
  const addStage = (stageData: Omit<Stage, 'id' | 'created_at' | 'updated_at'>) => {
    const newStage: Stage = {
      ...stageData,
      id: 'stage-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let nextStages = [...stages, newStage];

    // Se é uma subetapa, recalcula a macroetapa pai
    if (newStage.parent_id) {
      const siblings = nextStages.filter(s => s.parent_id === newStage.parent_id);
      const totalWeight = siblings.reduce((acc, s) => acc + (s.weight_percent || 0), 0);
      const weightedSum = siblings.reduce((acc, s) => acc + (s.progress_percent || 0) * (s.weight_percent || 0), 0);
      const parentProgress = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
      nextStages = nextStages.map(s => s.id === newStage.parent_id ? {
        ...s,
        progress_percent: parentProgress,
        status: parentProgress === 100 ? 'concluida' : (parentProgress > 0 ? 'em_andamento' : 'nao_iniciada'),
        updated_at: new Date().toISOString(),
      } : s);
    }

    setStages(nextStages);
    recalculateWorkProgress(stageData.work_id, nextStages);
    addAuditLog('Criar Etapa', 'stages', newStage.id, `Etapa ${newStage.name} (${newStage.code}) criada`);
  };

  const updateStage = (id: string, updates: Partial<Stage>) => {
    const nextStages = stages.map(s => s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s);
    setStages(nextStages);
    const target = stages.find(s => s.id === id);
    if (target) {
      recalculateWorkProgress(target.work_id, nextStages);
    }
  };

  const deleteStage = (id: string) => {
    const target = stages.find(s => s.id === id);
    const nextStages = stages.filter(s => s.id !== id && s.parent_id !== id);
    setStages(nextStages);
    if (target) {
      recalculateWorkProgress(target.work_id, nextStages);
      addAuditLog('Excluir Etapa', 'stages', id, `Etapa ${target.name} removida`);
    }
  };

  const updateStageProgress = (id: string, newPercent: number, reason?: string) => {
    const target = stages.find(s => s.id === id);
    if (!target) return;
    
    const validatedPercent = Math.min(100, Math.max(0, Math.round(newPercent * 100) / 100));
    const isCompleted = validatedPercent === 100;
    const newStatus: Stage['status'] = isCompleted ? 'concluida' : (validatedPercent > 0 ? 'em_andamento' : 'nao_iniciada');

    let nextStages = stages.map(s => s.id === id ? {
      ...s,
      progress_percent: validatedPercent,
      status: newStatus,
      actual_start: s.actual_start || (validatedPercent > 0 ? new Date().toISOString().split('T')[0] : undefined),
      actual_end: isCompleted ? (s.actual_end || new Date().toISOString().split('T')[0]) : undefined,
      updated_at: new Date().toISOString(),
    } : s);

    // Rollup automático para a macroetapa pai se esta for uma subetapa
    if (target.parent_id) {
      const siblingSubstages = nextStages.filter(s => s.parent_id === target.parent_id);
      const totalWeight = siblingSubstages.reduce((acc, s) => acc + (s.weight_percent || 0), 0);
      const weightedSum = siblingSubstages.reduce((acc, s) => acc + (s.progress_percent || 0) * (s.weight_percent || 0), 0);
      const parentProgress = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
      const parentCompleted = parentProgress === 100;
      const parentStatus: Stage['status'] = parentCompleted ? 'concluida' : (parentProgress > 0 ? 'em_andamento' : 'nao_iniciada');

      nextStages = nextStages.map(s => s.id === target.parent_id ? {
        ...s,
        progress_percent: parentProgress,
        status: parentStatus,
        updated_at: new Date().toISOString(),
      } : s);
    }

    setStages(nextStages);
    recalculateWorkProgress(target.work_id, nextStages);
    addAuditLog('Atualizar Progresso', 'stages', id, `Etapa ${target.name}: ${target.progress_percent}% -> ${validatedPercent}%. ${reason ? 'Motivo: ' + reason : ''}`);
  };

  // Budget
  const addBudgetItem = (item: Omit<BudgetItem, 'id' | 'created_at'>) => {
    const newItem: BudgetItem = {
      ...item,
      id: 'bi-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setBudgetItems(prev => [...prev, newItem]);
    addAuditLog('Adicionar Item Orçamento', 'budget_items', newItem.id, `Item ${newItem.description} adicionado`);
  };

  const updateBudgetItem = (id: string, updates: Partial<BudgetItem>) => {
    setBudgetItems(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBudgetItem = (id: string) => {
    setBudgetItems(prev => prev.filter(b => b.id !== id));
  };

  const createBudgetVersion = (workId: string, title: string, reason: string) => {
    const workVersions = budgetVersions.filter(v => v.work_id === workId);
    const newVerNumber = workVersions.length + 1;
    const newVersion: BudgetVersion = {
      id: 'bv-' + workId + '-' + newVerNumber,
      work_id: workId,
      version_number: newVerNumber,
      title,
      status: 'rascunho',
      is_current_approved: false,
      total_amount: 0,
      reason,
      user_name: user?.name || 'Gestor',
      created_at: new Date().toISOString(),
    };
    setBudgetVersions(prev => [...prev, newVersion]);
    addAuditLog('Criar Versão de Orçamento', 'budget_versions', newVersion.id, `Revisão ${newVerNumber}: ${title}`);
  };

  const approveBudgetVersion = (versionId: string) => {
    const target = budgetVersions.find(v => v.id === versionId);
    if (!target) return;

    setBudgetVersions(prev => prev.map(v => {
      if (v.work_id === target.work_id) {
        return {
          ...v,
          is_current_approved: v.id === versionId,
          status: v.id === versionId ? 'aprovada' : 'revisada',
        };
      }
      return v;
    }));
    addAuditLog('Aprovar Orçamento', 'budget_versions', versionId, `Versão ${target.title} definida como oficial aprovada`);
  };

  // Plano A: Contas do Orçamento & Versionamento Aberto
  const addBudgetAccount = (account: Omit<BudgetAccount, 'id' | 'created_at'>) => {
    const newAccount: BudgetAccount = {
      ...account,
      id: 'ba-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBudgetAccounts(prev => [...prev, newAccount]);
    addAuditLog('Criar Conta Orçamento', 'budget_accounts', newAccount.id, `Conta ${newAccount.account_code} - ${newAccount.description}`);
  };

  const updateBudgetAccount = (id: string, updates: Partial<BudgetAccount>, reason?: string) => {
    setBudgetAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a));
    addAuditLog('Atualizar Conta Orçamento', 'budget_accounts', id, `Conta orçamentária atualizada. ${reason ? 'Motivo: ' + reason : ''}`);
  };

  const deleteBudgetAccount = (id: string) => {
    // Inativação lógica conforme requisito: nunca apagar fisicamente se possuir histórico
    setBudgetAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'inativo' as BudgetAccountStatus, updated_at: new Date().toISOString() } : a));
    addAuditLog('Inativar Conta Orçamento', 'budget_accounts', id, 'Conta orçamentária marcada como inativa');
  };

  const createBudgetVersionWithAccounts = (workId: string, baseVersionId: string, title: string, reason: string): string => {
    const workVersions = budgetVersions.filter(v => v.work_id === workId);
    const newVerNumber = workVersions.length + 1;
    const newVersionId = 'bv-' + workId + '-' + newVerNumber + '-' + Date.now();

    const baseAccounts = budgetAccounts.filter(a => (a.budget_version_id === baseVersionId || a.version_id === baseVersionId) && a.status !== 'inativo' && a.status !== 'descontinuada');
    const clonedAccounts: BudgetAccount[] = baseAccounts.map(a => ({
      ...a,
      id: 'ba-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      budget_version_id: newVersionId,
      version_id: newVersionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const totalAmount = clonedAccounts
      .filter(a => a.account_type === 'atividade')
      .reduce((sum, a) => sum + (a.total_amount || 0), 0);

    const newVersion: BudgetVersion = {
      id: newVersionId,
      work_id: workId,
      version_number: newVerNumber,
      title,
      status: 'rascunho',
      is_current_approved: false,
      total_amount: totalAmount,
      reason,
      user_name: user?.name || 'Engenheiro',
      created_at: new Date().toISOString(),
    };

    setBudgetVersions(prev => [...prev, newVersion]);
    setBudgetAccounts(prev => [...prev, ...clonedAccounts]);
    addAuditLog('Criar Versão do Orçamento', 'budget_versions', newVersionId, `Versão v${newVerNumber}: ${title} copiada de ${baseVersionId} com ${clonedAccounts.length} contas`);
    return newVersionId;
  };

  const applyInccAdjustment = (
    workId: string,
    fromVersionId: string,
    indexPercent: number,
    scope: InccScope,
    baseDateOld: string,
    baseDateNew: string,
    justification: string,
    selectedAccountIds?: string[]
  ): { newVersionId: string; adjustment: BudgetIndexAdjustment } => {
    const currentAccounts = budgetAccounts.filter(a => (a.budget_version_id === fromVersionId || a.version_id === fromVersionId) && a.status !== 'inativo' && a.status !== 'descontinuada');
    const simulation = simulateInccAdjustment(currentAccounts, indexPercent, scope, selectedAccountIds);

    const workVersions = budgetVersions.filter(v => v.work_id === workId);
    const newVerNumber = workVersions.length + 1;
    const newVersionId = 'bv-' + workId + '-' + newVerNumber + '-incc';

    const clonedAccounts: BudgetAccount[] = simulation.adjustedAccounts.map(acc => ({
      ...acc,
      id: 'ba-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      budget_version_id: newVersionId,
      version_id: newVersionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const totalAmount = clonedAccounts
      .filter(a => a.account_type === 'atividade')
      .reduce((sum, a) => sum + (a.total_amount || 0), 0);

    const newVersion: BudgetVersion = {
      id: newVersionId,
      work_id: workId,
      version_number: newVerNumber,
      title: `Revisão INCC (${indexPercent > 0 ? '+' : ''}${indexPercent}%) - ${baseDateNew}`,
      status: 'rascunho',
      is_current_approved: false,
      total_amount: totalAmount,
      reason: `Reajuste INCC: ${justification}`,
      user_name: user?.name || 'Engenheiro',
      created_at: new Date().toISOString(),
    };

    const adjId = 'adj-' + Date.now();
    const newAdjustment: BudgetIndexAdjustment = {
      id: adjId,
      work_id: workId,
      from_version_id: fromVersionId,
      to_version_id: newVersionId,
      index_name: 'INCC',
      index_percent: indexPercent,
      index_rate_percent: indexPercent,
      base_date_old: baseDateOld,
      base_date_new: baseDateNew,
      scope,
      justification,
      total_base_amount: simulation.totalBaseAmount,
      total_adjusted_amount: simulation.totalAdjustedAmount,
      difference_amount: simulation.differenceAmount,
      applied_by: user?.name || 'Engenheiro',
      items: simulation.adjustedAccounts,
      created_at: new Date().toISOString(),
    };

    setBudgetVersions(prev => [...prev, newVersion]);
    setBudgetAccounts(prev => [...prev, ...clonedAccounts]);
    setInccAdjustments(prev => [newAdjustment, ...prev]);
    addAuditLog('Reajuste INCC', 'budget_index_adjustments', adjId, `Aplicado ${indexPercent}% no escopo ${scope}. Gerada versão v${newVerNumber}`);

    return { newVersionId, adjustment: newAdjustment };
  };

  // Plano B: Contas do ERP
  const addErpCostAccount = (account: Omit<ErpCostAccount, 'id' | 'created_at'>) => {
    const newAccount: ErpCostAccount = {
      ...account,
      id: 'erp-acc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
    };
    setErpCostAccounts(prev => [...prev, newAccount]);
    addAuditLog('Adicionar Conta ERP', 'erp_cost_accounts', newAccount.id, `Conta ERP ${newAccount.account_code} - ${newAccount.description}`);
  };

  const updateErpCostAccount = (id: string, updates: Partial<ErpCostAccount>) => {
    setErpCostAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    addAuditLog('Atualizar Conta ERP', 'erp_cost_accounts', id, 'Conta ERP atualizada');
  };

  // De-para 1: Orçamento -> ERP
  const addBudgetToErpMapping = (mapping: Omit<BudgetToErpMapping, 'id' | 'created_at'>) => {
    const newMap: BudgetToErpMapping = {
      ...mapping,
      id: 'map1-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBudgetToErpMappings(prev => [...prev, newMap]);
    addAuditLog('Criar De-Para 1', 'budget_to_erp_mappings', newMap.id, `Orçamento ${newMap.budget_account_code} -> ERP ${newMap.erp_account_code}`);
  };

  const updateBudgetToErpMapping = (id: string, updates: Partial<BudgetToErpMapping>) => {
    setBudgetToErpMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m));
    addAuditLog('Atualizar De-Para 1', 'budget_to_erp_mappings', id, 'Mapeamento De-Para 1 atualizado');
  };

  const deleteBudgetToErpMapping = (id: string) => {
    setBudgetToErpMappings(prev => prev.filter(m => m.id !== id));
    addAuditLog('Excluir De-Para 1', 'budget_to_erp_mappings', id, 'Mapeamento De-Para 1 removido');
  };

  // De-para 2: Contas Detalhadas ERP -> Conta Totalizadora ERP
  const addErpToBudgetTotalizerMapping = (mapping: Omit<ErpToBudgetTotalizerMapping, 'id' | 'created_at'>) => {
    const newMap: ErpToBudgetTotalizerMapping = {
      ...mapping,
      id: 'map2-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setErpToBudgetTotalizerMappings(prev => [...prev, newMap]);
    addAuditLog('Criar De-Para 2', 'erp_to_budget_totalizer_mappings', newMap.id, `ERP Detalhado ${newMap.detailed_erp_account_code} -> Totalizador ${newMap.totalizer_erp_account_code}`);
  };

  const updateErpToBudgetTotalizerMapping = (id: string, updates: Partial<ErpToBudgetTotalizerMapping>) => {
    setErpToBudgetTotalizerMappings(prev => prev.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m));
    addAuditLog('Atualizar De-Para 2', 'erp_to_budget_totalizer_mappings', id, 'Mapeamento De-Para 2 atualizado');
  };

  const deleteErpToBudgetTotalizerMapping = (id: string) => {
    setErpToBudgetTotalizerMappings(prev => prev.filter(m => m.id !== id));
    addAuditLog('Excluir De-Para 2', 'erp_to_budget_totalizer_mappings', id, 'Mapeamento De-Para 2 removido');
  };

  // Medições Físicas
  const addPhysicalProgressEntry = (entry: Omit<PhysicalProgressEntry, 'id' | 'created_at'>) => {
    const newEntry: PhysicalProgressEntry = {
      ...entry,
      id: 'phys-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
    };
    setPhysicalProgressEntries(prev => [newEntry, ...prev]);

    // Atualiza também o avanço físico na budgetAccount se encontrada
    if (entry.budget_account_id) {
      setBudgetAccounts(prev => prev.map(a => a.id === entry.budget_account_id ? {
        ...a,
        progress_actual: entry.progress_percent,
        actual_start: a.actual_start || entry.measurement_date,
        actual_end: entry.progress_percent >= 100 ? (a.actual_end || entry.measurement_date) : a.actual_end,
        updated_at: new Date().toISOString(),
      } : a));
    }

    addAuditLog('Medição Física', 'physical_progress_entries', newEntry.id, `Medição: ${entry.progress_percent}% registrada por ${entry.engineer_name}`);
  };

  // Purchasing
  const addRequisition = (req: Omit<PurchaseRequisition, 'id' | 'created_at' | 'internal_number'>) => {
    const number = `REQ-2026-${String(requisitions.length + 1).padStart(4, '0')}`;
    const newReq: PurchaseRequisition = {
      ...req,
      id: 'req-' + Date.now(),
      internal_number: number,
      created_at: new Date().toISOString(),
    };
    setRequisitions(prev => [newReq, ...prev]);
    addAuditLog('Criar Requisição', 'purchase_requisitions', newReq.id, `${number}: ${req.justification}`);
  };

  const updateRequisitionStatus = (id: string, status: PurchaseRequisition['status'], notes?: string) => {
    setRequisitions(prev => prev.map(r => r.id === id ? { ...r, status, approval_notes: notes } : r));
    addAuditLog('Alterar Status Requisição', 'purchase_requisitions', id, `Status alterado para: ${status}`);
  };

  const addPurchaseOrder = (order: Omit<PurchaseOrder, 'id' | 'created_at' | 'internal_number'>) => {
    const number = `PC-2026-${String(orders.length + 1).padStart(4, '0')}`;
    const newOrder: PurchaseOrder = {
      ...order,
      id: 'po-' + Date.now(),
      internal_number: number,
      created_at: new Date().toISOString(),
    };
    setOrders(prev => [newOrder, ...prev]);
    addAuditLog('Emitir Pedido de Compra', 'purchase_orders', newOrder.id, `${number} emitido para ${order.supplier_name}`);
  };

  const updateOrderStatus = (id: string, status: PurchaseOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    addAuditLog('Alterar Status Pedido', 'purchase_orders', id, `Pedido alterado para: ${status}`);
  };

  const addReceipt = (receipt: Omit<Receipt, 'id' | 'created_at'>) => {
    const newRec: Receipt = {
      ...receipt,
      id: 'rec-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setReceipts(prev => [newRec, ...prev]);

    // Atualiza status do pedido se vinculado
    if (receipt.order_id) {
      setOrders(prev => prev.map(o => o.id === receipt.order_id ? {
        ...o,
        status: receipt.is_partial ? 'parcialmente_recebido' : 'recebido',
      } : o));
    }

    // Gera automaticamente custo incorrido correspondente se for recebimento
    const linkedOrder = orders.find(o => o.id === receipt.order_id);
    const newCost: IncurredCost = {
      id: 'cost-' + Date.now(),
      work_id: receipt.work_id,
      order_id: receipt.order_id,
      receipt_id: newRec.id,
      date: receipt.receipt_date,
      cost_center: linkedOrder?.cost_center || 'CC-GERAL',
      category: 'material',
      supplier_name: linkedOrder?.supplier_name || 'Fornecedor',
      document_number: receipt.invoice_number,
      description: `Recebimento Ref. ${receipt.invoice_number} (Pedido ${linkedOrder?.internal_number || 'S/N'})`,
      gross_value: receipt.received_value,
      discounts: 0,
      taxes: 0,
      net_value: receipt.received_value,
      payment_status: 'pendente',
      created_at: new Date().toISOString(),
    };
    setIncurredCosts(prev => [newCost, ...prev]);

    addAuditLog('Registrar Recebimento', 'receipts', newRec.id, `NF ${receipt.invoice_number} recebida - Custo Incorrido gerado`);
  };

  const addIncurredCost = (cost: Omit<IncurredCost, 'id' | 'created_at'>) => {
    const newCost: IncurredCost = {
      ...cost,
      id: 'cost-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setIncurredCosts(prev => [newCost, ...prev]);
    addAuditLog('Lançamento de Custo', 'incurred_costs', newCost.id, `${cost.document_number} - ${cost.description} (R$ ${cost.net_value})`);
  };

  // Labor
  const toggleWorkLabor = (workId: string, enabled: boolean) => {
    setWorks(prev => prev.map(w => w.id === workId ? { ...w, labor_enabled: enabled, updated_at: new Date().toISOString() } : w));
    addAuditLog('Mão de Obra', 'works', workId, `Funcionalidade de mão de obra ${enabled ? 'habilitada' : 'desabilitada'}`);
  };

  const addLaborPerson = (person: Omit<LaborPerson, 'id' | 'created_at'>) => {
    const newPerson: LaborPerson = {
      ...person,
      id: 'lp-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setLaborPeople(prev => [...prev, newPerson]);
    addAuditLog('Cadastrar Colaborador', 'labor_people', newPerson.id, `${person.name} (${person.role_function})`);
  };

  const addLaborEntry = (entry: Omit<LaborEntry, 'id' | 'created_at' | 'total_calculated'>) => {
    const total = entry.units_worked * entry.unit_cost;
    const newEntry: LaborEntry = {
      ...entry,
      id: 'le-' + Date.now(),
      total_calculated: total,
      created_at: new Date().toISOString(),
    };
    setLaborEntries(prev => [newEntry, ...prev]);
    addAuditLog('Apontamento de Horas', 'labor_entries', newEntry.id, `${entry.units_worked} unidades para ${entry.person_name}`);
  };

  const updateLaborEntryStatus = (id: string, status: LaborEntry['status']) => {
    setLaborEntries(prev => prev.map(e => e.id === id ? {
      ...e,
      status,
      approved_by: status === 'aprovado' ? user?.name : undefined,
    } : e));
    addAuditLog('Aprovação Mão de Obra', 'labor_entries', id, `Status de apontamento alterado para ${status}`);
  };

  // Motor de Importação ERP (CSV / XLSX)
  const processErpImport = (
    type: ErpImportType,
    fileName: string,
    rows: Record<string, any>[],
    strategy: DeduplicationStrategy
  ): { batch: ErpImportBatch; errors: ErpImportError[] } => {
    const batchId = 'batch-' + Date.now();
    const errors: ErpImportError[] = [];
    let imported = 0;
    let updated = 0;
    let ignored = 0;
    let rejected = 0;

    const sanitizeNum = (v: any) => {
      if (typeof v === 'number') return v;
      if (!v) return 0;
      const str = String(v).replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      return parseFloat(str) || 0;
    };

    if (type === 'incurred_costs') {
      const newCosts: IncurredCost[] = [];
      const updatedCostMap = new Map(incurredCosts.map(c => [c.external_id || c.document_number, c]));

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const extId = row.external_id || row.id_externo || row.codigo_erp || row.document_number || row.numero_documento;
        const workIdentifier = row.work_id || row.codigo_obra || row.obra || row.codigo_interno;
        const docNum = row.document_number || row.numero_documento || row.nf || row.nota_fiscal || `IMP-${rowNum}`;
        const val = sanitizeNum(row.net_value || row.valor_liquido || row.valor || row.valor_bruto);

        // Validação básica
        if (!val || val <= 0) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Valor líquido inválido ou zerado', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }

        // Resolução da obra (por código interno ou ERP)
        const targetWork = works.find(w => w.code === workIdentifier || w.erp_code === workIdentifier || w.id === workIdentifier) || works[0];

        const existingKey = extId || docNum;
        const exists = updatedCostMap.has(existingKey);

        if (exists) {
          if (strategy === 'reject_duplicates') {
            errors.push({ batch_id: batchId, row_number: rowNum, error_message: `Registro duplicado encontrado (${existingKey})`, raw_data: JSON.stringify(row) });
            rejected++;
            return;
          }
          if (strategy === 'insert_new') {
            ignored++;
            return;
          }
          if (strategy === 'update_existing') {
            const old = updatedCostMap.get(existingKey)!;
            updatedCostMap.set(existingKey, {
              ...old,
              net_value: val,
              gross_value: val,
              description: row.description || row.descricao || old.description,
              date: row.date || row.data || old.date,
            });
            updated++;
            return;
          }
        }

        // Inserção de novo registro
        const newCost: IncurredCost = {
          id: 'cost-' + Date.now() + '-' + idx,
          work_id: targetWork.id,
          external_id: extId || `ERP-${Date.now()}-${idx}`,
          document_number: docNum,
          date: row.date || row.data || new Date().toISOString().split('T')[0],
          cost_center: row.cost_center || row.centro_custo || 'CC-GERAL',
          category: (row.category || row.categoria || 'material').toLowerCase() as any,
          supplier_name: row.supplier_name || row.fornecedor || 'Fornecedor ERP',
          description: row.description || row.descricao || 'Custo importado via planilha do ERP',
          gross_value: val,
          discounts: 0,
          taxes: 0,
          net_value: val,
          payment_status: 'pago',
          source_batch_id: batchId,
          created_at: new Date().toISOString(),
        };
        newCosts.push(newCost);
        imported++;
      });

      if (strategy === 'update_existing') {
        setIncurredCosts([...Array.from(updatedCostMap.values()), ...newCosts]);
      } else {
        setIncurredCosts(prev => [...newCosts, ...prev]);
      }

      // Persistência em nuvem se o Supabase estiver configurado
      if (newCosts.length > 0 && isSupabaseConfigured()) {
        const dbRows = newCosts.map(c => ({
          document_number: c.document_number,
          cost_account_name: c.erp_account_code || c.category || 'Despesa Geral',
          entry_date: c.date,
          supplier_contractor_name: c.supplier_name,
          entry_description: c.description,
          amount: c.net_value,
          nature_classification: 'custo_obra',
          adjusted_consolidated_account: c.erp_account_code || 'OUTROS',
          external_entry_id: c.external_id,
        }));
        saveImportedEntriesToSupabase(dbRows, batchId).then(res => {
          if (res.success) {
            console.log(`[DataContext] ${res.insertedCount} novos lançamentos foram persistidos no Supabase.`);
          }
        }).catch(err => {
          console.error('[DataContext] Erro ao persistir importação no Supabase:', err);
        });
      }
    } else if (type === 'works') {
      const newWorksList: Work[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const code = row.code || row.codigo || `OBR-${String(works.length + idx + 1).padStart(3, '0')}`;
        const name = row.name || row.nome_obra || row.obra;
        if (!name) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Nome da obra é obrigatório', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }

        const exists = works.find(w => w.code === code || (row.erp_code && w.erp_code === row.erp_code));
        if (exists && strategy === 'reject_duplicates') {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: `Obra duplicada com código ${code}`, raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }

        const newWork: Work = {
          id: 'work-' + Date.now() + '-' + idx,
          organization_id: 'org-1',
          code,
          erp_code: row.erp_code || row.codigo_erp,
          name,
          client: row.client || row.cliente || 'Cliente Direto',
          address: row.address || row.endereco || 'Endereço não informado',
          city_state: row.city_state || row.cidade_uf || 'São Paulo/SP',
          state: row.state || row.uf || (row.city_state ? row.city_state.split('/')[1] : 'SP') || 'SP',
          city: row.city || row.cidade || (row.city_state ? row.city_state.split('/')[0] : 'São Paulo') || 'São Paulo',
          engineer_name: row.engineer_name || row.engenheiro || row.engenheiro_responsavel || 'Eng. Lucas Pinho',
          project_type: row.project_type || row.tipo || 'Edificação',
          manager_name: row.manager_name || row.gestor || user?.name || 'Gestor',
          planned_start: row.planned_start || row.data_inicio || '2026-01-01',
          planned_end: row.planned_end || row.data_termino || '2026-12-31',
          contract_value: sanitizeNum(row.contract_value || row.valor_contrato || 5000000),
          status: 'em_andamento',
          progress_percent: 0,
          labor_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newWorksList.push(newWork);
        imported++;
      });
      setWorks(prev => [...newWorksList, ...prev]);
    } else if (type === 'plano_orcamento') {
      const newAccounts: BudgetAccount[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const code = row.code || row.account_code || row.codigo;
        const desc = row.description || row.descricao;
        if (!code || !desc) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Código e Descrição da conta do orçamento são obrigatórios', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }
        const acc: BudgetAccount = {
          id: 'ba-imp-' + Date.now() + '-' + idx,
          work_id: row.work_id || row.obra_id || works[0]?.id || 'work-1',
          budget_version_id: row.version_id || row.versao_id || budgetVersions[0]?.id || 'bv-work-1-v1',
          version_id: row.version_id || row.versao_id || budgetVersions[0]?.id || 'bv-work-1-v1',
          code: String(code),
          account_code: String(code),
          description: String(desc),
          account_type: (row.type || row.tipo || (String(code).includes('.') ? 'atividade' : 'grupo')) as any,
          display_order: newAccounts.length + 1,
          order_index: newAccounts.length + 1,
          quantity: row.quantity || row.quantidade ? Number(row.quantity || row.quantidade) : undefined,
          unit: row.unit || row.unidade,
          unit_cost: row.unit_value || row.valor_unitario ? Number(row.unit_value || row.valor_unitario) : undefined,
          unit_value: row.unit_value || row.valor_unitario ? Number(row.unit_value || row.valor_unitario) : undefined,
          total_amount: Number(row.total_amount || row.valor_total || (row.unit_value && row.quantity ? Number(row.unit_value) * Number(row.quantity) : 0)),
          physical_weight_percent: Number(row.weight || row.peso || row.peso_fisico || 0),
          progress_planned: Number(row.planned || row.planejado || 0),
          progress_actual: Number(row.actual || row.realizado || 0),
          status: 'ativo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newAccounts.push(acc);
        imported++;
      });
      setBudgetAccounts(prev => [...prev, ...newAccounts]);
    } else if (type === 'plano_erp') {
      const newErpAccs: ErpCostAccount[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const code = row.code || row.account_code || row.codigo;
        const desc = row.description || row.descricao;
        if (!code || !desc) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Código e Descrição da conta ERP são obrigatórios', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }
        const acc: ErpCostAccount = {
          id: 'erp-imp-' + Date.now() + '-' + idx,
          code: String(code),
          account_code: String(code),
          description: String(desc),
          account_type: (row.type || row.tipo || 'detalhada') as any,
          category: (row.category || row.categoria || 'outros') as any,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        newErpAccs.push(acc);
        imported++;
      });
      setErpCostAccounts(prev => [...prev, ...newErpAccs]);
    } else if (type === 'de_para_1') {
      const newMaps: BudgetToErpMapping[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const bCode = row.budget_account_code || row.codigo_orcamento;
        const eCode = row.erp_account_code || row.codigo_erp;
        if (!bCode || !eCode) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Código Orçamento e Código ERP são obrigatórios', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }
        const map: BudgetToErpMapping = {
          id: 'm1-imp-' + Date.now() + '-' + idx,
          budget_account_code: String(bCode),
          budget_account_description: row.budget_description || row.descricao_orcamento || '',
          erp_account_code: String(eCode),
          erp_account_description: row.erp_description || row.descricao_erp || '',
          mapping_type: (row.mapping_type || row.tipo || 'direto') as any,
          apportionment_percent: Number(row.percent || row.rateio || 100),
          is_active: true,
          priority: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newMaps.push(map);
        imported++;
      });
      setBudgetToErpMappings(prev => [...prev, ...newMaps]);
    } else if (type === 'de_para_2') {
      const newMaps: ErpToBudgetTotalizerMapping[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const dCode = row.detailed_erp_account_code || row.codigo_detalhada;
        const tCode = row.totalizer_erp_account_code || row.codigo_totalizadora;
        if (!dCode || !tCode) {
          errors.push({ batch_id: batchId, row_number: rowNum, error_message: 'Código Detalhado e Código Totalizador do ERP são obrigatórios', raw_data: JSON.stringify(row) });
          rejected++;
          return;
        }
        const map: ErpToBudgetTotalizerMapping = {
          id: 'm2-imp-' + Date.now() + '-' + idx,
          detailed_erp_account_code: String(dCode),
          detailed_erp_account_description: row.detailed_description || row.descricao_detalhada || '',
          totalizer_erp_account_code: String(tCode),
          totalizer_erp_account_description: row.totalizer_description || row.descricao_totalizadora || '',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newMaps.push(map);
        imported++;
      });
      setErpToBudgetTotalizerMappings(prev => [...prev, ...newMaps]);
    } else {
      // Outros tipos de importação simulados com sucesso
      imported = rows.length;
    }

    const batch: ErpImportBatch = {
      id: batchId,
      import_type: type,
      file_name: fileName,
      deduplication_strategy: strategy,
      total_rows: rows.length,
      imported_rows: imported,
      updated_rows: updated,
      ignored_rows: ignored,
      rejected_rows: rejected,
      status: errors.length > 0 ? (imported > 0 ? 'com_erros' : 'falha') : 'processado',
      user_name: user?.name || 'Usuário',
      created_at: new Date().toISOString(),
    };

    setImportBatches(prev => [batch, ...prev]);
    addAuditLog('Importação ERP', 'erp_import_batches', batchId, `Arquivo ${fileName}: ${imported} importados, ${updated} atualizados, ${rejected} rejeitados`);

    return { batch, errors };
  };

  const importPcoWorkbook = async (parsed: PcoParsedData) => {
    // 1. Atualizar obra correspondente com métricas físicas e financeiras
    const rawProgress = parsed.macro.accumulatedExecutedProgress;
    const physicalPercent = rawProgress <= 1.0 ? Number((rawProgress * 100).toFixed(2)) : Number(rawProgress.toFixed(2));
    updateWork(parsed.workId, {
      pco_physical_progress: physicalPercent,
      progress_percent: physicalPercent > 0 ? physicalPercent : undefined,
      pco_budget_total: parsed.macro.totalPlannedBudget,
      pco_real_spent: parsed.real.totalSpent,
      pco_last_imported_at: new Date().toISOString(),
    });

    // 2. Atualizar ou criar perfil de importação PCO
    const existingIndex = pcoImportProfiles.findIndex((p) => p.work_id === parsed.workId);
    const updatedProfile: PcoImportProfile = {
      id: existingIndex >= 0 ? pcoImportProfiles[existingIndex].id : `pco-profile-${Date.now()}`,
      work_id: parsed.workId,
      sheet_names: {
        macro: 'PLANEJAMENTO MACRO',
        indirects: '% INDIRETOS',
        directs: '% DIRETOS',
        budget: 'BASE ORÇAMENTO',
        real: 'REAL',
        de_para: 'de-para',
      },
      header_rows: {
        macro: 1,
        indirects: 5,
        directs: 5,
        budget: 1,
        real: 1,
        de_para: 1,
      },
      last_file_name: parsed.fileName,
      last_imported_at: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newProfiles = existingIndex >= 0
      ? pcoImportProfiles.map((p, i) => (i === existingIndex ? updatedProfile : p))
      : [updatedProfile, ...pcoImportProfiles];

    setPcoImportProfiles(newProfiles);
    localStorage.setItem(`gestao_obras_${SCHEMA_VERSION}_pco_profiles`, JSON.stringify(newProfiles));

    addAuditLog(
      'Importação PCO',
      'pco_imports',
      parsed.workId,
      `Planilha PCO "${parsed.fileName}" importada com sucesso: Físico ${physicalPercent.toFixed(2)}%, Orçado ${formatBRL(parsed.macro.totalPlannedBudget)}, Real ${formatBRL(parsed.real.totalSpent)}`
    );
  };

  const resetToSeedData = () => {
    setWorks(INITIAL_WORKS);
    setStages(INITIAL_STAGES);
    setBudgetVersions(INITIAL_BUDGET_VERSIONS);
    setBudgetItems(INITIAL_BUDGET_ITEMS);
    setRequisitions(INITIAL_PURCHASE_REQUISITIONS);
    setOrders(INITIAL_PURCHASE_ORDERS);
    setReceipts(INITIAL_RECEIPTS);
    setIncurredCosts(INITIAL_INCURRED_COSTS);
    setRevenues(INITIAL_REVENUES);
    setLaborPeople(INITIAL_LABOR_PEOPLE);
    setLaborEntries(INITIAL_LABOR_ENTRIES);
    setImportBatches(INITIAL_IMPORT_BATCHES);
    setBudgetAccounts(INITIAL_BUDGET_ACCOUNTS);
    setErpCostAccounts(INITIAL_ERP_COST_ACCOUNTS);
    setBudgetToErpMappings(INITIAL_DE_PARA_1);
    setErpToBudgetTotalizerMappings(INITIAL_DE_PARA_2);
    setPhysicalProgressEntries(INITIAL_PHYSICAL_PROGRESS_ENTRIES);
    setInccAdjustments([]);
    setPcoImportProfiles([
      {
        id: 'pco-profile-1',
        work_id: 'work-1',
        sheet_names: {
          macro: 'PLANEJAMENTO MACRO',
          indirects: '% INDIRETOS',
          directs: '% DIRETOS',
          budget: 'BASE ORÇAMENTO',
          real: 'REAL',
          de_para: 'de-para',
        },
        header_rows: {
          macro: 1,
          indirects: 5,
          directs: 5,
          budget: 1,
          real: 1,
          de_para: 1,
        },
        last_file_name: 'ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx',
        last_imported_at: '2026-09-21T12:00:00Z',
        is_active: true,
        created_at: '2026-09-21T12:00:00Z',
        updated_at: '2026-09-21T12:00:00Z',
      },
    ]);
    setAuditLogs([]);
    localStorage.clear();
    addAuditLog('Reset de Dados', 'system', undefined, 'Base restaurada para o seed de demonstração inicial');
  };

  return (
    <DataContext.Provider
      value={{
        works,
        stages,
        budgetVersions,
        budgetItems,
        requisitions,
        orders,
        receipts,
        incurredCosts,
        revenues,
        laborPeople,
        laborEntries,
        importBatches,
        auditLogs,
        budgetAccounts,
        erpCostAccounts,
        budgetToErpMappings,
        erpToBudgetTotalizerMappings,
        physicalProgressEntries,
        inccAdjustments,
        pcoImportProfiles,
        importPcoWorkbook,
        addWork,
        updateWork,
        deleteWork,
        addStage,
        updateStage,
        deleteStage,
        updateStageProgress,
        addBudgetItem,
        updateBudgetItem,
        deleteBudgetItem,
        createBudgetVersion,
        approveBudgetVersion,
        addBudgetAccount,
        updateBudgetAccount,
        deleteBudgetAccount,
        createBudgetVersionWithAccounts,
        applyInccAdjustment,
        addErpCostAccount,
        updateErpCostAccount,
        addBudgetToErpMapping,
        updateBudgetToErpMapping,
        deleteBudgetToErpMapping,
        addErpToBudgetTotalizerMapping,
        updateErpToBudgetTotalizerMapping,
        deleteErpToBudgetTotalizerMapping,
        addPhysicalProgressEntry,
        addRequisition,
        updateRequisitionStatus,
        addPurchaseOrder,
        updateOrderStatus,
        addReceipt,
        addIncurredCost,
        toggleWorkLabor,
        addLaborPerson,
        addLaborEntry,
        updateLaborEntryStatus,
        processErpImport,
        resetToSeedData,
        isSyncingWithSupabase,
        supabaseSyncStatus,
        lastSyncedAt,
        syncWithSupabase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

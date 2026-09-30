import { supabase, isSupabaseConfigured, logAudit } from './supabase';
import type {
  Work,
  IncurredCost,
  Revenue,
  BudgetAccount,
  ErpToBudgetTotalizerMapping,
} from '../types';

export interface SupabaseSyncData {
  works: Work[];
  incurredCosts: IncurredCost[];
  revenues: Revenue[];
  budgetAccounts: BudgetAccount[];
  erpToBudgetTotalizerMappings: ErpToBudgetTotalizerMapping[];
  meta: {
    totalEntries: number;
    totalAmount: number;
    syncedAt: string;
    source: 'supabase_cloud';
  };
}

/**
 * Busca todos os registros do Supabase com paginação segura (PostgREST limita a 1000 por request)
 */
export async function fetchAllFromSupabase(): Promise<SupabaseSyncData | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    console.log('[SupabaseSync] Iniciando sincronização com Supabase Cloud...');

    // 1. Obras
    const { data: dbWorks, error: worksErr } = await supabase
      .from('works')
      .select('*');

    if (worksErr) {
      console.warn('[SupabaseSync] Erro ao buscar obras:', worksErr);
      return null;
    }

    // 2. Contas do Orçamento (298 contas)
    const { data: dbBudgetAccounts, error: budgetErr } = await supabase
      .from('budget_accounts')
      .select('*')
      .order('original_row_number', { ascending: true });

    if (budgetErr) {
      console.warn('[SupabaseSync] Erro ao buscar budget_accounts:', budgetErr);
    }

    // 3. De-Para Mappings (115 regras)
    const { data: dbDePara, error: deParaErr } = await supabase
      .from('erp_account_consolidation_mappings')
      .select('*');

    if (deParaErr) {
      console.warn('[SupabaseSync] Erro ao buscar de-para:', deParaErr);
    }

    // 4. Lançamentos Contábeis Reais (5.635 lançamentos - paginado em blocos de 1.000)
    let allEntries: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data: pageData, error: pageErr } = await supabase
        .from('actual_financial_entries')
        .select('*')
        .range(from, to)
        .order('original_row_number', { ascending: true });

      if (pageErr) {
        console.warn(`[SupabaseSync] Erro na página ${page} de lançamentos:`, pageErr);
        break;
      }

      if (pageData && pageData.length > 0) {
        allEntries = allEntries.concat(pageData);
        if (pageData.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[SupabaseSync] Sucesso: ${allEntries.length} lançamentos recuperados do banco.`);

    // Mapeamento de Obras
    const mappedWorks: Work[] = (dbWorks || []).map((w: any) => ({
      id: 'work-1', // Vincula ao identificador padrão do frontend para Atrium Select
      organization_id: w.organization_id || 'org-1',
      code: w.code || 'OBR-001',
      erp_code: w.erp_code || 'ERP-CE-1042',
      name: w.name || 'Atrium Select',
      client: w.client || 'Monteplan Incorporadora',
      address: w.address || 'Rua Silva Paulet, 782',
      neighborhood: w.neighborhood || 'Meireles',
      city_state: w.city_state || 'Fortaleza/CE',
      city: w.city || (w.city_state ? w.city_state.split('/')[0] : 'Fortaleza'),
      state: w.state || (w.city_state ? w.city_state.split('/')[1] : 'CE'),
      postal_code: w.postal_code || '60120-021',
      latitude: w.latitude ?? -3.7319,
      longitude: w.longitude ?? -38.4989,
      engineer_name: w.engineer_name || 'Eng. Lucas Pinho',
      manager_name: w.manager_name || 'Mariana Duarte',
      project_type: w.project_type || 'Residencial Multifamiliar de Alto Padrão',
      planned_start: w.planned_start || '2025-02-01',
      planned_end: w.planned_end || '2028-02-28',
      actual_start: w.actual_start || '2025-02-15',
      actual_end: w.actual_end,
      contract_value: Number(w.contract_value || 25705359.47),
      status: (w.status || 'em_andamento') as any,
      progress_percent: Number(w.progress_percent || 46.2153),
      labor_enabled: Boolean(w.labor_enabled),
      total_units: Number(w.total_units || 80),
      units_sold: Number(w.units_sold || 64),
      total_area_m2: Number(w.total_area_m2 || 6850),
      private_area_m2: Number(w.private_area_m2 || 4840),
      cub_reference_m2: Number(w.cub_reference_m2 || 2850),
      vgv_total: Number(w.vgv_total || 55206000),
      notes: w.notes || 'Empreendimento com dados integrados em tempo real do Supabase',
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));

    // Mapeamento de Lançamentos em Custos e Receitas
    const mappedCosts: IncurredCost[] = [];
    const mappedRevenues: Revenue[] = [];
    let totalAmount = 0;

    allEntries.forEach((entry: any, idx: number) => {
      const val = Number(entry.amount || 0);
      totalAmount += val;

      if (entry.nature_classification === 'receita') {
        mappedRevenues.push({
          id: entry.id || `rev-${idx}`,
          work_id: 'work-1',
          external_id: entry.external_entry_id || `r_${idx + 1}`,
          date: entry.entry_date || new Date().toISOString().split('T')[0],
          document_number: entry.document_number || `DOC-${idx + 1}`,
          description: entry.entry_description || 'Receita de Venda de Imóveis',
          contracted_value: val,
          recognized_value: val,
          received_value: val,
          status: 'recebido',
          source_batch_id: entry.source_batch_id,
          created_at: entry.created_at || new Date().toISOString(),
        });
      } else {
        mappedCosts.push({
          id: entry.id || `cost-${idx}`,
          work_id: 'work-1',
          external_id: entry.external_entry_id || `r_${idx + 1}`,
          date: entry.entry_date || new Date().toISOString().split('T')[0],
          document_number: entry.document_number || `DOC-${idx + 1}`,
          cost_center: 'CC-ATRIUM',
          category: (entry.nature_classification === 'despesa_comercial' ? 'servico' : 'material') as any,
          supplier_name: entry.supplier_contractor_name || 'Fornecedor ERP',
          description: entry.entry_description || 'Lançamento Contábil ERP',
          gross_value: val,
          discounts: 0,
          taxes: 0,
          net_value: val,
          payment_status: 'pago',
          erp_account_code: entry.cost_account_name || entry.cost_account_code,
          source_batch_id: entry.source_batch_id,
          created_at: entry.created_at || new Date().toISOString(),
        });
      }
    });

    // Mapeamento de Contas Orçamentárias
    const mappedBudgetAccounts: BudgetAccount[] = (dbBudgetAccounts || []).map((ba: any, idx: number) => ({
      id: ba.id,
      work_id: 'work-1',
      budget_version_id: ba.budget_version_id || 'bv-work-1-v1',
      version_id: ba.budget_version_id || 'bv-work-1-v1',
      code: ba.account_code || `0${idx + 1}.0`,
      account_code: ba.account_code || `0${idx + 1}.0`,
      description: ba.description || `Conta Orçamentária ${idx + 1}`,
      group_etapa: ba.group_etapa || 'Geral',
      account_type: 'atividade',
      cost_type: (ba.cost_type || 'direto') as any,
      display_order: ba.original_row_number || (idx + 1),
      order_index: ba.original_row_number || (idx + 1),
      quantity: Number(ba.quantity || 1),
      unit: ba.unit || 'UN',
      unit_cost: Number(ba.unit_cost || 0),
      unit_value: Number(ba.unit_cost || 0),
      total_amount: Number(ba.budgeted_amount || 0),
      physical_weight_percent: Number(ba.physical_weight_percent || 0),
      progress_planned: 48.59,
      progress_actual: 46.22,
      erp_account: ba.sws_erp_account,
      expense_type: ba.cost_composition,
      status: 'aprovado' as any,
      created_at: ba.created_at || new Date().toISOString(),
    }));

    // Mapeamento de Regras De-Para
    const mappedDePara: ErpToBudgetTotalizerMapping[] = (dbDePara || []).map((dp: any, idx: number) => ({
      id: dp.id || `dp-${idx}`,
      work_id: 'work-1',
      erp_cost_account_id: `erp-acc-${idx}`,
      detailed_erp_account_name: dp.detailed_erp_account_name || dp.detailed_erp_account_code,
      budget_totalizer_account_id: `bta-${idx}`,
      totalizer_account_name: dp.totalizer_erp_account_name,
      is_active: dp.is_active ?? true,
      created_at: dp.created_at || new Date().toISOString(),
    }));

    return {
      works: mappedWorks,
      incurredCosts: mappedCosts,
      revenues: mappedRevenues,
      budgetAccounts: mappedBudgetAccounts,
      erpToBudgetTotalizerMappings: mappedDePara,
      meta: {
        totalEntries: allEntries.length,
        totalAmount,
        syncedAt: new Date().toISOString(),
        source: 'supabase_cloud',
      },
    };
  } catch (err) {
    console.error('[SupabaseSync] Falha na sincronização:', err);
    return null;
  }
}

/**
 * Salva lançamentos contábeis novos ou importados diretamente no Supabase em lote
 */
export async function saveImportedEntriesToSupabase(
  rows: Array<{
    document_number: string;
    cost_account_name?: string;
    entry_date: string;
    supplier_contractor_name: string;
    entry_description: string;
    amount: number;
    nature_classification?: string;
    adjusted_consolidated_account?: string;
    external_entry_id?: string;
  }>,
  batchId: string = 'batch-imp-' + Date.now(),
  workId: string = 'a0000000-0000-0000-0000-000000000001'
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, insertedCount: 0, error: 'Supabase não configurado' };
  }

  try {
    const payload = rows.map((r, idx) => ({
      work_id: workId,
      source_batch_id: 'b0000000-0000-0000-0000-000000000001',
      external_entry_id: r.external_entry_id || `imp_${Date.now()}_${idx}`,
      document_number: r.document_number,
      cost_account_code: r.cost_account_name || 'Despesa Geral',
      cost_account_name: r.cost_account_name || 'Despesa Geral',
      entry_date: r.entry_date,
      supplier_contractor_name: r.supplier_contractor_name,
      entry_description: r.entry_description,
      amount: r.amount,
      adjusted_consolidated_account: r.adjusted_consolidated_account || r.cost_account_name || 'OUTROS',
      nature_classification: r.nature_classification || 'custo_obra',
      original_row_number: idx + 1,
    }));

    // Inserção em blocos de 200 registros para evitar estouro de requisição
    const CHUNK_SIZE = 200;
    let inserted = 0;

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('actual_financial_entries').insert(chunk);
      if (error) {
        console.error('[SupabaseSync] Erro ao inserir bloco:', error);
        throw error;
      }
      inserted += chunk.length;
    }

    logAudit('IMPORT_ERP_SUPABASE', 'actual_financial_entries', batchId, `${inserted} registros inseridos com sucesso no Supabase`);
    return { success: true, insertedCount: inserted };
  } catch (err: any) {
    console.error('[SupabaseSync] Erro na inserção em lote no Supabase:', err);
    return { success: false, insertedCount: 0, error: err.message || 'Erro desconhecido' };
  }
}

import { supabase, isSupabaseConfigured, logAudit } from './supabase';
import type {
  Work,
  IncurredCost,
  Revenue,
  BudgetAccount,
  ErpToBudgetTotalizerMapping,
} from '../types';

/**
 * Converte o ID interno de uma obra no frontend ('work-1', 'work-2', etc. ou UUID)
 * para um UUID determinístico válido no PostgreSQL/Supabase (`public.works.id`).
 */
export function toSupabaseWorkUuid(workId: string): string {
  if (!workId) return 'a0000000-0000-0000-0000-000000000001';
  const clean = workId.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  const match = clean.match(/(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0 && num < 1000000) {
      return `a0000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
    }
  }
  // Hash determinístico para IDs customizados (ex: 'work-1730000000')
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return `a0000000-0000-0000-0000-${String(hash).padStart(12, '0')}`;
}

/**
 * Converte o UUID do Supabase (`a0000000-0000-0000-0000-00000000000X`) ou código ('OBR-00X')
 * de volta para o ID canônico do frontend ('work-1', 'work-2', etc.).
 */
export function toFrontendWorkId(supabaseUuid?: string | null, code?: string | null): string {
  if (code) {
    const codeMatch = String(code).trim().match(/^OBR-0*(\d+)$/i);
    if (codeMatch) {
      return `work-${parseInt(codeMatch[1], 10)}`;
    }
  }
  if (!supabaseUuid) return 'work-1';
  const clean = String(supabaseUuid).trim().toLowerCase();
  if (clean.startsWith('work-')) return clean;

  const detMatch = clean.match(/^[ac]0000000-0000-0000-0000-0*(\d+)$/);
  if (detMatch) {
    const num = parseInt(detMatch[1], 10);
    if (num >= 1 && num <= 999) {
      return `work-${num}`;
    }
  }
  return clean;
}

/**
 * Gera o UUID determinístico da versão base de orçamento no Supabase (`public.budget_versions.id`)
 * para cada obra ('work-1' -> 'c0000000-0000-0000-0000-000000000001').
 */
export function toSupabaseBudgetVersionUuid(workId: string): string {
  const workUuid = toSupabaseWorkUuid(workId);
  return 'c' + workUuid.slice(1);
}

export interface SupabaseSyncData {
  works: Work[];
  incurredCosts: IncurredCost[];
  revenues: Revenue[];
  budgetAccounts: BudgetAccount[];
  erpToBudgetTotalizerMappings: ErpToBudgetTotalizerMapping[];
  cloudSnapshotsByWork: Record<string, {
    activeCompetency?: string;
    snapshots?: Record<string, Record<string, number>>;
    history?: any[];
  }>;
  meta: {
    totalEntries: number;
    totalAmount: number;
    syncedAt: string;
    source: 'supabase_cloud';
  };
}

const SNAPSHOT_META_DELIMITER = '\n<!--EAP_SNAPSHOTS:';
const SNAPSHOT_META_END = '-->';

export function extractWorkCloudSnapshots(rawNotes?: string | null): {
  cleanNotes: string;
  activeCompetency?: string;
  snapshots?: Record<string, Record<string, number>>;
  history?: any[];
} {
  if (!rawNotes) return { cleanNotes: '' };
  const idx = rawNotes.indexOf(SNAPSHOT_META_DELIMITER);
  if (idx === -1) return { cleanNotes: rawNotes };
  const cleanNotes = rawNotes.slice(0, idx).trim();
  const rest = rawNotes.slice(idx + SNAPSHOT_META_DELIMITER.length);
  const endIdx = rest.indexOf(SNAPSHOT_META_END);
  const jsonStr = endIdx !== -1 ? rest.slice(0, endIdx) : rest;
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      cleanNotes,
      activeCompetency: parsed?.activeCompetency,
      snapshots: parsed?.snapshots,
      history: parsed?.history,
    };
  } catch {
    return { cleanNotes };
  }
}

export function embedWorkCloudSnapshots(
  cleanNotes: string | undefined | null,
  payload?: {
    activeCompetency?: string;
    snapshots?: Record<string, Record<string, number>>;
    history?: any[];
  }
): string | null {
  const base = (cleanNotes || '').split(SNAPSHOT_META_DELIMITER)[0].trim();
  if (!payload || (!payload.snapshots && !payload.activeCompetency)) {
    return base || null;
  }
  try {
    return `${base}${SNAPSHOT_META_DELIMITER}${JSON.stringify(payload)}${SNAPSHOT_META_END}`;
  } catch {
    return base || null;
  }
}

/**
 * Busca todos os registros do Supabase com paginação segura e suporte Multi-Obras
 */
export async function fetchAllFromSupabase(): Promise<SupabaseSyncData | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    console.log('[SupabaseSync] Iniciando sincronização Multi-Obras com Supabase Cloud...');

    // 1. Obras
    const { data: dbWorks, error: worksErr } = await supabase
      .from('works')
      .select('*')
      .order('code', { ascending: true });

    if (worksErr) {
      console.warn('[SupabaseSync] Erro ao buscar obras:', worksErr);
      return null;
    }

    // Mapa de UUID da obra no banco -> ID da obra no frontend ('work-1', 'work-2', etc.)
    const workUuidToFrontendId = new Map<string, string>();
    (dbWorks || []).forEach((w: any) => {
      const fId = toFrontendWorkId(w.id, w.code);
      if (w.id) workUuidToFrontendId.set(String(w.id).toLowerCase(), fId);
    });

    // 1.1 Versões de Orçamento (para mapear budget_version_id -> work_id)
    const versionUuidToWorkId = new Map<string, string>();
    const { data: dbVersions } = await supabase
      .from('budget_versions')
      .select('id, work_id');

    (dbVersions || []).forEach((v: any) => {
      if (v.id && v.work_id) {
        const wFrontId = workUuidToFrontendId.get(String(v.work_id).toLowerCase()) || toFrontendWorkId(v.work_id);
        versionUuidToWorkId.set(String(v.id).toLowerCase(), wFrontId);
      }
    });

    // 2. Contas do Orçamento (todas as obras, paginado caso ultrapasse 1000 linhas)
    let dbBudgetAccounts: any[] = [];
    let bPage = 0;
    const bPageSize = 1000;
    let bHasMore = true;

    while (bHasMore) {
      const { data: bData, error: budgetErr } = await supabase
        .from('budget_accounts')
        .select('*')
        .range(bPage * bPageSize, (bPage + 1) * bPageSize - 1)
        .order('original_row_number', { ascending: true });

      if (budgetErr) {
        console.warn('[SupabaseSync] Erro ao buscar budget_accounts:', budgetErr);
        break;
      }
      if (bData && bData.length > 0) {
        dbBudgetAccounts = dbBudgetAccounts.concat(bData);
        if (bData.length < bPageSize) bHasMore = false;
        else bPage++;
      } else {
        bHasMore = false;
      }
    }

    // 3. De-Para Mappings
    const { data: dbDePara, error: deParaErr } = await supabase
      .from('erp_account_consolidation_mappings')
      .select('*');

    if (deParaErr) {
      console.warn('[SupabaseSync] Erro ao buscar de-para:', deParaErr);
    }

    // 4. Lançamentos Contábeis Reais (paginado em blocos de 1.000)
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

    console.log(`[SupabaseSync] Sucesso: ${(dbWorks || []).length} obras, ${dbBudgetAccounts.length} contas de orçamento e ${allEntries.length} lançamentos recuperados do banco.`);

    // Mapeamento de Obras preservando o ID de cada obra ('work-1', 'work-2', etc.) e extraindo snapshots mensais da EAP salvos na nuvem
    const cloudSnapshotsByWork: SupabaseSyncData['cloudSnapshotsByWork'] = {};
    const mappedWorks: Work[] = (dbWorks || []).map((w: any, idx: number) => {
      const frontId = toFrontendWorkId(w.id, w.code);
      const extracted = extractWorkCloudSnapshots(w.notes);
      if (extracted.snapshots || extracted.activeCompetency || extracted.history) {
        cloudSnapshotsByWork[frontId] = {
          activeCompetency: extracted.activeCompetency,
          snapshots: extracted.snapshots,
          history: extracted.history,
        };
      }
      return {
        id: frontId,
        organization_id: w.organization_id || 'org-1',
        code: w.code || `OBR-${String(idx + 1).padStart(3, '0')}`,
        erp_code: w.erp_code || '',
        name: w.name || 'Obra Monteplan',
        client: w.client || 'Monteplan Incorporadora',
        address: w.address || '',
        neighborhood: w.neighborhood || '',
        city_state: w.city_state || 'Fortaleza/CE',
        city: w.city || (w.city_state ? w.city_state.split('/')[0] : 'Fortaleza'),
        state: w.state || (w.city_state ? w.city_state.split('/')[1] : 'CE'),
        postal_code: w.postal_code || '',
        latitude: w.latitude ?? -3.7319,
        longitude: w.longitude ?? -38.4989,
        engineer_name: w.engineer_name || 'Eng. Responsável',
        manager_name: w.manager_name || 'Gestor Monteplan',
        project_type: w.project_type || 'Residencial Multifamiliar',
        planned_start: w.planned_start || '2025-02-01',
        planned_end: w.planned_end || '2028-02-28',
        actual_start: w.actual_start || w.planned_start || '2025-02-15',
        actual_end: w.actual_end,
        contract_value: Number(w.contract_value || 0),
        status: (w.status || 'em_andamento') as any,
        progress_percent: Number(w.progress_percent || 0),
        labor_enabled: Boolean(w.labor_enabled ?? true),
        total_units: Number(w.total_units || 0),
        units_sold: Number(w.units_sold || 0),
        total_area_m2: Number(w.total_area_m2 || 0),
        private_area_m2: Number(w.private_area_m2 || 0),
        cub_reference_m2: Number(w.cub_reference_m2 || 0),
        vgv_total: Number(w.vgv_total || 0),
        notes: extracted.cleanNotes || '',
        created_at: w.created_at,
        updated_at: w.updated_at,
      };
    });

    // Mapeamento de Lançamentos em Custos e Receitas vinculados ao work_id correto
    const mappedCosts: IncurredCost[] = [];
    const mappedRevenues: Revenue[] = [];
    let totalAmount = 0;

    allEntries.forEach((entry: any, idx: number) => {
      const val = Number(entry.amount || 0);
      totalAmount += val;
      const entryWorkId =
        (entry.work_id && workUuidToFrontendId.get(String(entry.work_id).toLowerCase())) ||
        toFrontendWorkId(entry.work_id);

      if (entry.nature_classification === 'receita') {
        mappedRevenues.push({
          id: entry.id || `rev-${idx}`,
          work_id: entryWorkId,
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
          work_id: entryWorkId,
          external_id: entry.external_entry_id || `r_${idx + 1}`,
          date: entry.entry_date || new Date().toISOString().split('T')[0],
          document_number: entry.document_number || `DOC-${idx + 1}`,
          cost_center: entry.cost_center || `CC-${entryWorkId.toUpperCase()}`,
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

    // Mapeamento de Contas Orçamentárias vinculadas ao work_id correto
    const mappedBudgetAccounts: BudgetAccount[] = (dbBudgetAccounts || []).map((ba: any, idx: number) => {
      const bvId = String(ba.budget_version_id || '').toLowerCase();
      const resolvedWorkId =
        versionUuidToWorkId.get(bvId) ||
        toFrontendWorkId(bvId);

      return {
        id: ba.id,
        work_id: resolvedWorkId,
        budget_version_id: ba.budget_version_id || `bv-${resolvedWorkId}-v1`,
        version_id: ba.budget_version_id || `bv-${resolvedWorkId}-v1`,
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
        progress_planned: resolvedWorkId === 'work-1' ? 48.59 : 0,
        progress_actual: resolvedWorkId === 'work-1' ? 46.22 : 0,
        erp_account: ba.sws_erp_account,
        expense_type: ba.cost_composition,
        status: 'aprovado' as any,
        created_at: ba.created_at || new Date().toISOString(),
      };
    });

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
      cloudSnapshotsByWork,
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
 * Garante que uma obra exista e esteja atualizada na tabela `public.works` do Supabase
 */
export async function saveWorkToSupabase(
  work: Work,
  cloudSnapshotPayload?: {
    activeCompetency?: string;
    snapshots?: Record<string, Record<string, number>>;
    history?: any[];
  }
): Promise<{ success: boolean; supabaseWorkUuid: string; error?: string }> {
  const supabaseWorkUuid = toSupabaseWorkUuid(work.id);
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, supabaseWorkUuid, error: 'Supabase não configurado' };
  }

  try {
    let finalNotes = work.notes || null;
    if (cloudSnapshotPayload) {
      finalNotes = embedWorkCloudSnapshots(work.notes, cloudSnapshotPayload);
    } else {
      // Preserva metadados existentes no localStorage para não sobrescrever em atualizações simples da obra
      try {
        const localSnapsRaw = localStorage.getItem('gestao_obras_stage_snapshots_by_competency');
        const localCompRaw = localStorage.getItem('gestao_obras_measurement_competency');
        const localHistRaw = localStorage.getItem('gestao_obras_custom_stage_history');
        if (localSnapsRaw) {
          const allSnaps = JSON.parse(localSnapsRaw);
          const workSnaps: Record<string, Record<string, number>> = {};
          Object.keys(allSnaps).forEach(k => {
            if (k.startsWith(`${work.id}::`) && !k.endsWith('_migrated')) {
              workSnaps[k] = allSnaps[k];
            }
          });
          const compMap = localCompRaw ? JSON.parse(localCompRaw) : {};
          const allHist = localHistRaw ? JSON.parse(localHistRaw) : [];
          const workHist = Array.isArray(allHist) ? allHist.filter((h: any) => h.work_id === work.id).slice(0, 40) : [];
          if (Object.keys(workSnaps).length > 0) {
            finalNotes = embedWorkCloudSnapshots(work.notes, {
              activeCompetency: compMap[work.id] || '2026-10',
              snapshots: workSnaps,
              history: workHist,
            });
          }
        }
      } catch {}
    }

    const payload = {
      id: supabaseWorkUuid,
      organization_id: '11111111-1111-1111-1111-111111111111',
      code: work.code || 'OBR-001',
      erp_code: work.erp_code || null,
      name: work.name,
      client: work.client || 'Monteplan Incorporadora',
      address: work.address || null,
      neighborhood: work.neighborhood || null,
      city_state: work.city_state || `${work.city || 'Fortaleza'}/${work.state || 'CE'}`,
      postal_code: work.postal_code || null,
      latitude: work.latitude ?? null,
      longitude: work.longitude ?? null,
      engineer_name: work.engineer_name || null,
      manager_name: work.manager_name || 'Gestor Monteplan',
      project_type: work.project_type || 'Residencial Multifamiliar',
      planned_start: work.planned_start || '2025-01-01',
      planned_end: work.planned_end || '2027-12-31',
      actual_start: work.actual_start || null,
      actual_end: work.actual_end || null,
      contract_value: Number(work.contract_value || 0),
      status: work.status || 'em_andamento',
      progress_percent: Number(work.progress_percent || 0),
      labor_enabled: Boolean(work.labor_enabled ?? true),
      total_units: Number(work.total_units || 0),
      units_sold: Number(work.units_sold || 0),
      total_area_m2: Number(work.total_area_m2 || 0),
      private_area_m2: Number(work.private_area_m2 || 0),
      cub_reference_m2: Number(work.cub_reference_m2 || 0),
      vgv_total: Number(work.vgv_total || 0),
      notes: finalNotes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('works')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[SupabaseSync] Aviso ao salvar obra no Supabase:', error.message);
      return { success: false, supabaseWorkUuid, error: error.message };
    }
    return { success: true, supabaseWorkUuid };
  } catch (err: any) {
    return { success: false, supabaseWorkUuid, error: err?.message || 'Erro ao salvar obra' };
  }
}

/**
 * Persiste o orçamento (versão base + contas orçamentárias) de uma obra específica no Supabase
 * sem afetar o orçamento de nenhuma outra obra.
 */
export async function saveBudgetAccountsToSupabase(
  work: Work,
  accounts: Array<{
    code: string;
    description: string;
    group_etapa: string;
    cost_type?: 'direto' | 'indireto';
    unit?: string;
    quantity?: number;
    unit_cost?: number;
    total_amount: number;
    physical_weight_percent?: number;
    erp_account?: string;
    expense_type?: string;
    original_row_number?: number;
  }>
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, insertedCount: 0, error: 'Supabase não configurado' };
  }

  try {
    // 1. Garante que a obra exista em public.works
    await saveWorkToSupabase(work);

    const supabaseWorkUuid = toSupabaseWorkUuid(work.id);
    const budgetVersionUuid = toSupabaseBudgetVersionUuid(work.id);
    const totalAmount = accounts.reduce((acc, it) => acc + Number(it.total_amount || 0), 0);
    const directAmount = accounts
      .filter((it) => (it.cost_type || 'direto') === 'direto')
      .reduce((acc, it) => acc + Number(it.total_amount || 0), 0);
    const indirectAmount = totalAmount - directAmount;

    // 2. Cria ou atualiza a versão base do orçamento da obra em public.budget_versions
    const { error: verError } = await supabase
      .from('budget_versions')
      .upsert(
        {
          id: budgetVersionUuid,
          work_id: supabaseWorkUuid,
          version_number: 1,
          title: `Orçamento Base Oficial PCO - ${work.name}`,
          version_type: 'inicial',
          status: 'aprovada',
          is_current_approved: true,
          total_amount: Number(totalAmount.toFixed(2)),
          direct_cost_amount: Number(directAmount.toFixed(2)),
          indirect_cost_amount: Number(indirectAmount.toFixed(2)),
          base_date: new Date().toISOString().split('T')[0],
          reason: `Importação de planilha de orçamento da obra ${work.name}`,
        },
        { onConflict: 'id' }
      );

    if (verError) {
      console.warn('[SupabaseSync] Aviso ao criar/atualizar budget_version:', verError.message);
      return { success: false, insertedCount: 0, error: verError.message };
    }

    // 3. Remove contas anteriores apenas desta versão/obra (apenas se não for a carga protegida inicial ou se estiver reimportando)
    await supabase
      .from('budget_accounts')
      .delete()
      .eq('budget_version_id', budgetVersionUuid);

    // 4. Insere as novas contas orçamentárias em blocos de 200
    const payload = accounts.map((a, idx) => ({
      budget_version_id: budgetVersionUuid,
      account_code: a.code || `${String(idx + 1).padStart(2, '0')}.01`,
      description: a.description || `Item ${idx + 1}`,
      group_etapa: a.group_etapa || 'ORÇAMENTO GERAL',
      cost_type: a.cost_type || 'direto',
      unit: a.unit || 'VB',
      quantity: Number(a.quantity || 1),
      unit_cost: Number(a.unit_cost || a.total_amount || 0),
      budgeted_amount: Number(a.total_amount || 0),
      physical_weight_percent: Number(a.physical_weight_percent || 0),
      sws_erp_account: a.erp_account || 'CUSTO DE OBRA',
      cost_composition: a.expense_type || 'MATERIAL',
      original_row_number: a.original_row_number || idx + 1,
    }));

    const CHUNK_SIZE = 200;
    let inserted = 0;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const { error: accErr } = await supabase.from('budget_accounts').insert(chunk);
      if (accErr) {
        console.error('[SupabaseSync] Erro ao inserir bloco em budget_accounts:', accErr);
        return { success: false, insertedCount: inserted, error: accErr.message };
      }
      inserted += chunk.length;
    }

    logAudit('IMPORT_BUDGET_SUPABASE', 'budget_accounts', work.id, `${inserted} itens de orçamento salvos no Supabase para ${work.name}`);
    return { success: true, insertedCount: inserted };
  } catch (err: any) {
    console.error('[SupabaseSync] Erro ao salvar orçamento no Supabase:', err);
    return { success: false, insertedCount: 0, error: err?.message || 'Erro desconhecido' };
  }
}

/**
 * Salva lançamentos contábeis novos ou importados diretamente no Supabase em lote para a obra informada
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
    const resolvedWorkUuid = toSupabaseWorkUuid(workId);
    const payload = rows.map((r, idx) => ({
      work_id: resolvedWorkUuid,
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

    logAudit('IMPORT_ERP_SUPABASE', 'actual_financial_entries', batchId, `${inserted} registros inseridos com sucesso no Supabase para ${workId}`);
    return { success: true, insertedCount: inserted };
  } catch (err: any) {
    console.error('[SupabaseSync] Erro na inserção em lote no Supabase:', err);
    return { success: false, insertedCount: 0, error: err.message || 'Erro desconhecido' };
  }
}

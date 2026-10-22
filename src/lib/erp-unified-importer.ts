import { supabase, isSupabaseConfigured, logAudit } from './supabase';
import { ATRIUM_DEPARA_RULES, findDeParaRule, DeParaRule } from './atrium-real-data';
import type { UnmappedAccountItem, IncurredCost, Revenue, ErpImportBatch, DeduplicationStrategy } from '../types';

/**
 * Converte data do Excel (serial numérico, formato DD/MM/AAAA ou ISO) para YYYY-MM-DD
 */
export function excelDateToIsoDate(serial: any): string {
  if (!serial) return new Date().toISOString().split('T')[0];

  if (serial instanceof Date) {
    return serial.toISOString().split('T')[0];
  }

  if (typeof serial === 'string') {
    const s = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${d}`;
      }
    }
  }

  const num = Number(serial);
  if (!isNaN(num) && num > 0) {
    // Offset de datas do Excel (1900 leap year bug)
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Sanitiza valores numéricos do ERP
 */
export function sanitizeCurrencyValue(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace('R$', '').trim();
  if (str.includes(',')) {
    // Formato brasileiro: 1.234,56 ou 945,54
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  // Formato decimal padrão: 945.54
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Trata anomalias e deslocamentos de colunas conhecidos de relatórios ERP
 */
export function sanitizeRowData(row: Record<string, any>, rowIdx: number): {
  obra: string;
  data: string;
  fornecedor: string;
  valor: number;
  documento: string;
  descricao: string;
  conta: string;
  naturezaCodigo: string;
  unidade: string;
  tipoConta: string;
  contaTesouraria: string;
  historicoComplementar: string;
} {
  const obra = String(row['NM_CNT_CST'] || row['obra'] || 'ED. ATRIUM').trim();
  const rawDate = row['DT'] || row['data'] || row['DATA'];
  const data = excelDateToIsoDate(rawDate);
  const fornecedor = String(row['NM_FRN'] || row['fornecedor'] || row['favorecido'] || 'NÃO INFORMADO').trim();
  const documento = String(row['DOCUMENTO'] || row['documento'] || row['nf'] || `DOC-${rowIdx}`).trim();
  const descricao = String(row['DE_LNC_CST'] || row['descricao'] || row['historico'] || 'Lançamento ERP').trim();
  const conta = String(row['NM_CTA_CST'] || row['conta'] || row['categoria'] || '').trim();
  let naturezaCodigo = String(row['CD_ABG'] || row['natureza'] || '').trim();

  let valor = sanitizeCurrencyValue(row['VL_LNC_CST'] || row['valor'] || row['net_value']);

  // Anomalia detectada em relatórios ERP (ex: linha onde "PAGTO TRIB DIVERSOS" deslocou as colunas)
  if (naturezaCodigo === 'PAGTO TRIB DIVERSOS') {
    naturezaCodigo = 'P';
    if (row['TP_CTA_CST'] && sanitizeCurrencyValue(row['TP_CTA_CST']) > 0) {
      valor = sanitizeCurrencyValue(row['TP_CTA_CST']);
    }
  }

  const unidade = String(row['CD_UP'] || row['DE_UP'] || '').trim();
  const tipoConta = String(row['TP_CTA_CST'] || '').trim();
  const contaTesouraria = String(row['DE_CTA_TES'] || row['CD_CTA_TES'] || '').trim();
  const historicoComplementar = String(row['CMP_HST_TES'] || '').trim();

  return {
    obra,
    data,
    fornecedor,
    valor,
    documento,
    descricao,
    conta,
    naturezaCodigo,
    unidade,
    tipoConta,
    contaTesouraria,
    historicoComplementar,
  };
}

/**
 * Identifica se uma planilha é do modelo unificado do ERP (com as colunas do ERP Atrium)
 */
export function isUnifiedErpFile(headers: string[]): boolean {
  const normalized = headers.map(h => h.trim().toUpperCase());
  return (
    normalized.includes('NM_CTA_CST') &&
    normalized.includes('VL_LNC_CST') &&
    normalized.includes('DOCUMENTO')
  );
}

/**
 * Faz a varredura completa do arquivo para identificar contas sem De-Para
 */
export function auditAccountsDePara(
  rows: Record<string, any>[],
  customRules: DeParaRule[] = []
): {
  unmappedAccounts: UnmappedAccountItem[];
  mappedCount: number;
  totalUniqueAccounts: number;
} {
  const accountMap = new Map<string, { count: number; totalAmount: number; groupingCodes: Set<string> }>();

  rows.forEach((r, idx) => {
    const sanitized = sanitizeRowData(r, idx + 2);
    if (!sanitized.conta) return;

    if (!accountMap.has(sanitized.conta)) {
      accountMap.set(sanitized.conta, { count: 0, totalAmount: 0, groupingCodes: new Set() });
    }
    const acc = accountMap.get(sanitized.conta)!;
    acc.count++;
    acc.totalAmount += sanitized.valor;
    if (sanitized.naturezaCodigo) {
      acc.groupingCodes.add(sanitized.naturezaCodigo);
    }
  });

  const unmapped: UnmappedAccountItem[] = [];
  let mappedCount = 0;

  accountMap.forEach((info, accountName) => {
    const rule = findDeParaRule(accountName, customRules);
    if (rule) {
      mappedCount++;
    } else {
      const groups = Array.from(info.groupingCodes);
      let suggestedNature: UnmappedAccountItem['suggestedNature'] = 'custo_obra';
      let suggestedAdjusted = accountName.toUpperCase();

      if (groups.includes('R') || accountName.toLowerCase().includes('receita')) {
        suggestedNature = 'receita';
      } else if (groups.includes('T') || accountName.toLowerCase().includes('juros') || accountName.toLowerCase().includes('rendimento')) {
        suggestedNature = 'rendimento';
        suggestedAdjusted = 'Juros e Multas Auferidos';
      } else if (
        accountName.toUpperCase().includes('IRPJ') ||
        accountName.toUpperCase().includes('PIS') ||
        accountName.toUpperCase().includes('COFINS') ||
        accountName.toUpperCase().includes('CSLL')
      ) {
        suggestedNature = 'imposto_dre';
      } else if (accountName.toLowerCase().includes('projeto') || accountName.toLowerCase().includes('propaganda')) {
        suggestedNature = 'despesa_adm';
      }

      unmapped.push({
        accountName,
        count: info.count,
        totalAmount: info.totalAmount,
        groupingCodes: groups,
        suggestedNature,
        targetAdjustedAccount: suggestedAdjusted,
        targetBudgetStage: suggestedNature === 'custo_obra' ? 'DESPESAS GERAIS' : undefined,
      });
    }
  });

  return {
    unmappedAccounts: unmapped,
    mappedCount,
    totalUniqueAccounts: accountMap.size,
  };
}

/**
 * Salva uma nova regra de De-Para no Supabase (erp_account_consolidation_mappings)
 */
export async function saveNewDeParaToSupabase(
  item: UnmappedAccountItem,
  workId: string = 'a0000000-0000-0000-0000-000000000001'
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const { error } = await supabase.from('erp_account_consolidation_mappings').insert({
      organization_id: '11111111-1111-1111-1111-111111111111',
      detailed_erp_account_code: item.accountName,
      detailed_erp_account_name: item.accountName,
      totalizer_erp_account_name: item.targetAdjustedAccount,
      totalizer_erp_account_code: item.targetAdjustedAccount,
      is_active: true,
    });

    if (error) {
      console.warn('[saveNewDeParaToSupabase] Aviso ao persistir De-Para no Supabase:', error);
      return false;
    }

    logAudit('CREATE_DE_PARA_RULE', 'erp_account_consolidation_mappings', item.accountName, `Nova regra: ${item.accountName} -> ${item.targetAdjustedAccount}`);
    return true;
  } catch (err) {
    console.error('[saveNewDeParaToSupabase] Erro:', err);
    return false;
  }
}

/**
 * Processa a importação unificada completa (5.906+ linhas):
 * 1. Segrega Receitas e Custos/Despesas
 * 2. Faz a deduplicação rigorosa contra o Supabase
 * 3. Grava novos lançamentos em actual_financial_entries no Supabase em lotes
 * 4. Retorna as listas de novos custos e receitas para sincronizar com o estado local
 */
export async function executeUnifiedErpImport(
  fileName: string,
  rows: Record<string, any>[],
  customRules: DeParaRule[] = [],
  strategy: DeduplicationStrategy = 'update_existing',
  workId: string = 'a0000000-0000-0000-0000-000000000001'
): Promise<{
  success: boolean;
  totalRows: number;
  newCosts: IncurredCost[];
  newRevenues: Revenue[];
  insertedEntriesCount: number;
  alreadyExistingCount: number;
  totalCostAmount: number;
  totalRevenueAmount: number;
  batch: ErpImportBatch;
  error?: string;
}> {
  const batchId = 'batch-erp-unified-' + Date.now();

  try {
    // 1. Busca chaves de deduplicação existentes no Supabase
    const existingDbKeys = new Set<string>();
    if (isSupabaseConfigured() && supabase) {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('actual_financial_entries')
          .select('document_number, entry_date, amount, cost_account_name')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) break;
        data.forEach((r: any) => {
          const k = `${r.document_number || ''}|${r.entry_date || ''}|${Number(r.amount || 0).toFixed(2)}|${(r.cost_account_name || '').trim()}`;
          existingDbKeys.add(k);
        });

        if (data.length < pageSize) hasMore = false;
        else page++;
      }
    }

    const newCosts: IncurredCost[] = [];
    const newRevenues: Revenue[] = [];
    const entriesToInsertInDb: any[] = [];
    let alreadyExistingCount = 0;
    let totalCostAmount = 0;
    let totalRevenueAmount = 0;

    rows.forEach((row, idx) => {
      const sanitized = sanitizeRowData(row, idx + 2);
      if (!sanitized.valor || sanitized.valor <= 0) return;

      const rule = findDeParaRule(sanitized.conta, customRules);
      const adjustedAccount = rule?.adjustedAccount || sanitized.conta.toUpperCase();
      const isObra = rule ? rule.isObra : sanitized.naturezaCodigo === 'P';

      const dedupKey = `${sanitized.documento}|${sanitized.data}|${sanitized.valor.toFixed(2)}|${sanitized.conta}`;
      const existsInDb = existingDbKeys.has(dedupKey);

      if (existsInDb) {
        alreadyExistingCount++;
        if (strategy === 'insert_new') return;
      }

      // Determina classificação de natureza
      const isRevenue =
        sanitized.naturezaCodigo === 'R' ||
        sanitized.naturezaCodigo === 'T' ||
        adjustedAccount.includes('RECEITA') ||
        adjustedAccount.includes('RENDIMENTOS') ||
        adjustedAccount.includes('JUROS E MULTAS');

      let natureClassification = 'custo_obra';
      if (sanitized.naturezaCodigo === 'R' || adjustedAccount.includes('RECEITA')) {
        natureClassification = 'receita';
      } else if (sanitized.naturezaCodigo === 'T' || adjustedAccount.includes('RENDIMENTO') || adjustedAccount.includes('JUROS')) {
        natureClassification = 'rendimento';
      } else if (
        sanitized.conta.toUpperCase().includes('COFINS') ||
        sanitized.conta.toUpperCase().includes('PIS') ||
        sanitized.conta.toUpperCase().includes('IRPJ') ||
        sanitized.conta.toUpperCase().includes('CSLL')
      ) {
        natureClassification = 'despesa_adm';
      } else if (!isObra) {
        natureClassification = 'despesa_adm';
      }

      // Objeto mestre para actual_financial_entries no Supabase
      if (!existsInDb) {
        entriesToInsertInDb.push({
          work_id: workId,
          source_batch_id: 'b0000000-0000-0000-0000-000000000001',
          external_entry_id: `erp_${Date.now()}_${idx + 1}`,
          company_unit: sanitized.unidade || null,
          document_number: sanitized.documento,
          cost_account_code: sanitized.conta,
          cost_account_external_id: null,
          cost_account_name: sanitized.conta,
          cost_center: sanitized.obra,
          entry_date: sanitized.data,
          competency_date: sanitized.data,
          supplier_contractor_name: sanitized.fornecedor,
          entry_description: sanitized.descricao,
          amount: sanitized.valor,
          entry_type: sanitized.tipoConta || null,
          treasury_account: sanitized.contaTesouraria || null,
          history_text: sanitized.historicoComplementar || null,
          grouping_code: sanitized.naturezaCodigo || null,
          adjusted_consolidated_account: adjustedAccount,
          nature_classification: natureClassification,
          original_row_number: idx + 1,
        });
      }

      // Segregação em Receitas vs Custos
      if (isRevenue) {
        totalRevenueAmount += sanitized.valor;
        newRevenues.push({
          id: `rev-imp-${Date.now()}-${idx}`,
          work_id: 'work-1',
          external_id: sanitized.documento,
          date: sanitized.data,
          document_number: sanitized.documento,
          description: `${sanitized.descricao} (${sanitized.fornecedor})`,
          contracted_value: sanitized.valor,
          recognized_value: sanitized.valor,
          received_value: sanitized.valor,
          status: 'recebido',
          source_batch_id: batchId,
          created_at: new Date().toISOString(),
        });
      } else {
        totalCostAmount += sanitized.valor;
        newCosts.push({
          id: `cost-imp-${Date.now()}-${idx}`,
          work_id: 'work-1',
          external_id: sanitized.documento,
          date: sanitized.data,
          document_number: sanitized.documento,
          cost_center: sanitized.obra || 'CC-ATRIUM',
          category: !isObra ? 'indireto' : 'material',
          supplier_name: sanitized.fornecedor,
          description: sanitized.descricao,
          gross_value: sanitized.valor,
          discounts: 0,
          taxes: 0,
          net_value: sanitized.valor,
          payment_status: 'pago',
          erp_account_code: sanitized.conta,
          source_batch_id: batchId,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 2. Inserção em lotes de 200 no Supabase
    let insertedEntriesCount = 0;
    if (entriesToInsertInDb.length > 0 && isSupabaseConfigured() && supabase) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < entriesToInsertInDb.length; i += CHUNK_SIZE) {
        const chunk = entriesToInsertInDb.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await supabase.from('actual_financial_entries').insert(chunk);
        if (insertErr) {
          console.error('[executeUnifiedErpImport] Erro ao inserir bloco no Supabase:', insertErr);
          throw insertErr;
        }
        insertedEntriesCount += chunk.length;
      }
    }

    const batch: ErpImportBatch = {
      id: batchId,
      import_type: 'unified_erp_ledger',
      file_name: fileName,
      deduplication_strategy: strategy,
      total_rows: rows.length,
      imported_rows: entriesToInsertInDb.length,
      updated_rows: 0,
      ignored_rows: alreadyExistingCount,
      rejected_rows: 0,
      status: 'processado',
      user_name: 'Usuário Monteplan',
      created_at: new Date().toISOString(),
    };

    logAudit(
      'IMPORT_UNIFIED_ERP',
      'actual_financial_entries',
      batchId,
      `Importação unificada concluída: ${rows.length} processados, ${entriesToInsertInDb.length} novos inseridos no Supabase, ${alreadyExistingCount} preservados.`
    );

    return {
      success: true,
      totalRows: rows.length,
      newCosts,
      newRevenues,
      insertedEntriesCount,
      alreadyExistingCount,
      totalCostAmount,
      totalRevenueAmount,
      batch,
    };
  } catch (err: any) {
    console.error('[executeUnifiedErpImport] Erro na importação:', err);
    return {
      success: false,
      totalRows: rows.length,
      newCosts: [],
      newRevenues: [],
      insertedEntriesCount: 0,
      alreadyExistingCount: 0,
      totalCostAmount: 0,
      totalRevenueAmount: 0,
      batch: {
        id: batchId,
        import_type: 'unified_erp_ledger',
        file_name: fileName,
        deduplication_strategy: strategy,
        total_rows: rows.length,
        imported_rows: 0,
        updated_rows: 0,
        ignored_rows: 0,
        rejected_rows: rows.length,
        status: 'falha',
        user_name: 'Usuário Monteplan',
        created_at: new Date().toISOString(),
      },
      error: err.message || 'Erro inesperado durante a importação.',
    };
  }
}

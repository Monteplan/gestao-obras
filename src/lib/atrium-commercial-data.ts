/**
 * Mapeamento, Dados Comerciais Reais e Importador Unificado do Edifício Atrium Select
 * Fonte Oficial Unificada: vendasgeral.xlsx (80 Unidades completas do ERP)
 */

import * as XLSX from 'xlsx';
import seedRows from './atrium-commercial-seed.json';
import { supabase, isSupabaseConfigured, logAudit } from './supabase';

export type CommercialUnitStatus = 'vendida' | 'disponivel' | 'bloqueada';

export interface UnifiedCommercialErpRow {
  de_emp: string;
  de_uni: string;
  unit_number: string;
  floor: number;
  area_m2: number;
  de_sta: string; // 'VENDIDA' | 'LIVRE' | 'CONTRATADA' | 'RESERVADA'
  cd_cnt: string | null;
  dt_cnt: string | null;
  vl_cnt: number;
  rz_scl: string | null;
  de_frm_rea: string | null;
  nm_ind_rea_cns: string | null;
  nm_ind_rea_hab: string | null;
  pc_jrs_hab: number;
  dt_prv_ent: string | null;
  dt_rea_ent: string | null;
  pc_pgt: number;
  valor_pago: number;
  saldo: number;
}

export interface CommercialUnit {
  id: string;
  unitNumber: string;
  unitLabel: string; // Ex: "1802 - 2 Vagas" ou "803 QUITADO"
  floor: number;
  tower: string;
  typology: 'Apartamento Tipo 01 (3Q)' | 'Apartamento Tipo 02 (2Q)';
  bedrooms: number;
  privateAreaM2: number;
  priceM2: number;
  unitValue: number; // VL_CNT (se vendida/contratada com contrato) ou SALDO (valor tabela se LIVRE/RESERVADA)
  tableValue: number; // Valor de referência / saldo de tabela
  erpStatus: string; // DE_STA original ('VENDIDA', 'LIVRE', 'CONTRATADA', 'RESERVADA')
  isPaidOff: boolean; // Indica se consta "QUITADO" ou saldo zero em unidade vendida
  status: CommercialUnitStatus;
  buyerName: string | null; // RZ_SCL
  contractNumber: string | null; // CD_CNT
  contractDate: string | null; // DT_CNT
  readjustmentFrequency?: string | null; // DE_FRM_REA ("2 Meses")
  constructionIndex?: string | null; // NM_IND_REA_CNS ("INCC")
  postDeliveryIndex?: string | null; // NM_IND_REA_HAB ("IGPM")
  postDeliveryInterest?: number; // PC_JRS_HAB (1%, 0.95%)
  expectedDeliveryDate?: string | null; // DT_PRV_ENT
  actualDeliveryDate?: string | null; // DT_REA_ENT
  paymentPercent?: number; // PC_PGT
  paidValue: number; // ValorPago direto do ERP
  receivableValue: number; // SALDO direto do ERP
  blockedReason?: string | null;
}

export interface CommercialOverviewSummary {
  totalUnits: number;
  soldUnits: number;
  availableUnits: number;
  blockedUnits: number;
  contractedUnits: number; // CONTRATADA (3 un.)
  reservedUnits: number; // RESERVADA (1 un.)
  stockUnits: number;
  salesPercent: number;

  totalPrivateAreaM2: number;
  soldPrivateAreaM2: number;
  availablePrivateAreaM2: number;
  blockedPrivateAreaM2: number;

  vgvOrcado: number;
  vgvVendido: number; // Soma de VL_CNT das unidades vendidas (R$ 16.760.154,94)
  vgvEstoqueDisponivel: number; // Soma de SALDO das unidades LIVRES (R$ 52.839.055,96)
  vgvEstoqueBloqueado: number; // Soma de VL_CNT/SALDO das CONTRATADAS + RESERVADAS (R$ 3.632.570,07)
  vgvEstoqueTotal: number;
  vgvReal: number; // Regra: Vendido até o momento + Estoque

  averagePriceM2Vendido: number; // Regra: Valor vendido ÷ Metragem vendida
  averagePriceM2Geral: number;

  totalReceived: number; // Soma de ValorPago do relatório vendasgeral.xlsx (R$ 4.623.140,74)
  totalReceivable: number; // Soma de SALDO das unidades vendidas (R$ 13.309.496,34)
}

export const COMMERCIAL_UNITS_STORAGE_KEY = 'atrium_vendasgeral_units_v3';

export function excelSerialToISO(serial: any): string | null {
  if (serial === null || serial === undefined || serial === '') return null;
  if (typeof serial === 'string') {
    const trimmed = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const num = Number(serial);
  if (!isNaN(num) && num > 20000 && num < 80000) {
    const utcDays = Math.floor(num - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function inferAreaFromUnitNumber(unitNumber: string): number {
  const clean = String(unitNumber).replace(/\D/g, '');
  const ending = clean.slice(-2);
  if (ending === '01' || ending === '04') return 72;
  return 49;
}

/**
 * Transforma as linhas do relatório unificado (vendasgeral.xlsx) em objetos CommercialUnit
 */
export function buildCommercialUnitsFromUnifiedRows(
  rows: UnifiedCommercialErpRow[]
): CommercialUnit[] {
  return rows.map((r) => {
    const unitNum = String(r.unit_number).trim();
    const area = Number(r.area_m2) || inferAreaFromUnitNumber(unitNum);
    const isTipo01 = area >= 65;
    const typology: CommercialUnit['typology'] = isTipo01
      ? 'Apartamento Tipo 01 (3Q)'
      : 'Apartamento Tipo 02 (2Q)';
    const bedrooms = isTipo01 ? 3 : 2;

    const erpStatus = String(r.de_sta || 'LIVRE').trim().toUpperCase();
    let status: CommercialUnitStatus = 'disponivel';
    let blockedReason: string | null = null;

    if (erpStatus === 'VENDIDA') {
      status = 'vendida';
    } else if (erpStatus === 'CONTRATADA') {
      status = 'bloqueada';
      blockedReason = r.rz_scl
        ? `Contratada / Permuta — ${r.rz_scl}`
        : 'Unidade Contratada / Permuta';
    } else if (erpStatus === 'RESERVADA') {
      status = 'bloqueada';
      blockedReason = r.rz_scl
        ? `Reservada — ${r.rz_scl}`
        : 'Unidade Reservada Comercialmente';
    } else {
      status = 'disponivel';
    }

    const vlCnt = Math.round(Number(r.vl_cnt || 0) * 100) / 100;
    const valorPago = Math.round(Number(r.valor_pago || 0) * 100) / 100;
    const saldo = Math.round(Number(r.saldo || 0) * 100) / 100;

    // Para unidades vendidas ou contratadas com VL_CNT > 0, o valor da unidade é VL_CNT;
    // Para unidades LIVRES ou RESERVADAS (onde VL_CNT = 0), o valor da unidade em tabela vem na coluna SALDO.
    const unitValue = vlCnt > 0 ? vlCnt : saldo;
    const priceM2 = area > 0 ? Math.round((unitValue / area) * 100) / 100 : 0;

    const rawLabel = String(r.de_uni || unitNum).trim();
    const isPaidOff =
      rawLabel.toUpperCase().includes('QUITADO') ||
      (status === 'vendida' && saldo === 0 && valorPago > 0);

    return {
      id: `unit-${unitNum}`,
      unitNumber: unitNum,
      unitLabel: rawLabel,
      floor: Number(r.floor) || Math.floor(Number(unitNum) / 100) || 1,
      tower: 'Torre Única',
      typology,
      bedrooms,
      privateAreaM2: area,
      priceM2,
      unitValue,
      tableValue: saldo > 0 ? saldo : unitValue,
      erpStatus,
      isPaidOff,
      status,
      buyerName: r.rz_scl || null,
      contractNumber: r.cd_cnt || null,
      contractDate: r.dt_cnt || null,
      readjustmentFrequency: r.de_frm_rea || null,
      constructionIndex: r.nm_ind_rea_cns || null,
      postDeliveryIndex: r.nm_ind_rea_hab || null,
      postDeliveryInterest: Number(r.pc_jrs_hab || 0),
      expectedDeliveryDate: r.dt_prv_ent || null,
      actualDeliveryDate: r.dt_rea_ent || null,
      paymentPercent: Number(r.pc_pgt || 0),
      paidValue: valorPago,
      receivableValue: saldo,
      blockedReason,
    };
  });
}

export const INITIAL_UNIFIED_ROWS: UnifiedCommercialErpRow[] = seedRows as UnifiedCommercialErpRow[];

export const ATRIUM_COMMERCIAL_UNITS: CommercialUnit[] =
  buildCommercialUnitsFromUnifiedRows(INITIAL_UNIFIED_ROWS);

export function calculateCommercialSummary(
  units: CommercialUnit[] = ATRIUM_COMMERCIAL_UNITS
): CommercialOverviewSummary {
  const totalUnits = units.length;
  const soldUnitsList = units.filter((u) => u.status === 'vendida');
  const availableUnitsList = units.filter((u) => u.status === 'disponivel');
  const blockedUnitsList = units.filter((u) => u.status === 'bloqueada');

  const contractedUnits = units.filter((u) => u.erpStatus === 'CONTRATADA').length;
  const reservedUnits = units.filter((u) => u.erpStatus === 'RESERVADA').length;

  const soldUnits = soldUnitsList.length;
  const availableUnits = availableUnitsList.length;
  const blockedUnits = blockedUnitsList.length;
  const stockUnits = availableUnits + blockedUnits;

  const totalPrivateAreaM2 = units.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const soldPrivateAreaM2 = soldUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const availablePrivateAreaM2 = availableUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const blockedPrivateAreaM2 = blockedUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);

  const vgvOrcado = 55206000.0;
  const vgvVendido = soldUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueDisponivel = availableUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueBloqueado = blockedUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueTotal = vgvEstoqueDisponivel + vgvEstoqueBloqueado;

  // VGV Real = Vendido + Estoque
  const vgvReal = vgvVendido + vgvEstoqueTotal;

  // Preço Médio m² Vendido = Valor Vendido ÷ Metragem Vendida
  const averagePriceM2Vendido = soldPrivateAreaM2 > 0 ? vgvVendido / soldPrivateAreaM2 : 11406.2;
  const averagePriceM2Geral = totalPrivateAreaM2 > 0 ? vgvReal / totalPrivateAreaM2 : 11406.2;

  const totalReceived = soldUnitsList.reduce((acc, u) => acc + u.paidValue, 0);
  const totalReceivable = soldUnitsList.reduce((acc, u) => acc + u.receivableValue, 0);

  const salesPercent = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

  return {
    totalUnits,
    soldUnits,
    availableUnits,
    blockedUnits,
    contractedUnits,
    reservedUnits,
    stockUnits,
    salesPercent,
    totalPrivateAreaM2,
    soldPrivateAreaM2,
    availablePrivateAreaM2,
    blockedPrivateAreaM2,
    vgvOrcado,
    vgvVendido,
    vgvEstoqueDisponivel,
    vgvEstoqueBloqueado,
    vgvEstoqueTotal,
    vgvReal,
    averagePriceM2Vendido,
    averagePriceM2Geral,
    totalReceived,
    totalReceivable,
  };
}

/**
 * Faz o parse de um arquivo Excel no formato unificado vendasgeral.xlsx
 */
export async function parseVendasGeralExcelFile(file: File): Promise<UnifiedCommercialErpRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

  const parsed: UnifiedCommercialErpRow[] = [];
  for (const r of rows) {
    const rawDeUni = String(r.DE_UNI ?? r.Unidade ?? r.unidade ?? '').trim();
    if (!rawDeUni) continue;

    const numMatch = rawDeUni.match(/\d+/);
    const unitNumber = numMatch ? numMatch[0] : rawDeUni;
    const floor = Math.floor(Number(unitNumber) / 100) || 1;
    const areaM2 = r.ARE_UNI ? Number(r.ARE_UNI) : inferAreaFromUnitNumber(unitNumber);

    parsed.push({
      de_emp: String(r.DE_EMP || r.NM_EMP || 'Atrium Sellect').trim(),
      de_uni: rawDeUni,
      unit_number: unitNumber,
      floor,
      area_m2: areaM2,
      de_sta: String(r.DE_STA || 'LIVRE').trim().toUpperCase(),
      cd_cnt: r.CD_CNT ? String(r.CD_CNT).trim() : null,
      dt_cnt: excelSerialToISO(r.DT_CNT),
      vl_cnt: Number(r.VL_CNT ?? 0),
      rz_scl: r.RZ_SCL ? String(r.RZ_SCL).trim() : null,
      de_frm_rea: r.DE_FRM_REA ? String(r.DE_FRM_REA).trim() : null,
      nm_ind_rea_cns: r.NM_IND_REA_CNS ? String(r.NM_IND_REA_CNS).trim() : null,
      nm_ind_rea_hab: r.NM_IND_REA_HAB ? String(r.NM_IND_REA_HAB).trim() : null,
      pc_jrs_hab: Number(r.PC_JRS_HAB ?? 0),
      dt_prv_ent: excelSerialToISO(r.DT_PRV_ENT),
      dt_rea_ent: excelSerialToISO(r.DT_REA_ENT),
      pc_pgt: Number(r.PC_PGT ?? 0),
      valor_pago: Number(r.ValorPago ?? r.valor_pago ?? 0),
      saldo: Number(r.SALDO ?? r.saldo ?? 0),
    });
  }

  return parsed;
}

/**
 * Grava as unidades do relatório unificado vendasgeral.xlsx na tabela public.commercial_units do Supabase
 */
export async function syncUnifiedCommercialToSupabase(
  rows: UnifiedCommercialErpRow[]
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase não configurado.' };
  }

  try {
    const dbRows = rows.map((u) => ({
      work_id: 'work-1',
      de_emp: u.de_emp,
      de_uni: u.de_uni,
      unit_number: u.unit_number,
      floor: u.floor,
      area_m2: u.area_m2,
      de_sta: u.de_sta,
      cd_cnt: u.cd_cnt,
      dt_cnt: u.dt_cnt,
      vl_cnt: u.vl_cnt,
      rz_scl: u.rz_scl,
      de_frm_rea: u.de_frm_rea,
      nm_ind_rea_cns: u.nm_ind_rea_cns,
      nm_ind_rea_hab: u.nm_ind_rea_hab,
      pc_jrs_hab: u.pc_jrs_hab,
      dt_prv_ent: u.dt_prv_ent,
      dt_rea_ent: u.dt_rea_ent,
      pc_pgt: u.pc_pgt,
      valor_pago: u.valor_pago,
      saldo: u.saldo,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('commercial_units')
      .upsert(dbRows, { onConflict: 'unit_number' });

    if (error) {
      return { ok: false, error: error.message };
    }

    logAudit(
      'IMPORT_VENDAS_GERAL',
      'commercial_units',
      'work-1',
      `Relatório Geral de Vendas importado (${rows.length} unidades)`
    );
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao gravar no Supabase' };
  }
}

/**
 * Carrega os dados da tabela public.commercial_units do Supabase
 */
export async function fetchCommercialDataFromSupabase(): Promise<CommercialUnit[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('commercial_units')
      .select('*')
      .order('floor', { ascending: true })
      .order('unit_number', { ascending: true });

    if (error || !data || data.length === 0) return null;

    // Verifica se a tabela está no formato unificado (possui coluna saldo / valor_pago)
    if (data[0].saldo === undefined && data[0].valor_pago === undefined) {
      return null;
    }

    const rows: UnifiedCommercialErpRow[] = data.map((r: any) => ({
      de_emp: String(r.de_emp || 'Atrium Sellect'),
      de_uni: String(r.de_uni || r.unit_number),
      unit_number: String(r.unit_number),
      floor: Number(r.floor || 1),
      area_m2: Number(r.area_m2 || inferAreaFromUnitNumber(String(r.unit_number))),
      de_sta: String(r.de_sta || 'LIVRE'),
      cd_cnt: r.cd_cnt || null,
      dt_cnt: r.dt_cnt || null,
      vl_cnt: Number(r.vl_cnt || 0),
      rz_scl: r.rz_scl || null,
      de_frm_rea: r.de_frm_rea || null,
      nm_ind_rea_cns: r.nm_ind_rea_cns || null,
      nm_ind_rea_hab: r.nm_ind_rea_hab || null,
      pc_jrs_hab: Number(r.pc_jrs_hab || 0),
      dt_prv_ent: r.dt_prv_ent || null,
      dt_rea_ent: r.dt_rea_ent || null,
      pc_pgt: Number(r.pc_pgt || 0),
      valor_pago: Number(r.valor_pago || 0),
      saldo: Number(r.saldo || 0),
    }));

    return buildCommercialUnitsFromUnifiedRows(rows);
  } catch {
    return null;
  }
}

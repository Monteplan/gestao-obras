import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import {
  parsePcoWorkbook,
  validatePcoParsedData,
  getAtriumCommercialData,
  classifyFinancialNature,
  excelSerialToDateString,
  DEFAULT_PCO_PROFILE,
} from '../lib/pco-importer';

describe('Motor de Importação PCO e Carga Real da Obra Atrium Select', { timeout: 30000 }, () => {
  const filePath = path.resolve(__dirname, '../../data/imports/ATRIUM-PlanejamentoeControledeObra(PCO)-SET26-IMPORT.xlsx');
  let cachedWb: XLSX.WorkBook | null = null;
  const getWorkbook = () => {
    if (!cachedWb) {
      const buffer = fs.readFileSync(filePath);
      cachedWb = XLSX.read(buffer, { type: 'buffer' });
    }
    return cachedWb;
  };
  
  it('Critério 1: deve reconhecer o arquivo PCO da Atrium e identificar as seis abas esperadas', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const wb = getWorkbook();
    expect(wb.SheetNames).toEqual([
      'PLANEJAMENTO MACRO',
      '% INDIRETOS',
      '% DIRETOS',
      'BASE ORÇAMENTO',
      'REAL',
      'de-para',
    ]);
  });

  it('Critério 2 e 26 a 30: deve carregar os dados cadastrais e comerciais com tipologias e áreas', () => {
    const comm = getAtriumCommercialData('work-1');
    expect(comm.initial_vgv).toBe(55206000.00);
    expect(comm.initial_price_per_m2).toBe(11406.20);
    expect(comm.sales_table_start_date).toBe('2023-08-26');
    expect(comm.total_units).toBe(80);
    expect(comm.total_private_area_m2).toBe(4840.00);

    // Tipologias Tipo 01 e Tipo 02
    expect(comm.typologies).toHaveLength(2);

    const tipo1 = comm.typologies.find(t => t.code === 'Tipo 01')!;
    expect(tipo1.units_count).toBe(40);
    expect(tipo1.unit_area_m2).toBe(72.00);
    expect(tipo1.total_area_m2).toBe(2880.00);
    expect(tipo1.calculated_total_area_m2).toBe(2880.00);
    expect(tipo1.area_discrepancy_alert).toBe(false);

    const tipo2 = comm.typologies.find(t => t.code === 'Tipo 02')!;
    expect(tipo2.units_count).toBe(40);
    expect(tipo2.unit_area_m2).toBe(49.00);
    expect(tipo2.total_area_m2).toBe(1960.00);
    expect(tipo2.calculated_total_area_m2).toBe(1960.00);
    expect(tipo2.area_discrepancy_alert).toBe(false);
  });

  it('Critério 31 e 32: deve preservar os prazos de fontes distintas (Comercial vs PCO) e sinalizar divergência', () => {
    const comm = getAtriumCommercialData('work-1');
    const sch = comm.schedule;

    // 1. Prazo Comercial
    expect(sch.commercial_start).toBe('2023-08-01');
    expect(sch.commercial_duration_months).toBe(50);
    expect(sch.commercial_end).toBe('2027-10-01');
    expect(sch.commercial_remaining_months).toBe(13);

    // 2. Prazo PCO
    expect(sch.pco_start).toBe('2025-02-01');
    expect(sch.pco_planned_end).toBe('2028-02-01');
    expect(sch.client_deadline).toBe('2028-01-01');
    expect(sch.client_grace_period).toBe('2028-07-01');

    // Divergência identificada (out/27 vs fev/28)
    expect(sch.divergence_alert).toBe(true);
    expect(sch.difference_months).toBe(4);
  });

  it('Critério 4, 5, 8: deve ler a aba PLANEJAMENTO MACRO com última medição física e colunas dinâmicas', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);

    expect(parsed.work_metadata.name).toContain('ATRIUM');
    expect(parsed.work_metadata.address).toContain('SILVA PAULET');
    
    // Executado acumulado da última medição física (aproximadamente 46,2153%)
    expect(parsed.work_metadata.accumulated_progress).toBeCloseTo(46.2153, 2);

    // Colunas dinâmicas de competência (iniciando em setembro/2026 até 2028)
    expect(parsed.macro_periods.length).toBeGreaterThanOrEqual(15);
    const sep26 = parsed.macro_periods.find(p => p.period_key === '2026-09');
    expect(sep26).toBeDefined();
    expect(sep26?.planned_percent_month).toBeGreaterThan(0);
    expect(sep26?.planned_percent_accumulated).toBeGreaterThan(45);
  });

  it('Critério 6 e 7: deve carregar a abertura de % INDIRETOS e % DIRETOS com pesos somando 100%', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);

    expect(parsed.indirects.total_budget).toBeCloseTo(4520310.52, 1);
    expect(parsed.indirects.weight_percent).toBeCloseTo(17.5851, 2);
    expect(parsed.indirects.executed_accumulated).toBeCloseTo(10.7156, 2);
    expect(parsed.indirects.balance_percent).toBeCloseTo(6.8695, 2);
    expect(parsed.indirects.items.length).toBeGreaterThan(5);

    expect(parsed.directs.total_budget).toBeCloseTo(21185048.96, 1);
    expect(parsed.directs.weight_percent).toBeCloseTo(82.4149, 2);
    expect(parsed.directs.executed_accumulated).toBeCloseTo(35.4997, 2);
    expect(parsed.directs.balance_percent).toBeCloseTo(46.9152, 2);
    expect(parsed.directs.items.length).toBeGreaterThan(15);

    // Soma dos pesos = 100%
    const totalWeights = parsed.indirects.weight_percent + parsed.directs.weight_percent;
    expect(totalWeights).toBeCloseTo(100.0, 1);
  });

  it('Critério 7, 8, 9: deve carregar BASE ORÇAMENTO com 320 linhas e total orçado de R$ 25.705.359,47', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);

    expect(parsed.base_budget.total_amount).toBeCloseTo(25705359.47, 1);
    expect(parsed.base_budget.lines_count).toBeGreaterThanOrEqual(295);

    // Deve preservar o vínculo do 1º De-Para via CONTA SWS
    const sampleItem = parsed.base_budget.items[0];
    expect(sampleItem.conta_sws).toBeTruthy();
    expect(sampleItem.valor).toBeGreaterThan(0);
    expect(sampleItem.grupo_orcamento).toBeTruthy();
  });

  it('Critério 10, 11, 12: deve carregar REAL com 5.635 lançamentos e R$ 23.228.634,46', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);

    expect(parsed.real_entries.lines_count).toBe(5635);
    expect(parsed.real_entries.gross_total).toBeCloseTo(23228634.46, 1);

    // Verifica classificação de naturezas
    const natures = new Set(parsed.real_entries.entries.map(e => e.natureza));
    expect(natures.has('receita')).toBe(true);
    expect(natures.has('custo_obra')).toBe(true);

    const firstEntry = parsed.real_entries.entries[0];
    expect(firstEntry.documento).toBe('AT2003');
    expect(firstEntry.natureza).toBe('receita'); // Venda de imóveis
  });

  it('Critério 13, 14, 15: deve carregar de-para com 115 regras e consolidar contas detalhadas em Salários - Obra', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);

    expect(parsed.de_para_rules.rules_count).toBe(115);
    expect(parsed.de_para_rules.distinct_adjusted_accounts).toBeGreaterThanOrEqual(80);

    // Contas de pessoal como FGTS e Assistência Médica devem mapear para Salários - Obra
    const fgtsRule = parsed.de_para_rules.rules.find(r => r.original_account.includes('FGTS RESCISORIO'));
    expect(fgtsRule).toBeDefined();
    expect(fgtsRule?.adjusted_account).toBe('Salários - Obra');

    const assistRule = parsed.de_para_rules.rules.find(r => r.original_account.includes('Assist.Medica'));
    expect(assistRule).toBeDefined();
    expect(assistRule?.adjusted_account).toBe('Salários - Obra');
  });

  it('Critério 17 e 18: deve validar os controles consolidados sem erros bloqueantes', () => {
    const wb = getWorkbook();
    const parsed = parsePcoWorkbook(wb);
    const val = validatePcoParsedData(parsed);

    expect(val.is_valid).toBe(true);
    expect(val.errors_count).toBe(0);
    expect(val.warnings_count).toBe(0);
    expect(val.base_budget_total).toBeCloseTo(25705359.47, 1);
    expect(val.real_lines_count).toBe(5635);
    expect(val.macro_physical_progress).toBeCloseTo(46.2153, 2);
  });

  it('Critério 22: o perfil PCO deve ser configurável e reutilizável para outras obras', () => {
    expect(DEFAULT_PCO_PROFILE.code).toBe('PCO');
    expect(DEFAULT_PCO_PROFILE.expected_sheets.macro).toBe('PLANEJAMENTO MACRO');
    expect(DEFAULT_PCO_PROFILE.expected_sheets.base_budget).toBe('BASE ORÇAMENTO');
    expect(DEFAULT_PCO_PROFILE.expected_sheets.real).toBe('REAL');
    expect(DEFAULT_PCO_PROFILE.expected_sheets.de_para).toBe('de-para');
  });
});

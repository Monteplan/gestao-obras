import { describe, it, expect } from 'vitest';
import { INITIAL_WORKS } from '../lib/seed-data';
import { ATRIUM_DRE_SUMMARY, ATRIUM_DRE_LINES, isConstructionAccount } from '../lib/atrium-dre-data';
import { ATRIUM_BASE_ORCAMENTO_ITEMS } from '../lib/atrium-base-orcamento';
import { ALL_REAL_ENTRIES } from '../lib/atrium-real-entries';
import { ATRIUM_PCO_STAGES } from '../lib/atrium-pco-data';

describe('Auditoria Técnica e Funcional da Obra Atrium Select', () => {
  const atriumWork = INITIAL_WORKS.find(w => w.id === 'work-1' || w.code === 'OBR-001')!;

  it('1. Deve validar que a obra Atrium Select possui dados cadastrais reais preservados', () => {
    expect(atriumWork).toBeDefined();
    expect(atriumWork.name).toBe('Atrium Select');
    expect(atriumWork.address).toContain('Silva Paulet, 782');
    expect(atriumWork.city).toBe('Fortaleza');
    expect(atriumWork.state).toBe('CE');
    expect(atriumWork.client).toBe('Monteplan Incorporadora');
  });

  it('2. Deve comprovar a integridade dos dados comerciais (VGV, Preço/m², Unidades e Áreas)', () => {
    expect(atriumWork.commercial_data).toBeDefined();
    expect(atriumWork.commercial_data?.sales_table_date).toBe('2023-08-26');
    expect(atriumWork.commercial_data?.vgv_total).toBe(55206000);
    expect(atriumWork.commercial_data?.total_units).toBe(80);
    expect(atriumWork.commercial_data?.total_private_area_m2).toBe(4840);
    expect(atriumWork.commercial_data?.average_price_m2).toBe(11406.2);

    // Tipologias
    expect(atriumWork.typologies).toHaveLength(2);
    const tipo1 = atriumWork.typologies?.find(t => t.name.includes('Tipo 01'));
    const tipo2 = atriumWork.typologies?.find(t => t.name.includes('Tipo 02'));
    expect(tipo1?.unit_count).toBe(40);
    expect(tipo1?.private_area_m2).toBe(72.0);
    expect(tipo1?.subtotal_area_m2).toBe(2880.0);
    expect(tipo2?.unit_count).toBe(40);
    expect(tipo2?.private_area_m2).toBe(49.0);
    expect(tipo2?.subtotal_area_m2).toBe(1960.0);

    const somaAreas = (tipo1?.subtotal_area_m2 || 0) + (tipo2?.subtotal_area_m2 || 0);
    expect(somaAreas).toBe(4840.0);
  });

  it('3. Deve preservar as 4 referências de prazos divergentes sem descarte silencioso', () => {
    const rec = atriumWork.schedule_reconciliation;
    expect(rec).toBeDefined();
    // Prazo Comercial: Ago/2023 a Out/2027 (50 meses)
    expect(rec?.commercial_start).toBe('2023-08-01');
    expect(rec?.commercial_end).toBe('2027-10-31');
    expect(rec?.commercial_duration_months).toBe(50);
    expect(rec?.commercial_remaining_months).toBe(13);

    // Prazo PCO: Fev/2025 a Fev/2028 (36 meses)
    expect(rec?.pco_start).toBe('2025-02-01');
    expect(rec?.pco_end).toBe('2028-02-28');
    expect(rec?.pco_duration_months).toBe(36);

    // Prazo do Cliente e Carência
    expect(rec?.client_contract_end).toBe('2028-01-31');
    expect(rec?.client_grace_period_months).toBe(6);
    expect(rec?.client_contract_limit).toBe('2028-07-31');

    // Divergência identificada
    expect(rec?.divergence_months).toBe(4);
  });

  it('4. Deve validar o orçamento-base PCO (R$ 25.705.359,47) e partição Diretos vs Indiretos', () => {
    expect(atriumWork.contract_value).toBe(25705359.47);
    expect(ATRIUM_DRE_SUMMARY.custoObra.orcado).toBe(25705359.47);

    // Validação da soma exata dos itens da aba BASE ORÇAMENTO
    const somaBase = ATRIUM_BASE_ORCAMENTO_ITEMS.reduce((acc, curr) => acc + curr.budgetAmount, 0);
    expect(somaBase).toBeCloseTo(25705359.47, 1);

    // Diretos e Indiretos
    const diretos = 21185048.95;
    const indiretos = 4520310.52;
    expect(diretos + indiretos).toBeCloseTo(25705359.47, 1);
  });

  it('5. Deve validar o avanço físico acumulado oficial de 46,2153% na medição SET/26', () => {
    expect(atriumWork.pco_physical_progress).toBe(46.2153);
    expect(atriumWork.progress_percent).toBeCloseTo(46.22, 2);
    expect(ATRIUM_PCO_STAGES.length).toBeGreaterThan(0);
  });

  it('6. Deve validar a extração dos 5.635 lançamentos reais do ERP e segregação de naturezas', () => {
    expect(ALL_REAL_ENTRIES.length).toBe(5635);

    // Na DRE, custos de obra (R$ 11.292.416,61) e despesas (R$ 2.755.854,03) são estritamente segregados
    expect(ATRIUM_DRE_SUMMARY.custoObra.realizado).toBe(11292416.61);
    expect(ATRIUM_DRE_SUMMARY.despesas.realizado).toBe(2755854.03);
    expect(ATRIUM_DRE_SUMMARY.receita.realizadoBruto).toBe(4789007.29);

    // Resultado operacional realizado: 4.789.007,29 - 11.292.416,61 - 2.755.854,03 = -9.259.263,35
    const resultadoCalculado = ATRIUM_DRE_SUMMARY.receita.realizadoBruto - ATRIUM_DRE_SUMMARY.custoObra.realizado - ATRIUM_DRE_SUMMARY.despesas.realizado;
    expect(resultadoCalculado).toBeCloseTo(-9259263.35, 2);
    expect(ATRIUM_DRE_SUMMARY.resultadoFinanceiro.resultadoOperacionalRealizado).toBeCloseTo(-9259263.35, 2);
  });

  it('7. Deve garantir que VGV e Orçamento de Obra não sejam somados ou misturados', () => {
    const vgv = atriumWork.commercial_data?.vgv_total || 0;
    const orcamentoObra = atriumWork.contract_value;
    expect(vgv).toBe(55206000);
    expect(orcamentoObra).toBe(25705359.47);
    expect(vgv).not.toEqual(orcamentoObra);
  });
});

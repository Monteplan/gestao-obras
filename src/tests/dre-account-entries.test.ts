import { describe, it, expect } from 'vitest';
import {
  getEntriesForAccount,
  getEntriesForDreItem,
  getAccountEntriesStats,
  ALL_REAL_ENTRIES,
} from '../lib/atrium-real-entries';
import { ATRIUM_DRE_LINES, ATRIUM_DRE_SUMMARY } from '../lib/atrium-dre-data';

describe('Detalhamento de Lançamentos da Conta DRE (Razão ERP / REAL)', () => {
  it('1. Deve conter a base completa de lançamentos contábeis reais da aba REAL do PCO', () => {
    expect(ALL_REAL_ENTRIES.length).toBe(5635);
    const sample = ALL_REAL_ENTRIES[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('date');
    expect(sample).toHaveProperty('doc');
    expect(sample).toHaveProperty('supplier');
    expect(sample).toHaveProperty('desc');
    expect(sample).toHaveProperty('val');
    expect(sample).toHaveProperty('originalAccount');
    expect(sample).toHaveProperty('account');
    expect(typeof sample.val).toBe('number');
  });

  it('2. Deve retornar exatamente os lançamentos e a soma correta para RECEITA DE VENDAS DE IMÓVEIS', () => {
    const line = ATRIUM_DRE_LINES.find((l) => l.name === 'RECEITA DE VENDAS DE IMÓVEIS');
    expect(line).toBeDefined();

    const entries = getEntriesForDreItem(line!);
    expect(entries.length).toBe(425);

    const stats = getAccountEntriesStats(entries);
    expect(stats.count).toBe(425);
    // Realizado na DRE: R$ 4.789.007,29
    expect(stats.totalVal).toBeCloseTo(4789007.29, 2);
  });

  it('3. Deve retornar exatamente os lançamentos para tributos sobre receita (PIS e COFINS)', () => {
    const pisLine = ATRIUM_DRE_LINES.find((l) => l.name === 'PIS');
    expect(pisLine).toBeDefined();
    const pisEntries = getEntriesForDreItem(pisLine!);
    expect(pisEntries.length).toBe(23);
    const pisSum = pisEntries.reduce((a, c) => a + c.val, 0);
    expect(pisSum).toBeCloseTo(17143.43, 2);

    const cofinsLine = ATRIUM_DRE_LINES.find((l) => l.name === 'COFINS');
    expect(cofinsLine).toBeDefined();
    const cofinsEntries = getEntriesForDreItem(cofinsLine!);
    expect(cofinsEntries.length).toBe(23);
    const cofinsSum = cofinsEntries.reduce((a, c) => a + c.val, 0);
    expect(cofinsSum).toBeCloseTo(79229.54, 2);
  });

  it('4. Deve retornar lançamentos detalhados de contas de obra (ESTRUTURA DE CONCRETO e FUNDAÇÕES)', () => {
    const estruturaLine = ATRIUM_DRE_LINES.find((l) => l.name === 'ESTRUTURA DE CONCRETO');
    expect(estruturaLine).toBeDefined();
    const estruturaEntries = getEntriesForDreItem(estruturaLine!);
    expect(estruturaEntries.length).toBe(590);
    const estruturaSum = estruturaEntries.reduce((a, c) => a + c.val, 0);
    expect(estruturaSum).toBeCloseTo(4477883.77, 2);

    const fundacoesLine = ATRIUM_DRE_LINES.find((l) => l.name === 'FUNDAÇÕES');
    expect(fundacoesLine).toBeDefined();
    const fundacoesEntries = getEntriesForDreItem(fundacoesLine!);
    expect(fundacoesEntries.length).toBe(133);
    const fundacoesSum = fundacoesEntries.reduce((a, c) => a + c.val, 0);
    expect(fundacoesSum).toBeCloseTo(1156233.08, 2);
  });

  it('5. Deve permitir agregação de lançamentos para grupos consolidados da DRE', () => {
    // Grupo MATERIAIS E SERVIÇOS DE EXECUÇÃO DE OBRA
    const matServLine = ATRIUM_DRE_LINES.find(
      (l) => l.name === 'MATERIAIS E SERVIÇOS DE EXECUÇÃO DE OBRA'
    );
    expect(matServLine).toBeDefined();
    const matServEntries = getEntriesForDreItem(matServLine!);
    expect(matServEntries.length).toBeGreaterThan(1000);
    const matServSum = matServEntries.reduce((a, c) => a + c.val, 0);
    // Bate com ATRIUM_DRE_SUMMARY.custoObra.materiaisServicos.realizado
    expect(matServSum).toBeCloseTo(ATRIUM_DRE_SUMMARY.custoObra.materiaisServicos.realizado, 2);

    // Grupo CUSTO COM MÃO DE OBRA
    const maoDeObraLine = ATRIUM_DRE_LINES.find((l) => l.name === 'CUSTO COM MÃO DE OBRA');
    expect(maoDeObraLine).toBeDefined();
    const maoDeObraEntries = getEntriesForDreItem(maoDeObraLine!);
    expect(maoDeObraEntries.length).toBeGreaterThan(500);
    const maoDeObraSum = maoDeObraEntries.reduce((a, c) => a + c.val, 0);
    // Bate com ATRIUM_DRE_SUMMARY.custoObra.maoDeObra.realizado
    expect(maoDeObraSum).toBeCloseTo(ATRIUM_DRE_SUMMARY.custoObra.maoDeObra.realizado, 2);
  });

  it('6. Deve tratar com elegância contas sem lançamentos (retornando array vazio sem erro)', () => {
    const emptyLine = ATRIUM_DRE_LINES.find((l) => l.name === 'RECEITA DE OBRAS PÚBLICAS');
    expect(emptyLine).toBeDefined();
    const emptyEntries = getEntriesForDreItem(emptyLine!);
    expect(emptyEntries).toEqual([]);
    const stats = getAccountEntriesStats(emptyEntries);
    expect(stats.count).toBe(0);
    expect(stats.totalVal).toBe(0);
    expect(stats.avgVal).toBe(0);
  });
});

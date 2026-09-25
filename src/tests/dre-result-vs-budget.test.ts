import { describe, it, expect } from 'vitest';
import {
  ATRIUM_DRE_SUMMARY,
  ATRIUM_DRE_LINES,
  ATRIUM_OBRA_ACCOUNTS,
  ATRIUM_DEPARA_RULES,
  isConstructionAccount,
} from '../lib/atrium-dre-data';

describe('Diferenciação: Acompanhamento do Orçamento da Obra vs Acompanhamento do Resultado da Obra (DRE)', () => {
  it('1. Deve segregar estritamente as 47 contas do Orçamento da Obra (Construção Civil)', () => {
    expect(ATRIUM_OBRA_ACCOUNTS.length).toBe(47);
    
    // Contas típicas de obra devem retornar true
    expect(isConstructionAccount('ALVENARIA E PAINÉIS')).toBe(true);
    expect(isConstructionAccount('ESTRUTURA DE CONCRETO')).toBe(true);
    expect(isConstructionAccount('FUNDAÇÕES')).toBe(true);
    expect(isConstructionAccount('INSTALAÇÕES ELÉTRICAS(MAT+M.O.)')).toBe(true);
    expect(isConstructionAccount('Salários - Obra')).toBe(true);
    expect(isConstructionAccount('Aluguel E Manut. De Maq. Equip E Móveis - Obra')).toBe(true);

    // Contas que NÃO participam do orçamento da obra devem retornar false
    expect(isConstructionAccount('RECEITA DE VENDAS DE IMÓVEIS')).toBe(false);
    expect(isConstructionAccount('PIS')).toBe(false);
    expect(isConstructionAccount('COFINS')).toBe(false);
    expect(isConstructionAccount('Comissão De Corretores')).toBe(false);
    expect(isConstructionAccount('Publicidade e Propaganda')).toBe(false);
    expect(isConstructionAccount('Tarifas Bancárias')).toBe(false);
    expect(isConstructionAccount('Servicos De Advocacia')).toBe(false);
    expect(isConstructionAccount('Benefícios e Retiradas da Diretoria')).toBe(false);
  });

  it('2. Card 1 - Receita (Orçado vs Realizado) deve bater rigorosamente com a planilha RESUMO ORÇAMENTO X REAL', () => {
    const { receita } = ATRIUM_DRE_SUMMARY;
    expect(receita.orcadoBruto).toBe(55206000.00);
    expect(receita.realizadoBruto).toBeCloseTo(4789007.29, 2);
    expect(receita.deducoesOrcado).toBe(2208240.00);
    expect(receita.deducoesRealizado).toBeCloseTo(228373.95, 2);
    expect(receita.liquidaOrcado).toBe(52997760.00);
    expect(receita.liquidaRealizado).toBeCloseTo(4560633.34, 2);
    expect(receita.percentBruto).toBeCloseTo(8.68, 2);
  });

  it('3. Card 2 - Custo de Obra (Orçado vs Realizado) deve ser unificado ao Orçamento Aprovado da Obra (R$ 25.705.359,47)', () => {
    const { custoObra } = ATRIUM_DRE_SUMMARY;
    expect(custoObra.orcado).toBeCloseTo(25705359.47, 2);
    expect(custoObra.realizado).toBeCloseTo(11292416.61, 2);
    expect(custoObra.percent).toBeCloseTo(43.93, 2);

    expect(custoObra.materiaisServicos.orcado).toBeCloseTo(15715662.40, 2);
    expect(custoObra.materiaisServicos.realizado).toBeCloseTo(6764032.26, 2);
    expect(custoObra.maoDeObra.orcado).toBeCloseTo(8897338.35, 2);
    expect(custoObra.maoDeObra.realizado).toBeCloseTo(3730363.01, 2);
    expect(custoObra.admObra.orcado).toBe(925480.00);
    expect(custoObra.admObra.realizado).toBeCloseTo(600933.62, 2);
    expect(custoObra.terrenosLegalizacoes.orcado).toBeCloseTo(166878.72, 2);
    expect(custoObra.terrenosLegalizacoes.realizado).toBeCloseTo(197087.72, 2);
  });

  it('4. Card 3 - Despesas (Orçado vs Realizado) deve incluir Deduções/Impostos RET, Comerciais e Sede', () => {
    const { despesas } = ATRIUM_DRE_SUMMARY;
    expect(despesas.orcado).toBeCloseTo(5751391.28, 2);
    expect(despesas.realizado).toBeCloseTo(2755854.03, 2);
    expect(despesas.percent).toBeCloseTo(47.92, 2);

    expect(despesas.impostosReceita.orcado).toBe(2208240.00);
    expect(despesas.impostosReceita.realizado).toBeCloseTo(228373.95, 2);
    expect(despesas.comerciaisMkt.orcado).toBe(1104120.00);
    expect(despesas.comerciaisMkt.realizado).toBeCloseTo(278054.89, 2);
    expect(despesas.comissoesVendas.orcado).toBe(2484270.00);
    expect(despesas.comissoesVendas.realizado).toBeCloseTo(596914.20, 2);
  });

  it('5. Card 4 - Resultado Financeiro deve seguir a fórmula: Receita de Vendas (-) Custos de Obra (-) Despesas', () => {
    const { receita, custoObra, despesas, resultadoFinanceiro } = ATRIUM_DRE_SUMMARY;
    
    // Verificação estrita da fórmula: Receita - Custos - Despesas
    const calcOrcado = receita.orcadoBruto - custoObra.orcado - despesas.orcado;
    expect(calcOrcado).toBeCloseTo(23749249.25, 2);
    expect(resultadoFinanceiro.resultadoOperacionalOrcado).toBeCloseTo(calcOrcado, 2);

    const calcRealizado = receita.realizadoBruto - custoObra.realizado - despesas.realizado;
    expect(calcRealizado).toBeCloseTo(-9259263.35, 2);
    expect(resultadoFinanceiro.resultadoOperacionalRealizado).toBeCloseTo(calcRealizado, 2);

    expect(resultadoFinanceiro.margemOperacionalOrcada).toBeCloseTo(43.02, 2);
    expect(resultadoFinanceiro.resultadoCaixaOrcado).toBeCloseTo(23704010.53, 2);
    expect(resultadoFinanceiro.resultadoCaixaRealizado).toBeCloseTo(-9449474.38, 2);
    expect(resultadoFinanceiro.explicacaoCiclo).toBeTruthy();
  });

  it('6. Deve conter todas as linhas e totais da DRE e regras do De-Para', () => {
    expect(ATRIUM_DRE_LINES.length).toBeGreaterThan(200);
    expect(ATRIUM_DEPARA_RULES.length).toBeGreaterThanOrEqual(86);

    const receitaLine = ATRIUM_DRE_LINES.find(l => l.name === 'RECEITAS');
    expect(receitaLine?.orcado).toBe(55206000);

    const custoLine = ATRIUM_DRE_LINES.find(l => l.name.includes('CUSTOS'));
    expect(custoLine?.orcado).toBeCloseTo(25705359.47, 2);

    const resultadoOpLine = ATRIUM_DRE_LINES.find(l => l.name === '(=)RESULTADO OPERACIONAL');
    expect(resultadoOpLine?.orcado).toBeCloseTo(23749249.25, 2);
    expect(resultadoOpLine?.realizado).toBeCloseTo(-9259263.35, 2);
  });
});

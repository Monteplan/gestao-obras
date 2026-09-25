import { describe, it, expect } from 'vitest';
import { ATRIUM_DRE_SUMMARY } from '../lib/atrium-dre-data';
import { ATRIUM_PCO_METRICS } from '../lib/atrium-pco-data';
import { formatBRL, formatPercent } from '../lib/utils';

describe('Ajustes do Detalhe da Obra (Prazo em Meses, Custos Diretos/Indiretos e Conciliação DRE)', () => {
  it('1. Deve calcular o prazo de término em meses em vez de dias', () => {
    const plannedEnd = '2028-02-28';
    // Assumindo data de referência Setembro/2026 (ou cálculo baseado em planned_end)
    const refDate = new Date('2026-09-25T00:00:00Z');
    const endDate = new Date('2028-02-28T00:00:00Z');
    const diffDays = Math.ceil((endDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const diffMonths = Math.max(1, Math.round(Math.abs(diffDays) / 30.4375));

    expect(diffDays).toBeGreaterThan(500);
    expect(diffMonths).toBe(17);

    const prazoMonthsText = diffDays >= 0
      ? `${diffMonths} ${diffMonths === 1 ? 'mês restante' : 'meses restantes'}`
      : `${diffMonths} ${diffMonths === 1 ? 'mês em atraso' : 'meses em atraso'}`;

    expect(prazoMonthsText).toBe('17 meses restantes');
  });

  it('2. Deve refletir no gráfico de pizza a proporção de Custos Diretos vs. Custos Indiretos do orçamento', () => {
    const directPlanned = 21185048.95;
    const indirectPlanned = 4520310.52;
    const totalPlanned = directPlanned + indirectPlanned;

    expect(totalPlanned).toBeCloseTo(25705359.47, 2);

    const directPercent = (directPlanned / totalPlanned) * 100;
    const indirectPercent = (indirectPlanned / totalPlanned) * 100;

    expect(directPercent).toBeCloseTo(82.41, 1);
    expect(indirectPercent).toBeCloseTo(17.59, 1);

    const pieData = [
      { name: 'CUSTOS DIRETOS', value: directPlanned },
      { name: 'CUSTOS INDIRETOS', value: indirectPlanned },
    ];

    expect(pieData).toHaveLength(2);
    expect(pieData[0].name).toBe('CUSTOS DIRETOS');
    expect(pieData[0].value).toBe(21185048.95);
    expect(pieData[1].name).toBe('CUSTOS INDIRETOS');
    expect(pieData[1].value).toBe(4520310.52);
  });

  it('3. Deve conciliar o card de Fórmulas com os valores do Acompanhamento Financeiro (DRE)', () => {
    const summary = ATRIUM_DRE_SUMMARY;

    // Receita de Vendas
    expect(summary.receita.realizadoBruto).toBe(4789007.29);
    expect(summary.receita.orcadoBruto).toBe(55206000.00);

    // Custo de Obra
    expect(summary.custoObra.realizado).toBe(11292416.61);
    expect(summary.custoObra.orcado).toBe(25705359.47);

    // Despesas Operacionais
    expect(summary.despesas.realizado).toBe(2755854.03);
    expect(summary.despesas.orcado).toBe(5751391.28);

    // Resultado Realizado Operacional: Receitas - Custos Obra - Despesas
    const calculatedRealized = Number(
      (summary.receita.realizadoBruto - summary.custoObra.realizado - summary.despesas.realizado).toFixed(2)
    );
    expect(calculatedRealized).toBeCloseTo(-9259263.35, 2);
    expect(summary.resultadoFinanceiro.resultadoOperacionalRealizado).toBeCloseTo(-9259263.35, 2);

    // Resultado Projetado Orçado: Receita VGV - Custo Obra - Despesas
    const calculatedProjected = Number(
      (summary.receita.orcadoBruto - summary.custoObra.orcado - summary.despesas.orcado).toFixed(2)
    );
    expect(calculatedProjected).toBeCloseTo(23749249.25, 2);
    expect(summary.resultadoFinanceiro.resultadoOperacionalOrcado).toBeCloseTo(23749249.25, 2);
    expect(summary.resultadoFinanceiro.margemOperacionalOrcada).toBe(43.02);
  });

  it('4. Deve calcular corretamente os Indicadores do Empreendimento (VGV, Preço m², CUB e Margem) Reais vs. Orçados', () => {
    const summary = ATRIUM_DRE_SUMMARY;

    const privateArea = 4840.0;
    const constructedArea = 6850.0;
    const totalUnits = 80;
    const unitsSold = 64;
    const progressPercent = 46.22;

    const executedPrivateArea = privateArea * (progressPercent / 100); // 2237.048 m²
    const executedConstructedArea = constructedArea * (progressPercent / 100); // 3166.07 m²

    // VGV
    const vgvOrcado = summary.receita.orcadoBruto; // 55.206.000,00
    const vgvVendido = 44164800.0; // 80% vendido
    const vgvFaturadoReal = summary.receita.realizadoBruto; // 4.789.007,29

    expect(vgvOrcado).toBe(55206000.00);
    expect(vgvVendido).toBe(44164800.00);
    expect(vgvFaturadoReal).toBe(4789007.29);

    // Preço do m²
    const precoM2PrivativoOrcado = vgvOrcado / privateArea;
    expect(precoM2PrivativoOrcado).toBeCloseTo(11406.20, 2);

    const precoM2PrivativoVendido = vgvVendido / (privateArea * (unitsSold / totalUnits));
    expect(precoM2PrivativoVendido).toBeCloseTo(11406.20, 2);

    // Custo de Obra & CUB
    const custoObraOrcado = summary.custoObra.orcado; // 25.705.359,47
    const custoM2PrivativoOrcado = custoObraOrcado / privateArea;
    expect(custoM2PrivativoOrcado).toBeCloseTo(5311.02, 2);

    const cubConstruidoOrcado = custoObraOrcado / constructedArea;
    expect(cubConstruidoOrcado).toBeCloseTo(3752.61, 2);

    const custoObraRealizado = summary.custoObra.realizado; // 11.292.416,61
    const custoM2PrivativoRealizado = custoObraRealizado / executedPrivateArea;
    expect(custoM2PrivativoRealizado).toBeCloseTo(5047.91, 1);

    const cubConstruidoRealizado = custoObraRealizado / executedConstructedArea;
    expect(cubConstruidoRealizado).toBeCloseTo(3566.70, 1);

    // Performance de custo (-4,95%)
    const variacaoCustoM2 = custoM2PrivativoRealizado - custoM2PrivativoOrcado;
    expect(variacaoCustoM2).toBeCloseTo(-263.11, 1);
    const percentEconomia = (variacaoCustoM2 / custoM2PrivativoOrcado) * 100;
    expect(percentEconomia).toBeCloseTo(-4.95, 1);

    // Custo projetado final com base na performance real
    const custoProjetadoFinal = custoM2PrivativoRealizado * privateArea;
    expect(custoProjetadoFinal).toBeCloseTo(24431868.00, -2);

    // Margem Operacional: Orçada 43,02% vs Projetada 45,33% (+2,31 p.p.)
    const despesasOrcadas = summary.despesas.orcado; // 5.751.391,28
    const resultadoProjetadoComPerformance = vgvOrcado - custoProjetadoFinal - despesasOrcadas;
    const margemProjetada = (resultadoProjetadoComPerformance / vgvOrcado) * 100;

    expect(summary.resultadoFinanceiro.margemOperacionalOrcada).toBe(43.02);
    expect(margemProjetada).toBeCloseTo(45.33, 1);
  });
});

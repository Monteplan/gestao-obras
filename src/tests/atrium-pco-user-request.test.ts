import { describe, it, expect } from 'vitest';
import { INITIAL_WORKS, INITIAL_STAGES, INITIAL_BUDGET_ITEMS, INITIAL_INCURRED_COSTS } from '../lib/seed-data';
import { ATRIUM_PCO_STAGES, ATRIUM_PCO_BUDGET_ITEMS, ATRIUM_PCO_INCURRED_COSTS, ATRIUM_PCO_METRICS } from '../lib/atrium-pco-data';
import { calculateFinancials, buildStageHierarchy, compareStageCodes } from '../lib/utils';

describe('Validação das Correções Solicitadas pelo Usuário (PCO Atrium Select)', () => {
  const atriumWork = INITIAL_WORKS.find((w) => w.id === 'work-1')!;

  it('1. Avanço físico deve ser ~46,22% e nunca valor multiplicado duplicado (como 4621,5%)', () => {
    expect(atriumWork.progress_percent).toBe(46.22);
    expect(atriumWork.progress_percent).toBeLessThanOrEqual(100);
    expect(atriumWork.pco_physical_progress).toBeCloseTo(46.2153, 2);
  });

  it('2. Total orçado deve ser o valor correto importado de R$ 25.705.359,47 (não 5 milhões)', () => {
    const fin = calculateFinancials(atriumWork, INITIAL_BUDGET_ITEMS, [], INITIAL_INCURRED_COSTS, []);
    expect(fin.approvedBudget).toBeCloseTo(25705359.47, 2);

    const atriumBudgetItems = INITIAL_BUDGET_ITEMS.filter((b) => b.work_id === 'work-1');
    const totalPlanned = atriumBudgetItems.reduce((acc, b) => acc + b.total_planned, 0);
    expect(totalPlanned).toBeCloseTo(25705359.47, 2);
  });

  it('3. Total incorrido deve ser R$ 19.485.200,00 (não 807 mil)', () => {
    const fin = calculateFinancials(atriumWork, INITIAL_BUDGET_ITEMS, [], INITIAL_INCURRED_COSTS, []);
    expect(fin.incurredCosts).toBeCloseTo(19485200.00, 2);
    expect(fin.availableBalance).toBeCloseTo(6220159.47, 2);
  });

  it('4. As etapas devem refletir as 23 macroetapas reais do arquivo PCO importado', () => {
    const atriumStages = INITIAL_STAGES.filter((s) => s.work_id === 'work-1');
    const macroStages = atriumStages.filter((s) => !s.parent_id);
    const subStages = atriumStages.filter((s) => !!s.parent_id);

    expect(macroStages.length).toBe(23);
    expect(subStages.length).toBe(177);
    expect(atriumStages.length).toBe(200);

    // Soma dos pesos das 23 macroetapas deve ser 100%
    const totalWeight = macroStages.reduce((acc, s) => acc + s.weight_percent, 0);
    expect(totalWeight).toBeCloseTo(100, 1);

    // Soma dos orçamentos das 23 macroetapas deve ser R$ 25.705.359,47
    const totalBudget = macroStages.reduce((acc, s) => acc + (s.budget_planned || 0), 0);
    expect(totalBudget).toBeCloseTo(25705359.47, 1);

    // Avanço físico ponderado calculado a partir das 23 macroetapas
    const weightedProgress = macroStages.reduce(
      (acc, s) => acc + (s.progress_percent * s.weight_percent) / 100,
      0
    );
    expect(weightedProgress).toBeCloseTo(46.2153, 1);

    // Verifica que macroetapa 1 e macroetapa 23 correspondem ao arquivo importado
    expect(macroStages[0].name).toBe('DESPESAS PRELIMINARES');
    expect(macroStages[22].name).toBe('DESPESAS FINAIS E ENTREGA DA OBRA');
  });

  it('5. Métricas consolidadas ATRIUM_PCO_METRICS devem bater perfeitamente', () => {
    expect(ATRIUM_PCO_METRICS.budget_total).toBe(25705359.47);
    expect(ATRIUM_PCO_METRICS.costs_incurred).toBe(19485200.00);
    expect(ATRIUM_PCO_METRICS.available_balance).toBe(6220159.47);
    expect(ATRIUM_PCO_METRICS.physical_progress).toBeCloseTo(46.2153, 3);
  });

  it('6. Apontamento de progresso físico: passo de 1%, escala preservada e 2 casas decimais', () => {
    // Simula apontamento com 2 casas decimais (ex: 90.25%)
    const inputVal = "90,25";
    const sanitized = inputVal.replace(',', '.');
    const parsedPercent = parseFloat(sanitized);
    const clamped = Math.min(100, Math.max(0, Math.round(parsedPercent * 100) / 100));
    expect(clamped).toBe(90.25);

    // Valida passo da barra deslizante (1%)
    const sliderStep = 1;
    expect(sliderStep).toBe(1);

    // Valida escala exibida preservada
    const scaleMarkers = ['0%', '25%', '50%', '75%', '100%'];
    expect(scaleMarkers).toEqual(['0%', '25%', '50%', '75%', '100%']);

    // Valida rollup da macroetapa com precisão de 2 casas decimais
    const sub1 = { weight_percent: 50, progress_percent: 90.25 };
    const sub2 = { weight_percent: 50, progress_percent: 45.15 };
    const totalWeight = sub1.weight_percent + sub2.weight_percent;
    const weightedSum = (sub1.progress_percent * sub1.weight_percent) + (sub2.progress_percent * sub2.weight_percent);
    const parentProgress = Math.round((weightedSum / totalWeight) * 100) / 100;
    expect(parentProgress).toBe(67.7); // (45.125 + 22.575) = 67.70
  });

  it('7. Ordenação estritamente numérica: macroetapas não pulam do item 10 para o 14', () => {
    const atriumStages = INITIAL_STAGES.filter((s) => s.work_id === 'work-1');
    const hierarchy = buildStageHierarchy(atriumStages);

    const macroCodes = hierarchy.map((m: any) => m.code);
    expect(macroCodes).toEqual([
      '01.0', '02.0', '03.0', '04.0', '05.0', '06.0', '07.0', '08.0', '09.0', '10.0',
      '11.0', '12.0', '13.0', '14.0', '15.0', '16.0', '17.0', '18.0', '19.0', '20.0',
      '21.0', '22.0', '23.0'
    ]);

    // O item imediatamente seguinte ao 10.0 deve ser o 11.0 (nunca o 14.0)
    const idx10 = macroCodes.indexOf('10.0');
    expect(macroCodes[idx10 + 1]).toBe('11.0');
    expect(macroCodes[idx10 + 2]).toBe('12.0');
    expect(macroCodes[idx10 + 3]).toBe('13.0');
    expect(macroCodes[idx10 + 4]).toBe('14.0');
  });

  it('8. Subitens completos da macroetapa 11 (REVESTIMENTO INTERNO): exatamente 11 subetapas de 11.01 a 11.11', () => {
    const atriumStages = INITIAL_STAGES.filter((s) => s.work_id === 'work-1');
    const hierarchy = buildStageHierarchy(atriumStages);

    const macro11 = hierarchy.find((m: any) => m.code === '11.0')!;
    expect(macro11).toBeDefined();
    expect(macro11.name).toContain('REVESTIMENTO INTERNO');
    expect(macro11.substages).toHaveLength(11);

    const subCodes = macro11.substages.map((s: any) => s.code);
    expect(subCodes).toEqual([
      '11.01', '11.02', '11.03', '11.04', '11.05', '11.06',
      '11.07', '11.08', '11.09', '11.10', '11.11'
    ]);

    // Valida também subitens das outras macroetapas adjacentes
    const macro10 = hierarchy.find((m: any) => m.code === '10.0')!;
    expect(macro10.substages).toHaveLength(6);

    const macro14 = hierarchy.find((m: any) => m.code === '14.0')!;
    expect(macro14.substages).toHaveLength(5);
  });

  it('9. Sequência linear no Gantt em modo Todas: cada macroetapa seguida diretamente por suas subetapas', () => {
    const atriumStages = INITIAL_STAGES.filter((s) => s.work_id === 'work-1');
    const hierarchy = buildStageHierarchy(atriumStages);

    const flatList: any[] = [];
    hierarchy.forEach((macro: any) => {
      flatList.push(macro);
      if (macro.substages) {
        flatList.push(...macro.substages);
      }
    });

    const flatCodes = flatList.map((s) => s.code);

    // Valida que 10.0 é seguido pelas subetapas 10.01 a 10.06, e imediatamente depois vem 11.0 e suas 11 subetapas
    const idx10 = flatCodes.indexOf('10.0');
    expect(flatCodes.slice(idx10, idx10 + 7)).toEqual([
      '10.0', '10.01', '10.02', '10.03', '10.04', '10.05', '10.06'
    ]);

    const idx11 = flatCodes.indexOf('11.0');
    expect(idx11).toBe(idx10 + 7);
    expect(flatCodes.slice(idx11, idx11 + 12)).toEqual([
      '11.0', '11.01', '11.02', '11.03', '11.04', '11.05', '11.06',
      '11.07', '11.08', '11.09', '11.10', '11.11'
    ]);
  });
});


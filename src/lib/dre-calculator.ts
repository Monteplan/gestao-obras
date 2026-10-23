import { DreItem, ATRIUM_DRE_LINES, ATRIUM_DRE_SUMMARY } from './atrium-dre-data';
import { DeParaRule, findDeParaRule } from './atrium-real-data';
import { IncurredCost, Revenue } from '../types';

/**
 * Normaliza o nome da conta para comparação insensível a acentos, maiúsculas e caracteres especiais
 */
export function normalizeAccount(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Motor de Cálculo Dinâmico da DRE
 * Cruza os lançamentos reais do ERP (incurredCosts e revenues) com as regras de De-Para
 * e recalcula todas as 200+ contas analíticas e grupos sintéticos da DRE em tempo real.
 */
export function computeDynamicDre(
  baseLines: DreItem[],
  baseSummary: typeof ATRIUM_DRE_SUMMARY,
  incurredCosts: IncurredCost[],
  revenues: Revenue[],
  customRules: DeParaRule[] = [],
  workId: string = 'work-1'
): {
  lines: DreItem[];
  summary: typeof ATRIUM_DRE_SUMMARY;
  hasDynamicData: boolean;
  totalCosts: number;
  totalRevenues: number;
} {
  // Filtra para a obra ativa (ou work-1 por compatibilidade)
  const workCosts = incurredCosts.filter(
    (c) => !c.work_id || c.work_id === workId || c.work_id === 'work-1'
  );
  const workRevenues = revenues.filter(
    (r) => !r.work_id || r.work_id === workId || r.work_id === 'work-1'
  );

  if (workCosts.length === 0 && workRevenues.length === 0) {
    return {
      lines: baseLines,
      summary: baseSummary,
      hasDynamicData: false,
      totalCosts: baseSummary.custoObra.realizado,
      totalRevenues: baseSummary.receita.realizadoBruto,
    };
  }

  // 1. Mapeia e acumula valores reais por conta ajustada (De-Para)
  const amountMap = new Map<string, number>();
  let totalCostsSum = 0;
  let totalRevenuesSum = 0;

  // Acumula Custos e Despesas
  workCosts.forEach((cost) => {
    const rawAccount = cost.erp_account_code || cost.description || '';
    const rule = findDeParaRule(rawAccount, customRules);
    const targetAccount = rule ? rule.adjustedAccount : rawAccount;
    const key = normalizeAccount(targetAccount);
    const val = Number(cost.net_value || cost.gross_value || 0);

    totalCostsSum += val;
    amountMap.set(key, (amountMap.get(key) || 0) + val);
  });

  // Acumula Receitas
  workRevenues.forEach((rev) => {
    const val = Number(rev.recognized_value || rev.contracted_value || 0);
    const desc = (rev.description || '').toLowerCase();
    totalRevenuesSum += val;

    let targetAccount = 'RECEITA DE VENDAS DE IMÓVEIS';
    if (desc.includes('juros') || desc.includes('multa') || desc.includes('rendimento')) {
      targetAccount = 'OUTRAS RECEITAS NÃO OPERACIONAIS';
    }
    const key = normalizeAccount(targetAccount);
    amountMap.set(key, (amountMap.get(key) || 0) + val);
  });

  // 2. Clona e atualiza todas as contas analíticas (folhas)
  const updatedLines: DreItem[] = baseLines.map((line) => {
    const cloned = { ...line };
    if (!cloned.isGroup && !cloned.isTotal) {
      const lineKey = normalizeAccount(cloned.name);
      const realVal = amountMap.get(lineKey) || 0;
      cloned.realizado = realVal;
      cloned.variacao = realVal - cloned.orcado;
      cloned.percentRealizado =
        cloned.orcado > 0 ? (realVal / cloned.orcado) * 100 : realVal > 0 ? 100 : 0;
    }
    return cloned;
  });

  // 3. Recalcula Subgrupos (Nível 2) somando as contas analíticas filhas
  updatedLines
    .filter((l) => l.isGroup && l.level === 2)
    .forEach((group) => {
      const gNorm = normalizeAccount(group.name);
      const children = updatedLines.filter(
        (l) => !l.isGroup && normalizeAccount(l.subgroup) === gNorm
      );
      const sumRealizado = children.reduce((s, c) => s + (c.realizado || 0), 0);
      group.realizado = sumRealizado;
      group.variacao = sumRealizado - group.orcado;
      group.percentRealizado =
        group.orcado > 0 ? (sumRealizado / group.orcado) * 100 : sumRealizado > 0 ? 100 : 0;
    });

  // 4. Recalcula Grupos Mestres (Nível 1) somando os subgrupos de nível 2
  updatedLines
    .filter((l) => l.isGroup && l.level === 1)
    .forEach((master) => {
      const level2Children = updatedLines.filter(
        (l) => l.isGroup && l.level === 2 && l.category === master.category
      );
      const sumRealizado = level2Children.reduce((s, c) => s + (c.realizado || 0), 0);
      master.realizado = sumRealizado;
      master.variacao = sumRealizado - master.orcado;
      master.percentRealizado =
        master.orcado > 0 ? (sumRealizado / master.orcado) * 100 : sumRealizado > 0 ? 100 : 0;
    });

  // 5. Linhas de Totais e Indicadores Chave
  const recLine = updatedLines.find((l) => l.name === 'RECEITAS');
  const dedLine = updatedLines.find((l) => l.name === 'DEDUÇÕES DA RECEITA');
  const custoObraLine = updatedLines.find((l) => l.name.includes('CUSTOS (ORÇAMENTO'));
  const despLine = updatedLines.find((l) => l.name === 'DESPESAS');
  const recFinLine = updatedLines.find((l) => l.name === 'RECEITAS FINANCEIRAS');

  const recVal = recLine ? recLine.realizado : totalRevenuesSum;
  const dedVal = dedLine ? dedLine.realizado : baseSummary.receita.deducoesRealizado;
  const recLiquida = recVal - dedVal;
  const custoObraVal = custoObraLine ? custoObraLine.realizado : baseSummary.custoObra.realizado;
  const despVal = despLine ? despLine.realizado : baseSummary.despesas.realizado;
  const recFinVal = recFinLine ? recFinLine.realizado : 0;

  const resultadoOperacional = recLiquida - custoObraVal - despVal;
  const resultadoLiquido = resultadoOperacional + recFinVal;

  // Atualiza linhas totais no grid
  updatedLines.forEach((l) => {
    if (l.name === '(=) RECEITA LÍQUIDA') {
      l.realizado = recLiquida;
      l.variacao = recLiquida - l.orcado;
      l.percentRealizado = l.orcado > 0 ? (recLiquida / l.orcado) * 100 : 0;
    } else if (l.name === '(=)RESULTADO OPERACIONAL' || l.name === 'RESULTADO OPERACIONAL') {
      l.realizado = resultadoOperacional;
      l.variacao = resultadoOperacional - l.orcado;
      l.percentRealizado = l.orcado > 0 ? (resultadoOperacional / l.orcado) * 100 : 0;
    } else if (l.name === '(=) RESULTADO LÍQUIDO' || l.name === 'RESULTADO LÍQUIDO') {
      l.realizado = resultadoLiquido;
      l.variacao = resultadoLiquido - l.orcado;
      l.percentRealizado = l.orcado > 0 ? (resultadoLiquido / l.orcado) * 100 : 0;
    }
  });

  // 6. Recalcula o Summary dos Cards do Topo
  const matServLine = updatedLines.find(
    (l) => l.name === 'MATERIAIS E SERVIÇOS DE EXECUÇÃO DE OBRA'
  );
  const maoDeObraLine = updatedLines.find((l) => l.name === 'CUSTO COM MÃO DE OBRA');
  const admObraLine = updatedLines.find((l) => l.name === 'CUSTOS ADMINISTRATIVO DE OBRA');
  const terrenosLine = updatedLines.find(
    (l) => l.name === 'CUSTOS COM TERRENOS E LEGALIZAÇÕES'
  );

  const comissoesLine = updatedLines.find(
    (l) => l.name === 'DESPESAS VARIÁVEIS COM VENDAS'
  );
  const mktLine = updatedLines.find((l) => l.name === 'DESPESAS COMERCIAIS E MARKETING');
  const admSedeLine = updatedLines.find((l) => l.name === 'DESPESAS ADMINISTRATIVAS');

  const updatedSummary = {
    ...baseSummary,
    receita: {
      ...baseSummary.receita,
      realizadoBruto: recVal,
      variacaoBruta: recVal - baseSummary.receita.orcadoBruto,
      percentBruto: (recVal / baseSummary.receita.orcadoBruto) * 100,
      deducoesRealizado: dedVal,
      liquidaRealizado: recLiquida,
      liquidaPercent: (recLiquida / baseSummary.receita.liquidaOrcado) * 100,
    },
    custoObra: {
      ...baseSummary.custoObra,
      realizado: custoObraVal,
      variacao: custoObraVal - baseSummary.custoObra.orcado,
      percent: (custoObraVal / baseSummary.custoObra.orcado) * 100,
      materiaisServicos: {
        ...baseSummary.custoObra.materiaisServicos,
        realizado: matServLine ? matServLine.realizado : baseSummary.custoObra.materiaisServicos.realizado,
        percent: matServLine && baseSummary.custoObra.materiaisServicos.orcado > 0
          ? (matServLine.realizado / baseSummary.custoObra.materiaisServicos.orcado) * 100
          : 0,
      },
      maoDeObra: {
        ...baseSummary.custoObra.maoDeObra,
        realizado: maoDeObraLine ? maoDeObraLine.realizado : baseSummary.custoObra.maoDeObra.realizado,
        percent: maoDeObraLine && baseSummary.custoObra.maoDeObra.orcado > 0
          ? (maoDeObraLine.realizado / baseSummary.custoObra.maoDeObra.orcado) * 100
          : 0,
      },
      admObra: {
        ...baseSummary.custoObra.admObra,
        realizado: admObraLine ? admObraLine.realizado : baseSummary.custoObra.admObra.realizado,
        percent: admObraLine && baseSummary.custoObra.admObra.orcado > 0
          ? (admObraLine.realizado / baseSummary.custoObra.admObra.orcado) * 100
          : 0,
      },
      terrenosLegalizacoes: {
        ...baseSummary.custoObra.terrenosLegalizacoes,
        realizado: terrenosLine ? terrenosLine.realizado : baseSummary.custoObra.terrenosLegalizacoes.realizado,
        percent: terrenosLine && baseSummary.custoObra.terrenosLegalizacoes.orcado > 0
          ? (terrenosLine.realizado / baseSummary.custoObra.terrenosLegalizacoes.orcado) * 100
          : 0,
      },
    },
    despesas: {
      ...baseSummary.despesas,
      realizado: despVal,
      variacao: despVal - baseSummary.despesas.orcado,
      percent: (despVal / baseSummary.despesas.orcado) * 100,
      impostosReceita: {
        ...baseSummary.despesas.impostosReceita,
        realizado: dedVal,
        percent: (dedVal / baseSummary.despesas.impostosReceita.orcado) * 100,
      },
      comissoesVendas: {
        ...baseSummary.despesas.comissoesVendas,
        realizado: comissoesLine ? comissoesLine.realizado : baseSummary.despesas.comissoesVendas.realizado,
        percent: comissoesLine && baseSummary.despesas.comissoesVendas.orcado > 0
          ? (comissoesLine.realizado / baseSummary.despesas.comissoesVendas.orcado) * 100
          : 0,
      },
      comerciaisMkt: {
        ...baseSummary.despesas.comerciaisMkt,
        realizado: mktLine ? mktLine.realizado : baseSummary.despesas.comerciaisMkt.realizado,
        percent: mktLine && baseSummary.despesas.comerciaisMkt.orcado > 0
          ? (mktLine.realizado / baseSummary.despesas.comerciaisMkt.orcado) * 100
          : 0,
      },
      administrativasSede: {
        ...baseSummary.despesas.administrativasSede,
        realizado: admSedeLine ? admSedeLine.realizado : baseSummary.despesas.administrativasSede.realizado,
        percent: admSedeLine && baseSummary.despesas.administrativasSede.orcado > 0
          ? (admSedeLine.realizado / baseSummary.despesas.administrativasSede.orcado) * 100
          : 0,
      },
    },
    resultadoFinanceiro: {
      ...baseSummary.resultadoFinanceiro,
      resultadoOperacionalRealizado: resultadoOperacional,
      margemOperacionalRealizada: recLiquida > 0 ? (resultadoOperacional / recLiquida) * 100 : 0,
    },
  };

  return {
    lines: updatedLines,
    summary: updatedSummary,
    hasDynamicData: true,
    totalCosts: totalCostsSum,
    totalRevenues: totalRevenuesSum,
  };
}

import { DreItem, ATRIUM_DRE_LINES, ATRIUM_DRE_SUMMARY } from './atrium-dre-data';
import { DeParaRule, findDeParaRule } from './atrium-real-data';
import { ATRIUM_PCO_STAGES } from './atrium-pco-data';
import { ATRIUM_BASE_ORCAMENTO_ITEMS } from './atrium-base-orcamento';
import { calculateWeightedProgress } from './utils';
import { IncurredCost, Revenue, Stage } from '../types';

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
 * Dicionário de Aliases entre Contas da DRE e Etapas da EAP
 * Mapeia as 47 contas do orçamento da obra para os nomes correspondentes na EAP (23 macroetapas)
 */
const ACCOUNT_STAGE_ALIASES: Record<string, string> = {
  [normalizeAccount('ESTRUTURA DE CONCRETO')]: normalizeAccount('ESTRUTURA'),
  [normalizeAccount('ALVENARIA E PAINÉIS')]: normalizeAccount('ALVENARIA'),
  [normalizeAccount('ESQUADRIAS DE ALUMÍNIO')]: normalizeAccount('ESQUADRIAS METÁLICAS'),
  [normalizeAccount('ESQUADRIAS DE FERRO(PORTÕES,GRADES ETC.)')]: normalizeAccount('ESQUADRIAS METÁLICAS'),
  [normalizeAccount('PISOS(MAT+M.O.)')]: normalizeAccount('PAVIMENTAÇÃO'),
  [normalizeAccount('IMPERMEABILIZAÇÃO(MAT+M.O.)')]: normalizeAccount('IMPERMEABILIZAÇÃO'),
  [normalizeAccount('COBERTA')]: normalizeAccount('IMPERMEABILIZAÇÃO'),
  [normalizeAccount('INSTALAÇÕES ELÉTRICAS(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÕES HIDROSSANITÁRIAS(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÕES INCÊNDIO(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÕES DE GÁS(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÕES TELEFÔNICAS(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÕES MECÂNICAS(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÃO DE AR CONDICIONADO(MAT+M.O.)')]: normalizeAccount('INSTALAÇÕES'),
  [normalizeAccount('INSTALAÇÃO DO CANTEIRO')]: normalizeAccount('INSTALAÇÕES DE OBRA'),
  [normalizeAccount('TERRAPLANAGEM')]: normalizeAccount('MOVIMENTO DE TERRA'),
  [normalizeAccount('DESMATAMENTO/DEMOLIÇÃO')]: normalizeAccount('MOVIMENTO DE TERRA'),
  [normalizeAccount('SONDAGEM E TOPOGRAFIA')]: normalizeAccount('DESPESAS PRELIMINARES'),
  [normalizeAccount('PROJETOS(ARQ./INST./ESTRUTURAL ETC)')]: normalizeAccount('DESPESAS PRELIMINARES'),
  [normalizeAccount('ALVARAS E LICENÇAS - OBRA')]: normalizeAccount('DESPESAS PRELIMINARES'),
  [normalizeAccount('LICENÇAS E LEGALIZAÇÕES')]: normalizeAccount('DESPESAS PRELIMINARES'),
  [normalizeAccount('CONTROLE TECNOLÓGICO')]: normalizeAccount('DESPESAS GERAIS'),
  [normalizeAccount('SERVIÇO DE SEGURANÇA DE CANTEIRO')]: normalizeAccount('ADMINISTRAÇÃO DE OBRA'),
  [normalizeAccount('LIMPEZA DE OBRA')]: normalizeAccount('DESPESAS PRELIMINARES'),
  [normalizeAccount('PINTURA (MAT+M.O.)')]: normalizeAccount('PINTURA'),
  [normalizeAccount('FORROS')]: normalizeAccount('REVESTIMENTO INTERNO'),
  [normalizeAccount('PEITORIS, SOLEIRAS E CHAPIM')]: normalizeAccount('PEITORIS, SOLEIRAS E CHAPIM'),
};

export interface MeasuredSummary {
  globalProgressPercent: number;
  receita: {
    orcadoMedido: number;
    realizadoBruto: number;
    variacaoMedido: number;
    percentDesempenho: number;
  };
  custoObra: {
    orcadoMedido: number;
    realizado: number;
    variacaoMedido: number;
    percentDesempenho: number;
  };
  despesas: {
    orcadoMedido: number;
    realizado: number;
    variacaoMedido: number;
    percentDesempenho: number;
  };
  resultadoFinanceiro: {
    resultadoOperacionalMedido: number;
    resultadoOperacionalRealizado: number;
    desvioOperacionalFase: number;
    statusFase: 'economia' | 'estouro';
  };
}

/**
 * Motor de Cálculo Dinâmico da DRE com Suporte a Dupla Visão:
 * 1. Visão Orçamento Total (100% da vida da obra) vs Realizado
 * 2. Visão Orçado até a Medição Atual (Avanço Físico EAP) vs Realizado
 */
export function computeDynamicDre(
  baseLines: DreItem[],
  baseSummary: typeof ATRIUM_DRE_SUMMARY,
  incurredCosts: IncurredCost[],
  revenues: Revenue[],
  customRules: DeParaRule[] = [],
  workId: string = 'work-1',
  stages: Stage[] = []
): {
  lines: DreItem[];
  summary: typeof ATRIUM_DRE_SUMMARY;
  measuredSummary: MeasuredSummary;
  hasDynamicData: boolean;
  totalCosts: number;
  totalRevenues: number;
  globalProgressPercent: number;
} {
  // Filtra para a obra ativa (ou work-1 por compatibilidade)
  const workCosts = incurredCosts.filter(
    (c) => !c.work_id || c.work_id === workId || c.work_id === 'work-1'
  );
  const workRevenues = revenues.filter(
    (r) => !r.work_id || r.work_id === workId || r.work_id === 'work-1'
  );

  // Determina as etapas ativas e calcula o avanço físico ponderado da obra
  const effectiveStages =
    stages && stages.length > 0
      ? stages.filter((s) => !s.work_id || s.work_id === workId || s.work_id === 'work-1')
      : ATRIUM_PCO_STAGES;

  const globalProgress = calculateWeightedProgress(effectiveStages) || 46.22;

  // Mapa de avanço medido das etapas
  const stageProgressMap = new Map<string, number>();
  effectiveStages.forEach((s) => {
    stageProgressMap.set(normalizeAccount(s.name), s.progress_percent || 0);
    if (s.code) {
      stageProgressMap.set(s.code, s.progress_percent || 0);
    }
  });

  // 1º DE-PARA OFICIAL: BASE ORÇAMENTO (298 itens) -> CONTAS FINANCEIRAS / ERP
  // Cada item do orçamento da obra já possui a sua respectiva conta financeira (erpAccount)
  // e o seu grupo construtivo da EAP (stageGroup) e código de subetapa (code)
  const baseOrcamentoByAccount = new Map<string, { totalBudget: number; measuredBudget: number }>();

  ATRIUM_BASE_ORCAMENTO_ITEMS.forEach((it) => {
    const normSub = normalizeAccount(it.substageName);
    const normGroup = normalizeAccount(it.stageGroup);
    const macroCode = it.code ? it.code.split('.')[0] + '.0' : '';

    // Prioriza SEMPRE o apontamento analítico da subetapa específica apontada na EAP ou na base oficial
    // Se o item tem medição analítica própria (confrontar.xlsx), respeita ela estritamente (inclusive 0%)
    let progress: number;
    let itemMeasured: number;

    if (it.measuredPercent !== undefined) {
      progress = it.measuredPercent;
      itemMeasured =
        it.measuredAmount !== undefined
          ? it.measuredAmount
          : (it.budgetAmount || 0) * (progress / 100);
    } else {
      progress =
        (it.code ? stageProgressMap.get(it.code) : undefined) ??
        stageProgressMap.get(normSub) ??
        (macroCode ? stageProgressMap.get(macroCode) : undefined) ??
        stageProgressMap.get(normGroup) ??
        globalProgress;
      itemMeasured = (it.budgetAmount || 0) * (progress / 100);
    }

    const normAcc = normalizeAccount(it.erpAccount);
    const prev = baseOrcamentoByAccount.get(normAcc) || { totalBudget: 0, measuredBudget: 0 };
    prev.totalBudget += it.budgetAmount || 0;
    prev.measuredBudget += itemMeasured;
    baseOrcamentoByAccount.set(normAcc, prev);
  });

  const getLineMeasuredData = (lineName: string, category: string, orcadoTotal: number): { percent: number; medido: number } => {
    const norm = normalizeAccount(lineName);

    // 1º De-Para Oficial: Se a conta financeira está vinculada às subetapas/etapas da BASE ORÇAMENTO
    if (baseOrcamentoByAccount.has(norm)) {
      const baseInfo = baseOrcamentoByAccount.get(norm)!;
      if (baseInfo.totalBudget > 0) {
        const pct = (baseInfo.measuredBudget / baseInfo.totalBudget) * 100;
        return {
          percent: pct,
          medido: baseInfo.measuredBudget,
        };
      }
      return { percent: 0, medido: 0 };
    }

    // Se houver alias direto para etapa da EAP
    const mappedKey = ACCOUNT_STAGE_ALIASES[norm] || norm;
    if (stageProgressMap.has(mappedKey)) {
      const pct = stageProgressMap.get(mappedKey)!;
      return {
        percent: pct,
        medido: orcadoTotal * (pct / 100),
      };
    }

    // Para itens Extra-Obra (Receitas, Deduções, Despesas Gerais e Comerciais)
    return {
      percent: globalProgress,
      medido: orcadoTotal * (globalProgress / 100),
    };
  };

  const hasDynamicData = workCosts.length > 0 || workRevenues.length > 0;

  // 1. Mapeia e acumula valores reais por conta ajustada (De-Para)
  const amountMap = new Map<string, number>();
  let totalCostsSum = 0;
  let totalRevenuesSum = 0;

  if (hasDynamicData) {
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
  }

  // 2. Clona e atualiza todas as contas analíticas (folhas) com ambas as visões
  const updatedLines: DreItem[] = baseLines.map((line) => {
    const cloned = { ...line };
    const measuredData = getLineMeasuredData(cloned.name, cloned.category, cloned.orcado);
    const measuredPercent = measuredData.percent;
    const orcadoMedido = measuredData.medido;

    if (!cloned.isGroup && !cloned.isTotal) {
      const lineKey = normalizeAccount(cloned.name);
      const realVal = hasDynamicData ? amountMap.get(lineKey) || 0 : cloned.realizado;
      
      cloned.realizado = realVal;
      cloned.variacao = realVal - cloned.orcado;
      cloned.percentRealizado =
        cloned.orcado > 0 ? (realVal / cloned.orcado) * 100 : realVal > 0 ? 100 : 0;

      // Métricas da Visão de Medição EAP
      cloned.measuredPercent = measuredPercent;
      cloned.orcadoMedido = orcadoMedido;
      cloned.variacaoMedido = realVal - orcadoMedido;
      cloned.percentDesempenhoMedido =
        orcadoMedido > 0 ? (realVal / orcadoMedido) * 100 : realVal > 0 ? 100 : 0;
    } else {
      cloned.measuredPercent = measuredPercent;
      cloned.orcadoMedido = orcadoMedido;
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
      const sumOrcadoMedido = children.reduce((s, c) => s + (c.orcadoMedido || 0), 0);

      group.realizado = sumRealizado;
      group.variacao = sumRealizado - group.orcado;
      group.percentRealizado =
        group.orcado > 0 ? (sumRealizado / group.orcado) * 100 : sumRealizado > 0 ? 100 : 0;

      group.orcadoMedido = sumOrcadoMedido;
      group.variacaoMedido = sumRealizado - sumOrcadoMedido;
      group.percentDesempenhoMedido =
        sumOrcadoMedido > 0 ? (sumRealizado / sumOrcadoMedido) * 100 : sumRealizado > 0 ? 100 : 0;
      group.measuredPercent =
        group.orcado > 0 ? (sumOrcadoMedido / group.orcado) * 100 : globalProgress;
    });

  // 4. Recalcula Grupos Mestres (Nível 1) somando todas as contas filhas analíticas
  const l1Indices: number[] = [];
  updatedLines.forEach((l, idx) => {
    if (l.level === 1) {
      l1Indices.push(idx);
    }
  });

  l1Indices.forEach((startIdx, i) => {
    const master = updatedLines[startIdx];
    if (!master.isGroup) return; // Totais são calculados no passo 5

    const nextIdx = l1Indices[i + 1] ?? updatedLines.length;
    const slice = updatedLines.slice(startIdx + 1, nextIdx);
    const leafItems = slice.filter((l) => !l.isGroup && !l.isTotal);

    if (leafItems.length > 0) {
      const sumRealizado = leafItems.reduce((s, c) => s + (c.realizado || 0), 0);
      const sumOrcadoMedido = leafItems.reduce((s, c) => s + (c.orcadoMedido || 0), 0);
      const sumOrcado = leafItems.reduce((s, c) => s + (c.orcado || 0), 0);

      master.realizado = sumRealizado;
      if (master.orcado === 0 && sumOrcado > 0) {
        master.orcado = sumOrcado;
      }
      master.variacao = sumRealizado - master.orcado;
      master.percentRealizado =
        master.orcado > 0 ? (sumRealizado / master.orcado) * 100 : sumRealizado > 0 ? 100 : 0;

      master.orcadoMedido = sumOrcadoMedido;
      master.variacaoMedido = sumRealizado - sumOrcadoMedido;
      master.percentDesempenhoMedido =
        sumOrcadoMedido > 0 ? (sumRealizado / sumOrcadoMedido) * 100 : sumRealizado > 0 ? 100 : 0;
      master.measuredPercent =
        master.orcado > 0 ? (sumOrcadoMedido / master.orcado) * 100 : globalProgress;
    }
  });

  // 5. Linhas de Totais e Indicadores Chave
  const recLine = updatedLines.find((l) => l.name === 'RECEITAS');
  const dedLine = updatedLines.find((l) => l.name === 'DEDUÇÕES DA RECEITA');
  const custoObraLine = updatedLines.find((l) => l.name.includes('CUSTOS (ORÇAMENTO'));
  const despLine = updatedLines.find((l) => l.name === 'DESPESAS');
  const recFinLine = updatedLines.find((l) => l.name === 'RECEITAS FINANCEIRAS');
  const despNaoOpLine = updatedLines.find((l) => l.name.includes('DESPESAS NÃO OPERACIONAIS'));
  const investLine = updatedLines.find((l) => l.name.includes('INVESTIMENTOS - IMOBILIZADO'));
  const empLine = updatedLines.find((l) => l.name === 'EMPRESTIMOS');
  const movCapLine = updatedLines.find((l) => l.name === 'MOVIMENTAÇÃO DE CAPITAL');

  // 1. Receita Líquida
  const recVal = recLine ? recLine.realizado : (hasDynamicData ? totalRevenuesSum : baseSummary.receita.realizadoBruto);
  const dedVal = dedLine ? dedLine.realizado : baseSummary.receita.deducoesRealizado;
  const custoObraVal = custoObraLine ? custoObraLine.realizado : baseSummary.custoObra.realizado;
  const despVal = despLine ? despLine.realizado : baseSummary.despesas.realizado;
  const recLiquida = recVal - dedVal;

  const recLiquidaReal = (recLine?.realizado || 0) - (dedLine?.realizado || 0);
  const recLiquidaOrc = (recLine?.orcado || 0) - (dedLine?.orcado || 0);
  const recLiquidaMed = (recLine?.orcadoMedido || 0) - (dedLine?.orcadoMedido || 0);

  // 2. Resultado Operacional = Receita Líquida - Custo Obra - Despesas
  const resOpReal = recLiquidaReal - (custoObraLine?.realizado || 0) - (despLine?.realizado || 0);
  const resOpOrc = recLiquidaOrc - (custoObraLine?.orcado || 0) - (despLine?.orcado || 0);
  const resOpMed = recLiquidaMed - (custoObraLine?.orcadoMedido || 0) - (despLine?.orcadoMedido || 0);

  // 3. Resultado Não Operacional = Receitas Financeiras - Despesas Não Operacionais
  const resNaoOpReal = (recFinLine?.realizado || 0) - (despNaoOpLine?.realizado || 0);
  const resNaoOpOrc = (recFinLine?.orcado || 0) - (despNaoOpLine?.orcado || 0);
  const resNaoOpMed = (recFinLine?.orcadoMedido || 0) - (despNaoOpLine?.orcadoMedido || 0);

  // 4. Resultado de Investimento = - Investimentos
  const resInvestReal = -(investLine?.realizado || 0);
  const resInvestOrc = -(investLine?.orcado || 0);
  const resInvestMed = -(investLine?.orcadoMedido || 0);

  // 5. Resultado Financiamentos = Empréstimos + Movimentação de Capital
  const resFinReal = (empLine?.realizado || 0) + (movCapLine?.realizado || 0);
  const resFinOrc = (empLine?.orcado || 0) + (movCapLine?.orcado || 0);
  const resFinMed = (empLine?.orcadoMedido || 0) + (movCapLine?.orcadoMedido || 0);

  // 6. Resultado Mensal / Líquido = Resultado Operacional + Resultado Não Operacional + Investimentos + Financiamentos
  const resMensalReal = resOpReal + resNaoOpReal + resInvestReal + resFinReal;
  const resMensalOrc = resOpOrc + resNaoOpOrc + resInvestOrc + resFinOrc;
  const resMensalMed = resOpMed + resNaoOpMed + resInvestMed + resFinMed;

  const setTotalLineValues = (matcher: (name: string) => boolean, real: number, orc: number, med: number) => {
    const line = updatedLines.find((l) => matcher(l.name));
    if (line) {
      line.realizado = real;
      if (orc !== 0 || line.orcado === 0) {
        line.orcado = orc;
      }
      line.variacao = real - line.orcado;
      line.percentRealizado = line.orcado !== 0 ? (real / line.orcado) * 100 : 0;
      line.orcadoMedido = med;
      line.variacaoMedido = real - med;
      line.percentDesempenhoMedido = med !== 0 ? (real / med) * 100 : 0;
      line.measuredPercent = line.orcado !== 0 ? (med / line.orcado) * 100 : globalProgress;
    }
  };

  setTotalLineValues((n) => n === '(=) RECEITA LÍQUIDA' || n.includes('RECEITA LÍQUIDA'), recLiquidaReal, recLiquidaOrc, recLiquidaMed);
  setTotalLineValues((n) => n === '(=)RESULTADO OPERACIONAL' || n === 'RESULTADO OPERACIONAL', resOpReal, resOpOrc, resOpMed);
  setTotalLineValues((n) => n.includes('RESULTADO NÃO OPERACIONAL'), resNaoOpReal, resNaoOpOrc, resNaoOpMed);
  setTotalLineValues((n) => n.includes('RESULTADO DE INVESTIMENTO'), resInvestReal, resInvestOrc, resInvestMed);
  setTotalLineValues((n) => n.includes('RESULTADO FINANCIAMENTOS'), resFinReal, resFinOrc, resFinMed);
  setTotalLineValues((n) => n.includes('RESULTADO MENSAL') || n.includes('RESULTADO LÍQUIDO'), resMensalReal, resMensalOrc, resMensalMed);

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
      resultadoOperacionalRealizado: resOpReal,
      margemOperacionalRealizada: recLiquida > 0 ? (resOpReal / recLiquida) * 100 : 0,
    },
  };

  const recMedida = recLine ? recLine.orcadoMedido || 0 : (baseSummary.receita.orcadoBruto * (globalProgress / 100));
  const custoObraMedido = custoObraLine ? custoObraLine.orcadoMedido || 0 : (baseSummary.custoObra.orcado * (globalProgress / 100));
  const despMedido = despLine ? despLine.orcadoMedido || 0 : (baseSummary.despesas.orcado * (globalProgress / 100));

  const measuredSummary: MeasuredSummary = {
    globalProgressPercent: globalProgress,
    receita: {
      orcadoMedido: recMedida,
      realizadoBruto: recVal,
      variacaoMedido: recVal - recMedida,
      percentDesempenho: recMedida > 0 ? (recVal / recMedida) * 100 : 0,
    },
    custoObra: {
      orcadoMedido: custoObraMedido,
      realizado: custoObraVal,
      variacaoMedido: custoObraVal - custoObraMedido,
      percentDesempenho: custoObraMedido > 0 ? (custoObraVal / custoObraMedido) * 100 : 0,
    },
    despesas: {
      orcadoMedido: despMedido,
      realizado: despVal,
      variacaoMedido: despVal - despMedido,
      percentDesempenho: despMedido > 0 ? (despVal / despMedido) * 100 : 0,
    },
    resultadoFinanceiro: {
      resultadoOperacionalMedido: resOpMed,
      resultadoOperacionalRealizado: resOpReal,
      desvioOperacionalFase: resOpReal - resOpMed,
      statusFase: (resOpReal - resOpMed) >= 0 ? 'economia' : 'estouro',
    },
  };

  return {
    lines: updatedLines,
    summary: updatedSummary,
    measuredSummary,
    hasDynamicData,
    totalCosts: totalCostsSum,
    totalRevenues: totalRevenuesSum,
    globalProgressPercent: globalProgress,
  };
}

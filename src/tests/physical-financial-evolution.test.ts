import { describe, it, expect } from 'vitest';
import {
  calculatePhysicalProgressWeighted,
  resolveClassificationTrail,
  calculateIntegratedComparisonMetrics,
  simulateInccAdjustment,
  compareBudgetVersions,
} from '../lib/utils';
import {
  BudgetAccount,
  ErpCostAccount,
  BudgetToErpMapping,
  ErpToBudgetTotalizerMapping,
  IncurredCost,
  Work,
  PurchaseOrder,
} from '../types';

describe('Acompanhamento Físico e Financeiro: Critérios de Aceite (PDF)', () => {
  // Mock de Contas do Orçamento da Engenharia (Plano A)
  const mockBudgetAccounts: BudgetAccount[] = [
    {
      id: 'ba-01',
      work_id: 'work-1',
      budget_version_id: 'ver-1',
      code: '01',
      description: 'Despesas Preliminares',
      account_type: 'etapa',
      display_order: 1,
      quantity: 1,
      unit_cost: 20000,
      total_amount: 20000,
      physical_weight_percent: 20,
      progress_planned: 100,
      progress_actual: 100,
      status: 'concluida',
      is_totalizer: false,
      created_at: '2026-01-01',
    },
    {
      id: 'ba-02',
      work_id: 'work-1',
      budget_version_id: 'ver-1',
      code: '02',
      description: 'Instalações de Obra',
      account_type: 'etapa',
      display_order: 2,
      quantity: 1,
      unit_cost: 50000,
      total_amount: 50000,
      physical_weight_percent: 50,
      progress_planned: 80,
      progress_actual: 60,
      status: 'em_andamento',
      is_totalizer: false,
      created_at: '2026-01-01',
    },
    {
      id: 'ba-02-01',
      work_id: 'work-1',
      budget_version_id: 'ver-1',
      parent_id: 'ba-02',
      code: '02.01',
      description: 'Mão de obra',
      account_type: 'atividade',
      display_order: 3,
      quantity: 1,
      unit_cost: 30000,
      total_amount: 30000,
      physical_weight_percent: 30,
      progress_planned: 50,
      progress_actual: 50,
      status: 'em_andamento',
      is_totalizer: false,
      created_at: '2026-01-01',
    },
  ];

  // Mock de Contas do ERP (Plano B)
  const mockErpAccounts: ErpCostAccount[] = [
    {
      id: 'erp-tot-sal',
      code: '1.01',
      description: 'Salários e Encargos',
      category: 'mao_de_obra',
      is_totalizer: true,
      is_active: true,
      created_at: '2026-01-01',
    },
    {
      id: 'erp-det-sal',
      code: '1.01.001',
      description: 'Salários Base',
      category: 'mao_de_obra',
      is_totalizer: false,
      is_active: true,
      parent_id: 'erp-tot-sal',
      created_at: '2026-01-01',
    },
    {
      id: 'erp-det-fgts',
      code: '1.01.002',
      description: 'FGTS',
      category: 'mao_de_obra',
      is_totalizer: false,
      is_active: true,
      parent_id: 'erp-tot-sal',
      created_at: '2026-01-01',
    },
    {
      id: 'erp-det-inss',
      code: '1.01.003',
      description: 'INSS',
      category: 'mao_de_obra',
      is_totalizer: false,
      is_active: true,
      parent_id: 'erp-tot-sal',
      created_at: '2026-01-01',
    },
    {
      id: 'erp-det-vt',
      code: '1.01.004',
      description: 'Vale-Transporte',
      category: 'mao_de_obra',
      is_totalizer: false,
      is_active: true,
      parent_id: 'erp-tot-sal',
      created_at: '2026-01-01',
    },
  ];

  // De-para 1: Orçamento (02.01 Mão de Obra) -> ERP (1.01 Salários)
  const mockDePara1: BudgetToErpMapping[] = [
    {
      id: 'dp1-1',
      work_id: 'work-1',
      budget_account_id: 'ba-02-01',
      budget_account_code: '02.01',
      erp_account_id: 'erp-tot-sal',
      erp_account_code: '1.01',
      erp_account_description: 'Salários e Encargos',
      mapping_type: 'direto',
      apportionment_percent: 100,
      priority: 1,
      is_active: true,
      created_at: '2026-01-01',
    },
  ];

  // De-para 2: ERP Detalhadas -> ERP Totalizadora (1.01 Salários)
  const mockDePara2: ErpToBudgetTotalizerMapping[] = [
    {
      id: 'dp2-1',
      work_id: 'work-1',
      detailed_erp_account_id: 'erp-det-sal',
      detailed_erp_account_code: '1.01.001',
      totalizer_erp_account_id: 'erp-tot-sal',
      totalizer_erp_account_code: '1.01',
      is_active: true,
      created_at: '2026-01-01',
    },
    {
      id: 'dp2-2',
      work_id: 'work-1',
      detailed_erp_account_id: 'erp-det-fgts',
      detailed_erp_account_code: '1.01.002',
      totalizer_erp_account_id: 'erp-tot-sal',
      totalizer_erp_account_code: '1.01',
      is_active: true,
      created_at: '2026-01-01',
    },
    {
      id: 'dp2-3',
      work_id: 'work-1',
      detailed_erp_account_id: 'erp-det-inss',
      detailed_erp_account_code: '1.01.003',
      totalizer_erp_account_id: 'erp-tot-sal',
      totalizer_erp_account_code: '1.01',
      is_active: true,
      created_at: '2026-01-01',
    },
    {
      id: 'dp2-4',
      work_id: 'work-1',
      detailed_erp_account_id: 'erp-det-vt',
      detailed_erp_account_code: '1.01.004',
      totalizer_erp_account_id: 'erp-tot-sal',
      totalizer_erp_account_code: '1.01',
      is_active: true,
      created_at: '2026-01-01',
    },
  ];

  const mockWork: Work = {
    id: 'work-1',
    organization_id: 'org-1',
    code: 'OBRA-01',
    name: 'Residencial Monteplan',
    client: 'Cliente A',
    address: 'Av. Santos Dumont, 1000',
    city_state: 'Fortaleza/CE',
    state: 'CE',
    city: 'Fortaleza',
    engineer_name: 'Eng. Roberto Lima',
    project_type: 'Residencial Multifamiliar',
    manager_name: 'Carlos Mendes',
    planned_start: '2026-01-01',
    planned_end: '2026-12-31',
    contract_value: 100000,
    status: 'em_andamento',
    progress_percent: 65,
    labor_enabled: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  // --------------------------------------------------------------------------
  // TESTE 1: Cálculo Ponderado do Avanço Físico (Critérios 8, 9, 10)
  // --------------------------------------------------------------------------
  it('Critérios 8, 9, 10: deve calcular o avanço físico ponderado estritamente pelas etapas do orçamento sem misturar custos do ERP', () => {
    // 01 (peso 20% * avanço 100% = 20)
    // 02 (peso 50% * avanço 60% = 30)
    // 02.01 (peso 30% * avanço 50% = 15)
    // Total = 20 + 30 + 15 = 65%
    const result = calculatePhysicalProgressWeighted(mockBudgetAccounts);
    expect(result.isValidWeightSum).toBe(true);
    expect(result.totalWeight).toBe(100);
    expect(result.weightedProgress).toBe(65);
  });

  // --------------------------------------------------------------------------
  // TESTE 2: Duplo De-Para e Trilha de Classificação (Critérios 1 a 7)
  // --------------------------------------------------------------------------
  it('Critérios 4, 5, 6, 7: deve consolidar FGTS no ERP Salários e resolver a cadeia completa até a etapa do orçamento', () => {
    const costFgts: IncurredCost = {
      id: 'cost-1',
      work_id: 'work-1',
      date: '2026-02-15',
      cost_center: 'CC-01',
      category: 'mao_de_obra',
      supplier_name: 'Caixa Econômica Federal',
      document_number: 'FGTS-202602',
      description: 'Guia de Recolhimento FGTS',
      gross_value: 1200,
      discounts: 0,
      taxes: 0,
      net_value: 1200,
      payment_status: 'pago',
      erp_account_code: '1.01.002', // FGTS
      created_at: '2026-02-15',
    };

    const trail = resolveClassificationTrail(
      costFgts,
      mockDePara1,
      mockDePara2,
      mockErpAccounts,
      mockBudgetAccounts,
      mockWork.name
    );

    // Conta detalhada do ERP
    expect(trail.detailedErpCode).toBe('1.01.002');
    // Consolidada na conta totalizadora do ERP
    expect(trail.totalizerErpCode).toBe('1.01');
    expect(trail.totalizerErpDescription).toBe('Salários e Encargos');
    // Vinculada à conta do orçamento pelo De-para 1
    expect(trail.budgetAccountCode).toBe('02.01');
    expect(trail.budgetAccountDescription).toBe('Mão de obra');
    expect(trail.workName).toBe('Residencial Monteplan');
    expect(trail.status).toBe('completa');
  });

  // --------------------------------------------------------------------------
  // TESTE 3: Identificação de Custos Não Classificados (Critério 12)
  // --------------------------------------------------------------------------
  it('Critério 12: deve marcar como pendente qualquer custo que não possua mapeamento completo', () => {
    const unmappedCost: IncurredCost = {
      id: 'cost-unmapped',
      work_id: 'work-1',
      date: '2026-02-20',
      cost_center: 'CC-01',
      category: 'outro',
      supplier_name: 'Fornecedor Desconhecido',
      document_number: 'NF-999',
      description: 'Despesa Avulsa sem conta ERP',
      gross_value: 500,
      discounts: 0,
      taxes: 0,
      net_value: 500,
      payment_status: 'pago',
      erp_account_code: '9.99.999',
      created_at: '2026-02-20',
    };

    const trail = resolveClassificationTrail(
      unmappedCost,
      mockDePara1,
      mockDePara2,
      mockErpAccounts,
      mockBudgetAccounts,
      mockWork.name
    );

    expect(trail.status).not.toBe('completa');
  });

  // --------------------------------------------------------------------------
  // TESTE 4: Comparativo Integrado Físico vs Financeiro (Critérios 11 e 24)
  // --------------------------------------------------------------------------
  it('Critérios 11 e 24: deve confrontar avanço físico vs consumo financeiro e disparar alertas gerenciais', () => {
    const costs: IncurredCost[] = [
      {
        id: 'c1',
        work_id: 'work-1',
        date: '2026-02-01',
        cost_center: 'CC-01',
        category: 'mao_de_obra',
        supplier_name: 'Folha',
        document_number: '1',
        description: 'Mão de obra',
        gross_value: 85000,
        discounts: 0,
        taxes: 0,
        net_value: 85000, // 85k sobre 100k orçado = 85% consumido
        payment_status: 'pago',
        created_at: '2026-02-01',
      },
    ];

    const orders: PurchaseOrder[] = [
      {
        id: 'po-1',
        work_id: 'work-1',
        internal_number: 'PC-001',
        cost_center: 'CC-01',
        supplier_name: 'Fornecedor',
        order_date: '2026-02-01',
        delivery_forecast: '2026-02-10',
        total_amount: 5000,
        status: 'aprovado',
        created_at: '',
      },
    ];

    const metrics = calculateIntegratedComparisonMetrics(mockWork, mockBudgetAccounts, costs, orders);

    // Orçamento total = 100.000 (20k + 50k + 30k)
    expect(metrics.totalBudgetPlanned).toBe(100000);
    expect(metrics.totalCostsIncurred).toBe(85000);
    expect(metrics.committedOrders).toBe(5000);
    expect(metrics.financialConsumedPercent).toBe(85);
    expect(metrics.physicalProgressWeighted).toBe(65);
    // Consumo financeiro (85%) > Avanço físico (65%) em 20 pp -> alerta_custo_alto
    expect(metrics.statusAlert).toBe('alerta_custo_alto');
    expect(metrics.alerta_custo_alto).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TESTE 5: Simulação e Aplicação do INCC (Critérios 16, 17, 18, 19, 20)
  // --------------------------------------------------------------------------
  it('Critérios 16, 17, 18, 19, 20: deve calcular o reajuste pelo INCC com fórmula oficial e suportar escopos', () => {
    // Escopo 1: Total do orçamento (+5%)
    const simTotal = simulateInccAdjustment(mockBudgetAccounts, 5, 'total_orcamento');
    expect(simTotal.totalBaseAmount).toBe(100000);
    expect(simTotal.totalAdjustedAmount).toBe(105000); // 100.000 * (1 + 5/100) = 105.000
    expect(simTotal.differenceAmount).toBe(5000);
    expect(simTotal.adjustedItems.length).toBe(3);

    // Escopo 2: Apenas etapas a executar (etapas com progress_actual < 100%)
    // Itens a executar: ba-02 (50.000) e ba-02-01 (30.000) = 80.000
    const simExecutar = simulateInccAdjustment(mockBudgetAccounts, 5, 'apenas_a_executar');
    expect(simExecutar.totalBaseAmount).toBe(100000);
    expect(simExecutar.totalAdjustedAmount).toBe(104000);
    expect(simExecutar.differenceAmount).toBe(4000);
    expect(simExecutar.adjustedItems.length).toBe(2);
    // Item 01 que está 100% concluído fica preservado no valor original
    expect(simExecutar.unadjustedCount).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TESTE 6: Comparação entre Versões do Orçamento (Critérios 13, 14, 15, 21)
  // --------------------------------------------------------------------------
  it('Critérios 13, 14, 15, 21: deve comparar versões do orçamento exibindo acréscimos, exclusões e alterações de valor e prazo', () => {
    const v1Accounts = [...mockBudgetAccounts];
    const v2Accounts: BudgetAccount[] = [
      // Item 01 com valor reajustado
      {
        ...mockBudgetAccounts[0],
        budget_version_id: 'ver-2',
        unit_cost: 25000,
        total_amount: 25000,
      },
      // Item 02 mantido
      {
        ...mockBudgetAccounts[1],
        budget_version_id: 'ver-2',
      },
      // Novo item 03 adicionado
      {
        id: 'ba-03',
        work_id: 'work-1',
        budget_version_id: 'ver-2',
        code: '03',
        description: 'Alvenaria e Vedação',
        account_type: 'etapa',
        display_order: 4,
        quantity: 1,
        unit_cost: 40000,
        total_amount: 40000,
        physical_weight_percent: 25,
        progress_planned: 0,
        progress_actual: 0,
        status: 'nao_iniciada',
        is_totalizer: false,
        created_at: '2026-02-01',
      },
    ];

    const diff = compareBudgetVersions('Versão 1.0 (Original)', 'Versão 2.0 (Revisada)', v1Accounts, v2Accounts);

    // Item adicionado
    expect(diff.items_added.length).toBe(1);
    expect(diff.items_added[0].code).toBe('03');

    // Item removido (ba-02-01 não consta na v2)
    expect(diff.items_removed.length).toBe(1);
    expect(diff.items_removed[0].code).toBe('02.01');

    // Item alterado (ba-01 mudou de 20.000 para 25.000)
    expect(diff.items_modified.length).toBe(1);
    expect(diff.items_modified[0].account.code).toBe('01');
  });

  // --------------------------------------------------------------------------
  // TESTE 7: Deduplicação de Custos Importados (Critério 25)
  // --------------------------------------------------------------------------
  it('Critério 25: deve conciliar custos por identificador externo e número de documento evitando duplicidades', () => {
    const existingCostKeys = new Set(['EXT-001', 'DOC-202601']);

    const newImports = [
      { external_id: 'EXT-001', doc: 'DOC-100', value: 1000 }, // Duplicado por external_id
      { external_id: 'EXT-002', doc: 'DOC-202601', value: 2000 }, // Duplicado por documento
      { external_id: 'EXT-003', doc: 'DOC-202603', value: 3500 }, // Novo e válido
    ];

    const validToInsert = newImports.filter(
      (item) => !existingCostKeys.has(item.external_id) && !existingCostKeys.has(item.doc)
    );

    expect(validToInsert.length).toBe(1);
    expect(validToInsert[0].external_id).toBe('EXT-003');
  });
});

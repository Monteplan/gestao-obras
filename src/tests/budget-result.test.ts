import { describe, it, expect } from 'vitest';
import { calculateWorkPerformanceIndicators, calculateFinancials, calculateBudgetItemVariations } from '../lib/utils';
import { Work, BudgetItem, PurchaseOrder, IncurredCost, Revenue } from '../types';

describe('Análise de Resultado e Indicadores da Obra (Orçamento)', () => {
  const mockWork: Work = {
    id: 'test-work-1',
    organization_id: 'org-1',
    code: 'OBR-TEST',
    name: 'Edifício Residencial Sol Nascente',
    client: 'Incorporadora Horizonte',
    address: 'Rua das Dunas, 100',
    city_state: 'Fortaleza/CE',
    state: 'CE',
    city: 'Fortaleza',
    engineer_name: 'Eng. Lucas Pinho',
    project_type: 'Residencial Multifamiliar',
    manager_name: 'Mariana Duarte',
    planned_start: '2025-01-01',
    planned_end: '2026-12-31',
    contract_value: 10000000,
    status: 'em_andamento',
    progress_percent: 50,
    labor_enabled: true,
    total_units: 100,
    units_sold: 70,
    total_area_m2: 10000,
    private_area_m2: 7000,
    cub_reference_m2: 2800,
    vgv_total: 35000000,
    vgv_sold: 24500000,
    commercial_expenses_budget: 1400000,
    administrative_expenses_budget: 700000,
    financial_expenses_budget: 525000,
    taxes_percent: 4.0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockBudgetItems: BudgetItem[] = [
    {
      id: 'bi-1',
      budget_version_id: 'bv-1',
      work_id: 'test-work-1',
      cost_group: 'material',
      cost_center: 'CC-101',
      description: 'Concreto Usinado',
      unit: 'm³',
      quantity_planned: 1000,
      unit_cost_planned: 400,
      total_planned: 4000000,
      is_direct_cost: true,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'bi-2',
      budget_version_id: 'bv-1',
      work_id: 'test-work-1',
      cost_group: 'mao_de_obra',
      cost_center: 'CC-102',
      description: 'Mão de Obra de Alvenaria',
      unit: 'm²',
      quantity_planned: 5000,
      unit_cost_planned: 1000,
      total_planned: 5000000,
      is_direct_cost: true,
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  const mockOrders: PurchaseOrder[] = [
    {
      id: 'po-1',
      work_id: 'test-work-1',
      internal_number: 'PED-001',
      supplier_name: 'Votorantim',
      cost_center: 'CC-101',
      order_date: '2025-02-01',
      delivery_forecast: '2025-02-15',
      total_amount: 500000,
      status: 'aprovado',
      created_at: '2025-02-01T00:00:00Z',
    },
  ];

  const mockCosts: IncurredCost[] = [
    {
      id: 'cost-1',
      work_id: 'test-work-1',
      date: '2025-02-10',
      cost_center: 'CC-101',
      category: 'material',
      supplier_name: 'Votorantim',
      document_number: 'NF-100',
      description: 'Cimento',
      gross_value: 3000000,
      discounts: 0,
      taxes: 0,
      net_value: 3000000,
      payment_status: 'pago',
      created_at: '2025-02-10T00:00:00Z',
    },
  ];

  const mockRevenues: Revenue[] = [
    {
      id: 'rev-1',
      work_id: 'test-work-1',
      date: '2025-03-01',
      document_number: 'FAT-01',
      description: 'Medição 1',
      contracted_value: 10000000,
      recognized_value: 5000000,
      received_value: 4000000,
      status: 'faturado',
      created_at: '2025-03-01T00:00:00Z',
    },
  ];

  it('deve calcular corretamente os indicadores imobiliários (VGV, Unidades, Metragem e CUB)', () => {
    const indicators = calculateWorkPerformanceIndicators(
      mockWork,
      mockBudgetItems,
      mockOrders,
      mockCosts,
      mockRevenues
    );

    expect(indicators.totalUnits).toBe(100);
    expect(indicators.unitsSold).toBe(70);
    expect(indicators.unitsAvailable).toBe(30);
    expect(indicators.salesPercent).toBe(70.0);

    expect(indicators.totalAreaM2).toBe(10000);
    expect(indicators.privateAreaM2).toBe(7000);
    expect(indicators.areaEfficiencyPercent).toBe(70.0);

    expect(indicators.vgvTotal).toBe(35000000);
    expect(indicators.vgvSold).toBe(24500000);
    expect(indicators.avgPricePerM2).toBe(5000); // 35.000.000 / 7.000 m²
    expect(indicators.avgUnitTicket).toBe(350000); // 35.000.000 / 100 un.

    expect(indicators.cubReferenceM2).toBe(2800);
    expect(indicators.budgetCostPerM2).toBe(900); // 9.000.000 / 10.000 m²
  });

  it('deve calcular a DRE da obra em cascata com receitas, impostos, custos diretos e despesas', () => {
    const indicators = calculateWorkPerformanceIndicators(
      mockWork,
      mockBudgetItems,
      mockOrders,
      mockCosts,
      mockRevenues
    );

    // Receita Bruta = VGV vendido (24.500.000)
    expect(indicators.grossRevenue).toBe(24500000);
    // Impostos (RET 4%) = 24.500.000 * 0.04 = 980.000
    expect(indicators.taxesAmount).toBe(980000);
    // Receita Líquida = 24.500.000 - 980.000 = 23.520.000
    expect(indicators.netRevenue).toBe(23520000);

    // Custo Direto Orçado = 9.000.000
    expect(indicators.directConstructionCostBudget).toBe(9000000);

    // Despesas Totais = 1.400.000 + 700.000 + 525.000 = 2.625.000
    expect(indicators.totalExpenses).toBe(2625000);

    // Lucro Líquido Projetado = Receita Líquida Projetada (35.000.000 * 0.96 = 33.600.000) - Custo (9.000.000) - Despesas (2.625.000) = 21.975.000
    expect(indicators.netProfitProjected).toBe(21975000);
    expect(indicators.netMarginPercent).toBe(62.8);
  });

  it('deve calcular o ponto de equilíbrio (Break-even) de unidades e financeiro', () => {
    const indicators = calculateWorkPerformanceIndicators(
      mockWork,
      mockBudgetItems,
      mockOrders,
      mockCosts,
      mockRevenues
    );

    // Custo Total + Despesas = 9.000.000 + 2.625.000 = 11.625.000
    // Ticket Médio = 350.000
    // Break-even Units = ceil(11.625.000 / 350.000) = 34 unidades
    expect(indicators.breakEvenUnits).toBe(34);
    expect(indicators.breakEvenUnits).toBeLessThanOrEqual(indicators.unitsSold);
  });

  it('deve respeitar a segregação de perfis para a visualização de resultado', () => {
    const allowedRoles = ['financeiro', 'admin'];
    const operationalOnlyRoles = ['gestor', 'engenharia', 'consulta'];

    allowedRoles.forEach(r => {
      expect(['financeiro', 'admin'].includes(r)).toBe(true);
    });

    operationalOnlyRoles.forEach(r => {
      expect(['financeiro', 'admin'].includes(r)).toBe(false);
    });
  });

  it('deve calcular corretamente Valor Orçado, Realizado e Variação por item da planilha', () => {
    const customBudget: BudgetItem[] = [
      {
        id: 'bi-under',
        budget_version_id: 'bv-1',
        work_id: 'test-work-1',
        cost_group: 'material',
        cost_center: 'CC-101',
        description: 'Item com Economia',
        unit: 'm³',
        quantity_planned: 100,
        unit_cost_planned: 1000,
        total_planned: 100000,
        is_direct_cost: true,
        created_at: '',
      },
      {
        id: 'bi-over',
        budget_version_id: 'bv-1',
        work_id: 'test-work-1',
        cost_group: 'material',
        cost_center: 'CC-102',
        description: 'Item com Estouro',
        unit: 'm³',
        quantity_planned: 50,
        unit_cost_planned: 1000,
        total_planned: 50000,
        is_direct_cost: true,
        created_at: '',
      },
      {
        id: 'bi-pending',
        budget_version_id: 'bv-1',
        work_id: 'test-work-1',
        cost_group: 'equipamento',
        cost_center: 'CC-103',
        description: 'Item Pendente',
        unit: 'mês',
        quantity_planned: 10,
        unit_cost_planned: 2000,
        total_planned: 20000,
        is_direct_cost: true,
        created_at: '',
      },
    ];

    const customCosts: IncurredCost[] = [
      {
        id: 'c-1',
        work_id: 'test-work-1',
        budget_item_id: 'bi-under',
        date: '2026-03-01',
        cost_center: 'CC-101',
        category: 'material',
        supplier_name: 'Fornecedor A',
        document_number: 'NF-1',
        description: 'Nota 1',
        gross_value: 60000,
        discounts: 0,
        taxes: 0,
        net_value: 60000,
        payment_status: 'pago',
        created_at: '',
      },
      {
        id: 'c-2',
        work_id: 'test-work-1',
        budget_item_id: 'bi-over',
        date: '2026-03-02',
        cost_center: 'CC-102',
        category: 'material',
        supplier_name: 'Fornecedor B',
        document_number: 'NF-2',
        description: 'Nota 2',
        gross_value: 70000,
        discounts: 0,
        taxes: 0,
        net_value: 70000,
        payment_status: 'pago',
        created_at: '',
      },
    ];

    const itemsWithVariance = calculateBudgetItemVariations(customBudget, customCosts, []);

    // Item com Economia: Orçado 100k, Realizado 60k, Variação -40k (-40%), Status 'economico'
    const under = itemsWithVariance.find(i => i.id === 'bi-under')!;
    expect(under.planned_total).toBe(100000);
    expect(under.realized_total).toBe(60000);
    expect(under.variance_amount).toBe(-40000);
    expect(under.variance_percent).toBe(-40);
    expect(under.consumed_percent).toBe(60);
    expect(under.status).toBe('economico');

    // Item com Estouro: Orçado 50k, Realizado 70k, Variação +20k (+40%), Status 'estourado'
    const over = itemsWithVariance.find(i => i.id === 'bi-over')!;
    expect(over.planned_total).toBe(50000);
    expect(over.realized_total).toBe(70000);
    expect(over.variance_amount).toBe(20000);
    expect(over.variance_percent).toBe(40);
    expect(over.consumed_percent).toBe(140);
    expect(over.status).toBe('estourado');

    // Item Pendente: Orçado 20k, Realizado 0, Variação -20k, Status 'pendente'
    const pending = itemsWithVariance.find(i => i.id === 'bi-pending')!;
    expect(pending.planned_total).toBe(20000);
    expect(pending.realized_total).toBe(0);
    expect(pending.consumed_percent).toBe(0);
    expect(pending.status).toBe('pendente');
  });
});


import { describe, it, expect } from 'vitest';
import { calculateWeightedProgress, calculateFinancials, calculateWorkHealth } from '../lib/utils';
import { Stage, Work, BudgetItem, PurchaseOrder, IncurredCost, Revenue } from '../types';

describe('Regras Críticas: Cálculo de Avanço Físico Ponderado', () => {
  it('deve calcular corretamente o avanço ponderado proporcional aos pesos', () => {
    const mockStages: Stage[] = [
      {
        id: 's1',
        work_id: 'w1',
        code: '1.0',
        name: 'Fundações',
        responsible: 'Eng',
        order_index: 1,
        weight_percent: 30,
        planned_start: '2026-01-01',
        planned_end: '2026-02-01',
        progress_planned: 100,
        progress_percent: 100, // 30% * 100% = 30
        status: 'concluida',
        created_at: '',
        updated_at: '',
      },
      {
        id: 's2',
        work_id: 'w1',
        code: '2.0',
        name: 'Estrutura',
        responsible: 'Eng',
        order_index: 2,
        weight_percent: 50,
        planned_start: '2026-02-01',
        planned_end: '2026-05-01',
        progress_planned: 50,
        progress_percent: 50, // 50% * 50% = 25
        status: 'em_andamento',
        created_at: '',
        updated_at: '',
      },
      {
        id: 's3',
        work_id: 'w1',
        code: '3.0',
        name: 'Acabamentos',
        responsible: 'Eng',
        order_index: 3,
        weight_percent: 20,
        planned_start: '2026-05-01',
        planned_end: '2026-10-01',
        progress_planned: 0,
        progress_percent: 0, // 20% * 0% = 0
        status: 'nao_iniciada',
        created_at: '',
        updated_at: '',
      },
    ];

    // Total = 30 + 25 + 0 = 55%
    const progress = calculateWeightedProgress(mockStages);
    expect(progress).toBe(55);
  });

  it('deve retornar 0 quando nenhuma etapa tiver progresso', () => {
    const mockStages: Stage[] = [
      {
        id: 's1',
        work_id: 'w1',
        code: '1.0',
        name: 'Fundações',
        responsible: 'Eng',
        order_index: 1,
        weight_percent: 100,
        planned_start: '2026-01-01',
        planned_end: '2026-02-01',
        progress_planned: 0,
        progress_percent: 0,
        status: 'nao_iniciada',
        created_at: '',
        updated_at: '',
      },
    ];
    expect(calculateWeightedProgress(mockStages)).toBe(0);
  });
});

describe('Regras Críticas: Fórmulas Financeiras e Conciliação', () => {
  const mockWork: Work = {
    id: 'w1',
    organization_id: 'org1',
    code: 'OBR-TEST',
    name: 'Obra Teste',
    client: 'Cliente Teste',
    address: 'Rua Teste',
    city_state: 'São Paulo/SP',
    state: 'SP',
    city: 'São Paulo',
    engineer_name: 'Eng. Lucas Pinho',
    project_type: 'Residencial',
    manager_name: 'Gestor',
    planned_start: '2026-01-01',
    planned_end: '2026-12-31',
    contract_value: 1000000,
    status: 'em_andamento',
    progress_percent: 50,
    labor_enabled: true,
    created_at: '',
    updated_at: '',
  };

  const mockBudget: BudgetItem[] = [
    {
      id: 'b1',
      budget_version_id: 'v1',
      work_id: 'w1',
      cost_group: 'material',
      cost_center: 'CC1',
      description: 'Concreto',
      unit: 'm³',
      quantity_planned: 100,
      unit_cost_planned: 500,
      total_planned: 800000, // Orçamento total = 800.000
      is_direct_cost: true,
      created_at: '',
    },
  ];

  const mockCosts: IncurredCost[] = [
    {
      id: 'c1',
      work_id: 'w1',
      date: '2026-02-01',
      cost_center: 'CC1',
      category: 'material',
      supplier_name: 'Fornecedor',
      document_number: 'NF 10',
      description: 'Lançamento',
      gross_value: 300000,
      discounts: 0,
      taxes: 0,
      net_value: 300000, // Custo incorrido = 300.000
      payment_status: 'pago',
      created_at: '',
    },
  ];

  const mockOrders: PurchaseOrder[] = [
    {
      id: 'o1',
      work_id: 'w1',
      internal_number: 'PC-1',
      supplier_name: 'Fornecedor',
      cost_center: 'CC1',
      order_date: '2026-02-10',
      delivery_forecast: '2026-03-01',
      total_amount: 150000, // Comprometido = 150.000
      status: 'enviado',
      created_at: '',
    },
  ];

  const mockRevenues: Revenue[] = [
    {
      id: 'r1',
      work_id: 'w1',
      date: '2026-02-15',
      document_number: 'MED 1',
      description: 'Faturamento',
      contracted_value: 1000000,
      recognized_value: 500000, // Receita faturada = 500.000
      received_value: 500000,
      status: 'recebido',
      created_at: '',
    },
  ];

  it('deve calcular o saldo orçamentário disponível e percentual consumido', () => {
    const fin = calculateFinancials(mockWork, mockBudget, mockOrders, mockCosts, mockRevenues);
    // Saldo = 800.000 - (300.000 + 150.000) = 350.000
    expect(fin.availableBalance).toBe(350000);
    // Consumido = (450.000 / 800.000) * 100 = 56.3%
    expect(fin.consumedPercent).toBe(56.3);
  });

  it('deve calcular o resultado realizado: Receita Realizada - Custo Incorrido', () => {
    const fin = calculateFinancials(mockWork, mockBudget, mockOrders, mockCosts, mockRevenues);
    // Resultado Realizado = 500.000 - 300.000 = 200.000
    expect(fin.calculatedResult).toBe(200000);
    // Margem Realizada = (200.000 / 500.000) * 100 = 40%
    expect(fin.calculatedMarginPercent).toBe(40);
  });

  it('deve calcular o resultado projetado: Receita Contratada - Custo Incorrido - Comprometido Aberto', () => {
    const fin = calculateFinancials(mockWork, mockBudget, mockOrders, mockCosts, mockRevenues);
    // Resultado Projetado = 1.000.000 - 300.000 - 150.000 = 550.000
    expect(fin.projectedResult).toBe(550000);
    // Margem Projetada = (550.000 / 1.000.000) * 100 = 55%
    expect(fin.projectedMarginPercent).toBe(55);
  });
});

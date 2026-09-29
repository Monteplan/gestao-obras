export type UserRole = 
  | 'admin' 
  | 'gestor' 
  | 'compras' 
  | 'financeiro' 
  | 'engenharia' 
  | 'consulta';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  organization_id: string;
  organization_name?: string;
}

export type WorkStatus = 'planejamento' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';

export interface Work {
  id: string;
  organization_id: string;
  code: string;
  erp_code?: string;
  name: string;
  client: string;
  address: string;
  neighborhood?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  map_coordinates?: { x: number; y: number };
  city_state: string; // Ex: 'Fortaleza/CE'
  state: string; // UF: 'CE', 'BA', 'PE', 'RN', etc.
  city: string; // Ex: 'Fortaleza', 'Salvador', etc.
  engineer_name: string; // Engenheiro Responsável
  project_type: string;
  manager_name: string;
  planned_start: string;
  planned_end: string;
  planned_end_date?: string; // alias
  expected_end_date?: string; // alias
  actual_start?: string;
  actual_end?: string;
  contract_value: number; // Receita prevista / contrato
  status: WorkStatus;
  progress_percent: number; // Avanço físico ponderado
  notes?: string;
  labor_enabled: boolean; // Indicador de uso de mão de obra
  // Dados Gerais do Empreendimento e Indicadores Imobiliários / Construção Civil
  total_units?: number; // Quantidade total de unidades (ex: 88 aptos/salas/casas)
  units_sold?: number;  // Quantidade de unidades vendidas
  total_area_m2?: number; // Metragem total construída (m²)
  private_area_m2?: number; // Metragem privativa / vendável total (m²)
  cub_reference_m2?: number; // CUB de referência regional (Sinduscon R$/m²)
  vgv_total?: number; // Valor Geral de Vendas Total Projetado (R$)
  vgv_sold?: number;  // VGV já Comercializado / Vendido (R$)
  commercial_expenses_budget?: number; // Despesas comerciais orçadas (marketing, corretagem)
  administrative_expenses_budget?: number; // Despesas indiretas de administração da obra
  financial_expenses_budget?: number; // Despesas financeiras e juros bancários orçados
  taxes_percent?: number; // Alíquota tributária (RET / Impostos, ex: 4%)
  commercial_data?: WorkCommercialData;
  schedule_reconciliation?: ScheduleReconciliation;
  typologies?: WorkTypology[];
  pco_physical_progress?: number;
  pco_budget_total?: number;
  pco_real_spent?: number;
  pco_last_imported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkPerformanceIndicators {
  workId: string;
  workName: string;
  // Indicadores Gerais
  totalUnits: number;
  unitsSold: number;
  unitsAvailable: number;
  salesPercent: number;
  totalAreaM2: number;
  privateAreaM2: number;
  areaEfficiencyPercent: number; // (private / total) * 100
  // CUB e Custos por m²
  cubReferenceM2: number;
  budgetCostPerM2: number; // Custo de Obra Orçado / Área Construída
  incurredCostPerM2: number; // Custo Incorrido Atual / Área Construída
  cubVariancePercent: number; // Variação do custo orçado vs CUB
  // VGV e Preços
  vgvTotal: number;
  vgvSold: number;
  vgvAvailable: number;
  avgPricePerM2: number; // VGV Total / Área Privativa
  avgUnitTicket: number; // VGV Total / Unidades
  // DRE de Obra Completa
  grossRevenue: number; // Receita Operacional Bruta (VGV vendido ou contratos)
  projectedRevenue: number; // Receita Total Projetada
  taxesAmount: number; // Impostos (RET)
  netRevenue: number; // Receita Líquida
  directConstructionCostBudget: number; // Custo Direto Orçado de Obra
  directConstructionCostIncurred: number; // Custo Direto Incorrido
  directConstructionCostCommitted: number; // Custo Direto Comprometido
  grossProfitBudget: number; // Lucro Bruto Orçado
  grossProfitProjected: number; // Lucro Bruto Projetado
  grossMarginPercent: number; // Margem Bruta %
  // Despesas da Obra
  commercialExpenses: number; // Despesas Comerciais (Marketing/Corretagem)
  administrativeExpenses: number; // Despesas Administrativas
  financialExpenses: number; // Despesas Financeiras
  totalExpenses: number; // Total de Despesas Indiretas
  // Resultado Final
  netProfitProjected: number; // Resultado Líquido Projetado
  netMarginPercent: number; // Margem Líquida %
  breakEvenUnits: number; // Unidades necessárias para cobrir custos e despesas totais
  breakEvenPercent: number; // % de VGV necessário para break-even
}

export type StageStatus = 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada' | 'bloqueada';

export interface Stage {
  id: string;
  work_id: string;
  parent_id?: string | null; // null = Macroetapa (Nível 1); string = Subetapa (Nível 2)
  code: string; // Ex: '1.0' para macro, '1.1' para subetapa
  name: string;
  description?: string;
  responsible: string;
  order_index: number;
  dependency_stage_id?: string | null;
  weight_percent: number; // Peso no avanço físico total (0 a 100)
  planned_start: string;
  planned_end: string;
  actual_start?: string;
  actual_end?: string;
  progress_planned: number; // Percentual planejado
  progress_percent: number; // Percentual realizado
  status: StageStatus;
  notes?: string;
  // Métricas do Orçamento Físico-Financeiro em 2º nível
  budget_planned?: number; // Orçamento previsto da etapa / subetapa
  cost_incurred?: number;  // Custos incorridos acumulados
  cost_committed?: number; // Valores comprometidos em pedidos de compra
  substages?: Stage[];     // Subetapas vinculadas para exibição hierárquica
  created_at: string;
  updated_at: string;
}

export interface StageProgressHistory {
  id: string;
  stage_id: string;
  work_id: string;
  previous_percent: number;
  new_percent: number;
  reason?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export type BudgetVersionStatus = 'rascunho' | 'revisada' | 'aprovada';

export interface BudgetVersion {
  id: string;
  work_id: string;
  version_number: number;
  title: string;
  status: BudgetVersionStatus;
  is_current_approved: boolean;
  total_amount: number;
  reason?: string;
  user_name: string;
  created_at: string;
}

export type CostCategory = 'material' | 'mao_de_obra' | 'equipamento' | 'empreiteiro' | 'indireto' | 'outro';

export interface BudgetItem {
  id: string;
  budget_version_id: string;
  work_id: string;
  stage_id?: string;
  cost_group: CostCategory;
  cost_center: string;
  item_code?: string;
  description: string;
  supplier_name?: string;
  unit: string;
  quantity_planned: number;
  unit_cost_planned: number;
  total_planned: number;
  is_direct_cost: boolean;
  notes?: string;
  created_at: string;
}

export interface BudgetItemWithVariance extends BudgetItem {
  planned_total: number;
  realized_total: number;
  committed_total: number;
  variance_amount: number; // realized_total - planned_total (positivo = estouro acima do previsto, negativo = economia)
  variance_percent: number; // ((realized_total - planned_total) / planned_total) * 100
  consumed_percent: number; // (realized_total / planned_total) * 100
  status: 'economico' | 'no_limite' | 'estourado' | 'pendente';
}

export type RequisitionStatus = 'rascunho' | 'enviada' | 'aprovada' | 'rejeitada' | 'parcialmente_atendida' | 'atendida' | 'cancelada';

export interface PurchaseRequisition {
  id: string;
  work_id: string;
  stage_id?: string;
  internal_number: string;
  erp_code?: string;
  requester_name: string;
  request_date: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  justification: string;
  status: RequisitionStatus;
  notes?: string;
  approval_notes?: string;
  items_count?: number;
  total_estimated?: number;
  created_at: string;
}

export interface PurchaseRequisitionItem {
  id: string;
  requisition_id: string;
  description: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  estimated_total: number;
}

export type OrderStatus = 'rascunho' | 'aprovado' | 'enviado' | 'parcialmente_recebido' | 'recebido' | 'atrasado' | 'cancelado';

export interface PurchaseOrder {
  id: string;
  work_id: string;
  requisition_id?: string;
  internal_number: string;
  erp_code?: string;
  supplier_name: string;
  supplier_cnpj?: string;
  cost_center: string;
  order_date: string;
  delivery_forecast: string;
  total_amount: number;
  status: OrderStatus;
  notes?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  quantity_received: number;
}

export interface Receipt {
  id: string;
  work_id: string;
  order_id?: string;
  invoice_number: string; // Nota fiscal
  receipt_date: string;
  received_value: number;
  is_partial: boolean;
  discrepancies?: string;
  notes?: string;
  created_at: string;
}

export interface IncurredCost {
  id: string;
  work_id: string;
  budget_item_id?: string;
  stage_id?: string;
  order_id?: string;
  receipt_id?: string;
  external_id?: string; // ID do ERP
  date: string;
  cost_center: string;
  category: CostCategory;
  supplier_name: string;
  document_number: string;
  description: string;
  gross_value: number;
  discounts: number;
  taxes: number;
  net_value: number;
  payment_status: 'pendente' | 'pago' | 'agendado';
  erp_account_code?: string;
  cost_account_id?: string; // alias para ID do plano de contas ERP
  competence_month?: string; // Mês de competência YYYY-MM
  launch_date?: string; // alias para data de lançamento
  budget_account_id?: string;
  source_batch_id?: string;
  created_at: string;
}

export interface Revenue {
  id: string;
  work_id: string;
  external_id?: string;
  date: string;
  document_number: string;
  description: string;
  contracted_value: number;
  recognized_value: number; // Faturado / Realizado
  received_value: number;
  status: 'faturado' | 'recebido' | 'previsto';
  source_batch_id?: string;
  created_at: string;
}

export interface WorkResult {
  id: string;
  work_id: string;
  period: string; // Ex: 2026-03
  revenue_recognized: number;
  costs_incurred: number;
  indirect_expenses: number;
  calculated_result: number; // Receita - Custos - Despesas
  projected_result: number;  // Receita prevista - Custos Incorridos - Saldo Comprometido
  erp_reported_result?: number;
  margin_percent: number;
  notes?: string;
  created_at: string;
}

export interface LaborPerson {
  id: string;
  work_id: string;
  name: string;
  role_function: string;
  team_contractor?: string;
  rate_type: 'hora' | 'dia';
  unit_rate: number;
  is_active: boolean;
  created_at: string;
}

export type LaborStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';

export interface LaborEntry {
  id: string;
  work_id: string;
  stage_id?: string;
  person_id: string;
  person_name?: string;
  function_name?: string;
  date: string;
  activity_description: string;
  units_worked: number; // Horas ou dias
  unit_cost: number;
  total_calculated: number;
  status: LaborStatus;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

export type ErpImportType = 
  | 'works' 
  | 'budget' 
  | 'budget_accounts'
  | 'plano_orcamento'
  | 'erp_accounts'
  | 'plano_erp'
  | 'de_para_1'
  | 'de_para_2'
  | 'requisitions' 
  | 'orders' 
  | 'receipts' 
  | 'incurred_costs' 
  | 'revenues' 
  | 'work_results' 
  | 'labor'
  | 'incc'
  | 'prazos_etapas';

export type DeduplicationStrategy = 'insert_new' | 'update_existing' | 'reject_duplicates';

export interface ErpImportBatch {
  id: string;
  import_type: ErpImportType;
  file_name: string;
  deduplication_strategy: DeduplicationStrategy;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  ignored_rows: number;
  rejected_rows: number;
  status: 'processado' | 'com_erros' | 'falha';
  user_name: string;
  created_at: string;
}

export interface ErpImportError {
  id?: string;
  batch_id: string;
  row_number: number;
  field_name?: string;
  error_message: string;
  raw_data?: string;
}

export interface SystemAuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  timestamp: string;
}

// ==============================================================================
// EVOLUÇÃO FÍSICO-FINANCEIRA: PLANO DE CONTAS, DUPLO DE-PARA, INCC & INTEGRAÇÃO
// ==============================================================================

export type BudgetAccountType = 'grupo' | 'etapa' | 'subetapa' | 'atividade';
export type BudgetAccountStatus = 'nao_iniciada' | 'em_andamento' | 'concluida' | 'atrasada' | 'bloqueada' | 'descontinuada' | 'ativo' | 'inativo';

export interface BudgetAccount {
  id: string;
  budget_plan_id?: string;
  budget_version_id: string;
  version_id?: string; // alias
  work_id: string;
  stage_id?: string;
  parent_id?: string | null;
  code: string; // Ex: '01', '01.01', '02.09'
  account_code?: string; // alias
  description: string;
  account_type: BudgetAccountType;
  display_order: number;
  order_index?: number; // alias
  unit?: string;
  quantity?: number;
  unit_cost?: number;
  unit_value?: number; // alias
  total_amount: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  revised_planned_end?: string;
  physical_weight_percent: number; // Peso no avanço físico total (0 a 100)
  progress_planned: number; // % planejado
  progress_actual: number;  // % realizado
  status: BudgetAccountStatus;
  is_totalizer?: boolean;
  is_reajustavel_incc?: boolean;
  notes?: string;
  children?: BudgetAccount[];
  created_at: string;
  updated_at?: string;
}

export interface ErpCostAccount {
  id: string;
  organization_id?: string;
  code: string; // Ex: '1.01.001', 'SAL-01'
  account_code?: string; // alias
  description: string;
  name?: string; // alias para description
  category: CostCategory;
  account_type?: 'detalhada' | 'totalizadora';
  is_totalizer?: boolean;
  is_active: boolean;
  parent_id?: string | null;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type MappingType = 'direto' | 'rateado' | 'manual' | 'nao_classificado';

export interface BudgetToErpMapping {
  id: string;
  organization_id?: string;
  work_id?: string; // null = regra geral
  budget_version_id?: string;
  budget_account_id?: string;
  budget_account_code?: string;
  budget_account_description?: string;
  erp_account_id?: string;
  erp_account_code?: string;
  erp_account_description?: string;
  mapping_type: MappingType;
  apportionment_percent: number; // % de rateio (1 a 100)
  fixed_amount_rule?: number;
  valid_from?: string;
  valid_to?: string;
  priority: number;
  is_active: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ErpToBudgetTotalizerMapping {
  id: string;
  organization_id?: string;
  work_id?: string; // null = regra geral
  budget_version_id?: string;
  detailed_erp_account_id?: string; // Ex: FGTS, INSS, Cesta básica
  detailed_erp_account_code?: string;
  detailed_erp_account_description?: string;
  erp_cost_account_id?: string; // alias para detailed_erp_account_id
  totalizer_erp_account_id?: string; // Ex: Salários
  totalizer_erp_account_code?: string;
  totalizer_erp_account_description?: string;
  totalizer_account_id?: string; // alias para totalizer_erp_account_id
  consolidated_category?: CostCategory;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClassificationTrail {
  detailedErpCode: string;
  detailedErpDescription: string;
  totalizerErpCode: string;
  totalizerErpDescription: string;
  budgetAccountCode: string;
  budgetAccountDescription: string;
  stageName?: string;
  workName: string;
  status: 'completa' | 'pendente_de_para_1' | 'pendente_de_para_2' | 'nao_classificada';
}

export type InccScope = 'total_orcamento' | 'apenas_a_executar' | 'selecao_manual';

export interface BudgetIndexAdjustment {
  id: string;
  work_id: string;
  from_version_id: string;
  to_version_id: string;
  index_name: string; // Ex: 'INCC-M'
  index_rate_percent?: number; // Ex: 4.5%
  index_percent?: number; // alias
  base_date_old: string;
  base_date_new: string;
  scope: InccScope;
  source_agency?: string; // Ex: 'FGV'
  justification: string;
  total_base_amount?: number;
  total_adjusted_amount?: number;
  total_adjustment_value?: number; // alias
  difference_amount?: number;
  items?: any[];
  applied_by?: string;
  created_at: string;
}

export interface VersionDiffItem {
  account_code: string;
  account_description: string;
  change_type: 'adicionado' | 'removido' | 'descontinuado' | 'alterado';
  changes: { field: string; old_value: any; new_value: any }[];
}

export interface VersionComparisonResult {
  from_version: string;
  to_version: string;
  total_old_budget: number;
  total_new_budget: number;
  total_diff_budget: number;
  old_weighted_progress: number;
  new_weighted_progress: number;
  diff_weighted_progress: number;
  items_added: BudgetAccount[];
  items_removed: BudgetAccount[];
  items_modified: {
    account: BudgetAccount;
    changes: { field: string; old_value: any; new_value: any }[];
  }[];

  // Aliases
  fromVersionTitle?: string;
  toVersionTitle?: string;
  itemsAdded?: BudgetAccount[];
  itemsRemoved?: BudgetAccount[];
  itemsModified?: { account: BudgetAccount; changes: { field: string; old_value: any; new_value: any }[] }[];
  oldTotalBudget?: number;
  newTotalBudget?: number;
  deltaBudget?: number;
  deltaBudgetPercent?: number;
  oldWeightedProgress?: number;
  newWeightedProgress?: number;
}

export interface PhysicalProgressEntry {
  id: string;
  work_id: string;
  budget_account_id: string;
  measurement_date: string;
  progress_percent: number;
  actual_start?: string;
  actual_end?: string;
  revised_planned_end?: string;
  status: BudgetAccountStatus;
  notes?: string;
  evidence_urls?: string[];
  measured_by?: string;
  engineer_name?: string; // alias
  created_at: string;
}

export interface IntegratedComparisonMetrics {
  workId: string;
  workName: string;
  physicalProgressWeighted: number; // % avanço físico
  financialConsumedPercent: number; // % consumo financeiro
  totalBudgetPlanned: number;       // R$ orçado
  totalCostsIncurred: number;       // R$ realizado
  committedOrders: number;          // R$ comprometido
  deviationPercent: number;         // physical - financial
  statusAlert: 'equilibrado' | 'alerta_custo_alto' | 'alerta_avanco_alto';
  alertMessage: string;

  // Aliases para compatibilidade ampla
  avanco_fisico_obra?: number;
  percentual_financeiro_consumido?: number;
  discrepancia_pontos_percentuais?: number;
  valor_orcado_total?: number;
  custo_realizado_acumulado?: number;
  alerta_custo_alto?: boolean;
  alerta_avanco_alto?: boolean;
}

// ==============================================================================
// DADOS REAIS DO EMPREENDIMENTO: COMERCIAL, TIPOLOGIAS & CONCILIAÇÃO DE PRAZOS
// ==============================================================================

export interface WorkTypology {
  id: string;
  work_id?: string;
  code?: string; // Ex: 'Tipo 01'
  name: string; // Ex: 'Apartamento Tipo 01'
  units_count?: number; // Quantidade de unidades
  unit_count?: number; // alias
  unit_area_m2?: number; // Área privativa unitária
  private_area_m2?: number; // alias
  total_area_m2?: number; // Área total informada
  subtotal_area_m2?: number; // alias
  calculated_total_area_m2?: number; // units_count * unit_area_m2
  area_discrepancy_alert?: boolean; // Se calculated != total_area_m2
  price_per_m2?: number; // Preço/m²
  total_vgv?: number; // VGV total da tipologia
  bedrooms?: number;
  suites?: number;
  parking_spots?: number;
  base_date?: string;
  source?: string; // 'Tabela Comercial'
  notes?: string;
}

export interface ScheduleReconciliation {
  id?: string;
  work_id?: string;
  // 1. Prazo Cadastral / Comercial do Empreendimento
  commercial_start: string; // '2023-08-01' (agosto de 2023)
  commercial_duration_months: number; // 50 meses
  commercial_end: string; // '2027-10-01' (outubro de 2027)
  commercial_remaining_months: number; // 13 meses
  // 2. Prazo do Planejamento Físico PCO
  pco_start: string; // '2025-02-01' (fevereiro de 2025)
  pco_planned_end?: string; // '2028-02-01' (fevereiro de 2028)
  pco_end?: string; // alias
  pco_duration_months?: number; // alias
  // 3. Prazos do Cliente
  client_deadline?: string; // '2028-01-01' (janeiro de 2028)
  client_contract_end?: string; // alias
  client_grace_period?: string; // '2028-07-01' (julho de 2028)
  client_grace_period_months?: number; // alias
  client_contract_limit?: string; // alias
  // Conciliação e Vigência Definida pelo Gestor
  effective_schedule_choice?: 'comercial' | 'pco' | 'cliente';
  difference_months?: number; // Ex: divergência entre out/2027 e fev/2028 = 4 meses
  divergence_months?: number; // alias
  divergence_alert?: boolean;
  alert_status?: 'ok' | 'warning' | 'divergent'; // alias
  notes?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface WorkCommercialData {
  id?: string;
  work_id?: string;
  sales_table_start_date?: string; // '2023-08-26'
  sales_table_date?: string; // alias
  initial_vgv?: number; // 55206000.00
  vgv_total?: number; // alias
  initial_price_per_m2?: number; // 11406.20
  average_price_m2?: number; // alias
  total_units: number; // 80
  total_private_area_m2: number; // 4840.00
  typologies?: WorkTypology[];
  schedule?: ScheduleReconciliation;
  source_reference?: string;
  registered_by?: string;
  created_at?: string;
}

// ==============================================================================
// MOTOR DE IMPORTAÇÃO PCO REUTILIZÁVEL (6 ABAS)
// ==============================================================================

export type NaturezaLancamento = 
  | 'custo_obra' 
  | 'despesa_obra' 
  | 'despesa_administrativa' 
  | 'receita' 
  | 'rendimento_financeiro' 
  | 'transferencia_ajuste' 
  | 'pendente';

export interface MonthlyPlannedPeriod {
  period_key: string; // Ex: '2026-09'
  period_label: string; // Ex: 'Set/26'
  planned_percent_month: number; // % planejado no mês
  planned_percent_accumulated: number; // % planejado acumulado
  actual_percent_accumulated?: number; // % executado acumulado (quando disponível)
}

export interface PcoSheetDetection {
  expected_name: string;
  detected_name: string | null;
  is_present: boolean;
  row_count: number;
  column_count: number;
  sample_headers: string[];
}

export interface PcoValidationItem {
  type: 'erro' | 'aviso' | 'sucesso';
  sheet: string;
  code: string;
  message: string;
  details?: string;
}

export interface PcoValidationResult {
  is_valid: boolean;
  isValid?: boolean; // alias
  errors_count: number;
  warnings_count: number;
  items: PcoValidationItem[];
  checks?: { name: string; status: 'pass' | 'fail' | 'warning'; details: string; expected?: any; found?: any }[];
  // Controles consolidados
  base_budget_total: number;
  base_budget_lines_count: number;
  real_gross_total: number;
  real_lines_count: number;
  de_para_rules_count: number;
  macro_physical_progress: number;
  indirect_weight_percent: number;
  direct_weight_percent: number;
}

export interface PcoImportProfile {
  id: string;
  work_id?: string;
  code?: string;
  name?: string;
  description?: string;
  is_default?: boolean;
  expected_sheets?: {
    macro: string;
    indirects: string;
    directs: string;
    base_budget: string;
    real: string;
    de_para: string;
  };
  sheet_names?: {
    macro: string;
    indirects: string;
    directs: string;
    budget: string;
    real: string;
    de_para: string;
  };
  header_rows?: {
    macro: number;
    indirects: number;
    directs: number;
    budget: number;
    real: number;
    de_para: number;
  };
  last_file_name?: string;
  last_imported_at?: string;
  is_active?: boolean;
  aliases?: Record<string, string[]>;
  created_at?: string;
  updated_at?: string;
}

export interface PcoParsedData {
  workId?: string;
  fileName?: string;
  uploadedBy?: string;
  work_metadata: {
    name: string;
    address: string;
    start_date: string;
    end_date: string;
    client_deadline: string;
    client_grace: string;
    accumulated_progress: number;
    measurement_competence: string;
  };
  macro?: {
    accumulatedExecutedProgress: number;
    totalPlannedBudget: number;
    monthlyPlannedPeriods: MonthlyPlannedPeriod[];
  };
  macro_periods: MonthlyPlannedPeriod[];
  indirects: {
    total_budget: number;
    weight_percent: number;
    executed_previous: number;
    executed_month: number;
    executed_accumulated: number;
    balance_percent: number;
    items: any[];
    reduce?: any;
    length?: number;
    [key: number]: any;
  } & any[];
  directs: {
    total_budget: number;
    weight_percent: number;
    executed_previous: number;
    executed_month: number;
    executed_accumulated: number;
    balance_percent: number;
    items: any[];
    reduce?: any;
    length?: number;
    [key: number]: any;
  } & any[];
  base_budget: {
    total_amount: number;
    lines_count: number;
    items: any[];
  };
  budget?: {
    items: any[];
    totalPlanned: number;
  };
  real_entries: {
    gross_total: number;
    lines_count: number;
    date_min: string;
    date_max: string;
    entries: any[];
  };
  real?: {
    totalSpent: number;
    recordCount: number;
    records: any[];
  };
  de_para_rules: {
    rules_count: number;
    distinct_adjusted_accounts: number;
    rules: { original_account: string; adjusted_account: string }[];
  };
  dePara?: {
    ruleCount: number;
    uniqueAdjustedCount: number;
    rules: any[];
  };
  commercial_data: WorkCommercialData;
}

export type PlatformOS = 'windows' | 'android' | 'ios' | 'macos' | 'linux' | 'other';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  os: PlatformOS;
  osName: string;
  browserName: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWindows: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  deviceSummary: string;
  userAgent: string;
}


-- ==============================================================================
-- MIGRATION: 20260925_full_audit_compliance_schema.sql
-- PROJETO: GESTÃO E ACOMPANHAMENTO DE OBRAS - MONTEPLAN INCORPORADORA
-- CONFORMIDADE TOTAL COM O PROMPT DE AUDITORIA TÉCNICA E FUNCIONAL
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- PARTE 1: CADASTRO DA OBRA E FONTES
-- ==============================================================================

-- 1.1 Tabela de Obras (Works) - Caso não exista ou ajustando colunas
CREATE TABLE IF NOT EXISTS public.works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    erp_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    address TEXT,
    neighborhood VARCHAR(100),
    city_state VARCHAR(100),
    postal_code VARCHAR(20),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    engineer_name VARCHAR(255),
    manager_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(100),
    planned_start DATE NOT NULL,
    planned_end DATE NOT NULL,
    actual_start DATE,
    actual_end DATE,
    contract_value NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'pausada', 'concluida', 'cancelada')),
    progress_percent NUMERIC(7, 4) DEFAULT 0 NOT NULL,
    labor_enabled BOOLEAN DEFAULT true NOT NULL,
    total_units INT DEFAULT 0,
    units_sold INT DEFAULT 0,
    total_area_m2 NUMERIC(12, 2) DEFAULT 0,
    private_area_m2 NUMERIC(12, 2) DEFAULT 0,
    cub_reference_m2 NUMERIC(12, 2) DEFAULT 0,
    vgv_total NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.2 Perfis Comerciais da Obra (work_commercial_profiles)
CREATE TABLE IF NOT EXISTS public.work_commercial_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    sales_table_date DATE NOT NULL,
    vgv_nominal NUMERIC(15, 2) NOT NULL CHECK (vgv_nominal >= 0),
    price_per_m2 NUMERIC(12, 2) NOT NULL CHECK (price_per_m2 >= 0),
    total_units INT NOT NULL CHECK (total_units > 0),
    total_private_area_m2 NUMERIC(12, 2) NOT NULL CHECK (total_private_area_m2 > 0),
    total_constructed_area_m2 NUMERIC(12, 2),
    typology_summary JSONB,
    commercial_cycle_months INT NOT NULL DEFAULT 50,
    commercial_start_date DATE NOT NULL,
    commercial_end_date DATE NOT NULL,
    remaining_months_at_base INT,
    source_document VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_work_commercial_profiles UNIQUE (work_id)
);

-- 1.3 Marcos Contratuais e Conciliação de Prazos (work_milestones)
CREATE TABLE IF NOT EXISTS public.work_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('comercial', 'pco_planejado', 'cliente_contrato', 'carencia_legal', 'revisado')),
    title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE NOT NULL,
    duration_months INT,
    grace_period_days INT DEFAULT 0,
    difference_months_from_pco INT DEFAULT 0,
    purpose TEXT NOT NULL,
    is_active_baseline BOOLEAN DEFAULT true NOT NULL,
    source_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.4 Arquivos Fonte Armazenados (work_source_files)
CREATE TABLE IF NOT EXISTS public.work_source_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'work_imports',
    storage_path TEXT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_mime_type VARCHAR(100),
    sha256_hash VARCHAR(64),
    competency_date DATE NOT NULL,
    file_category VARCHAR(50) NOT NULL CHECK (file_category IN ('pco_planilha', 'erp_extrato', 'comercial', 'memorial', 'outro')),
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.5 Lotes de Importação Gerais (import_batches)
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    source_file_id UUID REFERENCES public.work_source_files(id) ON DELETE SET NULL,
    batch_type VARCHAR(50) NOT NULL CHECK (batch_type IN ('orcamento_pco', 'realizado_erp', 'de_para', 'comercial')),
    file_name VARCHAR(255) NOT NULL,
    competency_month DATE NOT NULL,
    records_processed INT NOT NULL DEFAULT 0,
    records_succeeded INT NOT NULL DEFAULT 0,
    records_failed INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'concluido' CHECK (status IN ('pendente', 'processando', 'concluido', 'com_erros', 'cancelado')),
    deduplication_key_rule VARCHAR(100) DEFAULT 'external_id_or_hash',
    import_summary JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.6 Arquivos do Lote (import_files)
CREATE TABLE IF NOT EXISTS public.import_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    sheet_name VARCHAR(100) NOT NULL,
    total_rows INT NOT NULL,
    header_row_index INT DEFAULT 1,
    detected_columns JSONB,
    column_mapping JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.7 Erros e Alertas de Importação (import_errors)
CREATE TABLE IF NOT EXISTS public.import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    row_number INT,
    raw_data JSONB,
    field_name VARCHAR(100),
    error_message TEXT NOT NULL,
    error_severity VARCHAR(20) DEFAULT 'erro' CHECK (error_severity IN ('alerta', 'erro', 'bloqueante')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.8 Logs de Auditoria do Sistema (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- PARTE 2: VERSÕES DO ORÇAMENTO
-- ==============================================================================

-- 2.1 Versões do Orçamento (budget_versions)
CREATE TABLE IF NOT EXISTS public.budget_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    version_type VARCHAR(50) NOT NULL DEFAULT 'inicial' CHECK (version_type IN ('inicial', 'revisao_incc', 'aditivo_escopo', 'replanejamento')),
    status VARCHAR(50) DEFAULT 'aprovada' CHECK (status IN ('rascunho', 'em_aprovacao', 'aprovada', 'arquivada')),
    is_current_approved BOOLEAN DEFAULT true NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    direct_cost_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    indirect_cost_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    base_date DATE NOT NULL,
    reason TEXT,
    source_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Grupos e Macrogrupos do Orçamento (budget_groups)
CREATE TABLE IF NOT EXISTS public.budget_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    cost_nature VARCHAR(30) NOT NULL CHECK (cost_nature IN ('direto', 'indireto')),
    order_index INT NOT NULL DEFAULT 1,
    weight_percent NUMERIC(7, 4) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Contas do Orçamento (budget_accounts) - Plano A
CREATE TABLE IF NOT EXISTS public.budget_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.budget_groups(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    group_etapa VARCHAR(255) NOT NULL,
    activity VARCHAR(255),
    subactivity VARCHAR(255),
    cost_type VARCHAR(20) NOT NULL CHECK (cost_type IN ('direto', 'indireto')),
    unit VARCHAR(30),
    quantity NUMERIC(14, 4) DEFAULT 0,
    unit_cost NUMERIC(15, 2) DEFAULT 0,
    budgeted_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    physical_weight_percent NUMERIC(7, 4) DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    sws_erp_account VARCHAR(255),
    cost_composition VARCHAR(100),
    original_row_number INT,
    source_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Componentes de Custo da Conta Orçamentária (budget_account_components)
CREATE TABLE IF NOT EXISTS public.budget_account_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_account_id UUID NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('material', 'mao_de_obra', 'equipamento', 'empreiteiro', 'outro')),
    description TEXT NOT NULL,
    unit VARCHAR(30),
    quantity NUMERIC(14, 4) DEFAULT 0,
    unit_rate NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    original_row_number INT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Cronograma Mensal Planejado (budget_plan_periods)
CREATE TABLE IF NOT EXISTS public.budget_plan_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_version_id UUID NOT NULL REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    competency_date DATE NOT NULL,
    planned_physical_percent NUMERIC(7, 4) DEFAULT 0,
    accumulated_planned_physical_percent NUMERIC(7, 4) DEFAULT 0,
    planned_financial_amount NUMERIC(15, 2) DEFAULT 0,
    accumulated_planned_financial_amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Medições Físicas Realizadas (budget_physical_measurements)
CREATE TABLE IF NOT EXISTS public.budget_physical_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    budget_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    measurement_competency DATE NOT NULL,
    import_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    measured_physical_percent_period NUMERIC(7, 4) DEFAULT 0,
    measured_physical_percent_accumulated NUMERIC(7, 4) NOT NULL DEFAULT 0,
    measured_quantity NUMERIC(14, 4) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado', 'revisado')),
    source_file_id UUID REFERENCES public.work_source_files(id) ON DELETE SET NULL,
    source_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 Histórico de Mudanças no Orçamento (budget_change_history)
CREATE TABLE IF NOT EXISTS public.budget_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_account_id UUID NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    from_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    to_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    field_modified VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    delta_amount NUMERIC(15, 2) DEFAULT 0,
    justification TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- PARTE 3: PLANO DE CONTAS DO ERP E DE-PARAS
-- ==============================================================================

-- 3.1 Contas do ERP (erp_accounts)
CREATE TABLE IF NOT EXISTS public.erp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    cost_account_code VARCHAR(100) NOT NULL,
    external_cost_account_id VARCHAR(100),
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'analitica' CHECK (account_type IN ('analitica', 'sintetica_totalizadora')),
    default_nature VARCHAR(50) NOT NULL CHECK (default_nature IN ('custo_obra', 'despesa_adm', 'despesa_comercial', 'receita', 'rendimento', 'transferencia', 'ajuste', 'pendente')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_erp_account_org_code UNIQUE (organization_id, cost_account_code)
);

-- 3.2 Segundo De-Para: Consolidação ERP Analítico -> ERP Totalizador
CREATE TABLE IF NOT EXISTS public.erp_account_consolidation_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    detailed_erp_account_code VARCHAR(100) NOT NULL,
    detailed_erp_account_name VARCHAR(255) NOT NULL,
    totalizer_erp_account_name VARCHAR(255) NOT NULL,
    totalizer_erp_account_code VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 Primeiro De-Para: Orçamento -> Conta SWS/ERP
CREATE TABLE IF NOT EXISTS public.budget_erp_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE,
    budget_account_code VARCHAR(50) NOT NULL,
    budget_account_name VARCHAR(255) NOT NULL,
    sws_erp_account_name VARCHAR(255) NOT NULL,
    sws_erp_account_code VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.4 Classificações Adicionais de Contas do ERP (erp_account_classifications)
CREATE TABLE IF NOT EXISTS public.erp_account_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    erp_account_id UUID REFERENCES public.erp_accounts(id) ON DELETE CASCADE,
    dre_category VARCHAR(100) NOT NULL,
    dre_subgroup VARCHAR(100),
    is_construction_cost BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- PARTE 4: VALORES REALIZADOS
-- ==============================================================================

-- 4.1 Lançamentos Financeiros Realizados do ERP (actual_financial_entries)
CREATE TABLE IF NOT EXISTS public.actual_financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    source_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    external_entry_id VARCHAR(100),
    company_unit VARCHAR(100),
    document_number VARCHAR(100),
    cost_account_code VARCHAR(100) NOT NULL,
    cost_account_external_id VARCHAR(100),
    cost_account_name VARCHAR(255) NOT NULL,
    cost_center VARCHAR(100),
    entry_date DATE NOT NULL,
    competency_date DATE,
    supplier_contractor_name VARCHAR(255),
    entry_description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    entry_type VARCHAR(50),
    treasury_account VARCHAR(100),
    history_text TEXT,
    grouping_code VARCHAR(100),
    adjusted_consolidated_account VARCHAR(255),
    nature_classification VARCHAR(50) NOT NULL DEFAULT 'custo_obra' CHECK (nature_classification IN ('custo_obra', 'despesa_adm', 'despesa_comercial', 'receita', 'rendimento', 'transferencia', 'ajuste', 'pendente')),
    original_row_number INT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_actual_entries_work ON public.actual_financial_entries(work_id);
CREATE INDEX IF NOT EXISTS idx_actual_entries_date ON public.actual_financial_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_actual_entries_cost_account ON public.actual_financial_entries(cost_account_name);
CREATE INDEX IF NOT EXISTS idx_actual_entries_adjusted_account ON public.actual_financial_entries(adjusted_consolidated_account);

-- 4.2 Classificações de Lançamentos Reais (actual_entry_classifications)
CREATE TABLE IF NOT EXISTS public.actual_entry_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.actual_financial_entries(id) ON DELETE CASCADE,
    classified_by UUID,
    nature VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4.3 Conciliação de Lançamentos Reais com Orçamento (actual_entry_reconciliation)
CREATE TABLE IF NOT EXISTS public.actual_entry_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.actual_financial_entries(id) ON DELETE CASCADE,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL,
    reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'conciliado' CHECK (reconciliation_status IN ('conciliado', 'parcial', 'sem_vinculo', 'divergente')),
    difference_amount NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4.4 Totais Mensais Consolidados por Conta (actual_entry_monthly_totals)
CREATE TABLE IF NOT EXISTS public.actual_entry_monthly_totals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    competency_month DATE NOT NULL,
    adjusted_account_name VARCHAR(255) NOT NULL,
    nature VARCHAR(50) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    records_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_monthly_totals UNIQUE (work_id, competency_month, adjusted_account_name, nature)
);

-- ==============================================================================
-- PARTE 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_commercial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_account_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_plan_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_physical_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_change_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.erp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_account_consolidation_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_erp_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_account_classifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.actual_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_entry_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_entry_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_entry_monthly_totals ENABLE ROW LEVEL SECURITY;

-- Políticas de Permissão para Usuários Autenticados
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'works', 'work_commercial_profiles', 'work_milestones', 'work_source_files',
            'import_batches', 'import_files', 'import_errors', 'audit_logs',
            'budget_versions', 'budget_groups', 'budget_accounts', 'budget_account_components',
            'budget_plan_periods', 'budget_physical_measurements', 'budget_change_history',
            'erp_accounts', 'erp_account_consolidation_mappings', 'budget_erp_mappings',
            'erp_account_classifications', 'actual_financial_entries', 'actual_entry_classifications',
            'actual_entry_reconciliation', 'actual_entry_monthly_totals'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'policy_auth_all_' || tbl, tbl);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', 'policy_auth_all_' || tbl, tbl);
    END LOOP;
END $$;

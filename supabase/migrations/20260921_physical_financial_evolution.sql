-- ==============================================================================
-- MIGRATION: EVOLUÇÃO DO ACOMPANHAMENTO FÍSICO E FINANCEIRO DE OBRAS
-- Versão: 20260921_physical_financial_evolution.sql
-- Implementa:
-- 1. Plano de contas do orçamento (Plano A - Hierárquico)
-- 2. Plano de contas do ERP (Plano B)
-- 3. De-para 1: Orçamento -> Conta do ERP
-- 4. De-para 2: Contas Detalhadas do ERP -> Conta Totalizadora do ERP
-- 5. Versionamento aberto e histórico de alterações do orçamento
-- 6. Acompanhamento físico ponderado e medições de campo
-- 7. Histórico e simulação de reajustes pelo INCC
-- 8. Row Level Security (RLS) e integridade referencial
-- ==============================================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Planos de Orçamento da Obra
CREATE TABLE IF NOT EXISTS public.budget_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_budget_plan_work UNIQUE (work_id, code)
);

-- 2. Contas do Orçamento (Plano A - Flexível e Hierárquico: Grupo, Etapa, Subetapa, Atividade)
CREATE TABLE IF NOT EXISTS public.budget_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_plan_id UUID REFERENCES public.budget_plans(id) ON DELETE CASCADE,
    budget_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE NOT NULL,
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- Ex: '01', '01.01', '02.01'
    description TEXT NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('grupo', 'etapa', 'subetapa', 'atividade')),
    display_order INTEGER DEFAULT 1 NOT NULL,
    unit VARCHAR(30), -- Ex: 'm²', 'm³', 'kg', 'un', 'mês'
    quantity NUMERIC(14, 4) DEFAULT 0 NOT NULL,
    unit_cost NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    planned_start DATE,
    planned_end DATE,
    physical_weight_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL CHECK (physical_weight_percent >= 0 AND physical_weight_percent <= 100),
    progress_planned NUMERIC(5, 2) DEFAULT 0 NOT NULL CHECK (progress_planned >= 0 AND progress_planned <= 100),
    progress_actual NUMERIC(5, 2) DEFAULT 0 NOT NULL CHECK (progress_actual >= 0 AND progress_actual <= 100),
    status VARCHAR(50) DEFAULT 'nao_iniciada' CHECK (status IN ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada', 'bloqueada', 'descontinuada')),
    is_totalizer BOOLEAN DEFAULT false NOT NULL,
    is_reajustavel_incc BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_accounts_version ON public.budget_accounts(budget_version_id);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_work ON public.budget_accounts(work_id);
CREATE INDEX IF NOT EXISTS idx_budget_accounts_parent ON public.budget_accounts(parent_id);

-- 3. Histórico de Alterações de Contas do Orçamento
CREATE TABLE IF NOT EXISTS public.budget_account_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Registro de Diferenças entre Versões do Orçamento (Version Diff)
CREATE TABLE IF NOT EXISTS public.budget_version_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE NOT NULL,
    to_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE NOT NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('adicionado', 'removido', 'descontinuado', 'alterado_valor', 'alterado_prazo', 'alterado_peso', 'reajuste_incc')),
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL,
    account_code VARCHAR(50) NOT NULL,
    account_description TEXT NOT NULL,
    details JSONB,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Plano de Contas do ERP (Plano B - Contas Analíticas e Sintéticas/Totalizadoras)
CREATE TABLE IF NOT EXISTS public.erp_cost_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    code VARCHAR(50) NOT NULL, -- Código no ERP, ex: '1.01.001', 'SAL-01'
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('mao_de_obra', 'material', 'equipamento', 'empreiteiro', 'indireto', 'encargo', 'imposto', 'outro')),
    is_totalizer BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_erp_account_org_code UNIQUE (organization_id, code)
);

-- 6. Primeiro De-para: Conta/Atividade do Orçamento para Conta de Custo do ERP
CREATE TABLE IF NOT EXISTS public.budget_to_erp_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE, -- NULL = regra global da organização
    budget_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE NOT NULL,
    erp_account_id UUID REFERENCES public.erp_cost_accounts(id) ON DELETE CASCADE NOT NULL,
    mapping_type VARCHAR(30) DEFAULT 'direto' CHECK (mapping_type IN ('direto', 'rateado', 'manual', 'nao_classificado')),
    apportionment_percent NUMERIC(5, 2) DEFAULT 100.00 NOT NULL CHECK (apportionment_percent >= 0 AND apportionment_percent <= 100),
    fixed_amount_rule NUMERIC(15, 2),
    valid_from DATE,
    valid_to DATE,
    priority INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Segundo De-para: Contas Detalhadas do ERP para Contas Totalizadoras do ERP
CREATE TABLE IF NOT EXISTS public.erp_to_budget_totalizer_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE, -- NULL = regra global
    budget_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE,
    detailed_erp_account_id UUID REFERENCES public.erp_cost_accounts(id) ON DELETE CASCADE NOT NULL,
    totalizer_erp_account_id UUID REFERENCES public.erp_cost_accounts(id) ON DELETE CASCADE NOT NULL,
    consolidated_category VARCHAR(50),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_different_erp_accounts CHECK (detailed_erp_account_id <> totalizer_erp_account_id)
);

-- 8. Regras Reutilizáveis de Mapeamento
CREATE TABLE IF NOT EXISTS public.mapping_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('regex_codigo', 'categoria_padrao', 'fornecedor_conta', 'centro_custo_etapa')),
    pattern_expression TEXT NOT NULL,
    target_erp_account_id UUID REFERENCES public.erp_cost_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Lotes de Importação de Mapeamentos De-para
CREATE TABLE IF NOT EXISTS public.mapping_import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    batch_type VARCHAR(50) NOT NULL CHECK (batch_type IN ('de_para_1', 'de_para_2', 'plano_orcamento', 'plano_erp')),
    file_name VARCHAR(255) NOT NULL,
    total_records INTEGER NOT NULL,
    imported_records INTEGER NOT NULL,
    error_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'concluido',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Medições de Avanço Físico do Engenheiro
CREATE TABLE IF NOT EXISTS public.physical_progress_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE NOT NULL,
    measurement_date DATE NOT NULL,
    progress_percent NUMERIC(5, 2) NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
    actual_start DATE,
    actual_end DATE,
    revised_planned_end DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada', 'bloqueada')),
    notes TEXT,
    evidence_urls TEXT[], -- Anexos de fotos / relatórios
    measured_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Histórico de Apontamentos Físicos
CREATE TABLE IF NOT EXISTS public.physical_progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID REFERENCES public.physical_progress_entries(id) ON DELETE CASCADE,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE NOT NULL,
    previous_percent NUMERIC(5, 2) NOT NULL,
    new_percent NUMERIC(5, 2) NOT NULL,
    reason TEXT,
    user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Reajustes Formais do Orçamento pelo INCC
CREATE TABLE IF NOT EXISTS public.budget_index_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    from_version_id UUID REFERENCES public.budget_versions(id) ON DELETE RESTRICT NOT NULL,
    to_version_id UUID REFERENCES public.budget_versions(id) ON DELETE RESTRICT NOT NULL,
    index_name VARCHAR(50) DEFAULT 'INCC-M' NOT NULL,
    index_rate_percent NUMERIC(6, 3) NOT NULL, -- Ex: 4.500%
    base_date_old DATE NOT NULL,
    base_date_new DATE NOT NULL,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('total_orcamento', 'apenas_a_executar', 'selecao_manual')),
    source_agency VARCHAR(255) DEFAULT 'FGV' NOT NULL,
    justification TEXT NOT NULL,
    total_base_amount NUMERIC(15, 2) NOT NULL,
    total_adjusted_amount NUMERIC(15, 2) NOT NULL,
    difference_amount NUMERIC(15, 2) NOT NULL,
    applied_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.budget_index_adjustment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_id UUID REFERENCES public.budget_index_adjustments(id) ON DELETE CASCADE NOT NULL,
    budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE CASCADE NOT NULL,
    old_unit_cost NUMERIC(15, 2) NOT NULL,
    new_unit_cost NUMERIC(15, 2) NOT NULL,
    old_total_amount NUMERIC(15, 2) NOT NULL,
    new_total_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'reajustado' CHECK (status IN ('reajustado', 'ignorado_concluido', 'ignorado_nao_reajustavel', 'excluido_manual'))
);

-- ==============================================================================
-- ATUALIZAÇÃO DA TABELA INCURRED_COSTS COM CADEIA DE RASTREABILIDADE
-- ==============================================================================
ALTER TABLE public.incurred_costs 
    ADD COLUMN IF NOT EXISTS erp_account_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS erp_account_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS budget_account_id UUID REFERENCES public.budget_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS mapping_status VARCHAR(30) DEFAULT 'classificado' CHECK (mapping_status IN ('classificado', 'pendente', 'rateado', 'revisar'));

-- ==============================================================================
-- ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_account_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_version_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_cost_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_to_erp_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_to_budget_totalizer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_index_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_index_adjustment_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura por Membro da Organização
CREATE POLICY "Leitura de planos de orcamento por membros" ON public.budget_plans
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Leitura de contas de orcamento por membros" ON public.budget_accounts
    FOR SELECT USING (
        work_id IN (SELECT id FROM public.works WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Leitura de contas ERP por membros" ON public.erp_cost_accounts
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Leitura de mapeamentos de-para 1 por membros" ON public.budget_to_erp_mappings
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Leitura de mapeamentos de-para 2 por membros" ON public.erp_to_budget_totalizer_mappings
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Leitura de medicoes fisicas por membros" ON public.physical_progress_entries
    FOR SELECT USING (
        work_id IN (SELECT id FROM public.works WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

-- Políticas de Escrita por Papel
-- Engenheiro e Gestor podem registrar avanço físico
CREATE POLICY "Engenheiros e gestores podem registrar progresso fisico" ON public.physical_progress_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'gestor', 'engenharia')
        )
    );

-- Apenas Admin e Gestor podem criar/aprovar versões e reajustes INCC
CREATE POLICY "Admin e gestor gerenciam ajustes de orcamento e INCC" ON public.budget_index_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'gestor')
        )
    );

-- Apenas Admin e Financeiro gerenciam regras de De-para do ERP
CREATE POLICY "Admin e financeiro gerenciam de-para ERP" ON public.budget_to_erp_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'financeiro')
        )
    );

CREATE POLICY "Admin e financeiro gerenciam consolidacao de-para 2" ON public.erp_to_budget_totalizer_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'financeiro')
        )
    );

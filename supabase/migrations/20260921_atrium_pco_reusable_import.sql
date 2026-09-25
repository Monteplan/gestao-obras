-- ==============================================================================
-- MIGRATION: 20260921_atrium_pco_reusable_import.sql
-- Descrição: Estruturas relacionais parametrizadas para Acompanhamento Físico-Financeiro,
--            motor universal de importação PCO, dados comerciais, tipologias e conciliação
--            de cronogramas (Comercial vs. Engenharia/PCO vs. Cliente).
-- ==============================================================================

-- 1. Tabela de Dados Comerciais do Empreendimento
CREATE TABLE IF NOT EXISTS public.work_commercial_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    sales_table_date DATE NOT NULL,
    vgv_total NUMERIC(15, 2) NOT NULL CHECK (vgv_total >= 0),
    average_price_m2 NUMERIC(15, 2) NOT NULL CHECK (average_price_m2 >= 0),
    total_private_area_m2 NUMERIC(15, 2) NOT NULL CHECK (total_private_area_m2 > 0),
    total_units INT NOT NULL CHECK (total_units > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_commercial UNIQUE (work_id)
);

-- 2. Tabela de Tipologias das Unidades Autônomas
CREATE TABLE IF NOT EXISTS public.work_typologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    unit_count INT NOT NULL CHECK (unit_count > 0),
    private_area_m2 NUMERIC(10, 2) NOT NULL CHECK (private_area_m2 > 0),
    subtotal_area_m2 NUMERIC(12, 2) NOT NULL CHECK (subtotal_area_m2 > 0),
    bedrooms INT DEFAULT 0,
    suites INT DEFAULT 0,
    parking_spots INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Conciliação de Cronogramas Lado a Lado
CREATE TABLE IF NOT EXISTS public.work_schedule_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    commercial_start DATE NOT NULL,
    commercial_end DATE NOT NULL,
    commercial_duration_months INT NOT NULL,
    commercial_remaining_months INT NOT NULL,
    pco_start DATE NOT NULL,
    pco_end DATE NOT NULL,
    pco_duration_months INT NOT NULL,
    client_contract_end DATE NOT NULL,
    client_grace_period_months INT NOT NULL DEFAULT 6,
    client_contract_limit DATE NOT NULL,
    divergence_months INT NOT NULL DEFAULT 0,
    alert_status VARCHAR(20) NOT NULL DEFAULT 'ok' CHECK (alert_status IN ('ok', 'warning', 'divergent')),
    effective_schedule_choice VARCHAR(20) NOT NULL DEFAULT 'pco' CHECK (effective_schedule_choice IN ('comercial', 'pco', 'cliente')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_schedule_rec UNIQUE (work_id)
);

-- 4. Tabela de Perfis de Importação PCO (Mapeamento Reutilizável por Obra)
CREATE TABLE IF NOT EXISTS public.pco_import_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    sheet_names JSONB NOT NULL DEFAULT '{
        "macro": "PLANEJAMENTO MACRO",
        "indirects": "% INDIRETOS",
        "directs": "% DIRETOS",
        "budget": "BASE ORÇAMENTO",
        "real": "REAL",
        "de_para": "de-para"
    }'::jsonb,
    header_rows JSONB NOT NULL DEFAULT '{
        "macro": 1,
        "indirects": 5,
        "directs": 5,
        "budget": 1,
        "real": 1,
        "de_para": 1
    }'::jsonb,
    last_file_name VARCHAR(255),
    last_imported_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_pco_profile UNIQUE (work_id)
);

-- 5. Tabela de Lotes de Importação PCO (Auditoria e Rastreabilidade)
CREATE TABLE IF NOT EXISTS public.pco_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    imported_by VARCHAR(100),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accumulated_physical_progress NUMERIC(7, 4) NOT NULL,
    total_budget NUMERIC(15, 2) NOT NULL,
    real_record_count INT NOT NULL,
    real_total_spent NUMERIC(15, 2) NOT NULL,
    de_para_rule_count INT NOT NULL,
    raw_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_work_commercial_work_id ON public.work_commercial_data(work_id);
CREATE INDEX IF NOT EXISTS idx_work_typologies_work_id ON public.work_typologies(work_id);
CREATE INDEX IF NOT EXISTS idx_pco_import_batches_work_id ON public.pco_import_batches(work_id);
CREATE INDEX IF NOT EXISTS idx_pco_import_batches_imported_at ON public.pco_import_batches(imported_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - ISOLAMENTO MULTI-TENANT
-- ==============================================================================
ALTER TABLE public.work_commercial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_typologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedule_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pco_import_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pco_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a dados comerciais por organizacao da obra"
    ON public.work_commercial_data FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = work_commercial_data.work_id
              AND w.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    );

CREATE POLICY "Acesso a tipologias por organizacao da obra"
    ON public.work_typologies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = work_typologies.work_id
              AND w.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    );

CREATE POLICY "Acesso a conciliacao de cronogramas por organizacao da obra"
    ON public.work_schedule_reconciliations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = work_schedule_reconciliations.work_id
              AND w.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    );

CREATE POLICY "Acesso a perfis PCO por organizacao da obra"
    ON public.pco_import_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = pco_import_profiles.work_id
              AND w.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    );

CREATE POLICY "Acesso a lotes PCO por organizacao da obra"
    ON public.pco_import_batches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.works w
            WHERE w.id = pco_import_batches.work_id
              AND w.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    );

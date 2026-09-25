-- ==============================================================================
-- SCHEMA INICIAL DO SISTEMA DE GESTÃO E ACOMPANHAMENTO DE OBRAS
-- PostgreSQL / Supabase com Row Level Security (RLS)
-- ==============================================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Empresas / Construtoras (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Perfis de Usuário vinculados ao Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'compras', 'financeiro', 'engenharia', 'consulta')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Obras
CREATE TABLE IF NOT EXISTS public.works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT NOT NULL,
    code VARCHAR(50) NOT NULL,
    erp_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    client VARCHAR(255) NOT NULL,
    address TEXT,
    city_state VARCHAR(100),
    project_type VARCHAR(100),
    manager_name VARCHAR(255) NOT NULL,
    planned_start DATE NOT NULL,
    planned_end DATE NOT NULL,
    actual_start DATE,
    actual_end DATE,
    contract_value NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'pausada', 'concluida', 'cancelada')),
    progress_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    labor_enabled BOOLEAN DEFAULT true NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_work_code_org UNIQUE (organization_id, code)
);

-- 4. Etapas e Subetapas da Obra (EAP)
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.stages(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    responsible VARCHAR(255),
    order_index INTEGER DEFAULT 1 NOT NULL,
    weight_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    planned_start DATE NOT NULL,
    planned_end DATE NOT NULL,
    actual_start DATE,
    actual_end DATE,
    progress_planned NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    progress_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'nao_iniciada' CHECK (status IN ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada', 'bloqueada')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Versões de Orçamento
CREATE TABLE IF NOT EXISTS public.budget_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'revisada', 'aprovada')),
    is_current_approved BOOLEAN DEFAULT false NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Itens Orçamentários
CREATE TABLE IF NOT EXISTS public.budget_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_version_id UUID REFERENCES public.budget_versions(id) ON DELETE CASCADE NOT NULL,
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
    cost_group VARCHAR(50) NOT NULL CHECK (cost_group IN ('material', 'mao_de_obra', 'equipamento', 'empreiteiro', 'indireto', 'outro')),
    cost_center VARCHAR(50),
    item_code VARCHAR(50),
    description TEXT NOT NULL,
    supplier_name VARCHAR(255),
    unit VARCHAR(20) NOT NULL,
    quantity_planned NUMERIC(12, 4) NOT NULL,
    unit_cost_planned NUMERIC(15, 2) NOT NULL,
    total_planned NUMERIC(15, 2) NOT NULL,
    is_direct_cost BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Requisições de Compra
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    internal_number VARCHAR(50) NOT NULL,
    erp_code VARCHAR(100),
    requester_name VARCHAR(255) NOT NULL,
    request_date DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'media',
    justification TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'enviada' CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'rejeitada', 'parcialmente_atendida', 'atendida', 'cancelada')),
    total_estimated NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Pedidos de Compra
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    requisition_id UUID REFERENCES public.purchase_requisitions(id) ON DELETE SET NULL,
    internal_number VARCHAR(50) NOT NULL,
    erp_code VARCHAR(100),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_cnpj VARCHAR(20),
    cost_center VARCHAR(50),
    order_date DATE NOT NULL,
    delivery_forecast DATE NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'enviado' CHECK (status IN ('rascunho', 'aprovado', 'enviado', 'parcialmente_recebido', 'recebido', 'atrasado', 'cancelado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Recebimentos Físicos / Fiscais (NFs)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    receipt_date DATE NOT NULL,
    received_value NUMERIC(15, 2) NOT NULL,
    is_partial BOOLEAN DEFAULT false NOT NULL,
    discrepancies TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Custos Incorridos (Extrato Financeiro do ERP / Recebimentos)
CREATE TABLE IF NOT EXISTS public.incurred_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
    external_id VARCHAR(100),
    document_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    cost_center VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    description TEXT,
    gross_value NUMERIC(15, 2) NOT NULL,
    discounts NUMERIC(15, 2) DEFAULT 0,
    taxes NUMERIC(15, 2) DEFAULT 0,
    net_value NUMERIC(15, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pago',
    source_batch_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Receitas e Faturamento da Obra
CREATE TABLE IF NOT EXISTS public.revenues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    external_id VARCHAR(100),
    document_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    contracted_value NUMERIC(15, 2) NOT NULL,
    recognized_value NUMERIC(15, 2) NOT NULL,
    received_value NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'faturado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Mão de Obra e Apontamentos
CREATE TABLE IF NOT EXISTS public.labor_people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role_function VARCHAR(100) NOT NULL,
    team_contractor VARCHAR(100),
    rate_type VARCHAR(20) DEFAULT 'hora' CHECK (rate_type IN ('hora', 'dia')),
    unit_rate NUMERIC(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.labor_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES public.works(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL,
    person_id UUID REFERENCES public.labor_people(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    activity_description TEXT NOT NULL,
    units_worked NUMERIC(6, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    total_calculated NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'enviado' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Lotes de Importação do ERP
CREATE TABLE IF NOT EXISTS public.erp_import_batches (
    id VARCHAR(100) PRIMARY KEY,
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    deduplication_strategy VARCHAR(50) NOT NULL,
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    updated_rows INTEGER NOT NULL,
    ignored_rows INTEGER NOT NULL,
    rejected_rows INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incurred_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_entries ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Geral por Membro da Organização
CREATE POLICY "Membros da organizacao podem ler obras" ON public.works
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Gestores e Admins podem editar obras" ON public.works
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND organization_id = works.organization_id
            AND role IN ('admin', 'gestor')
        )
    );

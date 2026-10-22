-- ==============================================================================
-- CORREÇÃO DE POLÍTICA RLS NO SUPABASE PARA PERMITIR IMPORTAÇÃO ERP E MEDIÇÕES
-- Erro resolvido: "new row violates row-level security policy for table actual_financial_entries"
-- Projeto: Monteplan Obras (tbheqfvcfpzbppcuvlyr)
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do Supabase: https://supabase.com/dashboard/project/tbheqfvcfpzbppcuvlyr
-- 2. Acesse "SQL Editor" no menu lateral esquerdo.
-- 3. Cole o código abaixo e clique no botão verde "Run".
-- ==============================================================================

-- 1. Tabela: actual_financial_entries (Lançamentos Contábeis Reais do ERP)
DROP POLICY IF EXISTS "allow_anon_all_actual_financial_entries" ON public.actual_financial_entries;
DROP POLICY IF EXISTS "policy_anon_insert_actual_financial_entries" ON public.actual_financial_entries;
DROP POLICY IF EXISTS "policy_anon_select_actual_financial_entries" ON public.actual_financial_entries;

CREATE POLICY "allow_anon_all_actual_financial_entries"
ON public.actual_financial_entries
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Tabela: import_batches (Lotes de Importação)
DROP POLICY IF EXISTS "allow_anon_all_import_batches" ON public.import_batches;

CREATE POLICY "allow_anon_all_import_batches"
ON public.import_batches
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Tabela: erp_account_consolidation_mappings (Regras de De-Para de Contas)
DROP POLICY IF EXISTS "allow_anon_all_erp_mappings" ON public.erp_account_consolidation_mappings;

CREATE POLICY "allow_anon_all_erp_mappings"
ON public.erp_account_consolidation_mappings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Tabela: works (Atualização cadastral e avanço ponderado da obra)
DROP POLICY IF EXISTS "allow_anon_all_works" ON public.works;

CREATE POLICY "allow_anon_all_works"
ON public.works
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Tabela: stages (Atualização de progresso das etapas e subetapas)
DROP POLICY IF EXISTS "allow_anon_all_stages" ON public.stages;

CREATE POLICY "allow_anon_all_stages"
ON public.stages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Tabela: audit_logs (Trilha de auditoria das ações)
DROP POLICY IF EXISTS "allow_anon_all_audit_logs" ON public.audit_logs;

CREATE POLICY "allow_anon_all_audit_logs"
ON public.audit_logs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Confirmação do status das políticas
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('actual_financial_entries', 'import_batches', 'erp_account_consolidation_mappings', 'works', 'stages', 'audit_logs');

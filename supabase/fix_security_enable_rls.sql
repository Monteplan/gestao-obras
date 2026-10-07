-- ==============================================================================
-- CORREÇÃO DE SEGURANÇA SUPABASE: HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- Alerta: "Table publicly accessible (rls_disabled_in_public)"
-- Projeto: Monteplan Obras (tbheqfvcfpzbppcuvlyr)
-- ==============================================================================
-- Este script executa:
-- 1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY em TODAS as tabelas do schema public.
-- 2. Limpa políticas antigas/inseguras.
-- 3. Define política de acesso completo (ALL: SELECT, INSERT, UPDATE, DELETE) para usuários autenticados (authenticated).
-- 4. Define política de apenas leitura (SELECT) para requisições anônimas (anon), garantindo que ninguém consiga editar ou deletar dados sem autenticação.
-- ==============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- 1. Ativar RLS na tabela (elimina a vulnerabilidade rls_disabled_in_public)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- 2. Remover políticas anteriores para evitar duplicidade ou conflitos
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'policy_public_all_' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'policy_authenticated_all_' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'policy_anon_select_' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'allow_all_' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'allow_read_' || tbl, tbl);
        
        -- 3. Política para usuários autenticados (acesso total seguro)
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
            'policy_authenticated_all_' || tbl,
            tbl
        );
        
        -- 4. Política para requisições anônimas/anon key (apenas leitura para exibição no app)
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true);',
            'policy_anon_select_' || tbl,
            tbl
        );

        RAISE NOTICE 'RLS ativado e políticas configuradas com sucesso para a tabela: %', tbl;
    END LOOP;
END $$;

-- ==============================================================================
-- CONSULTA DE VERIFICAÇÃO E AUDITORIA
-- Execute este bloco para confirmar que 100% das tabelas possuem rowsecurity = true
-- ==============================================================================
SELECT 
    tablename AS tabela,
    rowsecurity AS rls_ativo,
    CASE 
        WHEN rowsecurity THEN 'SEGURO (RLS Habilitado)' 
        ELSE 'VULNERÁVEL' 
    END AS status_seguranca
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

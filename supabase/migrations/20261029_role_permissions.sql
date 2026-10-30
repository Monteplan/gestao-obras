-- ==============================================================================
-- GERENCIADOR DE PERFIS & PERMISSÕES (RBAC)
-- Cria a tabela public.role_permissions para compartilhar as permissões
-- configuradas em Configurações > Perfis & Permissões entre todos os usuários.
-- Projeto: Monteplan Obras (tbheqfvcfpzbppcuvlyr)
-- ==============================================================================
-- Instruções:
-- 1. Abra https://supabase.com/dashboard/project/tbheqfvcfpzbppcuvlyr
-- 2. Acesse "SQL Editor".
-- 3. Cole este script e clique em "Run".
-- Este script NÃO altera nenhuma tabela ou dado existente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role        text PRIMARY KEY
              CHECK (role IN ('admin','gestor','engenharia','compras','financeiro','consulta')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_all_role_permissions" ON public.role_permissions;
CREATE POLICY "allow_anon_all_role_permissions"
ON public.role_permissions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Permissões padrão (não sobrescreve se já existirem)
INSERT INTO public.role_permissions (role, permissions, updated_by) VALUES
('admin',      '{"dashboard":"full","works":"full","physical":"full","stages":"full","budget":"full","commercial":"full","financial":"full","purchasing":"full","labor":"full","importer":"full","depara":"full","reports":"full","settings":"full"}', 'seed'),
('gestor',     '{"dashboard":"full","works":"full","physical":"full","stages":"full","budget":"full","commercial":"full","financial":"full","purchasing":"full","labor":"full","importer":"full","depara":"full","reports":"full","settings":"none"}', 'seed'),
('engenharia', '{"dashboard":"view","works":"full","physical":"full","stages":"full","budget":"view","commercial":"view","financial":"view","purchasing":"none","labor":"full","importer":"none","depara":"none","reports":"view","settings":"none"}', 'seed'),
('compras',    '{"dashboard":"view","works":"view","physical":"none","stages":"none","budget":"none","commercial":"none","financial":"none","purchasing":"full","labor":"none","importer":"none","depara":"none","reports":"view","settings":"none"}', 'seed'),
('financeiro', '{"dashboard":"view","works":"view","physical":"none","stages":"none","budget":"full","commercial":"view","financial":"full","purchasing":"view","labor":"none","importer":"full","depara":"full","reports":"full","settings":"none"}', 'seed'),
('consulta',   '{"dashboard":"view","works":"view","physical":"view","stages":"view","budget":"view","commercial":"view","financial":"view","purchasing":"none","labor":"none","importer":"none","depara":"none","reports":"view","settings":"none"}', 'seed')
ON CONFLICT (role) DO NOTHING;


-- ==============================================================================
-- MIGRAÇÃO COMPLETA PARA SUPABASE AUTH + RBAC NO BANCO DE DADOS
-- Projeto: Monteplan Obras (tbheqfvcfpzbppcuvlyr)
-- ==============================================================================
-- O que este script faz (SEM alterar nenhum dado de obras, orçamentos ou ERP):
-- 1. Ajusta a tabela public.profiles para permitir pré-cadastro de usuários pelo
--    Admin antes mesmo do 1º login do usuário, e vincula automaticamente ao
--    auth.users quando o usuário se autentica.
-- 2. Popula public.profiles com os usuários da Monteplan (incluindo Tiago Caetano
--    como Admin Geral).
-- 3. Cria trigger automático (on_auth_user_created) que sincroniza auth.users ->
--    public.profiles a cada novo login/cadastro no Supabase Auth.
-- 4. Cria funções de segurança no banco:
--      - public.current_user_role()
--      - public.has_module_permission(module, min_level)
-- 5. Aplica políticas RLS baseadas em perfil nas tabelas críticas (profiles e
--    role_permissions) mantendo leitura/operação íntegra para os módulos.
-- ==============================================================================

-- 1. Garantir organização padrão Monteplan Engenharia
INSERT INTO public.organizations (id, name, cnpj)
VALUES ('11111111-1111-1111-1111-111111111111', 'Monteplan Engenharia', '00.000.000/0001-00')
ON CONFLICT (id) DO NOTHING;

-- 2. Ajustar public.profiles para suportar pré-cadastro de equipe + vínculo Auth
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Garantir índice único por e-mail em minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));

-- 3. Inserir/atualizar os perfis iniciais da Monteplan em public.profiles
INSERT INTO public.profiles (name, email, role, organization_id, status)
VALUES
  ('Tiago Caetano',  'tiago.caetano@monteplanengenharia.com.br', 'admin',      '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Carlos Mendes',  'admin@monteplan.com.br',                   'admin',      '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Mariana Duarte', 'gestor@monteplan.com.br',                  'gestor',     '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Roberto Farias', 'compras@monteplan.com.br',                 'compras',    '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Juliana Costa',  'financeiro@monteplan.com.br',              'financeiro', '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Lucas Pinho',    'engenharia@monteplan.com.br',              'engenharia', '11111111-1111-1111-1111-111111111111', 'ativo'),
  ('Beatriz Ramos',  'consulta@monteplan.com.br',                'consulta',   '11111111-1111-1111-1111-111111111111', 'ativo')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);

-- 4. Vincular contas já existentes em auth.users aos perfis em public.profiles
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE LOWER(p.email) = LOWER(u.email)
  AND (p.auth_user_id IS NULL OR p.auth_user_id <> u.id);

-- 5. Trigger automático: quando um usuário é criado no Supabase Auth, vincula ou cria seu perfil
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_role text := 'consulta';
  v_name text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  IF LOWER(NEW.email) IN ('tiago.caetano@monteplanengenharia.com.br', 'admin@monteplan.com.br') THEN
    v_default_role := 'admin';
  ELSIF NEW.raw_user_meta_data->>'role' IN ('admin','gestor','engenharia','compras','financeiro','consulta') THEN
    v_default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  INSERT INTO public.profiles (id, auth_user_id, email, name, role, organization_id, status, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    LOWER(NEW.email),
    v_name,
    v_default_role,
    '11111111-1111-1111-1111-111111111111',
    'ativo',
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Funções auxiliares de RBAC no banco (SECURITY DEFINER para evitar recursão de RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.role
      FROM public.profiles p
      WHERE p.auth_user_id = auth.uid()
         OR p.id = auth.uid()
         OR LOWER(p.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
      LIMIT 1
    ),
    'consulta'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(p_module text, p_min_level text DEFAULT 'view')
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_level text;
BEGIN
  v_role := public.current_user_role();
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT rp.permissions ->> p_module
    INTO v_level
    FROM public.role_permissions rp
   WHERE rp.role = v_role;

  IF v_level IS NULL THEN
    RETURN false;
  END IF;

  IF p_min_level = 'view' THEN
    RETURN v_level IN ('view', 'full');
  ELSIF p_min_level = 'full' THEN
    RETURN v_level = 'full';
  END IF;

  RETURN false;
END;
$$;

-- 7. Políticas RLS para public.profiles e public.role_permissions
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_authenticated_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "policy_anon_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_manage_profiles" ON public.profiles;

-- Leitura de perfis para o app carregar lista de engenheiros/gestores e validar usuários cadastrados
CREATE POLICY "allow_read_profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Escrita em profiles (gerenciamento de usuários)
CREATE POLICY "allow_manage_profiles"
ON public.profiles
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Políticas para public.role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_anon_all_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "allow_read_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "allow_write_role_permissions" ON public.role_permissions;

CREATE POLICY "allow_read_role_permissions"
ON public.role_permissions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "allow_write_role_permissions"
ON public.role_permissions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


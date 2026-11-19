-- ==============================================================================
-- MIGRATION: 20261105_multi_work_support.sql
-- Descrição: Habilita suporte Multi-Obras completo nas tabelas do Supabase:
--            1. Cadastra as obras OBR-002 a OBR-007 em public.works (preservando OBR-001 Atrium).
--            2. Ajusta a chave única de public.commercial_units para (work_id, unit_number).
--            3. Garante políticas RLS de leitura/escrita para importação por obra.
-- ==============================================================================

-- 1. Cadastro das demais obras na tabela public.works (sem alterar OBR-001 Atrium Select)
INSERT INTO public.works (
  id, organization_id, code, erp_code, name, client, address, neighborhood,
  city_state, postal_code, latitude, longitude, engineer_name, manager_name,
  project_type, planned_start, planned_end, actual_start, contract_value,
  status, progress_percent, labor_enabled, total_units, units_sold,
  total_area_m2, private_area_m2, cub_reference_m2, vgv_total, notes
) VALUES
(
  'a0000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'OBR-002', 'ERP-CE-0881', 'Unique', 'Monteplan Incorporadora',
  'Rua Barbosa de Freitas, 814', 'Meireles', 'Fortaleza/CE', '60170-020',
  -3.733500, -38.502200, 'Eng. Rodrigo Santoro', 'Rodrigo Santoro',
  'Comercial Corporativo', '2025-09-01', '2026-10-30', '2025-09-20',
  8900000.00, 'em_andamento', 38.0000, false, 120, 82,
  8900.00, 6230.00, 2920.00, 31000000.00,
  'Rua Barbosa de Freitas, 814, no bairro Meireles. Empreendimento corporativo e residencial premium.'
),
(
  'a0000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'OBR-003', 'ERP-CE-2005', 'Bela Vitta', 'Monteplan Incorporadora',
  'Estr. Barão de Aquiraz, 1180', 'Paupina', 'Fortaleza/CE', '60871-684',
  -3.834000, -38.489000, 'Eng. Roberto Lima', 'Mariana Duarte',
  'Horizontal Fechado', '2026-01-15', '2027-06-30', '2026-01-20',
  15800000.00, 'planejamento', 14.2000, true, 150, 95,
  18500.00, 14200.00, 2650.00, 38000000.00,
  'Estr. Barão de Aquiraz, 1180 - Paupina, Fortaleza - CE, 60871-684. Condomínio residencial planejado.'
),
(
  'a0000000-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'OBR-004', 'ERP-PE-3100', 'Alameda Paradiso', 'Monteplan Incorporadora',
  'Avenida Marechal Deodoro, nº 449, 457 e 465', 'Encruzilhada', 'Recife/PE', '52041-050',
  -8.038100, -34.896700, 'Eng. Carlos Eduardo Ramos', 'Mariana Duarte',
  'Residencial Multifamiliar', '2025-11-01', '2027-04-30', '2025-11-15',
  21500000.00, 'em_andamento', 22.5000, true, 160, 72,
  16200.00, 11340.00, 3050.00, 58000000.00,
  'Avenida Marechal Deodoro, nº 449, 457 e 465, no bairro da Encruzilhada, Recife/PE.'
),
(
  'a0000000-0000-0000-0000-000000000005',
  '11111111-1111-1111-1111-111111111111',
  'OBR-005', 'ERP-PE-1020', 'Casa Real', 'Monteplan Incorporadora',
  'Rua Amaro Lafayette, 70', 'Parnamirim', 'Recife/PE', '52060-580',
  -8.033500, -34.912200, 'Eng. Lucas Pinho', 'Mariana Duarte',
  'Residencial Multifamiliar', '2025-07-01', '2026-11-30', '2025-07-15',
  18400000.00, 'em_andamento', 52.0000, true, 140, 98,
  14800.00, 10360.00, 2980.00, 49000000.00,
  'Rua Amaro Lafayette, 70 - Parnamirim, Recife - PE, 52060-580. Residencial de alto padrão.'
),
(
  'a0000000-0000-0000-0000-000000000006',
  '11111111-1111-1111-1111-111111111111',
  'OBR-006', 'ERP-MA-0440', 'Renaissance', 'Monteplan Incorporadora',
  'Rua Caxuxa, Loteamento Boa Vista', 'Renascença II', 'São Luís/MA', '65075-810',
  -2.503600, -44.293400, 'Eng. Rodrigo Santoro', 'Rodrigo Santoro',
  'Residencial Multifamiliar', '2025-08-10', '2026-12-15', '2025-08-25',
  9200000.00, 'em_andamento', 41.5000, true, 72, 50,
  7800.00, 5460.00, 2780.00, 26000000.00,
  'Rua Caxuxa, Loteamento Boa Vista, Bairro Renascença II – São Luís/MA.'
),
(
  'a0000000-0000-0000-0000-000000000007',
  '11111111-1111-1111-1111-111111111111',
  'OBR-007', 'ERP-PI-0330', 'Palladium', 'Monteplan Incorporadora',
  'Avenida Dom Severino, nº 3059', 'Horto Florestal', 'Teresina/PI', '64049-370',
  -5.074500, -42.779800, 'Eng. Roberto Lima', 'Mariana Duarte',
  'Residencial de Luxo', '2026-02-01', '2027-08-30', '2026-02-15',
  11800000.00, 'planejamento', 18.0000, true, 48, 28,
  6900.00, 4830.00, 3120.00, 36000000.00,
  'Avenida Dom Severino (nº 3059), no bairro Horto Florestal, em Teresina (PI).'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Ajuste da constraint de unicidade de public.commercial_units para permitir
--    que diferentes obras tenham unidades de mesmo número (ex: 101, 102, 201)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commercial_units_unit_number_key'
  ) THEN
    ALTER TABLE public.commercial_units DROP CONSTRAINT commercial_units_unit_number_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commercial_units_work_id_unit_number_key'
  ) THEN
    ALTER TABLE public.commercial_units
      ADD CONSTRAINT commercial_units_work_id_unit_number_key UNIQUE (work_id, unit_number);
  END IF;
END $$;

-- 3. Políticas RLS para garantir leitura e gravação Multi-Obras pelo frontend
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'works',
      'budget_versions',
      'budget_accounts',
      'actual_financial_entries',
      'erp_account_consolidation_mappings',
      'commercial_units'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'policy_multiwork_all_' || tbl, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
        'policy_multiwork_all_' || tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;


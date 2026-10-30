-- ==============================================================================
-- TABELA COMERCIAL UNIFICADA (RELATÓRIO GERAL DE VENDAS & UNIDADES ERP)
-- Projeto: Monteplan Obras (tbheqfvcfpzbppcuvlyr)
-- Origem: vendasgeral.xlsx (80 unidades completas do Edifício Atrium Select)
-- ==============================================================================

DROP TABLE IF EXISTS public.commercial_sales;
DROP TABLE IF EXISTS public.commercial_units;

CREATE TABLE IF NOT EXISTS public.commercial_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id TEXT NOT NULL DEFAULT 'work-1',
  de_emp TEXT NOT NULL DEFAULT 'Atrium Sellect',
  de_uni TEXT NOT NULL,
  unit_number TEXT UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  area_m2 NUMERIC(12, 2) NOT NULL DEFAULT 49,
  de_sta TEXT NOT NULL,
  cd_cnt TEXT,
  dt_cnt DATE,
  vl_cnt NUMERIC(15, 2) NOT NULL DEFAULT 0,
  rz_scl TEXT,
  de_frm_rea TEXT,
  nm_ind_rea_cns TEXT,
  nm_ind_rea_hab TEXT,
  pc_jrs_hab NUMERIC(8, 2) NOT NULL DEFAULT 0,
  dt_prv_ent DATE,
  dt_rea_ent DATE,
  pc_pgt NUMERIC(8, 2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo NUMERIC(15, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_commercial_units" ON public.commercial_units;
CREATE POLICY "allow_all_commercial_units"
ON public.commercial_units
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.commercial_units (
  work_id, de_emp, de_uni, unit_number, floor, area_m2, de_sta, cd_cnt, dt_cnt, vl_cnt,
  rz_scl, de_frm_rea, nm_ind_rea_cns, nm_ind_rea_hab, pc_jrs_hab, dt_prv_ent, dt_rea_ent,
  pc_pgt, valor_pago, saldo
) VALUES
  ('work-1', 'Atrium Sellect', '101', '101', 1, 72, 'CONTRATADA', 'xx', '2026-10-02', 1000000, 'LUCIANA MOTA ARAGAO', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 0, 1000000),
  ('work-1', 'Atrium Sellect', '102', '102', 1, 49, 'VENDIDA', 'AT0102', '2023-09-29', 480346.9, 'RAFAEL ALVES BATISTA', '2 Meses', 'INCC', 'IGPM', 0.95, NULL, NULL, 0, 116359.92, 424186.33),
  ('work-1', 'Atrium Sellect', '103', '103', 1, 49, 'CONTRATADA', 'AT0103', '2026-10-08', 720568.24, 'LUCIANA MOTA ARAGAO', NULL, 'REAL', 'IGPM', 1, '2028-01-30', NULL, 100, 0, 720568.24),
  ('work-1', 'Atrium Sellect', '104', '104', 1, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1056433.16),
  ('work-1', 'Atrium Sellect', '201', '201', 2, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1063360.58),
  ('work-1', 'Atrium Sellect', '202', '202', 2, 49, 'VENDIDA', 'AT0202', '2025-07-29', 620000, 'NICHOLAS ANDRE PINHO DE OLIVEIRA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 180258.55, 484914.69),
  ('work-1', 'Atrium Sellect', '203', '203', 2, 49, 'VENDIDA', 'AT0203', '2026-05-19', 681000, 'ANDREZA FACANHA DE CASTRO', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 169626.35, 533389.75),
  ('work-1', 'Atrium Sellect', '204', '204', 2, 72, 'VENDIDA', 'AT0204', '2024-11-05', 878100.2, 'ANTONIA VIVIAN BRENNA LIMA SCARCELA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 219983.04, 759427.3),
  ('work-1', 'Atrium Sellect', '301', '301', 3, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1069133.45),
  ('work-1', 'Atrium Sellect', '302', '302', 3, 49, 'VENDIDA', 'AT0302', '2026-02-04', 620200, 'MONIQUE BRAGA ALVES TEIXEIRA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 116148.42, 534881.12),
  ('work-1', 'Atrium Sellect', '303', '303', 3, 49, 'VENDIDA', 'AT0303', '2023-11-09', 523000, 'DIOGO NAZARENO ALMEIDA DE MELO', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 128890.76, 454012.5),
  ('work-1', 'Atrium Sellect', '304', '304', 3, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1069133.45),
  ('work-1', 'Atrium Sellect', '401', '401', 4, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1104347.89),
  ('work-1', 'Atrium Sellect', '402 QUITADO', '402', 4, 49, 'VENDIDA', 'AT0402', '2024-07-23', 560000, 'CESSAO - EYMARD RICARDINO PEREIRA KZAN', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 577830.71, 0),
  ('work-1', 'Atrium Sellect', '403', '403', 4, 49, 'VENDIDA', 'AT0403', '2024-08-02', 560000, 'CICERO DOS SANTOS ROCHA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 376822.2, 229128),
  ('work-1', 'Atrium Sellect', '404', '404', 4, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1104347.89),
  ('work-1', 'Atrium Sellect', '501', '501', 5, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1114739.03),
  ('work-1', 'Atrium Sellect', '502', '502', 5, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 750587.1),
  ('work-1', 'Atrium Sellect', '503', '503', 5, 49, 'CONTRATADA', 'AT0503', '2026-08-20', 696815.04, 'GUSTAVO DE PAULA CARDIANLI', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 0, 696815.04),
  ('work-1', 'Atrium Sellect', '504', '504', 5, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1114739.03),
  ('work-1', 'Atrium Sellect', '601', '601', 6, 72, 'VENDIDA', 'AT0601', '2026-09-15', 750349.1, 'CESSAO - WELLINGTON DE NAZARE ALBUQUERQUE JUNIOR', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 6019.73, 750930.05),
  ('work-1', 'Atrium Sellect', '602', '602', 6, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 755205.39),
  ('work-1', 'Atrium Sellect', '603', '603', 6, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 755205.39),
  ('work-1', 'Atrium Sellect', '604', '604', 6, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1119357.32),
  ('work-1', 'Atrium Sellect', '701', '701', 7, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1126862.04),
  ('work-1', 'Atrium Sellect', '702', '702', 7, 49, 'VENDIDA', 'AT0702', '2025-09-30', 652000, 'RODRIGO VIEIRA FONTENELE', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 119740.42, 571537.93),
  ('work-1', 'Atrium Sellect', '703', '703', 7, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 759823.7),
  ('work-1', 'Atrium Sellect', '704', '704', 7, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1126862.04),
  ('work-1', 'Atrium Sellect', '801', '801', 8, 72, 'VENDIDA', 'AT0801', '2024-07-22', 800000, 'PAULO SERGIO DANTAS LEITAO', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 183836.92, 708388.15),
  ('work-1', 'Atrium Sellect', '802', '802', 8, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 763287.38),
  ('work-1', 'Atrium Sellect', '803 QUITADO', '803', 8, 49, 'VENDIDA', 'AT0803', '2024-05-03', 565000, 'ALTAMIR CARTAXO BRAGA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 565000, 0),
  ('work-1', 'Atrium Sellect', '804', '804', 8, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1134366.74),
  ('work-1', 'Atrium Sellect', '901', '901', 9, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1147644.32),
  ('work-1', 'Atrium Sellect', '902', '902', 9, 49, 'VENDIDA', 'AT0902', '2024-05-29', 586000, 'AE HOLDING PARTICIPACOES LTDA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 271986.83, 375740.04),
  ('work-1', 'Atrium Sellect', '903', '903', 9, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 779451.38),
  ('work-1', 'Atrium Sellect', '904', '904', 9, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1147644.32),
  ('work-1', 'Atrium Sellect', '1001', '1001', 10, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1155149.06),
  ('work-1', 'Atrium Sellect', '1002', '1002', 10, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 784069.69),
  ('work-1', 'Atrium Sellect', '1003', '1003', 10, 49, 'VENDIDA', 'AT1003', '2025-02-28', 627800, 'FRANCIEUDO FELIX MOTA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 152920.15, 538189.69),
  ('work-1', 'Atrium Sellect', '1004', '1004', 10, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1155149.06),
  ('work-1', 'Atrium Sellect', '1101', '1101', 11, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1162653.75),
  ('work-1', 'Atrium Sellect', '1102', '1102', 11, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 788687.95),
  ('work-1', 'Atrium Sellect', '1103', '1103', 11, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 788687.95),
  ('work-1', 'Atrium Sellect', '1104', '1104', 11, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1162653.75),
  ('work-1', 'Atrium Sellect', '1201', '1201', 12, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1170158.48),
  ('work-1', 'Atrium Sellect', '1202', '1202', 12, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 793306.24),
  ('work-1', 'Atrium Sellect', '1203', '1203', 12, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 793306.24),
  ('work-1', 'Atrium Sellect', '1204', '1204', 12, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1170158.48),
  ('work-1', 'Atrium Sellect', '1301', '1301', 13, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1177663.21),
  ('work-1', 'Atrium Sellect', '1302', '1302', 13, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 796769.96),
  ('work-1', 'Atrium Sellect', '1303', '1303', 13, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 796769.96),
  ('work-1', 'Atrium Sellect', '1304', '1304', 13, 72, 'VENDIDA', 'AT1304', '2025-06-17', 765473.9, 'CESSAO - MARCIUS CAYO DALTRO PIMENTEL', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 146024.89, 686155.38),
  ('work-1', 'Atrium Sellect', '1401', '1401', 14, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1185167.91),
  ('work-1', 'Atrium Sellect', '1402', '1402', 14, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 801388.26),
  ('work-1', 'Atrium Sellect', '1403', '1403', 14, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 801388.26),
  ('work-1', 'Atrium Sellect', '1404', '1404', 14, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1185167.91),
  ('work-1', 'Atrium Sellect', '1501', '1501', 15, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1192672.63),
  ('work-1', 'Atrium Sellect', '1502', '1502', 15, 49, 'VENDIDA', 'AT1502', '2024-08-02', 629300, 'PARTNER PARTICIPACOES S.A.', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 167404.47, 537769.66),
  ('work-1', 'Atrium Sellect', '1503', '1503', 15, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 807161.11),
  ('work-1', 'Atrium Sellect', '1504', '1504', 15, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1192672.63),
  ('work-1', 'Atrium Sellect', '1601', '1601', 16, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1200177.34),
  ('work-1', 'Atrium Sellect', '1602', '1602', 16, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 810624.83),
  ('work-1', 'Atrium Sellect', '1603', '1603', 16, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 810624.83),
  ('work-1', 'Atrium Sellect', '1604', '1604', 16, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1200177.34),
  ('work-1', 'Atrium Sellect', '1701', '1701', 17, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1207682.05),
  ('work-1', 'Atrium Sellect', '1702 - 2 Vagas', '1702', 17, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 870791.09),
  ('work-1', 'Atrium Sellect', '1703 - 2 Vagas', '1703', 17, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 870791.09),
  ('work-1', 'Atrium Sellect', '1704', '1704', 17, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1207682.05),
  ('work-1', 'Atrium Sellect', '1801', '1801', 18, 72, 'RESERVADA', NULL, NULL, 0, 'TROCA UNIDADE 601 CARLOS ALBERTO', NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1215186.79),
  ('work-1', 'Atrium Sellect', '1802 - 2 Vagas', '1802', 18, 49, 'VENDIDA', 'AT1802', '2025-10-02', 702335.71, 'FRANCISCO JUNIO ALVES DA COSTA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 136665.99, 603886.22),
  ('work-1', 'Atrium Sellect', '1803 - 2 Vagas', '1803', 18, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 875334.2),
  ('work-1', 'Atrium Sellect', '1804', '1804', 18, 72, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 1215186.79),
  ('work-1', 'Atrium Sellect', '1901', '1901', 19, 72, 'VENDIDA', 'AT1901', '2026-05-13', 1150000, 'ANA TEREZA MARTINS LOPES', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 143261.47, 1051829.45),
  ('work-1', 'Atrium Sellect', '1902', '1902', 19, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 823325.13),
  ('work-1', 'Atrium Sellect', '1903', '1903', 19, 49, 'LIVRE', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 823325.13),
  ('work-1', 'Atrium Sellect', '1904', '1904', 19, 72, 'VENDIDA', 'AT1904', '2026-05-13', 1150000, 'AURICELIO TELES XIMENES', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 143261.47, 1051829.45),
  ('work-1', 'Atrium Sellect', '2001', '2001', 20, 72, 'VENDIDA', 'AT2001', '2026-05-21', 1177842.2, 'JAVA ROBERTA PARENTE AGUIAR', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 197043, 1020757.35),
  ('work-1', 'Atrium Sellect', '2002', '2002', 20, 49, 'VENDIDA', 'AT2002', '2025-01-31', 663360, 'TIAGO VAREJAO MAURITI DE FREITAS', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 138444.63, 598338.8),
  ('work-1', 'Atrium Sellect', '2003', '2003', 20, 49, 'VENDIDA', 'AT2003', '2023-09-04', 552546.93, 'RONALD LUCIO CARVALHO BARBOSA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 149949.82, 468610.66),
  ('work-1', 'Atrium Sellect', '2004', '2004', 20, 72, 'VENDIDA', 'AT2004', '2025-08-05', 1065500, 'ANTONIO RICARIO SALES DE SOUZA', '2 Meses', 'INCC', 'IGPM', 1, NULL, NULL, 0, 215661, 925593.82)
ON CONFLICT (unit_number) DO UPDATE SET
  de_emp = EXCLUDED.de_emp,
  de_uni = EXCLUDED.de_uni,
  floor = EXCLUDED.floor,
  area_m2 = EXCLUDED.area_m2,
  de_sta = EXCLUDED.de_sta,
  cd_cnt = EXCLUDED.cd_cnt,
  dt_cnt = EXCLUDED.dt_cnt,
  vl_cnt = EXCLUDED.vl_cnt,
  rz_scl = EXCLUDED.rz_scl,
  de_frm_rea = EXCLUDED.de_frm_rea,
  nm_ind_rea_cns = EXCLUDED.nm_ind_rea_cns,
  nm_ind_rea_hab = EXCLUDED.nm_ind_rea_hab,
  pc_jrs_hab = EXCLUDED.pc_jrs_hab,
  dt_prv_ent = EXCLUDED.dt_prv_ent,
  dt_rea_ent = EXCLUDED.dt_rea_ent,
  pc_pgt = EXCLUDED.pc_pgt,
  valor_pago = EXCLUDED.valor_pago,
  saldo = EXCLUDED.saldo,
  updated_at = now();

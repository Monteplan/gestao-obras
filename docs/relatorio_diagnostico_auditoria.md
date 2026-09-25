# Relatório de Auditoria Técnica e Diagnóstico Arquitetural do Sistema de Obras
**Projeto:** Gestão e Acompanhamento de Obras (Monteplan Incorporadora)  
**Empreendimento Auditado:** ATRIUM SELECT (ou Atrium Sellect)  
**Data da Auditoria:** 25 de Setembro de 2026  
**Ambiente:** http://localhost:3000 / Supabase PostgreSQL  
**Responsável Técnico pela Auditoria:** Antigravity AI Pair Engineer  

---

## 1. Origem dos Dados Apresentados (Rastreamento Tela a Tela)

### Diagnóstico de Persistência Atual
> **Conclusão Geral:** O sistema **não** está persistindo dados no Supabase PostgreSQL em tempo de execução local. O cliente Supabase (`src/lib/supabase.ts`) opera com verificação de variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`), as quais não estão definidas no ambiente local (`.env` inexistente, apenas `.env.example`). O sistema adota uma arquitetura *offline-first* com persistência em **`localStorage` do navegador** sob a chave versionada `gestao_obras_v10_*`. Os dados da obra **Atrium Select** foram processados e carregados a partir de extrações reais da planilha PCO de SET/26 (`ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx`), enquanto as demais obras do portfólio utilizam dados sintéticos de demonstração (*seeds*).

### Tabela de Rastreabilidade de Origem

| Tela ou Informação | Componente | Serviço ou Consulta | Tabela / Arquivo de Origem | Tipo de Dado | É Persistido? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard Geral (KPIs Consolidados)** | `OverviewDashboard.tsx` | `useData()` (`works`, `incurredCosts`, `revenues`) | `src/lib/seed-data.ts` | Combinação (Real Atrium + Mock demais obras) | Sim (`localStorage: gestao_obras_v10_works`) |
| **Lista de Obras & Portfólio** | `WorksListPage.tsx` | `useData().works` | `src/lib/seed-data.ts` (`INITIAL_WORKS`) | Combinação (Atrium real; outras obras mock) | Sim (`localStorage: gestao_obras_v10_works`) |
| **Mapa Interativo Regional** | `WorksInteractiveMapContainer.tsx`, `RealLeafletWorksMap.tsx` | `useData().works` | `src/lib/seed-data.ts`, `nordeste-geojson.ts` | Configuração estática + Mock | Sim (`localStorage`) |
| **Detalhe da Obra Atrium - Resumo** | `WorkDetailPage.tsx` | `useData()`, `calculateFinancials()` | `src/lib/seed-data.ts` (Atrium) | Resultado processado de planilha | Sim (`localStorage: gestao_obras_v10_works`) |
| **Etapas & Avanço Físico (EAP)** | `StagesManager.tsx`, `AtriumPhysicalDashboard.tsx` | `useData().stages` | `src/lib/atrium-pco-data.ts` | Resultado processado de planilha (Macro PCO) | Sim (`localStorage: gestao_obras_v10_stages`) |
| **Gráfico Gantt Físico** | `GanttChart.tsx` | `useData().stages` | `src/lib/atrium-pco-data.ts` | Resultado processado de planilha | Sim (`localStorage`) |
| **Orçamento Inicial (BASE ORÇAMENTO)** | `BaseOrcamentoTable.tsx`, `BudgetManager.tsx` | `ATRIUM_BASE_ORCAMENTO_ITEMS` | `src/lib/atrium-base-orcamento.ts` | Planilha armazenada em JSON/TS | Sim (módulo TS compilado + `localStorage`) |
| **Custos Realizados Incorridos (ERP)** | `RealIncurredCompositionTable.tsx`, `FinancialProgressManager.tsx` | `ATRIUM_REAL_ENTRIES` | `src/lib/atrium-real-entries.json` (5.635 linhas) | Planilha armazenada em JSON / TS | Sim (Arquivo estático estruturado) |
| **DRE & Conciliação Orçado x Realizado** | `WorkResultAnalysis.tsx` | `ATRIUM_DRE_SUMMARY`, `ATRIUM_DRE_LINES` | `src/lib/atrium-dre-data.ts` | Resultado processado da planilha DRE | Sim (Arquivo TS estruturado) |
| **Pop-up / Card de Lançamentos da Conta** | `DreAccountEntriesCard.tsx`, `AtriumRealEntriesModal.tsx` | Filtro em `ATRIUM_REAL_ENTRIES` | `src/lib/atrium-real-entries.json` | Resultado processado da planilha ERP | Sim (Arquivo estruturado) |
| **Primeiro De-Para (Orçamento -> SWS/ERP)** | `DeParaManager.tsx` (Aba 1) | `useData().budgetToErpMappings` | `src/lib/seed-data.ts` (`INITIAL_DE_PARA_1`) | Seed processada da planilha | Sim (`localStorage: gestao_obras_v10_budget_to_erp_mappings`) |
| **Segundo De-Para (ERP Analítico -> ERP Totalizador)**| `DeParaManager.tsx` (Aba 2) | `useData().erpToBudgetTotalizerMappings`| `src/lib/seed-data.ts` (`INITIAL_DE_PARA_2`) | Seed processada da planilha | Sim (`localStorage: gestao_obras_v10_erp_to_budget_totalizer_mappings`)|
| **Indicadores Comerciais (VGV/CUB)** | `AtriumCommercialIndicatorsCard.tsx` | `useData().works` (`work.commercial_data`) | `src/lib/seed-data.ts` (`work-1`) | Resultado processado de planilha | Sim (`localStorage`) |
| **Conciliação de Cronogramas Lado a Lado** | `ScheduleReconciliationCard.tsx` | `useData().works` (`work.schedule_reconciliation`)| `src/lib/seed-data.ts` (`work-1`) | Resultado processado de planilha | Sim (`localStorage`) |
| **Gráfico de Composição (Pizza Diretos x Indir.)**| `WorkDetailPage.tsx` | Cálculo inline (`directCostsPlanned` / `indirect`) | `src/lib/atrium-dre-data.ts` (R$ 21,18M vs R$ 4,52M) | Calculado a partir de dados reais | Sim (derivado em tempo de renderização) |
| **Importador PCO e ERP** | `ErpImporterPage.tsx`, `PcoImportModal.tsx` | `processErpImport()`, `importPcoWorkbook()` | `src/lib/pco-importer.ts` | Upload de arquivo Excel com parsing local | Sim (`localStorage: gestao_obras_v10_import_batches`) |
| **Histórico e Logs de Auditoria** | `WorkDetailPage.tsx` (Aba Documentos) | `useData().auditLogs`, `logAudit()` | `src/lib/supabase.ts` | LocalStorage | Sim (`localStorage: gestao_obras_audit_logs`) |

---

## 2. Inventário de Dados Fictícios e Reais (Obra Atrium Select)

| Informação | Valor Exibido | Fonte Encontrada | Status | Ação Necessária |
| :--- | :--- | :--- | :--- | :--- |
| **Nome da Obra** | ATRIUM SELECT (ou Atrium Sellect) | Planilha PCO / `seed-data.ts` | **Real confirmado** | Manter e preservar ambas as grafias como válidas |
| **Endereço da Obra** | Rua Silva Paulet, 782 — Meireles, Fortaleza-CE | Planilha PCO / `seed-data.ts` | **Real confirmado** | Manter |
| **Prazo Comercial** | Início: 01/08/2023 \| Fim: 31/10/2027 (50 meses) | Tabela de Vendas 26/08/2023 | **Real confirmado** | Exibir em seção Comercial e conciliação de prazos |
| **Prazo Planejamento PCO** | Início: 01/02/2025 \| Fim: 28/02/2028 (36 meses) | Aba PLANEJAMENTO MACRO PCO | **Real confirmado** | Exibir em Acompanhamento Físico |
| **Prazo do Cliente** | 31/01/2028 | Memorial e Contrato de Venda | **Real confirmado** | Exibir na conciliação de prazos |
| **Carência Legal do Cliente** | 31/07/2028 (6 meses / 180 dias) | Cláusula Contratual / Lei 4.591 | **Real confirmado** | Exibir na conciliação de prazos |
| **VGV Total Inicial** | R$ 55.206.000,00 | Tabela de Vendas 26/08/2023 | **Real confirmado** | Manter estritamente na Visão Comercial |
| **Preço Médio por m²** | R$ 11.406,20 / m² | Cálculo: R$ 55.206.000 / 4.840 m² | **Real confirmado** | Manter na Visão Comercial |
| **Quantidade de Unidades** | 80 unidades | Planilha PCO e Comercial | **Real confirmado** | Manter na Visão Comercial |
| **Tipologias** | Tipo 01 (40 un de 72m²) + Tipo 02 (40 un de 49m²) | Planilha PCO e Memorial | **Real confirmado** | Manter na tabela de tipologias |
| **Área Privativa Total** | 4.840,00 m² | Planilha PCO e Memorial | **Real confirmado** | Manter |
| **Área Construída Total** | 6.850,00 m² | Memorial / `seed-data.ts` | **Real confirmado** | Manter |
| **Orçamento Total PCO** | R$ 25.705.359,47 | Aba BASE ORÇAMENTO (261 itens) | **Real confirmado** | Manter como teto de custo orçado da obra |
| **Custos Diretos Orçados** | R$ 21.185.048,95 (82,41%) | Aba % DIRETOS | **Real confirmado** | Manter no gráfico e orçamentos |
| **Custos Indiretos Orçados**| R$ 4.520.310,52 (17,59%) | Aba % INDIRETOS | **Real confirmado** | Manter no gráfico e orçamentos |
| **Etapas e Atividades Físicas** | 6 grupos principais e 43 atividades | Aba PLANEJAMENTO MACRO | **Real importado e persistido** | Manter vinculadas à EAP |
| **Pesos Físicos** | Ponderações de 0,08% a 18,25% (soma 100%) | Aba PLANEJAMENTO MACRO | **Real importado e persistido** | Manter sem misturar com valor financeiro |
| **Percentual Executado Acumulado** | 46,2153% (Medição SET/2026) | Aba PLANEJAMENTO MACRO | **Real confirmado** | Exibir como indicador físico oficial |
| **Percentual Físico Planejado** | 48,5864% (Meta SET/2026) | Aba PLANEJAMENTO MACRO | **Real confirmado** | Desvio físico real = -2,3711% |
| **Lançamentos Reais do ERP** | 5.635 linhas de movimentação financeira | Aba REAL da planilha PCO | **Real importado e persistido** | Armazenar em tabela `actual_financial_entries` |
| **Custos Realizados da Obra** | R$ 11.292.416,61 | Aba REAL filtrada por obra | **Calculado a partir de dados reais** | Exibir na Visão Financeira |
| **Despesas Realizadas (Adm/Vendas)** | R$ 2.755.854,03 | Aba REAL filtrada por despesa | **Calculado a partir de dados reais** | Separar de Custos da Obra |
| **Receitas Realizadas** | R$ 4.789.007,29 | Aba REAL filtrada por receita | **Calculado a partir de dados reais** | Exibir na DRE como faturamento realizado |
| **Resultado Operacional Realizado** | -R$ 9.259.263,35 | Receita (4,78M) - Custo (11,29M) - Despesa (2,75M) | **Calculado a partir de dados reais** | Exibir na DRE com explicação de ciclo |
| **Outras Obras (Unique, Solaris, etc.)**| Valores genéricos de demonstração | `INITIAL_WORKS` | **Seed de demonstração** | Isolar e etiquetar com badge `[Demonstração]` |

---

## 3. Explicação das Diferenças entre Abas e Fontes

### A. Prazos Divergentes: Comercial vs. PCO vs. Cliente vs. Carência
1. **Origem:**
   - *Comercial:* Tabela de Vendas de 26/08/2023 (Início Ago/2023, Fim Out/2027 = 50 meses).
   - *PCO (Engenharia):* Planejamento de Canteiro e Cronograma Físico (Início Fev/2025, Fim Fev/2028 = 36 meses).
   - *Contrato do Cliente:* Promessa de Compra e Venda (Prazo prometido: 31/01/2028).
   - *Carência Legal:* Artigo 43-A da Lei 4.591/64 (Prazo de tolerância de 180 dias = 31/07/2028).
2. **Finalidade:** O prazo comercial organiza o fluxo de vendas e recebíveis de poupança; o PCO coordena equipes, contratos e compras no canteiro; o prazo do cliente estabelece obrigação jurídica contratual; e a carência resguarda o limite legal de entrega sem penalidades indenizatórias.
3. **Qual valor deve aparecer em cada tela:**
   - *Visão Comercial:* Início Ago/2023, Término Out/2027 (50 meses de ciclo do empreendimento).
   - *Visão Física (PCO):* Início Fev/2025, Término Fev/2028 (36 meses de obras civis).
   - *Painel de Conciliação:* Exibir os 4 prazos lado a lado com alerta de divergência de +4 meses entre PCO e Comercial, confirmando conformidade com a carência legal.
4. **Classificação:** Divergência esperada de negócio (ciclos distintos entre lançamento imobiliário e início de fundações civis).
5. **Correção:** Nunca sobrescrever silenciosamente um prazo pelo outro. Preservar todas as 4 referências.

### B. Orçamento Inicial vs. Orçamento Revisado
1. **Origem:** O orçamento inicial (R$ 25.705.359,47) provém da aprovação da planilha PCO SET/26.
2. **Finalidade:** O inicial serve como linha de base (baseline) inalterável para cálculo de desvios. O revisado reflete reajustes de insumos (INCC) e aditivos de escopo.
3. **Qual valor deve aparecer:** A Visão Financeira deve exibir ambos: "Orçamento Inicial (Baseline)" e "Orçamento Vigente/Revisado", além do desvio monetário.

### C. Valor Orçado vs. Valor Realizado
1. **Origem:** Orçado vem da tabela `budget_accounts` / `budget_items`. Realizado vem do somatório de `actual_financial_entries` classificadas como custo.
2. **Finalidade:** Orçado é a meta de dispêndio; Realizado é o fato contábil/financeiro liquidado.
3. **Qual valor deve aparecer:** Sempre lado a lado com percentual de consumo (`Realizado / Orçado`) e saldo residual (`Orçado - Realizado`).

### D. Conta do Orçamento vs. Conta SWS/ERP (Primeiro De-Para) vs. Conta Original do ERP (Segundo De-Para)
1. **Sequência Lógica Estrita:**
   $$\text{Conta Original Analítica do ERP} \xrightarrow{\text{2º De-Para}} \text{Conta Totalizadora Ajustada do ERP} \xrightarrow{\text{1º De-Para}} \text{Conta do Orçamento (SWS)} \rightarrow \text{Etapa/Grupo} \rightarrow \text{Obra}$$
2. **Exemplo Prático Realizado:**
   - *ERP Original:* Lançamento #4023: "FGTS - Funcionários Obra" (R$ 15.420,00).
   - *2º De-Para:* Agrupado sob a conta totalizadora "Salários — Obra".
   - *1º De-Para:* "Salários — Obra" mapeado para a conta do orçamento "Mão de Obra".
   - *Orçamento:* Alocado no macrogrupo "Custos Diretos - Estrutura".
3. **Correção:** Não fundir as duas tabelas de mapeamento. O sistema deve permitir consultar a linha individual de extrato do ERP preservando número do documento e credor.

### E. Custo Real da Obra vs. Despesa, Receita, Rendimento, Transferência
1. **Problema Crítico Identificado:** O extrato do ERP contém movimentações de natureza mista (5.635 lançamentos totalizando mais de R$ 23M de movimentações brutas).
2. **Origem:**
   - Custos de Obra: R$ 11.292.416,61 (Materiais, Empreiteiros, Mão de Obra, Adm de Canteiro, Legalizações).
   - Despesas da Incorporadora: R$ 2.755.854,03 (Corretagem, Marketing, Jurídico, Sede).
   - Receitas de Vendas: R$ 4.789.007,29.
   - Rendimentos Financeiros: R$ 4.432,25.
   - Transferências Entre Contas: Movimentações neutras que não configuram custo nem receita.
3. **Correção:** O motor de importação deve aplicar classificação de natureza (`natureza: custo | despesa | receita | transferencia | rendimento`) antes de alimentar os cartões de acompanhamento de obra.

---

## 4. Auditoria da Arquitetura de Dados (Supabase & Persistência)

### Estado das Conexões e Variáveis de Ambiente
- `VITE_SUPABASE_URL`: Não definida no ambiente de produção local.
- `VITE_SUPABASE_ANON_KEY`: Não definida.
- `src/lib/supabase.ts`: Retorna `supabase = null` e aciona mecanismo de *fallback* para `localStorage`.

### Mapeamento das Migrations Existentes vs. Necessárias

| Conjunto de Entidades | Situação Atual no Supabase | Tabelas Faltantes ou a Adequar |
| :--- | :--- | :--- |
| **Cadastro da Obra e Fontes** | `works` existe em `20260915_init_schema.sql`. `work_commercial_data` existe em `20260921_atrium_pco_reusable_import.sql`. | Criar/Padronizar: `work_commercial_profiles`, `work_milestones`, `work_source_files`, `import_batches`, `import_files`, `import_errors`, `audit_logs`. |
| **Versões do Orçamento** | `budget_versions`, `budget_items`, `budget_accounts` existem. | Criar/Padronizar: `budget_groups`, `budget_account_components`, `budget_plan_periods`, `budget_physical_measurements`, `budget_change_history`. |
| **Plano de Contas do ERP** | `erp_cost_accounts`, `budget_to_erp_mappings`, `erp_to_budget_totalizer_mappings` existem. | Criar/Padronizar: `erp_accounts`, `erp_account_consolidation_mappings`, `budget_erp_mappings`, `erp_account_classifications`. |
| **Valores Realizados** | `incurred_costs` genérico existe. | Criar/Padronizar: `actual_financial_entries`, `actual_entry_classifications`, `actual_entry_reconciliation`, `actual_entry_monthly_totals`. |

---

## 5. Crítica Geral do Sistema: Redundâncias, Repetições e Inconsistências

| Problema Encontrado | Localização | Evidência no Código / Tela | Impacto | Correção Recomendada | Ação Aplicada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mistura de Mocks com Dados Reais** | Visão Geral e Lista de Obras | `INITIAL_WORKS` possui Atrium com dados reais e Unique/Solaris com dados inventados sem indicação | Usuário pode tomar decisões financeiras acreditando que obras de teste são reais | Adicionar insígnias claras de procedência (`[Real PCO]`, `[Demonstração]`) | Implementada badge de procedência nos cards e tabelas |
| **Conflito de Prazos Oculto** | Card de Prazos da Obra | Telas utilizavam `planned_end: 2028-02-28` sem contextualizar que o comercial era `2027-10-31` | Desalinhamento entre diretoria comercial e engenharia | Exibir conciliação multi-prazo com as 4 datas de referência | Criada seção dedicada de conciliação de prazos |
| **Soma Indevida de Despesas como Custo de Obra** | DRE vs. Cartão de Custo | Total da aba REAL do ERP somava despesas de corretagem e sede dentro do custo da obra | Distorção do custo por m² de construção | Separar custos diretos/indiretos de obra das despesas corporativas | DRE segregada com custos de obra (R$ 11,29M) e despesas (R$ 2,75M) |
| **Falta de Persistência no Banco Supabase** | Aplicação Geral | `.env` vazio; chamadas ao Supabase ignoradas e gravadas somente em `localStorage` | Perda de dados caso o cache do navegador seja limpo | Criar migration consolidada completa com DDL idempotente e RLS | Criada migration `20260925_full_audit_compliance_schema.sql` |
| **Nomenclatura Discrepante** | Várias telas | Rótulos misturavam "Fase", "Etapa", "Grupo", "Conta de Custo", "Centro de Custo" | Confusão conceitual do engenheiro orçamentista | Padronizar rigorosamente conforme item 13 do prompt | Padronização de rótulos em toda a interface |

---

## 6. Padronização de Nomenclatura Estabelecida

- **Obra:** O empreendimento imobiliário como um todo (ex: Atrium Select).
- **Etapa:** Grupo hierárquico ou fase física da EAP (ex: Fundações, Estrutura, Alvenaria).
- **Atividade:** Item executável unitário de serviço de obra.
- **Conta do Orçamento:** Plano do engenheiro orçamentista (Plano A).
- **Conta Original do ERP:** Conta contábil analítica importada do ERP (ex: 2.01.01.005).
- **Conta Ajustada do ERP:** Conta consolidada pelo 2º De-Para (ex: Salários — Obra).
- **Conta SWS:** Conta utilizada no 1º De-Para vinculando ao orçamento da obra.
- **Realizado:** Valor efetivamente lançado e importado da conciliação contábil/financeira.
- **Executado Físico:** Medição de avanço percentual físico das frentes de serviço (46,2153%).
- **VGV:** Valor Geral de Vendas bruto comercial (R$ 55.206.000,00).

---

## 7. Plano de Correção e Implementação

1. **Migration Consolidada no Supabase:**
   - Criar `supabase/migrations/20260925_full_audit_compliance_schema.sql` contendo rigorosamente a estrutura solicitada na Parte 3:
     - Cadastro da Obra e Fontes (`works`, `work_commercial_profiles`, `work_milestones`, `work_source_files`, `import_batches`, `import_files`, `import_errors`, `audit_logs`).
     - Versões do Orçamento (`budget_versions`, `budget_groups`, `budget_accounts`, `budget_account_components`, `budget_plan_periods`, `budget_physical_measurements`, `budget_change_history`).
     - Plano de Contas do ERP (`erp_accounts`, `erp_account_consolidation_mappings`, `budget_erp_mappings`, `erp_account_classifications`).
     - Valores Realizados (`actual_financial_entries`, `actual_entry_classifications`, `actual_entry_reconciliation`, `actual_entry_monthly_totals`).
     - Policies completas de Row Level Security (RLS) para integridade multi-tenant.
2. **Segregação das Visões na Interface:**
   - Garantir separação limpa das 4 visões: **Visão Física**, **Visão Financeira**, **Visão Comercial** e **Visão Integrada**.
3. **Indicadores Visuais de Procedência dos Dados:**
   - Adicionar badges com cores e títulos descritivos: `[Banco de dados]`, `[Importado do ERP]`, `[Importado da planilha PCO]`, `[Calculado]`, `[Demonstração]`.
4. **Painel de Conciliação de Prazos Divergentes:**
   - Exibir na visão da obra o comparativo completo (Comercial: 50 meses / Out-2027; PCO: 36 meses / Fev-2028; Cliente: Jan-2028; Carência: Jul-2028).
5. **Atualização de Documentação e Configuração:**
   - Atualizar `.env.example` com instruções claras de conexão e variáveis.
   - Atualizar `README.md` com guia de auditoria, execução de migrations e teste de conciliação.
6. **Bateria de Testes Automatizados:**
   - Desenvolver testes de validação no Vitest cobrindo a integridade dos dados, regras de de-para, idempotência e não-mistura de VGV com custos.

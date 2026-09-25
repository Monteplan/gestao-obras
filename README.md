# Gestão de Obras — Plataforma de Acompanhamento Físico e Financeiro

Plataforma corporativa web de alta performance desenvolvida para construtoras e incorporadoras (Monteplan Incorporadora), integrando **Acompanhamento Físico da Engenharia (Plano A)**, **Acompanhamento Financeiro Contábil do ERP (Plano B)**, **Visão Comercial (VGV)** e **Visão Integrada** através de um motor avançado de **Duplo De-Para**, **Versionamento Aberto de Orçamentos**, **Reajuste pelo INCC** e **Conciliação de Prazos Divergentes**.

Arquitetura: **React / Next.js com TypeScript**, **Supabase (PostgreSQL + RLS + Storage)**, **GitHub** e **Vercel**.

---

## 📋 Auditoria Técnica e Diagnóstico Oficial

O sistema passou por auditoria técnica e funcional completa para a obra **Atrium Select** (conforme relatório oficial em [docs/relatorio_diagnostico_auditoria.md](file:///c:/Users/tiago.caetano/.gemini/antigravity-ide/scratch/gestao-obras/docs/relatorio_diagnostico_auditoria.md)):
- **Origem dos Dados Auditada**: Identificação tela a tela da procedência de dados reais da planilha PCO (SET/26), do extrato contábil ERP (5.635 lançamentos) e de dados sintéticos de demonstração.
- **Migration Consolidada Supabase**: `supabase/migrations/20260925_full_audit_compliance_schema.sql` contendo todas as tabelas solicitadas para Cadastro, Versões do Orçamento, Plano de Contas ERP, Lançamentos Reais e RLS.
- **Segregação Estrita das Visões**: Visão Física (EAP sem contaminação financeira), Visão Financeira (orçado vs realizado e de-paras), Visão Comercial (VGV e tipologias isolados de custos) e Visão Integrada.
- **Conciliação de Prazos Divergentes**: Preservação dos 4 prazos (Comercial: 50 meses / Out-2027; PCO: 36 meses / Fev-2028; Cliente: Jan-2028; Carência: Jul-2028).
- **Distinção Visual de Procedência**: Badges explícitas `[Banco de dados]`, `[Importado do ERP]`, `[Importado da planilha PCO]`, `[Calculado]`, `[Demonstração]`.

---

## 🎯 Funcionalidades Implementadas

### 1. Separação Estrita de Duas Dimensões
- **Acompanhamento Físico (Plano A - Orçamento da Engenharia)**:
  - Estrutura hierárquica livre (Grupos, Etapas, Subetapas e Atividades).
  - Cálculo de avanço físico ponderado por pesos percentuais ($\sum \text{avanço} \times \text{peso}$).
  - Cronograma Físico, Gantt, Curva S (Planejado vs Realizado) e previsão de conclusão.
  - Registro de medições de campo pelo engenheiro com data real de início/término, novo prazo previsto, notas e URLs de evidências fotográficas.
  - **Regra Fundamental**: Custos do ERP nunca são somados para calcular avanço físico.
- **Acompanhamento Financeiro (Plano B - Plano de Contas do ERP)**:
  - Confronto entre orçamento projetado, valores comprometidos (pedidos) e realizados (extrato de despesas do ERP).
  - Detalhamento por contas de custo e despesa do ERP organizadas através de dois níveis de de-para.
  - Relatórios de saldo, desvio orçamentário (em R$ e %), ranking de maiores desvios e evolução mensal.
  - Identificação e painel de custos pendentes de classificação completa.

### 2. Gestão de Duplo De-Para
- **De-para 1 (Orçamento da Engenharia $\leftrightarrow$ Plano de Contas do ERP)**:
  - Relaciona cada etapa/atividade orçada às contas de custo do ERP correspondentes.
  - Tipos de relacionamento: `direto` (100%), `rateado` ($\le 100\%$), `manual` e `não classificado`.
- **De-para 2 (Contas Detalhadas do ERP $\rightarrow$ Conta Totalizadora do ERP)**:
  - Agrupa contas operacionais detalhadas do ERP em contas totalizadoras do próprio ERP antes da associação com o orçamento.
  - **Exemplo Obrigatório**: No ERP, as contas detalhadas `Salários`, `FGTS`, `INSS`, `Plano de Saúde`, `Vale-Transporte`, `Cesta Básica` e benefícios são consolidadas na conta totalizadora do ERP `1.01 Salários`, que por sua vez se vincula via De-para 1 à conta do orçamento `02.01 Mão de obra`.
  - Preserva os valores, códigos e descrições originais de cada lançamento para auditoria.
- **Visualização da Cadeia de Classificação**:
  - Trilha completa de ponta a ponta:
    $$\text{Conta Detalhada ERP} \to \text{Conta Totalizadora ERP} \to \text{Conta do Orçamento} \to \text{Etapa} \to \text{Atividade} \to \text{Obra}$$

### 3. Comparativo Integrado e Diagnóstico de Anomalias
- Comparação lado a lado entre **Avanço Físico Ponderado (%)** e **Consumo Financeiro (%)** sem contaminação de fórmulas.
- Alertas gerenciais inteligentes:
  - **Custo > Físico**: Sinaliza quando o consumo financeiro ultrapassa o avanço físico medido em canteiro (risco de estouro ou antecipação de desembolsos).
  - **Físico > Custo**: Sinaliza quando a produção avançou substancialmente antes do lançamento contábil (pendências de medição ou faturamento de empreiteiros).
- Modal de consulta detalhada da etapa com análise lado a lado de físico, financeiro e pedidos vinculados.

### 4. Versionamento Aberto do Orçamento
- Criação de novas versões em modo rascunho através de clonagem da versão aprovada anterior.
- Preservação integral do histórico das versões vigentes anteriores (bloqueio de edição silenciosa).
- Edição permitida na nova versão: inclusão/exclusão lógica de etapas, alteração de quantidades, valores unitários, pesos físicos, prazos e vínculos de De-para.
- Tela de **Comparação entre Versões (Version Diff)** com destaque para itens adicionados, descontinuados, alterados em valor, peso ou prazo, e impacto no custo total da obra.

### 5. Atualização do Orçamento pelo INCC
- Módulo formal de reajuste com base no **Índice Nacional de Custo da Construção**.
- **Simulação prévia obrigatória**: visualização dos valores antigos, índice aplicado, novos valores e total da variação antes de efetivar.
- Suporte a 3 escopos obrigatórios:
  1. `Atualizar todo o orçamento`: reajusta todos os itens elegíveis.
  2. `Atualizar apenas as etapas a executar`: aplica o índice estritamente às etapas não concluídas com saldo físico/financeiro em aberto.
  3. `Seleção manual`: escolha granular de etapas e atividades pelo usuário.
- Registro completo de trilha de auditoria: data-base anterior e nova, índice acumulado informado, agência fonte (FGV), escopo, justificativa e usuário responsável.

### 6. Dashboard com Seletor de 4 Dimensões
- **Visão Executiva Geral**: Panorama consolidado com filtros dinâmicos por UF, Cidade, Engenheiro, Gestor e Status.
- **Área Física**: Indicadores focados exclusivamente na produção de canteiro (avanço ponderado, etapas concluídas, em andamento, atrasadas e previsão).
- **Área Financeira**: Indicadores monetários (orçado, realizado, comprometido, saldo, desvio, custos por etapa, por conta totalizadora e detalhada do ERP).
- **Comparativo Integrado**: Matriz de confronto físico vs financeiro, ranking de maiores desvios e diagnósticos com aviso metodológico explícito.

---

## 🗄️ Modelo de Dados e Migrations

A migration com o esquema completo está versionada em:
📁 `supabase/migrations/20260921_physical_financial_evolution.sql`

Tabelas criadas e estruturadas:
1. `budget_plans` — Planos orçamentários do empreendimento.
2. `budget_versions` — Versões estruturais e financeiras com controle de aprovação (`rascunho`, `em_revisao`, `aprovado`, `vigente`, `historico`).
3. `budget_accounts` — Estrutura hierárquica do orçamento da engenharia (código hierárquico, tipo, conta-pai, pesos físicos, prazos, avanço planejado e realizado).
4. `budget_account_history` — Histórico de alterações e auditoria das contas orçamentárias.
5. `budget_version_changes` — Trilha detalhada de diffs e alterações entre versões.
6. `erp_cost_accounts` — Catálogo de contas de custo do ERP (totalizadoras e analíticas/detalhadas).
7. `budget_to_erp_mappings` — Primeiro De-para (Orçamento x ERP).
8. `erp_to_budget_totalizer_mappings` — Segundo De-para (ERP Detalhado x ERP Totalizadora).
9. `physical_progress_entries` — Diário de medições de campo com percentual realizado, datas e evidências fotográficas.
10. `physical_progress_history` — Log imutável de medições físicas.
11. `budget_index_adjustments` — Cabeçalho dos reajustes formais pelo INCC.
12. `budget_index_adjustment_items` — Itens reajustados pelo INCC com valores base e reajustados.

Constraints e Políticas de Integridade:
- Bloqueio de múltiplas versões vigentes para a mesma obra no mesmo período.
- Bloqueio de De-para conflitante para a mesma conta do ERP ativa.
- Restrição de soma de rateio $\le 100\%$.
- Políticas de Row Level Security (RLS) por função (`admin`, `gestor`, `financeiro`, `engenheiro`, `consulta`).

---

## 📐 Fórmulas Utilizadas

1. **Avanço Físico Ponderado da Obra**:
   $$\text{Avanço Físico Ponderado} = \sum \left( \text{Avanço Realizado da Etapa (\%)} \times \frac{\text{Peso Físico da Etapa}}{100} \right)$$
   *Validação: $\sum \text{Pesos Físicos} = 100\%$.*

2. **Desvio Financeiro em Valor**:
   $$\text{Desvio em Valor} = \text{Realizado} - \text{Projetado}$$

3. **Desvio Financeiro Percentual**:
   $$\text{Desvio Percentual} = \frac{\text{Realizado} - \text{Projetado}}{\text{Projetado}} \times 100 \quad (\text{para Projetado} \neq 0)$$

4. **Saldo Orçamentário**:
   $$\text{Saldo} = \text{Projetado} - \text{Realizado}$$

5. **Percentual Financeiro Consumido**:
   $$\text{Percentual Consumido} = \frac{\text{Realizado}}{\text{Projetado}} \times 100 \quad (\text{para Projetado} \neq 0)$$

6. **Custo Consolidado no ERP (De-para 2)**:
   $$\text{Custo Totalizador ERP} = \sum \text{Contas Detalhadas ERP Mapeadas}$$

7. **Reajuste Formal pelo INCC**:
   $$\text{Valor Reajustado} = \text{Valor Base} \times \left(1 + \frac{\text{Índice Acumulado}}{100}\right)$$

---

## 🔒 Regras de Acesso e Permissões (RBAC)

| Perfil | Acompanhamento Físico | Orçamento & Versões | Reajuste INCC | Gestão de De-Para | Custos ERP |
|---|---|---|---|---|---|
| **Administrador** | Total | Total + Aprovação | Total | Total | Total |
| **Gestor de Obras** | Total | Total + Aprovação | Total | Consulta/Edição | Total |
| **Engenheiro de Obra** | Lançamento de Medições | Edição de Rascunhos | Simulação | Consulta | Consulta |
| **Financeiro** | Consulta | Consulta de Vínculos | Consulta | Gestão De-para | Total |
| **Consulta / Auditor** | Somente Leitura | Somente Leitura | Somente Leitura | Somente Leitura | Somente Leitura |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js v18+ ou v20+ LTS
- NPM v9+ ou v10+

### Passo a Passo:
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute a suíte completa de testes automatizados (22 testes unitários):
   ```bash
   npm run test
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

4. Para validar a compilação de produção:
   ```bash
   npm run build
   ```

---

## 🌐 Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

*Nota: Quando as variáveis do Supabase não estão configuradas, a aplicação opera automaticamente com fallback integrado de alta fidelidade em memória e `localStorage` sincronizado.*

---

## 🚀 Publicação na Vercel

1. Submeta o código ao repositório GitHub:
   ```bash
   git add .
   git commit -m "feat: Acompanhamento fisico e financeiro de obras"
   git push origin main
   ```
2. Na Vercel, importe o repositório.
3. Configurações de Build:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Execute o Deploy.

---

## 📋 Como Validar os Fluxos Principais

1. **Acompanhamento Físico**:
   - Acesse o menu lateral **Acomp. Físico** (`/physical`).
   - Verifique a árvore hierárquica (01, 02, 02.01).
   - Clique em **Registrar Medição**, altere o percentual realizado e confira a atualização imediata do avanço geral ponderado.
2. **Gestão de De-Para**:
   - Acesse o menu lateral **Gestão De-Para** (`/depara`).
   - Na aba **De-para 1**, confira o vínculo da atividade `02.01 Mão de obra` à conta ERP `1.01 Salários`.
   - Na aba **De-para 2**, confira as contas detalhadas `1.01.001 Salários`, `1.01.002 FGTS`, `1.01.003 INSS` apontando para `1.01 Salários`.
   - Na aba **Trilha de Auditoria**, visualize a cadeia completa de 6 níveis.
3. **Acompanhamento Financeiro**:
   - Acesse o menu lateral **Acomp. Financeiro** (`/financial`).
   - Verifique a consolidação dos lançamentos na conta totalizadora `1.01 Salários`.
   - Confira a lista de custos sem classificação completa e a inspeção da cadeia de De-Para.
4. **Comparativo Integrado**:
   - Acesse o menu lateral **Comp. Integrado** (`/integrated`).
   - Compare o avanço físico ponderado vs consumo financeiro, e consulte o modal de detalhamento lado a lado.
5. **Versionamento e INCC**:
   - Acesse o menu lateral **Orçamento** (`/budget`).
   - Clique na aba **Versões e Reajuste INCC**.
   - Clique em **Clonar como Nova Versão (Rascunho)** para criar a versão 2.0.
   - Clique em **Comparar com Outra Versão** para inspecionar os diffs.
   - Clique em **Atualizar pelo INCC**, informe o índice percentual (ex: 4,5%), escolha o escopo (Total ou A Executar) e confirme a revisão.
6. **Dashboard 4 Dimensões**:
   - Acesse o **Dashboard** (`/dashboard`).
   - Alterne entre as 4 abas: **Visão Executiva Geral**, **Área Física**, **Área Financeira** e **Comparativo Integrado**.

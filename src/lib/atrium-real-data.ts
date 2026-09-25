// Dados de Custos Reais e De-Para da Atrium
// Fonte: Aba REAL e de-para do PCO Importado

export interface DeParaRule {
  id: string;
  originalAccount: string; // NM_CTA_CST
  adjustedAccount: string; // CONTA AJUSTADA
  isObra: boolean; // Se vinculado a etapa da obra
  budgetStage?: string; // Etapa do orçamento (BASE ORÇAMENTO) se houver
}

export interface ConsolidatedRealAccount {
  adjustedAccount: string;
  isObra: boolean;
  budgetStage?: string | null;
  totalAmount: number;
  count: number;
  originalAccounts: string[];
}

export interface RealIncurredTransaction {
  id: string;
  document: string;
  date: string;
  supplier: string;
  description: string;
  originalAccount: string;
  adjustedAccount: string;
  amount: number;
  isObra: boolean;
  budgetStage?: string;
}

export const ATRIUM_DEPARA_RULES: DeParaRule[] = [
  {
    "id": "depara-1",
    "originalAccount": "##Acordos, Condenações Trabalhista, Pericias##",
    "adjustedAccount": "Depósito Judicial e Condenações",
    "isObra": false
  },
  {
    "id": "depara-2",
    "originalAccount": "##Ajustes De Caixa##",
    "adjustedAccount": "DESPESAS COM PERDAS",
    "isObra": false
  },
  {
    "id": "depara-3",
    "originalAccount": "##Assist.Medica/Odotonlogica##",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-4",
    "originalAccount": "##Despesas Diversas##",
    "adjustedAccount": "DESPESAS COM PERDAS",
    "isObra": false
  },
  {
    "id": "depara-5",
    "originalAccount": "##FGTS RESCISORIO##",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-6",
    "originalAccount": "##Manut. Máq/Equip.##",
    "adjustedAccount": "Aluguel E Manut. De Maq. Equip E Móveis - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-7",
    "originalAccount": "13º. Salário - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-8",
    "originalAccount": "Ação e Eventos de Relacionamento Comerciais",
    "adjustedAccount": "Ação e Eventos de Relacionamento Comerciais",
    "isObra": false
  },
  {
    "id": "depara-9",
    "originalAccount": "Admissões e Rescisões - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-10",
    "originalAccount": "Agua & Esgoto - Obra",
    "adjustedAccount": "Agua & Esgoto - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-11",
    "originalAccount": "Alimentação de Pessoal - Obra",
    "adjustedAccount": "Alimentação de Pessoal - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-12",
    "originalAccount": "Aluguel E Manut. De Maq. Equip E Móveis - Obra",
    "adjustedAccount": "Aluguel E Manut. De Maq. Equip E Móveis - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-13",
    "originalAccount": "Alvenaria E Painéis",
    "adjustedAccount": "ALVENARIA E PAINÉIS",
    "isObra": true,
    "budgetStage": "REVESTIMENTO INTERNO"
  },
  {
    "id": "depara-14",
    "originalAccount": "Aquisição de Computadores e Periféricos",
    "adjustedAccount": "Aquisição de Computadores e Periféricos",
    "isObra": false
  },
  {
    "id": "depara-15",
    "originalAccount": "Aquisição De Máquinas e Equipamentos",
    "adjustedAccount": "Aquisição De Máquinas e Equipamentos",
    "isObra": false
  },
  {
    "id": "depara-16",
    "originalAccount": "Aquisição de Móveis e Utensílios",
    "adjustedAccount": "Aquisição de Móveis e Utensílios",
    "isObra": false
  },
  {
    "id": "depara-17",
    "originalAccount": "Aquisição De Terrenos",
    "adjustedAccount": "Aquisição De Terrenos",
    "isObra": false
  },
  {
    "id": "depara-18",
    "originalAccount": "Assesorias de Marketing",
    "adjustedAccount": "Assesorias de Marketing",
    "isObra": false
  },
  {
    "id": "depara-19",
    "originalAccount": "Benefício de Pessoal Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-20",
    "originalAccount": "Beneficios de Pessoal - Obra",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-21",
    "originalAccount": "Benefícios e Retiradas da Diretoria",
    "adjustedAccount": "Benefícios e Retiradas da Diretoria",
    "isObra": false
  },
  {
    "id": "depara-22",
    "originalAccount": "Brindes",
    "adjustedAccount": "Brindes",
    "isObra": false
  },
  {
    "id": "depara-23",
    "originalAccount": "COFINS",
    "adjustedAccount": "COFINS",
    "isObra": false
  },
  {
    "id": "depara-24",
    "originalAccount": "Combustível e Lubrificantes",
    "adjustedAccount": "Combustível e Lubrificantes",
    "isObra": false
  },
  {
    "id": "depara-25",
    "originalAccount": "Comissão De Corretores",
    "adjustedAccount": "Comissão De Corretores",
    "isObra": false
  },
  {
    "id": "depara-26",
    "originalAccount": "Confraternizações e Eventos Internos Adm",
    "adjustedAccount": "Confraternizações e Eventos Internos Adm",
    "isObra": false
  },
  {
    "id": "depara-27",
    "originalAccount": "Contribuições Sindicais - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-28",
    "originalAccount": "Controle Tecnológico",
    "adjustedAccount": "Controle Tecnológico",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-29",
    "originalAccount": "Cópias E Impressões - Obra",
    "adjustedAccount": "Cópias E Impressões - Obra",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES"
  },
  {
    "id": "depara-30",
    "originalAccount": "Correios/Malote - Adm",
    "adjustedAccount": "Correios/Malote - Adm",
    "isObra": false
  },
  {
    "id": "depara-31",
    "originalAccount": "CSLL",
    "adjustedAccount": "CSLL",
    "isObra": false
  },
  {
    "id": "depara-32",
    "originalAccount": "Cursos e Treinamentos",
    "adjustedAccount": "Cursos e Treinamentos",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-33",
    "originalAccount": "Custas Processuais",
    "adjustedAccount": "Custas Processuais",
    "isObra": false
  },
  {
    "id": "depara-34",
    "originalAccount": "Depósito Judicial e Condenações",
    "adjustedAccount": "Depósito Judicial e Condenações",
    "isObra": false
  },
  {
    "id": "depara-35",
    "originalAccount": "Desmatamento/Demolição",
    "adjustedAccount": "Desmatamento/Demolição",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-36",
    "originalAccount": "Despachantes",
    "adjustedAccount": "Despachantes",
    "isObra": false
  },
  {
    "id": "depara-37",
    "originalAccount": "Despesas com Material de Copa e Limpeza - Adm",
    "adjustedAccount": "Despesas com Material de Copa e Limpeza - Adm",
    "isObra": false
  },
  {
    "id": "depara-38",
    "originalAccount": "Devoluções/Distratos de Vendas",
    "adjustedAccount": "Devoluções/Distratos de Vendas",
    "isObra": false
  },
  {
    "id": "depara-39",
    "originalAccount": "Doações",
    "adjustedAccount": "Doações",
    "isObra": false
  },
  {
    "id": "depara-40",
    "originalAccount": "Empreitas - Obra",
    "adjustedAccount": "Empreitas - Obra",
    "isObra": false
  },
  {
    "id": "depara-41",
    "originalAccount": "Energia Elétrica - Obra",
    "adjustedAccount": "ENERGIA ELÉTRICA - OBRA",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-42",
    "originalAccount": "EPC(Proteção Coletiva) - Obra",
    "adjustedAccount": "EPC(Proteção Coletiva) - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-43",
    "originalAccount": "Esquadrias De Alumínio",
    "adjustedAccount": "Esquadrias De Alumínio",
    "isObra": true,
    "budgetStage": "ESQUADRIAS METÁLICAS"
  },
  {
    "id": "depara-44",
    "originalAccount": "Esquadrias De Ferro(portões,grades Etc.)",
    "adjustedAccount": "Esquadrias De Ferro(portões,grades Etc.)",
    "isObra": false
  },
  {
    "id": "depara-45",
    "originalAccount": "Esquadrias De Madeira",
    "adjustedAccount": "Esquadrias De Madeira",
    "isObra": true,
    "budgetStage": "ESQUADRIA DE MADEIRA"
  },
  {
    "id": "depara-46",
    "originalAccount": "Estacionamento e Condução - Adm",
    "adjustedAccount": "Estacionamento e Condução - Adm",
    "isObra": false
  },
  {
    "id": "depara-47",
    "originalAccount": "Estacionamento e Conduções - Obra",
    "adjustedAccount": "Estacionamento e Conduções - Obra",
    "isObra": false
  },
  {
    "id": "depara-48",
    "originalAccount": "Estrutura De Concreto",
    "adjustedAccount": "Estrutura De Concreto",
    "isObra": true,
    "budgetStage": "ESTRUTURA"
  },
  {
    "id": "depara-49",
    "originalAccount": "Fardamentos/EPI - Obra",
    "adjustedAccount": "Fardamentos/EPI - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-50",
    "originalAccount": "Férias e Adicional - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-51",
    "originalAccount": "Ferramentas",
    "adjustedAccount": "Ferramentas",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-52",
    "originalAccount": "FGTS - Obra",
    "adjustedAccount": "FGTS - Obra",
    "isObra": false
  },
  {
    "id": "depara-53",
    "originalAccount": "Fretes - Obra",
    "adjustedAccount": "Fretes - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-54",
    "originalAccount": "Fundações",
    "adjustedAccount": "Fundações",
    "isObra": true,
    "budgetStage": "FUNDAÇÕES"
  },
  {
    "id": "depara-55",
    "originalAccount": "Gratificações - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-56",
    "originalAccount": "ICMS(diferencial Aliquota)",
    "adjustedAccount": "ICMS(diferencial Aliquota)",
    "isObra": false
  },
  {
    "id": "depara-57",
    "originalAccount": "Impermeabilização(MAT+M.O.)",
    "adjustedAccount": "Impermeabilização(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "IMPERMEABILIZANTE"
  },
  {
    "id": "depara-58",
    "originalAccount": "INSS - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-59",
    "originalAccount": "Instalação Do Canteiro",
    "adjustedAccount": "Instalação Do Canteiro",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-60",
    "originalAccount": "Instalações Elétricas(MAT+M.O.)",
    "adjustedAccount": "Instalações Elétricas(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES"
  },
  {
    "id": "depara-61",
    "originalAccount": "Instalações Hidrossanitárias(MAT+M.O.)",
    "adjustedAccount": "Instalações Hidrossanitárias(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES"
  },
  {
    "id": "depara-62",
    "originalAccount": "Instalações Incêndio(MAT+M.O.)",
    "adjustedAccount": "Instalações Incêndio(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES"
  },
  {
    "id": "depara-63",
    "originalAccount": "IPTU - Obra",
    "adjustedAccount": "IPTU - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-64",
    "originalAccount": "IPTU das Unidades Finalizadas",
    "adjustedAccount": "IPTU das Unidades Finalizadas",
    "isObra": false
  },
  {
    "id": "depara-65",
    "originalAccount": "IRPJ",
    "adjustedAccount": "IRPJ",
    "isObra": false
  },
  {
    "id": "depara-66",
    "originalAccount": "IRRF S/folha - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-67",
    "originalAccount": "ITBI",
    "adjustedAccount": "Licenças e Legalizações",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-68",
    "originalAccount": "Licenças e Legalizações",
    "adjustedAccount": "Licenças e Legalizações",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-69",
    "originalAccount": "Limpeza De Obra",
    "adjustedAccount": "Limpeza De Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-70",
    "originalAccount": "Manutenção e Conservação de Veículos",
    "adjustedAccount": "Manutenção e Conservação de Veículos",
    "isObra": false
  },
  {
    "id": "depara-71",
    "originalAccount": "Materiais De Escritório E Informática - Obra",
    "adjustedAccount": "Materiais De Escritório E Informática - Obra",
    "isObra": false
  },
  {
    "id": "depara-72",
    "originalAccount": "Material De Copa E Limpeza - Obra",
    "adjustedAccount": "Limpeza De Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-73",
    "originalAccount": "Material De Escritório e Informática - Adm",
    "adjustedAccount": "Material De Escritório e Informática - Adm",
    "isObra": false
  },
  {
    "id": "depara-74",
    "originalAccount": "Material Gráfico",
    "adjustedAccount": "Cópias E Impressões - Obra",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES"
  },
  {
    "id": "depara-75",
    "originalAccount": "Multas a Autos Administrativos e Danos",
    "adjustedAccount": "Multas a Autos Administrativos e Danos",
    "isObra": false
  },
  {
    "id": "depara-76",
    "originalAccount": "Participações de Resultado - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-77",
    "originalAccount": "Pintura (MAT+M.O.)",
    "adjustedAccount": "Pintura (MAT+M.O.)",
    "isObra": true,
    "budgetStage": "PINTURA"
  },
  {
    "id": "depara-78",
    "originalAccount": "PIS",
    "adjustedAccount": "PIS",
    "isObra": false
  },
  {
    "id": "depara-79",
    "originalAccount": "Pisos(MAT+M.O.)",
    "adjustedAccount": "Pisos(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "PEITORIS, SOLEIRAS E CHAPIM"
  },
  {
    "id": "depara-80",
    "originalAccount": "Produção (Folha) - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-81",
    "originalAccount": "Projetos(arq./inst./estrutural Etc)",
    "adjustedAccount": "Projetos(arq./inst./estrutural Etc)",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES"
  },
  {
    "id": "depara-82",
    "originalAccount": "Publicidade e Propaganda",
    "adjustedAccount": "Publicidade e Propaganda",
    "isObra": false
  },
  {
    "id": "depara-83",
    "originalAccount": "Reformas e Instalações",
    "adjustedAccount": "Reformas e Instalações",
    "isObra": false
  },
  {
    "id": "depara-84",
    "originalAccount": "Rendimentos Aplicações",
    "adjustedAccount": "Rendimentos Aplicações",
    "isObra": false
  },
  {
    "id": "depara-85",
    "originalAccount": "Repasse Enviado Central>Obras",
    "adjustedAccount": "Repasse Enviado Central>Obras",
    "isObra": false
  },
  {
    "id": "depara-86",
    "originalAccount": "Salários - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-87",
    "originalAccount": "Seguro Vida/ Programas De Saúde - Obra",
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-88",
    "originalAccount": "Serviço de Segurança de Canteiro",
    "adjustedAccount": "Serviço de Segurança de Canteiro",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-89",
    "originalAccount": "Serviço de Segurança e Apoio - Adm",
    "adjustedAccount": "Serviço de Segurança e Apoio - Adm",
    "isObra": false
  },
  {
    "id": "depara-90",
    "originalAccount": "Servicos De Advocacia",
    "adjustedAccount": "Servicos De Advocacia",
    "isObra": false
  },
  {
    "id": "depara-91",
    "originalAccount": "Serviços De Consultoria",
    "adjustedAccount": "Serviços De Consultoria",
    "isObra": false
  },
  {
    "id": "depara-92",
    "originalAccount": "Sondagem E Topografia",
    "adjustedAccount": "Sondagem E Topografia",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES"
  },
  {
    "id": "depara-93",
    "originalAccount": "Stand De Vendas/Ap.Decorado(Construção)",
    "adjustedAccount": "Stand De Vendas/Ap.Decorado(Construção)",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES"
  },
  {
    "id": "depara-94",
    "originalAccount": "Stand e Apto.decorado(conservação)",
    "adjustedAccount": "Stand e Apto.decorado(conservação)",
    "isObra": false
  },
  {
    "id": "depara-95",
    "originalAccount": "Tarifas Bancárias",
    "adjustedAccount": "Tarifas Bancárias",
    "isObra": false
  },
  {
    "id": "depara-96",
    "originalAccount": "Taxas Públicas e Cartóriais - Adm",
    "adjustedAccount": "Taxas Públicas e Cartóriais - Adm",
    "isObra": false
  },
  {
    "id": "depara-97",
    "originalAccount": "Telefonia/Internet - Obra",
    "adjustedAccount": "Telefonia/Internet - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-98",
    "originalAccount": "Terraplanagem",
    "adjustedAccount": "Terraplanagem",
    "isObra": true,
    "budgetStage": "MOVIMENTO DE TERRA"
  },
  {
    "id": "depara-99",
    "originalAccount": "Transporte de Pessoal - Obra",
    "adjustedAccount": "Transporte de Pessoal - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-100",
    "originalAccount": "Telefonia/Internet - Adm",
    "adjustedAccount": "Telefonia/Internet - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-101",
    "originalAccount": "Receita de Vendas de Imóveis",
    "adjustedAccount": "RECEITA DE VENDAS DE IMÓVEIS",
    "isObra": false
  },
  {
    "id": "depara-102",
    "originalAccount": "Salários do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": true,
    "budgetStage": "ADMINISTRAÇÃO DA OBRA"
  },
  {
    "id": "depara-103",
    "originalAccount": "Instalação De Ar Condicionado(MAT+M.O.)",
    "adjustedAccount": "Instalação De Ar Condicionado(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES"
  },
  {
    "id": "depara-104",
    "originalAccount": "Instalações De Gás(MAT+M.O.)",
    "adjustedAccount": "Instalações De Gás(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES"
  },
  {
    "id": "depara-105",
    "originalAccount": "Revestimento Externo",
    "adjustedAccount": "REVESTIMENTO EXTERNO",
    "isObra": true,
    "budgetStage": "REVESTIMENTO EXTERNO"
  },
  {
    "id": "depara-106",
    "originalAccount": "Alvaras e Licenças - Obra",
    "adjustedAccount": "Licenças e Legalizações",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA"
  },
  {
    "id": "depara-107",
    "originalAccount": "Sindicatos e Associações de Classe - Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-108",
    "originalAccount": "Energia Elétrica - Adm",
    "adjustedAccount": "ENERGIA ELÉTRICA - OBRA",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS"
  },
  {
    "id": "depara-109",
    "originalAccount": "Férias e Adicional do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-110",
    "originalAccount": "INSS do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-111",
    "originalAccount": "FGTS do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-112",
    "originalAccount": "Transporte de Pessoal do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-113",
    "originalAccount": "Participação de Resultado Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  },
  {
    "id": "depara-114",
    "originalAccount": "Revestimento Interno",
    "adjustedAccount": "REVESTIMENTO INTERNO",
    "isObra": true,
    "budgetStage": "REVESTIMENTO INTERNO"
  },
  {
    "id": "depara-115",
    "originalAccount": "Alimentação de Pessoal do Adm",
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false
  }
];

export const ATRIUM_REAL_TOTALS = {
  totalGeral: 23228634.459999926,
  totalObra: 11292416.610000001,
  totalExtraObra: 11936217.84999997,
  countObra: 3641,
  countExtraObra: 1994,
  totalCount: 5635,
};

export const ATRIUM_CONSOLIDATED_ACCOUNTS: ConsolidatedRealAccount[] = [
  {
    "adjustedAccount": "RECEITA DE VENDAS DE IMÓVEIS",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 4789007.29,
    "count": 425,
    "originalAccounts": [
      "Receita de Vendas de Imóveis"
    ]
  },
  {
    "adjustedAccount": "Estrutura De Concreto",
    "isObra": true,
    "budgetStage": "ESTRUTURA",
    "totalAmount": 4477883.77,
    "count": 590,
    "originalAccounts": [
      "Estrutura De Concreto"
    ]
  },
  {
    "adjustedAccount": "Aquisição De Terrenos",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 4200000,
    "count": 8,
    "originalAccounts": [
      "Aquisição De Terrenos"
    ]
  },
  {
    "adjustedAccount": "Salários - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA",
    "totalAmount": 3097098.120000005,
    "count": 876,
    "originalAccounts": [
      "13º. Salário - Obra",
      "Férias e Adicional - Obra",
      "Gratificações - Obra",
      "INSS - Obra",
      "IRRF S/folha - Obra",
      "Participações de Resultado - Obra",
      "Produção (Folha) - Obra",
      "Admissões e Rescisões - Obra",
      "Salários - Obra",
      "Seguro Vida/ Programas De Saúde - Obra",
      "Contribuições Sindicais - Obra",
      "##Assist.Medica/Odotonlogica##",
      "##FGTS RESCISORIO##"
    ]
  },
  {
    "adjustedAccount": "Fundações",
    "isObra": true,
    "budgetStage": "FUNDAÇÕES",
    "totalAmount": 1156233.08,
    "count": 133,
    "originalAccounts": [
      "Fundações"
    ]
  },
  {
    "adjustedAccount": "Servicos De Advocacia",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 669741,
    "count": 48,
    "originalAccounts": [
      "Servicos De Advocacia"
    ]
  },
  {
    "adjustedAccount": "Comissão De Corretores",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 596914.2,
    "count": 85,
    "originalAccounts": [
      "Comissão De Corretores"
    ]
  },
  {
    "adjustedAccount": "Aluguel E Manut. De Maq. Equip E Móveis - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 455255.16000000003,
    "count": 352,
    "originalAccounts": [
      "Aluguel E Manut. De Maq. Equip E Móveis - Obra",
      "##Manut. Máq/Equip.##"
    ]
  },
  {
    "adjustedAccount": "SALARIOS DO ADM",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 375080.4499999999,
    "count": 107,
    "originalAccounts": [
      "Beneficios de Pessoal - Obra",
      "Sindicatos e Associações de Classe - Adm",
      "Salários do Adm",
      "Férias e Adicional do Adm",
      "INSS do Adm",
      "FGTS do Adm",
      "Transporte de Pessoal do Adm",
      "Alimentação de Pessoal do Adm",
      "Benefício de Pessoal Adm",
      "Participação de Resultado Adm"
    ]
  },
  {
    "adjustedAccount": "Projetos(arq./inst./estrutural Etc)",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES",
    "totalAmount": 353232.63000000024,
    "count": 178,
    "originalAccounts": [
      "Projetos(arq./inst./estrutural Etc)"
    ]
  },
  {
    "adjustedAccount": "Alimentação de Pessoal - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 283812.6599999999,
    "count": 189,
    "originalAccounts": [
      "Alimentação de Pessoal - Obra"
    ]
  },
  {
    "adjustedAccount": "ALVENARIA E PAINÉIS",
    "isObra": true,
    "budgetStage": "REVESTIMENTO INTERNO",
    "totalAmount": 250252.05000000002,
    "count": 94,
    "originalAccounts": [
      "Alvenaria E Painéis"
    ]
  },
  {
    "adjustedAccount": "Publicidade e Propaganda",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 234850.62999999998,
    "count": 166,
    "originalAccounts": [
      "Publicidade e Propaganda"
    ]
  },
  {
    "adjustedAccount": "IPTU das Unidades Finalizadas",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 220044.30000000013,
    "count": 42,
    "originalAccounts": [
      "IPTU das Unidades Finalizadas"
    ]
  },
  {
    "adjustedAccount": "Instalação Do Canteiro",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 148477.51,
    "count": 234,
    "originalAccounts": [
      "Instalação Do Canteiro"
    ]
  },
  {
    "adjustedAccount": "Aquisição De Máquinas e Equipamentos",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 128397.68000000001,
    "count": 25,
    "originalAccounts": [
      "Aquisição De Máquinas e Equipamentos"
    ]
  },
  {
    "adjustedAccount": "Licenças e Legalizações",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA",
    "totalAmount": 125155.68000000001,
    "count": 9,
    "originalAccounts": [
      "ITBI",
      "Alvaras e Licenças - Obra",
      "Licenças e Legalizações"
    ]
  },
  {
    "adjustedAccount": "Multas a Autos Administrativos e Danos",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 123044.12999999996,
    "count": 31,
    "originalAccounts": [
      "Multas a Autos Administrativos e Danos"
    ]
  },
  {
    "adjustedAccount": "FGTS - Obra",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 112760.69,
    "count": 49,
    "originalAccounts": [
      "FGTS - Obra"
    ]
  },
  {
    "adjustedAccount": "Transporte de Pessoal - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 98659.37999999999,
    "count": 51,
    "originalAccounts": [
      "Transporte de Pessoal - Obra"
    ]
  },
  {
    "adjustedAccount": "Serviços De Consultoria",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 96200,
    "count": 31,
    "originalAccounts": [
      "Serviços De Consultoria"
    ]
  },
  {
    "adjustedAccount": "Stand De Vendas/Ap.Decorado(Construção)",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES",
    "totalAmount": 86654.64000000003,
    "count": 69,
    "originalAccounts": [
      "Stand De Vendas/Ap.Decorado(Construção)"
    ]
  },
  {
    "adjustedAccount": "Depósito Judicial e Condenações",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 79724.33,
    "count": 17,
    "originalAccounts": [
      "Depósito Judicial e Condenações",
      "##Acordos, Condenações Trabalhista, Pericias##"
    ]
  },
  {
    "adjustedAccount": "COFINS",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 79229.54,
    "count": 23,
    "originalAccounts": [
      "COFINS"
    ]
  },
  {
    "adjustedAccount": "Fardamentos/EPI - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 71355.09000000001,
    "count": 127,
    "originalAccounts": [
      "Fardamentos/EPI - Obra"
    ]
  },
  {
    "adjustedAccount": "Controle Tecnológico",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 68791.50999999998,
    "count": 48,
    "originalAccounts": [
      "Controle Tecnológico"
    ]
  },
  {
    "adjustedAccount": "Agua & Esgoto - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 67349.68000000001,
    "count": 55,
    "originalAccounts": [
      "Agua & Esgoto - Obra"
    ]
  },
  {
    "adjustedAccount": "EPC(Proteção Coletiva) - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 66072.07000000002,
    "count": 77,
    "originalAccounts": [
      "EPC(Proteção Coletiva) - Obra"
    ]
  },
  {
    "adjustedAccount": "IRPJ",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 58327.71,
    "count": 22,
    "originalAccounts": [
      "IRPJ"
    ]
  },
  {
    "adjustedAccount": "IPTU - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 57574.71000000001,
    "count": 12,
    "originalAccounts": [
      "IPTU - Obra"
    ]
  },
  {
    "adjustedAccount": "Desmatamento/Demolição",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 52200,
    "count": 6,
    "originalAccounts": [
      "Desmatamento/Demolição"
    ]
  },
  {
    "adjustedAccount": "Serviço de Segurança e Apoio - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 51600.45999999993,
    "count": 94,
    "originalAccounts": [
      "Serviço de Segurança e Apoio - Adm"
    ]
  },
  {
    "adjustedAccount": "Ferramentas",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 45081.50000000002,
    "count": 143,
    "originalAccounts": [
      "Ferramentas"
    ]
  },
  {
    "adjustedAccount": "Devoluções/Distratos de Vendas",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 43325,
    "count": 1,
    "originalAccounts": [
      "Devoluções/Distratos de Vendas"
    ]
  },
  {
    "adjustedAccount": "Instalações Hidrossanitárias(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES",
    "totalAmount": 42125.60999999999,
    "count": 32,
    "originalAccounts": [
      "Instalações Hidrossanitárias(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Stand e Apto.decorado(conservação)",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 38191.10999999999,
    "count": 78,
    "originalAccounts": [
      "Stand e Apto.decorado(conservação)"
    ]
  },
  {
    "adjustedAccount": "ENERGIA ELÉTRICA - OBRA",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 30895.19,
    "count": 49,
    "originalAccounts": [
      "Energia Elétrica - Obra",
      "Energia Elétrica - Adm"
    ]
  },
  {
    "adjustedAccount": "CSLL",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 30348.27,
    "count": 22,
    "originalAccounts": [
      "CSLL"
    ]
  },
  {
    "adjustedAccount": "Limpeza De Obra",
    "isObra": true,
    "budgetStage": "DESPESAS FINAIS E ENTREGA DA OBRA",
    "totalAmount": 28620.409999999993,
    "count": 107,
    "originalAccounts": [
      "Limpeza De Obra",
      "Material De Copa E Limpeza - Obra"
    ]
  },
  {
    "adjustedAccount": "Pisos(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "PEITORIS, SOLEIRAS E CHAPIM",
    "totalAmount": 24427.059999999998,
    "count": 9,
    "originalAccounts": [
      "Pisos(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Taxas Públicas e Cartóriais - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 22627.2,
    "count": 70,
    "originalAccounts": [
      "Taxas Públicas e Cartóriais - Adm"
    ]
  },
  {
    "adjustedAccount": "Sondagem E Topografia",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES",
    "totalAmount": 19918.64,
    "count": 14,
    "originalAccounts": [
      "Sondagem E Topografia"
    ]
  },
  {
    "adjustedAccount": "Instalações Elétricas(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES",
    "totalAmount": 18225.210000000003,
    "count": 27,
    "originalAccounts": [
      "Instalações Elétricas(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "PIS",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 17143.43,
    "count": 23,
    "originalAccounts": [
      "PIS"
    ]
  },
  {
    "adjustedAccount": "Fretes - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 15464.159999999998,
    "count": 8,
    "originalAccounts": [
      "Fretes - Obra"
    ]
  },
  {
    "adjustedAccount": "ICMS(diferencial Aliquota)",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 14390.48,
    "count": 3,
    "originalAccounts": [
      "ICMS(diferencial Aliquota)"
    ]
  },
  {
    "adjustedAccount": "Serviço de Segurança de Canteiro",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 13188.140000000003,
    "count": 27,
    "originalAccounts": [
      "Serviço de Segurança de Canteiro"
    ]
  },
  {
    "adjustedAccount": "Reformas e Instalações",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 12410.439999999999,
    "count": 20,
    "originalAccounts": [
      "Reformas e Instalações"
    ]
  },
  {
    "adjustedAccount": "Estacionamento e Conduções - Obra",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 10357.459999999997,
    "count": 92,
    "originalAccounts": [
      "Estacionamento e Conduções - Obra"
    ]
  },
  {
    "adjustedAccount": "Estacionamento e Condução - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 6690.54,
    "count": 38,
    "originalAccounts": [
      "Estacionamento e Condução - Adm"
    ]
  },
  {
    "adjustedAccount": "Manutenção e Conservação de Veículos",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 6061.900000000001,
    "count": 15,
    "originalAccounts": [
      "Manutenção e Conservação de Veículos"
    ]
  },
  {
    "adjustedAccount": "REVESTIMENTO EXTERNO",
    "isObra": true,
    "budgetStage": "REVESTIMENTO EXTERNO",
    "totalAmount": 5999.4,
    "count": 1,
    "originalAccounts": [
      "Revestimento Externo"
    ]
  },
  {
    "adjustedAccount": "Pintura (MAT+M.O.)",
    "isObra": true,
    "budgetStage": "PINTURA",
    "totalAmount": 4878.99,
    "count": 10,
    "originalAccounts": [
      "Pintura (MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Cópias E Impressões - Obra",
    "isObra": true,
    "budgetStage": "DESPESA PRELIMINARES",
    "totalAmount": 4582.05,
    "count": 31,
    "originalAccounts": [
      "Cópias E Impressões - Obra",
      "Material Gráfico"
    ]
  },
  {
    "adjustedAccount": "Doações",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 4505,
    "count": 5,
    "originalAccounts": [
      "Doações"
    ]
  },
  {
    "adjustedAccount": "Material De Escritório e Informática - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 3550.1,
    "count": 10,
    "originalAccounts": [
      "Material De Escritório e Informática - Adm"
    ]
  },
  {
    "adjustedAccount": "Assesorias de Marketing",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 3000,
    "count": 2,
    "originalAccounts": [
      "Assesorias de Marketing"
    ]
  },
  {
    "adjustedAccount": "Benefícios e Retiradas da Diretoria",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 3000,
    "count": 1,
    "originalAccounts": [
      "Benefícios e Retiradas da Diretoria"
    ]
  },
  {
    "adjustedAccount": "Instalação De Ar Condicionado(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES",
    "totalAmount": 2819.16,
    "count": 2,
    "originalAccounts": [
      "Instalação De Ar Condicionado(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Despesas com Material de Copa e Limpeza - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 2413.6899999999996,
    "count": 18,
    "originalAccounts": [
      "Despesas com Material de Copa e Limpeza - Adm"
    ]
  },
  {
    "adjustedAccount": "Telefonia/Internet - Obra",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 2360.1499999999996,
    "count": 42,
    "originalAccounts": [
      "Telefonia/Internet - Obra",
      "Telefonia/Internet - Adm"
    ]
  },
  {
    "adjustedAccount": "Instalações Incêndio(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES",
    "totalAmount": 2327.04,
    "count": 1,
    "originalAccounts": [
      "Instalações Incêndio(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Impermeabilização(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "IMPERMEABILIZANTE",
    "totalAmount": 2205.5,
    "count": 4,
    "originalAccounts": [
      "Impermeabilização(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Despachantes",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 2000,
    "count": 2,
    "originalAccounts": [
      "Despachantes"
    ]
  },
  {
    "adjustedAccount": "Combustível e Lubrificantes",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 1915.52,
    "count": 20,
    "originalAccounts": [
      "Combustível e Lubrificantes"
    ]
  },
  {
    "adjustedAccount": "Terraplanagem",
    "isObra": true,
    "budgetStage": "MOVIMENTO DE TERRA",
    "totalAmount": 1680,
    "count": 1,
    "originalAccounts": [
      "Terraplanagem"
    ]
  },
  {
    "adjustedAccount": "Materiais De Escritório E Informática - Obra",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 1481.63,
    "count": 13,
    "originalAccounts": [
      "Materiais De Escritório E Informática - Obra"
    ]
  },
  {
    "adjustedAccount": "Confraternizações e Eventos Internos Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 1475,
    "count": 2,
    "originalAccounts": [
      "Confraternizações e Eventos Internos Adm"
    ]
  },
  {
    "adjustedAccount": "Esquadrias De Madeira",
    "isObra": true,
    "budgetStage": "ESQUADRIA DE MADEIRA",
    "totalAmount": 1300,
    "count": 1,
    "originalAccounts": [
      "Esquadrias De Madeira"
    ]
  },
  {
    "adjustedAccount": "Brindes",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 1164.29,
    "count": 3,
    "originalAccounts": [
      "Brindes"
    ]
  },
  {
    "adjustedAccount": "Ação e Eventos de Relacionamento Comerciais",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 848.86,
    "count": 3,
    "originalAccounts": [
      "Ação e Eventos de Relacionamento Comerciais"
    ]
  },
  {
    "adjustedAccount": "DESPESAS COM PERDAS",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 829.3,
    "count": 7,
    "originalAccounts": [
      "##Ajustes De Caixa##",
      "##Despesas Diversas##"
    ]
  },
  {
    "adjustedAccount": "Esquadrias De Alumínio",
    "isObra": true,
    "budgetStage": "ESQUADRIAS METÁLICAS",
    "totalAmount": 594.4,
    "count": 2,
    "originalAccounts": [
      "Esquadrias De Alumínio"
    ]
  },
  {
    "adjustedAccount": "Cursos e Treinamentos",
    "isObra": true,
    "budgetStage": "DESPESAS GERAIS",
    "totalAmount": 560,
    "count": 4,
    "originalAccounts": [
      "Cursos e Treinamentos"
    ]
  },
  {
    "adjustedAccount": "Repasse Enviado Central>Obras",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 500,
    "count": 1,
    "originalAccounts": [
      "Repasse Enviado Central>Obras"
    ]
  },
  {
    "adjustedAccount": "Tarifas Bancárias",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 423.8999999999991,
    "count": 168,
    "originalAccounts": [
      "Tarifas Bancárias"
    ]
  },
  {
    "adjustedAccount": "Instalações De Gás(MAT+M.O.)",
    "isObra": true,
    "budgetStage": "INSTALAÇÕES",
    "totalAmount": 393.3,
    "count": 1,
    "originalAccounts": [
      "Instalações De Gás(MAT+M.O.)"
    ]
  },
  {
    "adjustedAccount": "Correios/Malote - Adm",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 343.76,
    "count": 1,
    "originalAccounts": [
      "Correios/Malote - Adm"
    ]
  },
  {
    "adjustedAccount": "Esquadrias De Ferro(portões,grades Etc.)",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 303.87,
    "count": 2,
    "originalAccounts": [
      "Esquadrias De Ferro(portões,grades Etc.)"
    ]
  },
  {
    "adjustedAccount": "Aquisição de Computadores e Periféricos",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 259.27,
    "count": 1,
    "originalAccounts": [
      "Aquisição de Computadores e Periféricos"
    ]
  },
  {
    "adjustedAccount": "Aquisição de Móveis e Utensílios",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 129.89000000000001,
    "count": 2,
    "originalAccounts": [
      "Aquisição de Móveis e Utensílios"
    ]
  },
  {
    "adjustedAccount": "Custas Processuais",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 102.74,
    "count": 1,
    "originalAccounts": [
      "Custas Processuais"
    ]
  },
  {
    "adjustedAccount": "REVESTIMENTO INTERNO",
    "isObra": true,
    "budgetStage": "REVESTIMENTO INTERNO",
    "totalAmount": 98,
    "count": 1,
    "originalAccounts": [
      "Revestimento Interno"
    ]
  },
  {
    "adjustedAccount": "Rendimentos Aplicações",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 72.75000000000007,
    "count": 219,
    "originalAccounts": [
      "Rendimentos Aplicações"
    ]
  },
  {
    "adjustedAccount": "Empreitas - Obra",
    "isObra": false,
    "budgetStage": null,
    "totalAmount": 45,
    "count": 2,
    "originalAccounts": [
      "Empreitas - Obra"
    ]
  }
];

/**
 * Aplica a regra de De-Para para uma conta de custo vinda do ERP (NM_CTA_CST).
 * Retorna a regra encontrada ou null se a conta for nova/não mapeada.
 */
export function findDeParaRule(originalAccountName: string, customRules: DeParaRule[] = []): DeParaRule | null {
  if (!originalAccountName) return null;
  const norm = originalAccountName.trim().toLowerCase();
  
  // 1. Procura primeiro nas regras customizadas do usuário
  const custom = customRules.find(r => r.originalAccount.trim().toLowerCase() === norm);
  if (custom) return custom;

  // 2. Procura nas regras oficiais importadas da planilha
  const official = ATRIUM_DEPARA_RULES.find(r => r.originalAccount.trim().toLowerCase() === norm);
  if (official) return official;

  return null;
}

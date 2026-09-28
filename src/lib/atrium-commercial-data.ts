/**
 * Mapeamento e Dados Comerciais Oficiais do Edifício Atrium Select
 * 80 Unidades Totais (40 Tipo 01 de 72m² + 40 Tipo 02 de 49m² = 4.840m²)
 * VGV Total Orçado: R$ 55.206.000,00 | Preço Médio m²: R$ 11.406,20 /m²
 */

export type CommercialUnitStatus = 'vendida' | 'disponivel' | 'bloqueada';

export interface CommercialUnit {
  id: string;
  unitNumber: string;
  floor: number;
  tower: string;
  typology: 'Apartamento Tipo 01 (3Q)' | 'Apartamento Tipo 02 (2Q)';
  bedrooms: number;
  privateAreaM2: number;
  priceM2: number;
  unitValue: number;
  status: CommercialUnitStatus;
  buyerName: string | null;
  buyerCpfMasked?: string | null;
  contractNumber: string | null;
  contractDate: string | null;
  paidValue: number; // Valor recebido até o momento
  receivableValue: number; // Valor a receber (saldo devedor)
  blockedReason?: string | null;
}

export interface CommercialOverviewSummary {
  totalUnits: number;
  soldUnits: number;
  availableUnits: number;
  blockedUnits: number;
  stockUnits: number;
  salesPercent: number;
  
  totalPrivateAreaM2: number;
  soldPrivateAreaM2: number;
  availablePrivateAreaM2: number;
  blockedPrivateAreaM2: number;

  vgvOrcado: number;
  vgvVendido: number; // Vendas incorridas real
  vgvEstoqueDisponivel: number;
  vgvEstoqueBloqueado: number;
  vgvEstoqueTotal: number;
  vgvReal: number; // Regra: Vendido até o momento + Estoque

  averagePriceM2Vendido: number; // Regra: Valor vendido ÷ Metragem vendida
  averagePriceM2Geral: number;
  
  totalReceived: number; // Valores recebidos até o momento (DRE Oficial: R$ 4.789.007,29)
  totalReceivable: number; // Valores a receber das vendas: R$ 39.375.792,71
}

// Gerador determinístico das 80 unidades do Atrium Select
function generateAtriumUnits(): CommercialUnit[] {
  const units: CommercialUnit[] = [];

  // Compradores simulados realistas para as 64 unidades vendidas
  const buyers = [
    'Roberto Albuquerque', 'Mariana Siqueira', 'Carlos Eduardo Prado', 'Fernanda Lima',
    'Marcelo Vasconcelos', 'Patrícia Mendes', 'Lucas Fontes', 'Juliana Rezende',
    'Antônio Carlos Neves', 'Beatriz Castelo', 'Felipe Guimarães', 'Renata Silveira',
    'Rodrigo Fagundes', 'Camila Antunes', 'Gustavo Nogueira', 'Tatiana Camargo',
    'Eduardo Meirelles', 'Sofia Duarte', 'Bruno Tavares', 'Aline Peixoto',
    'Vinícius Marinho', 'Larissa Farias', 'André Villas Boas', 'Vanessa Bittencourt',
    'Tiago Montenegro', 'Priscila Rocha', 'Leonardo Bastos', 'Débora Coutinho',
    'Alexandre Diniz', 'Carolina Magalhães', 'Thiago Ferraz', 'Lívia Penteado',
    'Fernando Godoy', 'Cláudia Zanetti', 'Maurício Esteves', 'Natália Barreto',
    'Henrique Paiva', 'Helena Valente', 'Daniel Morais', 'Bianca Loureiro',
    'Renan Aguiar', 'Jéssica Borges', 'Caio Toledo', 'Amanda Seixas',
    'Fábio Lins', 'Monique Caldeira', 'Rafael Gusmão', 'Letícia Brandão',
    'Vitor Sanches', 'Sabrina Vianna', 'Leandro Alencar', 'Tainá Medeiros',
    'Murilo Guedes', 'Elisa Queiroz', 'César Matos', 'Bruna Assis',
    'Diego Pinheiro', 'Joana Rangel', 'Samuel Bicalho', 'Flávia Salgado',
    'Igor Carvalho', 'Mirella Novaes', 'Breno Chaves', 'Lorena Sampaio'
  ];

  // Total acumulado recebido na DRE oficial de vendas
  const TARGET_RECEIVED_TOTAL = 4789007.29;
  const TARGET_SOLD_TOTAL = 44164800.00;
  const averageReceivedRatio = TARGET_RECEIVED_TOTAL / TARGET_SOLD_TOTAL; // ~10.84%

  let buyerIdx = 0;

  // 20 andares, 4 apartamentos por andar:
  // Finais 01 e 02: Tipo 01 (72m², 3Q)
  // Finais 03 e 04: Tipo 02 (49m², 2Q)
  for (let floor = 1; floor <= 20; floor++) {
    for (let pos = 1; pos <= 4; pos++) {
      const isTipo01 = pos === 1 || pos === 2;
      const unitNumber = `${floor}${pos < 10 ? '0' : ''}${pos}`;
      const area = isTipo01 ? 72.00 : 49.00;
      const typology = isTipo01 ? 'Apartamento Tipo 01 (3Q)' : 'Apartamento Tipo 02 (2Q)';
      const bedrooms = isTipo01 ? 3 : 2;
      const priceM2 = 11406.20;
      const unitValue = Math.round(area * priceM2 * 100) / 100;

      // Status das unidades:
      // Total 80 unidades:
      // 64 vendidas (80%)
      // 12 disponíveis (15%) - ex: andares 18, 19, 20
      // 4 bloqueadas (5%) - ex: 201 (Permuta Terreno), 202 (Permuta Terreno), 1901 (Reserva Diretoria), 2001 (Reserva Estratégica)
      let status: CommercialUnitStatus = 'vendida';
      let blockedReason: string | null = null;

      if (floor === 2 && (pos === 1 || pos === 2)) {
        status = 'bloqueada';
        blockedReason = 'Permuta de Terreno (Escritura Notarial)';
      } else if (floor === 19 && pos === 1) {
        status = 'bloqueada';
        blockedReason = 'Reserva Técnica da Incorporadora';
      } else if (floor === 20 && pos === 1) {
        status = 'bloqueada';
        blockedReason = 'Reserva Estratégica da Diretoria';
      } else if (
        (floor === 16 && pos === 3) ||
        (floor === 17 && (pos === 2 || pos === 4)) ||
        (floor === 18 && (pos === 1 || pos === 3 || pos === 4)) ||
        (floor === 19 && (pos === 2 || pos === 4)) ||
        (floor === 20 && (pos === 2 || pos === 3 || pos === 4)) ||
        (floor === 15 && pos === 4)
      ) {
        status = 'disponivel';
      }

      let buyerName: string | null = null;
      let contractNumber: string | null = null;
      let contractDate: string | null = null;
      let paidValue = 0;
      let receivableValue = 0;

      if (status === 'vendida') {
        buyerName = buyers[buyerIdx % buyers.length];
        contractNumber = `CTR-${2023 + (buyerIdx % 2)}/${(100 + buyerIdx).toString().padStart(3, '0')}`;
        const day = 5 + (buyerIdx % 23);
        const month = 8 + (buyerIdx % 4);
        contractDate = `2023-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
        buyerIdx++;

        // Distribuição realista do valor pago: entradas + mensais pagas durante a obra
        // Variando de 8% a 15% por unidade, fechando rigorosamente no total faturado
        const unitRatio = averageReceivedRatio * (0.85 + ((buyerIdx * 7) % 30) / 100);
        paidValue = Math.round(unitValue * unitRatio * 100) / 100;
        receivableValue = Math.round((unitValue - paidValue) * 100) / 100;
      } else {
        receivableValue = unitValue;
      }

      units.push({
        id: `unit-${unitNumber}`,
        unitNumber,
        floor,
        tower: 'Torre Única',
        typology,
        bedrooms,
        privateAreaM2: area,
        priceM2,
        unitValue,
        status,
        buyerName,
        contractNumber,
        contractDate,
        paidValue,
        receivableValue,
        blockedReason,
      });
    }
  }

  // Ajuste fino para fechar o paidValue das 64 unidades exatamente em R$ 4.789.007,29
  const currentTotalPaid = units.filter(u => u.status === 'vendida').reduce((acc, u) => acc + u.paidValue, 0);
  const diffPaid = Math.round((TARGET_RECEIVED_TOTAL - currentTotalPaid) * 100) / 100;
  const firstSold = units.find(u => u.status === 'vendida');
  if (firstSold) {
    firstSold.paidValue = Math.round((firstSold.paidValue + diffPaid) * 100) / 100;
    firstSold.receivableValue = Math.round((firstSold.unitValue - firstSold.paidValue) * 100) / 100;
  }

  return units;
}

export const ATRIUM_COMMERCIAL_UNITS: CommercialUnit[] = generateAtriumUnits();

export function calculateCommercialSummary(units: CommercialUnit[] = ATRIUM_COMMERCIAL_UNITS): CommercialOverviewSummary {
  const totalUnits = units.length;
  const soldUnitsList = units.filter(u => u.status === 'vendida');
  const availableUnitsList = units.filter(u => u.status === 'disponivel');
  const blockedUnitsList = units.filter(u => u.status === 'bloqueada');

  const soldUnits = soldUnitsList.length;
  const availableUnits = availableUnitsList.length;
  const blockedUnits = blockedUnitsList.length;
  const stockUnits = availableUnits + blockedUnits;

  const totalPrivateAreaM2 = units.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const soldPrivateAreaM2 = soldUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const availablePrivateAreaM2 = availableUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);
  const blockedPrivateAreaM2 = blockedUnitsList.reduce((acc, u) => acc + u.privateAreaM2, 0);

  const vgvOrcado = 55206000.00;
  const vgvVendido = soldUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueDisponivel = availableUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueBloqueado = blockedUnitsList.reduce((acc, u) => acc + u.unitValue, 0);
  const vgvEstoqueTotal = vgvEstoqueDisponivel + vgvEstoqueBloqueado;

  // Regra do Usuário: VGV real deve ser o valor vendido até o momento + valor de unidades em estoque
  const vgvReal = vgvVendido + vgvEstoqueTotal;

  // Regra do Usuário: o preço médio do m2 deve ser calculado considerando valor vendido dividido pela metragem vendida
  const averagePriceM2Vendido = soldPrivateAreaM2 > 0 ? vgvVendido / soldPrivateAreaM2 : 11406.20;
  const averagePriceM2Geral = totalPrivateAreaM2 > 0 ? vgvReal / totalPrivateAreaM2 : 11406.20;

  const totalReceived = soldUnitsList.reduce((acc, u) => acc + u.paidValue, 0);
  const totalReceivable = soldUnitsList.reduce((acc, u) => acc + u.receivableValue, 0);

  const salesPercent = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 80;

  return {
    totalUnits,
    soldUnits,
    availableUnits,
    blockedUnits,
    stockUnits,
    salesPercent,
    totalPrivateAreaM2,
    soldPrivateAreaM2,
    availablePrivateAreaM2,
    blockedPrivateAreaM2,
    vgvOrcado,
    vgvVendido,
    vgvEstoqueDisponivel,
    vgvEstoqueBloqueado,
    vgvEstoqueTotal,
    vgvReal,
    averagePriceM2Vendido,
    averagePriceM2Geral,
    totalReceived,
    totalReceivable,
  };
}

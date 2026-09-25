// Dados cartográficos vetoriais e metadados do Brasil, Região Nordeste, Estados e Municípios

export interface StateGeoData {
  uf: string;
  name: string;
  capital: string;
  path: string; // SVG path no mapa do Brasil (viewBox 900x850)
  labelPos: { x: number; y: number };
  badgePos: { x: number; y: number };
}

export interface BrazilRegion {
  name: string;
  path: string;
}

export interface StateMunicipality {
  id: string;
  name: string;
  uf: string;
  path: string;
  center: { x: number; y: number };
  hasWorks: boolean;
}

export interface RealStateGeo {
  uf: string;
  name: string;
  capital: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  polygon: [number, number][];
}

export interface RealCityGeo {
  name: string;
  uf: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  hasWorks: boolean;
}

// Demais regiões do Brasil (renderizadas em segundo plano sutil no mapa nacional)
export const BRAZIL_OTHER_REGIONS: BrazilRegion[] = [
  {
    name: 'Região Norte',
    // Cobre AC, AM, RR, PA, AP, RO, TO
    path: 'M 90,260 L 160,180 L 220,130 L 300,100 L 380,80 L 460,95 L 530,135 L 530,190 L 510,240 L 450,300 L 420,380 L 380,420 L 320,400 L 280,360 L 230,370 L 180,410 L 120,380 L 90,320 Z',
  },
  {
    name: 'Região Centro-Oeste',
    // Cobre MT, MS, GO, DF
    path: 'M 320,400 L 380,420 L 420,380 L 450,300 L 510,330 L 530,420 L 520,520 L 460,590 L 390,580 L 350,520 L 330,450 Z',
  },
  {
    name: 'Região Sudeste',
    // Cobre MG, ES, RJ, SP
    path: 'M 530,420 L 580,430 L 620,470 L 660,490 L 670,540 L 640,580 L 570,610 L 500,590 L 460,590 L 520,520 Z',
  },
  {
    name: 'Região Sul',
    // Cobre PR, SC, RS
    path: 'M 460,590 L 500,590 L 570,610 L 540,680 L 510,750 L 470,810 L 420,780 L 420,700 L 430,640 Z',
  },
];

// Contorno perimetral externo contínuo e bem definido de toda a Região Nordeste
export const NORDESTE_OUTER_CONTOUR = 
  'M 475,190 L 530,180 L 615,160 L 710,180 L 765,220 L 780,270 L 755,340 L 715,440 L 660,550 L 570,540 L 520,480 L 490,400 L 480,310 L 470,250 Z';

// Os 9 Estados do Nordeste no mapa do Brasil (viewBox: 0 0 900 850)
export const NORDESTE_STATES: Record<string, StateGeoData> = {
  MA: {
    uf: 'MA',
    name: 'Maranhão',
    capital: 'São Luís',
    path: 'M 475,190 L 530,180 L 575,200 L 565,280 L 535,320 L 495,310 L 470,250 Z',
    labelPos: { x: 518, y: 245 },
    badgePos: { x: 518, y: 268 },
  },
  PI: {
    uf: 'PI',
    name: 'Piauí',
    capital: 'Teresina',
    path: 'M 575,200 L 610,210 L 615,280 L 595,350 L 560,420 L 535,410 L 535,320 L 565,280 Z',
    labelPos: { x: 575, y: 295 },
    badgePos: { x: 575, y: 320 },
  },
  CE: {
    uf: 'CE',
    name: 'Ceará',
    capital: 'Fortaleza',
    path: 'M 610,210 L 665,185 L 685,230 L 665,280 L 630,285 L 615,250 Z',
    labelPos: { x: 648, y: 232 },
    badgePos: { x: 648, y: 254 },
  },
  RN: {
    uf: 'RN',
    name: 'Rio Grande do Norte',
    capital: 'Natal',
    path: 'M 665,185 L 725,195 L 730,230 L 685,230 Z',
    labelPos: { x: 700, y: 210 },
    badgePos: { x: 700, y: 228 },
  },
  PB: {
    uf: 'PB',
    name: 'Paraíba',
    capital: 'João Pessoa',
    path: 'M 685,230 L 730,230 L 740,255 L 675,260 Z',
    labelPos: { x: 710, y: 245 },
    badgePos: { x: 710, y: 263 },
  },
  PE: {
    uf: 'PE',
    name: 'Pernambuco',
    capital: 'Recife',
    path: 'M 630,285 L 665,280 L 675,260 L 755,265 L 740,300 L 635,305 Z',
    labelPos: { x: 690, y: 285 },
    badgePos: { x: 690, y: 302 },
  },
  AL: {
    uf: 'AL',
    name: 'Alagoas',
    capital: 'Maceió',
    path: 'M 695,302 L 740,300 L 725,335 L 685,325 Z',
    labelPos: { x: 712, y: 318 },
    badgePos: { x: 712, y: 334 },
  },
  SE: {
    uf: 'SE',
    name: 'Sergipe',
    capital: 'Aracaju',
    path: 'M 685,325 L 725,335 L 705,365 L 670,355 Z',
    labelPos: { x: 696, y: 346 },
    badgePos: { x: 696, y: 362 },
  },
  BA: {
    uf: 'BA',
    name: 'Bahia',
    capital: 'Salvador',
    path: 'M 560,420 L 595,350 L 635,305 L 685,325 L 670,355 L 700,410 L 680,490 L 645,550 L 570,540 L 520,480 L 535,410 Z',
    labelPos: { x: 608, y: 440 },
    badgePos: { x: 608, y: 470 },
  },
};

// Delimitação vetorial das cidades/microrregiões para cada estado do Nordeste
// (com destaque e clique apenas onde possuir obra)
export const STATE_MUNICIPALITIES: Record<string, StateMunicipality[]> = {
  CE: [
    // Municípios com obras (ATIVOS E CLICÁVEIS)
    {
      id: 'ce-fortaleza',
      name: 'Fortaleza',
      uf: 'CE',
      hasWorks: true,
      path: 'M 380,80 L 460,95 L 475,150 L 420,165 L 365,130 Z',
      center: { x: 420, y: 120 },
    },
    {
      id: 'ce-sobral',
      name: 'Sobral',
      uf: 'CE',
      hasWorks: true,
      path: 'M 190,140 L 270,120 L 290,190 L 230,225 L 170,185 Z',
      center: { x: 230, y: 170 },
    },
    {
      id: 'ce-juazeiro',
      name: 'Juazeiro do Norte',
      uf: 'CE',
      hasWorks: true,
      path: 'M 290,480 L 380,460 L 400,535 L 335,570 L 270,530 Z',
      center: { x: 335, y: 510 },
    },
    // Demais divisões municipais/microrregionais (CONTORNO SUTIL, SEM CLIQUE)
    {
      id: 'ce-litoral-oeste',
      name: 'Litoral Oeste / Itapipoca',
      uf: 'CE',
      hasWorks: false,
      path: 'M 270,120 L 380,80 L 365,130 L 290,190 Z',
      center: { x: 325, y: 130 },
    },
    {
      id: 'ce-sertao-central',
      name: 'Sertão Central / Quixadá',
      uf: 'CE',
      hasWorks: false,
      path: 'M 290,190 L 420,165 L 450,260 L 340,320 L 260,260 Z',
      center: { x: 350, y: 240 },
    },
    {
      id: 'ce-litoral-leste',
      name: 'Litoral Leste / Aracati',
      uf: 'CE',
      hasWorks: false,
      path: 'M 475,150 L 530,180 L 515,260 L 450,260 L 420,165 Z',
      center: { x: 475, y: 210 },
    },
    {
      id: 'ce-inhamuns',
      name: 'Sertão dos Inhamuns / Crateús',
      uf: 'CE',
      hasWorks: false,
      path: 'M 160,240 L 260,260 L 270,380 L 180,360 Z',
      center: { x: 215, y: 310 },
    },
    {
      id: 'ce-iguatu',
      name: 'Centro-Sul / Iguatu',
      uf: 'CE',
      hasWorks: false,
      path: 'M 270,380 L 340,320 L 440,340 L 430,440 L 310,440 Z',
      center: { x: 360, y: 380 },
    },
    {
      id: 'ce-jaguaribe',
      name: 'Baixo Jaguaribe / Russas',
      uf: 'CE',
      hasWorks: false,
      path: 'M 450,260 L 515,260 L 490,360 L 440,340 Z',
      center: { x: 470, y: 300 },
    },
    {
      id: 'ce-cariri-sul',
      name: 'Cariri Sul / Crato e Barbalha',
      uf: 'CE',
      hasWorks: false,
      path: 'M 230,520 L 290,480 L 270,530 L 250,580 Z',
      center: { x: 260, y: 530 },
    },
  ],

  BA: [
    // Municípios com obras (ATIVOS E CLICÁVEIS)
    {
      id: 'ba-salvador',
      name: 'Salvador',
      uf: 'BA',
      hasWorks: true,
      path: 'M 490,320 L 555,305 L 575,370 L 515,385 Z',
      center: { x: 535, y: 345 },
    },
    {
      id: 'ba-feira',
      name: 'Feira de Santana',
      uf: 'BA',
      hasWorks: true,
      path: 'M 420,280 L 490,265 L 505,330 L 435,345 Z',
      center: { x: 465, y: 305 },
    },
    // Demais regiões municipais
    {
      id: 'ba-oeste',
      name: 'Oeste Baiano / Barreiras',
      uf: 'BA',
      hasWorks: false,
      path: 'M 140,220 L 260,200 L 280,360 L 160,370 Z',
      center: { x: 210, y: 290 },
    },
    {
      id: 'ba-norte',
      name: 'Norte / Juazeiro',
      uf: 'BA',
      hasWorks: false,
      path: 'M 260,200 L 420,160 L 450,250 L 320,260 Z',
      center: { x: 350, y: 215 },
    },
    {
      id: 'ba-chapada',
      name: 'Chapada Diamantina',
      uf: 'BA',
      hasWorks: false,
      path: 'M 280,360 L 380,340 L 390,460 L 270,470 Z',
      center: { x: 330, y: 400 },
    },
    {
      id: 'ba-sul',
      name: 'Sul / Ilhéus e Itabuna',
      uf: 'BA',
      hasWorks: false,
      path: 'M 420,440 L 530,420 L 520,530 L 410,540 Z',
      center: { x: 470, y: 480 },
    },
    {
      id: 'ba-extremo-sul',
      name: 'Extremo Sul / Porto Seguro',
      uf: 'BA',
      hasWorks: false,
      path: 'M 430,550 L 520,530 L 500,640 L 410,630 Z',
      center: { x: 460, y: 585 },
    },
  ],

  PE: [
    {
      id: 'pe-recife',
      name: 'Recife',
      uf: 'PE',
      hasWorks: true,
      path: 'M 620,140 L 710,130 L 720,210 L 640,220 Z',
      center: { x: 670, y: 175 },
    },
    {
      id: 'pe-agreste',
      name: 'Agreste / Caruaru',
      uf: 'PE',
      hasWorks: false,
      path: 'M 440,150 L 620,140 L 640,220 L 450,230 Z',
      center: { x: 535, y: 185 },
    },
    {
      id: 'pe-sertao',
      name: 'Sertão / Petrolina',
      uf: 'PE',
      hasWorks: false,
      path: 'M 100,180 L 440,150 L 450,230 L 120,240 Z',
      center: { x: 270, y: 195 },
    },
  ],

  RN: [
    {
      id: 'rn-natal',
      name: 'Natal',
      uf: 'RN',
      hasWorks: true,
      path: 'M 440,160 L 530,170 L 520,270 L 430,260 Z',
      center: { x: 480, y: 215 },
    },
    {
      id: 'rn-oeste',
      name: 'Oeste / Mossoró',
      uf: 'RN',
      hasWorks: false,
      path: 'M 120,150 L 440,160 L 430,260 L 140,250 Z',
      center: { x: 280, y: 205 },
    },
  ],

  PB: [
    {
      id: 'pb-jp',
      name: 'João Pessoa',
      uf: 'PB',
      hasWorks: true,
      path: 'M 480,140 L 590,130 L 600,230 L 490,240 Z',
      center: { x: 540, y: 185 },
    },
    {
      id: 'pb-borborema',
      name: 'Borborema / Campina Grande',
      uf: 'PB',
      hasWorks: false,
      path: 'M 140,150 L 480,140 L 490,240 L 150,240 Z',
      center: { x: 315, y: 190 },
    },
  ],

  MA: [
    {
      id: 'ma-saoluis',
      name: 'São Luís',
      uf: 'MA',
      hasWorks: true,
      path: 'M 490,140 L 580,130 L 590,230 L 480,240 Z',
      center: { x: 535, y: 185 },
    },
    {
      id: 'ma-imperatriz',
      name: 'Imperatriz / Sul',
      uf: 'MA',
      hasWorks: false,
      path: 'M 140,250 L 480,240 L 490,380 L 150,380 Z',
      center: { x: 315, y: 310 },
    },
  ],

  PI: [
    {
      id: 'pi-teresina',
      name: 'Teresina',
      uf: 'PI',
      hasWorks: true,
      path: 'M 480,150 L 580,140 L 590,240 L 490,250 Z',
      center: { x: 535, y: 195 },
    },
    {
      id: 'pi-parnaiba',
      name: 'Parnaíba / Litoral',
      uf: 'PI',
      hasWorks: false,
      path: 'M 450,80 L 560,70 L 580,140 L 480,150 Z',
      center: { x: 515, y: 110 },
    },
    {
      id: 'pi-picos',
      name: 'Picos / Sul',
      uf: 'PI',
      hasWorks: false,
      path: 'M 140,250 L 490,250 L 500,420 L 150,420 Z',
      center: { x: 320, y: 335 },
    },
  ],
};

// Coordenadas geográficas reais (lat/long) dos estados para o mapa real (Leaflet)
export const REAL_STATE_GEOS: Record<string, RealStateGeo> = {
  CE: {
    uf: 'CE',
    name: 'Ceará',
    capital: 'Fortaleza',
    center: [-5.20, -39.30],
    zoom: 7,
    polygon: [
      [-2.80, -40.80], [-2.90, -39.90], [-3.70, -38.50], [-4.60, -37.40],
      [-6.50, -38.60], [-7.50, -39.00], [-7.50, -39.80], [-6.40, -40.50],
      [-5.00, -41.20], [-3.20, -41.30], [-2.80, -40.80]
    ],
  },
  BA: {
    uf: 'BA',
    name: 'Bahia',
    capital: 'Salvador',
    center: [-12.50, -41.70],
    zoom: 6,
    polygon: [
      [-9.40, -40.50], [-9.30, -38.20], [-10.50, -37.50], [-13.00, -38.50],
      [-15.00, -39.00], [-18.00, -39.50], [-15.50, -43.50], [-14.50, -45.00],
      [-11.00, -45.50], [-9.50, -43.00], [-9.40, -40.50]
    ],
  },
  PE: {
    uf: 'PE',
    name: 'Pernambuco',
    capital: 'Recife',
    center: [-8.35, -37.80],
    zoom: 7,
    polygon: [
      [-7.50, -37.50], [-7.80, -35.00], [-8.05, -34.85], [-8.90, -35.20],
      [-9.00, -38.50], [-9.40, -40.50], [-8.50, -41.00], [-7.50, -40.00],
      [-7.50, -37.50]
    ],
  },
  RN: {
    uf: 'RN',
    name: 'Rio Grande do Norte',
    capital: 'Natal',
    center: [-5.70, -36.50],
    zoom: 8,
    polygon: [
      [-4.90, -37.10], [-5.10, -35.50], [-5.80, -35.20], [-6.50, -35.00],
      [-6.80, -37.00], [-6.50, -38.50], [-5.50, -38.00], [-4.90, -37.10]
    ],
  },
  PB: {
    uf: 'PB',
    name: 'Paraíba',
    capital: 'João Pessoa',
    center: [-7.10, -36.70],
    zoom: 8,
    polygon: [
      [-6.50, -38.50], [-6.80, -37.00], [-6.50, -35.00], [-7.10, -34.80],
      [-7.60, -34.80], [-7.80, -37.50], [-7.50, -38.80], [-6.50, -38.50]
    ],
  },
  MA: {
    uf: 'MA',
    name: 'Maranhão',
    capital: 'São Luís',
    center: [-5.00, -45.30],
    zoom: 6,
    polygon: [
      [-1.20, -44.50], [-2.50, -42.50], [-4.00, -43.00], [-7.00, -43.50],
      [-9.80, -46.00], [-7.00, -47.50], [-3.50, -47.00], [-1.20, -44.50]
    ],
  },
  PI: {
    uf: 'PI',
    name: 'Piauí',
    capital: 'Teresina',
    center: [-7.00, -42.50],
    zoom: 6,
    polygon: [
      [-2.80, -41.70], [-5.00, -41.20], [-7.50, -40.50], [-10.50, -45.00],
      [-9.00, -46.00], [-7.00, -43.50], [-4.00, -43.00], [-2.80, -41.70]
    ],
  },
  AL: {
    uf: 'AL',
    name: 'Alagoas',
    capital: 'Maceió',
    center: [-9.60, -36.60],
    zoom: 8,
    polygon: [
      [-8.90, -35.20], [-9.65, -35.70], [-10.50, -36.40], [-9.50, -38.20],
      [-9.00, -37.50], [-8.90, -35.20]
    ],
  },
  SE: {
    uf: 'SE',
    name: 'Sergipe',
    capital: 'Aracaju',
    center: [-10.60, -37.30],
    zoom: 8,
    polygon: [
      [-10.50, -36.40], [-11.00, -37.00], [-11.50, -37.40], [-10.00, -38.00],
      [-9.50, -37.80], [-10.50, -36.40]
    ],
  },
};

// Coordenadas geográficas reais das cidades com obras
export const REAL_CITIES: Record<string, RealCityGeo> = {
  'Fortaleza': {
    name: 'Fortaleza',
    uf: 'CE',
    center: [-3.7319, -38.5267],
    zoom: 12,
    hasWorks: true,
  },
  'Sobral': {
    name: 'Sobral',
    uf: 'CE',
    center: [-3.6880, -40.3490],
    zoom: 12,
    hasWorks: true,
  },
  'Juazeiro do Norte': {
    name: 'Juazeiro do Norte',
    uf: 'CE',
    center: [-7.2150, -39.3180],
    zoom: 12,
    hasWorks: true,
  },
  'Salvador': {
    name: 'Salvador',
    uf: 'BA',
    center: [-12.9777, -38.5016],
    zoom: 12,
    hasWorks: true,
  },
  'Feira de Santana': {
    name: 'Feira de Santana',
    uf: 'BA',
    center: [-12.2560, -38.9610],
    zoom: 12,
    hasWorks: true,
  },
  'Recife': {
    name: 'Recife',
    uf: 'PE',
    center: [-8.0578, -34.8829],
    zoom: 12,
    hasWorks: true,
  },
  'Natal': {
    name: 'Natal',
    uf: 'RN',
    center: [-5.7945, -35.2110],
    zoom: 12,
    hasWorks: true,
  },
  'João Pessoa': {
    name: 'João Pessoa',
    uf: 'PB',
    center: [-7.1195, -34.8450],
    zoom: 12,
    hasWorks: true,
  },
  'São Luís': {
    name: 'São Luís',
    uf: 'MA',
    center: [-2.5297, -44.2588],
    zoom: 12,
    hasWorks: true,
  },
  'Teresina': {
    name: 'Teresina',
    uf: 'PI',
    center: [-5.0892, -42.8016],
    zoom: 12,
    hasWorks: true,
  },
};


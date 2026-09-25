import { describe, it, expect } from 'vitest';
import { NORDESTE_STATES, STATE_MUNICIPALITIES, BRAZIL_OTHER_REGIONS, NORDESTE_OUTER_CONTOUR } from '../components/works/map/map-data';
import { INITIAL_WORKS } from '../lib/seed-data';

describe('Mapa Interativo do Nordeste - Estrutura e Dados Cartográficos', () => {
  it('deve conter as regiões do Brasil e o contorno perimetral do Nordeste bem definido', () => {
    expect(BRAZIL_OTHER_REGIONS).toHaveLength(4);
    expect(NORDESTE_OUTER_CONTOUR.startsWith('M ')).toBe(true);
  });

  it('deve conter os 9 estados da Região Nordeste com metadados e coordenadas válidos', () => {
    const ufs = Object.keys(NORDESTE_STATES);
    expect(ufs).toHaveLength(9);
    expect(ufs).toEqual(expect.arrayContaining(['CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'PI', 'MA']));

    ufs.forEach((uf) => {
      const state = NORDESTE_STATES[uf];
      expect(state.name).toBeTruthy();
      expect(state.capital).toBeTruthy();
      expect(state.path.startsWith('M ')).toBe(true);
      expect(state.labelPos.x).toBeGreaterThan(0);
      expect(state.labelPos.y).toBeGreaterThan(0);
      expect(state.badgePos.x).toBeGreaterThan(0);
      expect(state.badgePos.y).toBeGreaterThan(0);
    });
  });

  it('deve conter delimitações municipais com distinção entre cidades com obras e sem obras', () => {
    const ceMuni = STATE_MUNICIPALITIES['CE'];
    expect(ceMuni).toBeDefined();
    expect(ceMuni.length).toBeGreaterThan(3);

    // Cidades ativas com obras
    const activeMuni = ceMuni.filter((m) => m.hasWorks);
    expect(activeMuni.length).toBeGreaterThanOrEqual(3);
    expect(activeMuni.map((m) => m.name)).toEqual(expect.arrayContaining(['Fortaleza', 'Sobral', 'Juazeiro do Norte']));

    // Cidades/microrregiões sem obras (apenas para delimitação de contorno)
    const inactiveMuni = ceMuni.filter((m) => !m.hasWorks);
    expect(inactiveMuni.length).toBeGreaterThan(0);
  });

  it('deve conter obras georreferenciadas com endereço, bairro, CEP e coordenadas municipais', () => {
    expect(INITIAL_WORKS.length).toBeGreaterThan(0);

    const ceWorks = INITIAL_WORKS.filter((w) => w.state === 'CE');
    expect(ceWorks.length).toBeGreaterThanOrEqual(3);

    ceWorks.forEach((work) => {
      expect(work.address).toBeTruthy();
      expect(work.neighborhood).toBeTruthy();
      expect(work.postal_code).toBeTruthy();
      expect(work.map_coordinates).toBeDefined();
      expect(work.map_coordinates?.x).toBeGreaterThanOrEqual(0);
      expect(work.map_coordinates?.y).toBeGreaterThanOrEqual(0);
    });
  });

  it('deve permitir filtro hierárquico consistente: Nordeste -> Estado -> Cidade', () => {
    // 1. Nível Regional (Nordeste)
    const allWorks = INITIAL_WORKS;
    expect(allWorks.length).toBe(7);

    // 2. Nível Estadual (CE, PE, MA, PI)
    const ceWorks = allWorks.filter((w) => w.state === 'CE');
    expect(ceWorks.length).toBe(3);
    expect(ceWorks.map((w) => w.name)).toEqual(expect.arrayContaining(['Atrium Select', 'Unique', 'Bela Vitta']));

    const peWorks = allWorks.filter((w) => w.state === 'PE');
    expect(peWorks.length).toBe(2);
    expect(peWorks.map((w) => w.name)).toEqual(expect.arrayContaining(['Alameda Paradiso', 'Casa Real']));

    const maWorks = allWorks.filter((w) => w.state === 'MA');
    expect(maWorks.length).toBe(1);
    expect(maWorks[0].name).toBe('Renaissance');
    expect(maWorks[0].city).toBe('São Luís');

    const piWorks = allWorks.filter((w) => w.state === 'PI');
    expect(piWorks.length).toBe(1);
    expect(piWorks[0].name).toBe('Palladium');
    expect(piWorks[0].city).toBe('Teresina');

    // 3. Nível Municipal (Fortaleza)
    const fortalezaWorks = ceWorks.filter((w) => w.city === 'Fortaleza');
    expect(fortalezaWorks.length).toBe(3);
    expect(fortalezaWorks[0].address).toContain('Silva Paulet');
  });

  it('deve incluir delimitações para MA (São Luís) e PI (Teresina) em STATE_MUNICIPALITIES', () => {
    expect(STATE_MUNICIPALITIES['MA']).toBeDefined();
    expect(STATE_MUNICIPALITIES['MA'].some((m) => m.name === 'São Luís' && m.hasWorks)).toBe(true);

    expect(STATE_MUNICIPALITIES['PI']).toBeDefined();
    expect(STATE_MUNICIPALITIES['PI'].some((m) => m.name === 'Teresina' && m.hasWorks)).toBe(true);
  });
});

// Mapeamento e Consulta de Lançamentos Contábeis Reais (Razão ERP)
// Extraído da aba REAL da planilha oficial: T:\ANÁLISES (TIAGO E TANIA)\Orçamentos\Atrium\ATRIUM - Planejamento e Controle de Obra (PCO) - SET 26 - IMPORT.xlsx

import rawEntries from './atrium-real-entries.json';
import { ATRIUM_DRE_LINES, DreItem } from './atrium-dre-data';

export interface RealEntry {
  id: string;
  date: string;
  doc: string;
  supplier: string;
  desc: string;
  val: number;
  originalAccount: string;
  account: string;
}

export function normalizeAccountName(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Indexação em memória para busca instantânea O(1)
const entriesByAccount = new Map<string, RealEntry[]>();

for (const entry of rawEntries as RealEntry[]) {
  const norm = normalizeAccountName(entry.account);
  if (!entriesByAccount.has(norm)) {
    entriesByAccount.set(norm, []);
  }
  entriesByAccount.get(norm)!.push(entry);
}

/**
 * Retorna todos os lançamentos reais associados a uma conta da DRE ou grupo de contas.
 * @param accountName Nome da conta selecionada na DRE
 * @param childAccountNames Opcional: lista de contas filhas caso seja uma linha de grupo
 */
export function getEntriesForAccount(
  accountName: string,
  childAccountNames?: string[]
): RealEntry[] {
  const norm = normalizeAccountName(accountName);
  const directEntries = entriesByAccount.get(norm) || [];

  if (childAccountNames && childAccountNames.length > 0) {
    const combinedMap = new Map<string, RealEntry>();
    // Adiciona lançamentos diretos
    for (const e of directEntries) {
      combinedMap.set(e.id, e);
    }
    // Adiciona lançamentos das contas filhas
    for (const childName of childAccountNames) {
      const childNorm = normalizeAccountName(childName);
      const childList = entriesByAccount.get(childNorm) || [];
      for (const e of childList) {
        combinedMap.set(e.id, e);
      }
    }
    return Array.from(combinedMap.values());
  }

  return directEntries;
}

/**
 * Retorna os lançamentos contábeis correspondentes a qualquer linha (conta ou grupo) da DRE.
 * Se for uma conta folha (ex: ESTRUTURA DE CONCRETO, PIS), traz seus lançamentos diretos.
 * Se for um grupo (ex: MATERIAIS E SERVIÇOS, RECEITAS), agrega os lançamentos das contas filhas.
 */
export function getEntriesForDreItem(line: DreItem): RealEntry[] {
  const normName = normalizeAccountName(line.name);
  const direct = getEntriesForAccount(line.name);

  if (!line.isGroup) {
    return direct;
  }

  // Se for grupo, busca todas as contas filhas cujo subgrupo corresponde à linha
  const childNames = ATRIUM_DRE_LINES.filter(
    (l) =>
      !l.isGroup &&
      (normalizeAccountName(l.subgroup) === normName ||
        l.subgroup.toUpperCase() === line.name.toUpperCase())
  ).map((l) => l.name);

  // Se for grupo de nível superior sem subgrupo direto (ex: RECEITAS, DEDUÇÕES DA RECEITA, CUSTOS, DESPESAS)
  if (childNames.length === 0) {
    const byCategory = ATRIUM_DRE_LINES.filter(
      (l) =>
        !l.isGroup &&
        ((line.name === 'RECEITAS' && l.category === 'receita') ||
          (line.name === 'DEDUÇÕES DA RECEITA' && l.category === 'deducao') ||
          (line.name.includes('CUSTOS') && l.category === 'custo_obra') ||
          (line.name.includes('DESPESAS') && l.category === 'despesa') ||
          (line.name.includes('FINANCEIRO') && l.category === 'financeiro') ||
          (line.name.includes('INVESTIMENTO') && l.category === 'investimento'))
    ).map((l) => l.name);
    return getEntriesForAccount(line.name, byCategory);
  }

  return getEntriesForAccount(line.name, childNames);
}

/**
 * Retorna estatísticas rápidas dos lançamentos da conta
 */
export function getAccountEntriesStats(entries: RealEntry[]) {
  const count = entries.length;
  const totalVal = entries.reduce((acc, curr) => acc + curr.val, 0);
  const avgVal = count > 0 ? totalVal / count : 0;
  return { count, totalVal, avgVal };
}

export const ALL_REAL_ENTRIES = rawEntries as RealEntry[];

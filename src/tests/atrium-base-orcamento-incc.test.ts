import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  ATRIUM_BASE_ORCAMENTO_ITEMS,
  ATRIUM_BASE_ORCAMENTO_GROUPS,
  ATRIUM_BASE_TOTALS,
} from '../lib/atrium-base-orcamento';
import {
  ATRIUM_DEPARA_RULES,
  ATRIUM_REAL_TOTALS,
  ATRIUM_CONSOLIDATED_ACCOUNTS,
  findDeParaRule,
} from '../lib/atrium-real-data';

describe('Revisão Orçamento BASE ORÇAMENTO, INCC, De-Para e Realizado Incorrido', () => {
  it('1. Deve carregar a BASE ORÇAMENTO oficial com 298 itens e 23 grupos', () => {
    expect(ATRIUM_BASE_ORCAMENTO_ITEMS.length).toBe(298);
    expect(ATRIUM_BASE_ORCAMENTO_GROUPS.length).toBe(23);
    expect(ATRIUM_BASE_TOTALS.totalItems).toBe(298);
    expect(ATRIUM_BASE_TOTALS.totalGroups).toBe(23);

    // Verifica se há separação de MATERIAL e MÃO DE OBRA para mesma etapa/código
    const subetapasRepetidas = ATRIUM_BASE_ORCAMENTO_ITEMS.filter(
      (it) => it.code === '02.01'
    );
    expect(subetapasRepetidas.length).toBeGreaterThanOrEqual(2);
    const hasMat = subetapasRepetidas.some((it) => it.expenseType === 'MATERIAL');
    const hasMao = subetapasRepetidas.some((it) => it.expenseType === 'MÃO DE OBRA');
    expect(hasMat).toBe(true);
    expect(hasMao).toBe(true);
  });

  it('2. Deve conter as regras de De-Para e função de lookup de novas contas', () => {
    expect(ATRIUM_DEPARA_RULES.length).toBe(115);

    // Busca conta existente
    const ruleSalario = findDeParaRule('13º. Salário - Obra');
    expect(ruleSalario).not.toBeNull();
    expect(ruleSalario?.adjustedAccount).toBe('Salários - Obra');

    // Conta desconhecida deve retornar null para sinalizar cadastro no ERP import
    const unknown = findDeParaRule('CONTA_INEXISTENTE_DO_ERP_TESTE');
    expect(unknown).toBeNull();
  });

  it('3. Deve segregar o Realizado Incorrido em Obra (R$ 11,29M) e Extra Obra (R$ 11,94M)', () => {
    expect(ATRIUM_REAL_TOTALS.totalGeral).toBeCloseTo(23228634.46, 1);
    expect(ATRIUM_REAL_TOTALS.totalObra).toBeCloseTo(11292416.61, 1);
    expect(ATRIUM_REAL_TOTALS.totalExtraObra).toBeCloseTo(11936217.85, 1);
    expect(ATRIUM_REAL_TOTALS.countObra).toBe(3641);
    expect(ATRIUM_REAL_TOTALS.countExtraObra).toBe(1994);
    expect(ATRIUM_REAL_TOTALS.totalCount).toBe(5635);
  });

  it('4. Deve validar que as contas consolidadas contêm vinculação de etapas para Obra e sem etapa para Extra Obra', () => {
    const obraAccounts = ATRIUM_CONSOLIDATED_ACCOUNTS.filter((a) => a.isObra);
    const extraAccounts = ATRIUM_CONSOLIDATED_ACCOUNTS.filter((a) => !a.isObra);

    expect(obraAccounts.length).toBeGreaterThan(0);
    expect(extraAccounts.length).toBeGreaterThan(0);

    // Conta de Obra deve ter etapa
    const concreto = obraAccounts.find((a) => a.adjustedAccount.includes('Concreto') || a.adjustedAccount.includes('Estrutura'));
    expect(concreto).toBeDefined();
    expect(concreto?.budgetStage).toBeDefined();

    // Conta Extra Obra como Receita de Vendas não possui etapa do orçamento
    const receita = extraAccounts.find((a) => a.adjustedAccount.toUpperCase().includes('RECEITA'));
    expect(receita).toBeDefined();
    expect(receita?.budgetStage).toBeNull();
  });

  it('5. Deve validar a existência e estrutura da planilha gerada de Composição do Realizado Incorrido', () => {
    const targetPath = 'T:/ANÁLISES (TIAGO E TANIA)/Orçamentos/Atrium/ATRIUM - Composicao Realizado Incorrido (Obra x Extra Obra).xlsx';
    const publicPath = path.resolve('public/downloads/ATRIUM - Composicao Realizado Incorrido (Obra x Extra Obra).xlsx');

    const fileExists = fs.existsSync(targetPath) || fs.existsSync(publicPath);
    expect(fileExists).toBe(true);

    const pathToRead = fs.existsSync(publicPath) ? publicPath : targetPath;
    const buf = fs.readFileSync(pathToRead);
    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toContain('RESUMO CONSOLIDADO');
    expect(wb.SheetNames).toContain('REALIZADO INCORRIDO OBRA');
    expect(wb.SheetNames).toContain('REALIZADO EXTRA OBRA');

    // Validação da aba REALIZADO INCORRIDO OBRA
    const wsObra = wb.Sheets['REALIZADO INCORRIDO OBRA'];
    const rowsObra = XLSX.utils.sheet_to_json(wsObra);
    expect(rowsObra.length).toBe(3641);

    // Validação da aba REALIZADO EXTRA OBRA
    const wsExtra = wb.Sheets['REALIZADO EXTRA OBRA'];
    const rowsExtra = XLSX.utils.sheet_to_json(wsExtra);
    expect(rowsExtra.length).toBe(1994);
  });
});

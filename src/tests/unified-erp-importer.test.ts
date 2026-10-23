import { describe, it, expect } from 'vitest';
import fs from 'fs';
import * as XLSX from 'xlsx';
import {
  excelDateToIsoDate,
  sanitizeRowData,
  isUnifiedErpFile,
  auditAccountsDePara,
  detectWorkFromRows,
} from '../lib/erp-unified-importer';

describe('Importador Unificado do ERP e Auditoria de De-Para (atriumset26.xlsx)', () => {
  it('1. Deve reconhecer corretamente o cabeçalho e colunas do arquivo ERP unificado', () => {
    const headers = [
      'CD_UP', 'DE_UP', 'DOCUMENTO', 'CD_CTA_CST', 'ID_CTA_CST', 'NM_CTA_CST',
      'NM_CNT_CST', 'DT', 'NM_FRN', 'DE_LNC_CST', 'VL_LNC_CST', 'TP_CTA_CST',
      'CONTA', 'CD_CTA_TES', 'DE_CTA_TES', 'CMP_HST_TES', 'CD_ABG'
    ];

    expect(isUnifiedErpFile(headers)).toBe(true);
  });

  it('2. Deve converter datas seriais do Excel e sanitizar anomalias de colunas', () => {
    // 45181 = 12/09/2023
    const isoDate = excelDateToIsoDate(45181);
    expect(isoDate).toBe('2023-09-12');

    // Linha com anomalia PAGTO TRIB DIVERSOS
    const rawAnomalousRow = {
      DOCUMENTO: 'NF-999',
      NM_CNT_CST: 'ED. ATRIUM',
      DT: 45181,
      NM_FRN: 'RECEITA FEDERAL',
      DE_LNC_CST: 'PAGTO TRIB DIVERSOS',
      VL_LNC_CST: null,
      TP_CTA_CST: '945.54',
      NM_CTA_CST: 'COFINS',
      CD_ABG: 'PAGTO TRIB DIVERSOS',
    };

    const sanitized = sanitizeRowData(rawAnomalousRow, 2);
    expect(sanitized.valor).toBe(945.54);
    expect(sanitized.naturezaCodigo).toBe('P');
    expect(sanitized.data).toBe('2023-09-12');
  });

  it('3. Deve ler o arquivo atriumset26.xlsx, encontrar 116 contas distintas e identificar exatamente 1 sem De-Para', () => {
    const filePath = 'C:/Users/tiago.caetano/Downloads/atriumset26.xlsx';
    if (!fs.existsSync(filePath)) {
      console.warn('Arquivo atriumset26.xlsx não encontrado no caminho de testes, ignorando leitura em disco.');
      return;
    }

    const fileBuf = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    expect(rows.length).toBeGreaterThan(5000);

    const audit = auditAccountsDePara(rows, []);
    expect(audit.totalUniqueAccounts).toBe(116);
    expect(audit.mappedCount).toBe(115);
    expect(audit.unmappedAccounts.length).toBe(1);

    const unmapped = audit.unmappedAccounts[0];
    expect(unmapped.accountName).toBe('Juros e Multas Auferidos e Tx de Cessão');
    expect(unmapped.count).toBe(1);
    expect(unmapped.totalAmount).toBeCloseTo(4666.66, 2);
    expect(unmapped.groupingCodes).toContain('T');
    expect(unmapped.suggestedNature).toBe('rendimento');
  });

  it('4. Deve identificar dinamicamente a obra pelo Centro de Custo (NM_CNT_CST)', () => {
    const mockWorks = [
      { id: 'work-1', name: 'Atrium Select', code: 'OBR-001' },
      { id: 'work-2', name: 'Unique', code: 'OBR-002' },
      { id: 'work-3', name: 'Bela Vitta', code: 'OBR-003' },
    ];

    // Caso 1: Planilha do Atrium com "ED. ATRIUM"
    const rowsAtrium = [{ NM_CNT_CST: 'ED. ATRIUM', DOCUMENTO: 'DOC-1' }];
    const detAtrium = detectWorkFromRows(rowsAtrium, mockWorks);
    expect(detAtrium.detectedWork?.id).toBe('work-1');
    expect(detAtrium.costCenterName).toBe('ED. ATRIUM');

    // Caso 2: Planilha de outra obra com "ED. UNIQUE"
    const rowsUnique = [{ NM_CNT_CST: 'ED. UNIQUE', DOCUMENTO: 'DOC-2' }];
    const detUnique = detectWorkFromRows(rowsUnique, mockWorks);
    expect(detUnique.detectedWork?.id).toBe('work-2');
    expect(detUnique.costCenterName).toBe('ED. UNIQUE');

    // Caso 3: Planilha do Bela Vitta
    const rowsBelaVitta = [{ NM_CNT_CST: 'BELA VITTA', DOCUMENTO: 'DOC-3' }];
    const detBelaVitta = detectWorkFromRows(rowsBelaVitta, mockWorks);
    expect(detBelaVitta.detectedWork?.id).toBe('work-3');
    expect(detBelaVitta.costCenterName).toBe('BELA VITTA');
  });
});

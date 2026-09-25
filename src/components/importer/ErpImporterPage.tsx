import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ErpImportType, DeduplicationStrategy, ErpImportBatch, ErpImportError } from '../../types';
import { formatDateBR, formatBRL } from '../../lib/utils';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  History,
  X,
  FileUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const ErpImporterPage: React.FC = () => {
  const { works, importBatches, processErpImport } = useData();
  const { canEdit } = useAuth();

  const [importType, setImportType] = useState<ErpImportType>('incurred_costs');
  const [strategy, setStrategy] = useState<DeduplicationStrategy>('update_existing');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ batch: ErpImportBatch; errors: ErpImportError[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importTypesList: { id: ErpImportType; label: string; desc: string; targetFields: { key: string; label: string; required: boolean; defaultMatch: string[] }[] }[] = [
    {
      id: 'incurred_costs',
      label: '6. Custos Incorridos (Extrato ERP)',
      desc: 'Lançamentos financeiros efetivamente realizados pelo ERP (contas pagas/a pagar, NFs de medição)',
      targetFields: [
        { key: 'external_id', label: 'ID Externo ERP / Lançamento', required: false, defaultMatch: ['id_externo', 'id', 'codigo_erp', 'cod_erp', 'lancamento', 'num_lanc'] },
        { key: 'work_id', label: 'Código da Obra / Obra', required: true, defaultMatch: ['obra', 'codigo_obra', 'cod_obra', 'obra_codigo', 'projeto'] },
        { key: 'date', label: 'Data do Custo / Competência', required: true, defaultMatch: ['data', 'data_lancamento', 'dt_emissao', 'emissao', 'dt_vencimento'] },
        { key: 'document_number', label: 'Número NF / Documento', required: true, defaultMatch: ['documento', 'numero_documento', 'nf', 'nota_fiscal', 'doc', 'fatura'] },
        { key: 'supplier_name', label: 'Fornecedor / Favorecido', required: true, defaultMatch: ['fornecedor', 'favorecido', 'credor', 'nome_fornecedor', 'razao_social'] },
        { key: 'category', label: 'Categoria de Custo', required: false, defaultMatch: ['categoria', 'grupo', 'tipo_custo', 'classe'] },
        { key: 'cost_center', label: 'Centro de Custo', required: false, defaultMatch: ['centro_custo', 'cc', 'centro_de_custo'] },
        { key: 'description', label: 'Descrição do Custo', required: false, defaultMatch: ['descricao', 'historico', 'detalhe', 'especificacao'] },
        { key: 'net_value', label: 'Valor Líquido (R$)', required: true, defaultMatch: ['valor_liquido', 'liquido', 'valor', 'total', 'vlr_liquido', 'valor_bruto'] },
      ],
    },
    {
      id: 'works',
      label: '1. Obras',
      desc: 'Cadastro geral ou importação de contratos de obras do ERP',
      targetFields: [
        { key: 'code', label: 'Código Interno', required: true, defaultMatch: ['codigo', 'cod', 'id_obra'] },
        { key: 'erp_code', label: 'Código ERP', required: false, defaultMatch: ['codigo_erp', 'erp_code', 'cod_sistema'] },
        { key: 'name', label: 'Nome da Obra', required: true, defaultMatch: ['nome', 'nome_obra', 'obra', 'empreendimento'] },
        { key: 'client', label: 'Cliente', required: true, defaultMatch: ['cliente', 'proprietario', 'contratante'] },
        { key: 'city_state', label: 'Cidade / UF', required: false, defaultMatch: ['cidade_uf', 'cidade', 'uf', 'local'] },
        { key: 'contract_value', label: 'Valor do Contrato (R$)', required: true, defaultMatch: ['valor_contrato', 'contrato', 'receita_prevista', 'valor_total'] },
      ],
    },
    {
      id: 'budget',
      label: '2. Orçamento da Obra',
      desc: 'Planilha de serviços e insumos orçados',
      targetFields: [
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'description', label: 'Descrição do Item', required: true, defaultMatch: ['descricao', 'item', 'servico', 'insumo'] },
        { key: 'cost_group', label: 'Grupo / Categoria', required: true, defaultMatch: ['grupo', 'categoria', 'tipo'] },
        { key: 'unit', label: 'Unidade', required: true, defaultMatch: ['unidade', 'unid', 'un'] },
        { key: 'quantity_planned', label: 'Quantidade', required: true, defaultMatch: ['quantidade', 'qtd', 'quant'] },
        { key: 'unit_cost_planned', label: 'Custo Unitário (R$)', required: true, defaultMatch: ['unitario', 'custo_unitario', 'preco_unitario'] },
        { key: 'total_planned', label: 'Total Previsto (R$)', required: true, defaultMatch: ['total', 'custo_total', 'total_previsto'] },
      ],
    },
    {
      id: 'requisitions',
      label: '3. Requisições de Compra',
      desc: 'Solicitações de materiais e serviços exportadas do ERP',
      targetFields: [
        { key: 'internal_number', label: 'Número da Requisição', required: true, defaultMatch: ['numero', 'requisicao', 'num_req'] },
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'requester_name', label: 'Solicitante', required: true, defaultMatch: ['solicitante', 'usuario', 'requisitante'] },
        { key: 'justification', label: 'Justificativa', required: true, defaultMatch: ['justificativa', 'motivo', 'descricao'] },
        { key: 'total_estimated', label: 'Valor Estimado (R$)', required: false, defaultMatch: ['valor', 'total', 'estimado'] },
      ],
    },
    {
      id: 'orders',
      label: '4. Pedidos de Compra',
      desc: 'Ordens de compra emitidas para fornecedores',
      targetFields: [
        { key: 'internal_number', label: 'Número do Pedido', required: true, defaultMatch: ['numero_pedido', 'pedido', 'num_ped', 'ordem_compra'] },
        { key: 'supplier_name', label: 'Fornecedor', required: true, defaultMatch: ['fornecedor', 'razao_social'] },
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'delivery_forecast', label: 'Previsão de Entrega', required: true, defaultMatch: ['previsao', 'data_entrega', 'dt_previsao'] },
        { key: 'total_amount', label: 'Valor Total (R$)', required: true, defaultMatch: ['total', 'valor_total', 'valor_pedido'] },
      ],
    },
    {
      id: 'receipts',
      label: '5. Recebimentos Físicos / NFs',
      desc: 'Notas fiscais de entrada e medições recebidas',
      targetFields: [
        { key: 'invoice_number', label: 'Nota Fiscal', required: true, defaultMatch: ['nota_fiscal', 'nf', 'numero_nf'] },
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'receipt_date', label: 'Data do Recebimento', required: true, defaultMatch: ['data', 'data_recebimento', 'dt_recebimento'] },
        { key: 'received_value', label: 'Valor Recebido (R$)', required: true, defaultMatch: ['valor', 'valor_recebido', 'total_nf'] },
      ],
    },
    {
      id: 'revenues',
      label: '7. Receitas / Faturamento',
      desc: 'Medições faturadas e receitas de clientes',
      targetFields: [
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'document_number', label: 'Número da Medição / NF', required: true, defaultMatch: ['documento', 'medicao', 'nf_fatura'] },
        { key: 'date', label: 'Data da Medição', required: true, defaultMatch: ['data', 'dt_medicao'] },
        { key: 'recognized_value', label: 'Valor Faturado (R$)', required: true, defaultMatch: ['valor', 'faturado', 'valor_faturado'] },
      ],
    },
    {
      id: 'work_results',
      label: '8. Resultado Oficial por Obra',
      desc: 'Resultado e margem oficial apurados pela controladoria do ERP',
      targetFields: [
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'period', label: 'Competência / Mês', required: true, defaultMatch: ['periodo', 'mes', 'competencia'] },
        { key: 'erp_reported_result', label: 'Resultado Oficial ERP (R$)', required: true, defaultMatch: ['resultado', 'lucro', 'resultado_erp'] },
      ],
    },
    {
      id: 'labor',
      label: '9. Mão de Obra',
      desc: 'Apontamento de equipes e horas trabalhadas',
      targetFields: [
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'person_name', label: 'Nome do Colaborador', required: true, defaultMatch: ['colaborador', 'funcionario', 'nome'] },
        { key: 'date', label: 'Data do Apontamento', required: true, defaultMatch: ['data', 'dia'] },
        { key: 'units_worked', label: 'Horas / Dias Trabalhados', required: true, defaultMatch: ['horas', 'dias', 'unidades'] },
        { key: 'unit_cost', label: 'Custo Unitário', required: true, defaultMatch: ['custo', 'valor_hora', 'diaria'] },
      ],
    },
  ];

  const currentConfig = importTypesList.find((t) => t.id === importType)!;

  // Leitura do Arquivo (CSV ou XLSX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);

    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawHeaders = results.meta.fields || [];
          setHeaders(rawHeaders);
          setParsedRows(results.data as Record<string, any>[]);
          autoMapColumns(rawHeaders);
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });
        
        if (jsonRows.length > 0) {
          const rawHeaders = (jsonRows[0] as string[]).map((h) => String(h || '').trim());
          const dataRows = jsonRows.slice(1).map((row: any) => {
            const rowObj: Record<string, any> = {};
            rawHeaders.forEach((h, idx) => {
              rowObj[h] = row[idx];
            });
            return rowObj;
          });

          setHeaders(rawHeaders);
          setParsedRows(dataRows);
          autoMapColumns(rawHeaders);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  // Mapeamento Automático Inteligente por Heurística de Nomes Semelhantes
  const autoMapColumns = (rawHeaders: string[]) => {
    const mappings: Record<string, string> = {};

    currentConfig.targetFields.forEach((field) => {
      // Procura correspondência exata ou fuzzy
      const match = rawHeaders.find((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return field.defaultMatch.some((alias) => clean.includes(alias.replace(/[^a-z0-9]/g, '')));
      });

      if (match) {
        mappings[field.key] = match;
      }
    });

    setColumnMappings(mappings);
  };

  // Download de Planilhas Modelo com cabeçalhos brasileiros e exemplos reais
  const handleDownloadTemplate = (typeId: ErpImportType) => {
    const targetConfig = importTypesList.find((t) => t.id === typeId)!;
    
    // Gera dados de exemplo para o template
    let sampleData: Record<string, any>[] = [];

    if (typeId === 'incurred_costs') {
      sampleData = [
        {
          id_externo: 'ERP-7789',
          codigo_obra: 'OBR-001',
          data: '2026-03-15',
          documento: 'NF-e 044.200',
          fornecedor: 'Gerdau Aços Longos',
          categoria: 'material',
          centro_custo: 'CC-102-ESTR',
          descricao: 'Fornecimento de barras de aço CA-50',
          valor_liquido: 84500.00,
        },
        {
          id_externo: 'ERP-7790',
          codigo_obra: 'OBR-001',
          data: '2026-03-16',
          documento: 'FAT-2026-90',
          fornecedor: 'Locações Pesadas Ltda',
          categoria: 'equipamento',
          centro_custo: 'CC-105-CANT',
          descricao: 'Locação de elevador cremalheira canteiro',
          valor_liquido: 12400.00,
        },
      ];
    } else if (typeId === 'works') {
      sampleData = [
        {
          codigo: 'OBR-004',
          codigo_erp: 'ERP-SC-4001',
          nome: 'Condomínio Sunset Beach Residence',
          cliente: 'Litoral Incorporações',
          cidade_uf: 'Balneário Camboriú/SC',
          valor_contrato: 24000000.00,
        },
      ];
    } else {
      sampleData = [
        targetConfig.targetFields.reduce((acc, f) => ({ ...acc, [f.key]: `Exemplo ${f.label}` }), {}),
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, `modelo_importacao_${typeId}.xlsx`);
  };

  // Execução do Processamento em Lote com a Estratégia Escolhida
  const handleExecuteImport = () => {
    if (!file || parsedRows.length === 0) return;

    setIsProcessing(true);

    // Mapeia as linhas conforme o de/para configurado
    const normalizedRows = parsedRows.map((row) => {
      const item: Record<string, any> = {};
      Object.entries(columnMappings).forEach(([targetField, rawHeader]) => {
        if (rawHeader) {
          item[targetField] = row[rawHeader];
        }
      });
      return item;
    });

    const result = processErpImport(importType, file.name, normalizedRows, strategy);
    setIsProcessing(false);
    setImportResult(result);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Motor de Dados do ERP
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Importações do ERP via Planilhas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suporte a CSV e XLSX com mapeamento dinâmico de colunas, validações e conciliação idempotente.
          </p>
        </div>

        {/* Botão de Download de Modelo do Tipo Atual */}
        <button
          onClick={() => handleDownloadTemplate(importType)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors"
          title="Baixar planilha modelo com cabeçalhos prontos"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Baixar Modelo ({importType})</span>
        </button>
      </div>

      {/* Grid Principal: Configuração de Upload & Mapeamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Parâmetros e Upload */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">1</span>
            <span>Parâmetros da Importação</span>
          </h3>

          <div>
            <label className="block text-slate-300 font-semibold text-xs mb-1">Tipo de Dado do ERP *</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ErpImportType);
                setFile(null);
                setParsedRows([]);
                setImportResult(null);
              }}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
            >
              {importTypesList.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900">
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">{currentConfig.desc}</p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold text-xs mb-1">Tratamento de Duplicidades (Idempotência) *</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as DeduplicationStrategy)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
            >
              <option value="update_existing" className="bg-slate-900">
                Atualizar registros existentes (Upsert seguro)
              </option>
              <option value="insert_new" className="bg-slate-900">
                Inserir apenas novos (Ignorar duplicados)
              </option>
              <option value="reject_duplicates" className="bg-slate-900">
                Rejeitar lote se houver duplicidade
              </option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Garante que reprocessar a mesma planilha não duplicará custos ou compromissos.
            </p>
          </div>

          {/* Área de Upload (Drag and Drop / Clique) */}
          <div className="pt-2">
            <label className="block text-slate-300 font-semibold text-xs mb-1.5">Selecionar Planilha (.CSV ou .XLSX)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileUp className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
              {file ? (
                <div>
                  <strong className="text-white text-xs block truncate">{file.name}</strong>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1 inline-block">
                    ✓ {(file.size / 1024).toFixed(1)} KB carregados ({parsedRows.length} linhas)
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-300 font-semibold block">Clique para enviar o arquivo</span>
                  <span className="text-[10px] text-slate-500">Formato CSV ou XLSX extraído do ERP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna 2 e 3: Mapeamento de Colunas e Pré-visualização */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">2</span>
              <span>De/Para Inteligente de Colunas</span>
            </h3>
            {headers.length > 0 && (
              <span className="text-[11px] text-blue-400 font-medium">
                {headers.length} colunas identificadas no arquivo
              </span>
            )}
          </div>

          {headers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Envie um arquivo CSV ou XLSX ao lado para visualizar o de/para de colunas e os dados das primeiras linhas.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grade de Mapeamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-64 overflow-y-auto pr-1">
                {currentConfig.targetFields.map((field) => (
                  <div key={field.key} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200 font-semibold">
                        {field.label} {field.required && <strong className="text-red-400">*</strong>}
                      </span>
                      {columnMappings[field.key] ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Mapeado</span>
                      ) : (
                        <span className="text-[10px] text-amber-400">Pendente</span>
                      )}
                    </div>

                    <select
                      value={columnMappings[field.key] || ''}
                      onChange={(e) => setColumnMappings({ ...columnMappings, [field.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                    >
                      <option value="">-- Ignorar ou Não Mapear --</option>
                      {headers.map((h) => (
                        <option key={h} value={h} className="bg-slate-900 font-sans">
                          Coluna: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Pré-visualização das Primeiras 3 Linhas */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Pré-visualização dos Dados (Primeiras Linhas):
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 font-mono whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parsedRows.slice(0, 3).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-1.5 whitespace-nowrap">{String(r[h] ?? '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão de Processamento */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Total de linhas a processar: <strong className="text-white">{parsedRows.length}</strong>
                </div>

                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing || parsedRows.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processando Lote...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar e Processar Importação</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Relatório Final da Importação com Detalhamento de Erros Linha a Linha */}
      {importResult && (
        <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Relatório de Execução do Lote</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Lote: {importResult.batch.id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block font-medium">Total de Linhas</span>
              <strong className="text-base text-white font-bold">{importResult.batch.total_rows}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-emerald-400 block font-medium">Importadas</span>
              <strong className="text-base text-emerald-400 font-bold">{importResult.batch.imported_rows}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-blue-400 block font-medium">Atualizadas</span>
              <strong className="text-base text-blue-400 font-bold">{importResult.batch.updated_rows}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block font-medium">Ignoradas</span>
              <strong className="text-base text-slate-300 font-bold">{importResult.batch.ignored_rows}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-red-400 block font-medium">Rejeitadas com Erro</span>
              <strong className="text-base text-red-400 font-bold">{importResult.batch.rejected_rows}</strong>
            </div>
          </div>

          {/* Erros Detalhados */}
          {importResult.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 text-xs">
              <span className="font-bold text-red-400 block mb-2">Detalhamento dos Erros por Linha:</span>
              <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[11px] text-red-300">
                {importResult.errors.map((err, idx) => (
                  <div key={idx}>
                    Linha {err.row_number}: {err.error_message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico Completo de Lotes Importados */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-400" />
            <span>Histórico de Lotes Importados</span>
          </h3>
          <span className="text-xs text-slate-400">{importBatches.length} lote(s) registrado(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Arquivo</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Usuário</th>
                <th className="p-3 text-center">Total</th>
                <th className="p-3 text-center">Importadas</th>
                <th className="p-3 text-center">Atualizadas</th>
                <th className="p-3 text-center">Rejeitadas</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {importBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="p-3 text-slate-400">{formatDateBR(b.created_at.split('T')[0])}</td>
                  <td className="p-3 font-semibold text-white truncate max-w-xs">{b.file_name}</td>
                  <td className="p-3 uppercase text-[10px] font-bold text-blue-400">{b.import_type}</td>
                  <td className="p-3">{b.user_name}</td>
                  <td className="p-3 text-center font-bold">{b.total_rows}</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{b.imported_rows}</td>
                  <td className="p-3 text-center text-blue-400 font-bold">{b.updated_rows}</td>
                  <td className="p-3 text-center text-red-400 font-bold">{b.rejected_rows}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'processado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

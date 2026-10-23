import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ErpImportType, DeduplicationStrategy, ErpImportBatch, ErpImportError, UnmappedAccountItem } from '../../types';
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
  Sparkles,
  Layers,
  Database,
  ShieldAlert,
  Save,
  Check,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  isUnifiedErpFile,
  auditAccountsDePara,
  executeUnifiedErpImport,
  saveNewDeParaToSupabase,
  detectWorkFromRows,
} from '../../lib/erp-unified-importer';
import { ATRIUM_DEPARA_RULES } from '../../lib/atrium-real-data';

export const ErpImporterPage: React.FC = () => {
  const {
    works,
    budgetAccounts,
    importBatches,
    customDeParaRules,
    addCustomDeParaRule,
    applyUnifiedErpImportResult,
    processErpImport,
  } = useData();
  const { canEdit } = useAuth();

  const [importType, setImportType] = useState<ErpImportType>('unified_erp_ledger');
  const [strategy, setStrategy] = useState<DeduplicationStrategy>('update_existing');
  const [targetWorkId, setTargetWorkId] = useState<string>('work-1');
  const [detectedCostCenter, setDetectedCostCenter] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ batch: ErpImportBatch; errors: ErpImportError[] } | null>(null);

  // Estados específicos para o Importador Unificado ERP e De-Para
  const [unmappedAccounts, setUnmappedAccounts] = useState<UnmappedAccountItem[]>([]);
  const [mappedAccountsCount, setMappedAccountsCount] = useState<number>(0);
  const [totalAccountsCount, setTotalAccountsCount] = useState<number>(0);
  const [selectedUnmappedItem, setSelectedUnmappedItem] = useState<UnmappedAccountItem | null>(null);
  const [isSavingDePara, setIsSavingDePara] = useState(false);
  const [deParaSaveSuccess, setDeParaSaveSuccess] = useState(false);

  // Formulário do modal de resolução do De-Para
  const [formNature, setFormNature] = useState<'custo_obra' | 'despesa_adm' | 'receita' | 'rendimento' | 'imposto_dre'>('rendimento');
  const [formAdjustedAccount, setFormAdjustedAccount] = useState('');
  const [formBudgetStage, setFormBudgetStage] = useState('');

  // Resultado da importação unificada
  const [unifiedSummary, setUnifiedSummary] = useState<{
    totalRows: number;
    newCostsCount: number;
    newRevenuesCount: number;
    insertedCount: number;
    preservedCount: number;
    totalCostAmount: number;
    totalRevenueAmount: number;
    batchId: string;
    supabaseWarning?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de contas totalizadoras conhecidas para sugestão
  const knownTotalizers = useMemo(() => {
    const set = new Set<string>();
    ATRIUM_DEPARA_RULES.forEach((r) => set.add(r.adjustedAccount));
    customDeParaRules.forEach((r) => set.add(r.adjustedAccount));
    return Array.from(set).sort();
  }, [customDeParaRules]);

  // Lista de etapas orçamentárias conhecidas
  const knownStages = useMemo(() => {
    const set = new Set<string>();
    budgetAccounts.forEach((b) => {
      if (b.description) {
        set.add(b.description);
      }
    });
    set.add('DESPESAS GERAIS');
    set.add('ESTRUTURA DE CONCRETO');
    set.add('ALVENARIA E FECHAMENTOS');
    set.add('INSTALAÇÕES HIDRÁULICAS');
    set.add('INSTALAÇÕES ELÉTRICAS');
    set.add('REVESTIMENTO INTERNO');
    set.add('REVESTIMENTO EXTERNO / FACHADA');
    set.add('ESQUADRIAS E VIDROS');
    set.add('PINTURA');
    return Array.from(set).sort();
  }, [budgetAccounts]);

  const importTypesList: {
    id: ErpImportType;
    label: string;
    desc: string;
    targetFields: { key: string; label: string; required: boolean; defaultMatch: string[] }[];
  }[] = [
    {
      id: 'unified_erp_ledger',
      label: '★ Extrato Geral Unificado ERP (Custos, Despesas e Receitas Juntos)',
      desc: 'Recomendado para o arquivo padrão exportado do ERP (ex: atriumset26.xlsx). Triagem automática por CD_ABG (P=Custos/Despesas, R/T=Receitas), auditoria completa de De-Para e sincronização em lote com Supabase.',
      targetFields: [
        { key: 'NM_CNT_CST', label: 'Nome da Obra', required: true, defaultMatch: ['nm_cnt_cst', 'obra', 'projeto'] },
        { key: 'DT', label: 'Data do Gasto / Recebimento', required: true, defaultMatch: ['dt', 'data', 'data_gasto'] },
        { key: 'NM_FRN', label: 'Fornecedor / Cliente', required: true, defaultMatch: ['nm_frn', 'fornecedor', 'cliente', 'favorecido'] },
        { key: 'VL_LNC_CST', label: 'Valor Líquido (R$)', required: true, defaultMatch: ['vl_lnc_cst', 'valor', 'liquido'] },
        { key: 'DOCUMENTO', label: 'Documento / NF', required: true, defaultMatch: ['documento', 'nf', 'nota_fiscal'] },
        { key: 'DE_LNC_CST', label: 'Descrição do Lançamento', required: true, defaultMatch: ['de_lnc_cst', 'descricao', 'historico'] },
        { key: 'NM_CTA_CST', label: 'Conta Contábil ERP (De-Para)', required: true, defaultMatch: ['nm_cta_cst', 'conta', 'categoria'] },
      ],
    },
    {
      id: 'incurred_costs',
      label: 'Custos Incorridos (Extrato ERP Separado)',
      desc: 'Apenas lançamentos financeiros de custos e despesas pagos pelo ERP.',
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
      id: 'revenues',
      label: 'Receitas / Faturamento (Separado)',
      desc: 'Medições faturadas e receitas de clientes exportadas isoladamente.',
      targetFields: [
        { key: 'work_id', label: 'Código da Obra', required: true, defaultMatch: ['obra', 'codigo_obra'] },
        { key: 'document_number', label: 'Número da Medição / NF', required: true, defaultMatch: ['documento', 'medicao', 'nf_fatura'] },
        { key: 'date', label: 'Data da Medição', required: true, defaultMatch: ['data', 'dt_medicao'] },
        { key: 'recognized_value', label: 'Valor Faturado (R$)', required: true, defaultMatch: ['valor', 'faturado', 'valor_faturado'] },
      ],
    },
    {
      id: 'works',
      label: 'Cadastro Geral de Obras',
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
  ];

  const currentConfig = importTypesList.find((t) => t.id === importType) || importTypesList[0];

  // Leitura do Arquivo (CSV ou XLSX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);
    setUnifiedSummary(null);

    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawHeaders = results.meta.fields || [];
          setHeaders(rawHeaders);
          const data = results.data as Record<string, any>[];
          setParsedRows(data);
          detectAndAuditFile(rawHeaders, data);
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
          detectAndAuditFile(rawHeaders, dataRows);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  // Auto-detecção de modelo unificado, obra de destino e auditoria de De-Para
  const detectAndAuditFile = (rawHeaders: string[], dataRows: Record<string, any>[]) => {
    // 1. Identificação da Obra pelo Centro de Custo da planilha
    const detection = detectWorkFromRows(dataRows, works);
    if (detection.detectedWork) {
      setTargetWorkId(detection.detectedWork.id);
      setDetectedCostCenter(detection.costCenterName || '');
    } else if (detection.costCenterName) {
      setDetectedCostCenter(detection.costCenterName);
    }

    if (isUnifiedErpFile(rawHeaders)) {
      setImportType('unified_erp_ledger');
      autoMapColumns(rawHeaders, 'unified_erp_ledger');

      // Auditoria imediata de contas sem De-Para
      const audit = auditAccountsDePara(dataRows, customDeParaRules);
      setUnmappedAccounts(audit.unmappedAccounts);
      setMappedAccountsCount(audit.mappedCount);
      setTotalAccountsCount(audit.totalUniqueAccounts);

      // Se houver conta não mapeada, abre automaticamente a primeira para apontamento
      if (audit.unmappedAccounts.length > 0) {
        openResolveModal(audit.unmappedAccounts[0]);
      }
    } else {
      autoMapColumns(rawHeaders, importType);
    }
  };

  // Reavalia contas sem De-Para quando customDeParaRules mudar
  useEffect(() => {
    if (importType === 'unified_erp_ledger' && parsedRows.length > 0) {
      const audit = auditAccountsDePara(parsedRows, customDeParaRules);
      setUnmappedAccounts(audit.unmappedAccounts);
      setMappedAccountsCount(audit.mappedCount);
      setTotalAccountsCount(audit.totalUniqueAccounts);
    }
  }, [customDeParaRules, parsedRows, importType]);

  const autoMapColumns = (rawHeaders: string[], targetTypeId: ErpImportType) => {
    const targetConfig = importTypesList.find((t) => t.id === targetTypeId) || currentConfig;
    const mappings: Record<string, string> = {};

    targetConfig.targetFields.forEach((field) => {
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

  // Abre modal para resolver conta pendente de De-Para
  const openResolveModal = (item: UnmappedAccountItem) => {
    setSelectedUnmappedItem(item);
    setFormNature(item.suggestedNature);
    setFormAdjustedAccount(item.targetAdjustedAccount || item.accountName);
    setFormBudgetStage(item.targetBudgetStage || 'DESPESAS GERAIS');
    setDeParaSaveSuccess(false);
  };

  // Salva a nova regra de De-Para no Supabase e no estado local
  const handleSaveDePara = async () => {
    if (!selectedUnmappedItem) return;

    setIsSavingDePara(true);
    const updatedItem: UnmappedAccountItem = {
      ...selectedUnmappedItem,
      suggestedNature: formNature,
      targetAdjustedAccount: formAdjustedAccount.trim() || selectedUnmappedItem.accountName,
      targetBudgetStage: formNature === 'custo_obra' ? formBudgetStage : undefined,
    };

    // 1. Grava no Supabase (erp_account_consolidation_mappings)
    await saveNewDeParaToSupabase(updatedItem);

    // 2. Grava na memória e localStorage via DataContext
    addCustomDeParaRule({
      id: `custom-depara-${Date.now()}`,
      originalAccount: updatedItem.accountName,
      adjustedAccount: updatedItem.targetAdjustedAccount,
      isObra: formNature === 'custo_obra',
      budgetStage: formNature === 'custo_obra' ? formBudgetStage : undefined,
    });

    setIsSavingDePara(false);
    setDeParaSaveSuccess(true);

    // Remove da lista de pendências
    setTimeout(() => {
      setUnmappedAccounts((prev) => {
        const remaining = prev.filter((u) => u.accountName !== selectedUnmappedItem.accountName);
        if (remaining.length > 0) {
          openResolveModal(remaining[0]);
        } else {
          setSelectedUnmappedItem(null);
        }
        return remaining;
      });
      setDeParaSaveSuccess(false);
    }, 700);
  };

  // Execução do Processamento em Lote
  const handleExecuteImport = async () => {
    if (!file || parsedRows.length === 0) return;

    // Se houver contas sem De-Para no modo unificado, impede a conclusão e abre o modal
    if (importType === 'unified_erp_ledger' && unmappedAccounts.length > 0) {
      openResolveModal(unmappedAccounts[0]);
      return;
    }

    setIsProcessing(true);

    if (importType === 'unified_erp_ledger') {
      // Motor Especializado Unificado ERP com sincronização no Supabase
      const supabaseWorkId = targetWorkId === 'work-1' ? 'a0000000-0000-0000-0000-000000000001' : targetWorkId;
      const result = await executeUnifiedErpImport(
        file.name,
        parsedRows,
        customDeParaRules,
        strategy,
        targetWorkId,
        supabaseWorkId
      );

      setIsProcessing(false);

      if (result.success) {
        applyUnifiedErpImportResult({
          newCosts: result.newCosts,
          newRevenues: result.newRevenues,
          batch: result.batch,
        });

        setUnifiedSummary({
          totalRows: result.totalRows,
          newCostsCount: result.newCosts.length,
          newRevenuesCount: result.newRevenues.length,
          insertedCount: result.insertedEntriesCount,
          preservedCount: result.alreadyExistingCount,
          totalCostAmount: result.totalCostAmount,
          totalRevenueAmount: result.totalRevenueAmount,
          batchId: result.batch.id,
          supabaseWarning: result.supabaseWarning,
        });
      } else {
        alert(result.error || 'Erro ao processar importação no Supabase.');
      }
    } else {
      // Motor Legado Simples
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
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Design Premium */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Motor de Dados ERP & Supabase Cloud
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Importação Contábil / Financeira ERP</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              atriumset26.xlsx compatível
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suporta o arquivo consolidado de movimentação financeira com segregação automática de Custos, Despesas e Receitas e validação prévia de De-Para.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Selecionar Planilha ERP</span>
          </button>
        </div>
      </div>

      {/* Alerta de Auditoria De-Para (Quando há conta sem classificação) */}
      {parsedRows.length > 0 && importType === 'unified_erp_ledger' && unmappedAccounts.length > 0 && (
        <div className="glass-card rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 animate-in fade-in space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Apontamento de De-Para Obrigatório</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {unmappedAccounts.length} conta(s) pendente(s)
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Identificamos conta(s) contábil(is) no arquivo sem classificação vinculada. Para garantir a integridade dos relatórios e do DRE, defina o De-Para antes de concluir a importação.
                </p>
              </div>
            </div>

            <button
              onClick={() => openResolveModal(unmappedAccounts[0])}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apontar De-Para ({unmappedAccounts.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {unmappedAccounts.map((u, i) => (
              <div
                key={i}
                onClick={() => openResolveModal(u)}
                className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <strong className="text-xs text-amber-200 block truncate max-w-xs">{u.accountName}</strong>
                  <span className="text-[10px] text-slate-400">
                    {u.count} lançamento(s) • Total: {formatBRL(u.totalAmount)}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                  Clique para Mapear
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicador de 100% Mapeado */}
      {parsedRows.length > 0 && importType === 'unified_erp_ledger' && unmappedAccounts.length === 0 && (
        <div className="glass-card rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white block font-bold">100% das Contas do ERP Mapeadas no De-Para!</strong>
              <span className="text-slate-400">
                Todas as {totalAccountsCount} contas distintas encontradas no arquivo possuem regras de classificação ativas e prontas para o Supabase.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
            De-Para Validado ✓
          </span>
        </div>
      )}

      {/* Grid Principal: Configuração de Upload & Mapeamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Parâmetros e Upload */}
        <div className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs">1</span>
            <span>Parâmetros da Importação</span>
          </h3>

          {/* Seleção e Detecção da Obra de Destino */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-semibold text-xs">
                Obra de Destino *
              </label>
              {detectedCostCenter && (
                <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[180px]" title={detectedCostCenter}>
                  ✓ CC: "{detectedCostCenter}"
                </span>
              )}
            </div>
            <select
              value={targetWorkId}
              onChange={(e) => setTargetWorkId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold text-white bg-slate-900 border border-slate-700 focus:border-blue-500"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {detectedCostCenter
                ? `Identificado automaticamente pela coluna NM_CNT_CST ("${detectedCostCenter}"). Você pode alterar se desejar direcionar para outra obra.`
                : 'Selecione para qual obra os custos e receitas serão direcionados.'}
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold text-xs mb-1">Modelo de Arquivo *</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ErpImportType);
                setFile(null);
                setParsedRows([]);
                setImportResult(null);
                setUnifiedSummary(null);
                setUnmappedAccounts([]);
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
                Preservar e sincronizar novos lançamentos (Recomendado)
              </option>
              <option value="insert_new" className="bg-slate-900">
                Inserir apenas novos (Ignorar os já gravados no Supabase)
              </option>
              <option value="reject_duplicates" className="bg-slate-900">
                Rejeitar lote se houver duplicidade
              </option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Chave única: (Obra + Documento + Data + Valor + Conta) evita lançamentos repetidos.
            </p>
          </div>

          {/* Área de Upload */}
          <div className="pt-2">
            <label className="block text-slate-300 font-semibold text-xs mb-1.5">Selecionar Arquivo .XLSX / .CSV</label>
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
                  <span className="text-[10px] text-slate-500">Ex: atriumset26.xlsx</span>
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
              <span>Estrutura e Mapeamento de Campos</span>
            </h3>
            {headers.length > 0 && (
              <span className="text-[11px] text-blue-400 font-medium">
                {headers.length} colunas identificadas • {parsedRows.length} linhas
              </span>
            )}
          </div>

          {headers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Envie o arquivo do ERP ao lado para visualizar os campos e iniciar a conferência automática.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grade de Mapeamento de Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-h-56 overflow-y-auto pr-1">
                {currentConfig.targetFields.map((field) => (
                  <div key={field.key} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200 font-semibold">
                        {field.label} {field.required && <strong className="text-red-400">*</strong>}
                      </span>
                      {columnMappings[field.key] ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Mapeado ({columnMappings[field.key]})</span>
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

              {/* Pré-visualização das Primeiras Linhas */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Pré-visualização dos Lançamentos (Primeiras 3 Linhas):
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-36 overflow-y-auto">
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
                            <td key={h} className="px-3 py-1.5 whitespace-nowrap font-mono text-[10px]">{String(r[h] ?? '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão de Processamento */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Linhas prontas para importação: <strong className="text-white">{parsedRows.length}</strong>
                  {importType === 'unified_erp_ledger' && unmappedAccounts.length > 0 && (
                    <span className="text-amber-400 ml-2 font-semibold">
                      (Aguardando apontamento de {unmappedAccounts.length} conta)
                    </span>
                  )}
                </div>

                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing || parsedRows.length === 0 || (importType === 'unified_erp_ledger' && unmappedAccounts.length > 0)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sincronizando com Supabase Cloud...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {importType === 'unified_erp_ledger'
                          ? 'Concluir Importação e Gravar no Supabase'
                          : 'Confirmar e Processar Importação'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Relatório Final da Importação Unificada */}
      {unifiedSummary && (
        <div className="glass-card rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Importação Unificada Concluída com Sucesso!</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">Lote: {unifiedSummary.batchId}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block font-medium">Linhas no Arquivo ERP</span>
              <strong className="text-lg text-white font-bold">{unifiedSummary.totalRows}</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <span className="text-emerald-400 block font-medium">Novos Lançamentos (Supabase)</span>
              <strong className="text-lg text-emerald-400 font-bold">+{unifiedSummary.insertedCount}</strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">Referente a Setembro/2026</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/30">
              <span className="text-blue-400 block font-medium">Lançamentos Preservados</span>
              <strong className="text-lg text-blue-400 font-bold">{unifiedSummary.preservedCount}</strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">Idempotência confirmada</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/30">
              <span className="text-purple-400 block font-medium">De-Para Aplicado</span>
              <strong className="text-lg text-purple-300 font-bold">100%</strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">Totalmente conciliado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 text-[11px] block">Custos e Despesas Incorridas</span>
                <strong className="text-sm text-red-400 font-bold">{formatBRL(unifiedSummary.totalCostAmount)}</strong>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
                {unifiedSummary.newCostsCount} itens
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-400 text-[11px] block">Receitas e Rendimentos de Caixa</span>
                <strong className="text-sm text-emerald-400 font-bold">{formatBRL(unifiedSummary.totalRevenueAmount)}</strong>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {unifiedSummary.newRevenuesCount} itens
              </span>
            </div>
          </div>

          {unifiedSummary.supabaseWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold text-amber-300">
                  Lançamentos Importados e Conciliados na Aplicação!
                </strong>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Os lançamentos foram processados com sucesso no Demonstrativo DRE e no centro de custos. No Supabase Cloud, a gravação foi pausada pela política de segurança RLS (Row Level Security).
                </p>
                <p className="text-[11px] text-amber-300/90 font-medium">
                  Para sincronizar também no banco do Supabase, execute o script SQL de permissões RLS no painel do Supabase.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Relatório Legado */}
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
                  <td className="p-3 uppercase text-[10px] font-bold text-blue-400">
                    {b.import_type === 'unified_erp_ledger' ? 'Extrato Unificado ERP' : b.import_type}
                  </td>
                  <td className="p-3">{b.user_name}</td>
                  <td className="p-3 text-center font-bold">{b.total_rows}</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{b.imported_rows}</td>
                  <td className="p-3 text-center text-blue-400 font-bold">{b.updated_rows}</td>
                  <td className="p-3 text-center text-red-400 font-bold">{b.rejected_rows}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'processado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interativo de Resolução de De-Para de Conta Nova */}
      {selectedUnmappedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-amber-500/30 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Apontamento de De-Para (Conta Nova)</h3>
                  <p className="text-xs text-slate-400">Vincule a conta do ERP à estrutura gerencial do sistema</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnmappedItem(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dados da Conta no Arquivo */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome no ERP (NM_CTA_CST):</span>
                <strong className="text-white font-mono text-right">{selectedUnmappedItem.accountName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lançamentos no Arquivo:</span>
                <span className="text-slate-200">{selectedUnmappedItem.count} registro(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total no Lote:</span>
                <strong className="text-emerald-400 font-bold">{formatBRL(selectedUnmappedItem.totalAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Código de Abrangência (CD_ABG):</span>
                <span className="text-blue-400 font-mono font-bold">
                  {selectedUnmappedItem.groupingCodes.join(', ') || 'N/A'}
                </span>
              </div>
            </div>

            {/* Formulário de Classificação */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  1. Natureza Contábil / Financeira *
                </label>
                <select
                  value={formNature}
                  onChange={(e) => setFormNature(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
                >
                  <option value="rendimento" className="bg-slate-900">
                    Receita Financeira / Tesouraria (Juros, Rendimentos, Taxas)
                  </option>
                  <option value="receita" className="bg-slate-900">
                    Receita Operacional Bruta (Vendas de Imóveis, Repasses)
                  </option>
                  <option value="custo_obra" className="bg-slate-900">
                    Custo Direto de Obra (Materiais, Serviços, Mão de Obra)
                  </option>
                  <option value="despesa_adm" className="bg-slate-900">
                    Despesa Indireta / Administrativa / Comercial
                  </option>
                  <option value="imposto_dre" className="bg-slate-900">
                    Imposto sobre Faturamento / DRE (COFINS, PIS, IRPJ, CSLL)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  2. Conta Ajustada / Totalizadora (Destino no DRE) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formAdjustedAccount}
                    onChange={(e) => setFormAdjustedAccount(e.target.value)}
                    placeholder="Ex: Juros e Multas Auferidos"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium"
                  />
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px]">
                    <span className="text-slate-400 shrink-0">Sugestões:</span>
                    {['Juros e Multas Auferidos', 'Rendimentos Aplicações', 'Receita de Vendas de Imóveis', 'Despesas Gerais', 'Salários - Obra'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormAdjustedAccount(sug)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap border border-slate-700 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formNature === 'custo_obra' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    3. Macroetapa Orçamentária da Obra *
                  </label>
                  <select
                    value={formBudgetStage}
                    onChange={(e) => setFormBudgetStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold"
                  >
                    {knownStages.map((st) => (
                      <option key={st} value={st} className="bg-slate-900">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedUnmappedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSavingDePara || !formAdjustedAccount.trim()}
                onClick={handleSaveDePara}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
              >
                {isSavingDePara ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gravando no Supabase...</span>
                  </>
                ) : deParaSaveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>De-Para Salvo com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar De-Para e Liberar Importação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

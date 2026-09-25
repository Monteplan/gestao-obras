import React from 'react';
import { Database, FileSpreadsheet, Calculator, Layers, AlertCircle, Info } from 'lucide-react';

export type DataProvenanceType = 
  | 'banco_dados'
  | 'erp'
  | 'pco'
  | 'calculado'
  | 'demonstracao';

interface DataProvenanceBadgeProps {
  type: DataProvenanceType;
  details?: string;
  sourceFile?: string;
  baseDate?: string;
  className?: string;
  compact?: boolean;
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({
  type,
  details,
  sourceFile,
  baseDate,
  className = '',
  compact = false,
}) => {
  const configs = {
    banco_dados: {
      label: 'Banco de dados',
      icon: Database,
      bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      tooltip: 'Dados persistidos e recuperados diretamente do banco PostgreSQL / Supabase',
    },
    erp: {
      label: 'Importado do ERP',
      icon: Layers,
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      tooltip: 'Origem: Extrato financeiro contábil importado do ERP (Aba REAL / 5.635 lançamentos)',
    },
    pco: {
      label: 'Importado da planilha PCO',
      icon: FileSpreadsheet,
      bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      tooltip: 'Origem: Planilha oficial PCO de Setembro/2026 (BASE ORÇAMENTO / PLANEJAMENTO MACRO)',
    },
    calculado: {
      label: 'Calculado',
      icon: Calculator,
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      tooltip: 'Valor derivado matematicamente a partir de registros primários consolidados',
    },
    demonstracao: {
      label: 'Demonstração',
      icon: AlertCircle,
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      tooltip: 'Dados sintéticos de teste/seed para obras em portfólio de demonstração',
    },
  };

  const current = configs[type] || configs.pco;
  const Icon = current.icon;

  const tooltipText = [
    current.tooltip,
    sourceFile ? `Arquivo: ${sourceFile}` : null,
    baseDate ? `Data-base: ${baseDate}` : null,
    details ? `Detalhes: ${details}` : null,
  ].filter(Boolean).join(' | ');

  if (compact) {
    return (
      <span
        title={tooltipText}
        className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium cursor-help transition-all hover:scale-105 ${current.bg} ${className}`}
      >
        <Icon className="w-3 h-3" />
        <span>{current.label}</span>
      </span>
    );
  }

  return (
    <div
      title={tooltipText}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border font-semibold cursor-help shadow-sm transition-all hover:opacity-95 ${current.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{current.label}</span>
      {baseDate && (
        <span className="opacity-75 text-[10px] pl-1 border-l border-current/30">
          {baseDate}
        </span>
      )}
    </div>
  );
};

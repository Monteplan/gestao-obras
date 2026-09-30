import React from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface DatabaseIndicatorBadgeProps {
  compact?: boolean;
}

export const DatabaseIndicatorBadge: React.FC<DatabaseIndicatorBadgeProps> = ({ compact = false }) => {
  const { isSyncingWithSupabase, supabaseSyncStatus, syncWithSupabase, incurredCosts } = useData();

  const handleSyncClick = () => {
    if (!isSyncingWithSupabase) {
      syncWithSupabase();
    }
  };

  if (isSyncingWithSupabase || supabaseSyncStatus === 'syncing') {
    return (
      <div 
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400"
        title="Sincronizando dados em tempo real com o banco de dados Supabase..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
        {!compact && <span>Supabase...</span>}
      </div>
    );
  }

  if (supabaseSyncStatus === 'synced') {
    return (
      <button
        onClick={handleSyncClick}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-all shadow-sm"
        title={`Conectado ao Supabase PostgreSQL Cloud. ${incurredCosts.length} lançamentos sincronizados. Clique para recarregar.`}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Database className="w-3.5 h-3.5" />
        {!compact && (
          <span className="hidden md:inline font-mono">
            Supabase ({incurredCosts.length})
          </span>
        )}
      </button>
    );
  }

  if (supabaseSyncStatus === 'error') {
    return (
      <button
        onClick={handleSyncClick}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition-all"
        title="Conexão com Supabase instável. Operando com cache local. Clique para tentar reconectar."
      >
        <AlertCircle className="w-3.5 h-3.5" />
        {!compact && <span className="hidden sm:inline">Cache Local</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleSyncClick}
      className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-500/10 hover:bg-slate-500/20 border border-slate-400/30 text-slate-600 dark:text-slate-400 transition-all"
      title="Operando no modo local com dados pré-carregados da planilha PCO."
    >
      <Database className="w-3.5 h-3.5 text-slate-500" />
      {!compact && <span className="hidden md:inline">Base Local</span>}
    </button>
  );
};

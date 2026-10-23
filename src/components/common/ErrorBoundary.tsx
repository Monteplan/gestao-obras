import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro não tratado:', error, errorInfo);
    this.setState({ error, errorInfo });
    try {
      localStorage.setItem('gestao_obras_last_error', JSON.stringify({
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString(),
      }));
    } catch {}
  }

  private handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('gestao_obras_auth_user');
      // Limpa chaves pesadas que causam estouro de quota de 5MB
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('incurred_costs') || k.includes('audit_logs') || k.includes('last_error'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  private handleClearAll = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.name === 'QuotaExceededError';

      return (
        <div className="min-h-screen w-screen bg-[#081d2c] flex items-center justify-center p-4 text-white">
          <div className="max-w-lg w-full bg-[#0c2336] border border-[#1c3e5c] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isQuotaError ? 'Limite de Cache Local do Navegador Atingido' : 'Instabilidade na Exibição dos Dados'}
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {isQuotaError
                  ? 'O volume de lançamentos do ERP excedeu o limite máximo de 5 MB do cache temporário do navegador. Clique em "Limpar Cache Local" abaixo para restabelecer a navegação imediatamente. Seus dados no banco de dados continuam 100% preservados.'
                  : 'Ocorreu uma falha inesperada durante a renderização da interface. Seus dados no banco continuam preservados.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-[#1c3e5c] text-left overflow-auto max-h-36">
                <p className="text-[11px] font-mono text-red-300 break-all font-semibold">
                  {this.state.error.message || 'Erro desconhecido'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-[#004171] hover:bg-[#0a548c] text-white transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>
              <button
                onClick={this.handleClearAll}
                className="py-2.5 px-4 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
              >
                Limpar Cache Local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

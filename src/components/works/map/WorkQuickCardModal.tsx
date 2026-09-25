import React, { useState } from 'react';
import { Work } from '../../../types';
import { X, MapPin, Building2, User, Calendar, DollarSign, TrendingUp, ExternalLink, Copy, Check, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface WorkQuickCardModalProps {
  work: Work | null;
  onClose: () => void;
  onNavigateToDetail: (workId: string) => void;
}

export const WorkQuickCardModal: React.FC<WorkQuickCardModalProps> = ({
  work,
  onClose,
  onNavigateToDetail,
}) => {
  const [copied, setCopied] = useState(false);

  if (!work) return null;

  const handleCopyAddress = () => {
    const full = `${work.address || ''}${work.neighborhood ? `, ${work.neighborhood}` : ''}, ${work.city} - ${work.state}${work.postal_code ? `, CEP: ${work.postal_code}` : ''}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: Work['status']) => {
    switch (status) {
      case 'em_andamento':
        return { label: 'Em Andamento', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: Clock };
      case 'concluida':
        return { label: 'Concluída', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle2 };
      case 'pausada':
        return { label: 'Pausada', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: AlertCircle };
      case 'planejamento':
        return { label: 'Planejamento', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: Clock };
      case 'cancelada':
        return { label: 'Cancelada', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: AlertCircle };
      default:
        return { label: status, bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: Clock };
    }
  };

  const statusInfo = getStatusBadge(work.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-gradient-to-b from-slate-900 to-[#040e19] border border-cyan-500/40 shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover / Banner */}
        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-[#002b49] via-[#004171] to-[#0284c7] flex flex-col justify-end p-5">
          {/* Blueprint background grid */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top badges */}
          <div className="absolute top-3 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold shadow">
              {work.code}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 shadow ${statusInfo.bg}`}>
              <statusInfo.icon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
          </div>

          {/* Title on cover */}
          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
              {work.name}
            </h3>
            <p className="text-xs text-cyan-300 font-medium">
              Incorporação Própria (Monteplan) • {work.project_type} • Gestor: {work.manager_name}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* ENDEREÇO EM DESTAQUE */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/90 to-slate-900 border border-cyan-500/50 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 block">
                    Localização & Endereço em Destaque
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {work.address || 'Endereço em fase de cadastramento'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1">
                    {work.neighborhood && (
                      <span>Bairro: <strong className="text-cyan-200">{work.neighborhood}</strong></span>
                    )}
                    <span>Município: <strong className="text-cyan-200">{work.city} - {work.state}</strong></span>
                    {work.postal_code && (
                      <span className="font-mono text-cyan-300">CEP: {work.postal_code}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopyAddress}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-400/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="Copiar endereço"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid of Key Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Engenheiro Resp.
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{work.engineer_name}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Início Previsto
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{new Date(work.planned_start).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Valor do Contrato
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(work.contract_value || 0)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Término Previsto
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{new Date(work.planned_end).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Physical Progress */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Avanço Físico Ponderado
              </span>
              <span className="text-xs font-mono text-cyan-300 font-bold">
                {work.progress_percent}% Concluído
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${work.progress_percent}%` }}
              />
            </div>

            {work.notes && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {work.notes}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Fechar Card
            </button>

            <button
              onClick={() => {
                onClose();
                onNavigateToDetail(work.id);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#004171] to-[#0284c7] hover:from-[#003358] hover:to-[#0369a1] text-white text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <span>Acessar Painel Completo da Obra</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

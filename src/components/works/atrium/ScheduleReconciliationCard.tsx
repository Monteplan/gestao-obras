import React, { useState } from 'react';
import { ScheduleReconciliation, WorkCommercialData } from '../../../types';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  Compass,
  FileSpreadsheet,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ScheduleReconciliationCardProps {
  commercialData?: WorkCommercialData;
  onUpdateChoice?: (choice: 'comercial' | 'pco' | 'cliente', notes: string) => void;
}

export const ScheduleReconciliationCard: React.FC<ScheduleReconciliationCardProps> = ({
  commercialData,
  onUpdateChoice,
}) => {
  const schedule = commercialData?.schedule;

  const [effectiveChoice, setEffectiveChoice] = useState<'comercial' | 'pco' | 'cliente'>(
    schedule?.effective_schedule_choice || 'pco'
  );
  const [managerNotes, setManagerNotes] = useState<string>(
    schedule?.notes || 'Divergência de 4 meses identificada entre o término comercial (out/2027) e o término planejado PCO (fev/2028). Validado pelo gestor.'
  );
  const [isSaved, setIsSaved] = useState(false);

  if (!schedule) {
    return null;
  }

  const handleSave = () => {
    if (onUpdateChoice) {
      onUpdateChoice(effectiveChoice, managerNotes);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ALERTA DE DIVERGÊNCIA DE PRAZOS ENTRE FONTES */}
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <h4 className="font-bold text-amber-300">
            Divergência de Prazos Identificada ({schedule.difference_months} meses de variação)
          </h4>
          <p className="text-slate-300 mt-1 leading-relaxed">
            Existem duas referências de prazos com origens e finalidades distintas que foram preservadas de forma independente:
            o <strong>Prazo Comercial</strong> (tabela de vendas do empreendimento) e o <strong>Prazo do Planejamento Físico PCO</strong> (engenharia).
            O sistema não substitui nenhuma das fontes silenciosamente.
          </p>
        </div>
      </div>

      {/* TABELA DE CONCILIAÇÃO FORMAL DE PRAZOS DIVERGENTES (ITEM 11 DO PROMPT) */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Painel de Conciliação de Prazos Divergentes
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Preservação de todas as referências sem descarte silencioso de nenhuma fonte
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Divergência PCO vs Comercial: +4 meses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Fonte</th>
                <th className="py-3 px-3">Data Inicial</th>
                <th className="py-3 px-3">Data Final</th>
                <th className="py-3 px-3">Duração</th>
                <th className="py-3 px-4">Finalidade</th>
                <th className="py-3 px-3 text-center">Diferença em Meses</th>
                <th className="py-3 px-3 text-center">Status Vigente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {/* 1. Prazo Comercial */}
              <tr className={`hover:bg-slate-800/30 transition-colors ${effectiveChoice === 'comercial' ? 'bg-blue-950/30 font-medium' : ''}`}>
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Tabela Comercial de Vendas</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">01/08/2023 (Ago/23)</td>
                <td className="py-3.5 px-3 font-mono font-bold text-blue-400">31/10/2027 (Out/27)</td>
                <td className="py-3.5 px-3 font-semibold text-white">50 meses (13 restantes)</td>
                <td className="py-3.5 px-4 text-slate-300">
                  Planejamento de vendas, fluxo de recebíveis da incorporação e quitação de contratos.
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                  Ref. Base (0)
                </td>
                <td className="py-3.5 px-3 text-center">
                  {effectiveChoice === 'comercial' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Vigente Comercial
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Secundário</span>
                  )}
                </td>
              </tr>

              {/* 2. Planejamento PCO */}
              <tr className={`hover:bg-slate-800/30 transition-colors ${effectiveChoice === 'pco' ? 'bg-cyan-950/30 font-medium' : ''}`}>
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Planejamento Físico PCO (Engenharia)</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">01/02/2025 (Fev/25)</td>
                <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">28/02/2028 (Fev/28)</td>
                <td className="py-3.5 px-3 font-semibold text-white">36 meses (17 restantes)</td>
                <td className="py-3.5 px-4 text-slate-300">
                  Execução física no canteiro, contratação de empreiteiros, compras e medições EAP.
                </td>
                <td className="py-3.5 px-3 text-center font-mono font-bold text-amber-400">
                  +4 meses vs Comercial
                </td>
                <td className="py-3.5 px-3 text-center">
                  {effectiveChoice === 'pco' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Vigente Engenharia
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Secundário</span>
                  )}
                </td>
              </tr>

              {/* 3. Prazo do Cliente */}
              <tr className={`hover:bg-slate-800/30 transition-colors ${effectiveChoice === 'cliente' ? 'bg-purple-950/30 font-medium' : ''}`}>
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Contrato Promessa Compra e Venda</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">01/08/2023</td>
                <td className="py-3.5 px-3 font-mono font-bold text-purple-300">31/01/2028 (Jan/28)</td>
                <td className="py-3.5 px-3 font-semibold text-white">53 meses</td>
                <td className="py-3.5 px-4 text-slate-300">
                  Compromisso formal de entrega de chaves assumido contratualmente com os adquirentes.
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-rose-300">
                  -1 mês vs PCO
                </td>
                <td className="py-3.5 px-3 text-center">
                  {effectiveChoice === 'cliente' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Vigente Jurídico
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Secundário</span>
                  )}
                </td>
              </tr>

              {/* 4. Carência Legal do Cliente */}
              <tr className="hover:bg-slate-800/30 transition-colors bg-emerald-950/15">
                <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Carência Legal Contratual (+180 dias)</span>
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-300">01/02/2028</td>
                <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">31/07/2028 (Jul/28)</td>
                <td className="py-3.5 px-3 font-semibold text-white">+6 meses (180 dias)</td>
                <td className="py-3.5 px-4 text-slate-300">
                  Prazo de tolerância jurídica conforme Lei 4.591/64 (art. 43-A). Resguarda a incorporadora.
                </td>
                <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                  +5 meses folga vs PCO
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Limite Legal
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DEFINIÇÃO DO PRAZO VIGENTE PELO GESTOR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Conciliação e Definição de Vigência pelo Gestor
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 text-xs font-semibold transition-all ${
            effectiveChoice === 'pco'
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}>
            <input
              type="radio"
              name="effectiveSchedule"
              value="pco"
              checked={effectiveChoice === 'pco'}
              onChange={() => setEffectiveChoice('pco')}
              className="text-cyan-500"
            />
            <span>Planejamento Físico PCO (fev/2028)</span>
          </label>

          <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 text-xs font-semibold transition-all ${
            effectiveChoice === 'comercial'
              ? 'bg-blue-500/20 border-blue-500 text-blue-200'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}>
            <input
              type="radio"
              name="effectiveSchedule"
              value="comercial"
              checked={effectiveChoice === 'comercial'}
              onChange={() => setEffectiveChoice('comercial')}
              className="text-blue-500"
            />
            <span>Prazo Comercial (out/2027)</span>
          </label>

          <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 text-xs font-semibold transition-all ${
            effectiveChoice === 'cliente'
              ? 'bg-purple-500/20 border-purple-500 text-purple-200'
              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
          }`}>
            <input
              type="radio"
              name="effectiveSchedule"
              value="cliente"
              checked={effectiveChoice === 'cliente'}
              onChange={() => setEffectiveChoice('cliente')}
              className="text-purple-500"
            />
            <span>Prazo Cliente com Carência (jul/2028)</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Justificativa / Parecer da Conciliação de Prazos:
          </label>
          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            placeholder="Registre a justificativa para auditoria e histórico..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            O prazo comercial não altera automaticamente a curva de engenharia da planilha PCO.
          </span>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Layers className="w-4 h-4" />}
            {isSaved ? 'Conciliação Registrada!' : 'Salvar Conciliação'}
          </button>
        </div>
      </div>
    </div>
  );
};

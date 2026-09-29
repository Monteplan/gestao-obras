import React, { useState } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import {
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  Info,
  X,
  Compass,
  Laptop,
  Maximize2,
  Sparkles,
} from 'lucide-react';

interface DeviceIndicatorBadgeProps {
  compact?: boolean;
}

export const DeviceIndicatorBadge: React.FC<DeviceIndicatorBadgeProps> = ({ compact = false }) => {
  const { device, simulatedDevice, setSimulatedDevice, isMobileView } = useDevice();
  const [showModal, setShowModal] = useState<boolean>(false);

  const getDeviceIcon = () => {
    if (device.isWindows) {
      return <Laptop className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
    }
    if (device.isMobile) {
      return <Smartphone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
    }
    if (device.isTablet) {
      return <Tablet className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
    }
    return <Monitor className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
  };

  const getBadgeLabel = () => {
    if (simulatedDevice === 'mobile') return '📱 Simulando Celular';
    if (simulatedDevice === 'desktop') return '💻 Simulando Desktop';
    if (device.isWindows) return 'Windows';
    if (device.isAndroid) return 'Android';
    if (device.isIOS) return 'iOS / iPhone';
    if (device.isMobile) return 'Celular';
    return device.osName;
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-[#0c2336] dark:border-[#1c3e5c] dark:hover:border-[#38bdf8]/50 dark:text-slate-200 transition-all shadow-sm shrink-0"
        title="Clique para ver detalhes do dispositivo detectado e opções de visualização"
      >
        {getDeviceIcon()}
        <span className="font-semibold">{getBadgeLabel()}</span>
        {!compact && (
          <span className="hidden xl:inline text-[10px] text-slate-500 dark:text-slate-400">
            ({device.screenWidth}px)
          </span>
        )}
      </button>

      {/* Modal de Detalhes do Ambiente / Dispositivo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#081d2c] border border-slate-200 dark:border-[#1c3e5c] rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1c3e5c]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40">
                  {getDeviceIcon()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Identificação de Dispositivo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Detecção em tempo real para otimização de interface
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0c2336] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informações Detectadas */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c2336]/60 border border-slate-200 dark:border-[#1c3e5c]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Sistema Operacional</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  {device.isWindows && '💻 '}
                  {device.isAndroid && '🤖 '}
                  {device.isIOS && '🍎 '}
                  {device.osName}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c2336]/60 border border-slate-200 dark:border-[#1c3e5c]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tipo de Dispositivo</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-1.5 mt-0.5">
                  {device.isMobile ? '📱 Celular / Móvel' : device.isTablet ? '📟 Tablet' : '🖥️ Computador / Desktop'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c2336]/60 border border-slate-200 dark:border-[#1c3e5c]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Navegador</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {device.browserName}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c2336]/60 border border-slate-200 dark:border-[#1c3e5c]">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Resolução de Tela</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {device.screenWidth} × {device.screenHeight} px
                </span>
              </div>
            </div>

            {/* Status de adaptação */}
            <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
              isMobileView
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">
                  {isMobileView ? 'Modo Celular (Mobile) Ativo' : 'Modo Windows / Desktop Ativo'}
                </strong>
                <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">
                  {isMobileView
                    ? 'A interface está adaptada com barra inferior de toque rápido, menu gaveta expansível e visualização compacta de tabelas.'
                    : 'A interface exibe o painel completo com menu lateral expandido, gráficos panorâmicos e visualização executiva ampla.'}
                </p>
              </div>
            </div>

            {/* Alternador de Modo (Simulação / Teste) */}
            <div className="pt-2 border-t border-slate-200 dark:border-[#1c3e5c] space-y-2">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Controle Manual de Visualização:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setSimulatedDevice('auto')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                    simulatedDevice === 'auto'
                      ? 'bg-[#004171] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#0c2336] dark:text-slate-300 dark:hover:bg-[#102d45]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Automático</span>
                </button>

                <button
                  onClick={() => setSimulatedDevice('mobile')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                    simulatedDevice === 'mobile'
                      ? 'bg-[#004171] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#0c2336] dark:text-slate-300 dark:hover:bg-[#102d45]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Forçar Celular</span>
                </button>

                <button
                  onClick={() => setSimulatedDevice('desktop')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center space-y-1 transition-all ${
                    simulatedDevice === 'desktop'
                      ? 'bg-[#004171] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#0c2336] dark:text-slate-300 dark:hover:bg-[#102d45]'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Forçar Desktop</span>
                </button>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

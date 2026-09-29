import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDevice } from '../../contexts/DeviceContext';
import { MonteplanLogo } from '../common/MonteplanLogo';
import {
  LayoutDashboard,
  Building2,
  GitFork,
  Calculator,
  ShoppingCart,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Ruler,
  DollarSign,
  Home,
  X,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const { canAccess } = useAuth();
  const { theme } = useTheme();
  const { isMobileView, isSidebarOpenMobile, setSidebarOpenMobile, device } = useDevice();

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    module: string;
    badge?: string;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard, module: 'dashboard' },
    { id: 'works', label: 'Obras', icon: Building2, module: 'works' },
    { id: 'physical', label: 'Acomp. Físico', icon: Ruler, module: 'physical' },
    { id: 'stages', label: 'Etapas & EAP', icon: GitFork, module: 'stages' },
    { id: 'budget', label: 'Orçamento & INCC', icon: Calculator, module: 'budget' },
    { id: 'commercial', label: 'Comercial', icon: Home, module: 'commercial' },
    { id: 'financial', label: 'Acomp. Financeiro', icon: DollarSign, module: 'financial' },
    { id: 'purchasing', label: 'Compras & suprimento', icon: ShoppingCart, module: 'purchasing' },
    { id: 'labor', label: 'Mão de obra', icon: Users, module: 'labor' },
    { id: 'importer', label: 'Importação ERP', icon: FileSpreadsheet, module: 'importer' },
    { id: 'reports', label: 'Relatórios & Exportação', icon: BarChart3, module: 'reports' },
    { id: 'settings', label: 'Configurações', icon: Settings, module: 'settings' },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (isMobileView) {
      setSidebarOpenMobile(false);
    }
  };

  // ==========================================
  // RENDERIZAÇÃO EM MODO CELULAR / MOBILE (GAVETA OFF-CANVAS)
  // ==========================================
  if (isMobileView) {
    return (
      <>
        {/* Backdrop escuro com blur para fechar ao tocar fora */}
        {isSidebarOpenMobile && (
          <div
            onClick={() => setSidebarOpenMobile(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 animate-in fade-in"
          />
        )}

        {/* Gaveta Móvel Lateral Deslizante */}
        <aside
          className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#081d2c] border-r border-slate-200 dark:border-[#1c3e5c] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
            isSidebarOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Header da Gaveta com Logo e Botão Fechar */}
          <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-[#1c3e5c] justify-between">
            <MonteplanLogo variant="horizontal" size="sm" theme={theme} />
            <button
              onClick={() => setSidebarOpenMobile(false)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#0c2336] transition-colors"
              title="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Badge Informativo do Dispositivo no topo do menu */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#061622] border-b border-slate-200 dark:border-[#1c3e5c] flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Modo Celular</span>
            </span>
            <span className="font-bold text-[#004171] dark:text-[#38bdf8]">
              {device.osName}
            </span>
          </div>

          {/* Lista de Navegação com Alvos de Toque Maiores para Mobile */}
          <nav className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAllowed = canAccess(item.module);
              const isActive = currentTab === item.id;

              if (!isAllowed) return null;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs transition-all ${
                    isActive
                      ? 'bg-[#004171] text-white shadow-md font-bold'
                      : 'text-slate-800 hover:text-black hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-[#0c2336] font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />}
                </button>
              );
            })}
          </nav>

          {/* Rodapé Mobile */}
          <div className="p-4 border-t border-slate-200 dark:border-[#1c3e5c] bg-slate-50 dark:bg-[#061622] text-center">
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
              Monteplan Engenharia
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Gestão de Obras Mobile
            </div>
          </div>
        </aside>
      </>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO EM MODO DESKTOP / WINDOWS
  // ==========================================
  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 dark:border-[#1c3e5c] bg-slate-50 dark:bg-[#081d2c] backdrop-blur-xl transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header com Logo Oficial Monteplan */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-[#1c3e5c] justify-between">
        <div className="flex items-center overflow-hidden">
          {collapsed ? (
            <div className="mx-auto">
              <MonteplanLogo variant="symbol" size="sm" theme={theme} />
            </div>
          ) : (
            <MonteplanLogo variant="horizontal" size="sm" theme={theme} />
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-700 hover:text-black hover:bg-slate-200/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#0c2336] transition-colors shrink-0"
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isAllowed = canAccess(item.module);
          const isActive = currentTab === item.id;

          if (!isAllowed) {
            return null;
          }

          const buttonColor = isActive ? '#ffffff' : (theme === 'light' ? '#0f172a' : '#f1f5f9');
          const iconColor = isActive ? '#ffffff' : (theme === 'light' ? '#1e293b' : '#94a3b8');

          return (
            <button
              key={item.id}
              data-active={isActive ? "true" : "false"}
              onClick={() => onSelectTab(item.id)}
              style={{ color: buttonColor }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all group relative ${
                isActive
                  ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30 font-bold'
                  : 'text-slate-900 hover:text-black font-semibold hover:bg-slate-200/80 dark:text-slate-100 dark:hover:text-white dark:hover:bg-[#0c2336]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive
                    ? 'scale-110 text-white'
                    : 'group-hover:scale-110 text-slate-800 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white'
                }`}
                style={{ color: iconColor }}
              />

              {!collapsed && (
                <span
                  style={{ color: buttonColor }}
                  className={`truncate flex-1 text-left ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-slate-900 dark:text-slate-100 group-hover:text-black dark:group-hover:text-white font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              )}

              {/* Indicador Ativo Lateral Azul Ciano Monteplan */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#38bdf8] rounded-r-full shadow-sm shadow-[#38bdf8]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Desktop com identificação do Windows */}
      {!collapsed && (
        <div className="p-3.5 border-t border-slate-200 dark:border-[#1c3e5c] bg-slate-50 dark:bg-[#081926]/90 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
            <span>Monteplan Engenharia</span>
            {device.isWindows && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                <Laptop className="w-3 h-3" /> Windows
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#004171] dark:text-[#38bdf8] font-medium flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#004171] dark:bg-[#38bdf8] animate-pulse" />
            <span>Sistema Conectado</span>
          </div>
        </div>
      )}
    </aside>
  );
};

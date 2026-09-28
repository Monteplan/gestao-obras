import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Ruler,
  DollarSign,
  Scale,
  Layers,
  Home,
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

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    module: string;
    badge?: string;
    highlight?: boolean;
  }

  // Menu Oficial estritamente ordenado conforme especificação:
  // 1. Dashboard Geral, 2. Obras, 3. Acomp. Físico, 4. Etapas & EAP, 5. Orçamento & INCC,
  // 6. Comercial, 7. Acomp. Financeiro, 8. Compras & suprimento, 9. Mão de obra,
  // 10. Importação ERP, 11. Relatórios & Exportação, 12. Configurações.
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

              {!collapsed && item.highlight && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    isActive
                      ? 'bg-sky-400/30 text-white border border-sky-300/50'
                      : 'bg-sky-100 text-[#004171] border border-sky-300 dark:bg-[#38bdf8]/20 dark:text-[#38bdf8] dark:border-[#38bdf8]/30'
                  }`}
                >
                  ERP
                </span>
              )}

              {!collapsed && item.badge && !item.highlight && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-slate-200 text-slate-800 border border-slate-300 dark:bg-[#0c2336] dark:text-slate-300 dark:border-[#1c3e5c]'
                  }`}
                >
                  {item.badge}
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

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-[#1c3e5c] bg-slate-50 dark:bg-[#081926]/90 text-center">
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold tracking-wide">
            Monteplan Engenharia
          </div>
          <div className="text-[10px] text-[#004171] dark:text-[#38bdf8] font-medium flex items-center justify-center mt-1 space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#004171] dark:bg-[#38bdf8] animate-pulse" />
            <span>Sistema Conectado</span>
          </div>
        </div>
      )}
    </aside>
  );
};

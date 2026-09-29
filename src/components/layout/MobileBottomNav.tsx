import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Ruler,
  DollarSign,
  Menu,
} from 'lucide-react';
import { useDevice } from '../../contexts/DeviceContext';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu,
}) => {
  const { isMobileView } = useDevice();

  if (!isMobileView) return null;

  const tabs = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'works', label: 'Obras', icon: Building2 },
    { id: 'physical', label: 'Físico', icon: Ruler },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
  ];

  const isMenuTabActive = !tabs.some((t) => t.id === currentTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#081d2c]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#1c3e5c] px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive
                ? 'text-[#004171] dark:text-[#38bdf8] font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-all ${
                isActive ? 'bg-[#004171]/10 dark:bg-[#38bdf8]/15 scale-110' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}

      {/* Botão de Menu Completo / Gaveta */}
      <button
        onClick={onOpenMenu}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
          isMenuTabActive
            ? 'text-[#004171] dark:text-[#38bdf8] font-bold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <div
          className={`p-1 rounded-lg transition-all ${
            isMenuTabActive ? 'bg-[#004171]/10 dark:bg-[#38bdf8]/15 scale-110' : ''
          }`}
        >
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Mais</span>
      </button>
    </nav>
  );
};

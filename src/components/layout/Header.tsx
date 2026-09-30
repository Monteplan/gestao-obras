import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserRole } from '../../types';
import { Bell, Shield, ChevronDown, LogOut, CheckCircle2, AlertTriangle, Clock, Sun, Moon, Menu } from 'lucide-react';
import { useDevice } from '../../contexts/DeviceContext';
import { DeviceIndicatorBadge } from '../common/DeviceIndicatorBadge';
import { DatabaseIndicatorBadge } from '../common/DatabaseIndicatorBadge';

interface HeaderProps {
  currentTitle: string;
  breadcrumb?: string;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTitle, breadcrumb = 'Plataforma', onMenuToggle }) => {
  const { user, role, switchRole, logout } = useAuth();
  const { works, stages, orders } = useData();
  const { theme, toggleTheme } = useTheme();
  const { isMobileView, toggleSidebarMobile } = useDevice();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Calcula alertas ativos para o sino de notificações
  const today = new Date().toISOString().split('T')[0];
  const delayedStages = stages.filter(s => s.planned_end < today && s.progress_percent < 100);
  const delayedOrders = orders.filter(o => o.status === 'atrasado' || (o.delivery_forecast < today && o.status !== 'recebido'));

  const totalAlerts = delayedStages.length + delayedOrders.length;

  const rolesList: { value: UserRole; label: string; desc: string }[] = [
    { value: 'admin', label: 'Administrador', desc: 'Acesso total, usuários e configurações' },
    { value: 'gestor', label: 'Gestor de Obras', desc: 'Obras, etapas, cronograma e orçamentos' },
    { value: 'compras', label: 'Compras', desc: 'Requisições, pedidos e recebimentos' },
    { value: 'financeiro', label: 'Financeiro', desc: 'Custos, receitas, faturamento e resultados' },
    { value: 'engenharia', label: 'Engenharia / Apontador', desc: 'Avanço físico e apontamento de mão de obra' },
    { value: 'consulta', label: 'Consulta', desc: 'Visualização e relatórios em modo somente leitura' },
  ];

  const handleMobileMenuClick = () => {
    if (toggleSidebarMobile) {
      toggleSidebarMobile();
    } else if (onMenuToggle) {
      onMenuToggle();
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-[#1c3e5c] bg-white/95 dark:bg-[#081d2c]/85 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      {/* Botão de Menu Hambúrguer Móvel + Breadcrumbs e Título */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {isMobileView && (
          <button
            onClick={handleMobileMenuClick}
            className="p-2 rounded-xl text-slate-700 hover:text-black hover:bg-slate-100 dark:text-slate-200 dark:hover:text-white dark:hover:bg-[#0c2336] transition-colors shrink-0"
            title="Abrir Menu de Navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{breadcrumb}</span>
            <span>/</span>
            <span className="text-[#004171] dark:text-[#38bdf8] font-semibold">{currentTitle}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Ações da Direita: Indicador de Dispositivo (Windows / Celular), Tema, Perfil e Notificações */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Badge Inteligente de Identificação de Dispositivo (Windows x Celular) */}
        <DeviceIndicatorBadge compact={isMobileView} />
        {/* Badge de Conexão com Banco de Dados / Supabase */}
        <DatabaseIndicatorBadge compact={isMobileView} />
        {/* Alternador de Tema Claro / Escuro */}
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-[#0c2336] dark:border-[#1c3e5c] dark:hover:border-[#38bdf8]/50 dark:text-slate-200 transition-all shadow-sm"
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-semibold">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#004171]" />
              <span className="hidden sm:inline font-semibold">Modo Escuro</span>
            </>
          )}
        </button>

        {/* Switcher Rápido de Papéis para Demonstração */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-[#0c2336] dark:border-[#1c3e5c] dark:hover:border-[#38bdf8]/50 dark:text-slate-200 transition-all"
            title="Alternar Perfil para Teste de Permissões"
          >
            <Shield className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />
            <span className="capitalize">Perfil: <strong className="text-slate-900 dark:text-white font-bold">{role}</strong></span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xl dark:bg-[#0c2336] dark:border-[#1c3e5c] dark:text-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-[#1c3e5c] text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Simular Perfil de Acesso (RBAC)
              </div>
              <div className="py-1 space-y-1">
                {rolesList.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      switchRole(r.value);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition-colors ${
                      role === r.value
                        ? 'bg-sky-50 text-[#004171] border border-sky-200 dark:bg-[#004171]/50 dark:text-[#38bdf8] dark:border-[#38bdf8]/40 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#102d45]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{r.label}</span>
                      {role === r.value && <CheckCircle2 className="w-3.5 h-3.5 text-[#004171] dark:text-[#38bdf8]" />}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sino de Notificações com Alertas de Obras e Pedidos */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#0c2336] transition-colors"
            title="Alertas do Sistema"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#004171] text-white dark:bg-[#38bdf8] dark:text-slate-950 font-bold text-[10px] flex items-center justify-center animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xl dark:bg-[#0c2336] dark:border-[#1c3e5c] dark:text-slate-200 p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1c3e5c]">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alertas Gerenciais</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-[#004171] border border-sky-200 dark:bg-[#38bdf8]/20 dark:text-[#38bdf8] font-medium">
                  {totalAlerts} pendência(s)
                </span>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                {delayedStages.map(s => {
                  const work = works.find(w => w.id === s.work_id);
                  return (
                    <div key={s.id} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs">
                      <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400 font-semibold mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Etapa em Atraso</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{s.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{work?.name} • Previsto: {s.planned_end}</p>
                    </div>
                  );
                })}

                {delayedOrders.map(o => (
                  <div key={o.id} className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-xs">
                    <div className="flex items-center space-x-1.5 text-red-700 dark:text-red-400 font-semibold mb-0.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Pedido com Entrega Atrasada</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{o.internal_number} • {o.supplier_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Previsão vencida em: {o.delivery_forecast}</p>
                  </div>
                ))}

                {totalAlerts === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Nenhum alerta crítico ativo no momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Perfil do Usuário e Logout */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200 dark:border-[#1c3e5c]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#004171] to-[#0a548c] border border-sky-400/40 flex items-center justify-center font-bold text-xs shadow-md user-avatar shrink-0" style={{ color: '#ffffff' }}>
            <span style={{ color: '#ffffff' }}>{user?.name ? user.name.charAt(0) : 'U'}</span>
          </div>
          <div className="hidden md:block text-left leading-none">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{user?.organization_name || 'Monteplan Engenharia'}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-[#0c2336] transition-colors"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

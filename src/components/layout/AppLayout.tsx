import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OverviewDashboard } from '../dashboard/OverviewDashboard';
import { WorksListPage } from '../works/WorksListPage';
import { WorkDetailPage } from '../works/WorkDetailPage';
import { StagesManager } from '../stages/StagesManager';
import { BudgetManager } from '../budget/BudgetManager';
import { PurchasingPipeline } from '../purchasing/PurchasingPipeline';
import { ErpImporterPage } from '../importer/ErpImporterPage';
import { LaborManager } from '../labor/LaborManager';
import { ReportsPage } from '../reports/ReportsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { DeParaManager } from '../depara/DeParaManager';
import { PhysicalProgressManager } from '../physical/PhysicalProgressManager';
import { FinancialProgressManager } from '../financial/FinancialProgressManager';
import { IntegratedProgressView } from '../integrated/IntegratedProgressView';
import { CommercialPage } from '../commercial/CommercialPage';

export const AppLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  // Mapeamento de Títulos e Breadcrumbs
  const tabTitles: Record<string, { title: string; breadcrumb: string }> = {
    dashboard: { title: 'Dashboard Executivo Geral', breadcrumb: 'Visão Consolidada' },
    works: { title: 'Cadastro e Gestão de Obras', breadcrumb: 'Empreendimentos' },
    work_detail: { title: 'Painel da Obra', breadcrumb: 'Obras' },
    physical: { title: 'Acompanhamento Físico de Obras (Plano A)', breadcrumb: 'Engenharia de Campo' },
    stages: { title: 'Etapas & Avanço Físico (EAP)', breadcrumb: 'Cronograma' },
    budget: { title: 'Orçamento da Obra & Custos Incorridos', breadcrumb: 'Financeiro & Obra' },
    commercial: { title: 'Comercial & Gestão de Vendas', breadcrumb: 'Vendas & Recebíveis' },
    financial: { title: 'Acompanhamento Financeiro (Plano B)', breadcrumb: 'Custos ERP' },
    purchasing: { title: 'Compras & Suprimentos', breadcrumb: 'Suprimentos' },
    labor: { title: 'Mão de Obra & Equipes', breadcrumb: 'Campo' },
    importer: { title: 'Importações de Planilhas ERP', breadcrumb: 'Integrações' },
    reports: { title: 'Relatórios & Exportações', breadcrumb: 'Gerencial' },
    settings: { title: 'Configurações do Sistema', breadcrumb: 'Governança' },
    integrated: { title: 'Visão Integrada Físico-Financeira', breadcrumb: 'Auditoria & Gestão' },
    depara: { title: 'Gestão dos De-Para (Duplo Nível)', breadcrumb: 'Mapeamentos ERP' },
    users: { title: 'Usuários & Permissões', breadcrumb: 'Segurança' },
  };

  const handleSelectWork = (workId: string) => {
    setSelectedWorkId(workId);
    setCurrentTab('work_detail');
  };

  const handleBackToList = () => {
    setSelectedWorkId(null);
    setCurrentTab('works');
  };

  const currentMeta = tabTitles[currentTab] || { title: 'Gestão de Obras', breadcrumb: 'Plataforma' };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sidebar Fixo / Recolhível */}
      <Sidebar
        currentTab={currentTab === 'work_detail' ? 'works' : currentTab}
        onSelectTab={(tab) => {
          setSelectedWorkId(null);
          setCurrentTab(tab);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Área Principal com Header e Conteúdo Scrollável */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <Header
          currentTitle={currentMeta.title}
          breadcrumb={currentMeta.breadcrumb}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && <OverviewDashboard onSelectWork={handleSelectWork} />}
            {currentTab === 'works' && <WorksListPage onSelectWork={handleSelectWork} />}
            {currentTab === 'work_detail' && selectedWorkId && (
              <WorkDetailPage workId={selectedWorkId} onBack={handleBackToList} />
            )}
            {currentTab === 'physical' && <PhysicalProgressManager defaultWorkId={selectedWorkId || undefined} />}
            {currentTab === 'financial' && <FinancialProgressManager defaultWorkId={selectedWorkId || undefined} />}
            {currentTab === 'integrated' && <IntegratedProgressView defaultWorkId={selectedWorkId || undefined} />}
            {currentTab === 'depara' && <DeParaManager />}
            {currentTab === 'stages' && <StagesManager selectedWorkId={selectedWorkId || undefined} />}
            {(currentTab === 'budget' || currentTab === 'costs') && (
              <BudgetManager selectedWorkId={selectedWorkId || undefined} />
            )}
            {currentTab === 'commercial' && <CommercialPage />}
            {currentTab === 'purchasing' && <PurchasingPipeline />}
            {currentTab === 'labor' && <LaborManager />}
            {currentTab === 'importer' && <ErpImporterPage />}
            {currentTab === 'reports' && <ReportsPage />}
            {(currentTab === 'users' || currentTab === 'settings') && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
};

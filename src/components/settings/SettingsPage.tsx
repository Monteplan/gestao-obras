import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDevice } from '../../contexts/DeviceContext';
import { INITIAL_PROFILES } from '../../lib/seed-data';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatDateBR } from '../../lib/utils';
import {
  Settings,
  Users,
  ShieldCheck,
  RotateCcw,
  Database,
  Sliders,
  History,
  AlertTriangle,
  CheckCircle2,
  Sun,
  Moon,
  ArrowRightLeft,
  Monitor,
  Smartphone,
  Laptop,
  Sparkles,
  UserPlus,
  Trash2,
  X,
  Lock,
  Mail,
  UserCheck,
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { supabase, logAudit } from '../../lib/supabase';
import { DeParaMatrixSettings } from './DeParaMatrixSettings';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { auditLogs, resetToSeedData } = useData();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { device, simulatedDevice, setSimulatedDevice, isMobileView } = useDevice();

  const [activeTab, setActiveTab] = useState<'geral' | 'matriz_depara' | 'usuarios' | 'auditoria'>('geral');
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState<number>(85);
  const [marginAlertThreshold, setMarginAlertThreshold] = useState<number>(8);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados de Gerenciamento de Usuários
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('gestao_obras_v2_user_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        const testEmails = [
          'admin@monteplan.com.br',
          'gestor@monteplan.com.br',
          'compras@monteplan.com.br',
          'financeiro@monteplan.com.br',
          'engenharia@monteplan.com.br',
          'consulta@monteplan.com.br',
        ];
        return parsed.filter((p: UserProfile) => !testEmails.includes(p.email?.toLowerCase()));
      }
    } catch (e) {
      console.warn('Erro ao carregar perfis de usuários:', e);
    }
    return INITIAL_PROFILES;
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('engenharia');
  const [newUserOrg, setNewUserOrg] = useState('Monteplan Engenharia');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);
  const [userErrorMessage, setUserErrorMessage] = useState<string | null>(null);

  const isCloudSupabase = isSupabaseConfigured();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMessage(null);

    const emailTrim = newUserEmail.trim().toLowerCase();
    if (!emailTrim || !emailTrim.includes('@')) {
      setUserErrorMessage('Informe um e-mail corporativo válido com @.');
      return;
    }

    if (userProfiles.some(u => u.email.toLowerCase() === emailTrim)) {
      setUserErrorMessage('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      name: newUserName.trim() || emailTrim.split('@')[0],
      email: emailTrim,
      role: newUserRole,
      organization_id: 'org-1',
      organization_name: newUserOrg.trim() || 'Monteplan Engenharia',
    };

    const updated = [newUser, ...userProfiles];
    setUserProfiles(updated);
    localStorage.setItem('gestao_obras_v2_user_profiles', JSON.stringify(updated));

    // Registro na Trilha de Auditoria
    logAudit('CREATE_USER', 'users', newUser.id, `Novo usuário criado: ${newUser.name} (${newUser.email}) - Perfil: ${newUser.role}`);

    // Integração não-bloqueante com Supabase se configurado
    if (isSupabaseConfigured() && supabase) {
      Promise.resolve(
        supabase.from('profiles').upsert({
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.name,
          role: newUser.role,
          organization_id: newUser.organization_id,
          created_at: new Date().toISOString()
        })
      )
        .then(() => {})
        .catch(console.warn);
    }

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('engenharia');
    setNewUserPassword('');
    setUserSuccessMessage(`Usuário "${newUser.name}" incluído com sucesso!`);
    setTimeout(() => setUserSuccessMessage(null), 4000);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Deseja realmente remover o usuário "${userName}" do sistema?`)) {
      const updated = userProfiles.filter(u => u.id !== userId);
      setUserProfiles(updated);
      localStorage.setItem('gestao_obras_v2_user_profiles', JSON.stringify(updated));
      logAudit('DELETE_USER', 'users', userId, `Usuário removido: ${userName}`);
      setUserSuccessMessage(`Usuário "${userName}" removido com sucesso.`);
      setTimeout(() => setUserSuccessMessage(null), 3000);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return { label: 'Admin Geral', color: 'bg-purple-500/20 text-purple-300 border border-purple-500/40' };
      case 'gestor':
        return { label: 'Gestor de Obras', color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' };
      case 'engenharia':
        return { label: 'Engenheiro de Campo', color: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' };
      case 'compras':
        return { label: 'Compras & Suprimentos', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' };
      case 'financeiro':
        return { label: 'Financeiro & Controladoria', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' };
      case 'consulta':
      default:
        return { label: 'Somente Leitura', color: 'bg-slate-500/20 text-slate-300 border border-slate-500/40' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Configurações & Governança</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de perfis de acesso, matriz de-para contábil, parâmetros de alerta e trilha de auditoria.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center flex-wrap bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs gap-1">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              activeTab === 'geral' ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Parâmetros & Supabase
          </button>
          <button
            onClick={() => setActiveTab('matriz_depara')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 ${
              activeTab === 'matriz_depara' ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Matriz De-Para (86 Contas)</span>
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              activeTab === 'usuarios' ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Usuários & Perfis
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              activeTab === 'auditoria' ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Auditoria ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* ABA 1: PARÂMETROS GERAIS E CONEXÃO SUPABASE */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Card Tema & Aparência Geral */}
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-[#38bdf8]" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">Aparência & Tema do Layout Geral</h3>
                  <p className="text-[11px] text-slate-400">
                    Alterne entre a interface noturna executiva de alta definição ou o layout claro corporativo.
                  </p>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#004171]/20 text-[#38bdf8] border border-[#1c3e5c]">
                {theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Opção Modo Escuro */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex items-start space-x-4 ${
                  theme === 'dark'
                    ? 'border-[#38bdf8] bg-[#004171]/30 ring-2 ring-[#38bdf8]/40 shadow-lg shadow-[#004171]/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="p-3 rounded-lg bg-[#081d2c] border border-[#1c3e5c] text-[#38bdf8] shrink-0">
                  <Moon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Modo Escuro</span>
                    {theme === 'dark' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Fundo deep navy Monteplan (<code className="text-[#38bdf8]">#081d2c</code>), vidros translúcidos e redução de fadiga visual para uso prolongado.
                  </p>
                </div>
              </button>

              {/* Opção Modo Claro */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex items-start space-x-4 ${
                  theme === 'light'
                    ? 'border-[#004171] bg-sky-500/10 ring-2 ring-[#004171]/40 shadow-lg shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
                  <Sun className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Modo Claro</span>
                    {theme === 'light' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#004171]/20 text-[#004171] dark:text-[#38bdf8] border border-[#004171]/30">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Superfície limpa corporativa com cartões brancos nítidos, tipografia de alto contraste e azul institucional Monteplan.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Card Detecção de Dispositivo & Visualização Responsiva (Windows / Celular) */}
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {device.isWindows ? (
                  <Laptop className="w-5 h-5 text-blue-400" />
                ) : (
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">Identificação do Dispositivo & Plataforma de Acesso</h3>
                  <p className="text-[11px] text-slate-400">
                    O sistema identifica em tempo real se o acesso partiu do Windows Desktop ou de um Celular (Android/iOS) e adapta a interface.
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                device.isWindows
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {device.deviceSummary}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Sistema Operacional</span>
                <span className="font-bold text-white text-sm mt-0.5 block">
                  {device.isWindows ? '💻 Windows' : device.isAndroid ? '🤖 Android' : device.isIOS ? '🍎 iOS / iPhone' : device.osName}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Tipo de Aparelho</span>
                <span className="font-bold text-white text-sm mt-0.5 block capitalize">
                  {device.isMobile ? '📱 Celular' : device.isTablet ? '📟 Tablet' : '🖥️ Computador'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Navegador</span>
                <span className="font-bold text-white text-sm mt-0.5 block truncate">
                  {device.browserName}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Resolução de Tela</span>
                <span className="font-bold text-white text-sm mt-0.5 block">
                  {device.screenWidth} × {device.screenHeight} px
                </span>
              </div>
            </div>

            {/* Alternador de Modo de Exibição */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white block">Modo de Visualização da Interface</span>
                  <span className="text-[11px] text-slate-400">
                    Você pode forçar a simulação do layout de celular para testar ou manter a adaptação automática padrão.
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('auto')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      simulatedDevice === 'auto'
                        ? 'bg-[#004171] text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Automático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      simulatedDevice === 'mobile'
                        ? 'bg-[#004171] text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Celular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      simulatedDevice === 'desktop'
                        ? 'bg-[#004171] text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>Estado Vigente da Interface:</span>
                <span className="font-bold text-white">
                  {isMobileView ? '📱 Interface Compacta Otimizada para Celular (Gaveta + Bottom Nav)' : '💻 Interface Executiva Panorâmica para Windows / Desktop'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Status Supabase */}
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Database className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-white">Ambiente & Banco de Dados (Supabase)</h3>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Modo de Persistência:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#004171]/40 text-[#38bdf8] font-bold border border-[#1c3e5c]">
                  {isCloudSupabase ? 'Supabase PostgreSQL Conectado' : 'Híbrido Local & Pronta para Supabase'}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed">
                A aplicação está com schema normalizado, migrations PostgreSQL versionadas e RLS pronto. Quando quiser apontar para o seu projeto Supabase Cloud, basta definir as variáveis no arquivo <code className="text-[#38bdf8] font-mono">.env.local</code>:
              </div>

              <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[10px] text-slate-300 overflow-x-auto border border-slate-800">
                VITE_SUPABASE_URL=https://seu-projeto.supabase.co{'\n'}
                VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
              </pre>
            </div>

            {/* Reset para Seed de Demonstração */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Restaurar Seed de Demonstração</span>
                <span className="text-[10px] text-slate-500">Recarrega as 3 obras completas com todos os dados</span>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white font-bold text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Seed</span>
              </button>
            </div>
          </div>

          {/* Card Limites e Parâmetros de Alerta */}
          <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Sliders className="w-5 h-5 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-white">Parâmetros e Gatilhos de Alerta</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alerta de Atenção Orçamentária: Consumo &gt; <strong>{budgetAlertThreshold}%</strong>
                </label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={budgetAlertThreshold}
                  onChange={(e) => setBudgetAlertThreshold(Number(e.target.value))}
                  className="w-full accent-[#004171] cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Gera sinalização amarela quando custos incorridos + comprometido ultrapassam este valor do orçamento.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alerta de Margem Crítica: Margem Projetada &lt; <strong>{marginAlertThreshold}%</strong>
                </label>
                <input
                  type="range"
                  min={2}
                  max={25}
                  step={1}
                  value={marginAlertThreshold}
                  onChange={(e) => setMarginAlertThreshold(Number(e.target.value))}
                  className="w-full accent-[#38bdf8] cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Gera alerta crítico para a diretoria quando a margem prevista cair abaixo do patamar mínimo.
                </span>
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-[#004171]/40 text-[#38bdf8] text-xs font-semibold flex items-center space-x-2 border border-[#1c3e5c]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Parâmetros atualizados com sucesso!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold transition-colors shadow-md shadow-[#004171]/30"
              >
                Salvar Parâmetros
              </button>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* ABA: MATRIZ DE-PARA (86 CONTAS MAPEADAS) */}
      {activeTab === 'matriz_depara' && (
        <DeParaMatrixSettings />
      )}

      {/* ABA 2: USUÁRIOS E PERFIS DE ACESSO */}
      {activeTab === 'usuarios' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40">
            <div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#38bdf8]" />
                <h3 className="text-base font-bold text-white tracking-tight">Gerenciador de Usuários e Permissões</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle de acesso granular baseado em papéis (RBAC) com permissões por módulo da Monteplan.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs px-3 py-1 rounded-full bg-[#004171]/40 text-[#38bdf8] font-bold border border-[#1c3e5c] shadow-sm">
                {userProfiles.length} usuários cadastrados
              </span>
              <button
                type="button"
                onClick={() => {
                  setUserErrorMessage(null);
                  setShowAddUserModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#004171] to-[#0a548c] hover:from-[#0a548c] hover:to-[#004171] text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-[#004171]/40 border border-[#38bdf8]/40 transition-all transform active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#38bdf8]" />
                <span>+ Novo Usuário</span>
              </button>
            </div>
          </div>

          {userSuccessMessage && (
            <div className="mx-4 my-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{userSuccessMessage}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Usuário</th>
                  <th className="p-3.5">E-mail Corporativo</th>
                  <th className="p-3.5">Perfil de Acesso</th>
                  <th className="p-3.5">Empresa / Tenant</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {userProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <p className="text-sm font-semibold text-slate-300">Nenhum usuário cadastrado</p>
                      <p className="text-xs text-slate-500 mt-1">Utilize o botão "+ Novo Usuário" acima para cadastrar a equipe técnica da Monteplan.</p>
                    </td>
                  </tr>
                ) : (
                  userProfiles.map((p) => {
                  const badge = getRoleBadge(p.role);
                  const isCurrentLogged = user?.email?.toLowerCase() === p.email.toLowerCase();
                  const isDefaultSeed = INITIAL_PROFILES.some(init => init.id === p.id);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#004171] to-[#0a548c] text-white font-bold text-xs flex items-center justify-center border border-[#38bdf8]/30 shadow-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block text-xs">
                              {p.name}
                              {isCurrentLogged && (
                                <span className="ml-1.5 text-[10px] font-medium text-[#38bdf8] bg-[#38bdf8]/10 px-1.5 py-0.2 rounded border border-[#38bdf8]/30">
                                  Você
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-mono text-xs">{p.email}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-md font-bold uppercase text-[10px] inline-flex items-center space-x-1 ${badge.color}`}>
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{p.organization_name || 'Monteplan Engenharia'}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Ativo
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {!isCurrentLogged && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(p.id, p.name)}
                            title="Remover usuário"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Usuário */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-[#1c3e5c] shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#004171]/40 border border-[#38bdf8]/40 text-[#38bdf8] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-slate-400">Permita o acesso à plataforma e configure as permissões de acesso.</p>
              </div>
            </div>

            {userErrorMessage && (
              <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{userErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Engenheiro Silva"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white focus:border-[#38bdf8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail Corporativo *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@monteplan.com.br"
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Perfil de Acesso (RBAC) *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700 focus:border-[#38bdf8]"
                  >
                    <option value="engenharia">Engenheiro de Campo</option>
                    <option value="gestor">Gestor de Obras</option>
                    <option value="compras">Compras & Suprimentos</option>
                    <option value="financeiro">Financeiro & Controladoria</option>
                    <option value="admin">Administrador Geral</option>
                    <option value="consulta">Somente Leitura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Empresa / Tenant
                  </label>
                  <input
                    type="text"
                    value={newUserOrg}
                    onChange={(e) => setNewUserOrg(e.target.value)}
                    placeholder="Monteplan Engenharia"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Provisória de Acesso
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos (ou definida pelo usuário no 1º login)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white focus:border-[#38bdf8]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O usuário poderá também redefinir sua senha a qualquer momento clicando em "Esqueceu a senha?".
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Permissões do Perfil Selecionado:</span>
                {newUserRole === 'admin' && (
                  <p className="text-purple-300">Acesso irrestrito a todos os módulos, configurações, matriz contábil e usuários.</p>
                )}
                {newUserRole === 'gestor' && (
                  <p className="text-indigo-300">Gestão global de obras, controle físico-financeiro, avanço de etapas e medições.</p>
                )}
                {newUserRole === 'engenharia' && (
                  <p className="text-cyan-300">Lançamento de avanço físico de etapas, subetapas, RDO e apontamentos de campo.</p>
                )}
                {newUserRole === 'compras' && (
                  <p className="text-amber-300">Módulo de suprimentos, requisições, cotações e ordens de compra.</p>
                )}
                {newUserRole === 'financeiro' && (
                  <p className="text-emerald-300">Custos incorridos, conciliação contábil, matriz de-para e demonstrativo de resultados.</p>
                )}
                {newUserRole === 'consulta' && (
                  <p className="text-slate-300">Acesso de visualização de relatórios e dashboards, sem permissão de alteração.</p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs shadow-md shadow-[#004171]/40 flex items-center space-x-1.5 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Cadastrar Usuário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 3: TRILHA DE AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Log de Auditoria e Governança do Sistema</span>
            </h3>
            <span className="text-xs text-slate-400">Registrado automaticamente pelo sistema</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Data e Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Módulo / Tabela</th>
                  <th className="p-3">Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{formatDateBR(log.timestamp.split('T')[0])}</td>
                    <td className="p-3 font-semibold text-white">{log.user_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-bold text-blue-400 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">{log.entity}</td>
                    <td className="p-3 text-slate-300">{log.details || '-'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-xs">
                      Nenhum evento registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação do Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white text-center">Restaurar Dados Iniciais?</h3>
            <p className="text-xs text-slate-300 text-center">
              Isso limpará os cadastros criados e restaurará o seed padrão com as 3 obras completas e dados de teste.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetToSeedData();
                  setUserProfiles(INITIAL_PROFILES);
                  localStorage.removeItem('gestao_obras_v2_user_profiles');
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
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
  Monitor,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { auditLogs, resetToSeedData } = useData();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'geral' | 'usuarios' | 'auditoria'>('geral');
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState<number>(85);
  const [marginAlertThreshold, setMarginAlertThreshold] = useState<number>(8);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isCloudSupabase = isSupabaseConfigured();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Configurações & Governança</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de perfis de acesso, parâmetros de alerta orçamentário, trilha de auditoria e conexão com o banco.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              activeTab === 'geral' ? 'bg-[#004171] text-white shadow-md shadow-[#004171]/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Parâmetros & Supabase
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

      {/* ABA 2: USUÁRIOS E PERFIS DE ACESSO */}
      {activeTab === 'usuarios' && (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Usuários do Sistema e Matriz de Permissões</h3>
              <p className="text-[11px] text-slate-400">Controle de acesso baseado em papéis (RBAC)</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#004171]/30 text-[#38bdf8] font-bold border border-[#1c3e5c]">
              {INITIAL_PROFILES.length} usuários ativos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Nome do Usuário</th>
                  <th className="p-3">E-mail Corporativo</th>
                  <th className="p-3">Perfil de Acesso</th>
                  <th className="p-3">Empresa / Tenant</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {INITIAL_PROFILES.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{p.name}</td>
                    <td className="p-3 text-slate-400 font-mono">{p.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 font-bold uppercase text-[10px]">
                        {p.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{p.organization_name}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

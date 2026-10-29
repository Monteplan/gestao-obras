import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { supabase, isSupabaseConfigured, logAudit } from '../../lib/supabase';
import { fetchRolePermissionsFromSupabase } from '../../lib/role-permissions';
import {
  ShieldCheck,
  Check,
  X,
  Eye,
  Pencil,
  Save,
  RotateCcw,
  Info,
  LayoutDashboard,
  Building2,
  GitFork,
  Ruler,
  Calculator,
  Home,
  DollarSign,
  ShoppingCart,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

// ==============================
// DEFINIÇÃO DOS MÓDULOS DO SISTEMA
// ==============================
interface SystemModule {
  id: string;
  label: string;
  description: string;
  icon: any;
  category: 'operacional' | 'financeiro' | 'gestao' | 'sistema';
}

const SYSTEM_MODULES: SystemModule[] = [
  { id: 'dashboard', label: 'Dashboard Geral', description: 'Painel executivo com KPIs e visão consolidada', icon: LayoutDashboard, category: 'gestao' },
  { id: 'works', label: 'Obras', description: 'Cadastro e gestão de empreendimentos', icon: Building2, category: 'operacional' },
  { id: 'physical', label: 'Acomp. Físico (PCO)', description: 'Avanço físico ponderado e medições', icon: Ruler, category: 'operacional' },
  { id: 'stages', label: 'Etapas & EAP', description: 'Estrutura analítica e cronograma das etapas', icon: GitFork, category: 'operacional' },
  { id: 'budget', label: 'Orçamento & INCC', description: 'Versões orçamentárias e reajuste INCC', icon: Calculator, category: 'financeiro' },
  { id: 'commercial', label: 'Comercial', description: 'VGV, vendas, tipologias e indicadores imobiliários', icon: Home, category: 'financeiro' },
  { id: 'financial', label: 'Acomp. Financeiro', description: 'Custos incorridos, comprometido e DRE', icon: DollarSign, category: 'financeiro' },
  { id: 'purchasing', label: 'Compras & Suprimentos', description: 'Requisições, cotações e ordens de compra', icon: ShoppingCart, category: 'operacional' },
  { id: 'labor', label: 'Mão de Obra', description: 'Efetivo, apontamentos e produtividade', icon: Users, category: 'operacional' },
  { id: 'importer', label: 'Importação ERP', description: 'Importação de dados do ERP externo', icon: FileSpreadsheet, category: 'sistema' },
  { id: 'depara', label: 'Matriz De-Para', description: 'Mapeamento contábil entre contas ERP e orçamento', icon: ArrowRightLeft, category: 'financeiro' },
  { id: 'reports', label: 'Relatórios & Exportação', description: 'Geração de relatórios e download de dados', icon: BarChart3, category: 'gestao' },
  { id: 'settings', label: 'Configurações', description: 'Parâmetros do sistema, usuários e auditoria', icon: Settings, category: 'sistema' },
];

// ==============================
// DEFINIÇÃO DOS PERFIS DO SISTEMA
// ==============================
interface RoleDefinition {
  id: UserRole;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  { id: 'admin', label: 'Admin Geral', description: 'Acesso irrestrito a todos os módulos e configurações', color: 'text-purple-300', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/40' },
  { id: 'gestor', label: 'Gestor de Obras', description: 'Gestão global de obras e controle físico-financeiro', color: 'text-indigo-300', bgColor: 'bg-indigo-500/20', borderColor: 'border-indigo-500/40' },
  { id: 'engenharia', label: 'Engenheiro de Campo', description: 'Avanço físico, etapas, apontamentos e RDO', color: 'text-cyan-300', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/40' },
  { id: 'compras', label: 'Compras & Suprimentos', description: 'Requisições, cotações e ordens de compra', color: 'text-amber-300', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/40' },
  { id: 'financeiro', label: 'Financeiro & Controladoria', description: 'Custos, conciliação contábil e demonstrativos', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/40' },
  { id: 'consulta', label: 'Somente Leitura', description: 'Visualização de relatórios e dashboards sem alteração', color: 'text-slate-300', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/40' },
];

// ==============================
// PERMISSÕES PADRÃO (DEFAULT) DO SISTEMA
// ==============================
type PermissionLevel = 'full' | 'view' | 'none';

interface RolePermissions {
  [moduleId: string]: PermissionLevel;
}

interface AllPermissions {
  [roleId: string]: RolePermissions;
}

const DEFAULT_PERMISSIONS: AllPermissions = {
  admin: {
    dashboard: 'full', works: 'full', physical: 'full', stages: 'full',
    budget: 'full', commercial: 'full', financial: 'full', purchasing: 'full',
    labor: 'full', importer: 'full', depara: 'full', reports: 'full', settings: 'full',
  },
  gestor: {
    dashboard: 'full', works: 'full', physical: 'full', stages: 'full',
    budget: 'full', commercial: 'full', financial: 'full', purchasing: 'full',
    labor: 'full', importer: 'full', depara: 'full', reports: 'full', settings: 'none',
  },
  engenharia: {
    dashboard: 'view', works: 'full', physical: 'full', stages: 'full',
    budget: 'view', commercial: 'view', financial: 'view', purchasing: 'none',
    labor: 'full', importer: 'none', depara: 'none', reports: 'view', settings: 'none',
  },
  compras: {
    dashboard: 'view', works: 'view', physical: 'none', stages: 'none',
    budget: 'none', commercial: 'none', financial: 'none', purchasing: 'full',
    labor: 'none', importer: 'none', depara: 'none', reports: 'view', settings: 'none',
  },
  financeiro: {
    dashboard: 'view', works: 'view', physical: 'none', stages: 'none',
    budget: 'full', commercial: 'view', financial: 'full', purchasing: 'view',
    labor: 'none', importer: 'full', depara: 'full', reports: 'full', settings: 'none',
  },
  consulta: {
    dashboard: 'view', works: 'view', physical: 'view', stages: 'view',
    budget: 'view', commercial: 'view', financial: 'view', purchasing: 'none',
    labor: 'none', importer: 'none', depara: 'none', reports: 'view', settings: 'none',
  },
};

const STORAGE_KEY = 'gestao_obras_v2_role_permissions';

// ==============================
// COMPONENTE PRINCIPAL
// ==============================
export const RolePermissionsManager: React.FC = () => {
  const { role: currentUserRole, user, refreshPermissions } = useAuth();
  const isAdmin = currentUserRole === 'admin';

  const [permissions, setPermissions] = useState<AllPermissions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_PERMISSIONS, ...JSON.parse(saved) };
    } catch { /* fallback */ }
    return { ...DEFAULT_PERMISSIONS };
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carrega permissões compartilhadas do Supabase (public.role_permissions)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const remote = await fetchRolePermissionsFromSupabase();
      if (mounted && remote) {
        const merged = { ...DEFAULT_PERMISSIONS, ...remote };
        setPermissions(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistPermissions = async (data: AllPermissions): Promise<boolean> => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }

    if (!isSupabaseConfigured() || !supabase) return false;
    const rows = Object.entries(data).map(([role, perms]) => ({
      role,
      permissions: perms,
      updated_by: user?.email || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role' });
    if (error) {
      console.warn('Erro ao salvar role_permissions no Supabase:', error);
      return false;
    }
    logAudit('UPDATE_ROLE_PERMISSIONS', 'role_permissions', undefined, 'Matriz de permissões por perfil atualizada');
    return true;
  };

  const handleTogglePermission = (moduleId: string) => {
    if (!isAdmin || !isEditing || selectedRole === 'admin') return;

    const current = permissions[selectedRole]?.[moduleId] || 'none';
    let next: PermissionLevel;
    if (current === 'none') next = 'view';
    else if (current === 'view') next = 'full';
    else next = 'none';

    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [moduleId]: next,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const ok = await persistPermissions(permissions);
    setIsSaving(false);
    refreshPermissions();
    setIsEditing(false);
    setHasChanges(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError('Não foi possível gravar no Supabase (verifique se a tabela role_permissions foi criada). As permissões foram salvas apenas neste navegador.');
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('Deseja restaurar todas as permissões para o padrão do sistema?')) {
      setPermissions({ ...DEFAULT_PERMISSIONS });
      await persistPermissions(DEFAULT_PERMISSIONS);
      refreshPermissions();
      setHasChanges(false);
      setIsEditing(false);
    }
  };

  const getPermissionIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'full':
        return <Pencil className="w-3.5 h-3.5" />;
      case 'view':
        return <Eye className="w-3.5 h-3.5" />;
      case 'none':
      default:
        return <X className="w-3.5 h-3.5" />;
    }
  };

  const getPermissionStyle = (level: PermissionLevel) => {
    switch (level) {
      case 'full':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'view':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'none':
      default:
        return 'bg-red-500/10 text-red-400/60 border-red-500/20';
    }
  };

  const getPermissionLabel = (level: PermissionLevel) => {
    switch (level) {
      case 'full': return 'Editar';
      case 'view': return 'Visualizar';
      case 'none': default: return 'Bloqueado';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'operacional': return 'Operacional';
      case 'financeiro': return 'Financeiro';
      case 'gestao': return 'Gestão';
      case 'sistema': return 'Sistema';
      default: return cat;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'operacional': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'financeiro': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'gestao': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      case 'sistema': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-slate-400';
    }
  };

  // Conta permissões concedidas por perfil
  const countAccess = (roleId: UserRole) => {
    const rp = permissions[roleId] || {};
    return Object.values(rp).filter(v => v !== 'none').length;
  };

  // Agrupamento de módulos por categoria
  const modulesByCategory = SYSTEM_MODULES.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  }, {} as Record<string, SystemModule[]>);

  const categoryOrder = ['gestao', 'operacional', 'financeiro', 'sistema'];

  const selectedRoleDef = ROLE_DEFINITIONS.find(r => r.id === selectedRole)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl border border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Gerenciador de Perfis & Permissões</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina quais funcionalidades cada perfil pode acessar e editar no sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 rounded-xl bg-[#004171] hover:bg-[#0a548c] text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-[#004171]/40 border border-[#38bdf8]/40 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Permissões</span>
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleResetDefaults}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Permissões salvas com sucesso no Supabase e aplicadas a todos os usuários!</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Seletor de Perfis (Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ROLE_DEFINITIONS.map(rd => {
          const isSelected = selectedRole === rd.id;
          const accessCount = countAccess(rd.id);
          return (
            <button
              key={rd.id}
              onClick={() => setSelectedRole(rd.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? `${rd.bgColor} ${rd.borderColor} ring-2 ring-offset-1 ring-offset-slate-950 shadow-lg`
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
              style={isSelected ? { outline: '2px solid', outlineColor: 'currentColor', outlineOffset: '2px' } : undefined}
            >
              <span className={`text-xs font-bold block ${isSelected ? rd.color : 'text-white'}`}>{rd.label}</span>
              <span className="text-[10px] text-slate-400 block mt-1">{accessCount}/{SYSTEM_MODULES.length} módulos</span>
              {isSelected && <div className={`w-full h-0.5 rounded-full mt-2 ${rd.bgColor}`} />}
            </button>
          );
        })}
      </div>

      {/* Card do Perfil Selecionado com Descrição */}
      <div className={`rounded-xl border p-4 flex items-center space-x-3 ${selectedRoleDef.bgColor} ${selectedRoleDef.borderColor}`}>
        <div className={`w-8 h-8 rounded-lg ${selectedRoleDef.bgColor} ${selectedRoleDef.borderColor} border flex items-center justify-center`}>
          <ShieldCheck className={`w-4 h-4 ${selectedRoleDef.color}`} />
        </div>
        <div className="flex-1">
          <span className={`text-sm font-bold ${selectedRoleDef.color}`}>{selectedRoleDef.label}</span>
          <p className="text-xs text-slate-400 mt-0.5">{selectedRoleDef.description}</p>
        </div>
        {selectedRole === 'admin' && isEditing && (
          <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-1 rounded-lg border border-purple-500/30 font-semibold">
            Não editável — acesso total
          </span>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center space-x-4 text-[11px]">
        <span className="text-slate-500 font-medium">Legenda:</span>
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold">
            <Pencil className="w-3 h-3" />
            <span>Editar</span>
          </span>
          <span className="text-slate-500">Acesso completo (leitura + escrita)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold">
            <Eye className="w-3 h-3" />
            <span>Visualizar</span>
          </span>
          <span className="text-slate-500">Somente leitura</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border bg-red-500/10 text-red-400/60 border-red-500/20 font-semibold">
            <X className="w-3 h-3" />
            <span>Bloqueado</span>
          </span>
          <span className="text-slate-500">Sem acesso</span>
        </div>
      </div>

      {/* Matriz de Permissões por Categoria */}
      <div className="space-y-4">
        {categoryOrder.map(cat => {
          const modules = modulesByCategory[cat];
          if (!modules || modules.length === 0) return null;

          return (
            <div key={cat} className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              {/* Cabeçalho da Categoria */}
              <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center space-x-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getCategoryColor(cat)}`}>
                  {getCategoryLabel(cat)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {modules.length} módulo{modules.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Lista de Módulos */}
              <div className="divide-y divide-slate-800/60">
                {modules.map(mod => {
                  const Icon = mod.icon;
                  const level = permissions[selectedRole]?.[mod.id] || 'none';
                  const canClick = isEditing && isAdmin && selectedRole !== 'admin';

                  return (
                    <div
                      key={mod.id}
                      className={`flex items-center px-4 py-3 transition-colors ${
                        canClick ? 'cursor-pointer hover:bg-slate-800/40' : ''
                      }`}
                      onClick={() => canClick && handleTogglePermission(mod.id)}
                    >
                      {/* Ícone do Módulo */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          level !== 'none'
                            ? 'bg-[#004171]/30 border border-[#38bdf8]/30 text-[#38bdf8]'
                            : 'bg-slate-800/60 border border-slate-700/60 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold block truncate ${
                            level !== 'none' ? 'text-white' : 'text-slate-500'
                          }`}>
                            {mod.label}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">{mod.description}</span>
                        </div>
                      </div>

                      {/* Badge de Permissão */}
                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase ${getPermissionStyle(level)} ${
                          canClick ? 'hover:opacity-80' : ''
                        }`}>
                          {getPermissionIcon(level)}
                          <span>{getPermissionLabel(level)}</span>
                        </span>
                        {canClick && (
                          <span className="text-[10px] text-slate-600 italic">clique para alterar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo Comparativo (Tabela Compacta Todos os Perfis) */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#38bdf8]" />
          <h4 className="text-xs font-bold text-white">Visão Comparativa — Todos os Perfis</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5 text-left font-semibold min-w-[160px]">Módulo</th>
                {ROLE_DEFINITIONS.map(rd => (
                  <th key={rd.id} className={`p-2.5 text-center font-bold ${selectedRole === rd.id ? rd.color : 'text-slate-400'}`}>
                    {rd.label.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {SYSTEM_MODULES.map(mod => (
                <tr key={mod.id} className="hover:bg-slate-800/30">
                  <td className="p-2.5 text-xs text-slate-300 font-medium">{mod.label}</td>
                  {ROLE_DEFINITIONS.map(rd => {
                    const level = permissions[rd.id]?.[mod.id] || 'none';
                    return (
                      <td key={rd.id} className="p-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${getPermissionStyle(level)}`}>
                          {level === 'full' && <Check className="w-3 h-3" />}
                          {level === 'view' && <Eye className="w-3 h-3" />}
                          {level === 'none' && <X className="w-3 h-3" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsManager;

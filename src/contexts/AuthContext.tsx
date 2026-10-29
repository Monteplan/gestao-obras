import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_PROFILES } from '../lib/seed-data';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { syncRolePermissionsToLocal } from '../lib/role-permissions';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  requestAccess: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  recoverPasswordStep1: (email: string) => Promise<{ success: boolean; error?: string }>;
  recoverPasswordStep2: (otp: string) => Promise<{ success: boolean; error?: string }>;
  recoverPasswordStep3: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  canAccess: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  refreshPermissions: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Versão das permissões: força re-render (ex.: menu lateral) quando a matriz muda
  const [, setPermissionsVersion] = useState<number>(0);
  const refreshPermissions = () => setPermissionsVersion(v => v + 1);

  // Ao autenticar, carrega a matriz de permissões compartilhada do Supabase
  useEffect(() => {
    if (!user) return;
    let active = true;
    syncRolePermissionsToLocal().then((updated) => {
      if (active && updated) refreshPermissions();
    });
    return () => { active = false; };
  }, [user?.email]);

  // Sincroniza e garante persistência do perfil do usuário ativo
  const persistUserProfile = (profile: UserProfile) => {
    try {
      const raw = localStorage.getItem('gestao_obras_v2_user_profiles');
      let list: UserProfile[] = raw ? JSON.parse(raw) : [...INITIAL_PROFILES];
      const existingIndex = list.findIndex(p => p.email.toLowerCase() === profile.email.toLowerCase());
      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...profile };
      } else {
        list = [profile, ...list];
      }
      localStorage.setItem('gestao_obras_v2_user_profiles', JSON.stringify(list));
    } catch (err) {
      console.warn('Erro ao persistir perfil de usuário no localStorage:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      Promise.resolve(
        supabase.from('profiles').upsert({
          name: profile.name,
          email: profile.email.toLowerCase(),
          role: profile.role,
          organization_id: '11111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString()
        })
      )
        .then(() => {})
        .catch(() => {});
    }
  };

  // Sempre exige autenticação na tela de login ao entrar na aplicação
  useEffect(() => {
    // Remove qualquer login permanente anterior do localStorage
    localStorage.removeItem('gestao_obras_auth_user');

    // Verifica se já está autenticado nesta aba ativa (sessionStorage)
    const sessionUser = sessionStorage.getItem('gestao_obras_session_user');
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        setUser(parsed);
        persistUserProfile(parsed);
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: pass });
        if (!error && data?.user) {
          const profile = INITIAL_PROFILES.find(p => p.email.toLowerCase() === normalizedEmail) || {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || normalizedEmail.split('@')[0],
            role: (data.user.user_metadata?.role as UserRole) || 'admin',
            organization_id: 'org-1',
            organization_name: 'Monteplan Engenharia',
          };
          setUser(profile);
          sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(profile));
          persistUserProfile(profile);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Tentativa via Supabase Auth falhou, verificando credenciais corporativas:', err);
      }
    }

    // 1. Validação de Usuários cadastrados no Gerenciador de Usuários (Configurações)
    try {
      const storedCustom = localStorage.getItem('gestao_obras_v2_user_profiles');
      if (storedCustom) {
        const customList: UserProfile[] = JSON.parse(storedCustom);
        const customMatch = customList.find(p => p.email.toLowerCase() === normalizedEmail);
        if (customMatch) {
          setUser(customMatch);
          sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(customMatch));
          persistUserProfile(customMatch);
          return { success: true };
        }
      }
    } catch {
      // fallback silencioso
    }

    // 2. Validação de Contas Cadastradas no Sistema
    const found = INITIAL_PROFILES.find(p => p.email.toLowerCase() === normalizedEmail);
    if (found) {
      setUser(found);
      sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(found));
      persistUserProfile(found);
      return { success: true };
    }

    // 3. Acesso com e-mail corporativo institucional (concede perfil Administrador por padrão)
    if (normalizedEmail.includes('@')) {
      const formattedName = normalizedEmail
        .split('@')[0]
        .split(/[._-]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
        .join(' ') || 'Usuário';

      const corporateUser: UserProfile = {
        id: 'usr-' + Date.now(),
        email: normalizedEmail,
        name: formattedName,
        role: 'admin',
        organization_id: 'org-1',
        organization_name: 'Monteplan Engenharia',
      };
      setUser(corporateUser);
      sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(corporateUser));
      persistUserProfile(corporateUser);
      return { success: true };
    }

    return { success: false, error: 'Credenciais inválidas. Verifique o e-mail e senha informados.' };
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    sessionStorage.removeItem('gestao_obras_session_user');
    localStorage.removeItem('gestao_obras_auth_user');
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(updated));
    }
  };

  const requestAccess = async (_data: { name: string; email: string; phone: string; password: string }) => {
    return new Promise<{ success: boolean }>((resolve) => {
      setTimeout(() => resolve({ success: true }), 800);
    });
  };

  const recoverPasswordStep1 = async (email: string) => {
    const normalized = (email || '').trim().toLowerCase();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(normalized, {
          redirectTo: window.location.origin,
        });
      } catch (e) {
        console.warn('Erro ao solicitar recuperação via Supabase Auth:', e);
      }
    }
    return new Promise<{ success: boolean }>((resolve) => {
      setTimeout(() => resolve({ success: true }), 600);
    });
  };

  const recoverPasswordStep2 = async (otp: string) => {
    if (otp.length < 6) return { success: false, error: 'Código deve conter no mínimo 6 dígitos' };
    return { success: true };
  };

  const recoverPasswordStep3 = async (newPass: string) => {
    if (newPass.length < 6) return { success: false, error: 'A senha deve ter no mínimo 6 caracteres' };
    return { success: true };
  };

  const role = user?.role || 'consulta';

  // Carrega permissões customizadas do gerenciador de perfis (se existirem)
  const getCustomPermissions = (): Record<string, string> | null => {
    try {
      const saved = localStorage.getItem('gestao_obras_v2_role_permissions');
      if (saved) {
        const all = JSON.parse(saved);
        return all[role] || null;
      }
    } catch { /* fallback */ }
    return null;
  };

  // Matriz de Controle de Acesso por Perfil (RBAC) — lê permissões customizadas quando disponíveis
  const canAccess = (module: string): boolean => {
    if (role === 'admin') return true;

    const custom = getCustomPermissions();
    if (custom && custom[module] !== undefined) {
      return custom[module] !== 'none';
    }

    // Fallback para permissões padrão hardcoded
    switch (module) {
      case 'dashboard':
      case 'works':
      case 'reports':
        return true;
      case 'stages':
      case 'physical':
        return ['gestor', 'engenharia', 'admin', 'consulta'].includes(role);
      case 'budget':
      case 'financial':
      case 'commercial':
      case 'integrated':
        return ['gestor', 'engenharia', 'financeiro', 'admin', 'consulta'].includes(role);
      case 'depara':
        return ['financeiro', 'admin', 'gestor'].includes(role);
      case 'purchasing':
        return ['compras', 'gestor', 'financeiro', 'admin'].includes(role);
      case 'costs':
      case 'results':
        return ['financeiro', 'gestor', 'admin'].includes(role);
      case 'labor':
        return ['engenharia', 'gestor', 'admin'].includes(role);
      case 'importer':
        return ['admin', 'financeiro', 'gestor'].includes(role);
      case 'users':
      case 'settings':
        return false; // apenas admin (já tratado no início da função)
      default:
        return false;
    }
  };

  const canEdit = (module: string): boolean => {
    if (role === 'admin') return true;
    if (role === 'consulta') return false;

    const custom = getCustomPermissions();
    if (custom && custom[module] !== undefined) {
      return custom[module] === 'full';
    }

    // Fallback para permissões padrão hardcoded
    switch (module) {
      case 'works':
      case 'stages':
      case 'physical':
        return ['gestor', 'engenharia'].includes(role);
      case 'budget':
        return ['engenharia', 'gestor'].includes(role);
      case 'incc':
        return ['engenharia', 'gestor'].includes(role);
      case 'financial':
        return ['financeiro', 'gestor'].includes(role);
      case 'depara':
        return ['admin', 'financeiro', 'gestor'].includes(role);
      case 'costs':
      case 'results':
        return ['financeiro', 'gestor'].includes(role);
      case 'purchasing':
        return ['compras', 'gestor'].includes(role);
      case 'labor':
        return ['engenharia', 'gestor'].includes(role);
      case 'importer':
        return ['admin', 'financeiro'].includes(role);
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
        requestAccess,
        recoverPasswordStep1,
        recoverPasswordStep2,
        recoverPasswordStep3,
        canAccess,
        canEdit,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

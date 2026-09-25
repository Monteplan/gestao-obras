import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_PROFILES } from '../lib/seed-data';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega sessão salva ou inicializa com admin para conveniência no primeiro load
  useEffect(() => {
    const savedUser = localStorage.getItem('gestao_obras_auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(INITIAL_PROFILES[0]);
      }
    } else {
      // Padrão de entrada: Admin
      setUser(INITIAL_PROFILES[0]);
      localStorage.setItem('gestao_obras_auth_user', JSON.stringify(INITIAL_PROFILES[0]));
    }
    setIsLoading(false);

    // Se o Supabase estiver configurado, ouvir mudanças reais
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          // Atualiza perfil caso haja login ativo
          const profile = INITIAL_PROFILES.find(p => p.email === session.user.email) || {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'Usuário Supabase',
            role: (session.user.user_metadata?.role as UserRole) || 'gestor',
            organization_id: 'org-1',
            organization_name: 'Monteplan Engenharia',
          };
          setUser(profile);
        }
      });
    }
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          const profile = INITIAL_PROFILES.find(p => p.email === email) || {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: 'gestor',
            organization_id: 'org-1',
            organization_name: 'Monteplan Engenharia',
          };
          setUser(profile);
          localStorage.setItem('gestao_obras_auth_user', JSON.stringify(profile));
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Validação local / Demo
    const found = INITIAL_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem('gestao_obras_auth_user', JSON.stringify(found));
      return { success: true };
    }

    // Se for e-mail genérico na demo, permitir acesso como gestor
    const demoUser: UserProfile = {
      id: 'usr-' + Date.now(),
      email,
      name: email.split('@')[0].toUpperCase(),
      role: 'gestor',
      organization_id: 'org-1',
      organization_name: 'Monteplan Engenharia',
    };
    setUser(demoUser);
    localStorage.setItem('gestao_obras_auth_user', JSON.stringify(demoUser));
    return { success: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('gestao_obras_auth_user');
  };

  const switchRole = (newRole: UserRole) => {
    const profileTemplate = INITIAL_PROFILES.find(p => p.role === newRole) || {
      id: 'usr-switch',
      email: `${newRole}@monteplan.com.br`,
      name: `${newRole.toUpperCase()} (Demo)`,
      role: newRole,
      organization_id: 'org-1',
      organization_name: 'Monteplan Engenharia',
    };
    setUser(profileTemplate);
    localStorage.setItem('gestao_obras_auth_user', JSON.stringify(profileTemplate));
  };

  const requestAccess = async (_data: { name: string; email: string; phone: string; password: string }) => {
    return new Promise<{ success: boolean }>((resolve) => {
      setTimeout(() => resolve({ success: true }), 800);
    });
  };

  const recoverPasswordStep1 = async (_email: string) => {
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

  // Matriz de Controle de Acesso por Perfil (RBAC)
  const canAccess = (module: string): boolean => {
    if (role === 'admin') return true;

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

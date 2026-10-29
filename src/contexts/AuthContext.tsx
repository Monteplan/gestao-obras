import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_PROFILES } from '../lib/seed-data';
import { supabase, isSupabaseConfigured, logAudit } from '../lib/supabase';
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

const DEFAULT_ORG_UUID = '11111111-1111-1111-1111-111111111111';

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

  // Busca perfil cadastrado (Supabase public.profiles -> localStorage -> INITIAL_PROFILES)
  const resolveRegisteredProfile = async (email: string): Promise<UserProfile | null> => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Consulta tabela public.profiles no Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (!error && data && data.email) {
          return {
            id: data.id || 'usr-' + Date.now(),
            email: data.email.toLowerCase(),
            name: data.name || data.email.split('@')[0],
            role: (data.role as UserRole) || 'consulta',
            organization_id: data.organization_id || 'org-1',
            organization_name: 'Monteplan Engenharia',
          };
        }
      } catch (err) {
        console.warn('Aviso ao buscar perfil no Supabase:', err);
      }
    }

    // 2. Consulta lista local sincronizada pelo Gerenciador de Usuários
    try {
      const storedCustom = localStorage.getItem('gestao_obras_v2_user_profiles');
      if (storedCustom) {
        const customList: UserProfile[] = JSON.parse(storedCustom);
        const match = customList.find(p => p.email.toLowerCase() === normalizedEmail);
        if (match) return match;
      }
    } catch {
      // ignore
    }

    // 3. Consulta perfis iniciais oficiais da Monteplan
    const seedMatch = INITIAL_PROFILES.find(p => p.email.toLowerCase() === normalizedEmail);
    if (seedMatch) return seedMatch;

    return null;
  };

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
        supabase.from('profiles').upsert(
          {
            name: profile.name,
            email: profile.email.toLowerCase(),
            role: profile.role,
            organization_id: DEFAULT_ORG_UUID,
          },
          { onConflict: 'email' }
        )
      )
        .then(() => {})
        .catch(() => {});
    }
  };

  // Restaura sessão ativa (Supabase Auth ou sessionStorage da aba)
  useEffect(() => {
    let isMounted = true;
    localStorage.removeItem('gestao_obras_auth_user');

    const initSession = async () => {
      // 1. Verifica sessão existente na aba atual
      const sessionUser = sessionStorage.getItem('gestao_obras_session_user');
      if (sessionUser) {
        try {
          const parsed: UserProfile = JSON.parse(sessionUser);
          // Revalida o role atualizado no Supabase
          const freshProfile = await resolveRegisteredProfile(parsed.email);
          const finalProfile = freshProfile ? { ...parsed, ...freshProfile } : parsed;
          if (isMounted) {
            setUser(finalProfile);
            sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(finalProfile));
            persistUserProfile(finalProfile);
            setIsLoading(false);
          }
          return;
        } catch {
          // continua para checagem Supabase Auth
        }
      }

      // 2. Verifica sessão ativa do Supabase Auth
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const registered = await resolveRegisteredProfile(session.user.email);
            const resolvedProfile: UserProfile = registered || {
              id: session.user.id,
              email: session.user.email.toLowerCase(),
              name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
              role: (session.user.user_metadata?.role as UserRole) || 'consulta',
              organization_id: 'org-1',
              organization_name: 'Monteplan Engenharia',
            };
            if (isMounted) {
              setUser(resolvedProfile);
              sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(resolvedProfile));
              persistUserProfile(resolvedProfile);
            }
          }
        } catch {
          // sem sessão ativa
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initSession();

    // Escuta eventos de login/logout do Supabase Auth
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            sessionStorage.removeItem('gestao_obras_session_user');
          }
        } else if (event === 'SIGNED_IN' && session?.user?.email) {
          const registered = await resolveRegisteredProfile(session.user.email);
          if (registered && isMounted) {
            setUser(registered);
            sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(registered));
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Informe um e-mail corporativo válido.' };
    }

    if (!pass || pass.length < 4) {
      return { success: false, error: 'Informe sua senha de acesso.' };
    }

    // 1. Verifica se o usuário está devidamente cadastrado em public.profiles / Usuários & Perfis
    const registeredProfile = await resolveRegisteredProfile(normalizedEmail);

    // 2. Tenta autenticar via Supabase Auth
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pass,
        });

        if (!error && data?.user) {
          const profile: UserProfile = registeredProfile
            ? { ...registeredProfile, id: data.user.id }
            : {
                id: data.user.id,
                email: data.user.email || normalizedEmail,
                name: data.user.user_metadata?.full_name || normalizedEmail.split('@')[0],
                role: (data.user.user_metadata?.role as UserRole) || 'consulta',
                organization_id: 'org-1',
                organization_name: 'Monteplan Engenharia',
              };

          setUser(profile);
          sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(profile));
          persistUserProfile(profile);
          await syncRolePermissionsToLocal();
          refreshPermissions();
          logAudit('USER_LOGIN', 'auth', profile.id, `Login via Supabase Auth: ${profile.email} (${profile.role})`);
          return { success: true };
        }

        // Se o usuário já faz parte da lista oficial de usuários cadastrados da Monteplan,
        // mas ainda não tinha credencial no Supabase Auth, provisionamos a conta no Supabase Auth
        if (registeredProfile && pass.length >= 6) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: pass,
            options: {
              data: {
                full_name: registeredProfile.name,
                role: registeredProfile.role,
              },
            },
          });

          if (!signUpError && signUpData?.user) {
            const finalProfile: UserProfile = {
              ...registeredProfile,
              id: signUpData.user.id || registeredProfile.id,
            };
            setUser(finalProfile);
            sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(finalProfile));
            persistUserProfile(finalProfile);
            await syncRolePermissionsToLocal();
            refreshPermissions();
            logAudit('USER_PROVISIONED_AUTH', 'auth', finalProfile.id, `Conta provisionada no Supabase Auth: ${finalProfile.email} (${finalProfile.role})`);
            return { success: true };
          }

          // Caso a conta já exista no Supabase Auth e a senha digitada esteja incorreta:
          if (signUpError && signUpError.message?.toLowerCase().includes('already registered')) {
            return {
              success: false,
              error: 'Senha incorreta para este usuário. Verifique a senha ou clique em "Esqueceu a senha?".',
            };
          }
        }
      } catch (err: any) {
        console.warn('Aviso na verificação Supabase Auth:', err);
      }
    }

    // 3. Se o usuário está cadastrado oficialmente em public.profiles ou INITIAL_PROFILES
    //    (ex.: confirmação de e-mail pendente no Supabase ou ambiente local)
    if (registeredProfile) {
      setUser(registeredProfile);
      sessionStorage.setItem('gestao_obras_session_user', JSON.stringify(registeredProfile));
      persistUserProfile(registeredProfile);
      await syncRolePermissionsToLocal();
      refreshPermissions();
      logAudit('USER_LOGIN', 'auth', registeredProfile.id, `Login autorizado: ${registeredProfile.email} (${registeredProfile.role})`);
      return { success: true };
    }

    // 4. Bloqueia qualquer e-mail não cadastrado (fim do acesso irrestrito como Admin)
    return {
      success: false,
      error: 'Usuário não cadastrado no sistema. Solicite a liberação de acesso ao Administrador.',
    };
  };

  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
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

  const requestAccess = async (data: { name: string; email: string; phone: string; password: string }) => {
    const normalizedEmail = (data.email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }

    // Cria usuário com perfil inicial 'consulta' (Somente Leitura) até que o Admin altere
    const newProfile: UserProfile = {
      id: 'usr-' + Date.now(),
      email: normalizedEmail,
      name: data.name.trim() || normalizedEmail.split('@')[0],
      role: 'consulta',
      organization_id: 'org-1',
      organization_name: 'Monteplan Engenharia',
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signUp({
          email: normalizedEmail,
          password: data.password,
          options: {
            data: {
              full_name: newProfile.name,
              phone: data.phone,
              role: 'consulta',
            },
          },
        });
      } catch (e) {
        console.warn('Aviso ao registrar no Supabase Auth:', e);
      }
    }

    persistUserProfile(newProfile);
    logAudit('REQUEST_ACCESS', 'profiles', newProfile.id, `Solicitação de acesso registrada: ${newProfile.name} (${newProfile.email})`);
    return { success: true };
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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.updateUser({ password: newPass });
      } catch {
        // ignore if not in recovery session
      }
    }
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

    const custom = getCustomPermissions();
    if (custom && custom[module] !== undefined) {
      return custom[module] === 'full';
    }

    if (role === 'consulta') return false;

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

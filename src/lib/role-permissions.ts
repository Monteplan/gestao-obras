import { supabase, isSupabaseConfigured } from './supabase';

export const ROLE_PERMISSIONS_STORAGE_KEY = 'gestao_obras_v2_role_permissions';

export type PermissionLevel = 'full' | 'view' | 'none';
export type AllRolePermissions = Record<string, Record<string, PermissionLevel>>;

/**
 * Busca a matriz de permissões compartilhada em public.role_permissions.
 * Retorna null se o Supabase não estiver configurado, a tabela não existir ou estiver vazia.
 */
export async function fetchRolePermissionsFromSupabase(): Promise<AllRolePermissions | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('role_permissions').select('role, permissions');
    if (error || !data || data.length === 0) return null;
    const result: AllRolePermissions = {};
    data.forEach((row: any) => {
      if (row?.role && row?.permissions && typeof row.permissions === 'object') {
        result[row.role] = row.permissions;
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.warn('Aviso ao consultar public.role_permissions:', err);
    return null;
  }
}

/** Sincroniza do Supabase para o localStorage. Retorna true se houve atualização. */
export async function syncRolePermissionsToLocal(): Promise<boolean> {
  const remote = await fetchRolePermissionsFromSupabase();
  if (!remote) return false;
  try {
    const raw = localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
    const local = raw ? JSON.parse(raw) : {};
    const merged = { ...local, ...remote };
    localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}


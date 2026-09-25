import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project.supabase.co' &&
    !supabaseUrl.includes('example.com')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helpers para auditoria e logs locais
export function logAudit(action: string, entity: string, entity_id?: string, details?: string) {
  try {
    const logs = JSON.parse(localStorage.getItem('gestao_obras_audit_logs') || '[]');
    const newLog = {
      id: 'log-' + Date.now(),
      action,
      entity,
      entity_id,
      details,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    localStorage.setItem('gestao_obras_audit_logs', JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Audit log error', e);
  }
}

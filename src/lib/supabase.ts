import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

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

// Helpers para auditoria e logs locais e em nuvem
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

    // Se o Supabase estiver configurado, envia de forma não bloqueante para a tabela de trilha de auditoria
    if (supabase) {
      supabase
        .from('audit_logs')
        .insert({
          action,
          entity,
          entity_id,
          details: details ? { message: details } : {},
          performed_at: newLog.timestamp,
        })
        .then(({ error }) => {
          if (error) {
            // Caso a tabela tenha o nome em português no schema
            supabase
              .from('trilha_auditoria_logs')
              .insert({
                acao: action,
                entidade: entity,
                registro_id: entity_id,
                detalhes: details ? { message: details } : {},
                criado_em: newLog.timestamp,
              })
              .then(() => {});
          }
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error('Audit log error', e);
  }
}

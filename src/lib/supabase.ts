import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tbheqfvcfpzbppcuvlyr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaGVxZnZjZnB6YnBwY3V2bHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjU0MjEsImV4cCI6MjEwNTk0MTQyMX0.fw9SUuiwTfmaBkmL8R8eoxGm49lcEKg2danXTPTkSEs';

const rawUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

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
      Promise.resolve(
        supabase
          .from('audit_logs')
          .insert({
            action,
            entity,
            entity_id,
            details: details ? { message: details } : {},
            performed_at: newLog.timestamp,
          })
      )
        .then(({ error }: any) => {
          if (error) {
            // Caso a tabela tenha o nome em português no schema
            Promise.resolve(
              supabase
                .from('trilha_auditoria_logs')
                .insert({
                  acao: action,
                  entidade: entity,
                  registro_id: entity_id,
                  detalhes: details ? { message: details } : {},
                  criado_em: newLog.timestamp,
                })
            ).catch(() => {});
          }
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error('Audit log error', e);
  }
}

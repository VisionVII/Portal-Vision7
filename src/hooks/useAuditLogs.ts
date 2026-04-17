import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationAuditEntry } from '@/types/automation';

interface AuditFilters {
  automationId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

interface AuditLogRow {
  id: number;
  automation_id: string | null;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

function rowToEntry(r: AuditLogRow): AutomationAuditEntry {
  return {
    id: r.id,
    automationId: r.automation_id,
    action: r.action,
    actorId: r.actor_id,
    actorEmail: r.actor_email,
    details: r.details ?? {},
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  };
}

export function useAuditLogs(filters: AuditFilters = {}) {
  const { automationId, action, page = 1, pageSize = 50 } = filters;
  const queryKey = ['audit_logs', automationId ?? 'all', action ?? 'all', page];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ entries: AutomationAuditEntry[]; total: number }> => {
      let query = supabase
        .from('automation_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (automationId) query = query.eq('automation_id', automationId);
      if (action) query = query.eq('action', action);

      const { data: rows, error: err, count } = await query;
      if (err) {
        if (/does not exist|PGRST/i.test(err.message)) return { entries: [], total: 0 };
        throw new Error(err.message);
      }
      return {
        entries: (rows as unknown as AuditLogRow[]).map(rowToEntry),
        total: count ?? 0,
      };
    },
    staleTime: 30_000,
    retry: 1,
  });

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationExecution, ExecutionStatus } from '@/types/automation';

/* ---------- DB row → domain ---------- */
interface ExecutionRow {
  id: string;
  automation_id: string;
  n8n_execution_id: string | null;
  status: string;
  trigger_mode: string;
  triggered_by: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  steps: unknown[];
  error_message: string | null;
  error_detail: Record<string, unknown> | null;
  items_processed: number;
  items_created: number;
  metadata: Record<string, unknown>;
}

function rowToExecution(r: ExecutionRow): AutomationExecution {
  return {
    id: r.id,
    automationId: r.automation_id,
    n8nExecutionId: r.n8n_execution_id,
    status: r.status as AutomationExecution['status'],
    triggerMode: r.trigger_mode as AutomationExecution['triggerMode'],
    triggeredBy: r.triggered_by,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationMs: r.duration_ms,
    steps: (r.steps ?? []) as AutomationExecution['steps'],
    errorMessage: r.error_message,
    errorDetail: r.error_detail,
    itemsProcessed: r.items_processed ?? 0,
    itemsCreated: r.items_created ?? 0,
    metadata: r.metadata ?? {},
  };
}

/* ---------- Filters ---------- */
interface ExecutionFilters {
  automationId?: string;
  status?: ExecutionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useAutomationExecutions(filters: ExecutionFilters = {}) {
  const { automationId, status, dateFrom, dateTo, page = 1, pageSize = 30 } = filters;

  const queryKey = ['automation_executions', automationId ?? 'all', status ?? 'all', dateFrom, dateTo, page, pageSize];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ executions: AutomationExecution[]; total: number }> => {
      let query = supabase
        .from('automation_executions')
        .select('*', { count: 'exact' })
        .order('started_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (automationId) query = query.eq('automation_id', automationId);
      if (status) query = query.eq('status', status);
      if (dateFrom) query = query.gte('started_at', dateFrom);
      if (dateTo) query = query.lte('started_at', dateTo);

      const { data: rows, error: err, count } = await query;
      if (err) {
        if (/does not exist|PGRST/i.test(err.message)) return { executions: [], total: 0 };
        throw new Error(err.message);
      }
      return {
        executions: (rows as unknown as ExecutionRow[]).map(rowToExecution),
        total: count ?? 0,
      };
    },
    staleTime: 120_000,
    refetchInterval: 900_000,
    retry: 1,
  });

  return {
    executions: data?.executions ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAutomationAction, diffAutomation } from '@/services/auditLog';
import type { Json } from '@/integrations/supabase/types';
import type {
  AutomationV2,
  AutomationCategory,
  AutomationStatus,
  CreateAutomationPayload,
  UpdateAutomationPayload,
} from '@/types/automation';

/* ---------- DB row → domain ---------- */
interface AutomationV2Row {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  workflow_id: string | null;
  status: string;
  interval_minutes: number;
  cron_expression: string | null;
  config: Record<string, unknown>;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  run_count: number;
  error_count: number;
  success_rate: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToAutomation(r: AutomationV2Row): AutomationV2 {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    category: r.category as AutomationCategory,
    triggerType: r.trigger_type as AutomationV2['triggerType'],
    workflowId: r.workflow_id,
    status: r.status as AutomationStatus,
    intervalMinutes: r.interval_minutes,
    cronExpression: r.cron_expression,
    config: r.config ?? {},
    lastRunAt: r.last_run_at,
    lastRunStatus: r.last_run_status,
    nextRunAt: r.next_run_at,
    runCount: r.run_count ?? 0,
    errorCount: r.error_count ?? 0,
    successRate: Number(r.success_rate ?? 0),
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ---------- Filters ---------- */
interface AutomationFilters {
  category?: AutomationCategory;
  status?: AutomationStatus;
  page?: number;
  pageSize?: number;
}

const QUERY_KEY = ['automations_v2'] as const;

/* ---------- Hook ---------- */
export function useAutomationsV2(filters: AutomationFilters = {}) {
  const { category, status, page = 1, pageSize = 50 } = filters;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = [...QUERY_KEY, category ?? 'all', status ?? 'all', page];

  /* Fetch */
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ automations: AutomationV2[]; total: number }> => {
      let query = supabase
        .from('automations_v2')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (category) query = query.eq('category', category);
      if (status) query = query.eq('status', status);

      const { data: rows, error: err, count } = await query;
      if (err) {
        if (/does not exist|PGRST/i.test(err.message)) return { automations: [], total: 0 };
        throw new Error(err.message);
      }
      return {
        automations: (rows as unknown as AutomationV2Row[]).map(rowToAutomation),
        total: count ?? 0,
      };
    },
    staleTime: 15_000,
    retry: 1,
  });

  /* Create */
  const createMutation = useMutation({
    mutationFn: async (payload: CreateAutomationPayload) => {
      const { data: row, error: err } = await supabase
        .from('automations_v2')
        .insert({
          name: payload.name,
          description: payload.description ?? '',
          category: payload.category,
          trigger_type: payload.triggerType,
          workflow_id: payload.workflowId,
          interval_minutes: payload.intervalMinutes,
          cron_expression: payload.cronExpression,
          config: (payload.config ?? {}) as Json,
        })
        .select()
        .single();
      if (err) throw new Error(err.message);
      return rowToAutomation(row as unknown as AutomationV2Row);
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação criada' });
      void logAutomationAction('created', created.id, { name: created.name, category: created.category });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao criar', description: e.message, variant: 'destructive' });
    },
  });

  /* Update */
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: UpdateAutomationPayload & { id: string }) => {
      const before = data?.automations.find((a) => a.id === id) ?? null;

      const row: Record<string, unknown> = {};
      if (payload.name !== undefined) row.name = payload.name;
      if (payload.description !== undefined) row.description = payload.description;
      if (payload.category !== undefined) row.category = payload.category;
      if (payload.triggerType !== undefined) row.trigger_type = payload.triggerType;
      if (payload.workflowId !== undefined) row.workflow_id = payload.workflowId;
      if (payload.intervalMinutes !== undefined) row.interval_minutes = payload.intervalMinutes;
      if (payload.cronExpression !== undefined) row.cron_expression = payload.cronExpression;
      if (payload.config !== undefined) row.config = payload.config as Json;
      if (payload.status !== undefined) row.status = payload.status;

      const { data: updatedRow, error: err } = await supabase
        .from('automations_v2')
        .update(row as Record<string, Json>)
        .eq('id', id)
        .select()
        .single();
      if (err) throw new Error(err.message);
      const updated = rowToAutomation(updatedRow as unknown as AutomationV2Row);

      const isStatusOnlyChange = payload.status !== undefined && Object.keys(payload).length === 1;
      const action = isStatusOnlyChange ? (payload.status === 'active' ? 'activated' : 'paused') : 'updated';
      void logAutomationAction(action, updated.id, { name: updated.name, diff: diffAutomation(before, updated) });

      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação atualizada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
    },
  });

  /* Delete */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('automations_v2').delete().eq('id', id);
      if (err) throw new Error(err.message);
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação removida' });
      void logAutomationAction('deleted', id);
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' });
    },
  });

  /* Toggle status */
  const toggleStatus = async (id: string, current: AutomationStatus) => {
    const next = current === 'active' ? 'paused' : 'active';
    await updateMutation.mutateAsync({ id, status: next });
  };

  /* Bulk set status */
  const bulkSetStatus = async (ids: string[], status: AutomationStatus) => {
    const { error: err } = await supabase
      .from('automations_v2')
      .update({ status } as Record<string, Json>)
      .in('id', ids);
    if (err) throw new Error(err.message);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    toast({ title: `${ids.length} automações → ${status === 'active' ? 'ativadas' : 'pausadas'}` });
    void logAutomationAction(status === 'active' ? 'bulk_activated' : 'bulk_paused', null, { ids });
  };

  /* Bulk delete */
  const bulkDelete = async (ids: string[]) => {
    const { error: err } = await supabase
      .from('automations_v2')
      .delete()
      .in('id', ids);
    if (err) throw new Error(err.message);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    toast({ title: `${ids.length} automações removidas` });
    void logAutomationAction('bulk_deleted', null, { ids });
  };

  return {
    automations: data?.automations ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    createAutomation: createMutation.mutateAsync,
    updateAutomation: updateMutation.mutateAsync,
    deleteAutomation: deleteMutation.mutateAsync,
    toggleStatus,
    bulkSetStatus,
    bulkDelete,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Lightweight counts (head:true, no rows fetched) for the KPI bar.
 * Decoupled from useAutomationsV2's pagination so the StatBar stays
 * accurate at any page size, even with 100+ automations (NFR-001).
 */
export function useAutomationStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'stats'],
    queryFn: async (): Promise<{ total: number; active: number }> => {
      const [totalRes, activeRes] = await Promise.all([
        supabase.from('automations_v2').select('*', { count: 'exact', head: true }),
        supabase.from('automations_v2').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      if (totalRes.error && !/does not exist|PGRST/i.test(totalRes.error.message)) {
        throw new Error(totalRes.error.message);
      }
      return { total: totalRes.count ?? 0, active: activeRes.count ?? 0 };
    },
    staleTime: 15_000,
    retry: 1,
  });
}

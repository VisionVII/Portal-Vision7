import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Automation } from '@/types/automation';

/* ---------- DB row shape ---------- */
interface AutomationRow {
  id: string;
  name: string;
  workflow_id: string;
  active: boolean;
  interval: number;
  rss_feeds: string[];
  keywords: string[];
  prompt: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const rowToAutomation = (row: AutomationRow): Automation => ({
  id: row.id,
  name: row.name,
  workflowId: row.workflow_id,
  active: row.active,
  interval: row.interval,
  rssFeeds: row.rss_feeds ?? [],
  keywords: row.keywords ?? [],
  prompt: row.prompt ?? '',
  createdAt: row.created_at,
});

const automationToRow = (a: Omit<Automation, 'id' | 'createdAt'>) => ({
  name: a.name,
  workflow_id: a.workflowId,
  active: a.active,
  interval: a.interval,
  rss_feeds: a.rssFeeds,
  keywords: a.keywords,
  prompt: a.prompt,
});

/* ---------- Query key ---------- */
const QUERY_KEY = ['automations'] as const;

/* ---------- Hook ---------- */
export function useAutomations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /* Fetch */
  const { data: automations = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Automation[]> => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (/does not exist|PGRST/i.test(error.message)) return [];
        throw new Error(error.message);
      }

      return (data as AutomationRow[]).map(rowToAutomation);
    },
    staleTime: 30_000,
    retry: 1,
  });

  /* Create */
  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Automation, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('automations')
        .insert(automationToRow(payload))
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToAutomation(data as unknown as AutomationRow);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação criada', description: 'Guardada no servidor com sucesso.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar automação', description: err.message, variant: 'destructive' });
    },
  });

  /* Update */
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Omit<Automation, 'createdAt'>) => {
      const { data, error } = await supabase
        .from('automations')
        .update(automationToRow(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return rowToAutomation(data as AutomationRow);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação atualizada', description: 'Alterações guardadas.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    },
  });

  /* Delete */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Automação removida' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    },
  });

  return {
    automations,
    isLoading,
    error,
    createAutomation: createMutation.mutateAsync,
    updateAutomation: updateMutation.mutateAsync,
    deleteAutomation: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

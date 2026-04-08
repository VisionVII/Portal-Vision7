import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PipelineSearchConfig {
  id: string;
  label: string;
  tags: string[];
  language: string;
  region: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['pipeline_search_config'] as const;

export function usePipelineConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_search_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (/does not exist|PGRST/i.test(error.message)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as PipelineSearchConfig[];
    },
    staleTime: 30_000,
  });

  const activeConfig = query.data?.find((c) => c.is_active) ?? null;

  const updateTags = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase
        .from('pipeline_search_config')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Tags atualizadas', description: 'As preferências de pesquisa foram guardadas.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const createConfig = useMutation({
    mutationFn: async ({ label, tags }: { label: string; tags: string[] }) => {
      const { error } = await supabase
        .from('pipeline_search_config')
        .insert({ label, tags, is_active: true });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Configuração criada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('pipeline_search_config')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  return {
    configs: query.data ?? [],
    activeConfig,
    isLoading: query.isLoading,
    updateTags: updateTags.mutateAsync,
    createConfig: createConfig.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    isSaving: updateTags.isPending || createConfig.isPending,
  };
}

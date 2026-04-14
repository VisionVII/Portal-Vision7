import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/* ── Fetch category IDs for a post ── */
export function usePostCategories(postId: string | null) {
  return useQuery({
    queryKey: ['post_categories', postId],
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from('post_categories')
        .select('category_id')
        .eq('post_id', postId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: { category_id: string }) => r.category_id);
    },
    enabled: !!postId,
  });
}

/* ── Set categories for a post (replace all) ── */
export function useSetPostCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, categoryIds }: { postId: string; categoryIds: string[] }) => {
      // Delete existing
      const { error: delError } = await supabase
        .from('post_categories')
        .delete()
        .eq('post_id', postId);
      if (delError) throw new Error(delError.message);

      // Insert new
      if (categoryIds.length > 0) {
        const rows = categoryIds.map((cid) => ({ post_id: postId, category_id: cid }));
        const { error: insError } = await supabase
          .from('post_categories')
          .insert(rows);
        if (insError) throw new Error(insError.message);
      }

      // Keep legacy category_id in sync (first selected category)
      const { error: updError } = await supabase
        .from('posts')
        .update({ category_id: categoryIds[0] ?? null })
        .eq('id', postId);
      if (updError) throw new Error(updError.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['post_categories', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Categorias atualizadas' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar categorias', description: err.message, variant: 'destructive' });
    },
  });
}

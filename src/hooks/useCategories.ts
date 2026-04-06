import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'fallback-tecnologia', name: 'Tecnologia', slug: 'tecnologia', color: 'bg-blue-600', created_at: new Date().toISOString() },
  { id: 'fallback-desporto', name: 'Desporto', slug: 'desporto', color: 'bg-emerald-600', created_at: new Date().toISOString() },
  { id: 'fallback-musica', name: 'Música', slug: 'musica', color: 'bg-violet-600', created_at: new Date().toISOString() },
  { id: 'fallback-saude', name: 'Saúde', slug: 'saude', color: 'bg-rose-600', created_at: new Date().toISOString() },
  { id: 'fallback-mundo', name: 'Mundo', slug: 'mundo', color: 'bg-amber-600', created_at: new Date().toISOString() },
];

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useCategories supabase query error', error);
        }
        return FALLBACK_CATEGORIES;
      }

      if (!data || data.length === 0) {
        return FALLBACK_CATEGORIES;
      }

      return (data as Category[]) ?? FALLBACK_CATEGORIES;
    },
    retry: false,
  });
};

export const useCategoryBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Category | null;
    },
    enabled: !!slug,
  });
};

export interface CreateCategoryData {
  name: string;
  slug: string;
  color: string;
}

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      const { data: result, error } = await supabase
        .from('categories')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

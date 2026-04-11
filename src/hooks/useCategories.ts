import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const { message, details, hint, code } = error as SupabaseErrorLike;
    const composedMessage = [message, details, hint]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(' — ');

    if (composedMessage) {
      return composedMessage;
    }

    if (code) {
      return `Erro Supabase (${code})`;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export const useCategories = (enabled = true) => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, color, created_at')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar as categorias.'));
      }

      return (data as Category[]) ?? [];
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled,
  });
};

export const useCategoryBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, color, created_at')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar a categoria.'));
      }
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

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível criar a categoria.'));
      }
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

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível eliminar a categoria.'));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

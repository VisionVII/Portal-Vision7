import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  banner_url: string | null;
  category_id: string | null;
  author_id: string | null;
  author_name: string;
  status: string;
  featured: boolean;
  read_time: string;
  tags: string[];
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
}

export interface CreatePostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url?: string;
  banner_url?: string;
  category_id?: string;
  author_id?: string;
  author_name?: string;
  status?: string;
  featured?: boolean;
  read_time?: string;
  tags?: string[];
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: string;
}

// Fetch all posts (published for public, all for admin)
export const usePosts = (adminView = false) => {
  return useQuery({
    queryKey: ['posts', adminView],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (!adminView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      return (data as Post[]) ?? [];
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 60_000,
  });
};

// Fetch posts by category
export const usePostsByCategory = (categorySlug: string) => {
  return useQuery({
    queryKey: ['posts', 'category', categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories!inner (
            id,
            name,
            slug,
            color
          )
        `)
        .eq('categories.slug', categorySlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data as Post[]) ?? [];
    },
    enabled: !!categorySlug,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 60_000,
  });
};

// Fetch single post by slug
export const usePost = (slug: string) => {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          )
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw new Error(error.message);

      return (data as Post | null) ?? null;
    },
    enabled: !!slug,
    retry: false,
  });
};

// Fetch single post by ID
export const usePostById = (id: string) => {
  return useQuery({
    queryKey: ['post', 'id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);

      return (data as Post | null) ?? null;
    },
    enabled: !!id,
    retry: false,
  });
};

// Create post mutation
export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postData: CreatePostData) => {
      const { data, error } = await supabase
        .from('posts')
        .insert([{
          ...postData,
          published_at: postData.status === 'published' ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// Update post mutation
export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...postData }: UpdatePostData) => {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...postData,
          published_at: postData.status === 'published' ? new Date().toISOString() : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// Delete post mutation
export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

type SupabaseRpc = <T = unknown>(fn: string, params?: unknown) => Promise<{ data: T | null; error: { message?: string } | null }>;

const supabaseRpc = supabase.rpc as unknown as SupabaseRpc;

export const useTrackPostView = () => {
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabaseRpc('increment_views', {
        content_type: 'post',
        content_id: postId,
      });

      if (error) throw new Error(error.message || 'Não foi possível registar a visualização do post.');
    },
  });
};

// Get post stats
export const usePostStats = () => {
  return useQuery({
    queryKey: ['posts', 'stats'],
    queryFn: async () => {
      const { data: allPosts, error: allError } = await supabase
        .from('posts')
        .select('id, status, views, created_at');

      if (allError) throw allError;

      const total = allPosts?.length || 0;
      const drafts = allPosts?.filter(p => p.status === 'draft').length || 0;
      const totalViews = allPosts?.reduce((acc, p) => acc + (p.views || 0), 0) || 0;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = allPosts?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;

      return { total, drafts, totalViews, thisMonth };
    },
  });
};



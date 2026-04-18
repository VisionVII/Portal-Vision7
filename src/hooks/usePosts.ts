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

const POST_CATEGORY_SELECT = `
  categories!posts_category_id_fkey (
    id,
    name,
    slug,
    color
  )
`;

const PUBLIC_POST_SELECT = `
  id,
  title,
  slug,
  excerpt,
  image_url,
  banner_url,
  category_id,
  author_name,
  status,
  featured,
  read_time,
  tags,
  views,
  published_at,
  created_at,
  updated_at,
  ${POST_CATEGORY_SELECT}
`;

const FULL_POST_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  image_url,
  banner_url,
  category_id,
  author_id,
  author_name,
  status,
  featured,
  read_time,
  tags,
  views,
  published_at,
  created_at,
  updated_at,
  ${POST_CATEGORY_SELECT}
`;

const ADMIN_LIST_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  image_url,
  banner_url,
  category_id,
  author_id,
  author_name,
  status,
  featured,
  read_time,
  tags,
  views,
  published_at,
  created_at,
  updated_at,
  ${POST_CATEGORY_SELECT}
`;

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

const normalizePublicPost = (post: Partial<Post>): Post => ({
  id: post.id || '',
  title: post.title || '',
  slug: post.slug || '',
  excerpt: post.excerpt || '',
  content: '',
  image_url: post.image_url || null,
  banner_url: post.banner_url || null,
  category_id: post.category_id || null,
  author_id: null,
  author_name: post.author_name || 'Equipa Vision7',
  status: post.status || 'published',
  featured: Boolean(post.featured),
  read_time: post.read_time || '3 min',
  tags: post.tags || [],
  views: post.views || 0,
  published_at: post.published_at || null,
  created_at: post.created_at || new Date(0).toISOString(),
  updated_at: post.updated_at || post.created_at || new Date(0).toISOString(),
  categories: post.categories || null,
});

// Fetch all posts (published for public, all for admin)
export const usePosts = (adminView = false, enabled = true) => {
  return useQuery({
    queryKey: ['posts', adminView],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select((adminView ? ADMIN_LIST_SELECT : PUBLIC_POST_SELECT) as string)
        .order('created_at', { ascending: false })
        .limit(adminView ? 100 : 50);

      if (!adminView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar os posts.'));
      }

      return adminView
        ? ((data as unknown as Post[]) ?? [])
        : ((data as unknown as Partial<Post>[] | null)?.map((post) => normalizePublicPost(post)) ?? []);
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    staleTime: 60_000,
    enabled,
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
          ${PUBLIC_POST_SELECT.replace('categories!posts_category_id_fkey (', 'categories!posts_category_id_fkey!inner (')}
        `)
        .eq('categories.slug', categorySlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar os posts da categoria.'));
      }

      return (data as Partial<Post>[] | null)?.map((post) => normalizePublicPost(post)) ?? [];
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
        .select(FULL_POST_SELECT)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar o post.'));
      }

      return (data as Post | null) ?? null;
    },
    enabled: !!slug,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch related posts by category (lightweight — only 3 posts, no content field)
export const useRelatedPosts = (categoryId: string | null | undefined, excludePostId: string | null | undefined) => {
  return useQuery({
    queryKey: ['posts', 'related', categoryId, excludePostId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(PUBLIC_POST_SELECT)
        .eq('status', 'published')
        .eq('category_id', categoryId!)
        .neq('id', excludePostId!)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar posts relacionados.'));
      }

      return (data as Partial<Post>[] | null)?.map((post) => normalizePublicPost(post)) ?? [];
    },
    enabled: !!categoryId && !!excludePostId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch single post by ID
export const usePostById = (id: string) => {
  return useQuery({
    queryKey: ['post', 'id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(FULL_POST_SELECT)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível carregar o post.'));
      }

      return (data as Post | null) ?? null;
    },
    enabled: !!id,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível criar o post.'));
      }
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

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível atualizar o post.'));
      }
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

      if (error) {
        throw new Error(getErrorMessage(error, 'Não foi possível remover o post.'));
      }
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

      if (error) {
        console.warn('[useTrackPostView] tracking skipped during migration:', error.message || error);
        return;
      }
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

      if (allError) {
        throw new Error(getErrorMessage(allError, 'Não foi possível carregar as estatísticas dos posts.'));
      }

      const total = allPosts?.length || 0;
      const drafts = allPosts?.filter(p => p.status === 'draft').length || 0;
      const totalViews = allPosts?.reduce((acc, p) => acc + (p.views || 0), 0) || 0;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = allPosts?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;

      return { total, drafts, totalViews, thisMonth };
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};



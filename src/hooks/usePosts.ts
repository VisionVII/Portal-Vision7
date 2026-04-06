import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { posts as initialPosts } from '@/data/posts';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string | null;
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

const FALLBACK_CATEGORIES = {
  tecnologia: { id: 'fallback-tecnologia', name: 'Tecnologia', slug: 'tecnologia', color: 'bg-blue-600' },
  desporto: { id: 'fallback-desporto', name: 'Desporto', slug: 'desporto', color: 'bg-emerald-600' },
  musica: { id: 'fallback-musica', name: 'Música', slug: 'musica', color: 'bg-violet-600' },
  saude: { id: 'fallback-saude', name: 'Saúde', slug: 'saude', color: 'bg-rose-600' },
  mundo: { id: 'fallback-mundo', name: 'Mundo', slug: 'mundo', color: 'bg-amber-600' },
} as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const fallbackPosts: Post[] = initialPosts.map((post) => {
  const categoryKey = slugify(post.category) as keyof typeof FALLBACK_CATEGORIES;
  const category = FALLBACK_CATEGORIES[categoryKey] ?? FALLBACK_CATEGORIES.tecnologia;
  const now = new Date().toISOString();

  return {
    id: String(post.id),
    title: post.title,
    slug: slugify(post.title),
    excerpt: post.excerpt,
    content: post.content,
    image_url: post.image.startsWith('http') ? post.image : `https://images.unsplash.com/${post.image}?auto=format&fit=crop&w=1200&q=80`,
    category_id: category.id,
    author_id: null,
    author_name: post.author,
    status: 'published',
    featured: post.featured,
    read_time: post.readTime,
    tags: post.tags,
    views: 0,
    published_at: now,
    created_at: now,
    updated_at: now,
    categories: category,
  };
});

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
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('usePosts query failed, using fallback content:', error.message);
        }
        return adminView ? [] : fallbackPosts;
      }
      
      if (!data || data.length === 0) {
        return adminView ? [] : fallbackPosts;
      }

      return (data as Post[]) ?? (adminView ? [] : fallbackPosts);
    },
    retry: 1,
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
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('usePostsByCategory supabase query error', error);
        }
        return fallbackPosts.filter((post) => post.categories?.slug === categorySlug);
      }
      return (data as Post[]) ?? fallbackPosts.filter((post) => post.categories?.slug === categorySlug);
    },
    enabled: !!categorySlug,
    retry: false,
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
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('usePost supabase query error', error);
        }
        return fallbackPosts.find((post) => post.slug === slug) ?? null;
      }
      return (data as Post | null) ?? fallbackPosts.find((post) => post.slug === slug) ?? null;
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
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('usePostById supabase query error', error);
        }
        return fallbackPosts.find((post) => post.id === id) ?? null;
      }
      return (data as Post | null) ?? fallbackPosts.find((post) => post.id === id) ?? null;
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
      
      // Posts this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = allPosts?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;
      
      return { total, drafts, totalViews, thisMonth };
    },
  });
};

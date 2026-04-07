import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Audiocast {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  audio_url: string | null;
  duration: number | null;
  transcript: string | null;
  status: string;
  published_at: string | null;
  author_id: string | null;
  category_id: string | null;
  post_id: string | null;
  tags: string[] | null;
  views: number;
  downloads: number;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
  posts?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface CreateAudiocastData {
  title: string;
  slug: string;
  description?: string;
  audio_url?: string;
  duration?: number;
  transcript?: string;
  category_id?: string;
  post_id?: string;
  tags?: string[];
  status?: string;
}

export interface UpdateAudiocastData extends Partial<CreateAudiocastData> {
  id: string;
}

// Fetch all podcasts (published for public, all for admin)
export const useAudiocasts = (adminView = false) => {
  return useQuery({
    queryKey: ['audiocasts', adminView],
    queryFn: async () => {
      let query = supabase
        .from('podcasts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          ),
          posts (
            id,
            title,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (!adminView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocasts supabase query error', error);
        }
        return [] as Audiocast[];
      }
      return (data as Audiocast[]) ?? [];
    },
    retry: false,
  });
};

// Fetch podcasts by category
export const useAudiocastsByCategory = (categorySlug: string) => {
  return useQuery({
    queryKey: ['audiocasts', 'category', categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          categories!inner (
            id,
            name,
            slug,
            color
          ),
          posts (
            id,
            title,
            slug
          )
        `)
        .eq('categories.slug', categorySlug)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastsByCategory supabase query error', error);
        }
        return [] as Audiocast[];
      }
      return (data as Audiocast[]) ?? [];
    },
    enabled: !!categorySlug,
    retry: false,
  });
};

// Fetch single podcast by slug
export const useAudiocast = (slug: string) => {
  return useQuery({
    queryKey: ['audiocast', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          ),
          posts (
            id,
            title,
            slug
          )
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocast supabase query error', error);
        }
        return null;
      }
      return data as Audiocast | null;
    },
    enabled: !!slug,
    retry: false,
  });
};

// Fetch single podcast by ID
export const useAudiocastById = (id: string) => {
  return useQuery({
    queryKey: ['audiocast', 'id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          ),
          posts (
            id,
            title,
            slug
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastById supabase query error', error);
        }
        return null;
      }
      return data as Audiocast | null;
    },
    enabled: !!id,
    retry: false,
  });
};

// Fetch podcasts by post ID (related podcasts)
export const useAudiocastsByPost = (postId: string) => {
  return useQuery({
    queryKey: ['audiocasts', 'post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            color
          )
        `)
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastsByPost supabase query error', error);
        }
        return [] as Audiocast[];
      }
      return (data as Audiocast[]) ?? [];
    },
    enabled: !!postId,
    retry: false,
  });
};

// Create podcast mutation
export const useCreateAudiocast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audiocastData: CreateAudiocastData) => {
      const { data, error } = await supabase
        .from('podcasts')
        .insert([{
          ...audiocastData,
          published_at: audiocastData.status === 'published' ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiocasts'] });
    },
  });
};

// Update podcast mutation
export const useUpdateAudiocast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...audiocastData }: UpdateAudiocastData) => {
      const { data, error } = await supabase
        .from('podcasts')
        .update({
          ...audiocastData,
          published_at: audiocastData.status === 'published' ? new Date().toISOString() : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiocasts'] });
    },
  });
};

// Delete podcast mutation
export const useDeleteAudiocast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('podcasts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiocasts'] });
    },
  });
};

type SupabaseRpc = <T = unknown>(fn: string, params?: unknown) => Promise<{ data: T | null; error: { message?: string } | null }>;

const supabaseRpc = supabase.rpc as unknown as SupabaseRpc;

// Track podcast play (increment views)
export const useTrackAudiocastPlay = () => {
  return useMutation({
    mutationFn: async (audiocastId: string) => {
      const { error } = await supabaseRpc('increment_views', {
        content_type: 'audiocast',
        content_id: audiocastId,
      });

      if (error) throw error;
    },
  });
};

// Track podcast download
export const useTrackAudiocastDownload = () => {
  return useMutation({
    mutationFn: async (audiocastId: string) => {
      const { error } = await supabaseRpc('track_podcast_download', {
        podcast_id: audiocastId,
      });

      if (error) throw error;
    },
  });
};

// Get podcast stats
export const useAudiocastStats = () => {
  return useQuery({
    queryKey: ['audiocasts', 'stats'],
    queryFn: async () => {
      const { data: allPodcasts, error: allError } = await supabase
        .from('podcasts')
        .select('id, status, views, downloads, created_at');

      if (allError) throw allError;

      const total = allPodcasts?.length || 0;
      const published = allPodcasts?.filter(p => p.status === 'published').length || 0;
      const totalViews = allPodcasts?.reduce((acc, p) => acc + (p.views || 0), 0) || 0;
      const totalDownloads = allPodcasts?.reduce((acc, p) => acc + (p.downloads || 0), 0) || 0;

      // Podcasts this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = allPodcasts?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0;

      return { total, published, totalViews, totalDownloads, thisMonth };
    },
  });
};
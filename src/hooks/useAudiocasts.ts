import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Audiocast {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  audio_url: string | null;
  cover_url: string | null;
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
  cover_url?: string;
  duration?: number;
  transcript?: string;
  category_id?: string;
  post_id?: string;
  tags?: string[];
  status?: string;
  author_id?: string;
}

export interface UpdateAudiocastData extends Partial<CreateAudiocastData> {
  id: string;
}

const PUBLIC_AUDIOCAST_SELECT = `id, title, slug, description, audio_url, cover_url, duration, status, published_at, category_id, views, downloads, created_at, categories(id, name, slug, color)`;

const FULL_AUDIOCAST_SELECT = `id, title, slug, description, audio_url, cover_url, duration, transcript, status, published_at, author_id, category_id, post_id, tags, views, downloads, created_at, updated_at, categories(id, name, slug, color), posts(id, title, slug)`;

const normalizePublicAudiocast = (podcast: Partial<Audiocast>): Audiocast => ({
  id: podcast.id || '',
  title: podcast.title || '',
  slug: podcast.slug || '',
  description: podcast.description || null,
  audio_url: podcast.audio_url || null,
  cover_url: podcast.cover_url || null,
  duration: podcast.duration || null,
  transcript: null,
  status: podcast.status || 'published',
  published_at: podcast.published_at || null,
  author_id: null,
  category_id: podcast.category_id || null,
  post_id: null,
  tags: null,
  views: podcast.views || 0,
  downloads: podcast.downloads || 0,
  created_at: podcast.created_at || new Date(0).toISOString(),
  updated_at: podcast.updated_at || podcast.created_at || new Date(0).toISOString(),
  categories: podcast.categories || null,
  posts: null,
});

// Fetch all podcasts (published for public, all for admin)
export const useAudiocasts = (adminView = false) => {
  return useQuery({
    queryKey: ['audiocasts', adminView],
    queryFn: async () => {
      let query = supabase
        .from('podcasts')
        .select(adminView ? FULL_AUDIOCAST_SELECT : PUBLIC_AUDIOCAST_SELECT)
        .order(adminView ? 'created_at' : 'published_at', { ascending: false, nullsFirst: false });

      if (!adminView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocasts supabase query error', error?.message || 'unknown');
        }
        return [] as Audiocast[];
      }
      return adminView
        ? ((data as unknown as Audiocast[]) ?? [])
        : ((data as Partial<Audiocast>[] | null)?.map((podcast) => normalizePublicAudiocast(podcast)) ?? []);
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch podcasts by category
export const useAudiocastsByCategory = (categorySlug: string) => {
  return useQuery({
    queryKey: ['audiocasts', 'category', categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select('id, title, slug, description, audio_url, cover_url, duration, status, published_at, category_id, views, downloads, created_at, categories!inner(id, name, slug, color)')
        .eq('categories.slug', categorySlug)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastsByCategory supabase query error', error?.message || 'unknown');
        }
        return [] as Audiocast[];
      }
      return (data as Partial<Audiocast>[] | null)?.map((podcast) => normalizePublicAudiocast(podcast)) ?? [];
    },
    enabled: !!categorySlug,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch single podcast by slug
export const useAudiocast = (slug: string) => {
  return useQuery({
    queryKey: ['audiocast', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(FULL_AUDIOCAST_SELECT)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocast supabase query error', error?.message || 'unknown');
        }
        return null;
      }
      return data as Audiocast | null;
    },
    enabled: !!slug,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch single podcast by ID
export const useAudiocastById = (id: string) => {
  return useQuery({
    queryKey: ['audiocast', 'id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(FULL_AUDIOCAST_SELECT)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastById supabase query error', error?.message || 'unknown');
        }
        return null;
      }
      return data as Audiocast | null;
    },
    enabled: !!id,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Fetch podcasts by post ID (related podcasts)
export const useAudiocastsByPost = (postId: string) => {
  return useQuery({
    queryKey: ['audiocasts', 'post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('podcasts')
        .select(PUBLIC_AUDIOCAST_SELECT)
        .eq('post_id', postId)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useAudiocastsByPost supabase query error', error?.message || 'unknown');
        }
        return [] as Audiocast[];
      }
      return (data as Partial<Audiocast>[] | null)?.map((podcast) => normalizePublicAudiocast(podcast)) ?? [];
    },
    enabled: !!postId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Create podcast mutation
export const useCreateAudiocast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audiocastData: CreateAudiocastData) => {
      const payload = {
        ...audiocastData,
        published_at: audiocastData.status === 'published' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('podcasts')
        .insert([payload]);

      if (error) {
        throw new Error(error.message || 'Falha ao criar audiocast.');
      }

      return payload;
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
      const payload = {
        ...audiocastData,
        published_at:
          audiocastData.status === 'published'
            ? new Date().toISOString()
            : audiocastData.status
              ? null
              : undefined,
      };

      const { error } = await supabase
        .from('podcasts')
        .update(payload)
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Falha ao atualizar audiocast.');
      }

      return { id, ...payload };
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

      if (error) {
        console.warn('[useTrackAudiocastPlay] tracking skipped during migration:', error.message || error);
        return;
      }
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

      if (error) {
        console.warn('[useTrackAudiocastDownload] tracking skipped during migration:', error.message || error);
        return;
      }
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
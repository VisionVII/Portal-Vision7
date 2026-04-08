import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/services/email';

const PRIMARY_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_PRIMARY_EMAIL ?? '';

/* ── Types ── */
export interface CuratedPost {
  id: string;
  cluster_id: string | null;
  title: string;
  subtitle: string | null;
  slug: string | null;
  excerpt: string | null;
  body_markdown: string;
  body_html: string | null;
  language: string;
  editorial_score: number;
  confidence_score: number;
  status: string;
  tone_profile: string | null;
  model_info: Record<string, unknown>;
  moderation: Record<string, unknown>;
  metrics: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['curated_posts'] as const;

/* ── Fetch curated posts ── */
export function useCuratedPosts(statusFilter?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, statusFilter ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('curated_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as CuratedPost[];
    },
    staleTime: 30_000,
  });
}

/* ── Stats ── */
export function useCuratedPostsStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_posts')
        .select('id, status, editorial_score');

      if (error) throw new Error(error.message);

      const posts = (data ?? []) as Pick<CuratedPost, 'id' | 'status' | 'editorial_score'>[];
      return {
        total: posts.length,
        ready: posts.filter((p) => p.status === 'ready').length,
        draft: posts.filter((p) => p.status === 'draft').length,
        published: posts.filter((p) => p.status === 'published').length,
        rejected: posts.filter((p) => p.status === 'rejected').length,
        avgScore: posts.length
          ? +(posts.reduce((s, p) => s + Number(p.editorial_score), 0) / posts.length).toFixed(1)
          : 0,
      };
    },
    staleTime: 30_000,
  });
}

/* ── Notify admin via email when a post is promoted ── */
async function getNotificationEmails() {
  const emails = new Map<string, string>();

  if (PRIMARY_ADMIN_EMAIL) {
    emails.set(PRIMARY_ADMIN_EMAIL.toLowerCase(), PRIMARY_ADMIN_EMAIL);
  }

  const { data: authData } = await supabase.auth.getUser();
  const currentEmail = authData.user?.email;
  if (currentEmail) {
    emails.set(currentEmail.toLowerCase(), currentEmail);
  }

  return [...emails.values()];
}

async function notifyAdminPostReady(curated: CuratedPost) {
  try {
    const adminEmails = await getNotificationEmails();
    if (!adminEmails.length) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    for (const email of adminEmails) {
      await sendEmail({
        to: email,
        template: 'automation_post_ready',
        data: {
          postTitle: curated.title,
          postExcerpt: curated.excerpt || curated.subtitle || '',
          editorialScore: Number(curated.editorial_score),
          reviewUrl: `${baseUrl}/admin`,
        },
      });
    }
  } catch (err) {
    console.warn('[CuratedPosts] Failed to send admin notification:', err);
  }
}

/* ── Promote curated post → editorial post (draft) ── */
export function usePromoteCuratedPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (curated: CuratedPost) => {
      const slug =
        curated.slug ||
        curated.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: curated.title,
            slug: `${slug}-${Date.now().toString(36)}`,
            excerpt: curated.excerpt || curated.subtitle || '',
            content: curated.body_html || curated.body_markdown,
            status: 'draft',
            featured: false,
            tags: ['automação', 'ia'],
            read_time: `${Math.max(1, Math.ceil((curated.body_markdown?.length ?? 0) / 1200))} min`,
            author_name: 'Vision7 IA',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Mark curated as published
      await supabase
        .from('curated_posts')
        .update({ status: 'published' })
        .eq('id', curated.id);

      return data;
    },
    onSuccess: (_data, curated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: 'Post promovido', description: 'O artigo foi movido para rascunhos editoriais.' });

      // Send email notification to admin (fire-and-forget)
      void notifyAdminPostReady(curated);
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao promover', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Reject curated post ── */
export function useRejectCuratedPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curated_posts')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Post rejeitado', description: 'O artigo curado foi marcado como rejeitado.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Auto-promote all 'ready' curated posts → draft posts + email ── */

/** Promotes a single curated post to the posts table as draft */
async function promoteSingleCurated(curated: CuratedPost) {
  const slug =
    curated.slug ||
    curated.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const { error } = await supabase
    .from('posts')
    .insert([
      {
        title: curated.title,
        slug: `${slug}-${Date.now().toString(36)}`,
        excerpt: curated.excerpt || curated.subtitle || '',
        content: curated.body_html || curated.body_markdown,
        status: 'draft',
        featured: false,
        tags: ['automação', 'ia'],
        read_time: `${Math.max(1, Math.ceil((curated.body_markdown?.length ?? 0) / 1200))} min`,
        author_name: 'Vision7 IA',
      },
    ]);

  if (error) throw error;

  await supabase
    .from('curated_posts')
    .update({ status: 'published' })
    .eq('id', curated.id);
}

export function useAutoPromoteCurated() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Fetch all ready curated posts
      const { data, error } = await supabase
        .from('curated_posts')
        .select('*')
        .eq('status', 'ready')
        .order('editorial_score', { ascending: false });

      if (error) throw new Error(error.message);

      const readyPosts = (data ?? []) as CuratedPost[];
      if (readyPosts.length === 0) return { promoted: 0 };

      let promoted = 0;
      for (const curated of readyPosts) {
        try {
          await promoteSingleCurated(curated);
          promoted++;
          // Email admin for each promoted post (fire-and-forget)
          void notifyAdminPostReady(curated);
        } catch (err) {
          console.warn(`[AutoPromote] Failed to promote "${curated.title}":`, err);
        }
      }

      return { promoted };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (result && result.promoted > 0) {
        toast({
          title: `${result.promoted} artigo${result.promoted > 1 ? 's' : ''} promovido${result.promoted > 1 ? 's' : ''}`,
          description: 'Artigos curados movidos para rascunhos editoriais. Admin notificado por email.',
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Erro na promoção automática', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Auto-promote polling — runs in background while pipeline is active ── */
const POLLING_STORAGE_KEY = 'pipeline:autoPromoteActive';
const POLLING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useAutoPromotePolling() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isActive, setIsActive] = useState(() => {
    try { return localStorage.getItem(POLLING_STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [totalPromoted, setTotalPromoted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist active state
  useEffect(() => {
    try { localStorage.setItem(POLLING_STORAGE_KEY, String(isActive)); } catch { /* ignore */ }
  }, [isActive]);

  const checkAndPromote = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('curated_posts')
        .select('*')
        .eq('status', 'ready')
        .order('editorial_score', { ascending: false });

      if (error) {
        console.warn('[AutoPromote] Query error:', error.message);
        return;
      }

      const readyPosts = (data ?? []) as CuratedPost[];
      setLastCheck(new Date().toISOString());

      if (readyPosts.length === 0) return;

      let promoted = 0;
      for (const curated of readyPosts) {
        try {
          await promoteSingleCurated(curated);
          promoted++;
          void notifyAdminPostReady(curated);
        } catch (err) {
          console.warn(`[AutoPromote] Failed: "${curated.title}"`, err);
        }
      }

      if (promoted > 0) {
        setTotalPromoted((prev) => prev + promoted);
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        toast({
          title: `${promoted} novo${promoted > 1 ? 's' : ''} rascunho${promoted > 1 ? 's' : ''}`,
          description: `Pipeline automática: ${promoted} artigo${promoted > 1 ? 's' : ''} promovido${promoted > 1 ? 's' : ''} para rascunhos. Notificação enviada.`,
        });
      }
    } catch (err) {
      console.warn('[AutoPromote] Unexpected error:', err);
    }
  }, [queryClient, toast]);

  // Start/stop polling
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isActive) {
      // Run immediately on activation
      void checkAndPromote();
      intervalRef.current = setInterval(() => void checkAndPromote(), POLLING_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, checkAndPromote]);

  const start = useCallback(() => {
    setIsActive(true);
    toast({
      title: 'Pipeline ativada',
      description: 'Verificação automática a cada 2 min. Posts curados serão promovidos para rascunhos com notificação.',
    });
  }, [toast]);

  const stop = useCallback(() => {
    setIsActive(false);
    toast({ title: 'Pipeline pausada', description: 'Promoção automática desativada.' });
  }, [toast]);

  return {
    isActive,
    lastCheck,
    totalPromoted,
    start,
    stop,
    checkNow: checkAndPromote,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

type PromoteCuratedPostResult = {
  promoted: boolean;
  status: 'promoted' | 'duplicate' | 'already_published';
  postId?: string;
  slug?: string;
  tags?: string[];
};

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

/* ── Notify editorial team via backend when a curated post is ready ── */
async function notifyAdminPostReady(curatedPostId: string) {
  try {
    const { error } = await supabase.functions.invoke('notify-curated-post', {
      body: { curatedPostId },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao disparar notificacao da curadoria');
    }
  } catch (err) {
    console.warn('[CuratedPosts] Failed to send admin notification:', err);
  }
}

async function promoteCuratedPost(curatedPostId: string): Promise<PromoteCuratedPostResult> {
  const { data, error } = await supabase.functions.invoke('promote-curated-post', {
    body: { curatedPostId },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao promover artigo curado');
  }

  if (!data || typeof data !== 'object' || typeof data.status !== 'string') {
    throw new Error('Resposta inválida da função de promoção');
  }

  return data as PromoteCuratedPostResult;
}

/* ── Promote curated post → editorial post (draft) ── */
export function usePromoteCuratedPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (curated: CuratedPost) => {
      return promoteCuratedPost(curated.id);
    },
    onSuccess: (result, curated) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      if (result.status === 'promoted') {
        toast({ title: 'Post promovido', description: 'O artigo foi movido para rascunhos editoriais.' });
        void notifyAdminPostReady(curated.id);
        return;
      }

      if (result.status === 'duplicate') {
        toast({
          title: 'Duplicado resolvido',
          description: 'Já existia um rascunho semelhante; o item curado foi encerrado sem duplicar.',
        });
        return;
      }

      toast({
        title: 'Já promovido',
        description: 'Este item já tinha sido promovido anteriormente.',
      });
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
      let duplicates = 0;
      let alreadyPublished = 0;
      for (const curated of readyPosts) {
        try {
          const result = await promoteCuratedPost(curated.id);
          if (result.status === 'promoted') {
            promoted++;
            console.info(`[AutoPromote] Promoted: "${curated.title}" (score: ${curated.editorial_score})`);
            void notifyAdminPostReady(curated.id);
          } else if (result.status === 'duplicate') {
            duplicates++;
            console.info(`[AutoPromote] Duplicate skipped: "${curated.title}"`);
          } else {
            alreadyPublished++;
            console.info(`[AutoPromote] Already published: "${curated.title}"`);
          }
        } catch (err) {
          console.warn(`[AutoPromote] Failed to promote "${curated.title}":`, err);
        }
      }

      return { promoted, duplicates, alreadyPublished };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      if (!result) return;

      const details: string[] = [];
      if (result.promoted > 0) details.push(`${result.promoted} em rascunho`);
      if ((result.duplicates ?? 0) > 0) details.push(`${result.duplicates} duplicado(s) encerrado(s)`);
      if ((result.alreadyPublished ?? 0) > 0) details.push(`${result.alreadyPublished} já promovido(s)`);

      if (details.length > 0) {
        toast({
          title: 'Lote de promoção concluído',
          description: details.join(' · '),
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
      let duplicates = 0;
      for (const curated of readyPosts) {
        try {
          const result = await promoteCuratedPost(curated.id);
          if (result.status === 'promoted') {
            promoted++;
            void notifyAdminPostReady(curated.id);
          } else if (result.status === 'duplicate') {
            duplicates++;
          }
        } catch (err) {
          console.warn(`[AutoPromote] Failed: "${curated.title}"`, err);
        }
      }

      if (promoted > 0 || duplicates > 0) {
        setTotalPromoted((prev) => prev + promoted);
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        toast({
          title: 'Verificação automática concluída',
          description:
            promoted > 0
              ? `${promoted} artigo${promoted > 1 ? 's' : ''} promovido${promoted > 1 ? 's' : ''} para rascunhos${duplicates > 0 ? ` · ${duplicates} duplicado(s) encerrado(s)` : ''}`
              : `${duplicates} duplicado(s) encerrado(s) sem criar rascunho novo`,
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
      description: 'Verificação automática a cada 2 min nesta sessão aberta. A promoção passa pela Edge Function central do portal.',
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

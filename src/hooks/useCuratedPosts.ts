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
  /* SEO fields (detail-only, may be undefined on list queries) */
  seo_score?: number | null;
  readability_score?: number | null;
  originality_score?: number | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  search_intent?: string | null;
  meta_description?: string | null;
  internal_links?: string[] | null;
  /* SEO fields (detail-only, may be undefined on list queries) */
  seo_score?: number | null;
  readability_score?: number | null;
  originality_score?: number | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  search_intent?: string | null;
  meta_description?: string | null;
  internal_links?: string[] | null;
}

const QUERY_KEY = ['curated_posts'] as const;

type PromoteCuratedPostResult = {
  promoted: boolean;
  status: 'promoted' | 'duplicate' | 'already_published';
  postId?: string;
  slug?: string;
  tags?: string[];
};

/* ── Column list for curated posts (excludes heavy body fields on list view) ── */
const CURATED_LIST_SELECT = 'id, cluster_id, title, subtitle, slug, excerpt, language, editorial_score, confidence_score, status, tone_profile, model_info, moderation, metrics, created_by, created_at, updated_at';

/* ── Full select including body fields (for detail/preview) ── */
const CURATED_DETAIL_SELECT = CURATED_LIST_SELECT + ', body_html, body_markdown, seo_score, readability_score, originality_score, primary_keyword, secondary_keywords, search_intent, meta_description, internal_links';

/* ── Fetch curated posts ── */
export function useCuratedPosts(statusFilter?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, statusFilter ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('curated_posts')
        .select(CURATED_LIST_SELECT)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as CuratedPost[];
    },
    staleTime: 60_000,
  });
}

/* ── Fetch single curated post detail (includes body fields) ── */
export function useCuratedPostDetail(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('curated_posts')
        .select(CURATED_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as CuratedPost | null;
    },
    enabled: !!id,
    staleTime: 120_000,
  });
}

/* ── Stats (server-side counts to minimise egress) ── */
export function useCuratedPostsStats() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'stats'],
    queryFn: async () => {
      const [totalRes, readyRes, draftRes, publishedRes, rejectedRes, scoreRes] = await Promise.all([
        supabase.from('curated_posts').select('id', { count: 'exact', head: true }),
        supabase.from('curated_posts').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
        supabase.from('curated_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('curated_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('curated_posts').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('curated_posts').select('editorial_score').limit(1000),
      ]);

      const firstError = [totalRes, readyRes, draftRes, publishedRes, rejectedRes, scoreRes]
        .map((r) => r.error).find(Boolean);
      if (firstError) throw new Error(firstError.message);

      const scores = (scoreRes.data ?? []) as { editorial_score: number }[];
      const avgScore = scores.length
        ? +(scores.reduce((s, p) => s + Number(p.editorial_score), 0) / scores.length).toFixed(1)
        : 0;

      return {
        total: totalRes.count ?? 0,
        ready: readyRes.count ?? 0,
        draft: draftRes.count ?? 0,
        published: publishedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
        avgScore,
      };
    },
    staleTime: 120_000,
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

async function promoteCuratedPost(curatedPostId: string, categoryIds?: string[]): Promise<PromoteCuratedPostResult> {
  const body: Record<string, unknown> = { curatedPostId };
  if (categoryIds?.length) body.categoryIds = categoryIds;

  const { data, error } = await supabase.functions.invoke('promote-curated-post', {
    body,
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
    mutationFn: async ({ curated, categoryIds }: { curated: CuratedPost; categoryIds?: string[] }) => {
      return promoteCuratedPost(curated.id, categoryIds);
    },
    onSuccess: (result, { curated }) => {
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
      // Fetch ready curated posts (only needed fields for promotion)
      const { data, error } = await supabase
        .from('curated_posts')
        .select('id, title, slug, editorial_score, status')
        .eq('status', 'ready')
        .order('editorial_score', { ascending: false })
        .limit(50);

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
const POLLING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
        .select('id, title, slug, editorial_score, status')
        .eq('status', 'ready')
        .order('editorial_score', { ascending: false })
        .limit(50);

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
      description: 'Verificação automática a cada 10 min nesta sessão aberta. A promoção passa pela Edge Function central do portal.',
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

/* ── Update curated post status ── */
export function useUpdateCuratedStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('curated_posts')
        .update({ status })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Status atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Update curated post content (title, body_markdown, body_html, excerpt) ── */
export function useUpdateCuratedPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<Pick<CuratedPost, 'title' | 'subtitle' | 'excerpt' | 'body_markdown' | 'body_html'>>;
    }) => {
      const { error } = await supabase
        .from('curated_posts')
        .update(fields)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'detail', vars.id] });
      toast({ title: 'Artigo atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Delete rejected curated posts ── */
export function useDeleteRejectedPosts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('curated_posts')
        .delete()
        .eq('status', 'rejected')
        .select('id');
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pipeline_diagnostics'] });
      toast({
        title: count > 0 ? `${count} rejeitado(s) apagado(s)` : 'Nenhum rejeitado para apagar',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao apagar rejeitados', description: err.message, variant: 'destructive' });
    },
  });
}

/* ── Delete a single curated post ── */
export function useDeleteCuratedPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curated_posts')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['pipeline_diagnostics'] });
      toast({ title: 'Post apagado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao apagar', description: err.message, variant: 'destructive' });
    },
  });
}

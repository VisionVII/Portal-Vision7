-- Migration: extend article_link_graph with 'generating' state + locked_at
-- Permite que o WF-03 "bloqueie" um link pendente enquanto o gera, evitando
-- que execuções paralelas criem o mesmo artigo duas vezes.

ALTER TABLE public.article_link_graph
  DROP CONSTRAINT IF EXISTS article_link_graph_status_check,
  ADD CONSTRAINT article_link_graph_status_check
    CHECK (status IN ('active', 'pending', 'broken', 'generating')),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_link_graph_pending_age
  ON public.article_link_graph (created_at ASC)
  WHERE status = 'pending';

-- Atualizar resolve_pending_links para também resolver entradas 'generating'
CREATE OR REPLACE FUNCTION public.resolve_pending_links(p_slug TEXT, p_post_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resolved_count INTEGER;
BEGIN
  UPDATE public.article_link_graph
  SET
    status         = 'active',
    target_post_id = p_post_id,
    resolved_at    = NOW()
  WHERE
    status IN ('pending', 'generating')
    AND (
      target_slug = p_slug
      OR target_slug = regexp_replace(p_slug, '-[a-z0-9]{6,}$', '')
      OR p_slug     LIKE target_slug || '%'
    );

  GET DIAGNOSTICS resolved_count = ROW_COUNT;
  RETURN resolved_count;
END;
$$;

-- Função de limpeza: entradas 'generating' com mais de 3h voltam a 'pending'
-- (execução falhada não deixa entradas bloqueadas forever)
CREATE OR REPLACE FUNCTION public.expire_stale_generating_links()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.article_link_graph
  SET status = 'pending', locked_at = NULL
  WHERE status = 'generating'
    AND locked_at < NOW() - INTERVAL '3 hours';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

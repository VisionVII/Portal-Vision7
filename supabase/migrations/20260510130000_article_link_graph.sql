-- Migration: Article Link Graph
-- Rastreia todas as referências internas entre artigos (activas e pendentes)
-- Permite resolver links automaticamente quando um artigo referenciado é publicado

CREATE TABLE IF NOT EXISTS public.article_link_graph (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Artigo de origem (o que contém o link)
  source_post_id  UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  source_curated_id UUID REFERENCES public.curated_posts(id) ON DELETE CASCADE,
  -- Artigo de destino
  target_slug     TEXT NOT NULL,
  target_post_id  UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  -- Metadados do link
  anchor_text     TEXT,
  href            TEXT NOT NULL,
  -- Estado: active (artigo destino existe), pending (ainda não existe), broken (slug removido)
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('active', 'pending', 'broken')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  CONSTRAINT uq_link UNIQUE (source_curated_id, href)
);

CREATE INDEX IF NOT EXISTS idx_link_graph_source_post    ON public.article_link_graph (source_post_id);
CREATE INDEX IF NOT EXISTS idx_link_graph_source_curated ON public.article_link_graph (source_curated_id);
CREATE INDEX IF NOT EXISTS idx_link_graph_target_slug    ON public.article_link_graph (target_slug);
CREATE INDEX IF NOT EXISTS idx_link_graph_target_post    ON public.article_link_graph (target_post_id);
CREATE INDEX IF NOT EXISTS idx_link_graph_status         ON public.article_link_graph (status);

-- RLS: admins e service_role podem ler/escrever; público só lê activos
ALTER TABLE public.article_link_graph ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active links" ON public.article_link_graph;
CREATE POLICY "Public read active links"
  ON public.article_link_graph FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins full access" ON public.article_link_graph;
CREATE POLICY "Admins full access"
  ON public.article_link_graph FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Grants para service_role (workflows n8n via REST API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_link_graph TO service_role;
GRANT SELECT ON public.article_link_graph TO anon, authenticated;

-- Função: resolver links pendentes quando um artigo é publicado
-- Chamada pelo promote-curated-post após inserção em posts
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
    status       = 'active',
    target_post_id = p_post_id,
    resolved_at  = NOW()
  WHERE
    status = 'pending'
    AND (
      target_slug = p_slug
      OR target_slug = regexp_replace(p_slug, '-[a-z0-9]{6,}$', '')
    );

  GET DIAGNOSTICS resolved_count = ROW_COUNT;
  RETURN resolved_count;
END;
$$;

COMMENT ON TABLE  public.article_link_graph IS 'Grafo de referências internas entre artigos. status=pending: artigo destino ainda não existe; active: link válido.';
COMMENT ON COLUMN public.article_link_graph.target_slug IS 'Slug do artigo destino (pode não existir ainda quando status=pending)';
COMMENT ON COLUMN public.article_link_graph.href IS 'Path completo do link (ex: /tecnologia/ia-empresas-2026)';

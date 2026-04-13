-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add is_curated tracking to news_clusters
-- Allows WF-03 to skip clusters that already have curated posts, preventing
-- the pipeline from re-processing the same top clusters indefinitely.
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.news_clusters
  ADD COLUMN IF NOT EXISTS is_curated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS curated_at  timestamptz;

COMMENT ON COLUMN public.news_clusters.is_curated IS 'True after WF-03 successfully creates a curated_post for this cluster';
COMMENT ON COLUMN public.news_clusters.curated_at  IS 'Timestamp when this cluster was first curated by WF-03';

-- Index for WF-03 fetch: confidence_score >= 60 AND is_curated = false
CREATE INDEX IF NOT EXISTS idx_news_clusters_curated_priority
  ON public.news_clusters (is_curated, priority_rank DESC NULLS LAST, confidence_score DESC)
  WHERE is_curated = false;

-- Back-fill: mark clusters that already have curated_posts as curated
UPDATE public.news_clusters nc
SET
  is_curated = true,
  curated_at = cp.created_at
FROM (
  SELECT DISTINCT ON (cluster_id) cluster_id, created_at
  FROM public.curated_posts
  WHERE cluster_id IS NOT NULL
  ORDER BY cluster_id, created_at ASC
) cp
WHERE nc.id = cp.cluster_id
  AND nc.is_curated = false;

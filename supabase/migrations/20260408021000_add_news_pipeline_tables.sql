-- News intelligence pipeline tables (staging -> cluster -> curation -> queue)

CREATE TABLE IF NOT EXISTS public.news_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  canonical_url text,
  title text NOT NULL,
  summary text,
  content text,
  language text DEFAULT 'pt',
  topic text,
  published_at timestamptz,
  collected_at timestamptz NOT NULL DEFAULT now(),
  trust_score numeric(5,2) DEFAULT 0,
  duplicate_fingerprint text,
  processed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.news_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text,
  primary_staging_id uuid REFERENCES public.news_staging(id) ON DELETE SET NULL,
  fingerprint text NOT NULL UNIQUE,
  source_count integer NOT NULL DEFAULT 1,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curated_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES public.news_clusters(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  slug text UNIQUE,
  excerpt text,
  body_markdown text NOT NULL,
  body_html text,
  language text DEFAULT 'pt',
  editorial_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  tone_profile text DEFAULT 'vision7',
  model_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curated_post_id uuid NOT NULL REFERENCES public.curated_posts(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'portal',
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.editorial_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curated_post_id uuid NOT NULL REFERENCES public.curated_posts(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL,
  notes text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_news_pipeline_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_news_staging_updated_at ON public.news_staging;
CREATE TRIGGER trg_news_staging_updated_at
BEFORE UPDATE ON public.news_staging
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

DROP TRIGGER IF EXISTS trg_news_clusters_updated_at ON public.news_clusters;
CREATE TRIGGER trg_news_clusters_updated_at
BEFORE UPDATE ON public.news_clusters
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

DROP TRIGGER IF EXISTS trg_curated_posts_updated_at ON public.curated_posts;
CREATE TRIGGER trg_curated_posts_updated_at
BEFORE UPDATE ON public.curated_posts
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

DROP TRIGGER IF EXISTS trg_posting_queue_updated_at ON public.posting_queue;
CREATE TRIGGER trg_posting_queue_updated_at
BEFORE UPDATE ON public.posting_queue
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

CREATE INDEX IF NOT EXISTS idx_news_staging_processed_collected ON public.news_staging (processed, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_staging_fingerprint ON public.news_staging (duplicate_fingerprint);
CREATE INDEX IF NOT EXISTS idx_news_clusters_topic ON public.news_clusters (topic);
CREATE INDEX IF NOT EXISTS idx_curated_posts_status_created ON public.curated_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posting_queue_status_schedule ON public.posting_queue (status, scheduled_for);

ALTER TABLE public.news_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_news_staging"
ON public.news_staging
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
);

CREATE POLICY "admin_manage_news_clusters"
ON public.news_clusters
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
);

CREATE POLICY "admin_manage_curated_posts"
ON public.curated_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
);

CREATE POLICY "admin_manage_posting_queue"
ON public.posting_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
);

CREATE POLICY "admin_manage_editorial_feedback"
ON public.editorial_feedback
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','admin','editor')
      AND ur.is_active = true
  )
);

GRANT ALL ON public.news_staging TO service_role;
GRANT ALL ON public.news_clusters TO service_role;
GRANT ALL ON public.curated_posts TO service_role;
GRANT ALL ON public.posting_queue TO service_role;
GRANT ALL ON public.editorial_feedback TO service_role;

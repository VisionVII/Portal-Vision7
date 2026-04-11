-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Storage Buckets + Pipeline Intelligence Upgrades
-- 1. Create missing "avatars" bucket + RLS policies
-- 2. Add SEO columns to curated_posts + posts
-- 3. Add trend_score + search_volume to news_staging / news_clusters
-- 4. Add reviewer role to app_role enum if missing
-- 5. Add distribution tracking table
-- 6. Add performance feedback table (learning loop)
-- 7. Sitemap tracking table
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════
-- 1. STORAGE BUCKETS — Create missing "avatars"
-- ═══════════════════════════════════════════════════

-- Ensure ALL buckets exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('podcasts', 'podcasts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audiocast-covers', 'audiocast-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars RLS policies
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload own avatar" ON storage.objects;
CREATE POLICY "Authenticated users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ═══════════════════════════════════════════════════
-- 2. TREND SCORING — news_staging + news_clusters
-- ═══════════════════════════════════════════════════

ALTER TABLE public.news_staging
ADD COLUMN IF NOT EXISTS trend_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_volume integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trend_velocity numeric(5,2) DEFAULT 0;

COMMENT ON COLUMN public.news_staging.trend_score IS 'Google Trends-like score 0-100';
COMMENT ON COLUMN public.news_staging.search_volume IS 'Estimated daily search volume for topic';
COMMENT ON COLUMN public.news_staging.trend_velocity IS 'Rate of change in trend (+/- percentage)';

ALTER TABLE public.news_clusters
ADD COLUMN IF NOT EXISTS trend_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_rank integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_volume integer DEFAULT 0;

COMMENT ON COLUMN public.news_clusters.trend_score IS 'Aggregated trend score from all cluster sources';
COMMENT ON COLUMN public.news_clusters.priority_rank IS 'Priority ranking (1=highest) based on trend + confidence';

CREATE INDEX IF NOT EXISTS idx_news_clusters_priority ON public.news_clusters (priority_rank, trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_staging_trend ON public.news_staging (trend_score DESC);

-- ═══════════════════════════════════════════════════
-- 3. SEO COLUMNS — curated_posts
-- ═══════════════════════════════════════════════════

ALTER TABLE public.curated_posts
ADD COLUMN IF NOT EXISTS seo_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS originality_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_keyword text,
ADD COLUMN IF NOT EXISTS secondary_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS search_intent text DEFAULT 'informational',
ADD COLUMN IF NOT EXISTS internal_links text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS canonical_slug text;

COMMENT ON COLUMN public.curated_posts.seo_score IS 'SEO optimization score 0-100';
COMMENT ON COLUMN public.curated_posts.readability_score IS 'Text readability score (Flesch-like) 0-100';
COMMENT ON COLUMN public.curated_posts.originality_score IS 'Content originality vs sources 0-100';
COMMENT ON COLUMN public.curated_posts.primary_keyword IS 'Primary target keyword for ranking';
COMMENT ON COLUMN public.curated_posts.search_intent IS 'Search intent: informational, navigational, transactional, commercial';

CREATE INDEX IF NOT EXISTS idx_curated_posts_seo ON public.curated_posts (seo_score DESC);

-- Add SEO columns to published posts table too
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS seo_score numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_keyword text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS search_intent text DEFAULT 'informational',
ADD COLUMN IF NOT EXISTS internal_links text[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════
-- 4. STATUS INTERMEDIÁRIOS — expand curated_posts status
-- ═══════════════════════════════════════════════════

-- Add status constraint (if not exists) that allows new intermediary statuses
-- Using advisory approach: drop old constraint, create new one
DO $$
BEGIN
  -- Drop existing constraint if any
  ALTER TABLE public.curated_posts DROP CONSTRAINT IF EXISTS curated_posts_status_check;
  -- Add new constraint with expanded statuses
  ALTER TABLE public.curated_posts ADD CONSTRAINT curated_posts_status_check
    CHECK (status IN ('draft', 'auto-draft', 'pending-review', 'human-reviewed', 'ready', 'published', 'rejected', 'archived'));
EXCEPTION WHEN OTHERS THEN
  -- If fails, status column has no constraint — that's fine
  NULL;
END $$;

-- ═══════════════════════════════════════════════════
-- 5. DISTRIBUTION TRACKING TABLE
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.post_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  curated_post_id uuid REFERENCES public.curated_posts(id) ON DELETE SET NULL,
  channel text NOT NULL,  -- 'twitter', 'linkedin', 'pinterest', 'whatsapp', 'google_discover'
  status text NOT NULL DEFAULT 'pending',  -- pending, sent, failed, scheduled
  external_id text,  -- ID from the external platform
  external_url text,  -- URL on the external platform
  scheduled_for timestamptz,
  sent_at timestamptz,
  engagement jsonb DEFAULT '{}'::jsonb,  -- likes, shares, clicks, impressions
  error_detail text,
  attempts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_distributions"
ON public.post_distributions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'editor')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
);

CREATE INDEX IF NOT EXISTS idx_distributions_post_channel ON public.post_distributions (post_id, channel);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON public.post_distributions (status, scheduled_for);

DROP TRIGGER IF EXISTS trg_distributions_updated_at ON public.post_distributions;
CREATE TRIGGER trg_distributions_updated_at
BEFORE UPDATE ON public.post_distributions
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

-- ═══════════════════════════════════════════════════
-- 6. PERFORMANCE FEEDBACK TABLE (Learning Loop)
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.post_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  curated_post_id uuid REFERENCES public.curated_posts(id) ON DELETE SET NULL,
  -- Traffic metrics
  page_views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  avg_time_on_page numeric(8,2) DEFAULT 0,  -- seconds
  bounce_rate numeric(5,2) DEFAULT 0,  -- percentage
  -- SEO metrics
  google_indexed boolean DEFAULT false,
  indexed_at timestamptz,
  time_to_index_hours numeric(8,2),
  organic_impressions integer DEFAULT 0,
  organic_clicks integer DEFAULT 0,
  ctr numeric(5,2) DEFAULT 0,  -- click-through rate %
  avg_position numeric(5,1) DEFAULT 0,  -- Google Search average position
  -- Social metrics
  social_shares integer DEFAULT 0,
  social_clicks integer DEFAULT 0,
  -- Engagement
  comments_count integer DEFAULT 0,
  -- Computed
  performance_score numeric(5,2) DEFAULT 0,  -- composite score 0-100
  -- Learning
  topic text,
  primary_keyword text,
  editorial_score numeric(5,2),
  tone_profile text,
  model_info jsonb DEFAULT '{}'::jsonb,
  -- Metadata
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_performance"
ON public.post_performance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'editor', 'analyst')
      AND ur.is_active = true
  )
);

CREATE POLICY "admin_manage_performance"
ON public.post_performance FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
);

-- Service role can always insert (for automated pipeline)
CREATE POLICY "service_insert_performance"
ON public.post_performance FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_performance_post ON public.post_performance (post_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_score ON public.post_performance (performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_performance_topic ON public.post_performance (topic, performance_score DESC);

DROP TRIGGER IF EXISTS trg_performance_updated_at ON public.post_performance;
CREATE TRIGGER trg_performance_updated_at
BEFORE UPDATE ON public.post_performance
FOR EACH ROW EXECUTE FUNCTION public.set_news_pipeline_updated_at();

-- ═══════════════════════════════════════════════════
-- 7. PIPELINE HEALTH / ALERTS TABLE
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pipeline_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,  -- 'pipeline_stalled', 'low_volume', 'unpublished_clusters', 'high_error_rate', 'indexing_slow'
  severity text NOT NULL DEFAULT 'warning',  -- 'info', 'warning', 'critical'
  title text NOT NULL,
  detail text,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_alerts"
ON public.pipeline_alerts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
);

CREATE POLICY "editor_read_alerts"
ON public.pipeline_alerts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'editor', 'analyst')
      AND ur.is_active = true
  )
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON public.pipeline_alerts (resolved, created_at DESC);

-- ═══════════════════════════════════════════════════
-- 8. SITEMAP TRACKING
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sitemap_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL UNIQUE,
  last_modified timestamptz NOT NULL DEFAULT now(),
  changefreq text DEFAULT 'weekly',
  priority numeric(2,1) DEFAULT 0.7,
  indexed boolean DEFAULT false,
  indexed_at timestamptz,
  submitted_to_gsc boolean DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sitemap_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_sitemap"
ON public.sitemap_entries FOR SELECT
USING (true);

CREATE POLICY "admin_manage_sitemap"
ON public.sitemap_entries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  )
);

-- ═══════════════════════════════════════════════════
-- 9. ADD "reviewer" ROLE IF NOT EXISTS
-- ═══════════════════════════════════════════════════

-- Insert reviewer role into app_role enum safely
DO $$
BEGIN
  -- Check if 'reviewer' is already in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'reviewer'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- app_role type may not exist or reviewer already in it
  NULL;
END $$;

-- Add reviewer permissions
INSERT INTO public.role_permissions (role, resource, actions)
VALUES
  ('reviewer', 'posts', '["read", "update"]'),
  ('reviewer', 'comments', '["read", "moderate"]'),
  ('reviewer', 'dashboard', '["view_reviewer"]')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 10. DONE
-- ═══════════════════════════════════════════════════

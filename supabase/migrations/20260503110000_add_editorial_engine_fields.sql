-- Migration: Add Editorial Engine fields to posts table
-- Extends posts table with SEO/AEO metadata, quality scoring, and workflow tracking

-- Add new columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS editorial_template TEXT,
ADD COLUMN IF NOT EXISTS cover_image_prompt TEXT,
ADD COLUMN IF NOT EXISTS cover_image_accent TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS editorial_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS workflow_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for new search/filter capabilities
CREATE INDEX IF NOT EXISTS idx_posts_meta_description ON public.posts USING gin (meta_description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_quality_score ON public.posts (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_editorial_template ON public.posts (editorial_template);
CREATE INDEX IF NOT EXISTS idx_posts_seo_keywords ON public.posts USING gin (seo_keywords);
CREATE INDEX IF NOT EXISTS idx_posts_word_count ON public.posts (word_count DESC);

-- Create or update RLS policies for posts to include new fields in admin operations
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts"
    ON public.posts FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add comment documenting the new fields
COMMENT ON COLUMN public.posts.meta_description IS 'SEO meta description (145–155 chars)';
COMMENT ON COLUMN public.posts.seo_keywords IS 'JSON: {primary_keyword, secondary_keywords[], lsi_keywords[], long_tail_keywords[], entities[]}';
COMMENT ON COLUMN public.posts.editorial_template IS 'Template used: noticia-padrao, analise-executiva, guia-pratico';
COMMENT ON COLUMN public.posts.cover_image_prompt IS 'Prompt for dark cinematic cover image generation';
COMMENT ON COLUMN public.posts.cover_image_accent IS 'Hex color for category (e.g., #00d4ff for tech)';
COMMENT ON COLUMN public.posts.quality_score IS 'Score 0–10 for editorial quality validation';
COMMENT ON COLUMN public.posts.quality_details IS 'JSON breakdown of quality scoring per category';
COMMENT ON COLUMN public.posts.seo_metadata IS 'Extended SEO metadata for analytics';
COMMENT ON COLUMN public.posts.editorial_metadata IS 'Editorial analysis data (tone profile, entities, etc.)';
COMMENT ON COLUMN public.posts.workflow_metadata IS 'Workflow tracking: wf_id, generation_model, timestamps';

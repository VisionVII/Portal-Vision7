-- ============================================================================
-- Multi-category support: junction table post_categories
-- Keeps existing category_id FK on posts for backwards compatibility
-- ============================================================================

-- Junction table: posts can belong to multiple categories
CREATE TABLE IF NOT EXISTS public.post_categories (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, category_id)
);

-- Index for efficient lookups by category
CREATE INDEX IF NOT EXISTS idx_post_categories_category
  ON public.post_categories (category_id);

-- RLS
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "post_categories_public_read"
  ON public.post_categories FOR SELECT
  USING (true);

-- Admins/editors can manage
CREATE POLICY "post_categories_admin_write"
  ON public.post_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
    )
  );

-- Migrate existing category_id relations into junction table
INSERT INTO public.post_categories (post_id, category_id)
SELECT id, category_id FROM public.posts
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

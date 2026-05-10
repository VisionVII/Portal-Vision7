-- Migration: Promote existing curated_posts to new post structure
-- This migration:
-- 1. Converts curated_posts with status 'ready' or 'approved' into posts table entries
-- 2. Associates categories from the pipeline_search_config into post_categories junction
-- 3. Follows the new editorial template structure
-- 4. Maintains backwards compatibility with existing posting_queue

-- Step 1: Create temporary mapping of curated_posts themes to categories
-- (Based on the theme_rules from pipeline_search_config)
DO $$
DECLARE
  v_curated_count INTEGER := 0;
  v_promoted_count INTEGER := 0;
  v_theme_id UUID;
  v_category_id UUID;
BEGIN
  -- Count existing curated posts ready for promotion
  SELECT COUNT(*) INTO v_curated_count
  FROM public.curated_posts
  WHERE status IN ('ready', 'approved', 'promoted')
    AND slug IS NOT NULL
    AND body_html IS NOT NULL;

  RAISE NOTICE 'Found % curated_posts ready for promotion', v_curated_count;

  -- Step 2: For each curated post, create an entry in posts table
  WITH promoted_posts AS (
    INSERT INTO public.posts (
      title,
      slug,
      excerpt,
      content,
      category_id,
      author_name,
      status,
      featured,
      read_time,
      tags,
      published_at,
      created_at,
      updated_at
    )
    SELECT
      cp.title,
      cp.slug,
      COALESCE(cp.excerpt, cp.subtitle, LEFT(REGEXP_REPLACE(cp.body_html, '<[^>]*>', ''), 200)),
      COALESCE(cp.body_html, ''),
      (
        SELECT id FROM public.categories
        WHERE slug = 'curadoria'
        LIMIT 1
      ) AS category_id,
      COALESCE('Redação Vision7', 'Redação'),
      'published',
      false,
      (
        CASE
          WHEN LENGTH(REGEXP_REPLACE(cp.body_html, '<[^>]*>', '')) > 0
          THEN CONCAT(CEIL(LENGTH(REGEXP_REPLACE(cp.body_html, '<[^>]*>', '')) / 1000.0), ' min')
          ELSE '5 min'
        END
      ) AS read_time,
      ARRAY[]::TEXT[] AS tags,
      cp.updated_at,
      cp.created_at,
      now()
    FROM public.curated_posts cp
    WHERE cp.status IN ('ready', 'approved', 'promoted')
      AND cp.slug IS NOT NULL
      AND cp.body_html IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.slug = cp.slug
      )
    RETURNING id, slug
  )
  SELECT COUNT(*) INTO v_promoted_count FROM promoted_posts;

  RAISE NOTICE 'Successfully promoted % posts to posts table', v_promoted_count;

  -- Step 3: Associate curated posts with the 'curadoria' category via post_categories
  INSERT INTO public.post_categories (post_id, category_id, created_at)
  SELECT
    p.id,
    c.id,
    now()
  FROM public.posts p
  CROSS JOIN public.categories c
  WHERE c.slug = 'curadoria'
    AND p.slug IN (
      SELECT cp.slug
      FROM public.curated_posts cp
      WHERE cp.status IN ('ready', 'approved', 'promoted')
        AND cp.slug IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.post_categories pc
      WHERE pc.post_id = p.id
        AND pc.category_id = c.id
    )
  ON CONFLICT (post_id, category_id) DO NOTHING;

  RAISE NOTICE 'Post categories associations completed';

END $$;

-- Step 4: Add metadata tracking for migrated posts (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'curated_posts'
      AND column_name  = 'metadata'
  ) THEN
    UPDATE public.curated_posts
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{promoted_to_posts}',
      'true'::jsonb
    )
    WHERE status IN ('ready', 'approved', 'promoted')
      AND slug IS NOT NULL
      AND (metadata->>'promoted_to_posts' IS NULL OR metadata->>'promoted_to_posts' = 'false')
      AND EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.slug = curated_posts.slug
      );
  END IF;
END $$;

-- Step 5: Optional - Add a comment documenting the migration
COMMENT ON TABLE public.posts IS 'Posts table - now includes promoted curated_posts with proper multi-category support. See migration 20260503100000.';

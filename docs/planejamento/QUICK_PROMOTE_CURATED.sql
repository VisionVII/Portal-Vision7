-- Quick Setup: Execute this in Supabase SQL Editor to promote curated posts

-- First, verify how many posts will be promoted
SELECT 
  COUNT(*) as total_curated,
  COUNT(CASE WHEN slug IS NOT NULL THEN 1 END) as with_slug,
  COUNT(CASE WHEN body_html IS NOT NULL THEN 1 END) as with_content,
  COUNT(CASE WHEN status IN ('ready', 'approved', 'promoted') THEN 1 END) as ready_for_promotion
FROM public.curated_posts;

-- Then run the migration:
-- Copy and paste the entire content from:
-- supabase/migrations/20260503100000_promote_curated_posts_new_structure.sql

-- Finally, verify the results:
SELECT 
  COUNT(*) as new_posts_created,
  MAX(created_at) as latest_promotion
FROM posts
WHERE slug IN (
  SELECT slug FROM curated_posts
  WHERE metadata->>'promoted_to_posts' = 'true'
);

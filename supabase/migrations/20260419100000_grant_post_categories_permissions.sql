-- Fix: grant table-level permissions on post_categories
-- The table was created via migration but missing GRANT statements,
-- causing "permission denied for table post_categories" errors.

GRANT SELECT ON public.post_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_categories TO authenticated;
GRANT ALL ON public.post_categories TO service_role;

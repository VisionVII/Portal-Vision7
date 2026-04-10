-- ============================================================
-- Remove temporary / out-of-scope categories from the portal.
-- These categories should no longer appear in the editorial dashboard.
-- ============================================================

DELETE FROM public.categories
WHERE slug IN ('dsf', 'guerra');

-- Security hardening: set explicit search_path on functions the linter flagged
-- as function_search_path_mutable. Metadata-only change (ALTER FUNCTION ... SET),
-- no function body is touched, so behaviour is unchanged for all legitimate callers.
--
-- Rollback: ALTER FUNCTION <sig> RESET search_path; for each function below.

ALTER FUNCTION public.check_rate_limit(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_rate_limits() SET search_path = public, pg_temp;
ALTER FUNCTION public.cmp_domains_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.expire_stale_generating_links() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_automations_v2_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_ai_interaction(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_pending_links(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_news_pipeline_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_n8n_credentials_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ai_prefs_timestamp() SET search_path = public, pg_temp;

-- n8n schema: treated separately per project policy (n8n manages its own schema
-- internally). This is a metadata-only ALTER, not a function body replacement,
-- so it will not be reverted by n8n's own migrations/upgrades unless n8n itself
-- recreates the function from scratch.
ALTER FUNCTION n8n.increment_workflow_version() SET search_path = n8n, pg_temp;

-- Follow-up to the visual Advisor re-check: the anon_security_definer_
-- function_executable finding still listed 9 functions after migrations
-- 20260810120000-120900. Four of them have zero callers anywhere in this
-- codebase (confirmed via grep across src/ and supabase/functions/) and one
-- (resolve_pending_links) is only ever called through the service_role
-- client in supabase/functions/promote-curated-post/index.ts. None of them
-- need PUBLIC/anon EXECUTE.
--
-- resolve_pending_links / check_rate_limit / cleanup_rate_limits /
-- expire_stale_generating_links: maintenance/rate-limiting utilities meant
-- to be invoked server-side (service_role, or a future cron job), not
-- called directly by end users via RPC.
--
-- log_action: general-purpose audit-log helper, currently unused. Left
-- callable by `authenticated` (not `anon`) in case a future authenticated-
-- only feature self-logs an action — the function only ever inserts a row
-- with auth.uid() as the actor, so authenticated access carries no
-- escalation risk.
--
-- has_role, increment_views, increment_ai_interaction, track_podcast_
-- download are intentionally left untouched: has_role is load-bearing for
-- public RLS, and the other three are genuinely meant to be called by
-- anonymous visitors (view counters, AI assistant interaction tracking,
-- podcast download counters).
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.resolve_pending_links(text, uuid) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.expire_stale_generating_links() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb, jsonb, text, text) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.resolve_pending_links(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_pending_links(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_pending_links(text, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

REVOKE EXECUTE ON FUNCTION public.expire_stale_generating_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_generating_links() TO service_role;

REVOKE EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb, jsonb, text, text) TO authenticated;

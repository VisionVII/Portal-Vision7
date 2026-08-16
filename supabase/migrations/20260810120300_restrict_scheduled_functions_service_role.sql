-- cleanup_expired_roles_on_schedule() and deactivate_expired_roles() are
-- maintenance operations meant to be triggered by a scheduler (pg_cron / n8n)
-- using the service_role key, not by end users. Confirmed no pg_cron job and
-- no frontend/edge-function caller exists today, so this is pure least-
-- privilege tightening with zero functional impact right now, and the
-- intended future caller (service_role) keeps working.
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.cleanup_expired_roles_on_schedule() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.deactivate_expired_roles() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_roles_on_schedule() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_roles_on_schedule() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_roles_on_schedule() TO service_role;

REVOKE EXECUTE ON FUNCTION public.deactivate_expired_roles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deactivate_expired_roles() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_roles() TO service_role;

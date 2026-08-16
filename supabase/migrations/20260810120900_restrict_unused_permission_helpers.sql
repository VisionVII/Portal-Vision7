-- Phase-2 follow-up audit: has_any_role(), has_all_roles() and has_permission()
-- had EXECUTE granted to PUBLIC (=> anon), same as has_role(). Unlike
-- has_role(), which is load-bearing for 47 RLS policies across public-read
-- tables (posts, podcasts, courses, ...), these three are NOT referenced by
-- any RLS policy, any other function, or any frontend/edge-function call
-- site (confirmed via pg_policies scan, pg_proc source scan, and grep across
-- src/ and supabase/functions/). They are unused, but remained callable by
-- anonymous users, who could pass an arbitrary _user_id to probe another
-- user's role/permission membership (minor information disclosure).
--
-- No SQL-injection concern in any of the three (LANGUAGE sql, typed
-- parameters throughout, no dynamic SQL) — this is a pure least-privilege
-- tightening, not a correctness fix.
--
-- has_role() is intentionally left untouched: it must stay executable by
-- anon for public RLS to keep working.
--
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.has_all_roles(uuid, app_role[]) TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_all_roles(uuid, app_role[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_all_roles(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated;

-- Defense-in-depth cleanup, on top of the internal authorization checks
-- added in 20260810120100 and 20260810120200: every SECURITY DEFINER
-- function below still had an implicit/explicit EXECUTE grant to PUBLIC
-- (i.e. anon + authenticated), left over from Postgres's default of
-- granting EXECUTE to PUBLIC unless explicitly revoked. The functions are
-- now safe to call even with PUBLIC access (they check the caller's role
-- internally), but per least-privilege they should not be reachable by
-- `anon` at all — none of them have a legitimate anonymous use case.
--
-- has_role/has_any_role/has_all_roles/has_permission are intentionally left
-- untouched: they are referenced by 47 RLS policies across the schema
-- (including public-read tables like posts/podcasts/courses), so anon and
-- authenticated must keep EXECUTE on them or public browsing breaks.
--
-- Trigger functions (audit_*_fn, handle_new_user_*) never need an EXECUTE
-- grant at all: the trigger mechanism invokes them without an ACL check on
-- the invoking role, so revoking PUBLIC from them is a pure no-op safety
-- cleanup.
--
-- push_subscriptions: table-level UPDATE/DELETE grants to `authenticated`
-- had no matching RLS policy (only INSERT and an admin-gated SELECT exist),
-- so those operations were already unreachable via RLS. Revoking the grant
-- just makes the ACL match reality.
--
-- Rollback: GRANT EXECUTE ON FUNCTION <sig> TO PUBLIC; for each function
-- below, and GRANT UPDATE, DELETE ON public.push_subscriptions TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_role_with_audit(uuid, app_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_roles_to_users(uuid[], app_role[], text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_role_with_audit(uuid, app_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, app_role, app_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deactivate_team_member(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reactivate_team_member(uuid, app_role, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_team_members() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_effective_permissions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_active_roles(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_permission_access_logs(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_assignment_stats(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_permissions_integrity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_role_with_audit(uuid, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_roles_to_users(uuid[], app_role[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role_with_audit(uuid, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, app_role, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_team_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_team_member(uuid, app_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permission_access_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_assignment_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_permissions_integrity() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.audit_invite_changes_fn() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_post_changes_fn() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_user_role_changes_fn() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_from_invite() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;

REVOKE UPDATE, DELETE ON public.push_subscriptions FROM authenticated;

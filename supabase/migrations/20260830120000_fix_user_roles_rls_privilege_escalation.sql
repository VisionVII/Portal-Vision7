-- CRITICAL: "Only admins can manage roles" was a single FOR ALL policy
-- (SELECT + INSERT + UPDATE + DELETE) gated only to has_role(auth.uid(),
-- 'admin'). Because Postgres treats FOR ALL as one policy applying to every
-- command, this let ANY authenticated user holding a plain 'admin' role
-- write directly to user_roles via PostgREST — completely bypassing every
-- properly-gated RPC (change_user_role, deactivate_team_member,
-- reactivate_team_member, assign_role_with_audit, revoke_role_with_audit)
-- and the invite edge-function checks fixed alongside this migration.
--
-- Concretely, any admin's own session could do:
--   POST /rest/v1/user_roles  {"user_id": "<self-or-anyone>", "role": "super_admin", "is_active": true}
-- and the RLS check would pass, since it only ever looked at the caller's
-- current role, never at the row being written.
--
-- Fix: every legitimate write to user_roles already bypasses RLS through one
-- of two mechanisms, so removing authenticated's write access costs nothing:
--   (a) SECURITY DEFINER functions (confirmed via grep across all
--       migrations — change_user_role, deactivate_team_member,
--       reactivate_team_member, assign_role_with_audit,
--       revoke_role_with_audit, assign_roles_to_users, bootstrap_first_admin,
--       handle_new_user_admin_role, handle_new_user_from_invite,
--       deactivate_expired_roles);
--   (b) the activate-invite and assign-invite-role Edge Functions, which
--       write via a service-role client (BYPASSRLS), not a DEFINER function.
-- Confirmed via grep across src/ that no frontend code performs a direct
-- INSERT/UPDATE/DELETE against user_roles either (only SELECT, for a user's
-- own roles or an admin's team-list view).
--
-- So the correct fix is to drop write access for the authenticated role
-- entirely — every legitimate write already goes through a SECURITY
-- DEFINER RPC (which is also where the audit trail is written) — and keep
-- only the SELECT policies that already existed.

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policy is (re)created for the authenticated role
-- on purpose: with RLS enabled and no permissive policy for those commands,
-- Postgres denies them outright, forcing every write through the audited
-- SECURITY DEFINER RPCs above.

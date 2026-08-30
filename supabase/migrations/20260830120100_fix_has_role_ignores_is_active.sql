-- CRITICAL, found while fixing the sibling migration in this same batch
-- (20260830120000_fix_user_roles_rls_privilege_escalation.sql): has_role()
-- never checked is_active. It is the authorization gate behind dozens of RLS
-- policies and every "super_admin only" RPC (change_user_role,
-- deactivate_team_member, reactivate_team_member, assign_role_with_audit,
-- revoke_role_with_audit, and this table's own RLS). That means
-- "Desativar membro" in Acessos never actually revoked backend access: a
-- deactivated admin's user_roles row still satisfies has_role(uid,'admin'),
-- so any authenticated request they make with their still-valid session
-- (direct PostgREST calls, RPC calls) keeps being authorized — only the
-- frontend's own dashboard gate (AuthContext.tsx, which does filter
-- is_active) stops them from seeing the admin UI, not the backend itself.
--
-- Fix: has_role() now also requires is_active = true (defaulting a null
-- is_active to true, matching the column's own DEFAULT true, so pre-existing
-- rows are unaffected). This is the single choke point for the check, so it
-- correctly propagates to every policy/RPC that calls it — no other file
-- needs to change.

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND COALESCE(is_active, true) = true
  )
$$;

-- CRITICAL: assign_role_with_audit() and revoke_role_with_audit() had NO
-- authorization check. Both are SECURITY DEFINER, so they bypass the RLS
-- policy on user_roles ("Only admins can manage roles"). Any authenticated
-- user (even the lowest-privilege one) could call them via
-- /rest/v1/rpc/assign_role_with_audit and grant themselves super_admin, or
-- call revoke_role_with_audit to strip roles from any other user.
--
-- Confirmed via grep across src/ and supabase/functions/: neither function
-- is called anywhere in this codebase's frontend or edge functions. They are
-- dead/legacy RPCs, superseded by assign_roles_to_users() and
-- change_user_role(), which already have the correct super_admin gate. This
-- fix brings them in line with their sibling functions instead of removing
-- them (removing a publicly-documented RPC signature is a bigger, separate
-- decision than fixing its authorization).
--
-- Rollback: re-run the previous CREATE OR REPLACE without the added IF block
-- (see supabase/migrations/20260323085000_user_role_assignments.sql for the
-- original body).

CREATE OR REPLACE FUNCTION public.assign_role_with_audit(_user_id uuid, _role app_role, _reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can assign roles';
  END IF;

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT DO NOTHING;

  -- Log to audit
  INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
  VALUES (_user_id, _role, 'ASSIGN', auth.uid(), _reason);

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_role_with_audit(_user_id uuid, _role app_role, _reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can revoke roles';
  END IF;

  -- Delete from user_roles
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;

  -- Log to audit
  INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
  VALUES (_user_id, _role, 'REVOKE', auth.uid(), _reason);

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;

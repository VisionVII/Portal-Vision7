-- Fixes IDOR / information-disclosure: these SECURITY DEFINER functions
-- accepted an arbitrary _user_id (or, for the stats/log ones, no scoping at
-- all) with no check that the caller was either that same user or an admin.
-- Any authenticated user could read any other user's effective permissions,
-- active roles, or the system-wide audit/role-assignment statistics.
--
-- Confirmed via grep: none of these six functions are called anywhere in
-- src/ or supabase/functions/, so adding the gate carries no functional
-- regression risk today. Self-access is still allowed (a user reading their
-- own permissions/roles is legitimate and matches how has_permission()/
-- has_role() are used elsewhere).
--
-- get_user_permissions, get_user_active_roles, get_permission_access_logs and
-- get_role_assignment_stats were LANGUAGE sql (no procedural control flow
-- available), so they are converted to LANGUAGE plpgsql to allow the
-- authorization IF. Signature, return type and STABLE marking are unchanged.
--
-- Rollback: re-run the previous CREATE OR REPLACE bodies (see
-- supabase/migrations/20260323090000_permissions_features.sql and
-- 20260323091000_permissions_validation.sql for the originals).

CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_perms JSONB;
  override_perms JSONB;
BEGIN
  IF _user_id <> auth.uid() AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT jsonb_object_agg(
    pm.role::TEXT,
    pm.permissions
  ) INTO role_perms
  FROM public.user_roles ur
  JOIN public.permissions_matrix pm ON pm.role = ur.role
  WHERE ur.user_id = _user_id;

  SELECT jsonb_object_agg(
    feature || ':' || action,
    granted
  ) INTO override_perms
  FROM public.permission_overrides
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'role_permissions', role_perms,
    'overrides', override_perms
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id <> auth.uid() AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN COALESCE(
    (SELECT jsonb_object_agg(pm.role::TEXT, pm.permissions)
     FROM public.user_roles ur
     JOIN public.permissions_matrix pm ON pm.role = ur.role
     WHERE ur.user_id = _user_id),
    '{}'::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_active_roles(_user_id uuid)
 RETURNS TABLE(role app_role, assigned_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id <> auth.uid() AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT ur.role, ur.assigned_at, ur.expires_at
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY ur.assigned_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_permission_access_logs(_days integer DEFAULT 7)
 RETURNS TABLE(action text, feature text, user_count bigint, success_count bigint, failure_count bigint, date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    'permission_check'::text AS action,
    'various'::text AS feature,
    COUNT(DISTINCT al.user_id)::BIGINT AS user_count,
    0::BIGINT AS success_count,
    0::BIGINT AS failure_count,
    DATE(al.created_at) AS date
  FROM public.audit_logs al
  WHERE al.created_at >= now() - (_days || ' days')::INTERVAL
    AND al.action LIKE 'permission_%'
  GROUP BY DATE(al.created_at)
  ORDER BY date DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_role_assignment_stats(_days integer DEFAULT 30)
 RETURNS TABLE(role app_role, total_assignments bigint, new_assignments bigint, revoked_assignments bigint, active_users bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    pm.role,
    COUNT(DISTINCT ur.user_id)::BIGINT AS total_assignments,
    COUNT(DISTINCT CASE
      WHEN raa.action = 'ASSIGN'
        AND raa.created_at >= now() - (_days || ' days')::INTERVAL
      THEN raa.user_id
    END)::BIGINT AS new_assignments,
    COUNT(DISTINCT CASE
      WHEN raa.action = 'REVOKE'
        AND raa.created_at >= now() - (_days || ' days')::INTERVAL
      THEN raa.user_id
    END)::BIGINT AS revoked_assignments,
    COUNT(DISTINCT CASE
      WHEN ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
      THEN ur.user_id
    END)::BIGINT AS active_users
  FROM public.permissions_matrix pm
  LEFT JOIN public.user_roles ur ON pm.role = ur.role
  LEFT JOIN public.role_assignments_audit raa ON ur.user_id = raa.user_id
    AND pm.role = raa.role
  GROUP BY pm.role
  ORDER BY active_users DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_permissions_integrity()
 RETURNS TABLE(check_name text, status text, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT COUNT(*) INTO _count
  FROM (
    SELECT unnest(enum_range(NULL::public.app_role))
  ) t(role)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions_matrix
    WHERE role = t.role
  );

  RETURN QUERY SELECT
    'Permissions Matrix Coverage'::TEXT,
    CASE WHEN _count = 0 THEN 'OK' ELSE 'FAILED' END,
    CASE WHEN _count = 0 THEN 'All roles have permission entries'
         ELSE 'Missing ' || _count::TEXT || ' role entries' END;

  SELECT COUNT(*) INTO _count
  FROM (
    SELECT user_id, role, COUNT(*) as cnt
    FROM public.user_roles
    WHERE is_active = true
    GROUP BY user_id, role
    HAVING COUNT(*) > 1
  ) t;

  RETURN QUERY SELECT
    'Duplicate Role Check'::TEXT,
    CASE WHEN _count = 0 THEN 'OK' ELSE 'FAILED' END,
    CASE WHEN _count = 0 THEN 'No duplicate active roles'
         ELSE 'Found ' || _count::TEXT || ' duplicate roles' END;

  SELECT COUNT(*) INTO _count
  FROM public.permission_groups pg
  WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions_matrix pm
    WHERE pm.permissions @> pg.permissions
  );

  RETURN QUERY SELECT
    'Permission Groups References'::TEXT,
    CASE WHEN _count = 0 THEN 'WARNING' ELSE 'OK' END,
    'Found ' || _count::TEXT || ' potentially unused permission groups';
END;
$function$;

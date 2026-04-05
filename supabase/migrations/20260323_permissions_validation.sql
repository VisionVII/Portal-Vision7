-- ============================================================
-- MIGRATION 6/6: Permissions Validation & Monitoring
-- Date: 2026-03-23 (corrigido 2026-04-05)
-- Depende de: audit_logs, expand_roles, permissions_features,
--             user_role_assignments
-- ============================================================

-- Step 1: Create validation functions

-- Function to validate permission structure
CREATE OR REPLACE FUNCTION public.validate_permission_structure(_permissions JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _feature TEXT;
  _actions JSONB;
BEGIN
  FOR _feature, _actions IN SELECT * FROM jsonb_each(_permissions)
  LOOP
    -- Check if actions is an array
    IF jsonb_typeof(_actions) != 'array' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Function to validate role hierarchy (prevent cycles)
CREATE OR REPLACE FUNCTION public.validate_no_role_cycles()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _exists BOOLEAN;
BEGIN
  -- Check if adding this relationship would create a cycle
  WITH RECURSIVE role_chain AS (
    SELECT parent_role, child_role FROM public.role_hierarchy
    WHERE parent_role = NEW.child_role
    
    UNION ALL
    
    SELECT rh.parent_role, rh.child_role
    FROM public.role_hierarchy rh
    JOIN role_chain rc ON rh.parent_role = rc.child_role
    WHERE rh.parent_role != NEW.parent_role
  )
  SELECT EXISTS(
    SELECT 1 FROM role_chain WHERE child_role = NEW.parent_role
  ) INTO _exists;

  IF _exists THEN
    RAISE EXCEPTION 'Adding this role hierarchy would create a cycle';
  END IF;

  RETURN NEW;
END;
$$;

-- Function to validate override expiration
CREATE OR REPLACE FUNCTION public.validate_override_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() THEN
    RAISE EXCEPTION 'Override expiration date must be in the future';
  END IF;

  RETURN NEW;
END;
$$;

-- Step 2: Add constraints to permissions_matrix
ALTER TABLE public.permissions_matrix DROP CONSTRAINT IF EXISTS valid_permissions_structure;
ALTER TABLE public.permissions_matrix
ADD CONSTRAINT valid_permissions_structure
CHECK (public.validate_permission_structure(permissions));

-- Create trigger for permissions_matrix updates
CREATE TRIGGER permissions_matrix_updated_at
  BEFORE UPDATE ON public.permissions_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 3: Add constraints and triggers to role_hierarchy

CREATE TRIGGER role_hierarchy_validate_no_cycles
  BEFORE INSERT OR UPDATE ON public.role_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_no_role_cycles();

-- Step 4: Add constraints and triggers to permission_overrides

CREATE TRIGGER permission_overrides_validate_expiration
  BEFORE INSERT OR UPDATE ON public.permission_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_override_expiration();

-- Step 5: Create validation view for role consistency
CREATE OR REPLACE VIEW public.role_consistency_report
WITH (security_invoker = true) AS
SELECT 
  pm.role,
  pm.description,
  jsonb_object_keys(pm.permissions) as feature,
  COUNT(ur.user_id) as assigned_users,
  COUNT(CASE WHEN ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now()) THEN 1 END) as active_users,
  MAX(ur.assigned_at) as last_assigned,
  pm.updated_at as last_updated
FROM public.permissions_matrix pm
LEFT JOIN public.user_roles ur ON pm.role = ur.role
GROUP BY pm.role, pm.description, pm.permissions, pm.updated_at;

-- Grant access to the view
GRANT SELECT ON public.role_consistency_report TO authenticated;

-- Step 6: Create data validation view
CREATE OR REPLACE VIEW public.permission_data_quality
WITH (security_invoker = true) AS
SELECT 
  'Missing descriptions' as issue_type,
  COUNT(*) as count
FROM public.permissions_matrix
WHERE description IS NULL OR TRIM(description) = ''

UNION ALL

SELECT 
  'Unused permission groups' as issue_type,
  COUNT(*) as count
FROM public.permission_groups pg
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions_matrix pm
  WHERE pm.permissions @> pg.permissions
)

UNION ALL

SELECT
  'Expired role assignments' as issue_type,
  COUNT(*) as count
FROM public.user_roles
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();

GRANT SELECT ON public.permission_data_quality TO authenticated;

-- Step 7: Create monitoring functions

-- Function to get access logs
CREATE OR REPLACE FUNCTION public.get_permission_access_logs(
  _days INTEGER DEFAULT 7
)
RETURNS TABLE(
  action TEXT,
  feature TEXT,
  user_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    'permission_check' as action,
    'various' as feature,
    COUNT(DISTINCT user_id)::BIGINT as user_count,
    0::BIGINT as success_count,
    0::BIGINT as failure_count,
    DATE(created_at) as date
  FROM public.audit_logs
  WHERE created_at >= now() - (_days || ' days')::INTERVAL
    AND action LIKE 'permission_%'
  GROUP BY DATE(created_at)
  ORDER BY date DESC
$$;

-- Function to get role assignment stats
CREATE OR REPLACE FUNCTION public.get_role_assignment_stats(_days INTEGER DEFAULT 30)
RETURNS TABLE(
  role public.app_role,
  total_assignments BIGINT,
  new_assignments BIGINT,
  revoked_assignments BIGINT,
  active_users BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pm.role,
    COUNT(DISTINCT ur.user_id)::BIGINT as total_assignments,
    COUNT(DISTINCT CASE 
      WHEN raa.action = 'ASSIGN' 
        AND raa.created_at >= now() - (_days || ' days')::INTERVAL 
      THEN raa.user_id 
    END)::BIGINT as new_assignments,
    COUNT(DISTINCT CASE 
      WHEN raa.action = 'REVOKE' 
        AND raa.created_at >= now() - (_days || ' days')::INTERVAL 
      THEN raa.user_id 
    END)::BIGINT as revoked_assignments,
    COUNT(DISTINCT CASE 
      WHEN ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now())
      THEN ur.user_id
    END)::BIGINT as active_users
  FROM public.permissions_matrix pm
  LEFT JOIN public.user_roles ur ON pm.role = ur.role
  LEFT JOIN public.role_assignments_audit raa ON ur.user_id = raa.user_id 
    AND pm.role = raa.role
  GROUP BY pm.role
  ORDER BY active_users DESC
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.validate_permission_structure(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permission_access_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_assignment_stats(INTEGER) TO authenticated;

-- Step 8: Create data integrity check function
CREATE OR REPLACE FUNCTION public.check_permissions_integrity()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  -- Check 1: All app_role enum values have permissions matrix entry
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

  -- Check 2: No duplicate active roles per user
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

  -- Check 3: Permission groups referenced in matrix
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
$$;

GRANT EXECUTE ON FUNCTION public.check_permissions_integrity() TO authenticated;

-- Step 9: Create automatic cleanup job trigger for expired assignments
CREATE OR REPLACE FUNCTION public.cleanup_expired_roles_on_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.deactivate_expired_roles();
END;
$$;

-- Log the migration
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_permissions_validation', 'system', 'success');

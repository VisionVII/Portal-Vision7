-- Fix: recreate diagnostic views with security_invoker = true
-- Fixes Supabase linter SECURITY DEFINER warnings

CREATE OR REPLACE VIEW public.permission_data_quality
WITH (security_invoker = true) AS
SELECT 'Missing descriptions'::text AS issue_type,
       count(*) AS count
FROM public.permissions_matrix
WHERE permissions_matrix.description IS NULL
   OR TRIM(BOTH FROM permissions_matrix.description) = ''
UNION ALL
SELECT 'Unused permission groups'::text AS issue_type,
       count(*) AS count
FROM public.permission_groups pg
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions_matrix pm
  WHERE pm.permissions @> pg.permissions
)
UNION ALL
SELECT 'Expired role assignments'::text AS issue_type,
       count(*) AS count
FROM public.user_roles
WHERE user_roles.is_active = true
  AND user_roles.expires_at IS NOT NULL
  AND user_roles.expires_at < now();

CREATE OR REPLACE VIEW public.role_consistency_report
WITH (security_invoker = true) AS
SELECT pm.role,
       pm.description,
       jsonb_object_keys(pm.permissions) AS feature,
       count(ur.user_id) AS assigned_users,
       count(CASE WHEN ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now()) THEN 1 ELSE NULL END) AS active_users,
       max(ur.assigned_at) AS last_assigned,
       pm.updated_at AS last_updated
FROM public.permissions_matrix pm
LEFT JOIN public.user_roles ur ON pm.role = ur.role
GROUP BY pm.role, pm.description, pm.permissions, pm.updated_at;

GRANT SELECT ON public.permission_data_quality TO authenticated;
GRANT SELECT ON public.role_consistency_report TO authenticated;

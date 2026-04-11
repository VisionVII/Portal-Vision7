-- ============================================================
-- MIGRATION 5/6: Permissions Features (Hierarchy, Overrides, Groups)
-- Date: 2026-03-23 (corrigido 2026-04-05)
-- Depende de: audit_logs, expand_roles (permissions_matrix)
-- ============================================================

-- Step 1: Create role_hierarchy table for permission inheritance
CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role public.app_role NOT NULL,
  child_role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_hierarchy UNIQUE(parent_role, child_role),
  CONSTRAINT prevent_self_hierarchy CHECK (parent_role != child_role)
);

-- Enable RLS
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read role hierarchy" ON public.role_hierarchy;
CREATE POLICY "Anyone can read role hierarchy"
  ON public.role_hierarchy FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can write role hierarchy" ON public.role_hierarchy;
CREATE POLICY "Only super_admin can write role hierarchy"
  ON public.role_hierarchy FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Step 2: Create permission_overrides table for per-user exceptions
CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_override UNIQUE(user_id, feature, action)
);

-- Enable RLS
ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own overrides" ON public.permission_overrides;
CREATE POLICY "Users can read their own overrides"
  ON public.permission_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Only super_admin can manage overrides" ON public.permission_overrides;
CREATE POLICY "Only super_admin can manage overrides"
  ON public.permission_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Only super_admin can update overrides" ON public.permission_overrides;
CREATE POLICY "Only super_admin can update overrides"
  ON public.permission_overrides FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Step 3: Create role_assignments_audit table
CREATE TABLE IF NOT EXISTS public.role_assignments_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ASSIGN', 'REVOKE')),
  assigned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignments_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read assignments audit" ON public.role_assignments_audit;
CREATE POLICY "Admins can read assignments audit"
  ON public.role_assignments_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Step 4: Create permission_groups table for better organization
CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read permission groups" ON public.permission_groups;
CREATE POLICY "Anyone can read permission groups"
  ON public.permission_groups FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can manage permission groups" ON public.permission_groups;
CREATE POLICY "Only super_admin can manage permission groups"
  ON public.permission_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Insert predefined permission groups
INSERT INTO public.permission_groups (name, permissions, description) VALUES
  ('post_management', '{
    "posts": ["create", "read", "update", "delete", "publish"]
  }'::jsonb, 'Full post management permissions'),
  
  ('user_management', '{
    "users": ["create", "read", "update", "delete"]
  }'::jsonb, 'User management permissions'),
  
  ('analytics_access', '{
    "analytics": ["read"]
  }'::jsonb, 'Analytics read-only access'),
  
  ('moderation', '{
    "comments": ["read", "moderate", "delete"]
  }'::jsonb, 'Content moderation'),
  
  ('system_admin', '{
    "settings": ["read", "write"],
    "roles": ["read", "write"],
    "audit": ["read"]
  }'::jsonb, 'System administration')
ON CONFLICT DO NOTHING;

-- Step 5: Enhanced functions with permission overrides support

-- Updated has_permission function that checks overrides
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _feature TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Check for explicit override first
    (SELECT granted FROM public.permission_overrides 
     WHERE user_id = _user_id 
     AND feature = _feature 
     AND action = _action
     AND (expires_at IS NULL OR expires_at > now())),
    
    -- Fall back to role-based permissions
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.permissions_matrix pm ON pm.role = ur.role
      WHERE ur.user_id = _user_id
        AND pm.permissions->_feature ? _action
    )
  , false)
$$;

-- Function to get effective permissions including overrides
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_perms JSONB;
  override_perms JSONB;
BEGIN
  -- Get role-based permissions
  SELECT jsonb_object_agg(
    pm.role::TEXT,
    pm.permissions
  ) INTO role_perms
  FROM public.user_roles ur
  JOIN public.permissions_matrix pm ON pm.role = ur.role
  WHERE ur.user_id = _user_id;

  -- Get active overrides
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
$$;

-- Function to assign role with audit
CREATE OR REPLACE FUNCTION public.assign_role_with_audit(
  _user_id UUID,
  _role public.app_role,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Function to revoke role with audit
CREATE OR REPLACE FUNCTION public.revoke_role_with_audit(
  _user_id UUID,
  _role public.app_role,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id ON public.permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_expires_at ON public.permission_overrides(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_user_id ON public.role_assignments_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_created_at ON public.role_assignments_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_parent ON public.role_hierarchy(parent_role);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_child ON public.role_hierarchy(child_role);

-- Step 7: Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_with_audit(UUID, public.app_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_role_with_audit(UUID, public.app_role, TEXT) TO authenticated;

-- Log the migration
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_permissions_features', 'system', 'success');

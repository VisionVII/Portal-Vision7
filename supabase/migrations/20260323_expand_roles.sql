-- ============================================================
-- MIGRATION 2/6: Expand Roles + Permissions Matrix
-- Date: 2026-03-23 (corrigido 2026-04-05)
-- Depende de: audit_logs
-- ============================================================

-- Step 1: Extend app_role enum with new roles (idempotent)
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redator'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderador'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 2: Create permissions_matrix table
CREATE TABLE IF NOT EXISTS public.permissions_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.permissions_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read permissions matrix" ON public.permissions_matrix;
CREATE POLICY "Anyone can read permissions matrix"
  ON public.permissions_matrix FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can update permissions" ON public.permissions_matrix;
CREATE POLICY "Only super_admin can update permissions"
  ON public.permissions_matrix FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Step 3: Insert default permissions for each role
INSERT INTO public.permissions_matrix (role, permissions, description) VALUES
  ('super_admin', '{
    "posts": ["create", "read", "update", "delete"],
    "users": ["create", "read", "update", "delete", "revoke"],
    "analytics": ["read"],
    "audit": ["read"],
    "settings": ["read", "write"],
    "roles": ["read", "write"],
    "2fa": ["read", "write"],
    "newsletter": ["read", "write"],
    "comments": ["read", "moderate", "delete"],
    "dashboard": ["view_all", "manage_users"]
  }'::jsonb, 'Full system access with ability to revoke permissions'),

  ('admin', '{
    "posts": ["create", "read", "update", "delete"],
    "users": ["create", "read", "update"],
    "analytics": ["read"],
    "audit": ["read"],
    "settings": ["read", "write"],
    "roles": ["read"],
    "2fa": ["read"],
    "newsletter": ["read", "write"],
    "comments": ["read", "moderate", "delete"],
    "dashboard": ["view_admin"]
  }'::jsonb, 'Administrative access without revoke permissions'),

  ('editor', '{
    "posts": ["read", "update", "publish"],
    "users": [],
    "analytics": ["read"],
    "audit": [],
    "settings": [],
    "roles": [],
    "2fa": [],
    "newsletter": ["read"],
    "comments": ["read", "moderate"],
    "dashboard": ["view_editor"]
  }'::jsonb, 'Can publish and edit all posts, moderate comments'),

  ('redator', '{
    "posts": ["create", "read", "update"],
    "users": [],
    "analytics": ["read_own"],
    "audit": [],
    "settings": [],
    "roles": [],
    "2fa": [],
    "newsletter": [],
    "comments": [],
    "dashboard": ["view_redator"]
  }'::jsonb, 'Can create and edit own posts only'),

  ('moderador', '{
    "posts": [],
    "users": [],
    "analytics": [],
    "audit": [],
    "settings": [],
    "2fa": [],
    "newsletter": [],
    "comments": ["read", "moderate", "delete"],
    "dashboard": ["view_moderador"]
  }'::jsonb, 'Can moderate comments and ban users'),

  ('analyst', '{
    "posts": [],
    "users": [],
    "analytics": ["read"],
    "audit": [],
    "settings": [],
    "roles": [],
    "2fa": [],
    "newsletter": [],
    "comments": [],
    "dashboard": ["view_analyst"]
  }'::jsonb, 'Read-only analytics access')
ON CONFLICT (role) DO NOTHING;

-- Step 4: Create function to check permissions dynamically
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
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permissions_matrix pm ON pm.role = ur.role
    WHERE ur.user_id = _user_id
      AND pm.permissions->_feature ? _action
  )
$$;

-- Step 5: Create function to get user's all permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(
    pm.role::TEXT,
    pm.permissions
  ), '{}'::jsonb)
  FROM public.user_roles ur
  JOIN public.permissions_matrix pm ON pm.role = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_permissions_matrix_role ON public.permissions_matrix(role);

-- Log the migration
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_expand_roles', 'system', 'success');

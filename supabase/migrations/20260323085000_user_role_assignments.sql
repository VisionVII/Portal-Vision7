-- ============================================================
-- MIGRATION 4/6: User Role Assignments
-- Date: 2026-03-23 (corrigido 2026-04-05)
-- Depende de: audit_logs, user_roles
-- ============================================================

-- Step 1: Enhance user_roles table with additional metadata
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS reason TEXT;

-- Create index for active roles
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON public.user_roles(expires_at);

-- Step 2: Create role_assignment_templates for bulk operations
CREATE TABLE IF NOT EXISTS public.role_assignment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  roles public.app_role[] NOT NULL,
  conditions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignment_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read templates" ON public.role_assignment_templates;
CREATE POLICY "Anyone can read templates"
  ON public.role_assignment_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can manage templates" ON public.role_assignment_templates;
CREATE POLICY "Only super_admin can manage templates"
  ON public.role_assignment_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Insert common role templates
INSERT INTO public.role_assignment_templates (name, description, roles, conditions) VALUES
  ('Editorial Team', 'Team for editorial content creation and management', ARRAY['editor'::public.app_role], '{"department": "editorial"}'::jsonb),
  ('Content Writers', 'Team for content writing', ARRAY['redator'::public.app_role], '{"department": "writing"}'::jsonb),
  ('Support Moderators', 'Team for community moderation', ARRAY['moderador'::public.app_role], '{"department": "support"}'::jsonb),
  ('Analytics Team', 'Team with analytics read-only access', ARRAY['analyst'::public.app_role], '{"department": "analytics"}'::jsonb),
  ('Management', 'Team with admin access', ARRAY['admin'::public.app_role], '{"department": "management"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Step 3: Create role_assignment_history table for audit trail
CREATE TABLE IF NOT EXISTS public.role_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_assignment_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL,
  role public.app_role NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'ACTIVATED', 'DEACTIVATED', 'EXPIRED', 'MODIFIED')),
  previous_state JSONB,
  new_state JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read role history" ON public.role_assignment_history;
CREATE POLICY "Admins can read role history"
  ON public.role_assignment_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_role_assignment_history_user_id ON public.role_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_history_created_at ON public.role_assignment_history(created_at);

-- Step 4: Create role_bulk_assignments table for batch operations
CREATE TABLE IF NOT EXISTS public.role_bulk_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.role_assignment_templates(id),
  user_ids UUID[] NOT NULL,
  roles public.app_role[] NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  total_users INTEGER,
  processed_users INTEGER DEFAULT 0,
  failed_users INTEGER DEFAULT 0,
  error_details JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.role_bulk_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read bulk assignments" ON public.role_bulk_assignments;
CREATE POLICY "Admins can read bulk assignments"
  ON public.role_bulk_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_role_bulk_assignments_status ON public.role_bulk_assignments(status);
CREATE INDEX IF NOT EXISTS idx_role_bulk_assignments_created_by ON public.role_bulk_assignments(created_by);

-- Step 5: Helper functions for role management

-- Function to get user's current active roles
CREATE OR REPLACE FUNCTION public.get_user_active_roles(_user_id UUID)
RETURNS TABLE(role public.app_role, assigned_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    role,
    assigned_at,
    expires_at
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY assigned_at DESC
$$;

-- Function to check if user has any of specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
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
      AND role = ANY(_roles)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Function to check if user has all specified roles
CREATE OR REPLACE FUNCTION public.has_all_roles(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) = array_length(_roles, 1)
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = ANY(_roles)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Function to deactivate expired roles
CREATE OR REPLACE FUNCTION public.deactivate_expired_roles()
RETURNS TABLE(deactivated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deactivated_count INTEGER;
BEGIN
  UPDATE public.user_roles
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS _deactivated_count = ROW_COUNT;

  -- Log the operation
  INSERT INTO public.audit_logs (action, table_name, status)
  VALUES ('deactivate_expired_roles', 'user_roles', 'success')
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT _deactivated_count;
END;
$$;

-- Function for bulk role assignment with history
CREATE OR REPLACE FUNCTION public.assign_roles_to_users(
  _user_ids UUID[],
  _roles public.app_role[],
  _reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, assigned_count INTEGER, failed_count INTEGER, details JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _role public.app_role;
  _assigned_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _error_details JSONB := '{}' ::jsonb;
  _error_text TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RETURN QUERY SELECT false, 0, array_length(_user_ids, 1), '{"error": "Only super_admin can perform bulk assignments"}'::jsonb;
    RETURN;
  END IF;

  FOREACH _user_id IN ARRAY _user_ids
  LOOP
    FOREACH _role IN ARRAY _roles
    LOOP
      BEGIN
        INSERT INTO public.user_roles (user_id, role, assigned_by, reason, is_active)
        VALUES (_user_id, _role, auth.uid(), _reason, true)
        ON CONFLICT DO NOTHING;

        INSERT INTO public.role_assignment_history (user_id, role, action, changed_by, change_reason)
        VALUES (_user_id, _role, 'CREATED', auth.uid(), _reason);

        _assigned_count := _assigned_count + 1;
      EXCEPTION WHEN OTHERS THEN
        _failed_count := _failed_count + 1;
        _error_text := SQLERRM;
        _error_details := _error_details || jsonb_build_object(
          'user_id', _user_id::text,
          'role', _role::text,
          'error', _error_text
        );
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT 
    (_failed_count = 0),
    _assigned_count,
    _failed_count,
    _error_details;
END;
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_active_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(UUID, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_all_roles(UUID, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_roles_to_users(UUID[], app_role[], TEXT) TO authenticated;

-- Log the migration
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_user_role_assignments', 'system', 'success');

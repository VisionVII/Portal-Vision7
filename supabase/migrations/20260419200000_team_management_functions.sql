-- ============================================================
-- MIGRATION: Team Management Functions
-- Date: 2026-04-19
-- Purpose: Admin-accessible functions to manage team members
--          with email/name resolution from auth.users + user_profiles
-- ============================================================

-- 1) Function to get team members with details (email, name, avatar)
-- Only accessible by admin/super_admin via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(
  assignment_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role public.app_role,
  is_active BOOLEAN,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admin or super_admin can call this
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    ur.id AS assignment_id,
    ur.user_id,
    au.email::TEXT,
    COALESCE(up.full_name, split_part(au.email::TEXT, '@', 1)) AS full_name,
    up.avatar_url,
    ur.role,
    COALESCE(ur.is_active, true) AS is_active,
    ur.assigned_at,
    ur.expires_at,
    ur.reason
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.user_profiles up ON up.id = ur.user_id
  ORDER BY
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'redator' THEN 4
      WHEN 'moderador' THEN 5
      WHEN 'analyst' THEN 6
      ELSE 7
    END,
    ur.assigned_at DESC;
END;
$$;

-- 2) Function to change a user's role (with audit trail)
CREATE OR REPLACE FUNCTION public.change_user_role(
  _user_id UUID,
  _old_role public.app_role,
  _new_role public.app_role,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can change roles
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can change roles';
  END IF;

  -- Cannot change own super_admin role (safety)
  IF _user_id = auth.uid() AND _old_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot remove your own super_admin role';
  END IF;

  -- Deactivate old role
  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = _user_id AND role = _old_role AND is_active = true;

  -- Insert audit for revocation
  INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
  VALUES (_user_id, _old_role, 'REVOKE', auth.uid(), COALESCE(_reason, 'Role changed to ' || _new_role::TEXT));

  -- Insert new role (or reactivate if exists)
  INSERT INTO public.user_roles (user_id, role, assigned_by, reason, is_active, assigned_at)
  VALUES (_user_id, _new_role, auth.uid(), _reason, true, now())
  ON CONFLICT (user_id, role) DO UPDATE SET
    is_active = true,
    assigned_by = auth.uid(),
    reason = COALESCE(_reason, 'Reactivated'),
    assigned_at = now();

  -- Insert audit for assignment
  INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
  VALUES (_user_id, _new_role, 'ASSIGN', auth.uid(), COALESCE(_reason, 'Changed from ' || _old_role::TEXT));

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 3) Function to deactivate a team member (soft-delete, keeps audit)
CREATE OR REPLACE FUNCTION public.deactivate_team_member(
  _user_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  -- Only super_admin can deactivate members
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can deactivate members';
  END IF;

  -- Cannot deactivate yourself
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;

  -- Deactivate all active roles and audit each
  FOR _role IN
    SELECT role FROM public.user_roles
    WHERE user_id = _user_id AND is_active = true
  LOOP
    UPDATE public.user_roles
    SET is_active = false
    WHERE user_id = _user_id AND role = _role;

    INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
    VALUES (_user_id, _role, 'REVOKE', auth.uid(), COALESCE(_reason, 'Member deactivated'));
  END LOOP;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 4) Function to reactivate a team member
CREATE OR REPLACE FUNCTION public.reactivate_team_member(
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
  -- Only super_admin can reactivate
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admin can reactivate members';
  END IF;

  -- Reactivate or create the role
  INSERT INTO public.user_roles (user_id, role, assigned_by, reason, is_active, assigned_at)
  VALUES (_user_id, _role, auth.uid(), _reason, true, now())
  ON CONFLICT (user_id, role) DO UPDATE SET
    is_active = true,
    assigned_by = auth.uid(),
    reason = COALESCE(_reason, 'Reactivated'),
    assigned_at = now();

  INSERT INTO public.role_assignments_audit (user_id, role, action, assigned_by, reason)
  VALUES (_user_id, _role, 'ASSIGN', auth.uid(), COALESCE(_reason, 'Member reactivated'));

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- 5) Add admin read policy for user_profiles (admins can see all profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles'
    AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin')
    );
  END IF;
END $$;

-- 6) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, public.app_role, public.app_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_team_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_team_member(UUID, public.app_role, TEXT) TO authenticated;

-- Log
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_team_management_functions', 'system', 'success');

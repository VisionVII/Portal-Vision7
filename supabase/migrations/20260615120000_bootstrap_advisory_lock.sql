-- Fix race condition in bootstrap_first_admin() by adding an advisory lock.
-- This prevents two concurrent callers from both seeing _has_admin=false
-- and both inserting a new admin role.

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _has_admin BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Acquire transaction-scoped advisory lock to prevent race condition
  PERFORM pg_advisory_xact_lock(42);

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role IN ('super_admin', 'admin')
      AND COALESCE(is_active, true) = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO _has_admin;

  IF NOT _has_admin THEN
    INSERT INTO public.user_roles (user_id, role, reason)
    VALUES (_uid, 'admin', 'bootstrap_first_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;

  RETURN public.has_role(_uid, 'admin') OR public.has_role(_uid, 'super_admin');
END;
$$;

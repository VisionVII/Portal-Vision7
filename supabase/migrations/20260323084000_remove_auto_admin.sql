-- ============================================================
-- MIGRATION 3/6: Remove Auto-Admin + Registration Invites
-- Date: 2026-03-23 (corrigido 2026-04-05)
-- Risk Level: CRITICAL SECURITY FIX
-- Depende de: audit_logs
-- ============================================================

-- Step 1: Remove the auto-admin trigger that assigns admin role to ANY new user
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_admin_role();

-- Step 2: Create registration_invites table for approval flow
CREATE TABLE IF NOT EXISTS public.registration_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'redator',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + INTERVAL '7 days',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.registration_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Only super-admin can create invites" ON public.registration_invites;
CREATE POLICY "Only super-admin can create invites"
  ON public.registration_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view invites" ON public.registration_invites;
CREATE POLICY "Admins can view invites"
  ON public.registration_invites FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view their own invite" ON public.registration_invites;
CREATE POLICY "Users can view their own invite"
  ON public.registration_invites FOR SELECT
  USING (email = auth.jwt()->>'email' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update invites" ON public.registration_invites;
CREATE POLICY "Admins can update invites"
  ON public.registration_invites FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 3: Create new function to assign role based on invite on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_from_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.registration_invites;
BEGIN
  -- Look for valid invite for this email
  SELECT * INTO invite_record
  FROM public.registration_invites
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
  
  IF invite_record IS NOT NULL THEN
    -- Assign role from invite
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Mark invite as used
    UPDATE public.registration_invites
    SET used_at = now(), status = 'used'
    WHERE id = invite_record.id;
    
    -- Log action
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, status)
    VALUES (
      NEW.id,
      'user_registered',
      'auth.users',
      NEW.id,
      jsonb_build_object('email', NEW.email, 'role', invite_record.role),
      'success'
    );
  ELSE
    -- No valid invite found - cannot register
    RAISE EXCEPTION 'Invalid or expired registration invite. Please ask an admin for an invite link.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to validate invite on signup
DROP TRIGGER IF EXISTS on_auth_user_created_from_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_from_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_from_invite();

-- Step 5: Update existing admin users (keep them as admin)
-- This prevents locking out existing admins
-- Only run if you have existing admins to preserve
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_invites_email ON public.registration_invites(email);
CREATE INDEX IF NOT EXISTS idx_registration_invites_status ON public.registration_invites(status);
CREATE INDEX IF NOT EXISTS idx_registration_invites_expires_at ON public.registration_invites(expires_at);

-- Create audit trigger for registration_invites (function defined in migration 1)
DROP TRIGGER IF EXISTS audit_invite_changes ON public.registration_invites;
CREATE TRIGGER audit_invite_changes
  AFTER INSERT OR UPDATE ON public.registration_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_invite_changes_fn();

-- Audit Log
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_remove_auto_admin', 'system', 'success');

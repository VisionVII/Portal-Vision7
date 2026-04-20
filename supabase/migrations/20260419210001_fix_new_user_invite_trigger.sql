-- ============================================================
-- FIX: handle_new_user_from_invite blocks signup with 500 error
-- "Database error saving new user"
--
-- Root cause: the trigger checks only registration_invites,
-- but the current invite flow uses security_codes + edge function
-- assign-invite-role for role assignment.
--
-- Fix: check security_codes for a valid used invite code.
-- ============================================================

-- Drop the old trigger and function first to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_from_invite ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_from_invite();

-- Recreate function using PERFORM + FOUND (avoids SELECT INTO parsing issues)
CREATE FUNCTION public.handle_new_user_from_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM 1
  FROM public.security_codes
  WHERE email = NEW.email
    AND type = 'invite'
    AND used = true
    AND created_at > now() - INTERVAL '24 hours';

  IF FOUND THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values, status)
    VALUES (
      NEW.id,
      'user_registered',
      'auth.users',
      NEW.id,
      jsonb_build_object('email', NEW.email, 'source', 'security_code_invite'),
      'success'
    );
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid or expired registration invite. Please ask an admin for an invite link.';
END;
$fn$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_from_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_from_invite();

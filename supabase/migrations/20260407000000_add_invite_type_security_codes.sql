-- Add 'invite' type to security_codes and metadata column for invite flow

-- Drop old check constraint and recreate with invite type
ALTER TABLE public.security_codes
  DROP CONSTRAINT IF EXISTS security_codes_type_check;

ALTER TABLE public.security_codes
  ADD CONSTRAINT security_codes_type_check
  CHECK (type IN ('login', 'password_reset', 'email_verification', 'invite'));

-- Add metadata column for invite data (e.g. role)
ALTER TABLE public.security_codes
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for invite codes
CREATE INDEX IF NOT EXISTS idx_security_codes_type_invite_email
  ON public.security_codes (email, type, used, expires_at)
  WHERE type = 'invite' AND used = FALSE;

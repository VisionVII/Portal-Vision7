-- Security codes table for custom OTP verification
-- Used as additional security layer for admin login

CREATE TABLE IF NOT EXISTS public.security_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'login' CHECK (type IN ('login', 'password_reset', 'email_verification')),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_security_codes_email_type
  ON public.security_codes (email, type, used, created_at DESC);

-- Auto-cleanup: delete expired codes older than 24 hours
CREATE INDEX IF NOT EXISTS idx_security_codes_expires
  ON public.security_codes (expires_at)
  WHERE used = FALSE;

-- RLS policies
ALTER TABLE public.security_codes ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read their own codes (for verification)
CREATE POLICY "Users can read own security codes"
  ON public.security_codes
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Service role can insert/update (for code generation and verification)
CREATE POLICY "Service role manages security codes"
  ON public.security_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.security_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_codes TO service_role;

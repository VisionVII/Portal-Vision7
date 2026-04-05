-- Hardening for OTP abuse controls: IP/device tracking and temporary blocking

ALTER TABLE public.security_codes
  ADD COLUMN IF NOT EXISTS request_ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_security_codes_type_email_created_at
  ON public.security_codes (type, email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_codes_type_ip_created_at
  ON public.security_codes (type, request_ip, created_at DESC)
  WHERE request_ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_codes_type_device_created_at
  ON public.security_codes (type, device_fingerprint, created_at DESC)
  WHERE device_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_codes_blocked_until
  ON public.security_codes (blocked_until)
  WHERE blocked_until IS NOT NULL;

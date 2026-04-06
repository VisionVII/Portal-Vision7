CREATE TABLE IF NOT EXISTS public.partner_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  requested_role public.app_role NOT NULL,
  request_context TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'public_access_form',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'archived')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_access_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_access_requests_email ON public.partner_access_requests (email);
CREATE INDEX IF NOT EXISTS idx_partner_access_requests_status ON public.partner_access_requests (status);

CREATE TRIGGER update_partner_access_requests_updated_at
BEFORE UPDATE ON public.partner_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Persistent rate limiting for automation Edge Functions (n8n-proxy,
-- n8n-settings, n8n-workflow-import). The in-memory limiter in n8n-proxy
-- resets on cold start and doesn't share state across instances; this
-- table backs a per-user/per-function/per-hour count that survives both.

CREATE TABLE IF NOT EXISTS public.automation_rate_limit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_fn_time
  ON public.automation_rate_limit_log (user_id, function_name, created_at DESC);

ALTER TABLE public.automation_rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role (Edge Functions) reads/writes this table — it's an
-- internal counter, not user-facing data.
DROP POLICY IF EXISTS "rate_limit_service_only" ON public.automation_rate_limit_log;
CREATE POLICY "rate_limit_service_only" ON public.automation_rate_limit_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.automation_rate_limit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.automation_rate_limit_log_id_seq TO service_role;

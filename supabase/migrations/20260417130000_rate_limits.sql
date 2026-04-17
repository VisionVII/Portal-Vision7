-- Rate limiting table for Edge Functions
-- Uses sliding window counter pattern stored in DB

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1,
  CONSTRAINT rate_limits_key_window UNIQUE (key, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON public.rate_limits (key, window_start DESC);

-- Auto-cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

-- Rate check function: returns TRUE if request is allowed, FALSE if blocked
-- Uses a 1-minute sliding window by default
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INT DEFAULT 30,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Truncate to window boundary
  v_window := date_trunc('minute', now());

  -- Upsert and get current count
  INSERT INTO public.rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Periodic cleanup (1% chance per request to avoid overhead)
  IF random() < 0.01 THEN
    PERFORM cleanup_rate_limits();
  END IF;

  RETURN v_count <= p_max_requests;
END;
$$;

-- Grants: service_role needs full access, edge functions use service_role
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limits_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;

-- RLS: no direct user access needed (only service_role via edge functions)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

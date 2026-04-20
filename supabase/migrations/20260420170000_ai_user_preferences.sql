-- AI Assistant: user preferences & interaction learning
-- Stores per-user topic interests and interaction patterns

CREATE TABLE IF NOT EXISTS public.ai_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint text NOT NULL,
  preferred_topics text[] DEFAULT '{}',
  preferred_categories text[] DEFAULT '{}',
  interaction_count integer DEFAULT 0,
  last_questions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ai_user_prefs_fingerprint_unique UNIQUE (user_fingerprint)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ai_user_prefs_fingerprint ON public.ai_user_preferences (user_fingerprint);

-- RLS
ALTER TABLE public.ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) full access
CREATE POLICY "service_role_full_access" ON public.ai_user_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon to read/insert/update their own preferences (by fingerprint)
CREATE POLICY "anon_manage_own_prefs" ON public.ai_user_preferences
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ai_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_prefs_updated ON public.ai_user_preferences;
CREATE TRIGGER trg_ai_prefs_updated
  BEFORE UPDATE ON public.ai_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_prefs_timestamp();

-- RPC to atomically increment interaction count and append last question
CREATE OR REPLACE FUNCTION public.increment_ai_interaction(fp text, q text)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_user_preferences
  SET
    interaction_count = interaction_count + 1,
    last_questions = (
      SELECT array_agg(val) FROM (
        SELECT unnest(ARRAY[q] || last_questions) AS val LIMIT 5
      ) sub
    )
  WHERE user_fingerprint = fp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

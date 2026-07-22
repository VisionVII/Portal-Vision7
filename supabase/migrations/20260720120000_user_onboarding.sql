-- Tutorial guiado do dashboard admin: progresso por utilizador
-- Cada utilizador só lê/escreve a sua própria linha (auth.uid() = user_id).

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  completed_steps text[] NOT NULL DEFAULT '{}',
  dismissed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_onboarding_select_own" ON public.user_onboarding;
CREATE POLICY "user_onboarding_select_own" ON public.user_onboarding
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_onboarding_insert_own" ON public.user_onboarding;
CREATE POLICY "user_onboarding_insert_own" ON public.user_onboarding
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_onboarding_update_own" ON public.user_onboarding;
CREATE POLICY "user_onboarding_update_own" ON public.user_onboarding
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_onboarding TO authenticated;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_user_onboarding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_onboarding_updated ON public.user_onboarding;
CREATE TRIGGER trg_user_onboarding_updated
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_user_onboarding_timestamp();

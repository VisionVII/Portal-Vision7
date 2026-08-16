-- ai_user_preferences had a policy "anon_manage_own_prefs" with
-- USING (true) / WITH CHECK (true) for role anon: despite its name, it did
-- NOT scope by user_fingerprint, so any anonymous request could read,
-- modify or delete any other visitor's AI-assistant preferences.
--
-- Confirmed via grep: the only real caller is supabase/functions/
-- portal-ai-assistant/index.ts, which uses the SERVICE_ROLE key
-- (`adminClient`), which bypasses RLS entirely regardless of this policy.
-- Nothing in the frontend queries this table directly with the anon key.
-- Dropping the policy removes anon's direct table access with zero
-- functional impact; the edge function keeps working unchanged.
--
-- Rollback:
--   CREATE POLICY anon_manage_own_prefs ON public.ai_user_preferences
--     FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_manage_own_prefs ON public.ai_user_preferences;

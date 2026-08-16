-- Tightens the three "always true" public-insert policies flagged by the
-- linter (analytics_events, cmp_consent_records, push_subscriptions).
-- These tables genuinely need public/anonymous INSERT (analytics tracking,
-- cookie-consent logging, push opt-in do not require a login), so the fix is
-- NOT to remove public insert — it is to validate the payload shape instead
-- of accepting anything, which is what actually made the policies risky.
--
-- All three tables already deny UPDATE/DELETE to anon/authenticated (no such
-- policy exists), so records remain immutable from the client once inserted.
--
-- Rollback: DROP the policies created here and recreate the previous
-- `WITH CHECK (true)` versions (see supabase/migrations/20260616100000_
-- cmp_grants_and_fixes.sql and the original CREATE POLICY statements for
-- analytics_events / push_subscriptions).

-- analytics_events: event_type is free text used across several features
-- (confirmed via grep only 'page_view'/'test_event' exist today, more will
-- be added), so no hard enum — just sane shape/size limits.
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IS NOT NULL
    AND length(event_type) BETWEEN 1 AND 100
    AND (event_data IS NULL OR pg_column_size(event_data) < 10240)
  );

-- cmp_consent_records: method is a closed set in the app (banner/preferences
-- /api). Domain is pre-checked client-side against cmp_domains before
-- insert; enforcing it here too closes the gap for anyone bypassing the
-- frontend. consent must be a JSON object, not an arbitrary scalar/array.
DROP POLICY IF EXISTS cmp_consent_insert_anon ON public.cmp_consent_records;
CREATE POLICY cmp_consent_insert_anon ON public.cmp_consent_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    method IN ('banner', 'preferences', 'api')
    AND jsonb_typeof(consent) = 'object'
    AND policy_version IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cmp_domains d
      WHERE d.domain = cmp_consent_records.domain
        AND d.is_active = true
    )
  );

-- push_subscriptions: currently unused by the frontend (no call sites found),
-- kept functional for when it is wired up. Basic shape validation only.
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
CREATE POLICY "Anyone can subscribe to push" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    endpoint IS NOT NULL AND endpoint LIKE 'https://%'
    AND p256dh IS NOT NULL AND length(p256dh) > 0
    AND auth IS NOT NULL AND length(auth) > 0
  );

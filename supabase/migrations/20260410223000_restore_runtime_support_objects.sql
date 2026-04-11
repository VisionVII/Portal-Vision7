-- Restore runtime support objects that are required by the portal after the cross-account Supabase migration.
-- This migration is intentionally idempotent so it can safely reconcile partially bootstrapped projects.

-- ---------------------------------------------------------------------------
-- Public access / partnership requests
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS update_partner_access_requests_updated_at ON public.partner_access_requests;
CREATE TRIGGER update_partner_access_requests_updated_at
BEFORE UPDATE ON public.partner_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can manage partner access requests" ON public.partner_access_requests;
CREATE POLICY "Admins can manage partner access requests"
ON public.partner_access_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- Analytics tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);

DROP POLICY IF EXISTS "Admins can view analytics" ON public.analytics_events;
CREATE POLICY "Admins can view analytics"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- User profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  role TEXT DEFAULT 'user',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
CREATE POLICY "Users can view public profiles"
ON public.user_profiles FOR SELECT
USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Content versions and monetization settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  changes_description TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, version_number)
);

ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON public.content_versions(content_type, content_id);

DROP POLICY IF EXISTS "Admins can manage content versions" ON public.content_versions;
CREATE POLICY "Admins can manage content versions"
ON public.content_versions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.monetization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage monetization settings" ON public.monetization_settings;
CREATE POLICY "Admins can manage monetization settings"
ON public.monetization_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

INSERT INTO public.monetization_settings (setting_key, setting_value, description)
VALUES
  ('ads_enabled', '{"ads_enabled": true}'::jsonb, 'Enable/disable advertisement display'),
  ('subscription_enabled', '{"subscription_enabled": false}'::jsonb, 'Enable/disable subscription features'),
  ('ad_slots', '{"ad_slots": ["header", "sidebar", "content", "footer"]}'::jsonb, 'Available ad slot positions'),
  ('premium_features', '{"premium_features": ["ad_free", "exclusive_content", "early_access"]}'::jsonb, 'Available premium features')
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
CREATE POLICY "Anyone can subscribe to push"
ON public.push_subscriptions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view push subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- Runtime helper RPCs used by posts and audiocasts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_views(content_type TEXT, content_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF content_type = 'post' THEN
    UPDATE public.posts
    SET views = COALESCE(views, 0) + 1
    WHERE id = content_id;
  ELSIF content_type IN ('podcast', 'audiocast') THEN
    UPDATE public.podcasts
    SET views = COALESCE(views, 0) + 1
    WHERE id = content_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_podcast_download(podcast_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.podcasts
  SET downloads = COALESCE(downloads, 0) + 1
  WHERE id = podcast_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_views(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_podcast_download(UUID) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Diagnostic views used by the access/permissions stack
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.permission_data_quality AS
SELECT 'Missing descriptions'::text AS issue_type,
       count(*) AS count
FROM public.permissions_matrix
WHERE permissions_matrix.description IS NULL
   OR TRIM(BOTH FROM permissions_matrix.description) = ''
UNION ALL
SELECT 'Unused permission groups'::text AS issue_type,
       count(*) AS count
FROM public.permission_groups pg
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions_matrix pm
  WHERE pm.permissions @> pg.permissions
)
UNION ALL
SELECT 'Expired role assignments'::text AS issue_type,
       count(*) AS count
FROM public.user_roles
WHERE user_roles.is_active = true
  AND user_roles.expires_at IS NOT NULL
  AND user_roles.expires_at < now();

CREATE OR REPLACE VIEW public.role_consistency_report AS
SELECT pm.role,
       pm.description,
       jsonb_object_keys(pm.permissions) AS feature,
       count(ur.user_id) AS assigned_users,
       count(CASE WHEN ur.is_active AND (ur.expires_at IS NULL OR ur.expires_at > now()) THEN 1 ELSE NULL END) AS active_users,
       max(ur.assigned_at) AS last_assigned,
       pm.updated_at AS last_updated
FROM public.permissions_matrix pm
LEFT JOIN public.user_roles ur ON pm.role = ur.role
GROUP BY pm.role, pm.description, pm.permissions, pm.updated_at;

GRANT SELECT ON public.permission_data_quality TO authenticated;
GRANT SELECT ON public.role_consistency_report TO authenticated;

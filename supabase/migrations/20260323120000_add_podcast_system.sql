-- Podcast system tables for Portal Vision7
-- Migration: Add podcast support with NotebookLM integration

-- Create podcasts table
CREATE TABLE public.podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  audio_url TEXT,
  duration INTEGER, -- duration in seconds
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE, -- link to original post
  tags TEXT[] DEFAULT '{}',
  views INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for podcasts
CREATE POLICY "Podcasts are viewable by everyone"
ON public.podcasts FOR SELECT
USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage podcasts"
ON public.podcasts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('podcasts', 'podcasts', true);

-- Storage policies for podcasts
CREATE POLICY "Public can view podcast audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcasts');

CREATE POLICY "Admins can upload podcast audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcasts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update podcast audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'podcasts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete podcast audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'podcasts' AND public.has_role(auth.uid(), 'admin'));

-- Create transcripts bucket for text files
INSERT INTO storage.buckets (id, name, public) VALUES ('transcripts', 'transcripts', false);

-- Storage policies for transcripts (admin only)
CREATE POLICY "Admins can manage transcripts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'transcripts' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'transcripts' AND public.has_role(auth.uid(), 'admin'));

-- Create user profiles extension
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  role TEXT DEFAULT 'user',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user profiles
CREATE POLICY "Users can view public profiles"
ON public.user_profiles FOR SELECT
USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'page_view', 'post_view', 'podcast_play', 'download', etc.
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert analytics events (for tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

-- Create content versions table for version control
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'post', 'podcast'
  content_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  changes_description TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(content_type, content_id, version_number)
);

-- Enable RLS for content versions
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage content versions
CREATE POLICY "Admins can manage content versions"
ON public.content_versions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create monetization settings table
CREATE TABLE public.monetization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for monetization settings
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage monetization
CREATE POLICY "Admins can manage monetization settings"
ON public.monetization_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default monetization settings
INSERT INTO public.monetization_settings (setting_key, setting_value, description) VALUES
  ('ads_enabled', 'true', 'Enable/disable advertisement display'),
  ('subscription_enabled', 'false', 'Enable/disable subscription features'),
  ('ad_slots', '["header", "sidebar", "content", "footer"]', 'Available ad slot positions'),
  ('premium_features', '["ad_free", "exclusive_content", "early_access"]', 'Available premium features');

-- Create function to automatically create user profile
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

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Create function to increment post/podcast views
CREATE OR REPLACE FUNCTION public.increment_views(content_type TEXT, content_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF content_type = 'post' THEN
    UPDATE public.posts SET views = views + 1 WHERE id = content_id;
  ELSIF content_type = 'podcast' THEN
    UPDATE public.podcasts SET views = views + 1 WHERE id = content_id;
  END IF;
END;
$$;

-- Create function to track podcast downloads
CREATE OR REPLACE FUNCTION public.track_podcast_download(podcast_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.podcasts SET downloads = downloads + 1 WHERE id = podcast_id;
END;
$$;

-- Add updated_at triggers for new tables
CREATE TRIGGER update_podcasts_updated_at
    BEFORE UPDATE ON public.podcasts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_podcasts_status ON public.podcasts(status);
CREATE INDEX idx_podcasts_category_id ON public.podcasts(category_id);
CREATE INDEX idx_podcasts_published_at ON public.podcasts(published_at);
CREATE INDEX idx_podcasts_slug ON public.podcasts(slug);

CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);

CREATE INDEX idx_content_versions_content ON public.content_versions(content_type, content_id);

-- Site settings table for logo and other site-wide configuration
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Site settings are viewable by everyone"
ON public.site_settings FOR SELECT TO public
USING (true);

-- Only admins can manage settings
CREATE POLICY "Only admins can manage site settings"
ON public.site_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe to push notifications
CREATE POLICY "Anyone can subscribe to push"
ON public.push_subscriptions FOR INSERT TO public
WITH CHECK (true);

-- Admins can view subscriptions
CREATE POLICY "Admins can view push subscriptions"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('logo_url', null),
  ('site_name', 'Porto Notícias');

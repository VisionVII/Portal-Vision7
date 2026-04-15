-- Populate logo_url in site_settings
-- The logo file exists at /public/vision-logo-premium-default.webp
-- This migration makes it visible throughout the portal

UPDATE public.site_settings
SET value = '/vision-logo-premium-default.webp'
WHERE key = 'logo_url' AND value IS NULL;

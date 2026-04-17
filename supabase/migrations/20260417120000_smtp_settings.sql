-- SMTP configuration stored in site_settings
-- Keys: smtp_host, smtp_port, smtp_user, smtp_from, smtp_from_name, smtp_secure
-- The actual password is stored in n8n_credentials as an 'smtp' type credential

INSERT INTO public.site_settings (key, value)
VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_from', ''),
  ('smtp_from_name', 'Vision7'),
  ('smtp_secure', 'tls')
ON CONFLICT (key) DO NOTHING;

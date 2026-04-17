-- Expand n8n_credentials to a unified credential vault
-- Add credential_type column to distinguish between credential categories

ALTER TABLE public.n8n_credentials
  ADD COLUMN IF NOT EXISTS credential_type TEXT NOT NULL DEFAULT 'api_key'
  CHECK (credential_type IN ('api_key', 'smtp', 'oauth2', 'webhook', 'service_key'));

-- Add optional metadata for SMTP/OAuth2 config
ALTER TABLE public.n8n_credentials
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN public.n8n_credentials.credential_type IS 'Type: api_key (default), smtp, oauth2, webhook, service_key';
COMMENT ON COLUMN public.n8n_credentials.metadata IS 'Extra config fields: SMTP host/port, OAuth2 client_id, etc.';

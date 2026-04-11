-- CMP — Consent Management Platform tables
-- Data layer for consent records, policy versions, and vendor registry.
-- SaaS-ready structure (domains + multi-tenant fields) but single-tenant for now.

-- ── Domains (SaaS-ready, single row for now) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.cmp_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on cmp_domains
CREATE OR REPLACE FUNCTION public.cmp_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cmp_domains_updated_at
  BEFORE UPDATE ON public.cmp_domains
  FOR EACH ROW EXECUTE FUNCTION public.cmp_domains_updated_at();

-- Seed current domain
INSERT INTO public.cmp_domains (domain, display_name)
VALUES ('vision7.pt', 'Vision VII Portal')
ON CONFLICT (domain) DO NOTHING;

-- ── Policy Versions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cmp_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.cmp_domains(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  categories TEXT[] NOT NULL DEFAULT ARRAY['necessary','analytics','marketing','personalization'],
  default_consent JSONB NOT NULL DEFAULT '{"necessary":true,"analytics":false,"marketing":false,"personalization":false}',
  changelog TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain_id, version)
);

-- Seed initial policy
INSERT INTO public.cmp_policy_versions (domain_id, version, changelog)
SELECT id, '1.0', 'Versão inicial da política de cookies'
FROM public.cmp_domains WHERE domain = 'vision7.pt'
ON CONFLICT (domain_id, version) DO NOTHING;

-- ── Consent Records ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cmp_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'anon',
  domain TEXT NOT NULL DEFAULT 'vision7.pt'
    REFERENCES public.cmp_domains(domain) ON DELETE CASCADE,
  consent JSONB NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  method TEXT NOT NULL DEFAULT 'banner' CHECK (method IN ('banner', 'preferences', 'api')),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmp_consent_user_domain
  ON public.cmp_consent_records (user_id, domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmp_consent_domain_date
  ON public.cmp_consent_records (domain, created_at DESC);

-- ── Vendor Registry (future: track which vendors use which categories) ──────

CREATE TABLE IF NOT EXISTS public.cmp_vendor_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.cmp_domains(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('necessary', 'analytics', 'marketing', 'personalization')),
  script_pattern TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (domain_id, vendor_name, category)
);

CREATE INDEX IF NOT EXISTS idx_cmp_vendor_domain
  ON public.cmp_vendor_registry (domain_id);

-- ── RLS Policies ────────────────────────────────────────────────────────────

ALTER TABLE public.cmp_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmp_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmp_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmp_vendor_registry ENABLE ROW LEVEL SECURITY;

-- Consent records: anyone can INSERT their own (anonymous consent collection)
CREATE POLICY cmp_consent_insert_anon ON public.cmp_consent_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Consent records: only admins can SELECT (privacy-safe)
CREATE POLICY cmp_consent_select_admin ON public.cmp_consent_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Domains: public read (config endpoint)
CREATE POLICY cmp_domains_select ON public.cmp_domains
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Domains: admin manage
CREATE POLICY cmp_domains_admin ON public.cmp_domains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Policy versions: public read
CREATE POLICY cmp_policy_select ON public.cmp_policy_versions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Policy versions: admin manage
CREATE POLICY cmp_policy_admin ON public.cmp_policy_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Vendor registry: public read
CREATE POLICY cmp_vendor_select ON public.cmp_vendor_registry
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Vendor registry: admin manage
CREATE POLICY cmp_vendor_admin ON public.cmp_vendor_registry
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ── GRANTs (CRÍTICO: sem isto as RLS policies são inúteis) ──────────────────

-- anon: leitura de config + inserção de consentimento
GRANT SELECT ON public.cmp_domains TO anon;
GRANT SELECT ON public.cmp_policy_versions TO anon;
GRANT SELECT ON public.cmp_vendor_registry TO anon;
GRANT INSERT ON public.cmp_consent_records TO anon;

-- authenticated: leitura de config + inserção de consentimento + admin SELECT
GRANT SELECT, INSERT ON public.cmp_consent_records TO authenticated;
GRANT SELECT ON public.cmp_domains TO authenticated;
GRANT SELECT ON public.cmp_policy_versions TO authenticated;
GRANT SELECT ON public.cmp_vendor_registry TO authenticated;

-- authenticated admins: gestão completa (RLS controla acesso real)
GRANT INSERT, UPDATE, DELETE ON public.cmp_domains TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cmp_policy_versions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cmp_vendor_registry TO authenticated;

-- service_role: acesso total
GRANT ALL ON public.cmp_domains TO service_role;
GRANT ALL ON public.cmp_policy_versions TO service_role;
GRANT ALL ON public.cmp_consent_records TO service_role;
GRANT ALL ON public.cmp_vendor_registry TO service_role;

-- ============================================================
-- MIGRATION: CRM Module — Contacts, Tags, Interactions, Deals
-- Date: 2026-04-19
-- Purpose: Real CRM for portal content operations
-- ============================================================

-- 1) Contact types enum
DO $$ BEGIN
  CREATE TYPE public.crm_contact_type AS ENUM ('subscriber', 'lead', 'partner', 'advertiser', 'contributor', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_interaction_type AS ENUM ('email', 'note', 'meeting', 'call', 'form_submission', 'newsletter_signup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Contacts table — unified contacts registry
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  contact_type public.crm_contact_type NOT NULL DEFAULT 'subscriber',
  source TEXT DEFAULT 'website',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  newsletter_subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts (lower(email));
CREATE INDEX IF NOT EXISTS idx_crm_contacts_type ON public.crm_contacts (contact_type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_active ON public.crm_contacts (is_active);

-- 3) Tags — flexible classification
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Contact-Tag junction
CREATE TABLE IF NOT EXISTS public.crm_contact_tags (
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- 5) Interactions / activity log
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  interaction_type public.crm_interaction_type NOT NULL DEFAULT 'note',
  subject TEXT,
  body TEXT,
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON public.crm_interactions (contact_id, created_at DESC);

-- 6) Deals / opportunities pipeline
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(12, 2),
  currency TEXT DEFAULT 'EUR',
  stage public.crm_deal_stage NOT NULL DEFAULT 'lead',
  expected_close_date DATE,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals (stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON public.crm_deals (contact_id);

-- 7) Updated_at triggers
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_crm_contacts_updated_at BEFORE UPDATE ON public.crm_contacts
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8) RLS
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

-- Admin-only access for all CRM tables
CREATE POLICY "Admin CRM contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin CRM tags" ON public.crm_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin CRM contact_tags" ON public.crm_contact_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin CRM interactions" ON public.crm_interactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin CRM deals" ON public.crm_deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

-- 9) Grants
GRANT ALL ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_tags TO authenticated;
GRANT ALL ON public.crm_contact_tags TO authenticated;
GRANT ALL ON public.crm_interactions TO authenticated;
GRANT ALL ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
GRANT ALL ON public.crm_tags TO service_role;
GRANT ALL ON public.crm_contact_tags TO service_role;
GRANT ALL ON public.crm_interactions TO service_role;
GRANT ALL ON public.crm_deals TO service_role;

-- 10) Seed default tags
INSERT INTO public.crm_tags (name, color) VALUES
  ('Newsletter', '#10b981'),
  ('Lead', '#f59e0b'),
  ('Parceiro', '#6366f1'),
  ('Anunciante', '#ec4899'),
  ('Contribuidor', '#3b82f6'),
  ('VIP', '#ef4444')
ON CONFLICT (name) DO NOTHING;

-- 11) Sync existing newsletter subscribers into CRM contacts
INSERT INTO public.crm_contacts (email, name, contact_type, source, is_active, newsletter_subscriber_id, created_at)
SELECT
  ns.email,
  split_part(ns.email, '@', 1),
  'subscriber'::public.crm_contact_type,
  'newsletter',
  ns.is_active,
  ns.id,
  ns.subscribed_at
FROM public.newsletter_subscribers ns
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_contacts cc WHERE lower(cc.email) = lower(ns.email)
);

-- Tag synced subscribers
INSERT INTO public.crm_contact_tags (contact_id, tag_id)
SELECT cc.id, ct.id
FROM public.crm_contacts cc
CROSS JOIN public.crm_tags ct
WHERE ct.name = 'Newsletter'
  AND cc.contact_type = 'subscriber'
  AND NOT EXISTS (
    SELECT 1 FROM public.crm_contact_tags cct WHERE cct.contact_id = cc.id AND cct.tag_id = ct.id
  );

-- Log
INSERT INTO public.audit_logs (action, table_name, status)
VALUES ('migration_crm_contacts_tags', 'system', 'success');

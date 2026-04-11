-- CMP — Correções críticas para tabelas já criadas
-- 1. GRANTs em falta (CRÍTICO: sem isto o Supabase client não consegue aceder)
-- 2. FK em consent_records.domain → cmp_domains.domain
-- 3. UNIQUE constraint em vendor_registry
-- 4. Trigger updated_at em cmp_domains
-- 5. Índice em vendor_registry(domain_id)

-- ═══════════════════════════════════════════════════════════════
-- 1. GRANTs (CRÍTICO)
-- ═══════════════════════════════════════════════════════════════

-- anon: leitura de config + inserção de consentimento
GRANT SELECT ON public.cmp_domains TO anon;
GRANT SELECT ON public.cmp_policy_versions TO anon;
GRANT SELECT ON public.cmp_vendor_registry TO anon;
GRANT INSERT ON public.cmp_consent_records TO anon;

-- authenticated: leitura + inserção + admin SELECT de consent
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

-- ═══════════════════════════════════════════════════════════════
-- 2. FK: consent_records.domain → cmp_domains.domain
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.cmp_consent_records
  ADD CONSTRAINT fk_cmp_consent_domain
  FOREIGN KEY (domain) REFERENCES public.cmp_domains(domain)
  ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 3. UNIQUE constraint em vendor_registry
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.cmp_vendor_registry
  ADD CONSTRAINT uq_cmp_vendor_domain_name_cat
  UNIQUE (domain_id, vendor_name, category);

-- ═══════════════════════════════════════════════════════════════
-- 4. Trigger updated_at em cmp_domains
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cmp_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cmp_domains_updated_at ON public.cmp_domains;
CREATE TRIGGER trg_cmp_domains_updated_at
  BEFORE UPDATE ON public.cmp_domains
  FOR EACH ROW EXECUTE FUNCTION public.cmp_domains_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 5. Índice em vendor_registry(domain_id)
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cmp_vendor_domain
  ON public.cmp_vendor_registry (domain_id);

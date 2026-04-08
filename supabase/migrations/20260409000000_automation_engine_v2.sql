-- ============================================================
-- Automation Engine v2 — Migration
-- Cria tabelas: automations_v2, automation_executions,
--   automation_templates, automation_audit_log
-- Migra dados de automations (v1) → automations_v2
-- ============================================================

-- ─── 1. automations_v2 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN (
    'content_pipeline','email_campaigns','audit_security',
    'process_internal','integrations'
  )),
  trigger_type TEXT NOT NULL DEFAULT 'schedule' CHECK (trigger_type IN (
    'schedule','event','manual','webhook'
  )),
  workflow_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','active','paused','error','archived'
  )),
  interval_minutes INTEGER DEFAULT 30 CHECK (interval_minutes >= 1),
  cron_expression TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_v2_category ON public.automations_v2(category);
CREATE INDEX IF NOT EXISTS idx_automations_v2_status ON public.automations_v2(status);
CREATE INDEX IF NOT EXISTS idx_automations_v2_trigger ON public.automations_v2(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_v2_next_run ON public.automations_v2(next_run_at);
CREATE INDEX IF NOT EXISTS idx_automations_v2_created_by ON public.automations_v2(created_by);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION public.handle_automations_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_automations_v2_updated ON public.automations_v2;
CREATE TRIGGER trg_automations_v2_updated
  BEFORE UPDATE ON public.automations_v2
  FOR EACH ROW EXECUTE FUNCTION public.handle_automations_v2_updated_at();

-- RLS
ALTER TABLE public.automations_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_v2_select" ON public.automations_v2
  FOR SELECT USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin','editor')
  );

CREATE POLICY "automations_v2_insert" ON public.automations_v2
  FOR INSERT WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin')
  );

CREATE POLICY "automations_v2_update" ON public.automations_v2
  FOR UPDATE USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin')
  );

CREATE POLICY "automations_v2_delete" ON public.automations_v2
  FOR DELETE USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin')
  );

-- ─── 2. automation_executions ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.automations_v2(id) ON DELETE CASCADE,
  n8n_execution_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','running','success','error','warning','cancelled'
  )),
  trigger_mode TEXT NOT NULL CHECK (trigger_mode IN (
    'scheduled','manual','webhook','event'
  )),
  triggered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  steps JSONB DEFAULT '[]',
  error_message TEXT,
  error_detail JSONB,
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_executions_automation ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON public.automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON public.automation_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_trigger ON public.automation_executions(trigger_mode);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "executions_select" ON public.automation_executions
  FOR SELECT USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin','editor')
  );

CREATE POLICY "executions_insert" ON public.automation_executions
  FOR INSERT WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin')
  );

CREATE POLICY "executions_update" ON public.automation_executions
  FOR UPDATE USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid())
    IN ('super_admin','admin')
  );

-- ─── 3. automation_templates ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN (
    'content_pipeline','email_campaigns','audit_security',
    'process_internal','integrations'
  )),
  icon TEXT,
  config_preset JSONB NOT NULL DEFAULT '{}',
  workflow_json JSONB,
  is_system BOOLEAN DEFAULT false,
  popularity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.automation_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_system ON public.automation_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_templates_pop ON public.automation_templates(popularity DESC);

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON public.automation_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "templates_manage" ON public.automation_templates
  FOR ALL USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ─── 4. automation_audit_log ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_audit_log (
  id BIGSERIAL PRIMARY KEY,
  automation_id UUID REFERENCES public.automations_v2(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_automation ON public.automation_audit_log(automation_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.automation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.automation_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.automation_audit_log(created_at DESC);

ALTER TABLE public.automation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON public.automation_audit_log
  FOR SELECT USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

-- Audit log INSERT is done via service_role from Edge Functions (bypasses RLS)

-- ─── 5. Seed system templates ───────────────────────────────
INSERT INTO public.automation_templates (name, description, category, icon, config_preset, is_system) VALUES
  ('Coleta RSS Automática', 'Coleta notícias de feeds RSS a cada 30 min, deduplica e armazena para curadoria', 'content_pipeline', 'Rss', '{"rss_feeds":[],"keywords":[],"ai_prompt":"","target_tone":"informativo","auto_publish":false,"review_required":true}', true),
  ('Escrita AI de Posts', 'Gera posts automaticamente a partir de clusters de notícias usando IA', 'content_pipeline', 'PenTool', '{"cluster_min_confidence":70,"tone":"vision7","max_posts_per_run":5,"include_sources":true}', true),
  ('Newsletter Semanal', 'Compila os melhores posts da semana e envia newsletter automática', 'email_campaigns', 'Send', '{"template_id":"weekly_digest","recipient_list":"subscribers","schedule_cron":"0 9 * * 1","throttle_per_hour":100}', true),
  ('Alerta de Post Publicado', 'Notifica subscritores quando um novo post é publicado', 'email_campaigns', 'Bell', '{"template_id":"post_alert","recipient_list":"subscribers","throttle_per_hour":200}', true),
  ('Rotação de Chaves API', 'Verifica expiração de chaves e notifica admin para rotação', 'audit_security', 'KeyRound', '{"check_type":"key_rotation","alert_channels":["email","in_app"],"severity_threshold":"high"}', true),
  ('Auditoria de Acessos', 'Revisa logs de acesso e identifica anomalias', 'audit_security', 'FileSearch', '{"check_type":"access_audit","alert_channels":["email"],"severity_threshold":"medium","retention_days":90}', true),
  ('Limpeza de Staging', 'Remove registros processados com mais de 30 dias', 'process_internal', 'Trash2', '{"process_type":"cleanup","target_tables":["news_staging"],"retention_policy":"30d","notify_on_complete":true}', true),
  ('Health Check Geral', 'Verifica saúde de todos os serviços (n8n, Supabase, SMTP)', 'process_internal', 'HeartPulse', '{"process_type":"maintenance","check_services":["n8n","supabase","smtp"],"notify_on_complete":true}', true),
  ('Publicar em Redes Sociais', 'Publica automaticamente posts aprovados no Twitter/LinkedIn', 'integrations', 'Share2', '{"service":"twitter","auth_type":"oauth2","sync_direction":"push"}', true),
  ('Webhook Custom', 'Recebe payloads de serviços externos e processa automaticamente', 'integrations', 'Webhook', '{"service":"custom","auth_type":"bearer","sync_direction":"pull"}', true)
ON CONFLICT DO NOTHING;

-- ─── 6. Migrate v1 → v2 ────────────────────────────────────
-- Copy existing automations to v2 (if v1 table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations' AND table_schema = 'public') THEN
    INSERT INTO public.automations_v2 (
      name, description, category, trigger_type, workflow_id,
      status, interval_minutes, config, created_by, created_at, updated_at
    )
    SELECT
      a.name,
      'Migrado da v1' AS description,
      'content_pipeline' AS category,
      'schedule' AS trigger_type,
      a.workflow_id,
      CASE WHEN a.active THEN 'active' ELSE 'paused' END AS status,
      a.interval AS interval_minutes,
      jsonb_build_object(
        'rss_feeds', COALESCE(to_jsonb(a.rss_feeds), '[]'::jsonb),
        'keywords', COALESCE(to_jsonb(a.keywords), '[]'::jsonb),
        'ai_prompt', COALESCE(a.prompt, ''),
        'target_tone', 'informativo',
        'auto_publish', false,
        'review_required', true
      ) AS config,
      a.created_by,
      a.created_at,
      a.updated_at
    FROM public.automations a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.automations_v2 v2
      WHERE v2.name = a.name AND v2.workflow_id = a.workflow_id
    );
  END IF;
END $$;

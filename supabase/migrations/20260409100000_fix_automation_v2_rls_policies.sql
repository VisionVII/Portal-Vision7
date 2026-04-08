-- ============================================================
-- Fix: Automation Engine v2 — RLS policies
-- The original migration used raw_user_meta_data->>'role'
-- but this app stores roles in the user_roles table.
-- This migration drops the broken policies and recreates
-- them using the user_roles table (consistent with all other
-- migrations in this project).
-- ============================================================

-- ─── 1. automations_v2 ─────────────────────────────────────
DROP POLICY IF EXISTS "automations_v2_select" ON public.automations_v2;
DROP POLICY IF EXISTS "automations_v2_insert" ON public.automations_v2;
DROP POLICY IF EXISTS "automations_v2_update" ON public.automations_v2;
DROP POLICY IF EXISTS "automations_v2_delete" ON public.automations_v2;

CREATE POLICY "automations_v2_select" ON public.automations_v2
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
        AND is_active = true
    )
  );

CREATE POLICY "automations_v2_insert" ON public.automations_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

CREATE POLICY "automations_v2_update" ON public.automations_v2
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

CREATE POLICY "automations_v2_delete" ON public.automations_v2
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

-- ─── 2. automation_executions ───────────────────────────────
DROP POLICY IF EXISTS "executions_select" ON public.automation_executions;
DROP POLICY IF EXISTS "executions_insert" ON public.automation_executions;
DROP POLICY IF EXISTS "executions_update" ON public.automation_executions;

CREATE POLICY "executions_select" ON public.automation_executions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'editor')
        AND is_active = true
    )
  );

CREATE POLICY "executions_insert" ON public.automation_executions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

CREATE POLICY "executions_update" ON public.automation_executions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

-- ─── 3. automation_templates ────────────────────────────────
DROP POLICY IF EXISTS "templates_select" ON public.automation_templates;
DROP POLICY IF EXISTS "templates_manage" ON public.automation_templates;

CREATE POLICY "templates_select" ON public.automation_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "templates_manage" ON public.automation_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- ─── 4. automation_audit_log ────────────────────────────────
DROP POLICY IF EXISTS "audit_select" ON public.automation_audit_log;

CREATE POLICY "audit_select" ON public.automation_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- ─── 5. Grant permissions ───────────────────────────────────
GRANT SELECT ON public.automations_v2 TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.automations_v2 TO authenticated;
GRANT ALL ON public.automations_v2 TO service_role;

GRANT SELECT ON public.automation_executions TO authenticated;
GRANT INSERT, UPDATE ON public.automation_executions TO authenticated;
GRANT ALL ON public.automation_executions TO service_role;

GRANT SELECT ON public.automation_templates TO authenticated;
GRANT ALL ON public.automation_templates TO service_role;

GRANT SELECT ON public.automation_audit_log TO authenticated;
GRANT ALL ON public.automation_audit_log TO service_role;

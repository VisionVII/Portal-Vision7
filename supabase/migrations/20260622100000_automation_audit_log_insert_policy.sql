-- Allow admin/super_admin to write audit entries directly from the client.
-- automation_audit_log existed with SELECT-only RLS (INSERT was reserved for
-- service_role), so the AuditLogViewer tab had no producer and stayed empty.
-- Mirrors the pattern already used by admin_notifications: direct INSERT for
-- authenticated users gated by has_role(), no dedicated Edge Function needed.

DROP POLICY IF EXISTS "audit_insert" ON public.automation_audit_log;

CREATE POLICY "audit_insert" ON public.automation_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

GRANT INSERT ON public.automation_audit_log TO authenticated;

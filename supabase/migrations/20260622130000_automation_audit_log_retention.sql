-- NFR-006: automation_audit_log retained for 90 days. Allow admin/super_admin
-- to delete their own stale entries so the client-side opportunistic cleanup
-- in src/services/auditLog.ts (same pattern as the rate-limit log cleanup)
-- can prune rows older than 90 days without needing a service-role function.

DROP POLICY IF EXISTS "audit_delete" ON public.automation_audit_log;

CREATE POLICY "audit_delete" ON public.automation_audit_log
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
        AND is_active = true
    )
  );

GRANT DELETE ON public.automation_audit_log TO authenticated;

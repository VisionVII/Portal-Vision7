import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { AutomationV2 } from '@/types/automation';

const DIFF_FIELDS = [
  'name',
  'description',
  'category',
  'triggerType',
  'workflowId',
  'intervalMinutes',
  'cronExpression',
  'status',
  'config',
] as const satisfies readonly (keyof AutomationV2)[];

/** Field-level diff between the previous and updated automation, changed fields only. */
export function diffAutomation(
  before: AutomationV2 | null,
  after: AutomationV2,
): Record<string, { from: unknown; to: unknown }> {
  if (!before) return {};
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of DIFF_FIELDS) {
    const fromValue = before[field];
    const toValue = after[field];
    if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
      diff[field] = { from: fromValue, to: toValue };
    }
  }
  return diff;
}

export type AutomationAuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'paused'
  | 'executed'
  | 'bulk_activated'
  | 'bulk_paused'
  | 'bulk_deleted';

/**
 * Writes one row to automation_audit_log. RLS restricts INSERT to
 * admin/super_admin, matching who can already mutate automations_v2 — so
 * this never throws for users without permission, it just won't insert.
 * Failures are logged but swallowed: a missed audit entry must not block
 * the action the user actually came here to do.
 */
export async function logAutomationAction(
  action: AutomationAuditAction,
  automationId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const actor = userData?.user;

    const { error } = await supabase.from('automation_audit_log').insert({
      automation_id: automationId,
      action,
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      details: details as Json,
    });

    if (error) console.error('[auditLog] insert failed', error);

    // Best-effort retention (NFR-006): prune entries older than 90 days.
    // No cron/pg_cron in this project — same opportunistic pattern used for
    // automation_rate_limit_log, piggybacking on writes instead of a schedule.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    void supabase.from('automation_audit_log').delete().lt('created_at', ninetyDaysAgo);
  } catch (err) {
    console.error('[auditLog] unexpected error', err);
  }
}

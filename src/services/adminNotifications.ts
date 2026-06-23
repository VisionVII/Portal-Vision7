import { supabase } from '@/integrations/supabase/client';

export type AdminNotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotifyAdminInput {
  userId: string;
  title: string;
  message?: string;
  type?: AdminNotificationType;
  source?: string;
  link?: string;
}

/**
 * Writes one row to admin_notifications, surfaced by the bell in
 * DashboardHeader. Failures are logged but swallowed — a missed
 * notification must not block the action that triggered it.
 */
export async function notifyAdmin({
  userId,
  title,
  message,
  type = 'info',
  source,
  link,
}: NotifyAdminInput): Promise<void> {
  try {
    const { error } = await supabase.from('admin_notifications' as never).insert({
      user_id: userId,
      title,
      message: message ?? null,
      type,
      source: source ?? null,
      link: link ?? null,
    } as never);
    if (error) console.error('[adminNotifications] insert failed', error);
  } catch (err) {
    console.error('[adminNotifications] unexpected error', err);
  }
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminNotification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: 'info' | 'success' | 'warning' | 'error';
  source: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const QUERY_KEY = ['admin-notifications'];

/**
 * Track consecutive failures so we back off after the table proves unreachable.
 * Resets on any successful fetch so a deploy-time fix is picked up automatically.
 */
let consecutiveFailures = 0;
const MAX_FAILURES = 2;

export function useAdminNotifications(limit = 20) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    queryFn: async () => {
      if (consecutiveFailures >= MAX_FAILURES) return [] as AdminNotification[];

      const { data, error } = await supabase
        .from('admin_notifications' as never)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Table may not exist yet or RLS denies access — return empty gracefully
      if (error) {
        const code = error.code;
        const msg = error.message ?? '';
        if (code === '42P01' || msg.includes('does not exist') || code === 'PGRST204') {
          consecutiveFailures = MAX_FAILURES; // permanent — table missing
          return [] as AdminNotification[];
        }
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES) return [] as AdminNotification[];
        throw error;
      }

      consecutiveFailures = 0; // success — reset counter
      return (data ?? []) as unknown as AdminNotification[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchInterval: consecutiveFailures >= MAX_FAILURES ? false : 60_000,
    retry: (failureCount) => {
      if (consecutiveFailures >= MAX_FAILURES) return false;
      return failureCount < 1;
    },
  });

  const unreadCount = query.data?.filter((n) => !n.read).length ?? 0;

  return { ...query, unreadCount };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('admin_notifications' as never)
        .update({ read: true } as never)
        .eq('id', notificationId as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications' as never)
        .update({ read: true } as never)
        .eq('user_id', user!.id as never)
        .eq('read', false as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

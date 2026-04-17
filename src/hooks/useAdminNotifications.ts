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

/** Track whether the table is unreachable so we stop polling */
let tableUnavailable = false;

export function useAdminNotifications(limit = 20) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    queryFn: async () => {
      if (tableUnavailable) return [] as AdminNotification[];

      const { data, error } = await supabase
        .from('admin_notifications' as never)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Table may not exist yet or RLS denies access — return empty gracefully
      if (error) {
        const status = (error as { status?: number }).status;
        if (error.code === '42P01' || status === 404 || status === 403 || error.message?.includes('404')) {
          tableUnavailable = true;
          return [] as AdminNotification[];
        }
        throw error;
      }
      return (data ?? []) as unknown as AdminNotification[];
    },
    enabled: !!user?.id && !tableUnavailable,
    staleTime: 60_000,
    refetchInterval: tableUnavailable ? false : 60_000,
    retry: (failureCount, error) => {
      // Don't retry if table doesn't exist or access is denied
      const msg = (error as { message?: string })?.message ?? '';
      const status = (error as { status?: number })?.status;
      if (status === 404 || status === 403 || msg.includes('404') || msg.includes('42P01')) return false;
      return failureCount < 2;
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

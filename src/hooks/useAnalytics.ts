import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { isAllowed } from '@/cmp';

export interface AnalyticsEventData {
  event_type: string;
  event_data?: Json | null;
  session_id?: string;
  referrer?: string;
}

// Track analytics event (respects CMP consent)
export const useTrackEvent = () => {
  return useMutation({
    mutationFn: async (eventData: AnalyticsEventData) => {
      // Only track if analytics consent is granted
      if (!isAllowed('analytics')) return;

      const eventPayload = {
        ...eventData,
        event_data: eventData.event_data ?? null,
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
      };

      const { error } = await supabase
        .from('analytics_events')
        .insert([eventPayload]);

      if (error) throw error;
    },
  });
};

export interface TopPage {
  path: string;
  count: number;
}

// Get analytics summary
export const useAnalyticsSummary = (days = 30) => {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, created_at, event_data')
        .gte('created_at', startDate.toISOString())
        .limit(10000);

      if (error) throw error;

      // Group by event type and count
      const summary = data?.reduce((acc, event) => {
        const type = event.event_type;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type]++;
        return acc;
      }, {} as Record<string, number>) || {};

      // Calculate daily trends
      const dailyData = data?.reduce((acc, event) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {};
        }
        const type = event.event_type;
        if (!acc[date][type]) {
          acc[date][type] = 0;
        }
        acc[date][type]++;
        return acc;
      }, {} as Record<string, Record<string, number>>) || {};

      // Top pages — cada page_view já guarda o path em event_data, só nunca
      // tinha sido lido de volta.
      const pageCounts = data?.reduce((acc, event) => {
        if (event.event_type !== 'page_view') return acc;
        const path = (event.event_data as { path?: string } | null)?.path;
        if (!path) return acc;
        acc[path] = (acc[path] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topPages: TopPage[] = Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return { summary, dailyData, topPages };
    },
  });
};
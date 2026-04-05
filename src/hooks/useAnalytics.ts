import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Json | null;
  user_id: string | null;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

export interface AnalyticsEventData {
  event_type: string;
  event_data?: Json | null;
  session_id?: string;
  referrer?: string;
}

// Track analytics event
export const useTrackEvent = () => {
  return useMutation({
    mutationFn: async (eventData: AnalyticsEventData) => {
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

// Get analytics data (admin only)
export const useAnalytics = (eventType?: string, days = 30) => {
  return useQuery({
    queryKey: ['analytics', eventType, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AnalyticsEvent[];
    },
  });
};

// Get analytics summary
export const useAnalyticsSummary = (days = 30) => {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString());

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

      return { summary, dailyData };
    },
  });
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
}

export type SiteSettingsMap = Record<string, string | null>;

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404') && !/AbortError|signal is aborted/i.test(error.message ?? '')) {
          console.warn('useSiteSettings supabase query error', error);
        }
        return {} as SiteSettingsMap;
      }
      const settings: SiteSettingsMap = {};
      (data as SiteSetting[])?.forEach(s => { settings[s.key] = s.value; });
      return settings;
    },
    retry: 1,
    staleTime: 120_000,
  });
};

export const useUpdateSiteSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
};

export const useUpdateSiteSettingsBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: Array<{ key: string; value: string | null }>) => {
      if (!entries.length) return;

      const payload = entries.map(({ key, value }) => ({
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(payload, { onConflict: 'key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
};

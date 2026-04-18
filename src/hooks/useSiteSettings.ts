import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
}

export type SiteSettingsMap = Record<string, string | null>;

interface UseSiteSettingsOptions {
  keys?: string[];
  includePrivate?: boolean;
}

export const PUBLIC_SITE_SETTING_KEYS = [
  'site_name',
  'logo_url',
  'course_partner_meta',
  'section_page_banners',
  'home_page_config',
];

const SITE_SETTINGS_CACHE_KEY = 'v7_public_settings_cache';

function readSettingsCache(): SiteSettingsMap | undefined {
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SiteSettingsMap) : undefined;
  } catch {
    return undefined;
  }
}

function writeSettingsCache(data: SiteSettingsMap) {
  try {
    localStorage.setItem(SITE_SETTINGS_CACHE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

const normalizeSiteSettingKeys = (keys?: string[]) => Array.from(new Set((keys?.length ? keys : PUBLIC_SITE_SETTING_KEYS)
  .map((key) => key.trim())
  .filter(Boolean))).sort();

export const useSiteSettings = (options: UseSiteSettingsOptions = {}) => {
  const { keys, includePrivate = false } = options;
  const keysToLoad = includePrivate ? [] : normalizeSiteSettingKeys(keys);

  return useQuery({
    queryKey: ['site-settings', includePrivate ? 'all' : 'public', ...keysToLoad],
    queryFn: async () => {
      if (!includePrivate && keysToLoad.length === 0) {
        return {} as SiteSettingsMap;
      }

      let query = supabase
        .from('site_settings')
        .select('id, key, value, updated_at')
        .order('key', { ascending: true });

      if (!includePrivate) {
        query = query.in('key', keysToLoad);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404') && !/AbortError|signal is aborted/i.test(error.message ?? '')) {
          console.warn('useSiteSettings supabase query error', error);
        }
        return {} as SiteSettingsMap;
      }
      const settings: SiteSettingsMap = {};
      (data as SiteSetting[])?.forEach(s => { settings[s.key] = s.value; });
      if (!includePrivate) writeSettingsCache(settings);
      return settings;
    },
    initialData: !includePrivate ? readSettingsCache() : undefined,
    initialDataUpdatedAt: 0, // treat cached data as stale so a background refetch always runs
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

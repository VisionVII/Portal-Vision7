import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface MonetizationSetting {
  id: string;
  setting_key: string;
  setting_value: Json | null;
  description: string | null;
  updated_at: string;
}

// Get all monetization settings
export const useMonetizationSettings = () => {
  return useQuery({
    queryKey: ['monetization-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('*')
        .order('setting_key', { ascending: true });

      if (error) throw error;
      return data as MonetizationSetting[];
    },
  });
};

// Get specific monetization setting
export const useMonetizationSetting = (key: string) => {
  return useQuery({
    queryKey: ['monetization-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('*')
        .eq('setting_key', key)
        .maybeSingle();

      if (error) throw error;
      return data as MonetizationSetting | null;
    },
    enabled: !!key,
  });
};

// Update monetization setting
export const useUpdateMonetizationSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value, description }: {
      key: string;
      value: Json | null;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          description: description || null,
        }, {
          onConflict: 'setting_key'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monetization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['monetization-setting'] });
    },
  });
};

// Check if ads are enabled
export const useAdsEnabled = () => {
  return useQuery({
    queryKey: ['ads-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('setting_value')
        .eq('setting_key', 'ads_enabled')
        .maybeSingle();

      if (error) throw error;
      const settingValue = data?.setting_value as Record<string, unknown> | null;
      return settingValue?.ads_enabled !== false; // Default to true
    },
  });
};

// Get ad slots configuration
export const useAdSlots = () => {
  return useQuery({
    queryKey: ['ad-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('setting_value')
        .eq('setting_key', 'ad_slots')
        .maybeSingle();

      if (error) throw error;
      const settingValue = data?.setting_value as Json | null;
      return (settingValue as { ad_slots?: string[] } | null)?.ad_slots || ['header', 'sidebar', 'content', 'footer'];
    },
  });
};

// Check if subscription is enabled
export const useSubscriptionEnabled = () => {
  return useQuery({
    queryKey: ['subscription-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('setting_value')
        .eq('setting_key', 'subscription_enabled')
        .maybeSingle();

      if (error) throw error;
      const settingValue = data?.setting_value as Json | null;
      return (settingValue as { subscription_enabled?: boolean } | null)?.subscription_enabled === true;
    },
  });
};

// Get premium features
export const usePremiumFeatures = () => {
  return useQuery({
    queryKey: ['premium-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monetization_settings')
        .select('setting_value')
        .eq('setting_key', 'premium_features')
        .maybeSingle();

      if (error) throw error;
      const settingValue = data?.setting_value as Json | null;
      return (settingValue as { premium_features?: unknown[] } | null)?.premium_features || [];
    },
  });
};
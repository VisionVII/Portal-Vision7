import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendNewsletterWelcome } from '@/services/email';

export const useSubscribeNewsletter = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email }]);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este email já está subscrito na newsletter.');
        }
        throw error;
      }

      // Send welcome email (fire-and-forget — don't block the subscription)
      sendNewsletterWelcome(email).catch((err) => {
        console.warn('[Newsletter] Failed to send welcome email:', err);
      });
    },
  });
};

export const useNewsletterSubscribers = () => {
  return useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useNewsletterSubscribers supabase query error', error);
        }
        return [];
      }
      return data ?? [];
    },
    retry: false,
  });
};

export const useNewsletterStats = () => {
  return useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('id, is_active');
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useNewsletterStats supabase query error', error);
        }
        return { total: 0, active: 0 };
      }
      
      const total = data?.length || 0;
      const active = data?.filter(s => s.is_active).length || 0;
      return { total, active };
    },
    retry: false,
  });
};

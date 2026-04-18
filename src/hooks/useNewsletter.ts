import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSubscribeNewsletter = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: normalizedEmail }]);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este email já está subscrito na newsletter.');
        }
        throw error;
      }

      // Dynamic import: keeps email templates out of the main bundle
      const { sendNewsletterWelcome } = await import('@/services/email');
      const { error: welcomeError } = await sendNewsletterWelcome(normalizedEmail);

      return {
        email: normalizedEmail,
        welcomeEmailSent: !welcomeError,
      };
    },
  });
};

export const useNewsletterSubscribers = () => {
  return useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('id, email, is_active, subscribed_at')
        .order('subscribed_at', { ascending: false })
        .limit(500);
      
      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useNewsletterSubscribers supabase query error', error?.message || 'unknown');
        }
        return [];
      }
      return data ?? [];
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useNewsletterStats = () => {
  return useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const [totalRes, activeRes] = await Promise.all([
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      if (totalRes.error) {
        if (totalRes.error.code !== 'PGRST116' && !totalRes.error.message?.includes('404')) {
          console.warn('useNewsletterStats supabase query error', totalRes.error?.message || 'unknown');
        }
        return { total: 0, active: 0 };
      }

      return { total: totalRes.count ?? 0, active: activeRes.count ?? 0 };
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

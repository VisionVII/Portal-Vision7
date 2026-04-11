import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendNewsletterWelcome } from '@/services/email';

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
          console.warn('useNewsletterSubscribers supabase query error', error);
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
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

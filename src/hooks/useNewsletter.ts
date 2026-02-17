import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      
      if (error) throw error;
      return data;
    },
  });
};

export const useNewsletterStats = () => {
  return useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('id, is_active');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const active = data?.filter(s => s.is_active).length || 0;
      return { total, active };
    },
  });
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CrmContact = Database['public']['Tables']['crm_contacts']['Row'];
type CrmContactInsert = Database['public']['Tables']['crm_contacts']['Insert'];
type CrmTag = Database['public']['Tables']['crm_tags']['Row'];
type CrmInteraction = Database['public']['Tables']['crm_interactions']['Row'];
type CrmDeal = Database['public']['Tables']['crm_deals']['Row'];
type CrmDealInsert = Database['public']['Tables']['crm_deals']['Insert'];
type CrmContactType = Database['public']['Enums']['crm_contact_type'];
type CrmDealStage = Database['public']['Enums']['crm_deal_stage'];
type CrmInteractionType = Database['public']['Enums']['crm_interaction_type'];

export type { CrmContact, CrmTag, CrmInteraction, CrmDeal, CrmContactType, CrmDealStage, CrmInteractionType };

/* ── Contacts ── */

export const useCrmContacts = () =>
  useQuery({
    queryKey: ['crm-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CrmContact[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useCrmContactStats = () =>
  useQuery({
    queryKey: ['crm-contact-stats'],
    queryFn: async () => {
      const [totalRes, activeRes, leadsRes] = await Promise.all([
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('contact_type', 'lead'),
      ]);
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        leads: leadsRes.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

export const useCreateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: CrmContactInsert) => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data as CrmContact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact-stats'] });
    },
  });
};

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmContact> & { id: string }) => {
      const { error } = await supabase.from('crm_contacts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact-stats'] });
    },
  });
};

export const useDeleteContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-contacts'] });
      qc.invalidateQueries({ queryKey: ['crm-contact-stats'] });
    },
  });
};

/* ── Tags ── */

export const useCrmTags = () =>
  useQuery({
    queryKey: ['crm-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_tags').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as CrmTag[];
    },
    staleTime: 10 * 60 * 1000,
  });

export const useContactTags = (contactId: string | null) =>
  useQuery({
    queryKey: ['crm-contact-tags', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('crm_contact_tags')
        .select('tag_id')
        .eq('contact_id', contactId);
      if (error) throw error;
      return (data ?? []).map((r) => r.tag_id);
    },
    enabled: !!contactId,
  });

export const useToggleContactTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, tagId, add }: { contactId: string; tagId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from('crm_contact_tags').insert({ contact_id: contactId, tag_id: tagId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-contact-tags', vars.contactId] });
    },
  });
};

/* ── Interactions ── */

export const useContactInteractions = (contactId: string | null) =>
  useQuery({
    queryKey: ['crm-interactions', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CrmInteraction[];
    },
    enabled: !!contactId,
  });

export const useAddInteraction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interaction: {
      contact_id: string;
      interaction_type: CrmInteractionType;
      subject?: string;
      body?: string;
    }) => {
      const { error } = await supabase.from('crm_interactions').insert(interaction);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['crm-interactions', vars.contact_id] });
    },
  });
};

/* ── Deals ── */

export const useCrmDeals = () =>
  useQuery({
    queryKey: ['crm-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_deals')
        .select('*, crm_contacts(email, name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as (CrmDeal & { crm_contacts: { email: string; name: string | null } })[];
    },
    staleTime: 2 * 60 * 1000,
  });

export const useCreateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deal: CrmDealInsert) => {
      const { data, error } = await supabase.from('crm_deals').insert(deal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    },
  });
};

export const useUpdateDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmDeal> & { id: string }) => {
      const { error } = await supabase.from('crm_deals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-deals'] });
    },
  });
};

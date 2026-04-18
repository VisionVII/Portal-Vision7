import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Enums } from '@/integrations/supabase/types';

export type AppRole = Enums<'app_role'>;

export interface RegistrationInvite {
  id: string;
  email: string;
  role: AppRole;
  invited_at: string;
  expires_at: string;
  status: string | null;
  token: string;
  used_at: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_at: string | null;
  expires_at: string | null;
  is_active: boolean | null;
  reason: string | null;
}

const buildToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const useRegistrationInvites = () => {
  return useQuery({
    queryKey: ['registration-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_invites')
        .select('id, email, role, token, status, invited_by, invited_at, used_at, expires_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useRegistrationInvites supabase query error', error?.message || 'unknown');
        }
        return [] as RegistrationInvite[];
      }

      return (data as RegistrationInvite[]) ?? [];
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
  });
};

export const useRoleAssignments = () => {
  return useQuery({
    queryKey: ['role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, assigned_by, assigned_at, expires_at, is_active, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404')) {
          console.warn('useRoleAssignments supabase query error', error?.message || 'unknown');
        }
        return [] as UserRoleAssignment[];
      }

      return (data as UserRoleAssignment[]) ?? [];
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 60 * 1000,
  });
};

export const useCreateRegistrationInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      expiresAt,
    }: {
      email: string;
      role: AppRole;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase
        .from('registration_invites')
        .insert([{
          email,
          role,
          token: buildToken(),
          status: 'pending',
          invited_at: new Date().toISOString(),
          expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data as RegistrationInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-invites'] });
    },
  });
};

export const useExpireRegistrationInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('registration_invites')
        .update({ status: 'expired' })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-invites'] });
    },
  });
};

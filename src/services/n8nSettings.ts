import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON } from '@/integrations/supabase/client';

export type N8nCredentialRow = {
  id: string;
  key_name: string;
  expires_at: string;
  status: 'active' | 'inactive' | 'revoked';
  notes?: string | null;
  reminder_email?: string | null;
  remind_days_before: 7 | 30 | 60 | 90;
  last_reminder_sent_at?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
};

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sessao invalida. Faça login novamente.');
  return {
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON,
    'Content-Type': 'application/json',
  };
}

async function callSettings<T>(payload: unknown): Promise<T> {
  if (!SUPABASE_FUNCTIONS_URL) throw new Error('SUPABASE_FUNCTIONS_URL ausente.');

  const resp = await fetch(`${SUPABASE_FUNCTIONS_URL}/n8n-settings`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      if (body?.error) detail = `[${resp.status}] ${body.error}`;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return resp.json() as Promise<T>;
}

export async function listN8nCredentials() {
  const result = await callSettings<{ data: N8nCredentialRow[] }>({ action: 'list' });
  return result.data;
}

export async function createN8nCredential(payload: {
  keyName: string;
  value: string;
  expiresAt: string;
  notes?: string;
  reminderEmail?: string;
  remindDaysBefore: 7 | 30 | 60 | 90;
}) {
  const result = await callSettings<{ data: N8nCredentialRow }>({ action: 'create', ...payload });
  return result.data;
}

export async function activateN8nCredential(id: string) {
  await callSettings<{ success: boolean }>({ action: 'activate', id });
}

export async function revokeN8nCredential(id: string) {
  await callSettings<{ success: boolean }>({ action: 'revoke', id });
}

export async function triggerN8nCredentialReminders() {
  await callSettings<{ success: boolean; sent: number }>({ action: 'send-reminders' });
}

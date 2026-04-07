import type { N8nExecution, N8nWorkflow } from '@/types/automation';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { SUPABASE_ANON } from '@/integrations/supabase/client';

type N8nRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

async function getEdgeAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  let accessToken = session?.access_token;
  const exp = accessToken ? getJwtExp(accessToken) : null;
  const now = Math.floor(Date.now() / 1000);

  if (!accessToken || (exp !== null && exp <= now + 30)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(`Nao foi possivel renovar a sessao: ${refreshError.message}`);
    }
    accessToken = refreshed.session?.access_token;
  }

  if (!accessToken) {
    throw new Error('Sessao invalida ou expirada. Inicie sessao novamente.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (SUPABASE_ANON) {
    headers.apikey = SUPABASE_ANON;
  }

  return headers;
}

/**
 * Extract a human-readable message from an HTTP response.
 */
async function extractHttpError(resp: Response): Promise<string> {
  const status = resp.status;
  try {
    const body = await resp.clone().json();
    const msg = body?.error ?? body?.message ?? body?.msg ?? '';
    if (msg) return `[${status}] ${msg}`;
  } catch { /* body not JSON */ }
  try {
    const text = await resp.clone().text();
    if (text) return `[${status}] ${text.slice(0, 200)}`;
  } catch { /* body consumed */ }
  return `Edge Function retornou HTTP ${status}`;
}

async function callN8nProxy(payload: unknown): Promise<unknown> {
  if (!SUPABASE_FUNCTIONS_URL) {
    throw new Error('SUPABASE_FUNCTIONS_URL ausente. Verifique VITE_SUPABASE_URL.');
  }

  const endpoint = `${SUPABASE_FUNCTIONS_URL}/n8n-proxy`;
  const headers = await getEdgeAuthHeaders();

  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown-origin';
    throw new Error(`Falha de rede/CORS ao contactar Edge Function. Verifique ALLOWED_ORIGINS e VITE_SUPABASE_URL. origin=${origin} endpoint=${endpoint}`);
  }

  if (!resp.ok) {
    const detail = await extractHttpError(resp);
    throw new Error(detail);
  }

  return resp.json();
}

/**
 * All n8n calls go through the Supabase Edge Function "n8n-proxy".
 * The API key is kept server-side — never exposed to the browser.
 */
const n8nRequest = async <T>(path: string, options: N8nRequestOptions = {}): Promise<T> => {
  const { method, body, query } = options;
  const data = await callN8nProxy({ path, method: method || 'GET', body, query });
  return data as T;
};

const normalizeCollection = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const objectPayload = payload as { data?: unknown; results?: unknown };
    if (Array.isArray(objectPayload.data)) return objectPayload.data as T[];
    if (Array.isArray(objectPayload.results)) return objectPayload.results as T[];
  }
  return [];
};

/** Static info — the real connectivity is tested via checkN8nHealth(). */
export const getN8nConfigStatus = () => ({
  apiKeyConfigured: true,
});

/** Pings the n8n instance through the Edge Function proxy. */
export const checkN8nHealth = async (): Promise<{
  status: 'connected' | 'error' | 'unreachable';
  detail?: string;
  httpStatus?: number;
}> => {
  try {
    const data = await callN8nProxy({ path: '/health' });
    console.info('[n8n-health] success:', data);
    return data as { status: 'connected' | 'error' | 'unreachable' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.warn('[n8n-health] exception:', msg);
    const match = msg.match(/^\[(\d{3})\]/);
    const httpStatus = match ? Number(match[1]) : undefined;
    return { status: 'unreachable', detail: msg, httpStatus };
  }
};

export const getWorkflows = async () => {
  const payload = await n8nRequest<unknown>('/api/v1/workflows', {
    query: { excludePinnedData: true },
  });
  return normalizeCollection<N8nWorkflow>(payload);
};

export const getWorkflowById = async (id: string) => {
  return n8nRequest<N8nWorkflow>(`/api/v1/workflows/${id}`, {
    query: { excludePinnedData: true },
  });
};

export const activateWorkflow = async (id: string) => {
  return n8nRequest(`/api/v1/workflows/${id}/activate`, { method: 'POST' });
};

export const deactivateWorkflow = async (id: string) => {
  return n8nRequest(`/api/v1/workflows/${id}/deactivate`, { method: 'POST' });
};

export const executeWorkflow = async (id: string) => {
  throw new Error('A API publica do n8n nao expoe execucao manual de workflow neste ambiente. Use um trigger/webhook do proprio workflow para disparo manual.');
};

export const getExecutions = async (limit = 20) => {
  const payload = await n8nRequest<unknown>('/api/v1/executions', {
    query: { limit, includeData: true },
  });
  return normalizeCollection<N8nExecution>(payload);
};

export const getExecutionById = async (id: string) => {
  return n8nRequest<N8nExecution>(`/api/v1/executions/${id}`);
};

import type { N8nExecution, N8nWorkflow } from '@/types/automation';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { SUPABASE_ANON } from '@/integrations/supabase/client';

type N8nRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

async function getEdgeAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('Sessao invalida ou expirada. Inicie sessao novamente.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON,
  };
}

/**
 * Extract a human-readable message from a Supabase FunctionsHttpError.
 * error.context is a Response object — body must be read async.
 */
async function extractEdgeFunctionError(error: { name?: string; message?: string; context?: unknown }): Promise<string> {
  if (error?.name === 'FunctionsFetchError' || /Failed to send a request to the Edge Function/i.test(error?.message ?? '')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown-origin';
    const endpoint = SUPABASE_FUNCTIONS_URL ? `${SUPABASE_FUNCTIONS_URL}/n8n-proxy` : 'unknown-functions-url';
    return `Falha de rede/CORS ao contactar Edge Function. Verifique ALLOWED_ORIGINS e VITE_SUPABASE_URL. origin=${origin} endpoint=${endpoint}`;
  }

  const resp = error.context;
  if (resp instanceof Response) {
    const status = resp.status;
    try {
      const body = await resp.clone().json();
      const msg = body?.error ?? body?.message ?? body?.msg ?? '';
      if (msg) return `[${status}] ${msg}`;
    } catch { /* body not JSON */ }
    try {
      const text = await resp.clone().text();
      if (text) return `[${status}] ${text.slice(0, 200)}`;
    } catch { /* body already consumed */ }
    return `Edge Function retornou HTTP ${status}`;
  }
  return error.message || 'Falha na API do n8n';
}

/**
 * All n8n calls go through the Supabase Edge Function "n8n-proxy".
 * The API key is kept server-side — never exposed to the browser.
 */
const n8nRequest = async <T>(path: string, options: N8nRequestOptions = {}): Promise<T> => {
  const { method, body, query } = options;
  const headers = await getEdgeAuthHeaders();

  const { data, error } = await supabase.functions.invoke('n8n-proxy', {
    headers,
    body: { path, method: method || 'GET', body, query },
  });

  if (error) {
    const detail = await extractEdgeFunctionError(error);
    throw new Error(detail);
  }

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
    const headers = await getEdgeAuthHeaders();
    const { data, error } = await supabase.functions.invoke('n8n-proxy', {
      headers,
      body: { path: '/health' },
    });
    if (error) {
      const detail = await extractEdgeFunctionError(error);
      const httpStatus = error.context instanceof Response ? error.context.status : undefined;
      console.warn('[n8n-health] error:', { detail, httpStatus, errorName: error.name, errorMessage: error.message });
      return { status: 'unreachable', detail, httpStatus };
    }
    console.info('[n8n-health] success:', data);
    return data as { status: 'connected' | 'error' | 'unreachable' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.warn('[n8n-health] exception:', msg);
    return { status: 'unreachable', detail: msg };
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

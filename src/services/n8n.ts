import type { N8nExecution, N8nWorkflow } from '@/types/automation';
import { supabase } from '@/integrations/supabase/client';

type N8nRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

/**
 * All n8n calls go through the Supabase Edge Function "n8n-proxy".
 * The API key is kept server-side — never exposed to the browser.
 */
const n8nRequest = async <T>(path: string, options: N8nRequestOptions = {}): Promise<T> => {
  const { method, body, query } = options;

  const { data, error } = await supabase.functions.invoke('n8n-proxy', {
    body: { path, method: method || 'GET', body, query },
  });

  if (error) {
    // FunctionsHttpError.context contains the parsed JSON body from the Edge Function
    const ctx = (error as Record<string, unknown>).context as Record<string, unknown> | undefined;
    const detail = ctx?.error ?? ctx?.message ?? error.message;
    throw new Error(String(detail) || 'Falha na API do n8n');
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
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('n8n-proxy', {
      body: { path: '/health' },
    });
    if (error) {
      const ctx = (error as Record<string, unknown>).context as Record<string, unknown> | undefined;
      const detail = String(ctx?.error ?? ctx?.message ?? error.message);
      console.warn('[n8n-health]', detail);
      return { status: 'unreachable', detail };
    }
    return data as { status: 'connected' | 'error' | 'unreachable' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.warn('[n8n-health]', msg);
    return { status: 'unreachable', detail: msg };
  }
};

export const getWorkflows = async () => {
  const payload = await n8nRequest<unknown>('/rest/workflows');
  return normalizeCollection<N8nWorkflow>(payload);
};

export const getWorkflowById = async (id: string) => {
  return n8nRequest<N8nWorkflow>(`/rest/workflows/${id}`);
};

export const activateWorkflow = async (id: string) => {
  return n8nRequest(`/rest/workflows/${id}/activate`, { method: 'POST' });
};

export const deactivateWorkflow = async (id: string) => {
  return n8nRequest(`/rest/workflows/${id}/deactivate`, { method: 'POST' });
};

export const executeWorkflow = async (id: string) => {
  return n8nRequest(`/rest/workflows/${id}/run`, { method: 'POST' });
};

export const getExecutions = async (limit = 20) => {
  const payload = await n8nRequest<unknown>('/rest/executions', {
    query: { limit, includeData: true },
  });
  return normalizeCollection<N8nExecution>(payload);
};

export const getExecutionById = async (id: string) => {
  return n8nRequest<N8nExecution>(`/rest/executions/${id}`);
};

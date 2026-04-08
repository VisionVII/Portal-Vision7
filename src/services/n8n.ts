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

  if (!accessToken) {
    throw new Error('Sessao invalida ou expirada. Inicie sessao novamente.');
  }

  if (exp !== null && exp <= now + 30) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      if (/invalid refresh token|refresh token not found/i.test(refreshError.message)) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Sessao invalida no navegador. Faça login novamente.');
      }
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
    return data as { status: 'connected' | 'error' | 'unreachable'; detail?: string; httpStatus?: number };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.warn('[n8n-health] exception:', msg);
    const match = msg.match(/^\[(\d{3})\]/);
    const httpStatus = match ? Number(match[1]) : undefined;
    const detail = /abort|timeout/i.test(msg)
      ? 'Timeout ao contactar o n8n. A instância pode estar a arrancar no Render ou indisponível.'
      : msg;
    return { status: 'unreachable', detail, httpStatus };
  }
};

export const getWorkflows = async () => {
  const payload = await n8nRequest<unknown>('/api/v1/workflows', {
    query: { excludePinnedData: true },
  });
  return normalizeCollection<N8nWorkflow>(payload);
};

export const getWorkflowById = async (id: string) => {
  return n8nRequest<N8nWorkflow>(`/api/v1/workflows/${id}`);
};

export const activateWorkflow = async (id: string) => {
  return n8nRequest(`/api/v1/workflows/${id}/activate`, { method: 'POST' });
};

export const deactivateWorkflow = async (id: string) => {
  return n8nRequest(`/api/v1/workflows/${id}/deactivate`, { method: 'POST' });
};

export const executeWorkflow = async (id: string): Promise<{ executed: boolean; method: string }> => {
  // Attempt 1 & 2: Standard n8n API execution endpoints (requires Manual Trigger node)
  const apiAttempts = [
    `/api/v1/workflows/${id}/run`,
    `/api/v1/workflows/${id}/execute`,
  ];

  let lastError = '';

  for (const path of apiAttempts) {
    try {
      await n8nRequest(path, { method: 'POST' });
      return { executed: true, method: 'api-run' };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!/\[(404|405|501)\]/.test(lastError)) {
        throw new Error(`Falha na execução: ${lastError}`);
      }
    }
  }

  // Attempt 3: POST /api/v1/executions with workflowId (n8n >= 1.62)
  try {
    await n8nRequest('/api/v1/executions', {
      method: 'POST',
      body: { workflowId: id },
    });
    return { executed: true, method: 'api-executions' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (!/\[(400|404|405|422|501)\]/.test(msg)) {
      throw new Error(`Falha na execução: ${msg}`);
    }
  }

  // Attempt 4: Fetch workflow details and try webhook trigger
  try {
    const wf = await getWorkflowById(id);
    const webhookPath = extractWebhookPath(wf);
    if (webhookPath) {
      await n8nRequest(`/webhook/${webhookPath}`, { method: 'POST' });
      return { executed: true, method: 'webhook' };
    }
  } catch {
    // webhook attempt failed
  }

  // All methods failed — this is a cron-only workflow
  throw new CronWorkflowError(id, lastError);
};

/** Specific error for cron/schedule-only workflows that can't be manually triggered */
export class CronWorkflowError extends Error {
  public readonly workflowId: string;
  constructor(workflowId: string, originalError: string) {
    super(
      `Workflow cron/schedule — executa automaticamente. ${originalError}`
    );
    this.name = 'CronWorkflowError';
    this.workflowId = workflowId;
  }
}

/**
 * Extract the webhook path from a workflow's node configuration.
 * Looks for Webhook or n8n-nodes-base.webhook trigger nodes.
 */
function extractWebhookPath(wf: N8nWorkflow): string | null {
  const nodes = wf.nodes as Array<{ type?: string; parameters?: Record<string, unknown>; webhookId?: string }> | undefined;
  if (!Array.isArray(nodes)) return null;

  for (const node of nodes) {
    if (
      node.type === 'n8n-nodes-base.webhook' ||
      node.type === 'n8n-nodes-base.webhookTrigger'
    ) {
      const path = node.parameters?.path;
      if (typeof path === 'string' && path) return path;
      if (node.webhookId) return node.webhookId;
    }
  }
  return null;
}

export const getExecutions = async (limit = 20) => {
  const payload = await n8nRequest<unknown>('/api/v1/executions', {
    query: { limit, includeData: true },
  });
  return normalizeCollection<N8nExecution>(payload);
};

export const getExecutionById = async (id: string) => {
  return n8nRequest<N8nExecution>(`/api/v1/executions/${id}`);
};

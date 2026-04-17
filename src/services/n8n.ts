import type { N8nExecution, N8nWorkflow } from '@/types/automation';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';
import { SUPABASE_ANON } from '@/integrations/supabase/client';

type N8nRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  suppressHttpWarningsForStatuses?: number[];
};

type N8nNodeLike = {
  type?: string;
  parameters?: Record<string, unknown>;
  webhookId?: string;
};

const SCHEDULE_TRIGGER_TYPES = new Set([
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.cron',
]);

const MANUAL_TRIGGER_TYPES = new Set([
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.executeWorkflowTrigger',
  'n8n-nodes-base.chatTrigger',
]);

const WEBHOOK_TRIGGER_TYPES = new Set([
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.webhookTrigger',
  'n8n-nodes-base.formTrigger',
]);

const reportedDuplicateWorkflowDecisions = new Set<string>();

function withStatusPrefix(status: number | undefined, message: string): string {
  const normalized = message.trim() || 'Erro desconhecido';
  if (!status) return normalized;
  return normalized.startsWith(`[${status}]`) ? normalized : `[${status}] ${normalized}`;
}

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
    if (msg) return withStatusPrefix(status, String(msg));
  } catch { /* body not JSON */ }
  try {
    const text = await resp.clone().text();
    if (text) return withStatusPrefix(status, text.slice(0, 200));
  } catch { /* body consumed */ }
  return withStatusPrefix(status, `Edge Function retornou HTTP ${status}`);
}

function shouldSuppressProxyWarning(httpStatus: number, suppressedStatuses?: number[]) {
  return Array.isArray(suppressedStatuses) && suppressedStatuses.includes(httpStatus);
}

async function callN8nProxy(payload: unknown, options: Pick<N8nRequestOptions, 'suppressHttpWarningsForStatuses'> = {}): Promise<unknown> {
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

  const data = await resp.clone().json().catch(async () => {
    const text = await resp.clone().text().catch(() => '');
    return text || null;
  });
  const proxyData = data && typeof data === 'object' && !Array.isArray(data)
    ? data as { error?: unknown; message?: unknown; httpStatus?: unknown }
    : null;
  const httpStatus = typeof proxyData?.httpStatus === 'number'
    ? proxyData.httpStatus
    : resp.status;
  const proxyErrorStr = typeof proxyData?.error === 'string' ? proxyData.error : '';
  const proxyMsgStr = typeof proxyData?.message === 'string' ? proxyData.message : '';
  // Combine error + message when both exist (edge function returns generic
  // 'Proxy error' in `error` and the useful detail in `message`).
  const proxyMessage = proxyErrorStr && proxyMsgStr && !proxyErrorStr.includes(proxyMsgStr)
    ? `${proxyErrorStr} — ${proxyMsgStr}`
    : proxyErrorStr || proxyMsgStr;

  // Edge function now wraps 502/503 in 200 OK — check body for actual status
  if (proxyData?.error && (httpStatus === 503 || httpStatus === 502)) {
    // Cold-start / unreachable wrapped in 200 — suppress console spam, just throw for retry
    throw new Error(withStatusPrefix(httpStatus, proxyMessage || 'n8n Service Unavailable'));
  }

  if (!resp.ok || proxyData?.error) {
    const detail = proxyMessage
      ? withStatusPrefix(httpStatus, proxyMessage)
      : await extractHttpError(resp);
    // Only log unexpected errors. Some speculative execution attempts deliberately
    // probe multiple n8n endpoints and may return 404/405/422 without meaning failure.
    if (httpStatus !== 503 && httpStatus !== 502 && !shouldSuppressProxyWarning(httpStatus, options.suppressHttpWarningsForStatuses)) {
      console.warn('[n8n-proxy]', detail);
    }
    throw new Error(detail);
  }

  return data;
}

function getWorkflowTimestamp(workflow: N8nWorkflow): number {
  const rawTimestamp = typeof workflow.updatedAt === 'string'
    ? workflow.updatedAt
    : typeof workflow.createdAt === 'string'
    ? workflow.createdAt
    : '';
  const timestamp = rawTimestamp ? Date.parse(rawTimestamp) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function shouldReplaceWorkflow(current: N8nWorkflow, candidate: N8nWorkflow): boolean {
  const currentActive = current.active === true;
  const candidateActive = candidate.active === true;

  if (currentActive !== candidateActive) {
    return candidateActive;
  }

  return getWorkflowTimestamp(candidate) > getWorkflowTimestamp(current);
}

function getWorkflowId(workflowOrId: N8nWorkflow | string): string {
  return typeof workflowOrId === 'string' ? workflowOrId : String(workflowOrId.id);
}

function getWorkflowNodes(workflow: N8nWorkflow): N8nNodeLike[] {
  const workflowNodes = Array.isArray(workflow.nodes) ? workflow.nodes : null;
  if (workflowNodes) {
    return workflowNodes as N8nNodeLike[];
  }

  const activeVersion = workflow.activeVersion;
  if (activeVersion && typeof activeVersion === 'object' && Array.isArray(activeVersion.nodes)) {
    return activeVersion.nodes as N8nNodeLike[];
  }

  return [];
}

function getWorkflowVersionId(workflow: N8nWorkflow): string | null {
  if (typeof workflow.versionId === 'string' && workflow.versionId) {
    return workflow.versionId;
  }

  const activeVersion = workflow.activeVersion;
  if (
    activeVersion &&
    typeof activeVersion === 'object' &&
    typeof activeVersion.versionId === 'string' &&
    activeVersion.versionId
  ) {
    return activeVersion.versionId;
  }

  if (typeof workflow.activeVersionId === 'string' && workflow.activeVersionId) {
    return workflow.activeVersionId;
  }

  return null;
}

async function ensureWorkflowDetails(
  workflowOrId: N8nWorkflow | string,
  options: { requireNodes?: boolean; requireVersionId?: boolean } = {},
): Promise<N8nWorkflow> {
  if (typeof workflowOrId === 'string') {
    return getWorkflowById(workflowOrId);
  }

  const hasNodes = getWorkflowNodes(workflowOrId).length > 0;
  const hasVersionId = Boolean(getWorkflowVersionId(workflowOrId));
  const needsNodes = options.requireNodes === true;
  const needsVersionId = options.requireVersionId === true;

  if ((!needsNodes || hasNodes) && (!needsVersionId || hasVersionId)) {
    return workflowOrId;
  }

  return getWorkflowById(String(workflowOrId.id));
}

function isScheduleOnlyWorkflow(workflow: N8nWorkflow): boolean {
  const nodes = getWorkflowNodes(workflow);

  if (nodes.length === 0) {
    return false;
  }

  const hasScheduleTrigger = nodes.some((node) => SCHEDULE_TRIGGER_TYPES.has(node.type ?? ''));
  const hasManualTrigger = nodes.some((node) => MANUAL_TRIGGER_TYPES.has(node.type ?? ''));
  const hasWebhookTrigger = nodes.some((node) => WEBHOOK_TRIGGER_TYPES.has(node.type ?? ''));

  return hasScheduleTrigger && !hasManualTrigger && !hasWebhookTrigger;
}

export function deduplicateN8nWorkflows(workflows: N8nWorkflow[]): N8nWorkflow[] {
  const seen = new Map<string, N8nWorkflow>();

  for (const workflow of workflows) {
    const key = String(workflow.name ?? '').trim() || String(workflow.id);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, workflow);
      continue;
    }

    if (shouldReplaceWorkflow(existing, workflow)) {
      const decisionKey = `replace:${key}:${existing.id}:${workflow.id}`;
      if (!reportedDuplicateWorkflowDecisions.has(decisionKey)) {
        reportedDuplicateWorkflowDecisions.add(decisionKey);
        console.info('[n8n] Duplicate workflow detected; using preferred copy:', key, 'old=', existing.id, 'new=', workflow.id);
      }
      seen.set(key, workflow);
      continue;
    }

    const decisionKey = `ignore:${key}:${existing.id}:${workflow.id}`;
    if (!reportedDuplicateWorkflowDecisions.has(decisionKey)) {
      reportedDuplicateWorkflowDecisions.add(decisionKey);
      console.info('[n8n] Duplicate workflow detected; ignored duplicate copy:', key, 'kept=', existing.id, 'ignored=', workflow.id);
    }
  }

  return [...seen.values()];
}

/**
 * All n8n calls go through the Supabase Edge Function "n8n-proxy".
 * The API key is kept server-side — never exposed to the browser.
 */
const n8nRequest = async <T>(path: string, options: N8nRequestOptions = {}): Promise<T> => {
  const {
    method,
    body,
    query,
    suppressHttpWarningsForStatuses,
  } = options;
  const data = await callN8nProxy(
    { path, method: method || 'GET', body, query },
    { suppressHttpWarningsForStatuses },
  );
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
    const result = data as { status: 'connected' | 'error' | 'unreachable'; detail?: string; httpStatus?: number };
    
    // Only log non-infrastructure errors (502/503 cold-start is normal and creates spam)
    if (result.status !== 'connected' && result.httpStatus !== 503 && result.httpStatus !== 502) {
      console.info('[n8n-health]', result.status, result.httpStatus ?? '', result.detail ?? '');
    }

    // Enhance detail for cold-start / unreachable HTTP codes
    if (result.status === 'error' && result.httpStatus === 503) {
      result.detail = result.detail || 'n8n a arrancar (503 — cold start no Render)';
    }
    if (result.status === 'error' && result.httpStatus === 502) {
      result.detail = result.detail || 'n8n indisponível (502 — erro de rede)';
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    const match = msg.match(/^\[(\d{3})\]/);
    const httpStatus = match ? Number(match[1]) : undefined;
    
    // Suppress 502/503 warnings and config errors (cold-start / infra spam)
    const isInfraError = httpStatus === 503 || httpStatus === 502 || msg.includes('not configured on server');
    if (!isInfraError) {
      console.warn('[n8n-health] exception:', msg);
    }
    
    const isTimeout = /abort|timeout/i.test(msg);
    const detail = isTimeout
      ? 'Timeout ao contactar o n8n (possível cold start no Render — aguarde 30-60 s).'
      : msg;
    return { status: 'unreachable', detail, httpStatus };
  }
};

export const getWorkflows = async () => {
  const payload = await n8nRequest<unknown>('/api/v1/workflows', {
    query: { excludePinnedData: true },
  });
  const workflows = normalizeCollection<N8nWorkflow>(payload).filter((workflow) => workflow.isArchived !== true);
  return workflows;
};

export const getWorkflowById = async (id: string) => {
  return n8nRequest<N8nWorkflow>(`/api/v1/workflows/${id}`);
};

export const activateWorkflow = async (workflowOrId: N8nWorkflow | string) => {
  const id = getWorkflowId(workflowOrId);
  console.log('[n8n] Activating workflow:', id);
  try {
    const workflow = await ensureWorkflowDetails(workflowOrId, { requireVersionId: true });
    const versionId = getWorkflowVersionId(workflow);

    if (!versionId) {
      throw new Error('Workflow sem versionId no n8n. Atualize ou publique o workflow antes de ativar.');
    }

    const result = await n8nRequest(`/api/v1/workflows/${id}/activate`, {
      method: 'POST',
      body: { versionId },
    });
    console.log('[n8n] ✓ Workflow activated:', id, result);
    return result;
  } catch (error) {
    console.error('[n8n] ✗ Failed to activate workflow:', id, error);
    throw error;
  }
};

export const deactivateWorkflow = async (id: string) => {
  console.log('[n8n] Deactivating workflow:', id);
  try {
    const result = await n8nRequest(`/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
      body: {},
    });
    console.log('[n8n] ✓ Workflow deactivated:', id, result);
    return result;
  } catch (error) {
    console.error('[n8n] ✗ Failed to deactivate workflow:', id, error);
    throw error;
  }
};

export const executeWorkflow = async (workflowOrId: N8nWorkflow | string): Promise<{ executed: boolean; method: string }> => {
  const workflow = await ensureWorkflowDetails(workflowOrId, { requireNodes: true });
  const id = getWorkflowId(workflow);
  const expectedExecutionFallbackStatuses = [400, 404, 405, 422, 501, 503];

  if (isScheduleOnlyWorkflow(workflow)) {
    const detail = workflow.active
      ? 'A execução real acontece no agendamento configurado no n8n.'
      : 'Ative-o para que o agendamento execute no n8n.';
    throw new CronWorkflowError(id, detail);
  }

  const webhookPath = extractWebhookPath(workflow);
  if (webhookPath) {
    // Try production webhook first (requires workflow to be active in n8n)
    try {
      await n8nRequest(`/webhook/${webhookPath}`, {
        method: 'POST',
        suppressHttpWarningsForStatuses: expectedExecutionFallbackStatuses,
      });
      return { executed: true, method: 'webhook' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!/\[(400|404|405|422|501|503)\]/.test(msg)) {
        throw new Error(`Falha na execução: ${msg}`);
      }
    }

    // Fallback: webhook-test (works even for inactive workflows — single execution)
    try {
      await n8nRequest(`/webhook-test/${webhookPath}`, {
        method: 'POST',
        suppressHttpWarningsForStatuses: expectedExecutionFallbackStatuses,
      });
      return { executed: true, method: 'webhook-test' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!/\[(400|404|405|422|501|503)\]/.test(msg)) {
        throw new Error(`Falha na execução: ${msg}`);
      }
    }
  }

  // Attempt 1 & 2: Standard n8n API execution endpoints (requires Manual Trigger node)
  const apiAttempts = [
    `/api/v1/workflows/${id}/run`,
    `/api/v1/workflows/${id}/execute`,
  ];

  let lastError = '';

  // Status codes that indicate "can't run this way" rather than a real error:
  // 404/405/501 = endpoint doesn't exist / method not allowed
  // 503 = n8n database cold-starting on Render (transient)
  const NON_FATAL_RE = /\[(404|405|501|503)\]/;

  for (const path of apiAttempts) {
    try {
      await n8nRequest(path, {
        method: 'POST',
        suppressHttpWarningsForStatuses: expectedExecutionFallbackStatuses,
      });
      return { executed: true, method: 'api-run' };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!NON_FATAL_RE.test(lastError)) {
        throw new Error(`Falha na execução: ${lastError}`);
      }
    }
  }

  // Attempt 3: POST /api/v1/executions with workflowId (n8n >= 1.62)
  try {
    await n8nRequest('/api/v1/executions', {
      method: 'POST',
      body: { workflowId: id },
      suppressHttpWarningsForStatuses: expectedExecutionFallbackStatuses,
    });
    return { executed: true, method: 'api-executions' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (!/\[(400|404|405|422|501|503)\]/.test(msg)) {
      throw new Error(`Falha na execução: ${msg}`);
    }
  }

  if (/\[(503)\]/.test(lastError) || /timeout|cold start/i.test(lastError)) {
    throw new Error(`Falha na execução: ${lastError}`);
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
  const nodes = getWorkflowNodes(wf);
  if (nodes.length === 0) return null;

  for (const node of nodes) {
    if (
      WEBHOOK_TRIGGER_TYPES.has(node.type ?? '')
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

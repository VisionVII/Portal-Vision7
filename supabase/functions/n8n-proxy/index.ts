// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ──────────────────────────────────────────────────────────────────
const DEFAULT_N8N_BASE_URL = 'https://portal-vision7.onrender.com';

function resolveN8nBaseUrl() {
  const configured = (Deno.env.get('N8N_BASE_URL') ?? '').trim();
  if (!configured) return DEFAULT_N8N_BASE_URL;

  try {
    return new URL(configured).toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_N8N_BASE_URL;
  }
}

function buildBaseUrlVariants(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/$/, '');
  const variants = new Set<string>([normalized]);

  try {
    const parsed = new URL(normalized);
    const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    const withN8n = new URL(parsed.toString());
    withN8n.pathname = basePath.endsWith('/n8n')
      ? basePath.replace(/\/n8n$/, '') || '/'
      : `${basePath}/n8n`;
    withN8n.search = '';
    withN8n.hash = '';
    variants.add(withN8n.toString().replace(/\/$/, ''));
  } catch {
    // Ignore malformed URLs and keep the normalized base only.
  }

  return [...variants];
}

function buildN8nUrl(baseUrl: string, requestPath: string, query?: Record<string, unknown>) {
  const parsed = new URL(baseUrl);
  const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  parsed.pathname = `${basePath}${normalizedPath}`;
  parsed.search = '';
  parsed.hash = '';

  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        parsed.searchParams.set(key, String(value));
      }
    }
  }

  return parsed.toString();
}

function shouldRetryOnStatus(status: number): boolean {
  return [404, 405, 500, 501, 502, 503].includes(status);
}

async function fetchN8nWithFallback(
  path: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    query?: Record<string, unknown>;
    timeoutMs?: number;
  },
) {
  const baseCandidates = buildBaseUrlVariants(N8N_BASE_URL);
  let lastError = '';

  for (const baseUrl of baseCandidates) {
    const url = buildN8nUrl(baseUrl, path, options.query);
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        ...(options.body ? { body: options.body } : {}),
        signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
      });

      if (response.ok || !shouldRetryOnStatus(response.status)) {
        return response;
      }

      lastError = `[${response.status}] ${await response.clone().text().catch(() => '')}`.trim();
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Falha de rede ao contactar o n8n';
    }
  }

  throw new Error(lastError || 'n8n unreachable');
}

const N8N_BASE_URL = resolveN8nBaseUrl();
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') ?? '';
const N8N_CREDENTIALS_ENCRYPTION_KEY = Deno.env.get('N8N_CREDENTIALS_ENCRYPTION_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// CORS — restrict to known origins (production + preview + local dev)
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('N8N_PROXY_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGIN_SUFFIXES = ['.vision7.pt'];

function isAllowedOrigin(origin: string) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    const isHttps = protocol === 'https:';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isVisionDomain = ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
    if ((isHttps && isVisionDomain) || isLocalhost) return true;
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = isAllowedOrigin(origin) || origin.endsWith('.supabase.co');
  const fallbackOrigin = ALLOWED_ORIGINS[0] || 'https://www.vision7.pt';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : fallbackOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// ─── Rate Limiter (in-memory, per user) ──────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests / minute / user
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT_MAX;
}

// Clean stale buckets periodically (avoid memory leak in long-running edge function)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 120_000);

// ─── Path whitelist ──────────────────────────────────────────────────────────
const ALLOWED_PATHS = ['/api/v1/workflows', '/api/v1/executions', '/webhook', '/webhook-test'];

function normalizeLegacyPath(path: string): string {
  if (path === '/rest/workflows' || path.startsWith('/rest/workflows/')) {
    return path.replace('/rest/workflows', '/api/v1/workflows');
  }
  if (path === '/rest/executions' || path.startsWith('/rest/executions/')) {
    return path.replace('/rest/executions', '/api/v1/executions');
  }
  return path;
}

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  );
}

// Only GET-equivalent methods are allowed for non-admin users
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Roles that can perform write operations on n8n
const N8N_ADMIN_ROLES = new Set(['super_admin', 'admin']);
// Roles that can at least read n8n data
const N8N_READ_ROLES = new Set(['super_admin', 'admin', 'editor']);

// ─── Request body size limit (64 KB — supports workflow import payloads) ─────
const MAX_BODY_SIZE = 64 * 1024;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', utf8ToBytes(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
}

async function decryptValue(secret: string, payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) throw new Error('Invalid encrypted payload format');
  const key = await deriveAesKey(secret);
  const iv = base64ToBytes(ivB64);
  const encrypted = base64ToBytes(dataB64);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(plaintext);
}

async function getEffectiveN8nApiKey(supabaseAdmin: ReturnType<typeof createClient>) {
  if (!N8N_CREDENTIALS_ENCRYPTION_KEY) return N8N_API_KEY;

  const { count, error: countError } = await supabaseAdmin
    .from('n8n_credentials')
    .select('id', { count: 'exact', head: true });

  if (countError) return N8N_API_KEY;

  const { data } = await supabaseAdmin
    .from('n8n_credentials')
    .select('encrypted_value,expires_at')
    .eq('key_name', 'N8N_API_KEY')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.encrypted_value) {
    // No valid encrypted credential — fallback to env var
    return N8N_API_KEY;
  }

  try {
    return await decryptValue(N8N_CREDENTIALS_ENCRYPTION_KEY, data.encrypted_value);
  } catch {
    // Decryption failed — fallback to env var
    return N8N_API_KEY;
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────
// NOTE: Deploy WITH no JWT verification in the gateway and validate the token here.
Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  const origin = req.headers.get('Origin') ?? '';

  if (origin && !isAllowedOrigin(origin) && !origin.endsWith('.supabase.co')) {
    return jsonResponse({ error: 'Origin not allowed', origin }, 403, cors);
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // Only allow POST (our proxy protocol)
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  }

  try {
    // ── 1. Extract and validate user token ──────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized — missing token' }, 401, cors);
    }

    const token = authHeader.slice(7);

    // ── 2. Verify token and resolve user via Supabase Auth ──────────────────
    // Use the admin client to validate the user JWT — avoids header conflicts
    // that occur when setting both service-role key and user Authorization.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user?.id) {
      console.error('[n8n-proxy] Auth error:', authError?.message ?? 'Invalid token', 'code:', authError?.code);
      return jsonResponse({ error: 'Unauthorized — invalid or expired token' }, 401, cors);
    }

    const userId = authData.user.id;

    // ── 3. Verify user has an allowed admin role (via service-role client) ──
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rolesError) {
      console.error('[n8n-proxy] Roles query error:', rolesError.message, 'userId:', userId);
      console.error('[n8n-proxy] Full error:', JSON.stringify(rolesError));
      return jsonResponse({ error: 'Internal error checking roles' }, 500, cors);
    }

    if (!roles?.length) {
      return jsonResponse({ error: 'Forbidden — no active role' }, 403, cors);
    }

    const userRoles = roles.map((r: { role: string }) => r.role);
    const canRead = userRoles.some((r: string) => N8N_READ_ROLES.has(r));
    if (!canRead) {
      return jsonResponse({ error: 'Forbidden — insufficient role' }, 403, cors);
    }

    // ── 4. Rate limit by user ID ────────────────────────────────────────────
    if (isRateLimited(userId)) {
      return jsonResponse(
        { error: 'Too many requests — limit is 30/min' },
        429,
        { ...cors, 'Retry-After': '60' },
      );
    }

    // ── 5. Check n8n config ─────────────────────────────────────────────────
    const effectiveN8nApiKey = await getEffectiveN8nApiKey(supabaseAdmin);

    if (!N8N_BASE_URL || !effectiveN8nApiKey) {
      // Return 200 OK to avoid browser Network tab errors during config issues
      return jsonResponse(
        { error: 'n8n not configured on server', httpStatus: 503 },
        200,
        cors,
      );
    }

    // ── 6. Parse & validate request body ────────────────────────────────────
    const contentLength = Number(req.headers.get('Content-Length') ?? '0');
    if (contentLength > MAX_BODY_SIZE) {
      return jsonResponse({ error: 'Payload too large' }, 413, cors);
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return jsonResponse({ error: 'Payload too large' }, 413, cors);
    }

    let parsed: { path?: string; method?: string; body?: unknown; query?: Record<string, unknown> };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, cors);
    }

    // ── Health check shortcut (path = "/health") ────────────────────────────
    if (parsed.path === '/health') {
      try {
        const pingRes = await fetchN8nWithFallback('/api/v1/workflows', {
          method: 'GET',
          headers: { 'X-N8N-API-KEY': effectiveN8nApiKey },
          query: { limit: '1', excludePinnedData: 'true' },
          timeoutMs: 60_000,
        });

        let detail = '';
        if (!pingRes.ok) {
          try {
            const body = await pingRes.clone().json();
            detail = body?.message || body?.error || '';
          } catch {
            try {
              detail = (await pingRes.clone().text()).slice(0, 180);
            } catch { /* ignore */ }
          }
        }

        return jsonResponse(
          {
            status: pingRes.ok ? 'connected' : 'error',
            httpStatus: pingRes.status,
            source: 'n8n-api',
            detail,
          },
          200,
          cors,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        const isTimeout = /abort|timeout/i.test(msg);
        return jsonResponse(
          {
            status: 'unreachable',
            detail: isTimeout
              ? 'Timeout ao contactar n8n (possível cold start)'
              : msg,
          },
          200,
          cors,
        );
      }
    }

    const { path, method = 'GET', body, bodyBase64, query } = parsed;

    // Decode base64-encoded body (bypasses WAF for large workflow payloads)
    const effectiveBody = bodyBase64
      ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(bodyBase64), (c) => c.charCodeAt(0))))
      : body;

    if (!path || typeof path !== 'string') {
      return jsonResponse({ error: 'Missing or invalid path' }, 400, cors);
    }

    const normalizedPath = normalizeLegacyPath(path);

    if (!isAllowedPath(normalizedPath)) {
      return jsonResponse({ error: `Path not allowed: ${path}` }, 403, cors);
    }

    // Normalise method
    const httpMethod = String(method).toUpperCase();

    // ── 7. Write operations require admin role ──────────────────────────────
    if (WRITE_METHODS.has(httpMethod)) {
      const canWrite = userRoles.some((r: string) => N8N_ADMIN_ROLES.has(r));
      if (!canWrite) {
        return jsonResponse(
          { error: 'Forbidden — write operations require super_admin or admin role' },
          403,
          cors,
        );
      }
    }

    // ── 8. Build n8n URL ────────────────────────────────────────────────────
    const url = new URL(`${N8N_BASE_URL}${normalizedPath}`);
    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // ── 9. Forward to n8n ───────────────────────────────────────────────────
    // 60s timeout — Render free-tier cold starts can take 30-90s
    const n8nResponse = await fetch(url.toString(), {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': effectiveN8nApiKey,
      },
      ...(effectiveBody ? { body: JSON.stringify(effectiveBody) } : {}),
      signal: AbortSignal.timeout(60_000),
    });

    const responseData = await n8nResponse.text();

    // Wrap 500/502/503 in 200 OK to avoid browser Network tab errors.
    // Render cold starts return 502 or 503; n8n internal errors return 500.
    if (n8nResponse.status >= 500) {
      return jsonResponse(
        {
          error: n8nResponse.status === 503
            ? 'n8n Service Unavailable (cold start)'
            : n8nResponse.status === 502
            ? 'n8n Gateway Error (cold start)'
            : 'n8n Internal Server Error',
          httpStatus: n8nResponse.status,
          detail: responseData.slice(0, 200),
        },
        200,
        cors,
      );
    }

    return new Response(responseData, {
      status: n8nResponse.status,
      headers: {
        ...cors,
        'Content-Type': n8nResponse.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[n8n-proxy] Error:', message);

    // Timeout / abort → cold-start wrapper
    if (/abort|timeout/i.test(message)) {
      return jsonResponse(
        {
          error: 'n8n timeout (cold start em progresso)',
          httpStatus: 503,
          detail: message,
        },
        200,
        cors,
      );
    }

    // Network-level errors (DNS, connection refused, fetch failures) are
    // infrastructure problems, not client errors.  Wrap in 200 OK like we
    // do for 503 cold-starts so the browser Network tab stays clean.
    if (/fetch|network|dns|econnrefused|enotfound|socket|connect/i.test(message)) {
      return jsonResponse(
        {
          error: `n8n unreachable: ${message}`,
          httpStatus: 502,
          detail: message,
        },
        200,
        cors,
      );
    }

    return jsonResponse({ error: `Proxy error: ${message}`, httpStatus: 500 }, 500, cors);
  }
});

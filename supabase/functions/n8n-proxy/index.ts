// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ──────────────────────────────────────────────────────────────────
const N8N_BASE_URL = (Deno.env.get('N8N_BASE_URL') ?? '').replace(/\/$/, '');
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// CORS — restrict to known origins (production + preview + local dev)
const ALLOWED_ORIGINS = (Deno.env.get('N8N_PROXY_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed =
    ALLOWED_ORIGINS.length === 0 ||
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.supabase.co');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0] || '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
const ALLOWED_PATHS = ['/rest/workflows', '/rest/executions'];

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

// ─── Request body size limit (16 KB) ────────────────────────────────────────
const MAX_BODY_SIZE = 16 * 1024;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // Only allow POST (our proxy protocol)
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  }

  try {
    // ── 1. Validate JWT and get authenticated user ──────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized — missing token' }, 401, cors);
    }

    const token = authHeader.slice(7);
    if (!token || token.length < 20) {
      return jsonResponse({ error: 'Unauthorized — invalid token' }, 401, cors);
    }

    // Use Supabase client to validate the JWT and retrieve the user
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized — invalid or expired token' }, 401, cors);
    }

    // ── 2. Verify user has an allowed admin role ────────────────────────────
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError || !roles?.length) {
      return jsonResponse({ error: 'Forbidden — no active role' }, 403, cors);
    }

    const userRoles = roles.map((r: { role: string }) => r.role);
    const canRead = userRoles.some((r: string) => N8N_READ_ROLES.has(r));
    if (!canRead) {
      return jsonResponse({ error: 'Forbidden — insufficient role' }, 403, cors);
    }

    // ── 3. Rate limit by user ID ────────────────────────────────────────────
    if (isRateLimited(user.id)) {
      return jsonResponse(
        { error: 'Too many requests — limit is 30/min' },
        429,
        { ...cors, 'Retry-After': '60' },
      );
    }

    // ── 4. Check n8n config ─────────────────────────────────────────────────
    if (!N8N_BASE_URL || !N8N_API_KEY) {
      return jsonResponse({ error: 'n8n not configured on server' }, 503, cors);
    }

    // ── 5. Parse & validate request body ────────────────────────────────────
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
        const pingRes = await fetch(`${N8N_BASE_URL}/rest/workflows?limit=1`, {
          method: 'GET',
          headers: { 'X-N8N-API-KEY': N8N_API_KEY },
          signal: AbortSignal.timeout(5000),
        });
        return jsonResponse(
          { status: pingRes.ok ? 'connected' : 'error', httpStatus: pingRes.status },
          200,
          cors,
        );
      } catch {
        return jsonResponse({ status: 'unreachable' }, 200, cors);
      }
    }

    const { path, method = 'GET', body, query } = parsed;

    if (!path || typeof path !== 'string') {
      return jsonResponse({ error: 'Missing or invalid path' }, 400, cors);
    }

    if (!isAllowedPath(path)) {
      return jsonResponse({ error: 'Path not allowed' }, 403, cors);
    }

    // Normalise method
    const httpMethod = String(method).toUpperCase();

    // ── 6. Write operations require admin role ──────────────────────────────
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

    // ── 7. Build n8n URL ────────────────────────────────────────────────────
    const url = new URL(`${N8N_BASE_URL}${path}`);
    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // ── 8. Forward to n8n ───────────────────────────────────────────────────
    const n8nResponse = await fetch(url.toString(), {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000), // 30s timeout to n8n
    });

    const responseData = await n8nResponse.text();

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
    return jsonResponse({ error: 'Proxy error', message }, 500, cors);
  }
});

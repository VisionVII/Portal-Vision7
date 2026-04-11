// @ts-nocheck
// deno-lint-ignore-file
/**
 * get-pipeline-secret — Returns a decrypted credential for pipeline workflows.
 *
 * Called by n8n workflows (WF-03) to get the Groq API key at runtime
 * instead of having it hardcoded in the workflow JSON.
 *
 * Auth: requires the server key injected in SUPABASE_SERVICE_ROLE_KEY
 *       (for this project/runtime, a 41-char sb_secret... key),
 *       OR a valid user JWT with super_admin/admin role.
 *
 * POST body: { "keyName": "GROQ_API_KEY" }
 * Response:  { "value": "<decrypted_key>" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CREDENTIALS_ENCRYPTION_KEY = Deno.env.get('N8N_CREDENTIALS_ENCRYPTION_KEY') ?? '';

const ALLOWED_KEY_NAMES = new Set(['GROQ_API_KEY', 'HF_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'N8N_API_KEY']);

/* ── Crypto helpers (same as n8n-settings) ── */
function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

/* ── CORS ── */
const ALLOWED_ORIGINS_ENV = Deno.env.get('ALLOWED_ORIGINS')
  ?? Deno.env.get('PUBLIC_SITE_URL')
  ?? Deno.env.get('SITE_URL')
  ?? '';

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const DEV_ORIGINS = new Set([
  'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080',
  'https://localhost:3000', 'https://localhost:5173', 'https://localhost:8080',
]);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // server-to-server (n8n)
  if (DEV_ORIGINS.has(origin)) return true;
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const safeOrigin = origin && isOriginAllowed(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, '').trim();
}

function buildUnauthorizedDiagnostic(authHeader: string, apiKeyHeader: string) {
  const normalizedAuthHeader = sanitizeHeaderValue(authHeader);
  const normalizedApiKeyHeader = sanitizeHeaderValue(apiKeyHeader);
  const authToken = sanitizeHeaderValue(normalizedAuthHeader.replace(/^Bearer\s+/i, ''));
  const expected = sanitizeHeaderValue(SUPABASE_SERVICE_ROLE_KEY);
  const combined = `${normalizedAuthHeader} ${normalizedApiKeyHeader}`;

  return {
    hasAuthHeader: normalizedAuthHeader.length > 0,
    hasApiKeyHeader: normalizedApiKeyHeader.length > 0,
    authLooksBearer: /^Bearer\s+/i.test(normalizedAuthHeader),
    authTokenLength: authToken.length,
    apiKeyLength: normalizedApiKeyHeader.length,
    expectedKeyLength: expected.length,
    authStartsWithJwt: authToken.startsWith('eyJ'),
    apiKeyStartsWithJwt: normalizedApiKeyHeader.startsWith('eyJ'),
    expectedStartsWithJwt: expected.startsWith('eyJ'),
    authStartsWithSecretKey: authToken.startsWith('sb_'),
    apiKeyStartsWithSecretKey: normalizedApiKeyHeader.startsWith('sb_'),
    expectedStartsWithSecretKey: expected.startsWith('sb_'),
    authHasTemplateLiteral: /\{\{|\$env|=\{/.test(combined),
    authLengthMatchesExpected: authToken.length > 0 && authToken.length === expected.length,
    apiKeyLengthMatchesExpected: normalizedApiKeyHeader.length > 0 && normalizedApiKeyHeader.length === expected.length,
  };
}

/* ── Auth check ── */
async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = sanitizeHeaderValue(req.headers.get('Authorization') ?? '');
  const apiKeyHeader = sanitizeHeaderValue(req.headers.get('apikey') ?? '');
  const token = sanitizeHeaderValue(authHeader.replace(/^Bearer\s+/i, ''));
  const expected = sanitizeHeaderValue(SUPABASE_SERVICE_ROLE_KEY);

  // Service role key = full access
  if (
    token === expected ||
    authHeader === expected ||
    apiKeyHeader === expected
  ) {
    return true;
  }

  // Otherwise check JWT for admin role
  if (!token) return false;
  try {
    const userClient = createClient(SUPABASE_URL, token);
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) return false;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin']);

    return (roles?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  }

  // Auth
  if (!(await isAuthorized(req))) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const apiKeyHeader = req.headers.get('apikey') ?? '';
    return jsonResponse({
      error: 'Unauthorized',
      diagnostic: buildUnauthorizedDiagnostic(authHeader, apiKeyHeader),
    }, 401, cors);
  }

  // Parse body
  let keyName: string;
  try {
    const body = await req.json();
    keyName = body?.keyName;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, cors);
  }

  if (!keyName || !ALLOWED_KEY_NAMES.has(keyName)) {
    return jsonResponse({ error: `Invalid keyName. Allowed: ${[...ALLOWED_KEY_NAMES].join(', ')}` }, 400, cors);
  }

  if (!CREDENTIALS_ENCRYPTION_KEY) {
    return jsonResponse({ error: 'Encryption key not configured on server' }, 500, cors);
  }

  // Fetch active credential
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: cred, error } = await adminClient
    .from('n8n_credentials')
    .select('encrypted_value')
    .eq('key_name', keyName)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: 'DB error: ' + error.message }, 500, cors);
  }

  if (!cred) {
    return jsonResponse({ error: `No active credential found for ${keyName}` }, 404, cors);
  }

  // Decrypt
  try {
    const value = await decryptValue(CREDENTIALS_ENCRYPTION_KEY, cred.encrypted_value);
    return jsonResponse({ value }, 200, cors);
  } catch (err) {
    return jsonResponse({ error: 'Decryption failed: ' + (err.message ?? 'unknown') }, 500, cors);
  }
});

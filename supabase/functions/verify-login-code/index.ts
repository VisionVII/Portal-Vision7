/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://portal.vision7.pt';
const MAX_FAILED_ATTEMPTS = 10;
const BLOCK_WINDOW_MINUTES = 15;

const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const fallbackAllowedOrigins = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  DEFAULT_SITE_URL,
  'https://portal.vision7.pt',
];

const ALLOWED_ORIGINS = new Set([...configuredOrigins, ...fallbackAllowedOrigins]);

const privilegedEmails = (Deno.env.get('ADMIN_LOGIN_EMAIL') ?? Deno.env.get('ADMIN_NOTIFY_EMAIL') ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const DASHBOARD_ROLES = new Set(['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst']);
const ADMIN_ROLES = new Set(['super_admin', 'admin']);

function isPrivilegedLoginEmail(email: string): boolean {
  return privilegedEmails.includes(email.trim().toLowerCase());
}

function getRequestOrigin(req: Request): string {
  return req.headers.get('origin')?.trim() ?? '';
}

function getClientIp(req: Request): string {
  const forwardFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardFor) return forwardFor;
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return 'unknown';
}

function getDeviceFingerprint(req: Request): string {
  const fingerprint = req.headers.get('x-device-fingerprint')?.trim();
  return fingerprint || 'unknown-device';
}

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Accept any Vercel preview/production URL
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  // Accept GitHub Codespaces / github.dev preview URLs
  if (/^https:\/\/[\w-]+\.github\.dev$/.test(origin)) return true;
  return false;
}

function buildCorsHeaders(origin: string): HeadersInit {
  const allowedOrigin = isOriginAllowed(origin) ? origin : fallbackAllowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-fingerprint',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(payload: Record<string, unknown>, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function exchangeOtpForSession({
  supabaseUrl,
  anonKey,
  email,
  tokenHash,
  emailOtp,
  verificationType,
}: {
  supabaseUrl: string;
  anonKey: string;
  email: string;
  tokenHash?: string | null;
  emailOtp?: string | null;
  verificationType: 'recovery' | 'magiclink';
}) {
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const attempts: Array<() => Promise<{
    data: { user: unknown; session: { access_token: string; refresh_token: string } | null };
    error: Error | null;
  }>> = [];

  if (tokenHash) {
    attempts.push(async () => {
      const { data, error } = await publicClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: verificationType,
      });
      return { data, error: error as Error | null };
    });

    attempts.push(async () => {
      const { data, error } = await publicClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });
      return { data, error: error as Error | null };
    });
  }

  if (emailOtp) {
    attempts.push(async () => {
      const { data, error } = await publicClient.auth.verifyOtp({
        email,
        token: emailOtp,
        type: verificationType,
      });
      return { data, error: error as Error | null };
    });
  }

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    const { data, error } = await attempt();

    if (!error && data?.session?.access_token && data?.session?.refresh_token) {
      return { data, error: null };
    }

    lastError = error;
  }

  return {
    data: null,
    error: lastError ?? new Error('Não foi possível converter o código numa sessão autenticada.'),
  };
}

async function getAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw error;
    }

    const user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

async function getUserAccessContext(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  scope: 'admin' | 'dashboard',
) {
  const user = await getAuthUserByEmail(adminClient, email);

  if (!user?.id) {
    return {
      user: null,
      isAuthorized: false,
      errorMessage: 'Este email ainda não possui conta ativa para entrar no portal.',
    };
  }

  const { data: rolesData, error: rolesError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (rolesError) {
    throw rolesError;
  }

  const roles = Array.from(new Set((rolesData ?? []).map((entry) => String(entry.role))));
  const allowedRoles = scope === 'admin' ? ADMIN_ROLES : DASHBOARD_ROLES;

  return {
    user,
    isAuthorized: roles.some((role) => allowedRoles.has(role)),
    errorMessage: scope === 'admin'
      ? 'Este email não possui privilégio administrativo ativo.'
      : 'Este email ainda não possui permissões ativas para entrar no dashboard.',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function secureCompare(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);

  const a = new Uint8Array(leftDigest);
  const b = new Uint8Array(rightDigest);

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

Deno.serve(async (req: Request) => {
  const origin = getRequestOrigin(req);
  const clientIp = getClientIp(req);
  const deviceFingerprint = getDeviceFingerprint(req);
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isOriginAllowed(origin)) {
    return jsonResponse({ error: 'Origem não permitida.' }, 403, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, corsHeaders);
  }

  try {
    const anonKey = req.headers.get('apikey')?.trim() || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const { email, code, scope: rawScope } = await req.json();

    if (!email || !code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return jsonResponse({ error: 'Email e código são obrigatórios.' }, 400, corsHeaders);
    }

    if (!anonKey) {
      console.error('[verify-login-code] Missing anon key for session exchange');
      return jsonResponse({ error: 'Configuração de autenticação incompleta.' }, 500, corsHeaders);
    }

    const normalizedCode = String(code).trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      await sleep(200);
      return jsonResponse({ error: 'Código inválido. Tente novamente.' }, 401, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const scope = rawScope === 'admin' ? 'admin' : 'dashboard';
    const isPrivilegedEmail = isPrivilegedLoginEmail(normalizedEmail);
    const now = Date.now();

    const accessContext = await getUserAccessContext(adminClient, normalizedEmail, scope);

    if (!accessContext.isAuthorized) {
      await sleep(250);
      return jsonResponse({ error: accessContext.errorMessage }, 403, corsHeaders);
    }

    if (!isPrivilegedEmail) {
      const { data: activeBlocks, error: blockedError } = await adminClient
        .from('security_codes')
        .select('blocked_until')
        .eq('type', 'login')
        .or(`email.eq.${normalizedEmail},request_ip.eq.${clientIp},device_fingerprint.eq.${deviceFingerprint}`)
        .not('blocked_until', 'is', null)
        .order('blocked_until', { ascending: false })
        .limit(1);

      if (blockedError) {
        console.error('[verify-login-code] Block-check error:', blockedError);
        return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
      }

      const blockedUntil = activeBlocks?.[0]?.blocked_until;
      if (blockedUntil && new Date(blockedUntil).getTime() > now) {
        await sleep(300);
        return jsonResponse({ error: 'Acesso temporariamente bloqueado. Solicite um novo código mais tarde.' }, 429, corsHeaders);
      }
    }

    // Fetch recent active codes for this email.
    // This avoids false negatives when the user requested a second code before the first email arrived.
    const { data: activeCodes, error: queryError } = await adminClient
      .from('security_codes')
      .select('id, code, expires_at, attempts, created_at')
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError || !activeCodes?.length) {
      await sleep(220);
      return jsonResponse({ error: 'Código inválido ou expirado.' }, 401, corsHeaders);
    }

    const unexpiredCodes = activeCodes.filter((entry) => new Date(entry.expires_at).getTime() >= now);

    const expiredCodes = activeCodes
      .filter((entry) => new Date(entry.expires_at).getTime() < now)
      .map((entry) => entry.id);

    if (expiredCodes.length > 0) {
      await adminClient.from('security_codes').update({ used: true }).in('id', expiredCodes);
    }

    if (!unexpiredCodes.length) {
      await sleep(220);
      return jsonResponse({ error: 'Código inválido ou expirado.' }, 401, corsHeaders);
    }

    const latestActiveCode = unexpiredCodes[0];

    if (!isPrivilegedEmail && (latestActiveCode.attempts ?? 0) >= 5) {
      const blockedUntilIso = new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString();
      await adminClient
        .from('security_codes')
        .update({ used: true, blocked_until: blockedUntilIso })
        .eq('id', latestActiveCode.id);
      await sleep(220);
      return jsonResponse(
        { error: 'Acesso temporariamente bloqueado. Solicite um novo código mais tarde.' },
        429,
        corsHeaders,
      );
    }

    let matchedCode = null;
    for (const entry of unexpiredCodes) {
      const isMatch = await secureCompare(String(entry.code), normalizedCode);
      if (isMatch) {
        matchedCode = entry;
        break;
      }
    }

    if (!matchedCode) {
      const nextAttempts = (latestActiveCode.attempts ?? 0) + 1;
      const backoffMs = Math.min(1500, 100 * 2 ** Math.max(0, nextAttempts - 1));
      const blockedUntilIso = !isPrivilegedEmail && nextAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString()
        : null;

      await adminClient
        .from('security_codes')
        .update({
          attempts: nextAttempts,
          request_ip: clientIp,
          device_fingerprint: deviceFingerprint,
          blocked_until: blockedUntilIso,
          used: !isPrivilegedEmail && nextAttempts >= MAX_FAILED_ATTEMPTS,
        })
        .eq('id', latestActiveCode.id);

      await sleep(backoffMs);

      if (!isPrivilegedEmail && nextAttempts >= MAX_FAILED_ATTEMPTS) {
        return jsonResponse(
          { error: 'Acesso temporariamente bloqueado. Solicite um novo código mais tarde.' },
          429,
          corsHeaders,
        );
      }

      return jsonResponse({ error: 'Código inválido. Tente novamente.' }, 401, corsHeaders);
    }

    // Mark all current active login codes for this email as used after a successful match.
    await adminClient
      .from('security_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .eq('used', false);

    // Generate a Supabase session token using the admin API (service role — does NOT send email)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
    });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error('[verify-login-code] generateLink error:', linkError);
      return jsonResponse({ error: 'Erro ao gerar sessão. Contacte o administrador.' }, 500, corsHeaders);
    }

    const { data: authData, error: exchangeError } = await exchangeOtpForSession({
      supabaseUrl: SUPABASE_URL,
      anonKey,
      email: normalizedEmail,
      tokenHash: linkData.properties.hashed_token,
      emailOtp: linkData.properties.email_otp,
      verificationType: 'recovery',
    });

    if (exchangeError || !authData?.session?.access_token || !authData?.session?.refresh_token) {
      console.error('[verify-login-code] exchange session error:', exchangeError);
      return jsonResponse({ error: 'Erro ao concluir a sessão autenticada.' }, 500, corsHeaders);
    }

    return jsonResponse({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    }, 200, corsHeaders);
  } catch (err) {
    console.error('[verify-login-code] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
<<<<<<< HEAD

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
=======
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';
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
  'https://www.vision7.pt',
];

const ALLOWED_ORIGINS = new Set([...configuredOrigins, ...fallbackAllowedOrigins]);

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
  return ALLOWED_ORIGINS.has(origin);
}

function buildCorsHeaders(origin: string): HeadersInit {
  const allowedOrigin = isOriginAllowed(origin) ? origin : fallbackAllowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
  }

  try {
    const { email, code } = await req.json();

<<<<<<< HEAD
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email e código são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
=======
    if (!email || !code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return jsonResponse({ error: 'Email e código são obrigatórios.' }, 400, corsHeaders);
    }

    const normalizedCode = String(code).trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      await sleep(200);
      return jsonResponse({ error: 'Código inválido. Tente novamente.' }, 401, corsHeaders);
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
<<<<<<< HEAD
=======
    const now = Date.now();

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
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)

    // Fetch most recent active code for this email
    const { data, error: queryError } = await adminClient
      .from('security_codes')
      .select('id, code, expires_at, attempts')
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (queryError || !data) {
<<<<<<< HEAD
      return new Response(
        JSON.stringify({ error: 'Código não encontrado ou já utilizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
=======
      await sleep(220);
      return jsonResponse({ error: 'Código inválido ou expirado.' }, 401, corsHeaders);
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);
<<<<<<< HEAD
      return new Response(
        JSON.stringify({ error: 'Código expirado. Solicite um novo código.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
=======
      await sleep(220);
      return jsonResponse({ error: 'Código inválido ou expirado.' }, 401, corsHeaders);
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
    }

    // Check max attempts
    if ((data.attempts ?? 0) >= 5) {
<<<<<<< HEAD
      await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);
      return new Response(
        JSON.stringify({ error: 'Número máximo de tentativas atingido. Solicite um novo código.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate code (constant-time comparison to prevent timing attacks)
    if (data.code !== code.trim()) {
      await adminClient
        .from('security_codes')
        .update({ attempts: (data.attempts ?? 0) + 1 })
        .eq('id', data.id);
      return new Response(
        JSON.stringify({ error: 'Código inválido. Tente novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
=======
      const blockedUntilIso = new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString();
      await adminClient
        .from('security_codes')
        .update({ used: true, blocked_until: blockedUntilIso })
        .eq('id', data.id);
      await sleep(220);
      return jsonResponse(
        { error: 'Acesso temporariamente bloqueado. Solicite um novo código mais tarde.' },
        429,
        corsHeaders,
      );
    }

    // Validate in constant time to reduce timing side-channel leakage.
    const isCodeValid = await secureCompare(String(data.code), normalizedCode);
    if (!isCodeValid) {
      const nextAttempts = (data.attempts ?? 0) + 1;
      const backoffMs = Math.min(1500, 100 * 2 ** Math.max(0, nextAttempts - 1));
      const blockedUntilIso = nextAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString()
        : null;

      await adminClient
        .from('security_codes')
        .update({
          attempts: nextAttempts,
          request_ip: clientIp,
          device_fingerprint: deviceFingerprint,
          blocked_until: blockedUntilIso,
          used: nextAttempts >= MAX_FAILED_ATTEMPTS,
        })
        .eq('id', data.id);

      await sleep(backoffMs);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        return jsonResponse(
          { error: 'Acesso temporariamente bloqueado. Solicite um novo código mais tarde.' },
          429,
          corsHeaders,
        );
      }

      return jsonResponse({ error: 'Código inválido. Tente novamente.' }, 401, corsHeaders);
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
    }

    // Mark as used immediately to prevent replay attacks
    await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);

    // Generate a Supabase auth token using the admin API
    // This creates a magic-link token for the email — no email is sent by Supabase
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[verify-login-code] generateLink error:', linkError);
<<<<<<< HEAD
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar sessão. Contacte o administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Return the hashed token — frontend will call verifyOtp({ token_hash, type: 'email' })
    return new Response(
      JSON.stringify({ token_hash: linkData.properties.hashed_token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[verify-login-code] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
=======
      return jsonResponse({ error: 'Erro ao gerar sessão. Contacte o administrador.' }, 500, corsHeaders);
    }

    // Return the hashed token — frontend will call verifyOtp({ token_hash, type: 'email' })
    return jsonResponse({ token_hash: linkData.properties.hashed_token }, 200, corsHeaders);
  } catch (err) {
    console.error('[verify-login-code] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
>>>>>>> aa640ec (security(auth): align SDD hardening with OTP abuse controls and session safeguards)
  }
});

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';
const MAX_FAILED_ATTEMPTS = 5;
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

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  return false;
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const { email, code, password } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return jsonResponse({ error: 'Email inválido.' }, 400, corsHeaders);
    }

    const normalizedCode = String(code ?? '').trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      await sleep(200);
      return jsonResponse({ error: 'Código de convite inválido.' }, 401, corsHeaders);
    }

    if (!password || String(password).length < 8) {
      return jsonResponse({ error: 'A password deve ter pelo menos 8 caracteres.' }, 400, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    // Check for active blocks
    const { data: activeBlocks, error: blockedError } = await adminClient
      .from('security_codes')
      .select('blocked_until')
      .eq('type', 'invite')
      .or(`email.eq.${normalizedEmail},request_ip.eq.${clientIp}`)
      .not('blocked_until', 'is', null)
      .order('blocked_until', { ascending: false })
      .limit(1);

    if (blockedError) {
      console.error('[activate-invite] Block-check error:', blockedError);
      return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
    }

    const blockedUntil = activeBlocks?.[0]?.blocked_until;
    if (blockedUntil && new Date(blockedUntil).getTime() > now) {
      await sleep(300);
      return jsonResponse({ error: 'Demasiadas tentativas. Aguarde antes de tentar novamente.' }, 429, corsHeaders);
    }

    // Fetch most recent active invite code for this email
    const { data, error: queryError } = await adminClient
      .from('security_codes')
      .select('id, code, expires_at, attempts, metadata')
      .eq('email', normalizedEmail)
      .eq('type', 'invite')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (queryError || !data) {
      await sleep(220);
      return jsonResponse({ error: 'Código de convite inválido ou expirado.' }, 401, corsHeaders);
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);
      await sleep(220);
      return jsonResponse({ error: 'O convite expirou. Solicite um novo ao administrador.' }, 401, corsHeaders);
    }

    // Enforce max attempts
    if ((data.attempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
      const blockedUntilIso = new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString();
      await adminClient
        .from('security_codes')
        .update({ used: true, blocked_until: blockedUntilIso })
        .eq('id', data.id);
      await sleep(220);
      return jsonResponse(
        { error: 'Demasiadas tentativas inválidas. Solicite um novo convite.' },
        429,
        corsHeaders,
      );
    }

    // Validate code in constant time
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
          blocked_until: blockedUntilIso,
          used: nextAttempts >= MAX_FAILED_ATTEMPTS,
        })
        .eq('id', data.id);

      await sleep(backoffMs);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        return jsonResponse({ error: 'Demasiadas tentativas inválidas. Solicite um novo convite.' }, 429, corsHeaders);
      }

      return jsonResponse({ error: 'Código de convite inválido.' }, 401, corsHeaders);
    }

    // Mark invite code as used immediately (prevent replay)
    await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);

    const role = data.metadata?.role ?? 'editor';

    // Create user via Supabase admin API (email confirmed immediately — no confirmation email)
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
    });

    if (createError) {
      console.error('[activate-invite] createUser error:', createError);
      // If user already exists, return a helpful message
      if (/already registered|already exists/i.test(createError.message)) {
        return jsonResponse({ error: 'Este email já tem uma conta registada. Entre diretamente no painel.' }, 409, corsHeaders);
      }
      return jsonResponse({ error: createError.message }, 400, corsHeaders);
    }

    const userId = newUserData?.user?.id;

    if (!userId) {
      console.error('[activate-invite] No user ID after create');
      return jsonResponse({ error: 'Erro ao criar conta. Contacte o administrador.' }, 500, corsHeaders);
    }

    // Assign role in user_roles table
    const { error: roleError } = await adminClient.from('user_roles').insert({
      user_id: userId,
      role,
      is_active: true,
      assigned_at: new Date().toISOString(),
    });

    if (roleError) {
      console.error('[activate-invite] role insert error:', roleError);
      // Non-fatal: user was created but role failed — admin can assign manually
    }

    // Mark registration_invite as used if one exists for this email
    await adminClient
      .from('registration_invites')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('email', normalizedEmail)
      .eq('status', 'pending');

    console.log(`[activate-invite] Account activated for ${normalizedEmail} with role ${role}`);

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[activate-invite] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});

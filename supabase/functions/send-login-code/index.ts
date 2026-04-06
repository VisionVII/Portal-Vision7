/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision VII <noreply@vision7.pt>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';

const CODE_EXPIRY_MINUTES = 10;
const MAX_CODE_REQUESTS_PER_MINUTE_PER_EMAIL = 5;
const MAX_CODE_REQUESTS_PER_HOUR_PER_IP = 10;
const MAX_CODE_REQUESTS_PER_HOUR_PER_DEVICE = 12;
const MIN_SECONDS_BETWEEN_CODE_REQUESTS = 20;
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
    isAuthorized: roles.some((role) => allowedRoles.has(role)),
    errorMessage: scope === 'admin'
      ? 'Este email não possui privilégio administrativo ativo.'
      : 'Este email ainda não possui permissões ativas para entrar no dashboard.',
  };
}

function generateCode(length = 6): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => (n % 10).toString()).join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderEmail(code: string, expiresInMinutes: number, brandName: string, logoUrl: string): string {
  const safeBrandName = escapeHtml(brandName);
  const safeLogoUrl = escapeHtml(logoUrl);

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f8fafc; font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; }
    .code-block {
      font-family: 'SF Mono','Fira Code','Courier New',monospace;
      font-size: 36px;
      letter-spacing: 10px;
      font-weight: 700;
      color: #2563EB;
      background: #EFF6FF;
      border-radius: 14px;
      padding: 18px 28px;
      display: inline-block;
      border: 1px solid rgba(37,99,235,0.22);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 18px 48px rgba(30,64,175,0.10);">

          <tr>
            <td style="padding:32px 32px 18px;text-align:center;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);">
              <img src="${safeLogoUrl}" alt="${safeBrandName}" style="max-width:190px;max-height:64px;width:auto;height:auto;display:block;margin:0 auto 14px;" />
              <p style="margin:0;color:#1d4ed8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Portal de Noticias</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 36px 36px;">
              <h2 style="margin:0 0 10px;font-size:24px;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">O seu codigo de acesso</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.65;">
                Introduza este codigo no portal para iniciar sessao no painel administrativo do ${safeBrandName}.
              </p>

              <div style="text-align:center;margin:0 0 32px;">
                <span class="code-block">${code}</span>
              </div>

              <p style="margin:0 0 22px;font-size:14px;color:#475569;text-align:center;line-height:1.7;">
                Este codigo expira em <strong style="color:#0f172a;">${expiresInMinutes} minutos</strong>.<br/>
                Se nao solicitou este acesso, ignore este email.
              </p>

              <div style="margin:0 0 22px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px 18px;">
                <p style="margin:0;font-size:12px;color:#334155;line-height:1.7;">
                  Por seguranca, o codigo e de uso unico e fica invalido assim que for confirmado.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                Nunca partilhe este codigo com terceiros. A equipa ${safeBrandName} nunca solicitara este codigo por email, telefone ou chat.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${safeBrandName}. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  const origin = getRequestOrigin(req);
  const clientIp = getClientIp(req);
  const deviceFingerprint = getDeviceFingerprint(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? 'unknown';
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
    const { email, scope: rawScope } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Email inválido.' }, 400, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const scope = rawScope === 'admin' ? 'admin' : 'dashboard';
    const accessContext = await getUserAccessContext(adminClient, normalizedEmail, scope);

    if (!accessContext.isAuthorized) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return jsonResponse({ error: accessContext.errorMessage }, 403, corsHeaders);
    }

    const { data: siteSettings } = await adminClient
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_name', 'logo_url']);

    const settingsMap = new Map((siteSettings ?? []).map((item) => [item.key, item.value]));
    const brandName = settingsMap.get('site_name')?.trim() || 'Vision VII';
    const logoUrl = settingsMap.get('logo_url')?.trim() || `${DEFAULT_SITE_URL}/vision-logo-premium-default.png`;

    const isPrivilegedEmail = isPrivilegedLoginEmail(normalizedEmail);
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60 * 1000).toISOString();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

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
        console.error('[send-login-code] Block-check error:', blockedError);
        return jsonResponse({ error: 'Erro ao processar pedido de login.' }, 500, corsHeaders);
      }

      const blockedUntil = activeBlocks?.[0]?.blocked_until;
      if (blockedUntil && new Date(blockedUntil).getTime() > now) {
        return jsonResponse(
          { error: 'Acesso temporariamente bloqueado por tentativas excessivas. Tente novamente mais tarde.' },
          429,
          corsHeaders,
        );
      }
    }

    const { count: emailCount, error: emailRateError } = await adminClient
      .from('security_codes')
      .select('id', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .gte('created_at', oneMinuteAgo);

    if (emailRateError) {
      console.error('[send-login-code] Email rate-limit query error:', emailRateError);
      return jsonResponse({ error: 'Erro ao processar pedido de login.' }, 500, corsHeaders);
    }

    if (!isPrivilegedEmail && (emailCount ?? 0) >= MAX_CODE_REQUESTS_PER_MINUTE_PER_EMAIL) {
      return jsonResponse(
        { error: 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.' },
        429,
        corsHeaders,
      );
    }

    const { count: ipCount, error: ipRateError } = await adminClient
      .from('security_codes')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'login')
      .eq('request_ip', clientIp)
      .gte('created_at', oneHourAgo);

    if (ipRateError) {
      console.error('[send-login-code] IP rate-limit query error:', ipRateError);
      return jsonResponse({ error: 'Erro ao processar pedido de login.' }, 500, corsHeaders);
    }

    if (!isPrivilegedEmail && (ipCount ?? 0) >= MAX_CODE_REQUESTS_PER_HOUR_PER_IP) {
      const blockedUntilIso = new Date(now + BLOCK_WINDOW_MINUTES * 60 * 1000).toISOString();
      await adminClient.from('security_codes').insert({
        email: normalizedEmail,
        code: '000000',
        type: 'login',
        used: true,
        attempts: 10,
        expires_at: blockedUntilIso,
        request_ip: clientIp,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
        blocked_until: blockedUntilIso,
      });
      return jsonResponse(
        { error: 'Acesso temporariamente bloqueado por tentativas excessivas. Tente novamente mais tarde.' },
        429,
        corsHeaders,
      );
    }

    const { count: deviceCount, error: deviceRateError } = await adminClient
      .from('security_codes')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'login')
      .eq('device_fingerprint', deviceFingerprint)
      .gte('created_at', oneHourAgo);

    if (deviceRateError) {
      console.error('[send-login-code] Device rate-limit query error:', deviceRateError);
      return jsonResponse({ error: 'Erro ao processar pedido de login.' }, 500, corsHeaders);
    }

    if (!isPrivilegedEmail && (deviceCount ?? 0) >= MAX_CODE_REQUESTS_PER_HOUR_PER_DEVICE) {
      return jsonResponse(
        { error: 'Muitas tentativas neste dispositivo. Tente novamente mais tarde.' },
        429,
        corsHeaders,
      );
    }

    const { data: latestCode } = await adminClient
      .from('security_codes')
      .select('created_at')
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!isPrivilegedEmail && latestCode?.created_at) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(latestCode.created_at).getTime()) / 1000);
      if (elapsedSeconds < MIN_SECONDS_BETWEEN_CODE_REQUESTS) {
        return jsonResponse(
          { error: 'Aguarde alguns segundos antes de solicitar novo código.' },
          429,
          corsHeaders,
        );
      }
    }

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Insert new code
    const { data: insertedCode, error: insertError } = await adminClient
      .from('security_codes')
      .insert({
        email: normalizedEmail,
        code,
        type: 'login',
        expires_at: expiresAt,
        attempts: 0,
        request_ip: clientIp,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[send-login-code] Insert error:', insertError);
      return jsonResponse({ error: 'Erro ao gerar código de acesso.' }, 500, corsHeaders);
    }

    // Dev mode: no API key
    if (!RESEND_API_KEY) {
      console.log(`[send-login-code] DEV — OTP ${code} for ${normalizedEmail}`);
      return jsonResponse({ success: true, expiresInMinutes: CODE_EXPIRY_MINUTES }, 200, corsHeaders);
    }

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [normalizedEmail],
        subject: `${code} - Codigo de Acesso ${brandName}`,
        html: renderEmail(code, CODE_EXPIRY_MINUTES, brandName, logoUrl),
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      if (insertedCode?.id) {
        await adminClient.from('security_codes').update({ used: true }).eq('id', insertedCode.id);
      }
      console.error('[send-login-code] Resend error:', resData);
      return jsonResponse({ error: 'Erro ao enviar email. Tente novamente.' }, 500, corsHeaders);
    }

    console.log(`[send-login-code] Sent to ${normalizedEmail}, id: ${resData.id}`);

    return jsonResponse({ success: true, expiresInMinutes: CODE_EXPIRY_MINUTES }, 200, corsHeaders);
  } catch (err) {
    console.error('[send-login-code] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});

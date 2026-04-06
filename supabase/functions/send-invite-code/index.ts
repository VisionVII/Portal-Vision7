/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@vision7.pt';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';

// Invite codes are valid for 48 hours
const CODE_EXPIRY_HOURS = 48;

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

function generateCode(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((byte) => byte % 10).join('').slice(0, length);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Desenvolvedor / Super Admin',
  admin: 'Administrador',
  editor: 'Editor',
  redator: 'Redator / Revisor',
  moderador: 'Moderador',
  analyst: 'Analista',
};

function renderInviteEmail(
  code: string,
  role: string,
  brandName: string,
  logoUrl: string,
  registerUrl: string,
  expiryHours: number,
): string {
  const safeBrandName = escapeHtml(brandName);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeRegisterUrl = escapeHtml(registerUrl);
  const roleLabel = escapeHtml(ROLE_LABELS[role] ?? role.replace('_', ' '));

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
    .btn {
      display: inline-block;
      background: #2563EB;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.01em;
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
              <p style="margin:0;color:#1d4ed8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;">Convite para a equipa</p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 36px 36px;">
              <h2 style="margin:0 0 10px;font-size:24px;color:#0f172a;font-weight:800;letter-spacing:-0.02em;">Foi convidado para se juntar a ${safeBrandName}</h2>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.65;">
                O administrador convidou-o para integrar a equipa com o papel de
                <strong style="color:#1e40af;">${roleLabel}</strong>.
              </p>

              <p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.65;">
                Use o código abaixo para ativar a sua conta:
              </p>

              <div style="text-align:center;margin:0 0 28px;">
                <span class="code-block">${code}</span>
              </div>

              <div style="text-align:center;margin:0 0 30px;">
                <a href="${safeRegisterUrl}" class="btn">Ativar conta agora</a>
              </div>

              <p style="margin:0 0 22px;font-size:14px;color:#475569;text-align:center;line-height:1.7;">
                Este código expira em <strong style="color:#0f172a;">${expiryHours} horas</strong>.<br/>
                Se não esperava este convite, ignore este email.
              </p>

              <div style="margin:0 0 22px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px 18px;">
                <p style="margin:0;font-size:12px;color:#334155;line-height:1.7;">
                  Após clicar no botão, introduza o código acima e defina a sua password para completar o registo.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                Nunca partilhe este código com terceiros. A equipa ${safeBrandName} nunca o solicitará por email, telefone ou chat.
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
    // Require caller to be an authenticated admin
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!jwt) {
      return jsonResponse({ error: 'Não autorizado.' }, 401, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: userError } = await adminClient.auth.getUser(jwt);

    if (userError || !caller) {
      return jsonResponse({ error: 'Não autorizado.' }, 401, corsHeaders);
    }

    // Verify caller has admin or super_admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('is_active', true)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!roleData) {
      return jsonResponse({ error: 'Acesso negado. Apenas administradores podem enviar convites.' }, 403, corsHeaders);
    }

    const { email, role } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Email inválido.' }, 400, corsHeaders);
    }

    if (!role) {
      return jsonResponse({ error: 'Papel (role) é obrigatório.' }, 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Fetch brand settings
    const { data: siteSettings } = await adminClient
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_name', 'logo_url']);

    const settingsMap = new Map((siteSettings ?? []).map((item) => [item.key, item.value]));
    const brandName = settingsMap.get('site_name')?.trim() || 'Vision VII';
    const logoUrl = settingsMap.get('logo_url')?.trim() || `${DEFAULT_SITE_URL}/vision-logo-premium-default.png`;

    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    // Invalidate any previous unused invite codes for this email
    await adminClient
      .from('security_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('type', 'invite')
      .eq('used', false);

    // Insert new invite code
    const { error: insertError } = await adminClient.from('security_codes').insert({
      email: normalizedEmail,
      code,
      type: 'invite',
      expires_at: expiresAt,
      attempts: 0,
      metadata: { role, invited_by: caller.id },
    });

    if (insertError) {
      console.error('[send-invite-code] Insert error:', insertError);
      return jsonResponse({ error: 'Erro ao gerar código de convite.' }, 500, corsHeaders);
    }

    // Dev mode: no API key
    if (!RESEND_API_KEY) {
      console.log(`[send-invite-code] DEV — invite code ${code} for ${normalizedEmail} (role: ${role})`);
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    const registerUrl = `${DEFAULT_SITE_URL}/validar/entrada/tipodeuser?mode=convite&email=${encodeURIComponent(normalizedEmail)}&role=${encodeURIComponent(role)}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [normalizedEmail],
        subject: `Convite de acesso Vision7 - ${brandName}`,
        html: renderInviteEmail(code, role, brandName, logoUrl, registerUrl, CODE_EXPIRY_HOURS),
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('[send-invite-code] Resend error:', resData);
      return jsonResponse({ error: 'Erro ao enviar email de convite. Tente novamente.' }, 500, corsHeaders);
    }

    console.log(`[send-invite-code] Invite sent to ${normalizedEmail} (role: ${role}), id: ${resData.id}`);

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err) {
    console.error('[send-invite-code] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});

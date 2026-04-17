/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision VII <noreply@vision7.pt>';
const ADMIN_NOTIFY_EMAIL = Deno.env.get('ADMIN_NOTIFY_EMAIL') ?? 'Visiondevgrid@proton.me';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';

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
  if (/^https:\/\/[\w-]+\.github\.dev$/.test(origin)) return true;
  return false;
}

function buildCorsHeaders(origin: string): HeadersInit {
  const allowedOrigin = isOriginAllowed(origin) ? origin : fallbackAllowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(payload: Record<string, unknown>, status: number, corsHeaders: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ── Rate Limiter (in-memory, per IP) ── */
const RATE_WINDOW_MS = 300_000; // 5 minutes
const RATE_MAX = 5; // max 5 requests / 5min / IP
const rateBuckets = new Map();

function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}

function isRateLimited(key) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) {
    if (now > b.resetAt) rateBuckets.delete(k);
  }
}, 120_000);

const ROLE_LABELS: Record<string, string> = {
  editor: 'Editor',
  redator: 'Redator / Revisor',
  moderador: 'Moderador',
  analyst: 'Analista',
  admin: 'Administrador',
};

function renderAdminEmail(payload: { brandName: string; email: string; requestedRole: string; context: string }) {
  const roleLabel = ROLE_LABELS[payload.requestedRole] ?? payload.requestedRole.replace('_', ' ');

  return `<!DOCTYPE html>
<html lang="pt">
  <body style="margin:0;padding:32px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #dbeafe;overflow:hidden;box-shadow:0 18px 48px rgba(30,64,175,0.10);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);text-align:center;">
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;">Pedido de acesso / parceria</p>
                <h2 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Nova solicitação recebida no portal ${escapeHtml(payload.brandName)}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">Um utilizador preencheu o formulário público de acesso da equipa. Antes de convidar, valide contexto, escopo de atuação, alinhamento editorial e necessidade real do perfil solicitado.</p>
                <div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;background:#f8fafc;">
                  <p style="margin:0 0 10px;font-size:14px;"><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
                  <p style="margin:0 0 10px;font-size:14px;"><strong>Perfil solicitado:</strong> ${escapeHtml(roleLabel)}</p>
                  <p style="margin:0;font-size:14px;line-height:1.7;"><strong>Contexto enviado:</strong><br/>${escapeHtml(payload.context).replaceAll('\n', '<br/>')}</p>
                </div>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#64748b;">Recomendação operacional: só enviar convite após confirmar o enquadramento da parceria, responsabilidade esperada, duração do acesso e regras de utilização do dashboard.</p>
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

  // Rate limit by IP
  const clientIp = getClientIp(req);
  if (isRateLimited(`team-access:${clientIp}`)) {
    return jsonResponse({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, 429, {
      ...corsHeaders,
      'Retry-After': '300',
    });
  }

  try {
    const { email, requestedRole, context } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return jsonResponse({ error: 'Email inválido.' }, 400, corsHeaders);
    }

    if (!requestedRole) {
      return jsonResponse({ error: 'Perfil solicitado é obrigatório.' }, 400, corsHeaders);
    }

    if (!context || String(context).trim().length < 20) {
      return jsonResponse({ error: 'Descreva melhor o objetivo do acesso para análise da equipa.' }, 400, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: siteSettings } = await adminClient
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_name']);

    const brandName = siteSettings?.find((entry) => entry.key === 'site_name')?.value?.trim() || 'Vision7';

    const { error: insertError } = await adminClient.from('partner_access_requests').insert({
      email: normalizedEmail,
      requested_role: requestedRole,
      request_context: String(context).trim(),
      status: 'pending',
      source: 'public_access_form',
    });

    if (insertError) {
      console.error('[request-team-access] insert error:', insertError);
      return jsonResponse({ error: 'Não foi possível registar o pedido.' }, 500, corsHeaders);
    }

    if (!RESEND_API_KEY) {
      console.log(`[request-team-access] DEV -> ${normalizedEmail} pediu ${requestedRole}`);
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_NOTIFY_EMAIL],
        subject: `Novo pedido de acesso/parceria - ${brandName}`,
        html: renderAdminEmail({
          brandName,
          email: normalizedEmail,
          requestedRole,
          context: String(context).trim(),
        }),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('[request-team-access] resend error:', data);
      return jsonResponse({ error: 'O pedido foi registado, mas falhou o envio do email para a administração.' }, 500, corsHeaders);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    console.error('[request-team-access] unexpected error:', error);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});
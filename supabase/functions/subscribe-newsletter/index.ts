// @ts-nocheck — Deno runtime
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision7 <noreply@vision7.pt>';
const SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? 'https://portal.vision7.pt').replace(/\/$/, '');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function welcomeEmailHtml(email: string): string {
  const unsubUrl = `${SITE_URL}/?unsubscribe=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1e2d4a">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0a64c0,#1d4ed8);padding:36px 32px;text-align:center">
          <img src="${SITE_URL}/vision-logo-premium-default.webp" alt="Vision7" width="120" style="display:block;margin:0 auto 16px;border-radius:8px">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px">Bem-vindo à Vision7!</h1>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px">Sua assinatura foi confirmada com sucesso</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#e2e8f0;font-size:15px;line-height:1.6">
            Olá! 👋 Você agora faz parte da comunidade Vision7 — o portal de referência em tecnologia, negócios e inovação em português.
          </p>
          <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">
            Toda semana você recebe análises aprofundadas, notícias relevantes e insights exclusivos direto na sua caixa de entrada.
          </p>
          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px">
            <a href="${SITE_URL}" style="display:inline-block;background:#0a64c0;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px">
              Explorar o Portal →
            </a>
          </td></tr></table>
          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #1e2d4a;margin:0 0 24px">
          <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;text-align:center">
            Você recebe este email porque assinou a newsletter da Vision7.<br>
            <a href="${unsubUrl}" style="color:#475569;text-decoration:underline">Cancelar inscrição</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? '').toString().trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return new Response(JSON.stringify({ error: 'Email inválido' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check for existing subscription
  const { data: existing } = await db
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    if (existing.is_active) {
      return new Response(JSON.stringify({ status: 'already_subscribed' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    // Reactivate if previously unsubscribed
    await db.from('newsletter_subscribers').update({ is_active: true, subscribed_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    const { error: insertErr } = await db.from('newsletter_subscribers').insert({ email, is_active: true });
    if (insertErr) {
      console.error('[subscribe-newsletter] Insert error:', insertErr);
      return new Response(JSON.stringify({ error: 'Erro ao registrar inscrição' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  // Send welcome email via Resend
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: 'Bem-vindo à Vision7 — sua assinatura foi confirmada!',
          html: welcomeEmailHtml(email),
        }),
      });
    } catch (err) {
      console.error('[subscribe-newsletter] Resend error:', err);
      // Non-fatal — subscriber is already saved
    }
  }

  return new Response(JSON.stringify({ status: 'subscribed' }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});

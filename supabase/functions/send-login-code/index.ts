/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision VII <noreply@vision7.pt>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CODE_EXPIRY_MINUTES = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(length = 6): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => (n % 10).toString()).join('');
}

function renderEmail(code: string, expiresInMinutes: number): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; }
    .code-block {
      font-family: 'SF Mono','Fira Code','Courier New',monospace;
      font-size: 40px;
      letter-spacing: 14px;
      font-weight: 700;
      color: #2563EB;
      background: #EFF6FF;
      border-radius: 12px;
      padding: 20px 36px;
      display: inline-block;
      border: 2px dashed rgba(37,99,235,0.3);
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#020817,#071d49);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Vision VII</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Portal de Informação</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px;">
              <h2 style="margin:0 0 10px;font-size:20px;color:#1e293b;font-weight:600;">O seu código de acesso</h2>
              <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.65;">
                Introduza o código abaixo no painel de administração para iniciar sessão:
              </p>

              <div style="text-align:center;margin:0 0 32px;">
                <span class="code-block">${code}</span>
              </div>

              <p style="margin:0 0 0;font-size:14px;color:#64748b;text-align:center;">
                Este código expira em <strong style="color:#1e293b;">${expiresInMinutes} minutos</strong>.<br/>
                Se não solicitou este acesso, ignore este email.
              </p>

              <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;" />

              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                🔒 Nunca partilhe este código com ninguém.<br/>
                A equipa Vision VII nunca solicitará o seu código de acesso.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
                &copy; ${new Date().getFullYear()} Vision VII. Todos os direitos reservados.
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const code = generateCode(6);
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Invalidate any existing active codes for this email
    await adminClient
      .from('security_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .eq('used', false);

    // Insert new code
    const { error: insertError } = await adminClient.from('security_codes').insert({
      email: normalizedEmail,
      code,
      type: 'login',
      expires_at: expiresAt,
      attempts: 0,
    });

    if (insertError) {
      console.error('[send-login-code] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código de acesso' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Dev mode: no API key
    if (!RESEND_API_KEY) {
      console.log(`[send-login-code] DEV — OTP ${code} for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: true, expiresInMinutes: CODE_EXPIRY_MINUTES }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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
        subject: `${code} — Código de Acesso Vision VII`,
        html: renderEmail(code, CODE_EXPIRY_MINUTES),
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('[send-login-code] Resend error:', resData);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar email. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[send-login-code] Sent to ${normalizedEmail}, id: ${resData.id}`);

    return new Response(
      JSON.stringify({ success: true, expiresInMinutes: CODE_EXPIRY_MINUTES }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-login-code] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

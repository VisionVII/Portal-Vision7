/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision VII <noreply@vision-portal.pt>';
const ALLOWED_ORIGIN_ENV = Deno.env.get('ALLOWED_EMAIL_ORIGINS')
  ?? Deno.env.get('PUBLIC_SITE_URL')
  ?? Deno.env.get('SITE_URL')
  ?? '';

const allowedOrigins = ALLOWED_ORIGIN_ENV
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const DEFAULT_DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://localhost:3000',
  'https://localhost:5173',
  'https://localhost:8080',
]);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (DEFAULT_DEV_ORIGINS.has(origin)) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

function buildCorsHeaders(origin: string | null) {
  const safeOrigin = origin && isOriginAllowed(origin) ? origin : (allowedOrigins[0] || '*');

  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const MAX_SUBJECT_LENGTH = 200;
const MAX_HTML_LENGTH = 200_000;
const MAX_EMAIL_LENGTH = 320;

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  template?: string;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { to, subject, html, template }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (to.length > MAX_EMAIL_LENGTH || subject.length > MAX_SUBJECT_LENGTH || html.length > MAX_HTML_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Payload exceeds allowed limits' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!RESEND_API_KEY) {
      console.log(`[send-email] No RESEND_API_KEY configured. Would send ${template || 'custom'} email.`);
      return new Response(
        JSON.stringify({ message: 'Email logged (no API key configured)', id: 'dev-mode' }),
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
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[send-email] Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[send-email] Sent ${template || 'custom'} email, id: ${data.id}`);

    return new Response(
      JSON.stringify({ message: 'Email sent', id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-email] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

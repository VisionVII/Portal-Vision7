// @ts-nocheck
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CREDENTIALS_ENCRYPTION_KEY = Deno.env.get('N8N_CREDENTIALS_ENCRYPTION_KEY') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('N8N_PROXY_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGIN_SUFFIXES = ['.vision7.pt'];

const N8N_ADMIN_ROLES = new Set(['super_admin', 'admin']);

function isAllowedOrigin(origin: string) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length === 0) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    const isHttps = protocol === 'https:';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isVisionDomain = ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
    if ((isHttps && isVisionDomain) || isLocalhost) return true;
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allow = isAllowedOrigin(origin) || origin.endsWith('.supabase.co');
  return {
    'Access-Control-Allow-Origin': allow ? origin : (ALLOWED_ORIGINS[0] || 'https://www.vision7.pt'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', utf8ToBytes(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptValue(secret: string, plaintext: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    utf8ToBytes(plaintext),
  );

  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

async function decryptValue(secret: string, payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) throw new Error('Invalid encrypted payload format');

  const key = await deriveAesKey(secret);
  const iv = base64ToBytes(ivB64);
  const encrypted = base64ToBytes(dataB64);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted,
  );

  return new TextDecoder().decode(plaintext);
}

async function sendReminderEmail(email: string, keyName: string, expiresAt: string, daysBefore: number) {
  const subject = `Vision7: a chave ${keyName} expira em breve`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2>Rotação de chave necessária</h2>
      <p>A chave <strong>${keyName}</strong> está na janela de aviso configurada (${daysBefore} dias).</p>
      <p><strong>Expiração:</strong> ${new Date(expiresAt).toLocaleString('pt-PT')}</p>
      <p>Abra a dashboard Vision7 e substitua a chave em Automações.</p>
      <p><a href="${SITE_URL}/admin/dashboard">Abrir dashboard</a></p>
    </div>
  `;

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      to: email,
      subject,
      html,
      template: 'n8n-key-expiry-reminder',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to send reminder email: ${text}`);
  }
}

async function maybeSendExpiryReminders(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data: rows, error } = await supabaseAdmin
    .from('n8n_credentials')
    .select('id,key_name,expires_at,reminder_email,remind_days_before,last_reminder_sent_at,status,activated_at')
    .eq('status', 'active')
    .not('reminder_email', 'is', null);

  if (error || !rows?.length) return 0;

  let sent = 0;
  const now = new Date();

  for (const row of rows) {
    const expiresAt = new Date(row.expires_at);
    const remindAt = new Date(expiresAt.getTime() - row.remind_days_before * 24 * 60 * 60 * 1000);
    const alreadySentAt = row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null;
    const activatedAt = row.activated_at ? new Date(row.activated_at) : null;

    if (now < remindAt) continue;
    if (alreadySentAt && (!activatedAt || alreadySentAt >= activatedAt)) continue;

    try {
      await sendReminderEmail(row.reminder_email, row.key_name, row.expires_at, row.remind_days_before);
      await supabaseAdmin
        .from('n8n_credentials')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      sent += 1;
    } catch (err) {
      console.error('[n8n-settings] reminder error', err);
    }
  }

  return sent;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  const origin = req.headers.get('Origin') ?? '';

  if (origin && !isAllowedOrigin(origin) && !origin.endsWith('.supabase.co')) {
    return jsonResponse({ error: 'Origin not allowed', origin }, 403, cors);
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized — missing token' }, 401, cors);
    }

    const token = authHeader.slice(7);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Supabase env is missing' }, 500, cors);
    }

    if (!CREDENTIALS_ENCRYPTION_KEY) {
      return jsonResponse({ error: 'N8N_CREDENTIALS_ENCRYPTION_KEY is missing' }, 500, cors);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user?.id) {
      return jsonResponse({ error: 'Unauthorized — invalid or expired token' }, 401, cors);
    }

    const userId = authData.user.id;

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rolesError) return jsonResponse({ error: 'Internal error checking roles' }, 500, cors);
    if (!roles?.some((r: { role: string }) => N8N_ADMIN_ROLES.has(r.role))) {
      return jsonResponse({ error: 'Forbidden — admin role required' }, 403, cors);
    }

    const body = await req.json();
    const action = String(body?.action ?? 'list');

    if (action === 'list') {
      await maybeSendExpiryReminders(supabaseAdmin);

      const { data, error } = await supabaseAdmin
        .from('n8n_credentials')
        .select('id,key_name,expires_at,status,notes,reminder_email,remind_days_before,last_reminder_sent_at,activated_at,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 500, cors);
      return jsonResponse({ data }, 200, cors);
    }

    if (action === 'create') {
      const keyName = String(body?.keyName ?? 'N8N_API_KEY').trim();
      const value = String(body?.value ?? '').trim();
      const expiresAt = String(body?.expiresAt ?? '').trim();
      const notes = body?.notes ? String(body.notes) : null;
      const reminderEmail = body?.reminderEmail ? String(body.reminderEmail).trim() : null;
      const remindDaysBefore = Number(body?.remindDaysBefore ?? 7);

      if (!value || !expiresAt) {
        return jsonResponse({ error: 'value and expiresAt are required' }, 400, cors);
      }

      if (![7, 30, 60, 90].includes(remindDaysBefore)) {
        return jsonResponse({ error: 'remindDaysBefore must be one of 7, 30, 60 or 90' }, 400, cors);
      }

      const encrypted = await encryptValue(CREDENTIALS_ENCRYPTION_KEY, value);

      const { data, error } = await supabaseAdmin
        .from('n8n_credentials')
        .insert({
          key_name: keyName,
          encrypted_value: encrypted,
          expires_at: expiresAt,
          status: 'inactive',
          notes,
          reminder_email: reminderEmail,
          remind_days_before: remindDaysBefore,
          created_by: userId,
        })
        .select('id,key_name,expires_at,status,notes,reminder_email,remind_days_before,last_reminder_sent_at,activated_at,created_at,updated_at')
        .single();

      if (error) return jsonResponse({ error: error.message }, 500, cors);
      return jsonResponse({ data }, 201, cors);
    }

    if (action === 'activate') {
      const id = String(body?.id ?? '').trim();
      if (!id) return jsonResponse({ error: 'id is required' }, 400, cors);

      const { data: target, error: targetError } = await supabaseAdmin
        .from('n8n_credentials')
        .select('id,key_name,status,encrypted_value')
        .eq('id', id)
        .single();

      if (targetError || !target) return jsonResponse({ error: 'Credential not found' }, 404, cors);

      // decrypt once to validate payload integrity before activation
      await decryptValue(CREDENTIALS_ENCRYPTION_KEY, target.encrypted_value);

      await supabaseAdmin
        .from('n8n_credentials')
        .update({ status: 'inactive' })
        .eq('key_name', target.key_name)
        .eq('status', 'active');

      const { error: activateError } = await supabaseAdmin
        .from('n8n_credentials')
        .update({ status: 'active', activated_at: new Date().toISOString(), last_reminder_sent_at: null })
        .eq('id', id);

      if (activateError) return jsonResponse({ error: activateError.message }, 500, cors);
      return jsonResponse({ success: true }, 200, cors);
    }

    if (action === 'revoke') {
      const id = String(body?.id ?? '').trim();
      if (!id) return jsonResponse({ error: 'id is required' }, 400, cors);

      const { error } = await supabaseAdmin
        .from('n8n_credentials')
        .update({ status: 'revoked' })
        .eq('id', id);

      if (error) return jsonResponse({ error: error.message }, 500, cors);
      return jsonResponse({ success: true }, 200, cors);
    }

    if (action === 'send-reminders') {
      const sent = await maybeSendExpiryReminders(supabaseAdmin);
      return jsonResponse({ success: true, sent }, 200, cors);
    }

    return jsonResponse({ error: 'Unsupported action' }, 400, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500, cors);
  }
});

// @ts-nocheck
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CREDENTIALS_ENCRYPTION_KEY = Deno.env.get('N8N_CREDENTIALS_ENCRYPTION_KEY') ?? '';
const N8N_BASE_URL = (Deno.env.get('N8N_BASE_URL') ?? '').replace(/\/$/, '');
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://portal.vision7.pt';

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
    'Access-Control-Allow-Origin': allow ? origin : (ALLOWED_ORIGINS[0] || 'https://portal.vision7.pt'),
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

function looksLikeTemplateLiteral(value: string) {
  return /\{\{|\$env|=\{|^=/.test(value);
}

function validateCredentialFormat(keyName: string, value: string) {
  const normalizedKeyName = keyName.trim().toUpperCase();
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error('A chave não pode estar vazia.');
  }

  if (looksLikeTemplateLiteral(normalizedValue)) {
    throw new Error('A chave parece conter uma expression/template do n8n. Guarde o valor bruto, sem =, {{ }} ou $env.');
  }

  if (normalizedKeyName === 'SUPABASE_SERVICE_ROLE_KEY') {
    if (normalizedValue.startsWith('eyJ') || normalizedValue.split('.').length === 3) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY inválida para o pipeline. Use a secret key sb_secret..., não a JWT legada service_role.');
    }

    if (!normalizedValue.startsWith('sb_secret')) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY inválida para o pipeline. O valor deve começar com sb_secret.');
    }
  }

  if (normalizedKeyName === 'GROQ_API_KEY' && !normalizedValue.startsWith('gsk_')) {
    throw new Error('GROQ_API_KEY inválida. O valor esperado começa com gsk_.');
  }

  if (normalizedKeyName === 'HF_API_TOKEN' && !normalizedValue.startsWith('hf_')) {
    throw new Error('HF_API_TOKEN inválido. O valor esperado começa com hf_.');
  }
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

  let body: Record<string, unknown> | null = null;
  try {
    body = await resp.json();
  } catch {
    body = null;
  }

  if (!resp.ok) {
    const detail = typeof body?.error === 'string' ? body.error : `HTTP ${resp.status}`;
    throw new Error(`Failed to send reminder email: ${detail}`);
  }

  // send-email returns "dev-mode" when RESEND_API_KEY is missing.
  if (body?.id === 'dev-mode') {
    throw new Error('send-email está em modo dev (RESEND_API_KEY ausente); email não foi entregue');
  }
}

async function validateN8nApiKey(candidateKey: string) {
  if (!N8N_BASE_URL) {
    throw new Error('N8N_BASE_URL ausente; não foi possível validar a chave');
  }

  const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows?limit=1&excludePinnedData=true`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': candidateKey,
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (response.ok) return;

  let detail = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    detail = body?.message || body?.error || detail;
  } catch {
    try {
      detail = (await response.text()).slice(0, 200) || detail;
    } catch {
      // ignore
    }
  }

  throw new Error(`A chave não foi aceite pelo n8n: ${detail}`);
}

async function maybeSendExpiryReminders(
  supabaseAdmin: ReturnType<typeof createClient>,
  options?: { force?: boolean },
) {
  const { data: rows, error } = await supabaseAdmin
    .from('n8n_credentials')
    .select('id,key_name,expires_at,reminder_email,remind_days_before,last_reminder_sent_at,status,activated_at')
    .eq('status', 'active')
    .not('reminder_email', 'is', null);

  if (error || !rows?.length) {
    return { sent: 0, skipped: 0, failed: error ? 1 : 0, details: error ? [error.message] : [] };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const details: string[] = [];
  const now = new Date();
  const force = options?.force === true;

  for (const row of rows) {
    const expiresAt = new Date(row.expires_at);
    const remindAt = new Date(expiresAt.getTime() - row.remind_days_before * 24 * 60 * 60 * 1000);
    const alreadySentAt = row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null;
    const activatedAt = row.activated_at ? new Date(row.activated_at) : null;

    if (!force && now < remindAt) {
      skipped += 1;
      continue;
    }

    if (!force && alreadySentAt && (!activatedAt || alreadySentAt >= activatedAt)) {
      skipped += 1;
      continue;
    }

    try {
      await sendReminderEmail(row.reminder_email, row.key_name, row.expires_at, row.remind_days_before);
      await supabaseAdmin
        .from('n8n_credentials')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
      sent += 1;
    } catch (err) {
      console.error('[n8n-settings] reminder error', err);
      failed += 1;
      details.push(`id=${row.id}: ${err instanceof Error ? err.message : 'erro ao enviar'}`);
    }
  }

  return { sent, skipped, failed, details };
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

    const { limited } = await checkRateLimit(supabaseAdmin, userId, 'n8n-settings', 60);
    if (limited) {
      return jsonResponse({ error: 'Too many requests — limite de 60/hora por utilizador' }, 429, { ...cors, 'Retry-After': '3600' });
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

      try {
        validateCredentialFormat(keyName, value);
      } catch (validationError) {
        const message = validationError instanceof Error ? validationError.message : 'Formato de chave inválido';
        return jsonResponse({ error: message }, 400, cors);
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
      const force = body?.force === true;
      if (!id) return jsonResponse({ error: 'id is required' }, 400, cors);

      const { data: target, error: targetError } = await supabaseAdmin
        .from('n8n_credentials')
        .select('id,key_name,status,encrypted_value,expires_at,notes,reminder_email,remind_days_before,last_reminder_sent_at,activated_at,created_at,updated_at')
        .eq('id', id)
        .single();

      if (targetError || !target) return jsonResponse({ error: 'Credential not found' }, 404, cors);

      if (target.status === 'revoked') {
        return jsonResponse({ error: 'A chave revogada não pode ser reativada. Use uma chave inativa ou crie uma nova.' }, 400, cors);
      }

      if (new Date(target.expires_at).getTime() <= Date.now()) {
        return jsonResponse({ error: 'A chave está expirada e não pode ser ativada.' }, 400, cors);
      }

      // decrypt once to validate payload integrity before activation
      const decryptedValue = await decryptValue(CREDENTIALS_ENCRYPTION_KEY, target.encrypted_value);

      try {
        await validateN8nApiKey(decryptedValue);
      } catch (validationError) {
        if (!force) {
          const message = validationError instanceof Error ? validationError.message : 'A chave falhou na validação do n8n';
          return jsonResponse({ error: message }, 400, cors);
        }
      }

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
      return jsonResponse({ success: true, force }, 200, cors);
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

    if (action === 'delete') {
      const id = String(body?.id ?? '').trim();
      if (!id) return jsonResponse({ error: 'id is required' }, 400, cors);

      const { error } = await supabaseAdmin
        .from('n8n_credentials')
        .delete()
        .eq('id', id);

      if (error) return jsonResponse({ error: error.message }, 500, cors);
      return jsonResponse({ success: true }, 200, cors);
    }

    if (action === 'send-reminders') {
      const force = body?.force === true;
      const result = await maybeSendExpiryReminders(supabaseAdmin, { force });
      return jsonResponse({
        success: result.failed === 0,
        force,
        ...result,
      }, result.failed > 0 ? 207 : 200, cors);
    }

    return jsonResponse({ error: 'Unsupported action' }, 400, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500, cors);
  }
});

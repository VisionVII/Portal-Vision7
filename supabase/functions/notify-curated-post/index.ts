/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Vision VII <noreply@vision7.pt>';
const PUBLIC_SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? 'https://vision-portal.pt').replace(/\/+$/, '');
const MANUAL_NOTIFICATION_EMAILS = (Deno.env.get('CURATED_NOTIFICATION_EMAILS') ?? Deno.env.get('PRIMARY_ADMIN_EMAIL') ?? '')
  .split(/[;,]/)
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS_ENV = Deno.env.get('ALLOWED_ORIGINS')
  ?? Deno.env.get('PUBLIC_SITE_URL')
  ?? Deno.env.get('SITE_URL')
  ?? '';

const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const DEV_ORIGINS = new Set([
  'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080',
  'https://localhost:3000', 'https://localhost:5173', 'https://localhost:8080',
]);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (DEV_ORIGINS.has(origin)) return true;
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const safeOrigin = origin && isOriginAllowed(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]/g, '').trim();
}

function sanitizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const list: string[] = [];
  for (const value of values) {
    const item = String(value ?? '').trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }
  return list;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(date);
}

function normalizeTopic(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeSourceArticles(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((entry) => {
      const item = asRecord(entry);
      return {
        title: String(item.title ?? '').trim(),
        source_name: String(item.source_name ?? item.sourceName ?? '').trim(),
        canonical_url: String(item.canonical_url ?? item.canonicalUrl ?? '').trim(),
        published_at: item.published_at ?? item.publishedAt ?? null,
        topic: String(item.topic ?? '').trim(),
      };
    })
    .filter((entry) => entry.title || entry.source_name || entry.canonical_url)
    .slice(0, 5);
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = sanitizeHeaderValue(req.headers.get('Authorization') ?? '');
  const apiKeyHeader = sanitizeHeaderValue(req.headers.get('apikey') ?? '');
  const token = sanitizeHeaderValue(authHeader.replace(/^Bearer\s+/i, ''));
  const expected = sanitizeHeaderValue(SUPABASE_SERVICE_ROLE_KEY);

  if (token === expected || authHeader === expected || apiKeyHeader === expected) {
    return true;
  }

  // Fallback: accept any valid service_role JWT for this project
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (
        payload.role === 'service_role' &&
        payload.ref === SUPABASE_URL.split('.')[0].replace('https://', '')
      ) {
        return true;
      }
    }
  } catch { /* not a valid JWT */ }

  if (!token || !SUPABASE_URL) return false;

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
    } = await adminClient.auth.getUser(token);

    if (!user) return false;

    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin', 'editor', 'redator'])
      .eq('is_active', true);

    return (roles?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function loadNotificationRecipients(adminClient: ReturnType<typeof createClient>) {
  const recipients = new Map<string, string>();

  for (const email of MANUAL_NOTIFICATION_EMAILS) {
    recipients.set(email.toLowerCase(), email);
  }

  const { data: roles, error: rolesError } = await adminClient
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['super_admin', 'admin', 'editor', 'redator'])
    .eq('is_active', true);

  if (rolesError) {
    throw new Error(`Falha ao carregar perfis para notificacao: ${rolesError.message}`);
  }

  const userIds = [...new Set((roles ?? []).map((role) => role.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return [...recipients.values()];
  }

  const { data: userPage, error: listUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersError) {
    throw new Error(`Falha ao carregar emails de destino: ${listUsersError.message}`);
  }

  for (const user of userPage.users ?? []) {
    if (user.email && userIds.includes(user.id)) {
      recipients.set(user.email.toLowerCase(), user.email);
    }
  }

  return [...recipients.values()];
}

function buildEmailHtml(payload: {
  curated: Record<string, unknown>;
  cluster: Record<string, unknown> | null;
  sourceArticles: Array<Record<string, unknown>>;
}) {
  const curated = payload.curated;
  const cluster = payload.cluster;
  const sourceArticles = payload.sourceArticles;
  const modelInfo = asRecord(curated.model_info);
  const reviewUrl = `${PUBLIC_SITE_URL}/admin`;
  const topic = escapeHtml(cluster?.topic ?? 'geral');
  const scoreColor = Number(curated.editorial_score ?? 0) >= 80 ? '#10B981' : Number(curated.editorial_score ?? 0) >= 60 ? '#F59E0B' : '#EF4444';
  const sourcesHtml = sourceArticles.length > 0
    ? sourceArticles.map((source, index) => {
      const url = String(source.canonical_url ?? '').trim();
      const sourceTitle = escapeHtml(source.title ?? `Fonte ${index + 1}`);
      const sourceName = escapeHtml(source.source_name ?? 'Origem não identificada');
      const publishedAt = source.published_at ? `<div style="margin-top:4px;color:#64748b;font-size:12px;">Publicado: ${escapeHtml(formatDate(source.published_at))}</div>` : '';
      const urlHtml = url
        ? `<div style="margin-top:4px;"><a href="${escapeHtml(url)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(url)}</a></div>`
        : '';
      return `
        <div style="padding:12px 0;border-top:${index === 0 ? '0' : '1px solid #e2e8f0'};">
          <div style="font-size:14px;font-weight:600;color:#0f172a;">${sourceTitle}</div>
          <div style="margin-top:4px;color:#334155;font-size:13px;">${sourceName}</div>
          ${publishedAt}
          ${urlHtml}
        </div>
      `;
    }).join('')
    : '<p style="margin:0;color:#64748b;font-size:13px;">As fontes nao foram anexadas pelo workflow nesta execucao.</p>';

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#0f766e 100%);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.78;">Vision7 IA</div>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;">Nova curadoria pronta para revisao</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;opacity:0.86;">O workflow editorial gerou um novo artigo curado e registou o contexto principal desta noticia.</p>
        </div>

        <div style="padding:28px;">
          <div style="margin-bottom:24px;padding:18px;border-radius:14px;background:#f8fafc;border-left:4px solid #0f766e;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${escapeHtml(curated.title ?? 'Sem titulo')}</h2>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(curated.excerpt ?? curated.subtitle ?? 'Sem resumo adicional.')}</p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Score editorial</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;color:${scoreColor};">${escapeHtml(Number(curated.editorial_score ?? 0).toFixed(0))}/100</div>
            </div>
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Confianca do cluster</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(Number(curated.confidence_score ?? cluster?.confidence_score ?? 0).toFixed(0))}/100</div>
            </div>
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Tema</div>
              <div style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;">${topic}</div>
            </div>
            <div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Curadoria</div>
              <div style="margin-top:6px;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(formatDate(curated.created_at))}</div>
            </div>
          </div>

          <div style="margin-bottom:24px;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Metadados</div>
            <div style="margin-top:10px;color:#334155;font-size:14px;line-height:1.8;">
              <div><strong>Status:</strong> ${escapeHtml(curated.status ?? 'ready')}</div>
              <div><strong>Tom editorial:</strong> ${escapeHtml(curated.tone_profile ?? modelInfo.target_tone ?? 'vision7')}</div>
              <div><strong>Automacao:</strong> ${escapeHtml(modelInfo.automation_name ?? 'content_pipeline')}</div>
              <div><strong>Workflow:</strong> WF-03 IA Reescrita Auditoria Publicacao</div>
              <div><strong>Fontes anexadas:</strong> ${escapeHtml(sourceArticles.length)}</div>
            </div>
          </div>

          <div style="margin-bottom:24px;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">Fontes da curadoria</div>
            <div style="margin-top:10px;">${sourcesHtml}</div>
          </div>

          <div style="text-align:center;">
            <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;">Abrir painel editorial</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Supabase environment is not configured' }, 500, cors);
  }

  if (!(await isAuthorized(req))) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ error: 'RESEND_API_KEY não configurada no backend' }, 503, cors);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let curatedPostId = '';

  try {
    const body = await req.json();
    curatedPostId = String(body?.curatedPostId ?? '').trim();
    const force = body?.force === true;

    if (!curatedPostId) {
      return jsonResponse({ error: 'curatedPostId is required' }, 400, cors);
    }

    const { data: curated, error: curatedError } = await adminClient
      .from('curated_posts')
      .select('id, title, subtitle, excerpt, slug, status, editorial_score, confidence_score, tone_profile, created_at, metrics, model_info, cluster_id')
      .eq('id', curatedPostId)
      .maybeSingle();

    if (curatedError) {
      throw new Error(curatedError.message);
    }

    if (!curated) {
      return jsonResponse({ error: 'Curated post not found' }, 404, cors);
    }

    const currentMetrics = asRecord(curated.metrics);
    if (currentMetrics.curation_notification_sent_at && !force) {
      return jsonResponse({ notified: false, status: 'already_notified' }, 200, cors);
    }

    const { data: cluster, error: clusterError } = curated.cluster_id
      ? await adminClient
        .from('news_clusters')
        .select('id, topic, source_count, confidence_score, fingerprint, created_at')
        .eq('id', curated.cluster_id)
        .maybeSingle()
      : { data: null, error: null };

    if (clusterError) {
      throw new Error(clusterError.message);
    }

    let sourceArticles = normalizeSourceArticles(body?.sourceArticles);
    if (sourceArticles.length === 0 && cluster?.fingerprint) {
      const { data: stagingRows, error: stagingError } = await adminClient
        .from('news_staging')
        .select('title, source_name, canonical_url, published_at, topic')
        .eq('duplicate_fingerprint', cluster.fingerprint)
        .limit(5);

      if (stagingError) {
        throw new Error(stagingError.message);
      }

      sourceArticles = normalizeSourceArticles(stagingRows);
    }

    const recipients = await loadNotificationRecipients(adminClient);
    if (recipients.length === 0) {
      return jsonResponse({ notified: false, status: 'no_recipients' }, 422, cors);
    }

    const subject = `Nova curadoria Vision7 IA: ${String(curated.title ?? 'Sem titulo')}`;
    const html = buildEmailHtml({ curated, cluster, sourceArticles });
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      throw new Error(resendData?.message || 'Falha ao enviar email de curadoria');
    }

    const nextMetrics = {
      ...currentMetrics,
      curation_notification_sent_at: new Date().toISOString(),
      curation_notification_recipients: recipients,
      curation_notification_delivery_id: resendData?.id ?? null,
      curation_notification_status: 'sent',
      curation_notification_source_count: sourceArticles.length,
      curation_notification_topic: cluster?.topic ?? null,
    };

    await adminClient
      .from('curated_posts')
      .update({ metrics: nextMetrics })
      .eq('id', curatedPostId);

    return jsonResponse({
      notified: true,
      status: 'sent',
      recipientsCount: recipients.length,
      deliveryId: resendData?.id ?? null,
    }, 200, cors);
  } catch (error) {
    if (curatedPostId) {
      try {
        const { data: current } = await adminClient
          .from('curated_posts')
          .select('metrics')
          .eq('id', curatedPostId)
          .maybeSingle();

        await adminClient
          .from('curated_posts')
          .update({
            metrics: {
              ...asRecord(current?.metrics),
              curation_notification_status: 'failed',
              curation_notification_last_error: error instanceof Error ? error.message : 'Unknown error',
              curation_notification_last_attempt_at: new Date().toISOString(),
            },
          })
          .eq('id', curatedPostId);
      } catch {
        // noop
      }
    }

    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500, cors);
  }
});
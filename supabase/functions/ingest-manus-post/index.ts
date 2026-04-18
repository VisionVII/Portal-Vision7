// @ts-nocheck
// deno-lint-ignore-file
/**
 * ingest-manus-post — Edge Function dedicada para ingestão de posts criados pelo Manus AI.
 *
 * TOTALMENTE ISOLADA dos workflows n8n existentes (WF-01 a WF-06).
 * Usa chave própria MANUS_INGEST_SECRET, independente de qualquer outro segredo.
 *
 * POST /functions/v1/ingest-manus-post
 * Header: Authorization: Bearer <MANUS_INGEST_SECRET>
 *
 * Payload JSON:
 * {
 *   title:         string  (obrigatório)
 *   excerpt:       string  (obrigatório)
 *   content:       string  (obrigatório — HTML ou Markdown)
 *   image_url?:    string  (URL pública da imagem de capa)
 *   banner_url?:   string  (URL pública do banner)
 *   image_base64?: string  (data URL base64, ex: "data:image/png;base64,...")
 *   banner_base64?:string  (data URL base64)
 *   category_slug?:string  (slug da categoria, ex: "tecnologia")
 *   author_name?:  string  (default: "Redação Vision7")
 *   tags?:         string[]
 *   status?:       "draft" | "published"  (default: "draft")
 *   featured?:     boolean (default: false)
 *   read_time?:    string  (ex: "5 min" — auto-calculado se omitido)
 * }
 *
 * Resposta de sucesso (201):
 * { id, slug, status, url }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MANUS_INGEST_SECRET = Deno.env.get('MANUS_INGEST_SECRET') ?? '';
const SITE_URL = (Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL') ?? 'https://www.vision7.pt').replace(/\/$/, '');
const STORAGE_BUCKET = 'post-images';
const MANUS_STORAGE_PREFIX = 'manus';
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── CORS ────────────────────────────────────────────────────────────────────
// Esta função é chamada por serviços externos (Manus AI), não por browsers.
// CORS permissivo apenas para preflight; autenticação é via secret.
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-manus-ingest-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────────
// O gateway Kong do Supabase exige um JWT válido no header Authorization.
// O Manus envia:
//   Authorization: Bearer <anon_key OU service_role_key>  → passa o Kong
//   x-manus-ingest-secret: <MANUS_INGEST_SECRET>           → valida na nossa lógica
// Também suportamos o fluxo legado (Authorization: Bearer <MANUS_INGEST_SECRET>)
// para compatibilidade com funções marcadas como "Public" (sem Enforce JWT).
function isAuthorized(req: Request): boolean {
  if (!MANUS_INGEST_SECRET) return false;

  // Cabeçalho personalizado: x-manus-ingest-secret (método preferido)
  const customHeader = req.headers.get('x-manus-ingest-secret') ?? '';
  if (customHeader.trim() === MANUS_INGEST_SECRET) return true;

  // Fallback legado: Authorization: Bearer <MANUS_INGEST_SECRET>
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token === MANUS_INGEST_SECRET) return true;

  // Fallback legado: apikey: <MANUS_INGEST_SECRET>
  const apiKey = req.headers.get('apikey') ?? '';
  if (apiKey.trim() === MANUS_INGEST_SECRET) return true;

  return false;
}

// ─── Rate limiting (in-memory, por IP) ───────────────────────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10; // 10 posts/min por IP (Manus raramente cria mais)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (bucket.count >= RATE_MAX) return true;
  bucket.count++;
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'manus-post'}-${Date.now().toString(36)}`;
}

function estimateReadTime(content: string): string {
  const text = content.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

/**
 * Converte Markdown para HTML básico quando o conteúdo não é HTML.
 * Reutiliza a mesma lógica do promote-curated-post.
 */
function isHtml(content: string): boolean {
  return /<(p|div|h[1-6]|ul|ol|article|section|blockquote)\b/i.test(content);
}

function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trimEnd()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>');
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr />');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  html = html.replace(/(^[\t ]*[-*]\s+.+\n?)+/gm, (block) => {
    const items = block.trim().split('\n')
      .map((l) => l.replace(/^[\t ]*[-*]\s+/, '').trim())
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join('\n');
    return `<ul>\n${items}\n</ul>`;
  });

  html = html.replace(/(^\d+\.\s+.+\n?)+/gm, (block) => {
    const items = block.trim().split('\n')
      .map((l) => l.replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join('\n');
    return `<ol>\n${items}\n</ol>`;
  });

  const lines = html.split('\n');
  const result: string[] = [];
  let buffer: string[] = [];

  const isBlock = (l: string) =>
    /^<(h[1-6]|ul|ol|li|pre|blockquote|hr|img)\b/i.test(l.trim()) ||
    /^<\/(ul|ol|pre|blockquote)>/i.test(l.trim());

  for (const line of lines) {
    if (line.trim() === '') {
      if (buffer.length) { result.push(`<p>${buffer.join(' ')}</p>`); buffer = []; }
    } else if (isBlock(line)) {
      if (buffer.length) { result.push(`<p>${buffer.join(' ')}</p>`); buffer = []; }
      result.push(line);
    } else {
      buffer.push(line.trim());
    }
  }
  if (buffer.length) result.push(`<p>${buffer.join(' ')}</p>`);

  return result.join('\n');
}

// ─── Upload de imagem base64 para o Storage ──────────────────────────────────
async function uploadBase64Image(
  adminClient: ReturnType<typeof createClient>,
  dataUrl: string,
  prefix: 'image' | 'banner',
): Promise<string | null> {
  // Formato esperado: "data:<mime>;base64,<dados>"
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;

  const mime = match[1];
  const b64 = match[2];
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'jpg';
  const fileName = `${MANUS_STORAGE_PREFIX}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Decode base64 → Uint8Array
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const { error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, bytes, { contentType: mime, upsert: false, cacheControl: '31536000' });

  if (error) {
    console.warn('[ingest-manus-post] Storage upload failed:', error.message);
    return null;
  }

  const { data: urlData } = adminClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return urlData.publicUrl ?? null;
}

// ─── Validação de URL pública ────────────────────────────────────────────────
function isSafeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido. Use POST.' }, 405);
  }

  // Auth
  if (!isAuthorized(req)) {
    return jsonResponse({ error: 'Não autorizado. Verifique o cabeçalho Authorization.' }, 401);
  }

  // Env check
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Ambiente Supabase não configurado.' }, 500);
  }

  // Rate limit por IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(clientIp)) {
    return jsonResponse({ error: 'Limite de requisições atingido. Tente novamente em 1 minuto.' }, 429);
  }

  // Parse body (com limite de tamanho)
  let body: Record<string, unknown>;
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: `Payload demasiado grande (máx ${MAX_BODY_BYTES / 1024 / 1024} MB).` }, 413);
    }
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'JSON inválido no body da requisição.' }, 400);
  }

  // ─── Validação dos campos obrigatórios ────────────────────────────────────
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
  const rawContent = typeof body.content === 'string' ? body.content.trim() : '';

  if (!title) return jsonResponse({ error: 'Campo "title" é obrigatório.' }, 422);
  if (!excerpt) return jsonResponse({ error: 'Campo "excerpt" é obrigatório.' }, 422);
  if (!rawContent) return jsonResponse({ error: 'Campo "content" é obrigatório.' }, 422);
  if (title.length > 500) return jsonResponse({ error: '"title" não pode exceder 500 caracteres.' }, 422);
  if (excerpt.length > 1000) return jsonResponse({ error: '"excerpt" não pode exceder 1000 caracteres.' }, 422);

  // ─── Campos opcionais ─────────────────────────────────────────────────────
  const authorName = typeof body.author_name === 'string' && body.author_name.trim()
    ? body.author_name.trim().slice(0, 120)
    : 'Redação Vision7';

  const statusRaw = body.status;
  const status = statusRaw === 'draft' ? 'draft' : 'published';

  const featured = body.featured === true;

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 20)
    : [];

  const categorySlug = typeof body.category_slug === 'string' ? body.category_slug.trim() : null;

  // ─── Processar conteúdo (Markdown → HTML se necessário) ──────────────────
  const content = isHtml(rawContent) ? rawContent : markdownToHtml(rawContent);
  const readTime = typeof body.read_time === 'string' && body.read_time.trim()
    ? body.read_time.trim()
    : estimateReadTime(content);

  // ─── Slug ─────────────────────────────────────────────────────────────────
  const slug = buildSlug(title);

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── Upload de imagens base64 → Storage ──────────────────────────────────
  let imageUrl: string | null = null;
  let bannerUrl: string | null = null;

  if (typeof body.image_base64 === 'string' && body.image_base64.startsWith('data:image/')) {
    imageUrl = await uploadBase64Image(adminClient, body.image_base64, 'image');
  } else if (isSafeUrl(body.image_url)) {
    imageUrl = body.image_url;
  }

  if (typeof body.banner_base64 === 'string' && body.banner_base64.startsWith('data:image/')) {
    bannerUrl = await uploadBase64Image(adminClient, body.banner_base64, 'banner');
  } else if (isSafeUrl(body.banner_url)) {
    bannerUrl = body.banner_url;
  }

  // ─── Resolver categoria pelo slug ────────────────────────────────────────
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: cat } = await adminClient
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  // ─── Inserir post ─────────────────────────────────────────────────────────
  const { data: post, error: insertError } = await adminClient
    .from('posts')
    .insert({
      title,
      slug,
      excerpt,
      content,
      image_url: imageUrl,
      banner_url: bannerUrl,
      category_id: categoryId,
      author_name: authorName,
      status,
      featured,
      read_time: readTime,
      tags: tags.length > 0 ? tags : null,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select('id, slug, status')
    .single();

  if (insertError) {
    console.error('[ingest-manus-post] Insert error:', insertError.message);
    return jsonResponse({ error: `Erro ao criar post: ${insertError.message}` }, 500);
  }

  // ─── Associar categoria na tabela post_categories (multi-categoria) ──────
  if (categoryId && post?.id) {
    await adminClient
      .from('post_categories')
      .insert({ post_id: post.id, category_id: categoryId })
      .then(({ error }) => {
        if (error) console.warn('[ingest-manus-post] post_categories insert warning:', error.message);
      });
  }

  return jsonResponse(
    {
      id: post.id,
      slug: post.slug,
      status: post.status,
      url: `${SITE_URL}/post/${post.slug}`,
    },
    201,
  );
});

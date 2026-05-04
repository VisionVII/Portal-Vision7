// @ts-nocheck
// deno-lint-ignore-file
/**
 * ingest-manus-post — Edge Function para ingestão de posts do Motor Editorial Vision7
 *
 * Suporta dois formatos:
 * 1. FORMATO COMPLETO (Motor Editorial) — novo schema JSON com SEO/AEO/qualidade
 * 2. FORMATO SIMPLES (compatibilidade) — apenas campos básicos
 *
 * POST /functions/v1/ingest-manus-post
 * Header: x-manus-ingest-secret: <MANUS_INGEST_SECRET>
 *
 * === FORMATO 1: MOTOR EDITORIAL COMPLETO ===
 * Estrutura JSON do Motor Editorial Vision7 (v1.0):
 * {
 *   "article": {
 *     "title": string,
 *     "slug": string,
 *     "meta_description": string (145–155 chars),
 *     "category": "tecnologia|mundo|saude|musica|desporto|audiocasts",
 *     "author": string,
 *     "seo": {
 *       "primary_keyword": string,
 *       "secondary_keywords": [string],
 *       "lsi_keywords": [string],
 *       "long_tail_keywords": [string],
 *       "entities": [string]
 *     },
 *     "cover_image": {
 *       "prompt": string,
 *       "alt_text": string,
 *       "color_accent": string (hex)
 *     },
 *     "content": {
 *       "lead": string,
 *       "body": string (markdown/HTML completo),
 *       "table_of_contents": [{title, anchor}],
 *       "faqs": [{question, answer}],
 *       "portugal_section": {optimistic, base, pessimistic},
 *       "dated_prediction": string,
 *       "cta": string,
 *       "conclusion": string
 *     },
 *     "links": {
 *       "internal": [{anchor_text, url}],
 *       "external": [{anchor_text, url, domain, rel}]
 *     },
 *     "quality_score": {
 *       "total": number (0–10),
 *       "structure": number,
 *       "seo_aeo": number,
 *       "data_sources": number,
 *       "links": number,
 *       "readability": number,
 *       "tone": number,
 *       "passed": boolean
 *     },
 *     "workflow_metadata": {
 *       "wf_id": string,
 *       "generation_model": string,
 *       "generation_timestamp": ISO8601,
 *       "review_required": boolean,
 *       "publish_ready": boolean
 *     },
 *     "reading_time_minutes": number,
 *     "word_count": number
 *   }
 * }
 *
 * === FORMATO 2: SIMPLES (compatibilidade) ===
 * {
 *   "title": string (obrigatório),
 *   "excerpt": string (obrigatório),
 *   "content": string (obrigatório),
 *   "category_slugs": [string] (opcional),
 *   "author_name": string (opcional),
 *   "tags": [string] (opcional),
 *   "status": "draft|published",
 *   "featured": boolean,
 *   "image_url": string (opcional),
 *   "image_base64": string (opcional),
 *   "editorial_template": string (opcional)
 * }
 *
 * Resposta de sucesso (201):
 * { id, slug, status, url, quality_score? }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Detecção de Formato do Payload ───────────────────────────────────────
function detectFormat(body: Record<string, unknown>): 'editorial' | 'simple' {
  // Formato Editorial: tem .article.seo ou .article.quality_score
  if (typeof body.article === 'object' && body.article !== null) {
    const article = body.article as Record<string, unknown>;
    if (article.seo || article.quality_score || article.content?.body) {
      return 'editorial';
    }
  }
  // Formato Simples: tem title, excerpt, content no root
  if (body.title && body.excerpt && body.content) {
    return 'simple';
  }
  return 'simple'; // Fallback
}
  const errors: string[] = [];
  
  // Verificar se tem as seções estruturais básicas
  const hasIntro = /<(h[1-6]|p)[^>]*>/.test(content);
  const hasSections = /<h[2-3][^>]*>/.test(content);
  
  if (!hasIntro) {
    errors.push('Conteúdo deve ter uma introdução (lide/resumo/objetivo)');
  }
  
  if (!hasSections) {
    errors.push('Conteúdo deve ter seções estruturadas (h2/h3)');
  }
  
  // Verificar se tem fontes ou referências
  const hasSources = /fontes|referências|links|sources/i.test(content);
  if (!hasSources) {
    errors.push('Conteúdo deve incluir seção de fontes/referências');
  }
  
  return { isValid: errors.length === 0, errors };


// ─── Processamento do Formato Editorial ───────────────────────────────────
interface EditorialPayload {
  article: {
    title: string;
    slug: string;
    meta_description: string;
    category: string;
    author: string;
    content: {
      body: string;
      lead: string;
      conclusion?: string;
      cta?: string;
      portugal_section?: Record<string, string>;
      dated_prediction?: string;
      faqs?: Array<{ question: string; answer: string }>;
    };
    seo?: {
      primary_keyword: string;
      secondary_keywords?: string[];
      lsi_keywords?: string[];
      long_tail_keywords?: string[];
      entities?: string[];
    };
    cover_image?: {
      prompt: string;
      color_accent: string;
      alt_text: string;
    };
    links?: {
      internal?: Array<{ anchor_text: string; url: string }>;
      external?: Array<{ anchor_text: string; url: string; domain: string; rel: string }>;
    };
    quality_score?: {
      total: number;
      structure: number;
      seo_aeo: number;
      data_sources: number;
      links: number;
      readability: number;
      tone: number;
      passed: boolean;
    };
    workflow_metadata?: Record<string, unknown>;
    reading_time_minutes?: number;
    word_count?: number;
  };
}

function processEditorialPayload(payload: EditorialPayload) {
  const { article } = payload;
  
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.content.lead || '',
    content: article.content.body,
    meta_description: article.meta_description,
    author_name: article.author || 'Redação Vision7',
    status: article.workflow_metadata?.publish_ready === true ? 'published' : 'draft',
    featured: false,
    read_time: article.reading_time_minutes ? `${article.reading_time_minutes} min` : '5 min',
    word_count: article.word_count || 0,
    reading_time_minutes: article.reading_time_minutes || 5,
    tags: article.seo?.entities || [],
    
    // Metadados SEO/AEO
    seo_keywords: {
      primary_keyword: article.seo?.primary_keyword || '',
      secondary_keywords: article.seo?.secondary_keywords || [],
      lsi_keywords: article.seo?.lsi_keywords || [],
      long_tail_keywords: article.seo?.long_tail_keywords || [],
      entities: article.seo?.entities || [],
    },
    
    // Imagem de capa
    cover_image_prompt: article.cover_image?.prompt || '',
    cover_image_accent: article.cover_image?.color_accent || '#0a0f1c',
    
    // Metadados editoriais
    editorial_metadata: {
      category: article.category,
      lead: article.content.lead,
      conclusion: article.content.conclusion,
      cta: article.content.cta,
      portugal_section: article.content.portugal_section,
      dated_prediction: article.content.dated_prediction,
      faqs: article.content.faqs,
      toc: article.content.table_of_contents,
    },
    
    // Qualidade e workflow
    quality_score: article.quality_score?.total || 0,
    quality_details: article.quality_score || {},
    workflow_metadata: article.workflow_metadata || {},
    
    // Links
    internal_links: article.links?.internal || [],
    external_links: article.links?.external || [],
  };
}

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

  // ─── Detectar formato do payload ──────────────────────────────────────────
  const format = detectFormat(body);
  
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let postData: Record<string, unknown>;
  let qualityScore = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATO 1: MOTOR EDITORIAL COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════
  if (format === 'editorial') {
    const editorialBody = body as EditorialPayload;
    const article = editorialBody.article;

    // Validação de campos obrigatórios
    if (!article.title || !article.slug || !article.content?.body) {
      return jsonResponse({ 
        error: 'Formato editorial: campos obrigatórios: article.title, article.slug, article.content.body' 
      }, 422);
    }

    // Processar dados completos do motor editorial
    postData = processEditorialPayload(editorialBody);
    qualityScore = article.quality_score?.total || 0;

    // Verificar se passou na validação de qualidade (score >= 9.5)
    if (qualityScore < 9.5 && article.workflow_metadata?.review_required !== false) {
      console.warn(`[ingest-manus-post] Quality score baixo: ${qualityScore} — mas processando anyway`);
    }

    // Resolver categoria por slug (usando o field category do article)
    let categoryId: string | null = null;
    if (article.category) {
      const { data: cat } = await adminClient
        .from('categories')
        .select('id')
        .eq('slug', article.category)
        .maybeSingle();
      categoryId = cat?.id ?? null;
    }

    // Preparar dados para inserção
    const content = isHtml((postData.content as string) || '') ? postData.content : markdownToHtml((postData.content as string) || '');
    
    postData = {
      title: postData.title,
      slug: postData.slug,
      excerpt: postData.excerpt,
      content,
      meta_description: postData.meta_description,
      category_id: categoryId,
      author_name: postData.author_name,
      status: postData.status,
      featured: postData.featured,
      read_time: postData.read_time,
      tags: postData.tags,
      published_at: postData.status === 'published' ? new Date().toISOString() : null,
      
      // Novos campos do Editorial Engine
      seo_keywords: postData.seo_keywords,
      cover_image_prompt: postData.cover_image_prompt,
      cover_image_accent: postData.cover_image_accent,
      word_count: postData.word_count,
      reading_time_minutes: postData.reading_time_minutes,
      quality_score: qualityScore,
      quality_details: postData.quality_details,
      editorial_metadata: postData.editorial_metadata,
      workflow_metadata: postData.workflow_metadata,
    };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATO 2: SIMPLES (compatibilidade)
  // ═══════════════════════════════════════════════════════════════════════════
  } else {
    // Validação de campos obrigatórios
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
    const rawContent = typeof body.content === 'string' ? body.content.trim() : '';

    if (!title) return jsonResponse({ error: 'Campo "title" é obrigatório.' }, 422);
    if (!excerpt) return jsonResponse({ error: 'Campo "excerpt" é obrigatório.' }, 422);
    if (!rawContent) return jsonResponse({ error: 'Campo "content" é obrigatório.' }, 422);
    if (title.length > 500) return jsonResponse({ error: '"title" não pode exceder 500 caracteres.' }, 422);
    if (excerpt.length > 1000) return jsonResponse({ error: '"excerpt" não pode exceder 1000 caracteres.' }, 422);

    // Campos opcionais
    const authorName = typeof body.author_name === 'string' && body.author_name.trim()
      ? body.author_name.trim().slice(0, 120)
      : 'Redação Vision7';

    const statusRaw = body.status;
    const status = statusRaw === 'draft' ? 'draft' : 'published';
    const featured = body.featured === true;

    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 20)
      : [];

    const categorySlugs = Array.isArray(body.category_slugs)
      ? body.category_slugs.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 5)
      : [];

    const editorialTemplate = typeof body.editorial_template === 'string' && 
      ['noticia-padrao', 'analise-executiva', 'guia-pratico'].includes(body.editorial_template)
      ? body.editorial_template as 'noticia-padrao' | 'analise-executiva' | 'guia-pratico'
      : null;

    // Processar conteúdo
    const content = isHtml(rawContent) ? rawContent : markdownToHtml(rawContent);
    const readTime = typeof body.read_time === 'string' && body.read_time.trim()
      ? body.read_time.trim()
      : estimateReadTime(content);

    // Validação editorial se template especificado
    if (editorialTemplate) {
      const validation = validateEditorialStructure(content, editorialTemplate);
      if (!validation.isValid) {
        return jsonResponse({ 
          error: `Conteúdo não segue estrutura editorial do template "${editorialTemplate}": ${validation.errors.join(', ')}` 
        }, 422);
      }
    }

    // Slug
    const slug = (body.slug as string) || buildSlug(title);

    // Upload de imagens base64
    let imageUrl: string | null = null;
    let bannerUrl: string | null = null;

    if (typeof body.image_base64 === 'string' && body.image_base64.startsWith('data:image/')) {
      imageUrl = await uploadBase64Image(adminClient, body.image_base64, 'image');
    } else if (isSafeUrl(body.image_url)) {
      imageUrl = body.image_url as string;
    }

    if (typeof body.banner_base64 === 'string' && body.banner_base64.startsWith('data:image/')) {
      bannerUrl = await uploadBase64Image(adminClient, body.banner_base64, 'banner');
    } else if (isSafeUrl(body.banner_url)) {
      bannerUrl = body.banner_url as string;
    }

    // Resolver categorias pelos slugs
    let categoryIds: string[] = [];
    if (categorySlugs.length > 0) {
      const { data: categories } = await adminClient
        .from('categories')
        .select('id, slug')
        .in('slug', categorySlugs);
      
      if (categories) {
        categoryIds = categories.map(cat => cat.id);
      }
    }

    const primaryCategoryId = categoryIds.length > 0 ? categoryIds[0] : null;

    // Preparar dados para inserção (formato simples)
    postData = {
      title,
      slug,
      excerpt,
      content,
      image_url: imageUrl,
      banner_url: bannerUrl,
      category_id: primaryCategoryId,
      author_name: authorName,
      status,
      featured,
      read_time: readTime,
      tags: tags.length > 0 ? tags : null,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };

    // Armazenar categoryIds para uso posterior
    (postData as any)._categoryIds = categoryIds;
  }

  // ─── Inserir post na BD ────────────────────────────────────────────────────
  const { data: post, error: insertError } = await adminClient
    .from('posts')
    .insert(postData)
    .select('id, slug, status, quality_score')
    .single();

  if (insertError) {
    console.error('[ingest-manus-post] Insert error:', insertError.message);
    return jsonResponse({ error: `Erro ao criar post: ${insertError.message}` }, 500);
  }

  // ─── Associar categorias na tabela post_categories ─────────────────────────
  if (format === 'simple' && post?.id) {
    const categoryIds = (postData as any)._categoryIds || [];
    if (categoryIds.length > 0) {
      const postCategoryInserts = categoryIds.map((categoryId: string) => ({
        post_id: post.id,
        category_id: categoryId
      }));
      
      await adminClient
        .from('post_categories')
        .insert(postCategoryInserts)
        .catch(({ error }) => {
          if (error) console.warn('[ingest-manus-post] post_categories insert warning:', error.message);
        });
    }
  } else if (format === 'editorial' && post?.id) {
    // Para formato editorial, associar com a categoria resolvida
    const categoryId = (postData.category_id as string) || null;
    if (categoryId) {
      await adminClient
        .from('post_categories')
        .insert({ post_id: post.id, category_id: categoryId })
        .catch(({ error }) => {
          if (error) console.warn('[ingest-manus-post] post_categories insert warning:', error.message);
        });
    }
  }

  return jsonResponse(
    {
      id: post.id,
      slug: post.slug,
      status: post.status,
      url: `${SITE_URL}/post/${post.slug}`,
      ...(format === 'editorial' && { quality_score: qualityScore }),
    },
    201,
  );
});

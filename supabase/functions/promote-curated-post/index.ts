// @ts-nocheck
// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
    },
  });
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]/g, '').trim();
}

function isMissingEditorialColumnsError(message: string) {
  return /(default_post_tags|theme_rules)/i.test(message)
    && /(does not exist|schema cache|Could not find)/i.test(message);
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = sanitizeHeaderValue(req.headers.get('Authorization') ?? '');
  const apiKeyHeader = sanitizeHeaderValue(req.headers.get('apikey') ?? '');
  const token = sanitizeHeaderValue(authHeader.replace(/^Bearer\s+/i, ''));
  const expected = sanitizeHeaderValue(SUPABASE_SERVICE_ROLE_KEY);

  if (token === expected || authHeader === expected || apiKeyHeader === expected) {
    return true;
  }

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
      .in('role', ['super_admin', 'admin', 'editor'])
      .eq('is_active', true);

    return (roles?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function sanitizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const item = String(value ?? '').trim();
    if (!item) continue;

    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items;
}

function normalizeToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildLegacyThemeRules(tags: unknown) {
  return sanitizeList(tags).map((tag) => ({
    slug: normalizeToken(tag),
    label: tag,
    searchTerms: [tag],
    postTags: [tag],
  }));
}

function buildSlugBase(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || `vision7-${Date.now().toString(36)}`;
}

function resolvePostTags(config: Record<string, unknown> | null, topic: string | null): string[] {
  const defaultTags = sanitizeList(config?.default_post_tags);
  const themeRules = Array.isArray(config?.theme_rules)
    ? config.theme_rules
    : buildLegacyThemeRules(config?.tags);
  const normalizedTopic = normalizeToken(topic);

  const matchedRule = themeRules.find((rule) => {
    const searchTerms = Array.isArray(rule?.searchTerms)
      ? rule.searchTerms
      : Array.isArray(rule?.search_terms)
        ? rule.search_terms
        : [];

    return normalizeToken(rule?.slug) === normalizedTopic
      || normalizeToken(rule?.label) === normalizedTopic
      || searchTerms.some((term: unknown) => normalizeToken(term) === normalizedTopic);
  });

  const themeTags = sanitizeList(matchedRule?.postTags || matchedRule?.post_tags);
  const combined = sanitizeList([...defaultTags, ...themeTags]);

  return combined.length > 0 ? combined : ['vision7', 'tecnologia'];
}

async function loadEditorialConfig(adminClient: ReturnType<typeof createClient>) {
  const extended = await adminClient
    .from('pipeline_search_config')
    .select('default_post_tags, theme_rules, tags')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!extended.error) {
    return extended.data ?? null;
  }

  if (!isMissingEditorialColumnsError(extended.error.message)) {
    throw new Error(extended.error.message);
  }

  const legacy = await adminClient
    .from('pipeline_search_config')
    .select('tags')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  return legacy.data ?? null;
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function titleWords(value: string): string[] {
  return normalizeTitle(value)
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

async function upsertQueueStatus(
  adminClient: ReturnType<typeof createClient>,
  curatedPostId: string,
  status: 'processing' | 'completed' | 'failed',
  lastError: string | null = null,
  incrementAttempt = false,
) {
  const { data: existing } = await adminClient
    .from('posting_queue')
    .select('id, attempts')
    .eq('curated_post_id', curatedPostId)
    .eq('channel', 'portal')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await adminClient
      .from('posting_queue')
      .update({
        status,
        attempts: Number(existing.attempts ?? 0) + (incrementAttempt ? 1 : 0),
        last_error: lastError,
      })
      .eq('id', existing.id);

    return existing.id;
  }

  const { data: created } = await adminClient
    .from('posting_queue')
    .insert({
      curated_post_id: curatedPostId,
      channel: 'portal',
      status,
      attempts: incrementAttempt ? 1 : 0,
      last_error: lastError,
    })
    .select('id')
    .maybeSingle();

  return created?.id ?? null;
}

async function cleanupPipelineArtifacts(
  adminClient: ReturnType<typeof createClient>,
  clusterId: string | null,
  fingerprint: string | null,
) {
  if (fingerprint) {
    const { error: stagingError } = await adminClient
      .from('news_staging')
      .delete()
      .eq('duplicate_fingerprint', fingerprint)
      .eq('processed', true);

    if (stagingError) {
      console.warn('[promote-curated-post] Failed to cleanup staging:', stagingError.message);
    }
  }

  if (clusterId) {
    const { error: clusterError } = await adminClient
      .from('news_clusters')
      .delete()
      .eq('id', clusterId);

    if (clusterError) {
      console.warn('[promote-curated-post] Failed to cleanup cluster:', clusterError.message);
    }
  }
}

async function isDuplicatePost(adminClient: ReturnType<typeof createClient>, title: string) {
  const normalized = normalizeTitle(title);

  const { data: exactMatches } = await adminClient
    .from('posts')
    .select('id, title')
    .ilike('title', normalized)
    .limit(1);

  if ((exactMatches?.length ?? 0) > 0) return true;

  const words = titleWords(title);
  if (words.length < 3) return false;

  const { data: candidates } = await adminClient
    .from('posts')
    .select('id, title')
    .eq('author_name', 'Vision7 IA')
    .limit(100);

  if (!candidates?.length) return false;

  const threshold = 0.8;
  for (const candidate of candidates) {
    const existingWords = new Set(titleWords(candidate.title));
    const matches = words.filter((word) => existingWords.has(word)).length;
    if (matches / words.length >= threshold) return true;
  }

  return false;
}

Deno.serve(async (req) => {
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

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let curatedPostId = '';

  try {
    const body = await req.json();
    curatedPostId = String(body?.curatedPostId ?? '').trim();

    if (!curatedPostId) {
      return jsonResponse({ error: 'curatedPostId is required' }, 400, cors);
    }

    const { data: curated, error: curatedError } = await adminClient
      .from('curated_posts')
      .select('id, cluster_id, title, subtitle, slug, excerpt, body_markdown, body_html, status')
      .eq('id', curatedPostId)
      .maybeSingle();

    if (curatedError) {
      throw new Error(curatedError.message);
    }

    if (!curated) {
      return jsonResponse({ error: 'Curated post not found' }, 404, cors);
    }

    if (curated.status === 'rejected') {
      return jsonResponse({ error: 'Rejected curated posts cannot be promoted' }, 409, cors);
    }

    await upsertQueueStatus(adminClient, curatedPostId, 'processing', null, true);

    const { data: cluster } = curated.cluster_id
      ? await adminClient
        .from('news_clusters')
        .select('topic, fingerprint')
        .eq('id', curated.cluster_id)
        .maybeSingle()
      : { data: null };

    const editorialConfig = await loadEditorialConfig(adminClient);

    const postTags = resolvePostTags(editorialConfig, cluster?.topic ?? null);

    if (curated.status === 'published') {
      await upsertQueueStatus(adminClient, curatedPostId, 'completed');
      return jsonResponse({ promoted: false, status: 'already_published', tags: postTags }, 200, cors);
    }

    const duplicate = await isDuplicatePost(adminClient, curated.title);
    if (duplicate) {
      await adminClient
        .from('curated_posts')
        .update({ status: 'published' })
        .eq('id', curatedPostId);

      await cleanupPipelineArtifacts(adminClient, curated.cluster_id, cluster?.fingerprint ?? null);
      await upsertQueueStatus(adminClient, curatedPostId, 'completed');

      return jsonResponse({ promoted: false, status: 'duplicate', tags: postTags }, 200, cors);
    }

    const slugBase = buildSlugBase(curated.slug || curated.title);
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const readTime = `${Math.max(1, Math.ceil((curated.body_markdown?.length ?? 0) / 1200))} min`;

    const { data: createdPost, error: createPostError } = await adminClient
      .from('posts')
      .insert({
        title: curated.title,
        slug,
        excerpt: curated.excerpt || curated.subtitle || '',
        content: curated.body_html || curated.body_markdown,
        status: 'draft',
        featured: false,
        tags: postTags,
        read_time: readTime,
        author_name: 'Vision7 IA',
      })
      .select('id, slug')
      .single();

    if (createPostError) {
      throw new Error(createPostError.message);
    }

    const { error: updateCuratedError } = await adminClient
      .from('curated_posts')
      .update({ status: 'published' })
      .eq('id', curatedPostId);

    if (updateCuratedError) {
      throw new Error(updateCuratedError.message);
    }

    await cleanupPipelineArtifacts(adminClient, curated.cluster_id, cluster?.fingerprint ?? null);
    await upsertQueueStatus(adminClient, curatedPostId, 'completed');

    return jsonResponse({
      promoted: true,
      status: 'promoted',
      postId: createdPost.id,
      slug: createdPost.slug,
      tags: postTags,
    }, 200, cors);
  } catch (error) {
    if (curatedPostId) {
      await upsertQueueStatus(
        adminClient,
        curatedPostId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
      cors,
    );
  }
});
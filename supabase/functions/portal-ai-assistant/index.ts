/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const HF_API_TOKEN = Deno.env.get('HF_API_TOKEN') ?? '';
const N8N_CREDENTIALS_ENCRYPTION_KEY = Deno.env.get('N8N_CREDENTIALS_ENCRYPTION_KEY') ?? '';
const DEFAULT_MODEL = Deno.env.get('PORTAL_ASSISTANT_MODEL') ?? 'llama-3.1-8b-instant';
const SDD_PATH = new URL('../../../sdd/modules/portal-assistant.json', import.meta.url);

const DEFAULT_ASSISTANT_SDD = {
  module: 'Portal Assistant',
  version: '0.1.0',
  allowed_scope: [
    'Noticias e posts publicados no portal',
    'Categorias, cursos, audiocasts e seções do Vision7',
    'Ajuda de navegação e descoberta interna'
  ],
  forbidden_scope: [
    'Links externos como resposta principal',
    'Promessas sem base no portal',
    'Assuntos fora do contexto Vision7'
  ],
  response_contract: {
    fields: ['summary', 'suggestions', 'links'],
    rules: [
      'Retorne apenas JSON válido.',
      'Todos os links devem ser internos e começar com /.',
      'Se faltar contexto, responda dentro do escopo e peça reformulação.'
    ]
  }
};

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

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', utf8ToBytes(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['decrypt']);
}

async function decryptValue(secret: string, payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) throw new Error('Invalid encrypted payload format');

  const key = await deriveAesKey(secret);
  const iv = base64ToBytes(ivB64);
  const encrypted = base64ToBytes(dataB64);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
  return new TextDecoder().decode(plaintext);
}

function sanitizeQuestion(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 600);
}

function sanitizeKnowledgeList(values: unknown, mapper: (value: Record<string, unknown>) => Record<string, unknown>, limit: number) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => (value && typeof value === 'object' ? mapper(value as Record<string, unknown>) : null))
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeKnowledge(knowledge: unknown) {
  const payload = knowledge && typeof knowledge === 'object' ? knowledge as Record<string, unknown> : {};
  return {
    posts: sanitizeKnowledgeList(payload.posts, (post) => ({
      title: String(post.title ?? '').trim(),
      excerpt: String(post.excerpt ?? '').trim(),
      slug: String(post.slug ?? '').trim(),
      category: String(post.category ?? '').trim(),
    }), 10),
    courses: sanitizeKnowledgeList(payload.courses, (course) => ({
      title: String(course.title ?? '').trim(),
      description: String(course.description ?? '').trim(),
      slug: String(course.slug ?? '').trim(),
    }), 6),
    categories: sanitizeKnowledgeList(payload.categories, (category) => ({
      name: String(category.name ?? '').trim(),
      slug: String(category.slug ?? '').trim(),
    }), 8),
  };
}

function sanitizeConversation(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      const item = value && typeof value === 'object' ? value as Record<string, unknown> : null;
      if (!item) return null;

      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const text = String(item.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 420);

      if (!role || !text) return null;

      return { role, text };
    })
    .filter(Boolean)
    .slice(-6);
}

function sanitizeViewerContext(value: unknown) {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hasConsent = Boolean(item.hasConsent);

  if (!hasConsent) {
    return {
      hasConsent: false,
      country: '',
      region: '',
      timezone: '',
      localTime: '',
      temperatureC: null,
    };
  }

  return {
    hasConsent: true,
    country: String(item.country ?? '').trim().slice(0, 80),
    region: String(item.region ?? '').trim().slice(0, 80),
    timezone: String(item.timezone ?? '').trim().slice(0, 80),
    localTime: String(item.localTime ?? '').trim().slice(0, 40),
    temperatureC: typeof item.temperatureC === 'number' ? Math.round(item.temperatureC) : null,
  };
}

function normalizeAssistantHref(href: string, type: string) {
  const trimmed = href.trim();
  if (!trimmed.startsWith('/')) return null;

  const match = trimmed.match(/^([^?#]*)(.*)$/);
  const rawPath = match?.[1] ?? trimmed;
  const suffix = match?.[2] ?? '';
  const path = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? '';

  if (type === 'course') {
    if (path.startsWith('/curso/')) return `${path}${suffix}`;
    return slug ? `/curso/${slug}${suffix}` : null;
  }

  if (type === 'post') {
    if (path.startsWith('/post/')) return `${path}${suffix}`;
    return slug ? `/post/${slug}${suffix}` : null;
  }

  if (type === 'category') {
    if (path.startsWith('/categoria/') || path.startsWith('/category/')) {
      return slug ? `/${slug}${suffix}` : null;
    }

    return `${path}${suffix}`;
  }

  return `${path}${suffix}`;
}

function sanitizeLinks(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
      const type = ['post', 'course', 'category', 'action'].includes(String(item.type ?? ''))
        ? String(item.type)
        : 'action';
      const href = normalizeAssistantHref(String(item.href ?? '').trim(), type);
      if (!href) return null;

      return {
        label: String(item.label ?? '').trim().slice(0, 120),
        href,
        type,
      };
    })
    .filter((value) => value && value.label && value.href)
    .slice(0, 5);
}

async function loadAssistantSdd() {
  try {
    const content = await Deno.readTextFile(SDD_PATH);
    return JSON.parse(content);
  } catch {
    return DEFAULT_ASSISTANT_SDD;
  }
}

async function loadApiKey(adminClient: ReturnType<typeof createClient>): Promise<{ key: string; provider: 'huggingface' | 'groq' }> {
  // 1. Try Groq env var first — fastest, most reliable for real-time chat
  if (GROQ_API_KEY) return { key: GROQ_API_KEY, provider: 'groq' };
  // 2. Try HF env var
  if (HF_API_TOKEN) return { key: HF_API_TOKEN, provider: 'huggingface' };

  // 3. Try HF_API_TOKEN from DB
  const { data: hfCred } = await adminClient
    .from('n8n_credentials')
    .select('encrypted_value')
    .eq('key_name', 'HF_API_TOKEN')
    .eq('status', 'active')
    .maybeSingle();

  if (hfCred?.encrypted_value && N8N_CREDENTIALS_ENCRYPTION_KEY) {
    try {
      const key = await decryptValue(N8N_CREDENTIALS_ENCRYPTION_KEY, hfCred.encrypted_value);
      if (key) return { key, provider: 'huggingface' };
    } catch { /* fall through */ }
  }

  // 4. Try GROQ_API_KEY from DB
  const { data: groqCred } = await adminClient
    .from('n8n_credentials')
    .select('encrypted_value')
    .eq('key_name', 'GROQ_API_KEY')
    .eq('status', 'active')
    .maybeSingle();

  if (groqCred?.encrypted_value && N8N_CREDENTIALS_ENCRYPTION_KEY) {
    try {
      const key = await decryptValue(N8N_CREDENTIALS_ENCRYPTION_KEY, groqCred.encrypted_value);
      if (key) return { key, provider: 'groq' };
    } catch { /* fall through */ }
  }

  return { key: '', provider: 'groq' };
}

function buildSystemPrompt(sdd: Record<string, unknown>, viewerContext: Record<string, unknown>) {
  const allowedScope = Array.isArray(sdd.allowed_scope) ? sdd.allowed_scope.join('; ') : '';
  const forbiddenScope = Array.isArray(sdd.forbidden_scope) ? sdd.forbidden_scope.join('; ') : '';
  const rules = Array.isArray(sdd.response_contract?.rules) ? sdd.response_contract.rules.join('; ') : '';

  const hasConsent = Boolean(viewerContext.hasConsent);
  const contextBlock = hasConsent
    ? [
        `CONTEXTO DO LEITOR (consentimento ATIVO): regiao=${viewerContext.region || 'desconhecida'}, pais=${viewerContext.country || 'desconhecido'}, fuso=${viewerContext.timezone || 'auto'}, hora=${viewerContext.localTime || 'n/a'}, temperatura=${viewerContext.temperatureC != null ? viewerContext.temperatureC + '°C' : 'sem dado'}.`,
        'O utilizador JA AUTORIZOU personalização — USE estes dados livremente nas respostas. Inclua clima, hora e região quando relevante, sem pedir consentimento.',
      ].join(' ')
    : 'CONTEXTO DO LEITOR (sem consentimento): o utilizador NAO autorizou personalização. Se pedir clima, hora ou localização, explique que precisa ativar nas preferências de privacidade.';

  return [
    'Você é o Vision7 AI — assistente editorial do portal Vision7, especializado em tecnologia, inovação e tendências.',
    'Personalidade: comunicativo, direto, confiante mas sem arrogância. Fale como um jornalista tech experiente que conversa com um colega curioso.',
    'Varie o vocabulário e a estrutura das frases — nunca repita a mesma abertura ou padrão em mensagens seguidas. Surpreenda.',
    'Se o utilizador faz uma pergunta simples, responda de forma curta e objetiva. Se complexa, aprofunde com contexto editorial.',
    'Adapte o tom: casual para saudações, analítico para perguntas sobre tendências, prático para navegação.',
    contextBlock,
    `Escopo: ${allowedScope || 'portal Vision7 — noticias, categorias, cursos, audiocasts e navegacao interna.'}`,
    `Fora de escopo: ${forbiddenScope || 'nada fora do universo Vision7.'}`,
    'Se a pergunta fugir do escopo, redirecione com elegância para algo relevante no portal.',
    'Use o histórico da conversa para manter contexto e lembrar preferências do utilizador dentro da sessão.',
    'Se o utilizador mostrou interesse por um tema, proponha conteúdos relacionados sem que ele peça — antecipe necessidades.',
    'Rotas internas: posts /post/{slug}; cursos /curso/{slug}; categorias /{slug}; audiocasts /audiocasts.',
    `Formato: ${rules || 'responda APENAS em JSON válido: {"summary": string, "suggestions": string[], "links": [{"label": string, "href": string, "type": "post|course|category|action"}]}.'}`,
    'IMPORTANTE: O array "links" DEVE conter 1 a 4 links internos extraidos do knowledge fornecido. Cada link deve ter label (titulo curto), href (rota interna começando com /), e type (post, course, category ou action).',
    'Se o knowledge estiver vazio (sem posts/cursos/categorias), use apenas links genéricos de navegação como {"label":"Ver notícias","href":"/#noticias","type":"action"} ou {"label":"Explorar categorias","href":"/","type":"action"} ou {"label":"Audiocasts","href":"/audiocasts","type":"action"}. NUNCA invente slugs que não existam no knowledge.',
    'Exemplo de link: {"label": "Supercomputação em Portugal", "href": "/post/supercomputacao-ia-portugal", "type": "post"}.',
    'NUNCA retorne summary vazio. Se nao tiver o que dizer, cumprimente o utilizador e sugira conteudos do portal.',
    'O summary deve ser fluido e humano. Suggestions devem ser ações concretas que o utilizador pode fazer agora no portal.',
    'Nunca invente dados, links externos ou produtos que não existam no portal.',
  ].join('\n');
}

function parseAssistantResponse(rawContent: string) {
  const cleaned = rawContent.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ── Rate Limiter (in-memory, per IP) ── */
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 10; // max 10 requests / min / IP
const rateBuckets = new Map();

/* ── User Preferences / Learning ── */

interface UserPrefs {
  preferred_topics: string[];
  preferred_categories: string[];
  interaction_count: number;
  last_questions: string[];
}

const EMPTY_PREFS: UserPrefs = {
  preferred_topics: [],
  preferred_categories: [],
  interaction_count: 0,
  last_questions: [],
};

async function loadUserPrefs(adminClient: ReturnType<typeof createClient>, fingerprint: string): Promise<UserPrefs> {
  if (!fingerprint) return EMPTY_PREFS;
  try {
    const { data } = await adminClient
      .from('ai_user_preferences')
      .select('preferred_topics, preferred_categories, interaction_count, last_questions')
      .eq('user_fingerprint', fingerprint)
      .maybeSingle();
    if (data) return data as UserPrefs;
  } catch { /* ignore */ }
  return EMPTY_PREFS;
}

function updateUserPrefsAsync(adminClient: ReturnType<typeof createClient>, fingerprint: string, question: string, knowledge: Record<string, unknown>[]) {
  if (!fingerprint) return;
  // Extract topics from the question (simple keyword extraction)
  const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const topicKeywords = normalized.split(/\s+/).filter((w) => w.length > 3);

  // Extract matched categories from knowledge
  const categories: string[] = [];
  if (Array.isArray(knowledge)) {
    for (const item of knowledge) {
      if (item && typeof item === 'object' && 'category' in item && typeof item.category === 'string') {
        categories.push(item.category);
      }
    }
  }

  // Fire-and-forget upsert
  adminClient
    .from('ai_user_preferences')
    .upsert({
      user_fingerprint: fingerprint,
      preferred_topics: topicKeywords.slice(0, 20),
      preferred_categories: [...new Set(categories)].slice(0, 10),
      interaction_count: 1,
      last_questions: [question.slice(0, 200)],
    }, { onConflict: 'user_fingerprint' })
    .then(async () => {
      // Increment count and append question
      await adminClient.rpc('increment_ai_interaction', { fp: fingerprint, q: question.slice(0, 200) }).catch(() => {});
    })
    .catch(() => {});
}

function buildUserPrefsContext(prefs: UserPrefs): string {
  if (prefs.interaction_count === 0) return '';
  const parts = [];
  if (prefs.interaction_count > 0) {
    parts.push(`Este utilizador ja interagiu ${prefs.interaction_count} vez${prefs.interaction_count > 1 ? 'es' : ''} com o assistente.`);
  }
  if (prefs.preferred_categories.length > 0) {
    parts.push(`Categorias de interesse: ${prefs.preferred_categories.slice(0, 5).join(', ')}.`);
  }
  if (prefs.last_questions.length > 0) {
    parts.push(`Perguntas anteriores (para contexto): ${prefs.last_questions.slice(0, 3).map((q) => `"${q}"`).join(', ')}.`);
  }
  parts.push('Use estas preferencias para personalizar a resposta — sugira conteudos que se alinhem aos interesses demonstrados.');
  return parts.join(' ');
}

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

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  }

  // Rate limit by IP
  const clientIp = getClientIp(req);
  if (isRateLimited(`ai-assistant:${clientIp}`)) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, {
      ...cors,
      'Retry-After': '60',
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Supabase environment is not configured' }, 500, cors);
  }

  try {
    const body = await req.json();
    const question = sanitizeQuestion(body?.question);
    if (!question) {
      return jsonResponse({ error: 'question is required' }, 400, cors);
    }

    const knowledge = sanitizeKnowledge(body?.knowledge);
    const conversation = sanitizeConversation(body?.conversation);
    const viewerContext = sanitizeViewerContext(body?.viewerContext);
    const userFingerprint = String(body?.fingerprint || clientIp || '').slice(0, 128);
    const sdd = await loadAssistantSdd();
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const [{ key: apiKey, provider: llmProvider }, userPrefs] = await Promise.all([
      loadApiKey(adminClient),
      loadUserPrefs(adminClient, userFingerprint),
    ]);

    if (!apiKey) {
      return jsonResponse({ error: 'Nenhuma chave de IA configurada (HF_API_TOKEN ou GROQ_API_KEY). Configure via dashboard em Automação > Configurações.' }, 503, cors);
    }

    // Build system prompt with viewer context and user learning
    const prefsContext = buildUserPrefsContext(userPrefs);
    const systemPrompt = buildSystemPrompt(sdd, viewerContext) + (prefsContext ? '\n\nPERFIL DO UTILIZADOR:\n' + prefsContext : '');
    const userPayload = JSON.stringify({
      question,
      knowledge,
      assistant_id: String(body?.assistantId || 'vision7-assistant-core'),
    });

    // Resolve the model name: ensure it matches the resolved provider
    const GROQ_DEFAULT_MODEL = 'llama-3.1-8b-instant';
    const requestedModel = String(body?.model || DEFAULT_MODEL || '');
    // If using Groq but the model looks like an HF model/token, force the Groq default
    const resolvedModel = llmProvider === 'groq' && (requestedModel.includes('/') || requestedModel.startsWith('hf_') || !requestedModel)
      ? GROQ_DEFAULT_MODEL
      : (requestedModel || GROQ_DEFAULT_MODEL);

    let content = '';
    let usedProvider = llmProvider;

    if (llmProvider === 'huggingface') {
      const hfPrompt = systemPrompt + '\n\n' +
        conversation.map((turn) => (turn.role === 'user' ? '[INST] ' + turn.text + ' [/INST]' : turn.text)).join('\n') +
        '\n[INST] ' + userPayload + ' [/INST]';

      const hfResponse = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          inputs: '<s>' + hfPrompt,
          parameters: {
            max_new_tokens: 900,
            temperature: 0.45,
            return_full_text: false,
          },
        }),
      });

      const hfData = await hfResponse.json();
      if (!hfResponse.ok) {
        const errMsg = hfData?.error || hfData?.message || 'HuggingFace request failed';
        return jsonResponse({ error: errMsg }, hfResponse.status, cors);
      }

      content = Array.isArray(hfData) ? (hfData[0]?.generated_text ?? '') : (hfData?.generated_text ?? '');
      usedProvider = 'huggingface';
    } else {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.5,
          top_p: 0.92,
          max_tokens: 900,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversation.map((turn) => ({
              role: turn.role,
              content: turn.text,
            })),
            { role: 'user', content: userPayload },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return jsonResponse({ error: data?.error?.message || data?.message || 'Groq request failed' }, response.status, cors);
      }

      content = data?.choices?.[0]?.message?.content ?? '';
      usedProvider = 'groq';
    }

    const parsed = parseAssistantResponse(String(content));
    if (!parsed) {
      return jsonResponse({ error: `Resposta invalida do modelo (${usedProvider})`, raw_preview: String(content).slice(0, 200) }, 502, cors);
    }

    // Fallback: if LLM returned empty summary, generate a helpful default
    const summary = String(parsed.summary ?? '').trim().slice(0, 1200);
    if (!summary) {
      const greetings = [
        'Olá! Estou aqui para ajudar. Pergunte-me sobre notícias, cursos ou navegue pelas categorias do portal.',
        'Oi! Sou o assistente do Vision7. Diga-me o que procura — posso sugerir conteúdos, cursos e muito mais.',
        'Bem-vindo! Explore o portal Vision7 comigo — pergunte sobre tecnologia, categorias ou audiocasts.',
      ];
      const fallbackSummary = greetings[Math.floor(Math.random() * greetings.length)];
      return jsonResponse({
        summary: fallbackSummary,
        suggestions: ['Quais são as últimas notícias?', 'Que cursos estão disponíveis?', 'Explorar categorias'],
        links: [{ label: 'Ver notícias', href: '/#noticias', type: 'action' }, { label: 'Explorar categorias', href: '/', type: 'action' }],
        provider: usedProvider === 'huggingface' ? 'hf-edge' : 'groq-edge',
        assistantId: String(body?.assistantId || 'vision7-assistant-core'),
        sddVersion: String(sdd.version ?? '0.1.0'),
        sddModule: String(sdd.module ?? 'Portal Assistant'),
      }, 200, cors);
    }

    // Fire-and-forget: learn from this interaction
    updateUserPrefsAsync(adminClient, userFingerprint, question, knowledge as unknown as Record<string, unknown>[]);

    return jsonResponse({
      summary,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((value: unknown) => String(value ?? '').trim()).filter(Boolean).slice(0, 4)
        : [],
      links: sanitizeLinks(parsed.links),
      provider: usedProvider === 'huggingface' ? 'hf-edge' : 'groq-edge',
      assistantId: String(body?.assistantId || 'vision7-assistant-core'),
      sddVersion: String(sdd.version ?? '0.1.0'),
      sddModule: String(sdd.module ?? 'Portal Assistant'),
    }, 200, cors);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500, cors);
  }
});
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
  // 1. Try HF env var first
  if (HF_API_TOKEN) return { key: HF_API_TOKEN, provider: 'huggingface' };
  // 2. Try Groq env var
  if (GROQ_API_KEY) return { key: GROQ_API_KEY, provider: 'groq' };

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

function buildSystemPrompt(sdd: Record<string, unknown>) {
  const allowedScope = Array.isArray(sdd.allowed_scope) ? sdd.allowed_scope.join('; ') : '';
  const forbiddenScope = Array.isArray(sdd.forbidden_scope) ? sdd.forbidden_scope.join('; ') : '';
  const rules = Array.isArray(sdd.response_contract?.rules) ? sdd.response_contract.rules.join('; ') : '';

  return [
    'Você é o Vision7 AI, o assistente editorial e de navegação do portal, e deve seguir estritamente o SDD do assistente.',
    'Fale com naturalidade, segurança e clareza, sem soar robótico. Adapte o tom ao nível da pergunta, mas mantenha credibilidade e foco prático.',
    'Quando houver base suficiente, ofereça uma recomendação principal, um insight curto e próximos passos acionáveis dentro do portal.',
    `Escopo permitido: ${allowedScope || 'apenas portal Vision7, noticias, categorias, cursos e navegacao interna.'}`,
    `Escopo proibido: ${forbiddenScope || 'nada fora do portal Vision7.'}`,
    `Regras de resposta: ${rules || 'responda apenas em JSON valido com summary, suggestions e links internos.'}`,
    'Nunca invente dados, nunca crie links externos e nunca responda fora do contexto do portal.',
    'Se a pergunta fugir do escopo, responda educadamente que so pode ajudar com o Vision7 e sugira uma reformulacao dentro do portal.',
    'Use o historico recente da conversa apenas para manter continuidade, nunca para extrapolar alem do que foi fornecido.',
    'Clima, regiao, hora local e qualquer contexto pessoal so podem ser usados quando viewer_context.hasConsent for true.',
    'Se viewer_context.hasConsent for false e o utilizador pedir clima ou localizacao, explique que essa ferramenta depende de consentimento e oriente a ativar as preferencias de privacidade.',
    'Padroes de rota internos: posts usam /post/{slug}; cursos usam /curso/{slug}; categorias usam /{slug}; audiocasts usam /audiocasts.',
    'A resposta deve ser JSON valido com a forma: {"summary": string, "suggestions": string[], "links": [{"label": string, "href": string, "type": "post|course|category|action"}]}.',
    'O campo summary deve soar humano e confiavel; suggestions devem ser concretas e orientar o proximo passo no Vision7.',
  ].join(' ');
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

  try {
    const body = await req.json();
    const question = sanitizeQuestion(body?.question);
    if (!question) {
      return jsonResponse({ error: 'question is required' }, 400, cors);
    }

    const knowledge = sanitizeKnowledge(body?.knowledge);
    const conversation = sanitizeConversation(body?.conversation);
    const viewerContext = sanitizeViewerContext(body?.viewerContext);
    const sdd = await loadAssistantSdd();
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { key: apiKey, provider: llmProvider } = await loadApiKey(adminClient);

    if (!apiKey) {
      return jsonResponse({ error: 'Nenhuma chave de IA configurada (HF_API_TOKEN ou GROQ_API_KEY). Configure via dashboard em Automação > Configurações.' }, 503, cors);
    }

    const systemPrompt = buildSystemPrompt(sdd);
    const userPayload = JSON.stringify({
      question,
      knowledge,
      viewer_context: viewerContext,
      assistant_id: String(body?.assistantId || 'vision7-assistant-core'),
      note: 'Use apenas estes dados do portal, respeite os padroes de rota internos, utilize clima/localizacao apenas com consentimento e devolva apenas JSON valido.',
    });

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
            temperature: 0.28,
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
          model: String(body?.model || DEFAULT_MODEL),
          temperature: 0.28,
          top_p: 0.9,
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

    return jsonResponse({
      summary: String(parsed.summary ?? '').trim().slice(0, 1200),
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
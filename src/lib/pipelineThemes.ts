export interface PipelineThemeRule {
  id: string;
  slug: string;
  label: string;
  searchTerms: string[];
  postTags: string[];
}

export const DEFAULT_PIPELINE_POST_TAGS = ['vision7', 'tecnologia'];

export const DEFAULT_PIPELINE_THEME_RULES: PipelineThemeRule[] = [
  {
    id: 'ia',
    slug: 'ia',
    label: 'Inteligencia Artificial',
    searchTerms: ['inteligencia artificial'],
    postTags: ['ia', 'inteligencia artificial'],
  },
  {
    id: 'ciberseguranca',
    slug: 'ciberseguranca',
    label: 'Ciberseguranca',
    searchTerms: ['ciberseguranca'],
    postTags: ['ciberseguranca', 'seguranca digital'],
  },
  {
    id: 'automacao',
    slug: 'automacao',
    label: 'Automacao',
    searchTerms: ['automacao empresarial'],
    postTags: ['automacao', 'automacao empresarial'],
  },
];

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toLabel(value: string): string {
  return value
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function sanitizeStringList(values: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(values)) return [...fallback];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const item = value.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  return items.length > 0 ? items : [...fallback];
}

function buildThemeRuleFromTag(tag: string): PipelineThemeRule {
  const normalized = normalizeText(tag) || `tema_${Date.now().toString(36)}`;
  return {
    id: normalized,
    slug: normalized,
    label: toLabel(tag),
    searchTerms: [tag.trim()],
    postTags: [tag.trim()],
  };
}

export function normalizeThemeRules(rawRules: unknown, fallbackTags: unknown = []): PipelineThemeRule[] {
  const baseRules = Array.isArray(rawRules) ? rawRules : [];
  const normalizedRules = baseRules
    .map((rule, index) => normalizeThemeRule(rule, index))
    .filter((rule): rule is PipelineThemeRule => rule !== null);

  if (normalizedRules.length > 0) return normalizedRules;

  const fallbackList = sanitizeStringList(fallbackTags);
  if (fallbackList.length > 0) {
    return fallbackList.map((tag) => buildThemeRuleFromTag(tag));
  }

  return DEFAULT_PIPELINE_THEME_RULES.map((rule) => ({ ...rule }));
}

function normalizeThemeRule(rawRule: unknown, index: number): PipelineThemeRule | null {
  if (!rawRule || typeof rawRule !== 'object') return null;

  const rule = rawRule as Record<string, unknown>;
  const searchTerms = sanitizeStringList(rule.searchTerms, sanitizeStringList(rule.search_terms));
  const postTags = sanitizeStringList(rule.postTags, sanitizeStringList(rule.post_tags));
  const rawLabel = typeof rule.label === 'string' ? rule.label.trim() : '';
  const rawSlug = typeof rule.slug === 'string' ? rule.slug.trim() : '';
  const rawId = typeof rule.id === 'string' ? rule.id.trim() : '';
  const fallbackSource = rawLabel || rawSlug || searchTerms[0] || `tema_${index + 1}`;
  const slug = normalizeText(rawSlug || rawLabel || searchTerms[0] || rawId);
  const label = rawLabel || toLabel(fallbackSource);

  if (!slug || searchTerms.length === 0) return null;

  return {
    id: rawId || slug,
    slug,
    label,
    searchTerms,
    postTags: postTags.length > 0 ? postTags : [label.toLowerCase()],
  };
}

export function flattenThemeSearchTerms(themeRules: PipelineThemeRule[]): string[] {
  return sanitizeStringList(themeRules.flatMap((rule) => rule.searchTerms));
}

export function resolveThemeRule(
  topic: string | null | undefined,
  themeRules: PipelineThemeRule[],
): PipelineThemeRule | null {
  if (!topic) return null;
  const normalizedTopic = normalizeText(topic);
  if (!normalizedTopic) return null;

  return themeRules.find((rule) => {
    if (normalizeText(rule.slug) === normalizedTopic) return true;
    if (normalizeText(rule.label) === normalizedTopic) return true;
    return rule.searchTerms.some((term) => normalizeText(term) === normalizedTopic);
  }) ?? null;
}

export function buildPipelinePostTags(options: {
  topic?: string | null;
  themeRules?: PipelineThemeRule[];
  defaultPostTags?: string[];
}): string[] {
  const themeRules = options.themeRules ?? [];
  const defaultPostTags = sanitizeStringList(options.defaultPostTags, DEFAULT_PIPELINE_POST_TAGS);
  const matchedTheme = resolveThemeRule(options.topic, themeRules);
  const combined = sanitizeStringList([
    ...defaultPostTags,
    ...(matchedTheme?.postTags ?? []),
  ]);

  return combined.length > 0 ? combined : [...DEFAULT_PIPELINE_POST_TAGS];
}

export function buildThemeRulesFromTags(tags: string[]): PipelineThemeRule[] {
  const sanitizedTags = sanitizeStringList(tags);
  return sanitizedTags.length > 0
    ? sanitizedTags.map((tag) => buildThemeRuleFromTag(tag))
    : DEFAULT_PIPELINE_THEME_RULES.map((rule) => ({ ...rule }));
}
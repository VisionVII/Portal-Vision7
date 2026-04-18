export type EditorialPostTemplateId = 'noticia-padrao' | 'analise-executiva' | 'guia-pratico';

interface EditorialTemplateContext {
  title?: string;
  authorName?: string;
  featuredImageUrl?: string | null;
}

interface EditorialTemplateBlueprint {
  introLabel: string;
  introFallback: string;
  sectionHeadings: string[];
  sectionFallbacks: string[];
  sourcesHeading: string;
  sourcesFallback: string;
}

interface EditorialContentBlock {
  html: string;
  tag: string;
  text: string;
  hasImage: boolean;
}

export interface EditorialPostTemplate {
  id: EditorialPostTemplateId;
  label: string;
  description: string;
  suggestedExcerpt: string;
  suggestedTags: string[];
  buildContent: (options: EditorialTemplateContext) => string;
}

const TEMPLATE_BLUEPRINTS: Record<EditorialPostTemplateId, EditorialTemplateBlueprint> = {
  'noticia-padrao': {
    introLabel: 'Lide',
    introFallback: 'abra com 2 a 3 linhas respondendo o que aconteceu, quem esta envolvido e qual o impacto imediato.',
    sectionHeadings: ['O que aconteceu', 'Por que isso importa', 'O que observar agora'],
    sectionFallbacks: [
      '<p>Explique o fato principal com dados confirmados, datas e atores envolvidos.</p>',
      '<p>Mostre o efeito para o mercado, para o leitor Vision7 ou para o ecossistema digital.</p>',
      '<ul><li>Proximo desdobramento esperado</li><li>Risco ou oportunidade principal</li><li>Impacto para empresas, tecnologia ou audiencia</li></ul>',
    ],
    sourcesHeading: 'Fontes consultadas',
    sourcesFallback: '<ul><li>Fonte 1 - link oficial</li><li>Fonte 2 - cobertura de apoio</li></ul>',
  },
  'analise-executiva': {
    introLabel: 'Resumo executivo',
    introFallback: 'entregue em 3 linhas o quadro atual, o gatilho principal e a leitura editorial.',
    sectionHeadings: ['Cenario atual', 'Leitura do mercado', 'O que isso significa para o leitor Vision7'],
    sectionFallbacks: [
      '<p>Descreva o contexto e o momento do mercado com objetividade.</p>',
      '<p>Mostre o que muda para empresas, audiencias, plataformas ou profissionais.</p><blockquote>Insira aqui a frase, o dado ou o insight central que o leitor deve reter.</blockquote>',
      '<p>Feche com interpretacao, oportunidade e proximo passo.</p>',
    ],
    sourcesHeading: 'Fontes consultadas',
    sourcesFallback: '<ul><li>Relatorio, anuncio ou documento principal</li><li>Fonte complementar</li></ul>',
  },
  'guia-pratico': {
    introLabel: 'Objetivo',
    introFallback: 'explique em 2 linhas o resultado que a equipa editorial quer entregar ao leitor com este guia.',
    sectionHeadings: ['Visao geral', 'Passo a passo', 'Checklist rapido'],
    sectionFallbacks: [
      '<p>Apresente o contexto e quando este guia deve ser usado.</p>',
      '<ol><li>Passo 1 com acao concreta</li><li>Passo 2 com detalhe operacional</li><li>Passo 3 com validacao final</li></ol>',
      '<ul><li>Item essencial 1</li><li>Item essencial 2</li><li>Item essencial 3</li></ul>',
    ],
    sourcesHeading: 'Links e fontes',
    sourcesFallback: '<ul><li>Documentacao oficial</li><li>Leitura complementar</li></ul>',
  },
};

const INTRO_LABELS = ['Lide', 'Resumo executivo', 'Objetivo'];
const STRUCTURAL_HEADINGS = new Set(
  Object.values(TEMPLATE_BLUEPRINTS).flatMap((blueprint) => [
    ...blueprint.sectionHeadings,
    blueprint.sourcesHeading,
  ]).map((value) => normalizeText(value)),
);

const PLACEHOLDER_PATTERNS = [
  /abra com 2 a 3 linhas respondendo/i,
  /entregue em 3 linhas o quadro atual/i,
  /explique em 2 linhas o resultado que/i,
  /explique o fato principal com dados confirmados/i,
  /mostre o efeito para o mercado/i,
  /proximo desdobramento esperado/i,
  /descreva o contexto e o momento do mercado/i,
  /mostre o que muda para empresas/i,
  /insira aqui a frase, o dado ou o insight central/i,
  /feche com interpretacao, oportunidade e proximo passo/i,
  /apresente o contexto e quando este guia deve ser usado/i,
  /passo 1 com acao concreta/i,
  /item essencial 1/i,
  /fonte 1 - link oficial/i,
  /relatorio, anuncio ou documento principal/i,
  /documentacao oficial/i,
];

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildImageBlock(imageUrl?: string | null): string {
  if (!imageUrl) return '';

  return [
    `<p><img src="${escapeHtml(imageUrl)}" alt="Imagem de apoio do artigo" /></p>`,
    '<p><em>Legenda: descreva em uma linha o contexto visual desta imagem.</em></p>',
  ].join('');
}

function getWorkingTitle(title?: string): string {
  const trimmed = String(title || '').trim();
  return trimmed || 'Titulo principal do artigo';
}

function getBrowserDocument(content: string) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return null;
  }

  return new DOMParser().parseFromString(`<div>${content}</div>`, 'text/html');
}

function toBlock(element: Element): EditorialContentBlock {
  return {
    html: element.outerHTML,
    tag: element.tagName.toLowerCase(),
    text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    hasImage: Boolean(element.querySelector('img')),
  };
}

function isStructuralHeading(text: string) {
  return STRUCTURAL_HEADINGS.has(normalizeText(text));
}

function isLikelyPlaceholder(text: string) {
  const normalized = normalizeText(text);
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function stripIntroLabel(innerHtml: string) {
  return innerHtml
    .replace(/^\s*<strong[^>]*>[^<:]+:?<\/strong>\s*/i, '')
    .replace(/^[:\s-]+/, '')
    .trim();
}

function buildFallbackTemplate(templateId: EditorialPostTemplateId, options: EditorialTemplateContext) {
  const blueprint = TEMPLATE_BLUEPRINTS[templateId];
  const introPrefix = `<p><strong>${escapeHtml(blueprint.introLabel)}:</strong> ${escapeHtml(blueprint.introFallback)}</p>`;

  return [
    `<h1>${escapeHtml(getWorkingTitle(options.title))}</h1>`,
    introPrefix,
    buildImageBlock(options.featuredImageUrl),
    ...blueprint.sectionHeadings.map((heading, index) => `<h2>${heading}</h2>${blueprint.sectionFallbacks[index]}`),
    `<h3>${blueprint.sourcesHeading}</h3>${blueprint.sourcesFallback}`,
  ].join('');
}

function extractEditorialBlocks(content: string) {
  const documentNode = getBrowserDocument(content);
  const root = documentNode?.body.firstElementChild;

  if (!root) {
    return {
      introBlocks: [] as EditorialContentBlock[],
      mediaBlocks: [] as EditorialContentBlock[],
      bodyBlocks: content.trim() ? [{ html: content, tag: 'div', text: content.replace(/<[^>]+>/g, ' ').trim(), hasImage: /<img/i.test(content) }] : [],
      sourcesBlocks: [] as EditorialContentBlock[],
    };
  }

  const mediaBlocks: EditorialContentBlock[] = [];
  const bodyBlocks: EditorialContentBlock[] = [];
  const sourcesBlocks: EditorialContentBlock[] = [];
  let sourcesMode = false;

  Array.from(root.children).forEach((element) => {
    const block = toBlock(element);

    if (!block.text && !block.hasImage) return;
    if (block.tag === 'h1') return;

    if (/^h[2-4]$/.test(block.tag) && isStructuralHeading(block.text)) {
      sourcesMode = normalizeText(block.text) === normalizeText(TEMPLATE_BLUEPRINTS['noticia-padrao'].sourcesHeading)
        || normalizeText(block.text) === normalizeText(TEMPLATE_BLUEPRINTS['analise-executiva'].sourcesHeading)
        || normalizeText(block.text) === normalizeText(TEMPLATE_BLUEPRINTS['guia-pratico'].sourcesHeading);
      return;
    }

    if (isLikelyPlaceholder(block.text)) return;

    if (block.hasImage && mediaBlocks.length === 0) {
      mediaBlocks.push(block);
      return;
    }

    if (sourcesMode) {
      sourcesBlocks.push(block);
      return;
    }

    bodyBlocks.push(block);
  });

  if (!sourcesBlocks.length && bodyBlocks.length > 1) {
    const lastBlock = bodyBlocks[bodyBlocks.length - 1];
    if (/https?:\/\/|fonte|documentacao|relatorio|leitura complementar|link/i.test(lastBlock.text)) {
      sourcesBlocks.push(bodyBlocks.pop() as EditorialContentBlock);
    }
  }

  const introBlocks: EditorialContentBlock[] = [];
  while (bodyBlocks.length > 0 && introBlocks.length < 2) {
    const candidate = bodyBlocks[0];
    if (candidate.hasImage || /^h[1-6]$/.test(candidate.tag)) break;
    if (!['p', 'blockquote', 'div'].includes(candidate.tag) && introBlocks.length > 0) break;
    introBlocks.push(bodyBlocks.shift() as EditorialContentBlock);
    if (candidate.tag !== 'p') break;
    if (candidate.text.length > 320) break;
  }

  return { introBlocks, mediaBlocks, bodyBlocks, sourcesBlocks };
}

function chunkBlocks(blocks: EditorialContentBlock[], groupsCount: number) {
  const groups = Array.from({ length: groupsCount }, () => [] as EditorialContentBlock[]);
  if (!blocks.length) return groups;

  const baseSize = Math.floor(blocks.length / groupsCount);
  const remainder = blocks.length % groupsCount;
  let cursor = 0;

  for (let index = 0; index < groupsCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    groups[index] = blocks.slice(cursor, cursor + Math.max(size, 0));
    cursor += size;
  }

  if (cursor < blocks.length) {
    groups[groupsCount - 1].push(...blocks.slice(cursor));
  }

  return groups;
}

function buildIntroHtml(templateId: EditorialPostTemplateId, introBlocks: EditorialContentBlock[]) {
  const blueprint = TEMPLATE_BLUEPRINTS[templateId];
  if (introBlocks.length === 0) {
    return `<p><strong>${escapeHtml(blueprint.introLabel)}:</strong> ${escapeHtml(blueprint.introFallback)}</p>`;
  }

  const documentNode = getBrowserDocument(introBlocks.map((block) => block.html).join(''));
  const root = documentNode?.body.firstElementChild;
  const first = root?.firstElementChild;

  if (root && first?.tagName.toLowerCase() === 'p') {
    const innerHtml = stripIntroLabel(first.innerHTML);
    first.innerHTML = `<strong>${escapeHtml(blueprint.introLabel)}:</strong> ${innerHtml || escapeHtml(blueprint.introFallback)}`;
    return root.innerHTML;
  }

  const introText = introBlocks.map((block) => block.text).join(' ').trim();
  return `<p><strong>${blueprint.introLabel}:</strong> ${escapeHtml(introText || blueprint.introFallback)}</p>`;
}

function buildSectionHtml(heading: string, blocks: EditorialContentBlock[], fallbackHtml: string) {
  return `<h2>${escapeHtml(heading)}</h2>${blocks.length > 0 ? blocks.map((block) => block.html).join('') : fallbackHtml}`;
}

function buildSourcesHtml(templateId: EditorialPostTemplateId, sourceBlocks: EditorialContentBlock[]) {
  const blueprint = TEMPLATE_BLUEPRINTS[templateId];
  return `<h3>${escapeHtml(blueprint.sourcesHeading)}</h3>${sourceBlocks.length > 0 ? sourceBlocks.map((block) => block.html).join('') : escapeHtml(blueprint.sourcesFallback)}`;
}

function buildStructuredContent(templateId: EditorialPostTemplateId, content: string, options: EditorialTemplateContext) {
  if (!content.trim()) {
    return buildFallbackTemplate(templateId, options);
  }

  const { introBlocks, mediaBlocks, bodyBlocks, sourcesBlocks } = extractEditorialBlocks(content);
  const blueprint = TEMPLATE_BLUEPRINTS[templateId];
  const chunks = chunkBlocks(bodyBlocks, blueprint.sectionHeadings.length);
  const mediaHtml = mediaBlocks.length > 0
    ? mediaBlocks.map((block) => block.html).join('')
    : buildImageBlock(options.featuredImageUrl);

  return [
    `<h1>${escapeHtml(getWorkingTitle(options.title))}</h1>`,
    buildIntroHtml(templateId, introBlocks),
    mediaHtml,
    ...blueprint.sectionHeadings.map((heading, index) => buildSectionHtml(heading, chunks[index], blueprint.sectionFallbacks[index])),
    buildSourcesHtml(templateId, sourcesBlocks),
  ].join('');
}

export const EDITORIAL_POST_TEMPLATES: EditorialPostTemplate[] = [
  {
    id: 'noticia-padrao',
    label: 'Noticia padrao',
    description: 'Estrutura curta para noticia diaria com lide, contexto, impacto e fontes.',
    suggestedExcerpt: 'Resumo em 2 frases com o fato principal, impacto imediato e contexto para o leitor.',
    suggestedTags: ['noticia', 'editorial'],
    buildContent: (options) => buildFallbackTemplate('noticia-padrao', options),
  },
  {
    id: 'analise-executiva',
    label: 'Analise executiva',
    description: 'Formato para contexto, leitura de mercado, insight e fechamento editorial.',
    suggestedExcerpt: 'Sintese executiva com o cenario, a leitura do mercado e o principal insight editorial.',
    suggestedTags: ['analise', 'insight'],
    buildContent: (options) => buildFallbackTemplate('analise-executiva', options),
  },
  {
    id: 'guia-pratico',
    label: 'Guia pratico',
    description: 'Formato para tutorial, checklist, passos operacionais e links de apoio.',
    suggestedExcerpt: 'Resumo util com o objetivo do guia, o que o leitor vai aprender e o ganho pratico.',
    suggestedTags: ['guia', 'tutorial'],
    buildContent: (options) => buildFallbackTemplate('guia-pratico', options),
  },
];

export function buildEditorialTemplate(
  templateId: EditorialPostTemplateId,
  options: EditorialTemplateContext,
): EditorialPostTemplate {
  void options;
  return EDITORIAL_POST_TEMPLATES.find((template) => template.id === templateId) ?? EDITORIAL_POST_TEMPLATES[0];
}

export function detectEditorialTemplate(content: string): EditorialPostTemplateId | null {
  const documentNode = getBrowserDocument(content);
  const headings = Array.from(documentNode?.querySelectorAll('h2, h3') ?? []).map((node) => normalizeText(node.textContent ?? ''));
  const bodyText = normalizeText((documentNode?.body.textContent ?? content).slice(0, 1200));

  const scores = (Object.entries(TEMPLATE_BLUEPRINTS) as Array<[EditorialPostTemplateId, EditorialTemplateBlueprint]>)
    .map(([templateId, blueprint]) => {
      const headingMatches = blueprint.sectionHeadings.filter((heading) => headings.includes(normalizeText(heading))).length;
      const sourcesMatch = headings.includes(normalizeText(blueprint.sourcesHeading)) ? 1 : 0;
      const introMatch = bodyText.includes(normalizeText(`${blueprint.introLabel}:`)) ? 1 : 0;
      return { templateId, score: headingMatches + sourcesMatch + introMatch };
    })
    .sort((left, right) => right.score - left.score);

  return scores[0]?.score ? scores[0].templateId : null;
}

export function hasEditorialStructure(content: string): boolean {
  const documentNode = getBrowserDocument(content);
  if (!documentNode) {
    return /<h1/i.test(content) && /<h[23]/i.test(content);
  }

  const headings = documentNode.querySelectorAll('h1, h2, h3, h4');
  if (headings.length < 3) return false;

  const hasIntroLabel = INTRO_LABELS.some((label) => normalizeText(documentNode.body.textContent ?? '').includes(normalizeText(`${label}:`)));
  return hasIntroLabel || headings.length >= 4;
}

export function applyEditorialTemplateToContent(
  templateId: EditorialPostTemplateId,
  currentContent: string,
  options: EditorialTemplateContext,
) {
  return buildStructuredContent(templateId, currentContent, options);
}

export function syncEditorialContentMetadata(content: string, options: EditorialTemplateContext) {
  const documentNode = getBrowserDocument(content);
  const root = documentNode?.body.firstElementChild;
  if (!root) return content;

  const firstHeading = root.querySelector('h1');
  if (firstHeading) {
    firstHeading.textContent = getWorkingTitle(options.title);
  }

  const featuredImageUrl = options.featuredImageUrl?.trim();
  const firstImage = root.querySelector('img');
  if (featuredImageUrl && firstImage) {
    const alt = normalizeText(firstImage.getAttribute('alt') ?? '');
    if (!firstImage.getAttribute('src') || alt.includes('imagem destacada') || alt.includes('imagem de apoio do artigo')) {
      firstImage.setAttribute('src', featuredImageUrl);
    }
  }

  return root.innerHTML;
}

export function estimateReadTimeFromHtml(content: string): string {
  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = plainText ? plainText.split(' ').filter(Boolean).length : 0;
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

export function mergeSuggestedTags(currentTags: string, nextTags: string[]): string {
  const items = [...currentTags.split(','), ...nextTags]
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Map(items.map((item) => [item.toLowerCase(), item])).values()].join(', ');
}
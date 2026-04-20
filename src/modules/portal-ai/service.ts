import type {
  PortalAssistantConversationTurn,
  PortalAssistantKnowledge,
  PortalAssistantReply,
  PortalAssistantReplyLink,
} from './types';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const extractTerms = (question: string) =>
  normalizeText(question)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

const matchesQuestion = (value: string, terms: string[]) => {
  const normalizedValue = normalizeText(value);
  return terms.some((term) => normalizedValue.includes(term));
};

const hasIntent = (normalizedQuestion: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(normalizedQuestion));

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const GREETING_SUMMARIES = [
  'Olá! Sou o assistente do Vision7. Diga-me o que procura — posso sugerir notícias, cursos, audiocasts ou ajudar a navegar pelo portal.',
  'Bem-vindo ao Vision7! Estou aqui para o ajudar a encontrar o que precisa — desde as últimas notícias até cursos e ferramentas do portal.',
  'Oi! Pronto para explorar o Vision7? Pergunte-me qualquer coisa sobre os nossos conteúdos, categorias ou cursos.',
];

const GREETING_SUGGESTIONS = [
  ['Que notícias há de novo?', 'Quais cursos recomendam?', 'Que categorias existem?', 'Fale-me dos audiocasts'],
  ['Mostre as novidades do portal', 'Quero explorar as categorias', 'Há cursos sobre IA?', 'O que são audiocasts?'],
  ['O que está em destaque hoje?', 'Recomende-me algo para ler', 'Quais os temas mais populares?', 'Como funciona o portal?'],
];

const NO_MATCH_SUMMARIES = [
  'Não encontrei resultados diretos para essa busca, mas posso ajudar de outra forma — tente reformular ou explore uma categoria.',
  'Essa pergunta não teve correspondência nos nossos conteúdos atuais. Quer tentar com outras palavras ou explorar os destaques?',
  'Não localizei nada específico, mas o portal tem muito para descobrir. Diga-me mais sobre o que procura.',
];

const NO_MATCH_SUGGESTIONS = [
  ['Reformule a pergunta com outro ângulo', 'Explore as categorias do portal', 'Veja os conteúdos mais recentes'],
  ['Tente usar palavras-chave diferentes', 'Navegue pelas categorias', 'Descubra os cursos disponíveis'],
  ['Seja mais específico no tema', 'Veja o que há de novo', 'Pergunte sobre uma categoria'],
];

const addUniqueLinks = (bucket: PortalAssistantReplyLink[], nextLinks: PortalAssistantReplyLink[]) => {
  const seen = new Set(bucket.map((link) => `${link.type}:${link.href}`));

  nextLinks.forEach((link) => {
    const signature = `${link.type}:${link.href}`;
    if (!seen.has(signature)) {
      bucket.push(link);
      seen.add(signature);
    }
  });
};

const normalizeAssistantHref = (href: string, type: PortalAssistantReplyLink['type']) => {
  const trimmed = href.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const [, rawPath = trimmed, suffix = ''] = trimmed.match(/^([^?#]*)(.*)$/) ?? [];
  const path = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? '';

  if (type === 'course') {
    if (path.startsWith('/curso/')) {
      return `${path}${suffix}`;
    }

    return slug ? `/curso/${slug}${suffix}` : null;
  }

  if (type === 'post') {
    if (path.startsWith('/post/')) {
      return `${path}${suffix}`;
    }

    return slug ? `/post/${slug}${suffix}` : null;
  }

  if (type === 'category') {
    if (path.startsWith('/categoria/') || path.startsWith('/category/')) {
      return slug ? `/${slug}${suffix}` : null;
    }

    return `${path}${suffix}`;
  }

  return `${path}${suffix}`;
};

const getContextualQuestion = (question: string, conversation: PortalAssistantConversationTurn[]) => {
  const cleanQuestion = question.trim();
  if (cleanQuestion.length >= 28 || !conversation.length) {
    return cleanQuestion;
  }

  const recentUserTurns = conversation
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.text.trim())
    .filter(Boolean)
    .filter((turn) => normalizeText(turn) !== normalizeText(cleanQuestion))
    .slice(-2);

  return recentUserTurns.length ? `${recentUserTurns.join(' ')} ${cleanQuestion}` : cleanQuestion;
};

export const buildPortalAssistantReply = (
  question: string,
  knowledge: PortalAssistantKnowledge,
  conversation: PortalAssistantConversationTurn[] = [],
): PortalAssistantReply => {
  const cleanQuestion = question.trim();
  const contextualQuestion = getContextualQuestion(cleanQuestion, conversation);
  const normalizedQuestion = normalizeText(contextualQuestion);

  if (!cleanQuestion) {
    const suggestionSet = pickRandom(GREETING_SUGGESTIONS);
    return {
      summary: pickRandom(GREETING_SUMMARIES),
      suggestions: suggestionSet,
      links: [
        { label: 'Ver página inicial', href: '/', type: 'action' },
        { label: 'Explorar audiocasts', href: '/audiocasts', type: 'action' },
      ],
      provider: 'local-preview',
    };
  }

  const terms = extractTerms(contextualQuestion);
  const wantsRecent = hasIntent(normalizedQuestion, [/recen/, /ultim/, /hoje/, /agora/, /tendenc/, /destaq/]);
  const wantsCourses = hasIntent(normalizedQuestion, [/curso/, /aprend/, /formac/, /certific/, /parcer/]);
  const wantsCategories = hasIntent(normalizedQuestion, [/categoria/, /secao/, /seccao/, /tema/, /area/]);
  const wantsAudiocasts = hasIntent(normalizedQuestion, [/audiocast/, /podcast/, /episod/, /audio/]);

  const matchedPosts = knowledge.posts
    .filter((post) => matchesQuestion(`${post.title} ${post.excerpt} ${post.category ?? ''}`, terms))
    .slice(0, 3);

  const matchedCourses = knowledge.courses
    .filter((course) => matchesQuestion(`${course.title} ${course.description}`, terms))
    .slice(0, 2);

  const matchedCategories = knowledge.categories
    .filter((category) => matchesQuestion(category.name, terms))
    .slice(0, 4);

  const links: PortalAssistantReplyLink[] = [];

  addUniqueLinks(
    links,
    matchedPosts.map((post) => ({
      label: post.title,
      href: `/post/${post.slug}`,
      type: 'post' as const,
    })),
  );

  addUniqueLinks(
    links,
    matchedCourses.map((course) => ({
      label: course.title,
      href: `/curso/${course.slug}`,
      type: 'course' as const,
    })),
  );

  addUniqueLinks(
    links,
    matchedCategories.map((category) => ({
      label: category.name,
      href: `/${category.slug}`,
      type: 'category' as const,
    })),
  );

  if (wantsRecent && !matchedPosts.length) {
    addUniqueLinks(
      links,
      knowledge.posts.slice(0, 3).map((post) => ({
        label: post.title,
        href: `/post/${post.slug}`,
        type: 'post' as const,
      })),
    );
  }

  if (wantsCourses && !matchedCourses.length) {
    addUniqueLinks(
      links,
      knowledge.courses.slice(0, 2).map((course) => ({
        label: course.title,
        href: `/curso/${course.slug}`,
        type: 'course' as const,
      })),
    );
  }

  if (wantsCategories && !matchedCategories.length) {
    addUniqueLinks(
      links,
      knowledge.categories.slice(0, 4).map((category) => ({
        label: category.name,
        href: `/${category.slug}`,
        type: 'category' as const,
      })),
    );
  }

  if (wantsAudiocasts) {
    addUniqueLinks(links, [{ label: 'Abrir audiocasts', href: '/audiocasts', type: 'action' }]);
  }

  if (!links.length) {
    const suggestionSet = pickRandom(NO_MATCH_SUGGESTIONS);
    return {
      summary: pickRandom(NO_MATCH_SUMMARIES),
      suggestions: suggestionSet,
      links: [
        { label: 'Ver todas as notícias', href: '/#noticias', type: 'action' },
        { label: 'Explorar categorias', href: '/', type: 'action' },
      ],
      provider: 'local-preview',
    };
  }

  const primaryLink = links[0];
  const summaryParts = [
    matchedPosts.length
      ? `Encontrei ${matchedPosts.length} ${matchedPosts.length === 1 ? 'artigo' : 'artigos'} relacionado${matchedPosts.length === 1 ? '' : 's'} ao que você perguntou.`
      : wantsRecent
        ? 'Aqui estão alguns dos conteúdos mais recentes do portal.'
        : null,
    matchedCourses.length
      ? `Também temos ${matchedCourses.length} curso${matchedCourses.length === 1 ? '' : 's'} que pode${matchedCourses.length === 1 ? '' : 'm'} interessar.`
      : wantsCourses && knowledge.courses.length
        ? 'Temos alguns cursos que podem ser úteis nesta área.'
        : null,
    matchedCategories.length || wantsCategories
      ? 'Você pode explorar mais conteúdo semelhante nas categorias relacionadas.'
      : null,
  ].filter(Boolean);

  const suggestions = Array.from(
    new Set(
      [
        links.length > 1 ? 'Veja todos os links sugeridos abaixo' : '',
        matchedCourses.length || wantsCourses
          ? pickRandom(['Posso detalhar mais sobre os cursos', 'Quer saber mais sobre algum curso?', 'Explore os cursos sugeridos'])
          : pickRandom(['Quer saber sobre outros formatos de conteúdo?', 'Posso buscar em outras categorias', 'Quer explorar audiocasts ou cursos?']),
        pickRandom([
          'Quer que eu refine a busca por categoria?',
          'Precisa de mais informações sobre algum destes?',
          'Posso aprofundar algum tema específico?',
          'Quer que eu busque algo mais específico?',
        ]),
      ].filter(Boolean),
    ),
  ).slice(0, 3);

  const summary = summaryParts.length > 0
    ? summaryParts.join(' ')
    : `Encontrei ${links.length} ${links.length === 1 ? 'resultado' : 'resultados'} que podem ajudar.`;

  return {
    summary: summary.trim(),
    suggestions,
    links: links.slice(0, 6),
    provider: 'local-preview',
  };
};

export const selectPortalAssistantContext = (
  knowledge: PortalAssistantKnowledge
): PortalAssistantKnowledge => ({
  posts: knowledge.posts.slice(0, 12).map((post) => ({
    title: post.title,
    excerpt: post.excerpt,
    slug: post.slug,
    category: post.category,
  })),
  courses: knowledge.courses.slice(0, 6).map((course) => ({
    title: course.title,
    description: course.description,
    slug: course.slug,
  })),
  categories: knowledge.categories.slice(0, 8).map((category) => ({
    name: category.name,
    slug: category.slug,
  })),
});

export const normalizePortalAssistantReply = (payload: unknown): PortalAssistantReply | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const summary = String(value.summary ?? '').trim();

  if (!summary) {
    return null;
  }

  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 4)
    : [];

  const links = Array.isArray(value.links)
    ? value.links
        .map((item) => {
          const link = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
          if (!link) {
            return null;
          }

          const type = String(link.type ?? 'action');
          const normalizedType: PortalAssistantReplyLink['type'] =
            type === 'post' || type === 'course' || type === 'category' ? type : 'action';

          const href = normalizeAssistantHref(String(link.href ?? '').trim(), normalizedType);
          if (!href) {
            return null;
          }

          return {
            label: String(link.label ?? '').trim(),
            href,
            type: normalizedType,
          };
        })
        .filter((item): item is PortalAssistantReplyLink => Boolean(item?.label && item?.href))
        .slice(0, 5)
    : [];

  return {
    summary,
    suggestions,
    links,
    provider: value.provider === 'groq-edge' || value.provider === 'hf-edge' || value.provider === 'local-preview'
      ? value.provider
      : value.provider === 'groq'
        ? 'groq-edge'
        : value.provider === 'huggingface'
          ? 'hf-edge'
          : undefined,
    assistantId: typeof value.assistantId === 'string' ? value.assistantId : undefined,
    sddVersion: typeof value.sddVersion === 'string' ? value.sddVersion : undefined,
  };
};

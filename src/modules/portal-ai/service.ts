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
  const slug = segments.at(-1) ?? '';

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
    return {
      summary:
        'Sou o Vision7 AI. Posso orientar leituras, categorias, cursos e audiocasts do portal, sempre com foco prático e sem sair do ecossistema Vision7.',
      suggestions: [
        'Peça uma rota de leitura por tema ou categoria',
        'Pergunte o que há de mais recente no portal',
        'Procure cursos, audiocasts ou conteúdos publicados',
      ],
      links: [
        { label: 'Ir para a homepage', href: '/', type: 'action' },
        { label: 'Abrir audiocasts', href: '/audiocasts', type: 'action' },
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
    return {
      summary:
        'Ainda não encontrei uma correspondência forte dentro do Vision7 para esse pedido, mas posso afinar a busca por categoria, formato de conteúdo ou objetivo de leitura.',
      suggestions: [
        'Experimente citar o tema principal ou a categoria desejada',
        'Peça leituras recentes, cursos ou audiocasts sobre um assunto',
        'Se quiser, eu também posso sugerir por objetivo: aprender, atualizar-se ou explorar',
      ],
      links: [
        { label: 'Ver notícias recentes', href: '/#noticias', type: 'action' },
        { label: 'Abrir audiocasts', href: '/audiocasts', type: 'action' },
      ],
      provider: 'local-preview',
    };
  }

  const primaryLink = links[0];
  const summaryParts = [
    matchedPosts.length
      ? `Encontrei ${matchedPosts.length} leitura(s) com boa aderência ao que pediu.`
      : wantsRecent
        ? 'Separei um ponto de partida com o que está mais recente no portal.'
        : null,
    matchedCourses.length
      ? `${matchedCourses.length} curso(s) ou parceria(s) também encaixam bem neste contexto.`
      : wantsCourses && knowledge.courses.length
        ? 'Também identifiquei um caminho de aprendizagem relevante dentro da área de cursos.'
        : null,
    matchedCategories.length || wantsCategories
      ? 'Há secções do Vision7 que ajudam a aprofundar este tema sem dispersar a navegação.'
      : null,
    primaryLink
      ? `Se quiser um próximo passo objetivo, eu começaria por "${primaryLink.label}".`
      : null,
  ].filter(Boolean);

  const suggestions = Array.from(
    new Set(
      [
        primaryLink?.type === 'post' ? 'Abra a leitura sugerida e depois eu posso indicar um segundo conteúdo complementar.' : '',
        wantsRecent ? 'Se quiser, eu filtro agora por uma categoria específica do portal.' : 'Posso afinar isto por categoria, nível ou formato de conteúdo.',
        matchedCourses.length || wantsCourses ? 'Também posso cruzar este tema com cursos ou trilhas já disponíveis no portal.' : 'Se fizer sentido, eu também posso procurar cursos ou audiocasts relacionados.',
        wantsAudiocasts ? 'Se preferir, levo-o diretamente para episódios com esse foco.' : 'Se preferir áudio, também posso redirecionar para os audiocasts relevantes.',
      ].filter(Boolean),
    ),
  ).slice(0, 4);

  return {
    summary: summaryParts.join(' ').trim(),
    suggestions,
    links: links.slice(0, 5),
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
    provider: value.provider === 'groq-edge' || value.provider === 'local-preview'
      ? value.provider
      : value.provider === 'groq'
        ? 'groq-edge'
        : undefined,
    assistantId: typeof value.assistantId === 'string' ? value.assistantId : undefined,
    sddVersion: typeof value.sddVersion === 'string' ? value.sddVersion : undefined,
  };
};

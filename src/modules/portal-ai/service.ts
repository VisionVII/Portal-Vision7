import { portalAssistantConfig } from './config';
import type {
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

export const buildPortalAssistantReply = (
  question: string,
  knowledge: PortalAssistantKnowledge
): PortalAssistantReply => {
  const cleanQuestion = question.trim();

  if (!cleanQuestion) {
    return {
      summary:
        'Posso ajudar a encontrar notícias, categorias, cursos e pontos importantes do Vision7 sem sair do contexto do portal.',
      suggestions: [
        'Pergunte por notícias sobre tecnologia ou negócios',
        'Peça um resumo das áreas do portal',
        'Procure cursos e parcerias disponíveis',
      ],
      links: [
        { label: 'Ir para a homepage', href: '/', type: 'action' },
        { label: 'Abrir audiocasts', href: '/audiocasts', type: 'action' },
      ],
    };
  }

  const terms = extractTerms(cleanQuestion);

  const matchedPosts = knowledge.posts
    .filter((post) => matchesQuestion(`${post.title} ${post.excerpt} ${post.category ?? ''}`, terms))
    .slice(0, 3);

  const matchedCourses = knowledge.courses
    .filter((course) => matchesQuestion(`${course.title} ${course.description}`, terms))
    .slice(0, 2);

  const matchedCategories = knowledge.categories
    .filter((category) => matchesQuestion(category.name, terms))
    .slice(0, 4);

  const links: PortalAssistantReplyLink[] = [
    ...matchedPosts.map((post) => ({
      label: post.title,
      href: `/post/${post.slug}`,
      type: 'post' as const,
    })),
    ...matchedCourses.map((course) => ({
      label: course.title,
      href: `/curso/${course.slug}`,
      type: 'course' as const,
    })),
    ...matchedCategories.map((category) => ({
      label: category.name,
      href: `/${category.slug}`,
      type: 'category' as const,
    })),
  ];

  if (!links.length) {
    return {
      summary:
        'Ainda não encontrei uma correspondência exata dentro do Vision7, mas posso continuar a guiar a navegação por notícias, categorias e cursos do portal.',
      suggestions: [
        'Tente termos como tecnologia, cultura, negócios ou saúde',
        'Peça por notícias recentes ou conteúdos populares',
        'Pergunte por cursos ou parcerias do portal',
      ],
      links: [
        { label: 'Ver notícias recentes', href: '/#noticias', type: 'action' },
        { label: 'Abrir audiocasts', href: '/audiocasts', type: 'action' },
      ],
    };
  }

  const summaryParts = [
    matchedPosts.length
      ? `Encontrei ${matchedPosts.length} notícia(s) relevante(s) dentro do portal.`
      : null,
    matchedCourses.length
      ? `${matchedCourses.length} curso(s) ou parceria(s) combinam com o seu interesse.`
      : null,
    matchedCategories.length
      ? `Também há categorias que ajudam a aprofundar esse tema.`
      : null,
  ].filter(Boolean);

  return {
    summary: `${summaryParts.join(' ')} ${
      portalAssistantConfig.requiresApiKey
        ? 'O módulo já está preparado para uma API externa, mas neste momento responde em modo local com base no conteúdo do Vision7.'
        : 'A assistente já está conectada ao provedor configurado.'
    }`.trim(),
    suggestions: [
      'Abra um dos links sugeridos para continuar a leitura',
      'Peça notícias mais recentes ou conteúdos populares',
      'Pergunte por uma categoria específica do Vision7',
    ],
    links,
  };
};

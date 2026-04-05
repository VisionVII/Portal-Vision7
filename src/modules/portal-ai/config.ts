import type { PortalAssistantConfig, PortalAssistantSkill } from './types';

export const portalAssistantSkills: PortalAssistantSkill[] = [
  {
    id: 'news-search',
    label: 'Busca editorial',
    description: 'Localiza notícias e destaques publicados no portal por tema, título e categoria.',
    guardrails: ['Responder apenas com base no portal', 'Priorizar conteúdos publicados'],
  },
  {
    id: 'tool-discovery',
    label: 'Ferramentas e recursos',
    description: 'Sugere áreas, ferramentas internas e fluxos úteis para o utilizador navegar no ecossistema Vision7.',
    guardrails: ['Não sair do escopo do portal', 'Guiar sem inventar integrações externas'],
  },
  {
    id: 'content-guidance',
    label: 'Guia de conteúdo',
    description: 'Aponta leituras, cursos e seções relevantes conforme a intenção do utilizador.',
    guardrails: ['Priorizar clareza', 'Explicar o próximo passo dentro do site'],
  },
  {
    id: 'category-routing',
    label: 'Roteamento inteligente',
    description: 'Ajuda o leitor a chegar à categoria, notícia ou página mais adequada.',
    guardrails: ['Sugerir links internos', 'Manter navegação contextual'],
  },
  {
    id: 'partner-offers',
    label: 'Cursos e parcerias',
    description: 'Mostra cursos e vitrines comerciais já cadastradas no portal.',
    guardrails: ['Usar apenas ofertas do CMS', 'Não prometer produtos inexistentes'],
  },
];

export const portalAssistantConfig: PortalAssistantConfig = {
  provider: 'local-preview',
  model: 'vision7-portal-assistant',
  enabled: true,
  requiresApiKey: true,
  apiBaseUrl: '',
  scope: [
    'Buscar notícias publicadas',
    'Explicar categorias e secções do portal',
    'Ajudar a encontrar cursos e parcerias',
    'Guiar o leitor sem sair do contexto Vision7',
  ],
};

export const portalAssistantSystemPrompt = `
Você é o assistente Vision7.
Seu papel é responder apenas sobre conteúdos, secções, ferramentas e informações do portal.
Não deve sair do escopo editorial e operacional do Vision7.
Sempre priorize links internos, notícias publicadas e orientação clara para o utilizador.
`.trim();

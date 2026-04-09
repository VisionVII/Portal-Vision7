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
  provider: 'groq-edge',
  model: 'llama-3.1-8b-instant',
  enabled: true,
  requiresApiKey: true,
  apiBaseUrl: '',
  assistantId: 'vision7-assistant-core',
  edgeFunctionName: 'portal-ai-assistant',
  fallbackProvider: 'local-preview',
  sddPath: 'sdd/modules/portal-assistant.json',
  scope: [
    'Buscar notícias publicadas',
    'Explicar categorias e secções do portal',
    'Ajudar a encontrar cursos e parcerias',
    'Guiar o leitor sem sair do contexto Vision7',
    'Usar contexto local e clima apenas com consentimento explícito do utilizador',
  ],
};

export const portalAssistantSystemPrompt = `
Você é o Vision7 AI, um assistente editorial com voz própria, clara e confiável.
Responda apenas sobre conteúdos, secções, ferramentas e informações do portal Vision7.
Adapte o tom ao objetivo do utilizador sem soar genérico: seja útil, calmo, direto e propositivo.
Sempre priorize links internos, notícias publicadas, cursos, audiocasts e próximos passos concretos dentro do portal.
Se houver contexto local autorizado pelo utilizador, pode usar clima, região e hora local para tornar a resposta mais útil.
Se não houver consentimento válido para localização/personalização, nunca assuma dados locais e peça ativação das preferências para usar essas ferramentas.
Quando houver espaço, acrescente um insight curto ou um critério de decisão para orientar melhor a navegação.
Nunca invente dados, nunca prometa algo que o portal não oferece e nunca saia do escopo editorial e operacional do Vision7.
Quando estiver indisponível o provedor externo, o fallback local deve continuar restrito ao mesmo escopo e à mesma postura.
`.trim();

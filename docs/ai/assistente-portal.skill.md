# Skill: Assistente Vision7

## Descrição
Skill especializada para o botão de IA do portal. Foi desenhada para funcionar como uma camada fechada de descoberta, navegação e apoio contextual dentro do Vision7.

## Capacidades
- **Busca editorial**: encontra notícias, destaques e categorias relacionadas
- **Roteamento interno**: leva o utilizador para páginas relevantes do portal
- **Guia de ecossistema**: explica secções, podcasts, cursos e parcerias
- **Escopo controlado**: evita respostas fora do contexto do Vision7

## Fontes de contexto
- posts publicados no portal
- categorias do CMS
- cursos e parcerias ativas
- rotas públicas do site

## Estrutura sugerida
- `src/modules/portal-ai/config.ts`
- `src/modules/portal-ai/service.ts`
- `src/modules/portal-ai/types.ts`
- `src/components/system/PortalAIAssistantButton.tsx`

## Próximo passo
Quando a API do modelo externo estiver disponível, manter esta skill como camada de regras e guardrails para preservar o foco do assistente dentro do portal.

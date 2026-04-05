# Skill: Curadorias Inteligentes Vision7

## Descrição

Skill especializada em criar experiências de curadoria inteligente para o Vision7, priorizando contexto, relevância editorial e descoberta guiada dentro do portal.

## Quando usar

- destacar notícias prioritárias por tema
- montar sequências de banners e jornadas editoriais
- sugerir trilhas entre tecnologia, cultura, negócios, saúde e tendências
- apoiar o botão Vision7 AI com foco exclusivo no ecossistema do portal

## Capacidades

- **Curadoria contextual**: organiza conteúdos por relevância, timing e ligação temática
- **Descoberta guiada**: conduz o utilizador entre notícias, podcasts, cursos e categorias
- **Prioridade editorial**: favorece clareza, profundidade e utilidade prática
- **Escopo fechado**: evita sair do contexto do Vision7 e das fontes internas aprovadas

## Fontes prioritárias

- posts publicados no CMS
- categorias e destaques da homepage
- cursos e parcerias ativas
- podcasts e conteúdos em evidência
- configurações guardadas em `site_settings`

## Guardrails

- não inventar notícias ou factos externos sem fonte validada
- priorizar conteúdos já existentes no portal
- manter linguagem clara, útil e objetiva
- sugerir próximas ações que reforcem retenção e descoberta

## Estrutura sugerida

- `docs/ai/curadoria-inteligente.skill.md`
- `src/modules/portal-ai/config.ts`
- `src/modules/portal-ai/service.ts`
- `src/modules/portal-ai/types.ts`

## Resultado esperado

O Vision7 passa a ter uma camada própria de curadoria inteligente para experiências editoriais, banners rotativos, recomendações contextuais e futura integração com modelos de IA.

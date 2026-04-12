# Skill: Curadorias Inteligentes Vision7

## Descrição

Skill especializada em criar experiências de curadoria inteligente para o Vision7, priorizando contexto, relevância editorial e descoberta guiada dentro do portal.

## Quando usar

- destacar notícias prioritárias por tema
- montar sequências de banners e jornadas editoriais
- sugerir trilhas entre tecnologia, cultura, negócios, saúde e tendências
- apoiar o botão Vision7 AI com foco exclusivo no ecossistema do portal
- avaliar qualidade de posts curados pela pipeline AI

## Estado Atual da Curadoria (Abril 2026)

### Pipeline Automática Ativa ✅
- **WF-01**: Coleta RSS a cada 30min → `news_staging` (300+ artigos)
- **WF-02**: Dedup/clustering a cada 20min → `news_clusters` (199 clusters)
- **WF-03**: Curadoria AI via Groq llama-3.1-8b-instant a cada 60min → `curated_posts`
- Posts curados recebem `editorial_score` (0-100), `editorial_tone`, `key_topics`
- Pipeline produzindo posts automaticamente com scores 86-100

### Métricas de Pipeline
- Fontes: feeds RSS internacionais (configuráveis no WF-01)
- Artigos coletados: 300+ por ciclo
- Clusters gerados: ~200 por ciclo
- Posts curados: com score editorial automático
- Modelo AI: Groq llama-3.1-8b-instant (baixa latência, gratuito)

## Capacidades

- **Curadoria contextual**: organiza conteúdos por relevância, timing e ligação temática
- **Descoberta guiada**: conduz o utilizador entre notícias, podcasts, cursos e categorias
- **Prioridade editorial**: favorece clareza, profundidade e utilidade prática
- **Escopo fechado**: evita sair do contexto do Vision7 e das fontes internas aprovadas
- **Avaliação de qualidade**: analisa editorial_score e sugere melhorias no prompt AI

## Fontes prioritárias

- posts publicados no CMS (tabela `posts`)
- posts curados pela pipeline (tabela `curated_posts`)
- categorias e destaques da homepage
- cursos e parcerias ativas
- podcasts e conteúdos em evidência
- configurações em `site_settings`

## Guardrails

- não inventar notícias ou factos externos sem fonte validada
- priorizar conteúdos já existentes no portal
- manter linguagem clara, útil e objetiva
- sugerir próximas ações que reforcem retenção e descoberta

## Estrutura

- `docs/ai/curadoria-inteligente.skill.md`
- `src/modules/portal-ai/config.ts`
- `src/modules/portal-ai/service.ts`
- `src/modules/portal-ai/types.ts`
- n8n WF-03: curadoria AI (Groq)
- SDD: `sdd/modules/automation-engine.json` (category: content_pipeline)

## Resultado esperado

O Vision7 passa a ter uma camada própria de curadoria inteligente para experiências editoriais, banners rotativos, recomendações contextuais e futura integração com modelos de IA.

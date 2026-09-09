# Vision7 — Production Checklist

**Status:** Fonte oficial de priorização de produção  
**Versão:** 1.0  
**Última atualização:** 2026-09-09  
**Master Prompt:** [CLAUDE.md](../../CLAUDE.md)

> Documento de organização. Esta checklist não autoriza implementação automática. Cada fase deve ser analisada e validada antes de avançar.

## Regras de execução

Ordem obrigatória:

1. Manualmente funcional
2. Editorialmente consistente
3. Content rendering estável
4. Página pública estável
5. SEO / AEO / indexação
6. Segurança / secrets
7. Dashboard operacional
8. Automação
9. Chat / inteligência
10. Observabilidade / custos
11. Performance / CRO
12. ContentOS / escala

**Regra fundamental:** não automatizar o que ainda não funciona corretamente manualmente. O Vision7 deve conseguir operar como publicação real com produção de artigos 100% manual.

### Prioridades

- **P0** — Bloqueador absoluto de produção
- **P1** — Problema crítico
- **P2** — Melhoria importante
- **P3** — Optimização
- **P4** — Futuro / escala

Não iniciar tarefas P3/P4 enquanto existir P0/P1 relevante.

### Convenção de estado

- `[x]` Implementado e confirmado na documentação existente
- `[ ]` Pendente, por validar ou por implementar
- `AUDITAR` indica que a existência não foi confirmada nesta atualização

---

## P0 — Fase 0: Bloqueadores de produção

### Infraestrutura

- [ ] `P0` Build de produção — AUDITAR
- [ ] `P0` Deploy Vercel — AUDITAR
- [ ] `P0` Supabase — AUDITAR
- [ ] `P0` Render — AUDITAR
- [ ] `P0` n8n — AUDITAR
- [ ] `P0` Environment variables — AUDITAR
- [ ] `P0` Domínio — AUDITAR
- [ ] `P0` SSL — AUDITAR
- [ ] `P0` Backups — AUDITAR

### Segurança base

- [ ] `P0` RLS — AUDITAR
- [ ] `P0` Roles — AUDITAR
- [ ] `P0` Permissions — AUDITAR
- [ ] `P0` MFA — AUDITAR
- [ ] `P0` Edge Functions — AUDITAR
- [ ] `P0` JWT — AUDITAR
- [ ] `P0` Secrets — AUDITAR
- [ ] `P0` Uploads — AUDITAR
- [ ] `P0` Sanitização — AUDITAR
- [ ] `P0` Rate limiting — AUDITAR
- [ ] `P0` Protecção de custos AI — AUDITAR

## P0 — Fase 1: Produção manual

### Artigos

- [ ] Criar artigo
- [ ] Editar artigo
- [ ] Guardar rascunho
- [ ] Autosave
- [ ] Publicar
- [ ] Despublicar
- [ ] Eliminar
- [ ] Duplicar

### Metadata

- [ ] Categoria
- [ ] Tags
- [ ] Autor
- [ ] Data
- [ ] SEO title
- [ ] Meta description
- [ ] SEO keywords
- [ ] Editorial template

### Media

- [ ] Upload
- [ ] Imagem de capa
- [ ] Imagem no conteúdo
- [ ] Alt text
- [ ] Caption
- [ ] Preview
- [ ] Optimização

### UX editorial

- [ ] Loading
- [ ] Empty states
- [ ] Error states
- [ ] Success states
- [ ] Confirmações
- [ ] Toasts

**Meta:** criar e publicar um artigo completo manualmente, sem depender do n8n.

## P0 — Fase 2: Vision7 Content System 2.0

### Content Model

- [ ] Normalizer
- [ ] Paragraph
- [ ] Heading
- [ ] Lists
- [ ] Image
- [ ] Table
- [ ] Quote
- [ ] Callout
- [ ] Diagram
- [ ] Code
- [ ] CTA
- [ ] Related Articles

### Renderer

- [ ] Renderer único
- [ ] Sanitização
- [ ] Markdown
- [ ] HTML
- [ ] Preview
- [ ] Frontend
- [ ] Dashboard e frontend partilham o mesmo modelo/renderização quando tecnicamente possível

### Tabelas, diagramas e imagens

- [ ] Tabela simples
- [ ] Tabela responsiva
- [ ] Scroll controlado
- [ ] Tabela complexa
- [ ] Adaptação para mobile
- [ ] Eliminar overflow horizontal da página
- [ ] Identificar formato actual de diagramas
- [ ] Criar `ArticleDiagram`
- [ ] Responsividade e escala de diagramas
- [ ] Zoom e fullscreen
- [ ] Preparar suporte futuro para SVG/HTML
- [ ] Imagens responsive
- [ ] Lazy loading
- [ ] Alt
- [ ] Caption
- [ ] Aspect ratio
- [ ] Optimização
- [ ] Sem overflow

**Meta:** artigos complexos renderizados correctamente em desktop, tablet e mobile.

## P0 — Fase 3: Página pública

### Article UX

- [ ] Header
- [ ] Breadcrumb
- [ ] Categoria
- [ ] Título
- [ ] Autor
- [ ] Data
- [ ] Tempo de leitura
- [ ] Hero image
- [ ] Conteúdo
- [ ] Related articles

### Navegação e responsive

- [ ] Neste Artigo
- [ ] Âncoras
- [ ] Navegação interna
- [ ] Related content
- [ ] 375px
- [ ] 390px
- [ ] 768px
- [ ] Desktop
- [ ] Títulos longos
- [ ] Tabelas
- [ ] Diagramas
- [ ] Imagens
- [ ] Listas
- [ ] Código
- [ ] Botões
- [ ] Sem overflow horizontal involuntário

## P0 — Fase 4: SEO / AEO / indexação

### SEO e structured data

- [ ] Title
- [ ] Meta description
- [ ] Canonical
- [ ] Open Graph
- [ ] Social metadata
- [ ] Keywords
- [ ] Article
- [ ] NewsArticle quando aplicável
- [ ] BreadcrumbList
- [ ] Organization
- [ ] Author
- [ ] Publisher
- [ ] Image

### Indexação e crawlers

- [ ] Sitemap
- [ ] `robots.txt`
- [ ] Canonical
- [ ] Redirects
- [ ] Categorias
- [ ] Artigos
- [ ] Páginas antigas
- [ ] Conteúdo duplicado
- [x] Entrega de artigos completos
- [ ] Googlebot
- [ ] Crawlers adicionais
- [ ] HTML final
- [ ] Structured data

### AEO

- [ ] Estrutura semântica
- [ ] Respostas directas
- [ ] FAQs quando apropriado
- [ ] Entidades
- [ ] Contexto
- [ ] Fontes

## P0 — Fase 4.5: Secret & credential security

Esta fase é obrigatória antes da abertura da automação em produção.

### Inventário e classificação

- [ ] Listar todas as environment variables
- [ ] Identificar onde são utilizadas
- [ ] Classificar cada variável como `PUBLIC`, `INTERNAL` ou `PRIVATE`
- [ ] Identificar credenciais duplicadas
- [ ] Identificar credenciais antigas
- [ ] Identificar credenciais sem utilização

`PUBLIC` pode aparecer no frontend quando desenhada para isso. `INTERNAL` não deve ser publicada desnecessariamente. `PRIVATE` nunca pode aparecer no frontend, bundle, GitHub, documentação pública, screenshots, mensagens públicas ou logs.

### Frontend e backend

- [ ] Auditar `VITE_*`
- [ ] Detectar API keys hardcoded
- [ ] Detectar tokens hardcoded
- [ ] Detectar secrets hardcoded
- [ ] Verificar bundle
- [ ] Confirmar que secrets não chegam ao browser
- [ ] Auditar Supabase `service_role`
- [ ] Auditar Anthropic
- [ ] Auditar Groq legado
- [ ] Auditar Hugging Face legado
- [ ] Auditar n8n
- [ ] Auditar SMTP
- [ ] Auditar OAuth
- [ ] Auditar outros providers

### Git, Supabase, n8n, Vercel e Render

- [ ] Auditar `.env`, `.env.local`, `.env.production`
- [ ] Auditar `credentials.json`, `secrets.json`, tokens, certificados e chaves privadas
- [ ] Auditar Git history
- [ ] Confirmar GitHub Secret Scanning
- [ ] Auditar anon/publishable key, `service_role`, RLS, Storage policies, RPC permissions e `SECURITY DEFINER`
- [ ] Auditar Edge Functions
- [ ] Auditar credenciais, API keys, webhook secrets, URLs internas e autenticação do n8n
- [ ] Auditar variáveis Production, Preview e Development da Vercel
- [ ] Auditar variáveis, API credentials, URLs internas e logs do Render

### Rotação

- [ ] Identificar credenciais antigas
- [ ] Identificar credenciais comprometidas
- [ ] Revogar quando necessário
- [ ] Gerar novas
- [ ] Actualizar serviços
- [ ] Testar
- [ ] Eliminar antigas

**Regras:** uma chave pública não é um segredo; uma chave privada nunca deve ser exposta; uma UUID não é uma autorização; segurança também depende de RLS, permissions, authentication e authorization.

## P1 — Fase 5: Dashboard UX 2.0

- [ ] Navigation: Sidebar, Conteúdo, Automação, Audiência, Sistema, mobile drawer
- [ ] Header: pesquisa contextual, novo artigo, notificações, perfil
- [ ] Content: pesquisa, filtros, ordenação, paginação, empty, loading, error
- [ ] Editor editorial Vision7: toolbar, blocos, imagens, tabelas, quotes, callouts, diagramas, CTA
- [ ] Preview desktop, tablet e mobile com o mesmo renderer do frontend
- [ ] Módulos: Media, Analytics, CRM, Courses, Automations, Access, Developer, Settings

A arquitectura actual já foi refactorizada. Não reconstruir estruturalmente o Dashboard sem necessidade; esta fase é principalmente UX, consistência, estados e qualidade operacional.

## P1 — Fase 6: Configuração editorial

- [ ] Categorias: Tecnologia, Mundo, Saúde, Música, Desporto
- [ ] Templates: notícia padrão, análise executiva, guia prático e outros necessários
- [ ] Separar `searchTerms` de tags
- [ ] Tags finais
- [ ] Keywords
- [ ] Entidades
- [ ] Evitar tags genéricas incorrectas

`searchTerms` são consultas de pesquisa/colecção. Tags são metadados editoriais finais. Nunca tratar ambos como a mesma coisa.

## P1 — Fase 7: WF-01 Collection

- [ ] `pipeline_search_config`
- [ ] Queries dinâmicas
- [ ] Feeds
- [ ] Idioma
- [ ] Região
- [ ] Categoria
- [ ] Deduplicação
- [ ] `news_staging`
- [ ] Logs
- [ ] Retries
- [ ] Error handling
- [ ] Auditar hardcodes de categorias, regiões e termos

## P1 — Fase 8: Clustering

- [ ] Agrupamento
- [ ] Deduplicação
- [ ] Relevância
- [ ] Priorização
- [ ] Contexto
- [ ] Identificação de assunto

## P1 — Fase 9: WF-03 Generation

- [ ] Confirmar WF-03 como geração real
- [x] Claude Sonnet 4.6
- [ ] Prompt editorial
- [ ] Contexto
- [ ] Categoria
- [ ] Tags
- [ ] Template
- [ ] SEO
- [ ] AEO
- [ ] Metadata
- [ ] Quality score
- [ ] JSON validation
- [ ] Retry
- [ ] Error handling

Não alterar o modelo sem razão técnica ou económica comprovada.

## P1 — Fase 10: Promotion

Fluxo esperado: `curated_posts` -> `promote-curated-post` -> `posts` + `post_categories` + `tags` + `metadata` -> frontend.

- [ ] Promotion
- [ ] Categoria
- [ ] Tags
- [ ] Metadata
- [ ] Imagem
- [ ] Slug
- [ ] SEO
- [ ] Publicação
- [ ] Rollback

## P2 — Fase 11: Chat AI

### Actual

- [x] Claude Haiku 4.5
- [x] Contexto do portal
- [x] Links internos
- [x] Guardrails

### Evolução

- [ ] Pesquisa completa
- [ ] Conteúdo
- [ ] Categorias
- [ ] Tags
- [ ] Keywords
- [ ] Entidades
- [ ] Datas
- [ ] Relevância
- [ ] Ordenação temporal
- [ ] Fallback determinístico
- [ ] Rate limiting
- [ ] Cost protection

A fonte de verdade deve continuar a ser o conteúdo editorial do Vision7. Não criar knowledge base duplicada sem necessidade.

## P2 — Fase 12: Observabilidade

- [ ] Logs
- [ ] Erros
- [ ] Falhas AI
- [ ] Falhas de publicação
- [ ] Diagnóstico
- [ ] Alertas
- [ ] Histórico
- [ ] Métricas
- [ ] Pipeline health

## P2 — Fase 13: Custos

Medir antes de optimizar.

- [ ] Tokens WF-03
- [ ] Tokens Chat
- [ ] Custo Claude
- [ ] Custo n8n
- [ ] Custo Supabase
- [ ] Custo Vercel
- [ ] Custo Render
- [ ] Storage
- [ ] Bandwidth
- [ ] Custo por artigo
- [ ] Custo mensal

## P3 — Fase 14: Design System

- [ ] Typography
- [ ] Colours
- [ ] Spacing
- [ ] Buttons
- [ ] Cards
- [ ] Inputs
- [ ] Tables
- [ ] Callouts
- [ ] Modals
- [ ] Toasts
- [ ] Loading
- [ ] Empty
- [ ] Error
- [ ] Icons

## P3 — Fase 15: Performance

- [ ] Core Web Vitals
- [ ] LCP
- [ ] CLS
- [ ] INP
- [ ] Imagens
- [ ] Bundle
- [ ] Caching
- [ ] Supabase queries
- [ ] Edge Functions
- [ ] Lazy loading

## P3 — Fase 16: CRO / audiência

- [ ] Related articles
- [ ] Newsletter
- [ ] CTA
- [ ] Retenção
- [ ] CTR
- [ ] Engagement
- [ ] Tempo de leitura
- [ ] Páginas por sessão

## P4 — Fase 17: ContentOS / escala

Só iniciar depois de o Engine estar estável.

- [ ] Multi-tenant
- [ ] Configuração por projecto
- [ ] Pipelines reutilizáveis
- [ ] Templates
- [ ] Dashboard SaaS
- [ ] Onboarding
- [ ] Billing
- [ ] Gestão de clientes
- [ ] Analytics
- [ ] Permissions

---

## Milestones

### M1 — Manual MVP

Criar artigo -> editar -> imagem -> SEO -> preview -> publicar -> frontend.

### M2 — Editorial Ready

Content Model -> Renderer -> tabelas -> diagramas -> media -> mobile.

### M3 — Search Ready

SEO + AEO + Structured Data + Sitemap + Crawlers.

### M4 — Newsroom Ready

Dashboard + Editor + Media + Analytics + Workflow.

### M5 — Automation Ready

Collection -> Clustering -> Generation -> Validation -> Promotion -> Publication.

### M6 — Intelligent Portal

Portal + AI Chat + Search + Context + Entities + Content Intelligence.

### M7 — Product Ready

Vision7 Engine -> ContentOS -> Multi-tenant -> Clientes -> SaaS.

## Definição de Production Ready

Só marcar `PRODUCTION READY` quando a funcionalidade funciona, está integrada, possui tratamento de erros, foi validada, não introduz regressões, funciona nos dispositivos relevantes, respeita segurança e está documentada quando necessário. Compilar não é suficiente.

## Formato obrigatório de relatório

Depois de analisar qualquer fase, responder exactamente com:

### STATUS

`OK` | `PARCIAL` | `PRECISA DE MELHORIA` | `BLOQUEADOR` | `AUSENTE`

### DESCOBERTAS

Listar exactamente o que foi encontrado.

### FICHEIROS

Listar ficheiros afectados.

### DEPENDÊNCIAS

Indicar o que precisa ser resolvido primeiro.

### RISCO

`Baixo` | `Médio` | `Alto` | `Crítico`

### PRÓXIMO PASSO

Indicar apenas o próximo passo prioritário. Não implementar automaticamente a fase seguinte.

## Estado documental conhecido

- `CLAUDE.md` é o Master Prompt operativo e foi actualizado para apontar para esta checklist.
- `docs/ai/CHECKLIST_VALIDACAO_EDITORIAL.md` continua válida como checklist especializada de validação editorial do motor n8n; não substitui esta checklist de produção.
- `docs/planejamento/CHECKLIST_TOKENS_3DIAS.md` está expirada/arquivada e não é fonte de estado actual.
- As funcionalidades marcadas como implementadas nesta versão foram confirmadas no roadmap existente de `CLAUDE.md`; os restantes itens exigem auditoria ou validação própria.

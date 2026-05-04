# Arquitetura AI do Portal Vision7

> Atualizado: 12 de Abril de 2026

Esta pasta contém a arquitetura de agentes IA e skills especializadas para o desenvolvimento e manutenção do Vision7, um portal digital focado em tecnologias web, automação e informações relevantes.

## Estrutura

### Agentes IA (decisores especializados)

| Agente | Arquivo | Foco |
|--------|---------|------|
| Segurança | `agente-seguranca.agent.md` | Auditorias, RLS, vulnerabilidades, OWASP |
| UX/UI | `agente-ux-ui.agent.md` | Design system, responsividade, a11y |
| Assistente Portal | `assistente-portal.agent.md` | Navegação, busca editorial, guardrails |
| Automações | `agente-automacoes.agent.md` | Pipeline n8n, multi-categoria, templates |

### Skills (guias de implementação)

| Skill | Arquivo | Foco |
|-------|---------|------|
| Segurança | `seguranca-portal.skill.md` | Anti-spam, XSS/CSRF, headers, RLS |
| UX/UI | `ux-ui-portal.skill.md` | shadcn/ui, Tailwind, dark mode, a11y |
| Gestão Conteúdo | `gestao-conteudo.skill.md` | CRUD posts, SEO, TipTap editor |
| Performance | `otimizacao-performance.skill.md` | Bundle split, lazy-load, cache, fonts |
| Assistente Portal | `assistente-portal.skill.md` | Busca editorial, rotas, guardrails |
| Curadoria | `curadoria-inteligente.skill.md` | Pipeline AI, editorial score, RSS |
| Automações | `automacoes-portal.skill.md` | Motor multi-categoria, n8n, templates |

## Como Usar

### Ativando Agentes

1. Mencione o agente no contexto da conversa
2. Use os comandos específicos documentados em cada arquivo
3. O agente pesquisará fontes confiáveis e aplicará melhores práticas

### Ativando Skills

1. Leia o SKILL.md relevante antes de começar
2. Aplique as melhores práticas documentadas
3. Use os exemplos como referência

## Conexão com Banco de Dados

- **Supabase Project**: `xhpfxvoonpclonjyfimt` (West EU Ireland)
- **Schema**: `supabase/migrations/` + `supabase/bootstrap_new_project.sql`
- **URL e chaves**: sempre via variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- **Regra**: nunca fixar project IDs/URLs em docs ou fallbacks de frontend

## Pipeline de Conteúdo AI (Ativo ✅)

```
WF-01 Coleta RSS (30min) → news_staging (300+ artigos)
WF-02 Dedup/Cluster (20min) → news_clusters (199 clusters)
WF-03 Curadoria AI Groq (60min) → curated_posts (score 86-100)
WF-04 Pipeline Monitor
WF-05 Social Distribution
WF-06 Learning Loop
```

- n8n: `https://portal-vision7.onrender.com` (Render, community edition)
- AI Model: Groq `llama-3.1-8b-instant`
- Todos os 6 workflows ativos em produção

## Áreas de Foco

### Segurança
- OTP auth, RLS deny-by-default, DOMPurify, rate limiting
- Pendente: MFA, security headers, CSRF completo

### UX/UI
- shadcn/ui + Tailwind, dark/light mode, mobile-first
- Fonts: Manrope (preload) + Fraunces + Space Grotesk (defer)
- Animações: CSS transitions (público), framer-motion (admin lazy)

### Performance
- Bundle: ~140KB gzip first-load, admin chunks lazy
- Lazy: MiniPlayer, email templates, DOMPurify, admin routes
- Cache: staleTime 5min, gcTime 10min, refetchOnReconnect:false

### Jornadas de Acesso
- Admin: `/acesso/admin/controlado`
- Equipa/Parceiros: `/validar/entrada/tipodeuser`
- Público: `/acesso/convidado`

## Módulo de Portal AI

O front-end do botão Vision7 AI está preparado em `src/modules/portal-ai/` com config, guardrails, service local e ponto de expansão para futura API de modelo externo.

## SDDs Relacionados

- `sdd/modules/agents-skills-ai.json` (v0.8.0)
- `sdd/modules/frontend-ui.json` (v1.3.0)
- `sdd/modules/auth-security.json` (v1.3.0)
- `sdd/modules/automation-engine.json` (v2.1.0)

## Motor Editorial Vision7 v1.0 (NOVO ✨)

Motor de geração de conteúdo editorial de referência, integrado com n8n workflows para produção em escala.

### 🚀 Comece Aqui (5 min)

**Novo na equipa?** Leia [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) — guia rápido em português.

### Documentação do Motor Editorial

| Documento | Propósito | Audiência |
|-----------|-----------|-----------|
| [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) | Onboarding 5–10 min, fluxo 3-passos | Todos (novo na equipa) |
| [MOTOR_EDITORIAL_V1.0.md](./MOTOR_EDITORIAL_V1.0.md) | Especificação completa da estrutura, estilo, SEO/AEO e padrões por categoria | Redatores, Prompt Engineers, Revisores |
| [MOTOR_EDITORIAL_INTEGRACAO_N8N.md](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md) | Guia de integração com n8n (WF-02), Edge Functions e fluxo de publicação | Engenheiros n8n, DevOps, Integradores |
| [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md) | Checklist rápido (2 min) de validação pré-publicação e troubleshooting | Operadores n8n, QA Editorial |

### Estrutura do Motor

```
n8n WF-02 (Editorial Engine)
  ├── Ler briefing (Notion)
  ├── Enriquecer dados (APIs externas)
  ├── Gerar artigo (Claude Opus 4.6)
  ├── Estruturar JSON (MOTOR_EDITORIAL_V1.0)
  ├── Validar Quality Score (≥9.5)
  └── POST → /functions/v1/ingest-manus-post
       ↓
Supabase Edge Function (ingest-manus-post)
  ├── Detectar formato (Editorial vs Simples)
  ├── Validar estrutura
  ├── Processar SEO/AEO/metadados
  ├── Inserir em posts + post_categories
  └── Retornar { id, url, quality_score, published }
```

### Campos Críticos

| Campo | Tipo | Validação | Impacto |
|-------|------|-----------|--------|
| `title` | string | 55–65 chars, SEO keyword início | H1 + Indexação |
| `slug` | string | 6 palavras max, sem acentos | URL única |
| `meta_description` | string | 145–155 chars exactos | SERP snippet |
| `category` | enum | tecn\|mundo\|saude\|musica\|desporto\|audio | Organização |
| `seo.primary_keyword` | string | Palavra-chave principal | Ranking |
| `content.body` | string | 1400–1800 wds, ≥5 H2 | Autoridade |
| `quality_score.total` | number | 0–10, ≥9.5 publicável | Auditoria |
| `workflow_metadata.publish_ready` | boolean | true = auto-publish | Fluxo |

### QA Editorial

Cada artigo passa por:
- ✅ **Validação Estrutural** (30%) — H1, ToC, secções, Portugal, lead
- ✅ **SEO/AEO** (25%) — Keywords, meta, FAQs, entidades, heading questions
- ✅ **Dados & Fontes** (20%) — Dados por secção com fonte, links primários
- ✅ **Links** (10%) — Internos contextuais + externos com rel
- ✅ **Formatação** (10%) — Parágrafos, negrito, listas, framework visual
- ✅ **Tom** (5%) — Analítico, sem clichés, CTA com valor

**Threshold:** Score 9.5+ = publicação automática | 8.5–9.4 = revisão rápida | <8.5 = re-gerar

### Próximas Integrações

- [ ] Webhooks (Slack, Discord, email)
- [ ] Dashboard de KPIs (articles/day, avg quality, % published)
- [ ] A/B testing de titles + meta descriptions
- [ ] Auto-geração de imagens (Stable Diffusion, Midjourney)
- [ ] Multi-language (PT-PT → EN/ES/FR)

---

## Desenvolvimento

Para contribuir com novos agentes ou skills:

1. Siga o formato dos arquivos existentes
2. Documente capacidades e exemplos de uso
3. Teste a integração com o projeto
4. Atualize este README

# CLAUDE.md — Vision7 Portal

> Ficheiro de contexto para Claude Code. Carregado automaticamente em cada sessão.
> Mantém este ficheiro actualizado à medida que o projecto evolui.

---

## Identidade do Projecto

**Vision7** é um portal editorial full-stack em português brasileiro (PT-BR), com foco em
Tecnologia, Mundo, Saúde, Música e Desporto. Tem dashboard admin
completo, automações n8n, motor IA e monetização integrada.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript (SPA em `/src`) |
| Estilo | Tailwind CSS + Radix UI |
| Backend | Supabase (DB + Auth + Edge Functions) |
| Automação | n8n em Docker (6 workflows: WF-01 a WF-06) |
| Deploy | Vercel |
| Agente de código | Claude Code (primário) |

**Path do projecto:** `/home/claude/Portal-Vision7/Portal-Vision7`

---

## Motor IA — Regras Obrigatórias

### Modelos a usar

| Contexto | Modelo | Motivo |
|---|---|---|
| Chat público do portal | `claude-haiku-4-5-20251001` | Rápido e económico ($0.80/1M tokens) |
| Geração editorial (WF-03) | `claude-sonnet-4-6` | Qualidade máxima para artigos |
| Agente de código (aqui) | Claude Code (Sonnet) | Já configurado |

### Regras de custo
- **NUNCA** usar Opus em automações — custo injustificado
- Usar **prompt caching** sempre que possível
- Meta: < $5/mês com 50 posts/dia
- Providers **eliminados**: Groq (llama-3.1-8b, llama-3.3-70b) e HuggingFace (Mistral-7B)

### Variáveis de ambiente necessárias
- Supabase: `ANTHROPIC_API_KEY`
- n8n: `ANTHROPIC_API_KEY` nas variáveis globais

---

## Estrutura do Projecto

### Páginas Públicas
```
Index, Tecnologia, Mundo, Saude, Musica, Desporto
Post (detalhe), Course, PrivacyPolicy, NewsletterUnsubscribe
```

### Módulos Admin
```
Content, Automations, Analytics, CRM, Courses/Partners,
Media, Settings, Developer
```

### Edge Functions Supabase (14 total)
Proxy n8n, Portal AI Assistant, e restantes funções de backend.

---

---

## Roadmap Activo

### F1 — Limpeza ✅
- [x] Remover dead code e ficheiros duplicados
- [x] Criar `CLAUDE.md`

### F2 — Migração IA ✅
- [x] Edge Function `portal-ai-assistant` → Claude Haiku (com prompt caching)
- [x] WF-03 n8n → Claude Sonnet (claude-sonnet-4-6, com prompt caching)
- [x] Remover providers Groq e HuggingFace

### F3 — Refactorização Automações ✅
- [x] `AutomationDashboardV2` decomposto (873L → 508L)
- [x] `NewsPipelineCard` decomposto (1455L → sub-componentes)

### F4 — Responsividade ✅
- [x] Drawer mobile para sidebar
- [x] Grids `sm/md/lg` corrigidos em todo o admin
- [x] Toolbar CRM e ExecutionTimeline a 375px

### F5 — Decomposição de componentes ✅
- [x] `PipelineSettingsPanel` (459L → 54L + 3 tabs)
- [x] `PostForm` com `PostImageUploadField` extraído
- [x] `RichTextEditor` lazy-loaded (TipTap 582kB deferido)

### F6 — Bundle / lazy loading ✅
- [x] `vendor-data-viz` (Recharts) já lazy via `AnalyticsView`
- [x] `vendor-editor` (TipTap) deferido com `React.lazy`

### Remoção Audiocast ✅
- [x] Feature audiocast removida por completo (código + docs + rotas)
- [x] URLs legados `/audiocasts` e `/audiocast/:id` redirecionam para `/`
- [x] Limpeza concluída: removidas as referências vestigiais a `/audiocasts` do system prompt de `portal-ai-assistant` e do comentário de categorias em `ingest-manus-post` — os redirects legados `/audiocasts` e `/audiocast/:id` em `App.tsx` mantêm-se de propósito

### F7 — Tutorial de Onboarding (Admin) ✅
- [x] Tour guiado nativo cobrindo as 11 áreas do dashboard (38 passos) — `src/components/admin/onboarding/`
- [x] Motor `activateSelector` — passos que apontam para conteúdo dentro de tabs não-default (Automações, CRM, Acesso, Developer)
- [x] Persistência híbrida localStorage + Supabase (`user_onboarding`), com fallback silencioso
- [x] Ponto único de controlo em Configurações > Tutorial (activar/desactivar, progresso, reiniciar)
- [x] Mini-tutoriais inline ("O que fazer agora") em Conteúdo e Automações
- [x] Migration `supabase/migrations/20260720120000_user_onboarding.sql` aplicada em produção (confirmado via REST API — `permission denied` em vez de `relation does not exist`)
- [x] QA manual dos 4 cenários aprovado (4/4) — ver `sdd/modules/admin-onboarding.json`. Durante o QA foram corrigidos 3 bugs reais de produção: crash ao trocar de área a meio do tour, coachmark sobreposto/fora do ecrã em secções baixas, e um crash do editor de posts (TipTap) num duplo-toque mobile

### F8 — Redesign do Dashboard Admin 🟡
Iniciativa contínua de melhoria de design/UX, área por área. Cada fase é combinada com o utilizador antes de implementar.
- [x] Visão Geral — removido botão "Novo post" duplicado (já existe no header global) e botão "Automações" (redundante com a sidebar). Depois: título estático substituído por faixa de informações rotativa (data/hora ao vivo + mensagens do portal em crossfade), cards de stats maiores/individuais com tom de cor por estado, secções "Semanas" e "Top categorias" removidas, "Últimos artigos" reduzido para 4 itens
- [x] Conteúdo — removido cabeçalho (pill/título/subtítulo) e badges de contagem redundantes com os cards da Visão Geral; barra de pesquisa movida para o header global (contextual, só aparece com Conteúdo activo — reaproveitável por outras áreas no futuro)
- [ ] Builder (Homepage)
- [ ] Builder (Homepage)
- [ ] Media (Galeria)
- [ ] Automações
- [ ] Cursos (Parceiros)
- [ ] CRM
- [ ] Analytics
- [ ] Acessos
- [ ] Developer
- [ ] Configurações

---

## Padrões de Código

### Convenções gerais
- TypeScript estrito — sem `any` não justificado
- Componentes funcionais com hooks — sem class components
- Tailwind para estilo — sem CSS inline salvo casos excepcionais
- Radix UI para componentes acessíveis (modais, dropdowns, etc.)

### Nomenclatura
- Componentes: `PascalCase`
- Hooks: `use` + `PascalCase` (ex: `useArticleList`)
- Utils/helpers: `camelCase`
- Tipos/Interfaces: `PascalCase` com prefixo `I` opcional

### Estrutura de componentes
```tsx
// 1. Imports externos
// 2. Imports internos
// 3. Tipos/interfaces locais
// 4. Componente
// 5. Export default
```

### Edge Functions Supabase
- Sempre validar `Authorization` header
- Respostas com `corsHeaders` obrigatório
- Logs de erro com contexto suficiente para debug

---

## Editorial — Padrão v1 (Score alvo: 9.5+)

Artigos devem ter:
1. ToC com âncoras
2. Dados quantitativos por secção
3. Entidades SEO reais (NVIDIA, TSMC, IBM, Google, Anthropic…)
4. Uma previsão datada forte
5. Framework visual proprietário
6. Secção Portugal com 3 cenários
7. CTA com valor concreto
8. Interlinking contextual no meio do texto
9. Tom analítico — nunca apenas descritivo

---

## Imagens de Capa — Estilo "Dark Cinematic"

- **Dimensões:** 1200×630px
- **Regras:** sem texto, sem logos, fundo escuro (preto/azul meia-noite/carvão)
- **Estilo:** CGI fotorrealista ou fotografia editorial, metafórico (nunca literal)
- **Acentos por categoria:**
  - Tecnologia → azul eléctrico / ciano
  - Mundo → âmbar / dourado
  - Saúde → verde esmeralda
  - Música → violeta / roxo
  - Desporto → vermelho / laranja

---

## Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Supabase Edge Functions (local)
supabase functions serve

# n8n (Docker)
docker compose up -d
```

---

## O que Claude Code deve SEMPRE fazer

- Verificar se o ficheiro já existe antes de criar um novo
- Preferir editar componentes existentes a criar duplicados
- Ao criar Edge Functions, incluir sempre CORS headers
- Ao alterar modelos IA, confirmar se a variável `ANTHROPIC_API_KEY` está referenciada
- Comentar decisões de arquitectura não óbvias

## O que Claude Code NUNCA deve fazer

- Criar backups com sufixo `.backup.tsx` — usar Git para versões
- Adicionar dependências pesadas sem confirmar com o utilizador
- Usar `console.log` em produção (Edge Functions) — usar `console.error` com contexto
- Chamar modelos Opus em automações
- Usar providers Groq ou HuggingFace — migração completa para Claude
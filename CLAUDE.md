# CLAUDE.md — Vision7 Portal

> Ficheiro de contexto para Claude Code. Carregado automaticamente em cada sessão.
> Mantém este ficheiro actualizado à medida que o projecto evolui.

---

## Identidade do Projecto

**Vision7** é um portal editorial full-stack em português europeu, com foco em
Tecnologia, Mundo, Saúde, Música, Desporto e Audiocasts. Tem dashboard admin
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
Index, Tecnologia, Mundo, Saude, Musica, Desporto, Audiocasts
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

## Ficheiros a NÃO tocar (eliminar quando possível)

| Ficheiro | Razão |
|---|---|
| `OverviewView.backup.tsx` | 511 linhas mortas — apagar |
| `MiniPlayer.tsx` | Duplicado por `MiniPlayerV2` — apagar |
| `.github/copilot-instructions.md` | Substituído por este ficheiro |

---

## Ficheiros a Refactorizar

| Ficheiro | Problema | Solução |
|---|---|---|
| `AutomationDashboardV2.tsx` (873L) | Demasiado grande | Dividir em 3 tabs |
| `NewsPipelineCard.tsx` (1455L) | Monolítico | Decompor em sub-componentes |
| `PipelineSettingsPanel.tsx` (637L) | Demasiado grande | Extrair painéis |

---

## Roadmap Activo

### F1 — Limpeza ✅ (este ficheiro faz parte desta fase)
- [x] Apagar `OverviewView.backup.tsx`
- [x] Apagar `MiniPlayer.tsx`
- [x] Apagar `.github/copilot-instructions.md`
- [x] Criar `CLAUDE.md`

### F2 — Migração IA ✅
- [x] Edge Function `portal-ai-assistant` → Claude Haiku (com prompt caching)
- [x] WF-03 n8n → Claude Sonnet (claude-sonnet-4-6, com prompt caching)
- [x] `AISettingsPanel` com selector Haiku/Sonnet
- [x] Remover referências a Groq e HuggingFace

### F3 — Refactorização Automações ✅

- [x] Simplificar `AutomationDashboardV2` (873L → 508L, 4 views extraídas)
- [x] Remover providers Groq/HF do código
- [x] Decompor `NewsPipelineCard` (1455L → 1104L, 3 sub-componentes extraídos)

### F4 — Responsividade ✅

- [x] Drawer mobile para sidebar (Sheet com hamburger no header)
- [x] Grids `sm/md/lg` corrigidos (CredentialVault, AdminAccessManager, AdsSection)
- [ ] Testar nos breakpoints: 375px / 768px / 1280px (validação manual)

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
  - Audiocasts → índigo / ondas sonoras

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
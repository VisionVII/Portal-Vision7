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

## Master Prompt de Execução para Produção

Este ficheiro é o Master Prompt operativo do Vision7. A checklist oficial de produção está em [docs/planejamento/PRODUCTION_CHECKLIST.md](docs/planejamento/PRODUCTION_CHECKLIST.md).

### Ordem obrigatória de prioridade

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

**Regra fundamental:** não automatizar o que ainda não funciona correctamente manualmente. O Vision7 deve conseguir funcionar como uma publicação real mesmo que a produção de artigos seja temporariamente 100% manual.

### Classificação de prioridade

- **P0** — Bloqueador absoluto de produção
- **P1** — Problema crítico
- **P2** — Melhoria importante
- **P3** — Optimização
- **P4** — Futuro / escala

Nunca trabalhar numa tarefa P3/P4 enquanto existir P0/P1 relevante.

### Regra documental de execução

Esta actualização é documentação/organização. Não implementar automaticamente funcionalidades da checklist, não fazer redesign, não alterar arquitectura, workflows, banco de dados ou credenciais, e não fazer deploy sem instrução explícita.

Depois de analisar uma fase, responder no formato `STATUS`, `DESCOBERTAS`, `FICHEIROS`, `DEPENDÊNCIAS`, `RISCO` e `PRÓXIMO PASSO`. O próximo passo deve ser apenas o prioritário; a fase seguinte não deve ser implementada automaticamente.

### Critério de Production Ready

Só marcar uma funcionalidade como `PRODUCTION READY` quando funciona, está integrada, possui tratamento de erros, foi validada, não introduz regressões, funciona nos dispositivos relevantes, respeita segurança e está documentada quando necessário. Código que compila não é suficiente.

### Estado documental

- `CLAUDE.md` é o Master Prompt operativo.
- `docs/planejamento/PRODUCTION_CHECKLIST.md` é a checklist oficial de produção.
- `docs/ai/CHECKLIST_VALIDACAO_EDITORIAL.md` continua a ser a checklist especializada do motor editorial e não substitui a checklist de produção.
- `docs/planejamento/CHECKLIST_TOKENS_3DIAS.md` está expirada/arquivada.

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
- [x] Tour guiado nativo cobrindo as 10 áreas do dashboard (36 passos) — `src/components/admin/onboarding/`
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
- [x] Builder (Homepage) — **retirado por completo** (decisão do projecto: o layout do site deixou de ser editável em runtime). O motor "estilo Elementor" (Puck — `@puckeditor/core`) tinha sido construído em duas fases (UI de formulários, depois canvas visual), mas nunca chegou a ser usado em produção antes de a direcção mudar. Removido: `AdminCmsCustomizer`, `BuilderView`, canvas Puck, `SectionSorter`, gestor de banners rotativos, gestor de banners de categoria, dependência `@puckeditor/core`, chaves `home_page_config`/`home_page_hero_puck`/`section_page_banners` em `site_settings`, item "Homepage" da sidebar, 4 passos do tutorial guiado. O conteúdo que estava ao vivo em produção (textos, ordem das secções, banners de categoria) foi fixado directamente no código das páginas públicas (`Index.tsx`, `CategoryPage.tsx`, `Course.tsx`, `PrivacyPolicy.tsx`, `Sobre.tsx`) — zero regressão visual. Definições simples e genéricas (logo, nome do portal) continuam em Configurações via `SiteSettingsManager`, que já existia antes do Builder e não foi afectado
- [x] Media (Galeria) — unificadas as 4 pastas do bucket `post-images` (`posts/`, `banners/`, `gallery/`, `manus/`) num único ecrã filtrável por origem; cruzamento com `posts.image_url`/`banner_url` para mostrar utilização real ("Usado · N posts" / "Não utilizada"); lista fixa de imagens hardcoded em páginas públicas (`PrivacyPolicy.tsx`, `Course.tsx`, `CategoryPage.tsx`) protegida contra eliminação acidental; eliminar passou de toggle inline para `AlertDialog` com aviso de posts afetados; selecção múltipla + acções em lote; pesquisa movida para o header global (mesmo padrão contextual de Conteúdo)
- [x] Automações — removido cabeçalho redundante ("Centro de Automação" / "Pipeline IA · Workflows n8n · Monitoramento") do topo do `AutomationDashboardV2`, mesmo tratamento dado a Visão Geral e Conteúdo; fila de estado/acções (pill n8n Online/Offline, keep-alive, refresh) mantida, agora alinhada à direita
- [x] Cursos (Parceiros) — catálogo passou de lista a grelha de cartões com imagem (o que se vê é o que fica publicado, elimina a pré-visualização separada que era mantida à parte); criar/editar move-se para um `Dialog` modal em vez de coluna fixa; selector de imagem ganhou "Escolher da Galeria" (`MediaPickerDialog`, reutiliza `useGalleryImages` extraído de Media) a par de colar URL; stat cards e filtro por tipo (curso/produto/serviço/link); eliminar passou de `window.confirm()` para `AlertDialog`; pesquisa movida para o header global; rótulo do botão de submissão e valores por omissão de CTA/badge deixaram de estar dessincronizados do texto dos placeholders. Modelo de dados não foi tocado — `course_partner_meta` continua à parte em `site_settings`, decisão de esquema por resolver mais tarde se fizer sentido
- [x] CRM — âmbito acordado: visual/UX + bugs reais (sem tocar em tags/histórico de interações, nem na sincronização Contactos↔Newsletter — ficam por decidir mais tarde). Nos 3 separadores: SectionLabel + stat cards com tokens semânticos (antes cores Tailwind hardcoded, inconsistentes entre separadores), pesquisa movida para o header global. Contactos — badge de estado activo/inactivo passou a usar o mesmo mecanismo `badge-status-*` do badge de tipo (antes hardcoded à parte). Newsletter — corrigido bug real: "Enviar campanha" mandava sempre um digest vazio (`posts: []` fixo); ganhou secção "Incluir artigos" para escolher que posts recentes entram no email antes de enviar. Revisão pós-implementação encontrou um segundo bug latente no mesmo caminho: o campo "Texto de pré-visualização" era recolhido na UI mas nunca chegava ao email (`previewText` não fazia parte do tipo `newsletter_digest` nem era passado ao template) — ligado ao suporte de preheader que `wrapInLayout` já tinha, só não estava a ser usado. Pipeline — corrigido erro de português "Negoçiação" → "Negociação"; quadro Kanban passou a scroll horizontal numa única linha (antes quebrava em 2-3 linhas abaixo de 1536px, invertendo a ordem de leitura); ganhou eliminar por deal (`useDeleteDeal`, não existia); texto do tour deixou de prometer arrastar-e-largar, que nunca foi implementado
- [x] Analytics — âmbito acordado: visual/UX + "Páginas mais vistas". Cabeçalho redundante removido, SectionLabel, KPI cards com tokens de gradiente (antes `Card` genérico + cores hardcoded no texto de tendência). Cores do gráfico "Por tipo de evento" deixaram de ser atribuídas por posição no ranking (o mesmo tipo mudava de cor consoante o volume relativo) — passaram a um mapeamento fixo por `event_type`. Gráfico de linha "Tendência de tráfego" removido — só repetia o número já mostrado no KPI sem informação nova; no lugar entrou "Páginas mais vistas", a ler o `path` que cada `page_view` já guarda em `event_data` (sem tracking novo). Nota dinâmica (não hardcoded por data) quando a maioria dos eventos ainda é só `page_view`. Removido hook morto `useAnalytics` (nunca usado) e a interface `AnalyticsEvent` associada
- [ ] Acessos — **fix de segurança aplicado em 2026-08-30, redesign visual ainda por fazer.** Auditoria encontrou escalada de privilégio confirmada: qualquer `admin` conseguia convidar alguém (ou registar-se a si próprio) como `super_admin`, porque `send-invite-code` nunca verificava se o papel pedido era igual ou inferior ao de quem convida — só verificava que quem convida é admin/super_admin, não o papel do convidado. Corrigido na origem (`send-invite-code` só deixa admins normais convidar para papéis operacionais; admin/super_admin passam a exigir que quem convida seja super_admin) e reforçado nos dois caminhos de resgate do convite (`activate-invite`, `assign-invite-role` — este último é o realmente usado pelo registo público em `UserLogin.tsx`), que voltam a verificar o papel actual de quem convidou antes de atribuir um papel elevado. **Estas são Edge Functions — o fix só protege produção depois de `supabase functions deploy`, não há deploy automático via CI para functions.** Revisão adversarial ao fix dos convites encontrou um caminho de exploração bem mais directo e ainda por fechar: a política RLS `"Only admins can manage roles"` em `user_roles` era `FOR ALL` (cobre SELECT+INSERT+UPDATE+DELETE) só a verificar `has_role(admin)` — sem olhar para a linha a escrever. Ou seja, qualquer `admin` conseguia fazer `POST /rest/v1/user_roles {"role":"super_admin",...}` directamente, sem passar pelo fluxo de convites nem por nenhuma RPC. Corrigido em `20260830120000_fix_user_roles_rls_privilege_escalation.sql` — a política deixou de permitir escrita directa a `authenticated` (toda a escrita legítima já passa por RPCs `SECURITY DEFINER`, confirmado que nenhuma escrita ao vivo depende do acesso directo). A mesma revisão encontrou ainda que `has_role()` nunca verificava `is_active` — "Desativar membro" nunca tinha efeito real a nível de RLS/RPC, só escondia o UI (`AuthContext.tsx` filtra `is_active` no frontend, mas o backend não). Corrigido em `20260830120100_fix_has_role_ignores_is_active.sql`. **Ambas as migrations estão escritas mas por aplicar — precisam de `supabase db push` (ou equivalente) para protegerem produção; não há deploy automático de migrations via CI.** Encontrado também (não corrigido nesta passagem, fica para o redesign): a validade do convite escolhida pelo admin no formulário é só cosmética — o código real expira sempre às 48h fixas, independentemente do que for escolhido
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
6. Secção regional (país/mercado do tema editorial) com 3 cenários — Brasil por omissão, configurável por tema em Automações > Configuração Editorial
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
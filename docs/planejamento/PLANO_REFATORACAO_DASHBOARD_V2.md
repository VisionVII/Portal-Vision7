# PLANO DE REFATORAÇÃO — DASHBOARD V2

**Data:** 2026-04-06  
**Status:** Aprovado para execução  
**Base SDD:** v1.2.0 (atualizado)

---

## 1. ESTADO ATUAL (antes)

```
AdminDashboard.tsx        → Monolítico (~500 linhas), 9 views inline
AdminStatsCards.tsx        → KPIs simples (posts, views, rascunhos, mês)
AdminAutomationPanel.tsx   → Painel n8n funcional
Layout                     → Sidebar fixa + chips mobile, design genérico
Tipografia                 → Inter padrão, sem hierarquia visual forte
Cores                      → Primárias ok, mas sem identidade diferenciada
Dados                      → Tudo sempre carrega, sem lazy/skeleton granular
```

## 2. ESTADO ALVO (depois)

```
AdminDashboard.tsx         → Orquestrador leve (~120 linhas), lazy loading views
Componentes por view       → Cada view em ficheiro separado
AdminOverviewV2.tsx        → Cards KPI animados, gráficos Recharts, atividade recente
AdminStatsCards.tsx         → Redesenhado com ícones, gradientes, sparklines
Layout                     → Sidebar colapsável + breadcrumbs + command palette (⌘K)
Tipografia                 → Satoshi (headings) + Inter (body)
Cores                      → Gradientes sutis, glass-morphism cards, dark mode polish
Quick Actions              → Toolbar fixa com ações contextuais por view
Status Bar                 → Barra inferior com sync n8n, last deploy, users online
```

---

## 3. FASES DE EXECUÇÃO

### FASE 1 — Reestruturação (Split de componentes)
| Item | Ficheiro | Ação |
|------|---------|------|
| 1.1 | `src/pages/admin/AdminDashboard.tsx` | Refatorar para orquestrador com `React.lazy()` |
| 1.2 | `src/components/admin/views/OverviewView.tsx` | Extrair renderOverview() |
| 1.3 | `src/components/admin/views/ContentView.tsx` | Extrair renderContent() |
| 1.4 | `src/components/admin/views/AutomationsView.tsx` | Wrapper de AdminAutomationPanel |
| 1.5 | `src/components/admin/views/CoursesView.tsx` | Wrapper de AdminCoursesManager |
| 1.6 | `src/components/admin/views/CrmView.tsx` | Wrapper de NewsletterManager |
| 1.7 | `src/components/admin/views/AccessView.tsx` | Wrapper de AdminAccessManager |
| 1.8 | `src/components/admin/views/DeveloperView.tsx` | Wrapper de DeveloperControlCenter |
| 1.9 | `src/components/admin/views/SettingsView.tsx` | Wrapper de SiteSettingsManager |
| 1.10 | `src/components/admin/DashboardSidebar.tsx` | Sidebar extraída, colapsável |
| 1.11 | `src/components/admin/DashboardHeader.tsx` | Header extraído com user info + actions |

### FASE 2 — Design System (visual)
| Item | Ficheiro | Ação |
|------|---------|------|
| 2.1 | `index.html` + CSS | Adicionar fonte Satoshi (Google Fonts / CDN) |
| 2.2 | `src/index.css` | Variáveis CSS para gradientes, glass-morphism |
| 2.3 | `AdminStatsCards.tsx` | Cards redesenhados: ícone circular, gradiente de fundo, trend indicator |
| 2.4 | `OverviewView.tsx` | Gráfico Recharts de posts por semana (últimos 30 dias) |
| 2.5 | `DashboardSidebar.tsx` | Sidebar com avatar, collapse smooth, hover effects |
| 2.6 | Todos os componentes admin | Padding/spacing consistentes, border-radius uniformes |

### FASE 3 — Funcionalidades novas
| Item | Ficheiro | Ação |
|------|---------|------|
| 3.1 | `OverviewView.tsx` | Feed de atividade recente (últimas ações CRUD) |
| 3.2 | `OverviewView.tsx` | Mini-calendário de publicações |
| 3.3 | `DashboardHeader.tsx` | Command Palette (⌘K) para navegação rápida |
| 3.4 | `ContentView.tsx` | Filtros avançados (status, categoria, data) |
| 3.5 | `AutomationsView.tsx` | Indicador de saúde n8n (online/offline badge) |
| 3.6 | `AdminDashboard.tsx` | Status bar com info de sync e ambiente |

### FASE 4 — Polish e performance
| Item | Ação |
|------|------|
| 4.1 | Lazy-load cada view com `Suspense` + skeleton |
| 4.2 | Prefetch de dados ao hover na sidebar |
| 4.3 | Transições animadas entre views (Framer Motion ou CSS) |
| 4.4 | Mobile: drawer sidebar, bottom navigation bar |
| 4.5 | Lighthouse audit: target > 85 performance |

---

## 4. MAPA DE FICHEIROS NOVOS

```
src/components/admin/
├── DashboardHeader.tsx           ← NOVO (extraído do AdminDashboard)
├── DashboardSidebar.tsx          ← NOVO (sidebar colapsável)
├── DashboardStatusBar.tsx        ← NOVO (barra inferior de status)
├── views/
│   ├── OverviewView.tsx          ← NOVO (overview redesenhado)
│   ├── ContentView.tsx           ← NOVO (gestão de conteúdo)
│   ├── AutomationsView.tsx       ← NOVO (wrapper automações)
│   ├── CoursesView.tsx           ← NOVO (wrapper cursos)
│   ├── CrmView.tsx               ← NOVO (wrapper newsletter)
│   ├── AccessView.tsx            ← NOVO (wrapper acessos)
│   ├── DeveloperView.tsx         ← NOVO (wrapper developer)
│   └── SettingsView.tsx          ← NOVO (wrapper settings)
├── AdminStatsCards.tsx           ← REDESENHADO
├── AdminAutomationPanel.tsx      ← MANTIDO (funcional)
├── AdminAccessManager.tsx        ← MANTIDO
├── AdminCmsCustomizer.tsx        ← MANTIDO
├── AdminCoursesManager.tsx       ← MANTIDO
├── DeveloperControlCenter.tsx    ← MANTIDO
├── NewsletterManager.tsx         ← MANTIDO
├── PostForm.tsx                  ← MANTIDO
├── PostsTable.tsx                ← MANTIDO
├── RichTextEditor.tsx            ← MANTIDO
└── SiteSettingsManager.tsx       ← MANTIDO
```

---

## 5. DEPENDÊNCIAS NOVAS (package.json)

```
recharts              → Gráficos no overview (já disponível via shadcn/charts)
```

Nenhum pacote adicional necessário — Recharts já é dependency transitiva do shadcn chart components.

---

## 6. RISCOS E MITIGAÇÕES

| Risco | Mitigação |
|-------|-----------|
| Break de funcionalidade ao split | Testes manuais por view após cada extração |
| Performance regressão | Lazy loading + Suspense boundaries |
| Mobile UX degradação | Testar em 375px a cada fase |
| N8n panel regression | AdminAutomationPanel mantém-se inalterado |

---

## 7. ESTIMATIVA

| Fase | Scope |
|------|-------|
| Fase 1 | Split de componentes |
| Fase 2 | Design system |
| Fase 3 | Funcionalidades novas |
| Fase 4 | Polish e performance |

---

## 8. CHECKLIST DE CONCLUSÃO

- [ ] AdminDashboard.tsx < 150 linhas
- [ ] Todas as 9 views em ficheiros separados
- [ ] Sidebar colapsável funcional
- [ ] KPI cards redesenhados com trends
- [ ] Gráfico de posts no overview
- [ ] Dark/light mode polish
- [ ] Mobile responsivo validado
- [ ] `npm run lint` sem erros
- [ ] `npm run build` sem erros

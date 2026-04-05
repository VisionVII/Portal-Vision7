# 🗂️ ESTRUTURA DE ARQUIVOS - NOVO PROJETO

**Objetivo:** Mapear todos os arquivos que serão criados/modificados nas 4-5 semanas

---

## 📁 VISÃO GERAL DA ESTRUTURA

```
src/
├── components/
│   ├── admin/
│   │   ├── AdminStatsCards.tsx         ✏️ Modificar
│   │   ├── NewsletterManager.tsx       ✏️ Modificar
│   │   ├── PostForm.tsx                ✏️ Modificar (add segurança)
│   │   ├── PostsTable.tsx              ✏️ Modificar
│   │   ├── RichTextEditor.tsx          ✏️ Modificar (DOMPurify)
│   │   ├── SiteSettingsManager.tsx     ✏️ Modificar
│   │   ├── UserManagement.tsx          ✨ NOVO (Super-admin)
│   │   ├── AuditLogViewer.tsx          ✨ NOVO
│   │   ├── TwoFactorSetup.tsx          ✨ NOVO
│   │   └── RoleManagement.tsx          ✨ NOVO
│   │
│   ├── editor/
│   │   ├── EditorDashboard.tsx         ✨ NOVO
│   │   ├── ScheduleManager.tsx         ✨ NOVO
│   │   └── ModerationQueue.tsx         ✨ NOVO
│   │
│   ├── redator/
│   │   ├── RedatorDashboard.tsx        ✨ NOVO
│   │   ├── MyPostsList.tsx             ✨ NOVO
│   │   └── MyStats.tsx                 ✨ NOVO
│   │
│   ├── moderador/
│   │   ├── ModeradorDashboard.tsx      ✨ NOVO
│   │   ├── CommentsModerator.tsx       ✨ NOVO
│   │   └── UserBanList.tsx             ✨ NOVO
│   │
│   ├── analyst/
│   │   ├── AnalystDashboard.tsx        ✨ NOVO
│   │   ├── AnalyticsViewer.tsx         ✨ NOVO
│   │   └── ReportExporter.tsx          ✨ NOVO
│   │
│   ├── admin/
│   │   ├── SuperAdminDashboard.tsx     ✨ NOVO (refactor atual AdminDashboard)
│   │   ├── AdminPanel.tsx              ✨ NOVO
│   │   └── ...
│   │
│   ├── common/
│   │   ├── ProtectedRoute.tsx          ✨ NOVO (Role-based routing)
│   │   ├── RoleGuard.tsx               ✨ NOVO
│   │   ├── PermissionCheck.tsx         ✨ NOVO
│   │   ├── Sidebar.tsx                 ✨ NOVO (Nova navegação)
│   │   ├── Header.tsx                  ✏️ Modificar (integrar novo design)
│   │   └── DashboardLayout.tsx         ✨ NOVO
│   │
│   ├── ui/
│   │   ├── button.tsx                  ✏️ Modify (new design)
│   │   ├── card.tsx                    ✏️ Modify (new design)
│   │   ├── input.tsx                   ✏️ Modify (new design)
│   │   ├── table.tsx                   ✏️ Modify (new design)
│   │   ├── badge.tsx                   ✏️ Modify (new design)
│   │   └── ... (others)
│   │
│   └── ErrorBoundary.tsx               ✏️ Modify (better error handling)
│
├── contexts/
│   ├── AuthContext.tsx                 ✏️ Modificar (fix race condition)
│   ├── PermissionContext.tsx           ✨ NOVO (roles + permissions)
│   ├── ThemeContext.tsx                ✏️ Modify (improve dark/light)
│   └── AuditContext.tsx                ✨ NOVO (audit logging)
│
├── hooks/
│   ├── useAuth.ts                      ✏️ Modify
│   ├── usePermissions.ts               ✨ NOVO (check permissions)
│   ├── useRoles.ts                     ✨ NOVO (get user roles)
│   ├── useSessionManagement.ts         ✨ NOVO (session control)
│   ├── useAuditLog.ts                  ✨ NOVO (log actions)
│   ├── useRateLimit.ts                 ✨ NOVO (rate limiting)
│   ├── use2FA.ts                       ✨ NOVO (2FA support)
│   ├── usePosts.ts                     ✏️ Modify (add role checks)
│   ├── useNewsletter.ts                ✏️ Modify (add rate limiting)
│   └── usePodcasts.ts                  ✏️ Modify (add role checks)
│
├── lib/
│   ├── utils.ts                        ✏️ Modify (add helpers)
│   ├── csrf.ts                         ✨ NOVO (CSRF protection)
│   ├── sanitizer.ts                    ✨ NOVO (DOMPurify wrapper)
│   ├── permissions.ts                  ✨ NOVO (permission checking)
│   ├── validation.ts                   ✨ NOVO (enhanced validation)
│   └── security.ts                     ✨ NOVO (security utilities)
│
├── pages/
│   ├── AdminDashboard.tsx              ✏️ Refactor → SuperAdminDashboard.tsx
│   ├── AdminLogin.tsx                  ✏️ Modify (improve design)
│   ├── AdminRegister.tsx               ✏️ Modify (add invite code)
│   ├── EditorDashboard.tsx             ✨ NOVO
│   ├── RedatorDashboard.tsx            ✨ NOVO
│   ├── ModeradorDashboard.tsx          ✨ NOVO
│   ├── AnalystDashboard.tsx            ✨ NOVO
│   ├── NotFound.tsx                    ✏️ Modify (better design)
│   └── ... (keep existing pages)
│
└── __tests__/
    ├── roles/
    │   ├── super-admin.test.tsx        ✨ NOVO
    │   ├── admin.test.tsx              ✨ NOVO
    │   ├── editor.test.tsx             ✨ NOVO
    │   ├── redator.test.tsx            ✨ NOVO
    │   ├── moderador.test.tsx          ✨ NOVO
    │   └── analyst.test.tsx            ✨ NOVO
    │
    ├── security/
    │   ├── xss.test.tsx                ✨ NOVO
    │   ├── csrf.test.tsx               ✨ NOVO
    │   └── permissions.test.tsx        ✨ NOVO
    │
    └── hooks/
        ├── usePermissions.test.ts      ✨ NOVO
        └── useRoles.test.ts            ✨ NOVO

supabase/
├── migrations/
│   ├── 20260323_remove_auto_admin.sql  ✨ NOVO
│   ├── 20260323_registration_invites.sql ✨ NOVO (inside above)
│   ├── 20260323_expand_roles.sql       ✨ NOVO
│   ├── 20260323_permissions_matrix.sql ✨ NOVO
│   ├── 20260323_audit_logs.sql         ✨ NOVO
│   ├── 20260323_2fa_support.sql        ✨ NOVO
│   ├── 20260324_rate_limits.sql        ✨ NOVO
│   └── 20260325_session_mgmt.sql       ✨ NOVO
│
└── functions/
    ├── rate-limit/index.py             ✨ NOVO (Edge function)
    ├── verify-2fa/index.py             ✨ NOVO (Edge function)
    ├── audit-log/index.py              ✨ NOVO (Edge function)
    └── session-revoke/index.py         ✨ NOVO (Edge function)

📄 CONFIG FILES (Root)
├── tailwind.config.ts                  ✏️ Modify (Satoshi font + colors)
├── vite.config.ts                      ✏️ Modify (security headers)
├── tsconfig.json                       ✏️ Modify (update paths if needed)
└── package.json                        ✏️ Modify (add dependencies)

📄 DOCS & KNOWLEDGE ASSETS (Organizados)
├── docs/
│   ├── visao-geral/
│   │   ├── INDICE_DOCUMENTACAO.md      ✅ índice principal
│   │   ├── README_DOCUMENTACAO.md      ✅ hub de navegação
│   │   └── RESUMO_EXECUTIVO.md         ✅ overview executivo
│   ├── planejamento/
│   │   ├── PLANO_EXECUCAO_DASHBOARD.md ✅ roadmap técnico
│   │   ├── SEMANA1_IMPLEMENTACAO.md    ✅ guia hands-on
│   │   └── ESTRUTURA_ARQUIVOS.md       ✅ mapa da estrutura
│   ├── seguranca/
│   │   ├── SUMMARY_KEY_FINDINGS.md     ✅ findings resumidos
│   │   ├── ANALISE_ARQUITETURA_COMPLETA.md ✅ deep dive técnico
│   │   └── PLANO_ACAO_VULNERABILIDADES.md ✅ plano de ação
│   ├── referencia/
│   │   ├── CODIGO_ESSENCIAL_REFERENCIA.md ✅ snippets prontos
│   │   └── DOCUMENTACAO_ROLES_PERMISSIONS.md ✅ permissões
│   └── ai/
│       ├── *.agent.md                  ✅ agentes especializados
│       └── *.skill.md                  ✅ skills do projeto
├── scripts/
│   └── MIGRATIONS_ROLES_PERMISSIONS.sh ✅ script utilitário
└── examples/
    └── EXEMPLOS_ROLES_PERMISSIONS.tsx  ✅ exemplos de apoio
```

---

## 📊 CONTAGEM DE ARQUIVOS

| Categoria | Criar | Modificar | Total | Status |
|-----------|-------|-----------|-------|--------|
| Components | 18 | 12 | 30 | 🆕 |
| Contexts | 3 | 1 | 4 | 🆕 |
| Hooks | 7 | 3 | 10 | 🆕 |
| Lib | 4 | 1 | 5 | 🆕 |
| Pages | 5 | 3 | 8 | 🆕 |
| Tests | 9 | 0 | 9 | 🆕 |
| Migrations | 8 | 0 | 8 | 🆕 |
| Functions | 4 | 0 | 4 | 🆕 |
| Config | 0 | 4 | 4 | ✏️ |
| Docs | 8 | 0 | 8 | ✨ |
| **TOTAL** | **66** | **24** | **90** | |

---

## 🕐 TIMELINE POR TIPO DE ARQUIVO

### SEMANA 1 (Críticas) - 18 arquivos

**Criar:**
- supabase/migrations/20260323_remove_auto_admin.sql
- supabase/migrations/20260323_expand_roles.sql
- supabase/migrations/20260323_permissions_matrix.sql
- supabase/migrations/20260323_audit_logs.sql
- src/contexts/PermissionContext.tsx
- src/lib/permissions.ts

**Modificar:**
- src/contexts/AuthContext.tsx (race condition fix)
- src/integrations/supabase/client.ts (sessionStorage)
- src/pages/Post.tsx (DOMPurify)
- src/components/admin/RichTextEditor.tsx (DOMPurify)
- src/components/NewsletterForm.tsx (validation)
- package.json (add dependencies)

### SEMANA 2 (Design + Dashboards) - 35 arquivos

**Criar:**
- src/components/common/DashboardLayout.tsx
- src/components/common/ProtectedRoute.tsx
- src/components/common/Sidebar.tsx
- src/pages/admin/SuperAdminDashboard.tsx
- src/pages/editor/EditorDashboard.tsx
- src/pages/redator/RedatorDashboard.tsx
- src/pages/moderador/ModeradorDashboard.tsx
- src/pages/analyst/AnalystDashboard.tsx
- 12+ componentes específicos de each dashboard
- Design system utilities

**Modificar:**
- tailwind.config.ts (Satoshi font)
- tailwind.config.ts (new color palette)
- src/components/Header.tsx
- src/App.tsx (new routes + protection)
- All UI components (card, button, input, table, etc)

### SEMANA 3 (Segurança) - 20 arquivos

**Criar:**
- src/hooks/use2FA.ts
- src/hooks/useSessionManagement.ts
- src/hooks/useRateLimit.ts
- src/hooks/useAuditLog.ts
- src/components/admin/TwoFactorSetup.tsx
- src/components/admin/UserManagement.tsx
- src/components/admin/AuditLogViewer.tsx
- src/components/admin/RoleManagement.tsx
- src/lib/csrf.ts
- src/lib/sanitizer.ts
- src/lib/validation.ts
- src/lib/security.ts
- supabase/migrations/20260323_2fa_support.sql
- supabase/migrations/20260324_rate_limits.sql
- supabase/migrations/20260325_session_mgmt.sql
- supabase/functions/rate-limit/index.py
- supabase/functions/verify-2fa/index.py
- supabase/functions/audit-log/index.py
- supabase/functions/session-revoke/index.py

**Modificar:**
- vite.config.ts (security headers)
- src/components/admin/PostForm.tsx (add 2FA check)

### SEMANA 4 (Testes + Docs) - 17 arquivos

**Criar:**
- src/__tests__/roles/*.test.tsx (6 files)
- src/__tests__/security/*.test.tsx (3 files)
- src/__tests__/hooks/*.test.ts (2 files)
- DESIGN_SYSTEM.md
- ROLES_PERMISSIONS_GUIDE.md
- SECURITY_CHECKLIST.md
- DEPLOYMENT_GUIDE.md

**Modificar:**
- src/App.tsx (final routing)
- Various components (final polish)

---

## 🔄 DEPENDÊNCIAS ENTRE ARQUIVOS

```
1️⃣ WEEK 1 FOUNDATION
   └── Migrations + PermissionContext
       └── (dependencies para Week 2)

2️⃣ WEEK 2 DASHBOARDS
   ├── ProtectedRoute + Sidebar
   ├── AuthContext fixes
   └── UI components (card, button, etc)
       └── (dependencies para Week 3)

3️⃣ WEEK 3 SECURITY
   ├── 2FA setup + hooks
   ├── Session management
   └── Rate limiting
       └── (dependencies para Week 4)

4️⃣ WEEK 4 TESTING
   └── All previous (complete)
```

---

## 📋 CHECKLIST DE CRIAÇÃO

### Fase 1: Setup (Dia 1)
- [ ] Criar migrations (supabase/)
- [ ] Criar PermissionContext
- [ ] Instalar dependências (npm install)

### Fase 2: Estrutura (Dias 2-3)
- [ ] Criar components/common/
- [ ] Criar pages/ dashboards
- [ ] Criar hooks nova/
- [ ] Criar lib/ utilities

### Fase 3: Segurança (Dias 4-7)
- [ ] Criar 2FA components
- [ ] Criar Edge functions
- [ ] Criar security utilities

### Fase 4: Testes (Dias 8-10)
- [ ] Criar test files
- [ ] Refactor baseado em testes
- [ ] Performance optimization

---

## 💾 TAMANHO ESTIMADO DE CÓDIGO

| Seção | Lines of Code | Complexity |
|-------|--------------|-----------|
| Components (UI) | 8,000 LOC | Medium |
| Contexts + Hooks | 3,500 LOC | High |
| Pages (Dashboards) | 6,000 LOC | High |
| Migrations (SQL) | 1,200 LOC | Medium |
| Functions (Edge) | 1,500 LOC | High |
| Tests | 3,000 LOC | High |
| Utilities/Lib | 1,500 LOC | Low |
| **TOTAL** | **24,700 LOC** | |

**Velocity esperada:** 200-250 LOC/hora com 2 devs

---

## 🔐 SEGURANÇA POR ARQUIVO

| Arquivo | Risco | Proteção |
|---------|-------|----------|
| src/pages/Post.tsx | XSS | DOMPurify |
| src/contexts/AuthContext.tsx | Timing attack | Async/await |
| supabase/* | Authorization bypass | RLS + Permissions |
| src/components/ui/* | Visual injection | Input validation |
| src/hooks/useRateLimit.ts | DoS attack | Rate limiting |
| src/lib/security.ts | Header injection | CSP + Headers |

---

## 📊 PROGRESS TRACKING

```
WEEK 1:
├── 🔴 6/18 arquivos (33%)
├── 🟡 Migrations OK
├── 🟡 Contexts OK
└── ⏳ Hooks pendentes

WEEK 2:
├── 🟡 25/53 arquivos total (47%)
├── 🟡 Components criados
├── 🟡 Pages base criadas
└── ⏳ Routing pendente

WEEK 3:
├── 🟢 45/73 arquivos (62%)
├── 🟢 Segurança implementada
├── 🟢 2FA OK
└── ⏳ Edge functions

WEEK 4:
├── ✅ 90/90 arquivos (100%)
├── ✅ Testes OK
├── ✅ Documentação OK
└── ✅ Deploy ready
```

---

## 🚀 COMO COMEÇAR

### Dia 1:
1. Criar branch: `git checkout -b feature/dashboard-refactor`
2. Criar migrations (Week 1)
3. Criar PermissionContext
4. Testar localmente

### Dia 2-5:
Seguir SEMANA1_IMPLEMENTACAO.md passo-a-passo

### Dia 6+:
Seguir PLANO_EXECUCAO_DASHBOARD.md (WEEK 2, 3, 4)

---

## 📝 NOTAS IMPORTANTES

1. **Não deletar** arquivos antigos até ter certeza que refactoring ok
2. **Feature branches** para cada semana
3. **Code review** obrigatório antes de merge
4. **Testing** crítico em Week 4
5. **Documentation** atualizar conforme vai

---

**Documento pronto. Pronto para começar desenvolvimento! 🚀**

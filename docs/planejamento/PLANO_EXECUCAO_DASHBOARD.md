# 🚀 PLANO DE EXECUÇÃO - DASHBOARD PROFISSIONAL COM ROLES & SEGURANÇA

**Versão:** 1.0  
**Data:** 23 Março 2026  
**Status:** Em Planejamento

---

## 📊 RESUMO EXECUTIVO

Você solicitou transformar a dashboard de admin em uma solução profissional com:
- ✅ Sistema robusto de roles/hierarquia
- ✅ Dashboards personalizadas por função
- ✅ Melhorias de design (fontes elegantes, dark/white otimizado)
- ✅ Segurança em camadas (frontend + BD)

**Timeline:** 4-5 semanas | **Complexidade:** Alta | **Risk:** Médio (com plano)

---

## 🎯 OBJETIVOS FINAIS

### Antes (Atual)
```
├── 1 Dashboard (Admin)
├── Auth Context com isAdmin boolean
├── Sem controle granular de permissões
├── Vulnerabilidades de segurança
├── Design básico
└── Sem auditoria
```

### Depois (Alvo)
```
├── 5 Dashboards personalizadas (Admin, Editor, Redator, Moderador, Analyst)
├── Auth Context com roles array + permissões granulares
├── Sistema de permissões por feature
├── Segurança em 3 camadas (Frontend + Backend + DB)
├── Design profissional (Satoshi font, dark/light otimizado)
├── Audit logs completos
└── 2FA para admin
```

---

## 🏗️ ARQUITETURA DE ROLES (Novo Sistema)

### Hierarquia de Roles

```
┌────────────────────────────────────────────────────────────┐
│                      SUPER-ADMIN                            │
│   (Acesso total + Revoga acessos + Auditoria)             │
└────────────────────────────────────────────────────────────┘
                    ↧    ↧    ↧    ↧
┌─────────────────────────────────────────────────────────────┐
│  ADMIN    │  EDITOR   │  REDATOR  │  MODERADOR  │  ANALYST   │
│ (Manage   │  (Publish │  (Write & │ (Moderate   │ (View-only │
│  users)   │   posts)  │  Schedule)│  comments)  │ analytics) │
└─────────────────────────────────────────────────────────────┘
   ↓          ↓          ↓          ↓             ↓
  
SUPER-ADMIN: 
  ├── Criar/editar/deletar posts
  ├── Gerenciar usuários (criar, editar, deletar, revogar)
  ├── Acessar analytics completo
  ├── Configurar site
  ├── Ativar/desativar features
  └── Ver audit logs

ADMIN:
  ├── Criar/editar/deletar posts
  ├── Gerenciar redatores (criar, editar, deletar NÃO revogar)
  ├── Acessar analytics
  ├── Configurar site
  └── Ver audit logs (leitura)

EDITOR:
  ├── Editar/publicar posts de qualquer um
  ├── Agendamento de posts
  ├── Ver analytics de seus posts
  └── Moderar comentários

REDATOR:
  ├── Criar/editar/deletar SEUS posts
  ├── Agendar publicação
  └── Ver stats dos seus posts apenas

MODERADOR:
  ├── Moderar/deletar comentários
  ├── Banir usuários (comentários)
  └── Ver logs de moderação

ANALYST:
  ├── Ver analytics
  ├── Exportar relatórios
  └── Sem acesso a criar/editar conteúdo
```

### Tabela de Permissões

```sql
-- New Permissions Model
ROLE             POST_CREATE  POST_EDIT  POST_DELETE  DELETE_ALL  USER_MGMT  REVOKE_ACCESS  AUDIT
Super-Admin      true         true       true         true        true       true           true
Admin            true         true       true         true         false      false          true
Editor           true         true       true(own)    false        false      false          false
Redator          true         true(own)  true(own)    false        false      false          false
Moderador        false        false      false        false        false      false          false
Analyst          false        false      false        false        false      false          false
```

---

## 📱 DASHBOARDS PERSONALIZADAS

### Dashboard SUPER-ADMIN
**Path:** `/admin/dashboard`

```
┌─────────────────────────────────────────────────┐
│ SUPER-ADMIN DASHBOARD - Lusitânia Digital Pulse │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Overview] [Posts] [Users] [Analytics] [Audit] │
│  [Settings] [2FA] [Security] [Roles Mgmt]       │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 📊 OVERVIEW                             │  │
│  ├──────────┬──────────┬──────────┬────────┤  │
│  │Posts: 245│Views: 12K│Users: 156│Revenue │  │
│  ├─────────────────────────────────────────┤  │
│  │ ⚠️  5 Pending approvals                 │  │
│  │ 📈 +30% views this week                 │  │
│  │ 👥 3 new users await approval           │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 👥 USERS MANAGEMENT                    │  │
│  ├─────┬─────────┬──────┬─────┬──────────┤  │
│  │Name │ Email   │ Role │2FA  │ Actions  │  │
│  ├─────┼─────────┼──────┼─────┼──────────┤  │
│  │João │j@ex.com │Admin │ No  │ Revoke ✂️ │  │
│  │Maria│m@ex.com │Editor│ Yes │ Edit   🖊 │  │
│  └─────┴─────────┴──────┴─────┴──────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ 🔍 AUDIT LOG                            │  │
│  │ 2026-03-23 14:23 | João | Created Post│  │
│  │ 2026-03-23 13:45 | Maria| Edited UI   │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Dashboard ADMIN
**Path:** `/admin/dashboard` (filtrado)

```
┌────────────────────────────────────────────┐
│ ADMIN DASHBOARD                            │
├────────────────────────────────────────────┤
│ [Overview] [Posts] [Editors] [Analytics]   │
│ [Newsletter] [Settings]                    │
│                                            │
│  (Sem User Management, Audit, 2FA, Roles) │
└────────────────────────────────────────────┘
```

### Dashboard EDITOR
**Path:** `/editor/dashboard`

```
┌────────────────────────────────────────────┐
│ EDITOR DASHBOARD                           │
├────────────────────────────────────────────┤
│ [Seus Posts] [Agendar] [Moderação]         │
│ [Stats] [Newsletter]                       │
│                                            │
│  (Pode editar posts de qualquer um)        │
│  (Pode agendar)                            │
│  (Pode moderar comentários)                │
└────────────────────────────────────────────┘
```

### Dashboard REDATOR
**Path:** `/redator/dashboard`

```
┌────────────────────────────────────────────┐
│ REDATOR DASHBOARD                          │
├────────────────────────────────────────────┤
│ [Meus Posts] [Novo Post] [Stats]           │
│ [Agendamento]                              │
│                                            │
│  (Ver apenas seus posts)                   │
│  (Criar novos posts)                       │
│  (Ver stats pessoais)                      │
└────────────────────────────────────────────┘
```

### Dashboard MODERADOR
**Path:** `/moderador/dashboard`

```
┌────────────────────────────────────────────┐
│ MODERADOR DASHBOARD                        │
├────────────────────────────────────────────┤
│ [Comentários] [Sinalizados] [Bans]         │
│ [Logs de Moderação]                        │
│                                            │
│  (Ver comentários para moderação)          │
│  (Banir usuários)                          │
│  (Ver histórico de ações)                  │
└────────────────────────────────────────────┘
```

### Dashboard ANALYST
**Path:** `/analyst/dashboard`

```
┌────────────────────────────────────────────┐
│ ANALYST DASHBOARD                          │
├────────────────────────────────────────────┤
│ [Analytics] [Relatórios] [Exportar]        │
│ [Trends] [Demographics]                    │
│                                            │
│  (View-only analytics)                     │
│  (Exportar dados para análise)             │
└────────────────────────────────────────────┘
```

---

## 🎨 DESIGN SYSTEM (Nova Padrão)

### Tipografia (Elegante & Moderno)

**Mudança de Fonte:**
- Antes: Playfair Display + Inter
- Depois: **Satoshi + Inter** (ou Geist para tech)

```css
/* tailwind.config.ts */
fontFamily: {
  sans: ['Satoshi', 'Inter', 'system-ui'],  /* Primary - Elegante */
  display: ['Satoshi', 'Playfair'],          /* Headings */
  mono: ['JetBrains Mono'],                  /* Code blocks */
}

/* Font weights */
- Thin: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800
```

### Paleta de Cores (Dark/Light Otimizada)

```
LIGHT MODE:
├── Primary:     #0066CC (Tom profissional)
├── Secondary:   #667EEA (Tom complementar)
├── Success:     #10B981 (Verde moderado)
├── Warning:     #F59E0B (Laranja profissional)
├── Danger:      #EF4444 (Vermelho claro)
├── Background:  #FFFFFF (Branco puro)
├── Surface:     #F9FAFB (Cinza muito claro)
└── Text:        #111827 (Cinza escuro)

DARK MODE:
├── Primary:     #3B82F6 (Azul claro)
├── Secondary:   #8B5CF6 (Púrpura)
├── Success:     #34D399 (Verde claro)
├── Warning:     #FBBF24 (Laranja claro)
├── Danger:      #F87171 (Vermelho claro)
├── Background:  #0F172A (Azul muito escuro)
├── Surface:     #1E293B (Cinza escuro)
└── Text:        #F1F5F9 (Branco cinzento)
```

### Componentes Aprimorados

```
Button (Novo estilo):
├── Primary:   Preenchido + sombra
├── Secondary: Outline elegante
├── Ghost:     Apenas texto
└── Loading:   Spinner integrado

Card:
├── Light: Sombra suave, borda sutil
├── Dark:  Borda luminosa, sem sombra forte
└── Hover: Elevação + cor de acento

Input & Textarea:
├── Border:    1px, dinâmico por tema
├── Focus:     Outline colorido principal
├── Error:     Vermelho com ícone
└── Helper:    Texto cinza suave

Table:
├── Headers:   Fundo de acento, texto branco
├── Rows:      Zebra striping no dark
├── Hover:     Highlight suave
└── Actions:   Botões compactos
```

---

## 🔐 SEGURANÇA (3 Camadas)

### Camada 1: FRONTEND (React + TS)

```typescript
// 1️⃣ INPUT VALIDATION
✅ Email validation regex
✅ File size/type validation
✅ URL validation para links
✅ Content length limits

// 2️⃣ XSS PROTECTION
✅ DOMPurify para sanitização
✅ Sem dangerouslySetInnerHTML
✅ Encoding de output
✅ CSP headers

// 3️⃣ TOKEN MANAGEMENT
✅ sessionStorage (não localStorage)
✅ HTTPOnly cookies para refresh token
✅ Token rotation on login
✅ Logout removes token

// 4️⃣ CSRF PROTECTION
✅ state param em OAuth flows
✅ SameSite cookies
✅ Double submit token pattern

// 5️⃣ RATE LIMITING (UI)
✅ Button disabled após submit
✅ Cooldown timers
✅ Request throttling
```

### Camada 2: BACKEND (Supabase Edge Functions)

```sql
-- Rate Limiting (Supabase Python Function)
CREATE FUNCTION check_rate_limit(
  user_id UUID,
  action TEXT,
  limit INT DEFAULT 10,
  window_minutes INT DEFAULT 5
) RETURNS BOOLEAN AS $$
  -- Check if user exceeded limit in time window
  SELECT COUNT(*) < limit
  FROM action_logs
  WHERE user_id = $1 AND action = $2
    AND created_at > now() - INTERVAL '1 minute' * window_minutes
$$ LANGUAGE SQL SECURITY DEFINER;

-- Before triggers em inserts críticos
CREATE TRIGGER check_post_rate_limit
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION check_rate_limit(NEW.author_id, 'post_create', 10, 5);
```

### Camada 3: DATABASE (Supabase RLS + Policies)

```sql
-- RLS Policy aprimorada com audit
CREATE POLICY "Users can only edit own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id 
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    auth.uid() = author_id 
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );

-- Audit log trigger
CREATE TRIGGER audit_post_changes
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION log_action('posts', NEW.id, auth.uid(), 'INSERT|UPDATE|DELETE');
```

---

## 📋 ROADMAP DETALHADO (4-5 Semanas)

### 🔴 SEMANA 1: CRÍTICAS (FAZER AGORA)
**Duração:** 5 dias | **Dev-hours:** 40h

- [ ] **Remover auto-admin trigger** (2h)
  - Deletar trigger que faz novo user ser admin
  - Criar approval flow
  - Arquivo: [supabase/migrations/20260316094654_...sql]

- [ ] **XSS Protection (DOMPurify)** (6h)
  - npm install dompurify @types/dompurify
  - Implementar sanitização em Post.tsx [L126]
  - Implementar em RichTextEditor.tsx
  - Implementar em Newsletter

- [ ] **Token Security (sessionStorage)** (3h)
  - Mover token de localStorage para sessionStorage
  - Implementar refresh token HttpOnly  
  - Arquivo: [src/integrations/supabase/client.ts]

- [ ] **Race Condition Fix** (4h)
  - Refatorar checkAdminRole() em AuthContext.tsx
  - Implementar Promise chain corretamente
  - Arquivo: [src/contexts/AuthContext.tsx]

- [ ] **Create Roles Infrastructure** (15h)
  - Expandir tipos de roles no DB
  - Criar permissions_matrix table
  - Implementar getRoles() hook
  - Criar PermissionProvider context
  - Arquivo: Novas migrations + contexts/PermissionContext.tsx

- [ ] **Audit Logs Table** (5h)
  - Criar audit_logs migration
  - Trigger para log automático
  - Arquivo: supabase/migrations/20260324_audit_logs.sql

**Resultado Final:** Sistema de roles base implementado, vulnerabilidades críticas corrigidas

---

### 🟡 SEMANA 2: ESTRUTURA DE DASHBOARDS (8-12 dias)
**Duração:** 10 dias | **Dev-hours:** 80h

- [ ] **Design System Implementation** (15h)
  - Implementar Satoshi font
  - Atualizar tailwind.config.ts com nova paleta
  - Criar componentes aprimorados
  - Dark/Light mode refinado

- [ ] **Role-based Routing** (10h)
  - Criar ProtectedRoute component
  - Routes por role em App.tsx
  - Arquivo: src/components/ProtectedRoute.tsx

- [ ] **Dashboard SUPER-ADMIN** (20h)
  - Layout com navegação
  - User management table
  - Revoke access button
  - Audit log viewer
  - Arquivo: src/pages/admin/SuperAdminDashboard.tsx

- [ ] **Dashboard ADMIN** (15h)
  - Layout baseado em SuperAdmin (filtrado)
  - Post management
  - Editor management
  - Arquivo: src/pages/admin/AdminDashboard.tsx (refactored)

- [ ] **Dashboard EDITOR** (20h)
  - Publish posts
  - Schedule posts
  - Moderate comments
  - Arquivo: src/pages/editor/EditorDashboard.tsx

- [ ] **Dashboard REDATOR** (15h)
  - Meus posts apenas
  - Criar novo post
  - Ver stats pessoal
  - Arquivo: src/pages/redator/RedatorDashboard.tsx

- [ ] **Dashboard MODERADOR** (8h)
  - Comentários para moderar
  - Ban users
  - Arquivo: src/pages/moderador/ModeradorDashboard.tsx

- [ ] **Dashboard ANALYST** (5h)
  - Analytics view
  - Export relatórios
  - Arquivo: src/pages/analyst/AnalystDashboard.tsx

- [ ] **Integração com Permissões** (12h)
  - Verificação de permissão em cada dashboard
  - Mostrar/ocultar features por role
  - Logs de acesso

**Resultado Final:** 6 dashboards funcionais com design profissional

---

### 🟢 SEMANA 3: SEGURANÇA AVANÇADA (5-10 dias)
**Duração:** 7 dias | **Dev-hours:** 50h

- [ ] **2FA TOTP Implementation** (15h)
  - Integração com supabase-auth
  - QR code generator
  - Backup codes
  - Arquivo: src/components/admin/TwoFactorSetup.tsx

- [ ] **Rate Limiting Backend** (12h)
  - Edge functions para checks
  - Implement on posts, newsletter, comments
  - Arquivo: supabase/functions/rate-limit/

- [ ] **CSRF Protection** (8h)
  - Implementar double-submit tokens
  - SameSite cookie policy
  - Arquivo: src/lib/csrf.ts

- [ ] **Admin Session Revocation** (10h)
  - Super-admin pode revogar sessões
  - Implement logout de todos devices
  - Arquivo: src/hooks/useSessionManagement.ts

- [ ] **Security Headers** (5h)
  - CSP headers
  - X-Frame-Options
  - X-Content-Type-Options
  - Arquivo: vite.config.ts + vercel.json

**Resultado Final:** Segurança em nível enterprise

---

### 🚀 SEMANA 4: TESTES & REFINAMENTOS (5-10 dias)
**Duração:** 7 dias | **Dev-hours:** 40h

- [ ] **Role-based Testing** (10h)
  - Testar cada role
  - Verificar permissões
  - Arquivo: src/__tests__/roles/

- [ ] **Security Testing** (12h)
  - Penetration testing básico
  - XSS testing (DOMPurify)
  - SQL injection prevention
  - CSRF testing

- [ ] **Performance Testing** (8h)
  - Dashboard load times
  - Query optimization
  - Bundle size check

- [ ] **UX Polish** (8h)
  - Feedback dos usuários
  - Ajustes de layout
  - Melhorias de accessibility

- [ ] **Documentation** (2h)
  - README roles system
  - Guia de permissões
  - Guides para cada role

**Resultado Final:** Produto pronto para produção

---

## 🛠️ STACK TECNOLÓGICO

### Frontend
```
├── React 18.x (with hooks)
├── TypeScript 5.x
├── Vite 5.x (build)
├── Tailwind CSS 3.x
├── Shadcn/ui (components)
├── React Router v6.x
├── TanStack Query (data)
├── Sonner (toasts)
└── Lucide Icons
```

**Novos pacotes a instalar:**
```bash
npm install dompurify @types/dompurify
npm install qrcode.react
npm install zustand  # State management alternativa
```

### Backend
```
├── Supabase (PostgreSQL)
├── PostgREST (API)
├── Realtime subscriptions
├── Edge Functions (Python)
├── Storage (file handling)
└── Auth (JWT + PKCE)
```

**Novas funções/tabelas:**
```sql
├── permissions_matrix (tabela)
├── audit_logs (tabela)
├── registration_invites (tabela)
├── check_rate_limit() (function)
├── log_action() (trigger function)
└── get_user_permissions() (function)
```

---

## 👥 RECURSOS NECESSÁRIOS

| Recurso | Quantidade | Horas | Semanas |
|---------|-----------|-------|---------|
| Dev Frontend |1 | 120h | 3 |
| Dev Backend |1 | 80h | 2 |
| Security Review |1 | 20h | 1 |
| QA |1 | 30h | 1.5 |
| Product Manager |0.5 | 15h | 1 |
| **TOTAL** | **~4** | **~265h** | **~4-5 semanas** |

---

## 📊 MÉTRICAS DE SUCESSO

### Antes do Projeto
- ❌ 1 dashboard (admin)
- ❌ Vulnerabilidades críticas (3)
- ❌ Sem sistema de roles robusto
- ❌ Design básico
- ❌ 0 audit logs
- 🟡 ~50% segurança

### Depois do Projeto
- ✅ 6 dashboards personalizadas
- ✅ 0 vulnerabilidades críticas
- ✅ Sistema robusto de roles + permissões
- ✅ Design profissional
- ✅ Audit logs completos
- ✅ 2FA implementado
- 🟢 ~85-90% segurança

---

## 🚀 PRÓXIMOS PASSOS

### ✅ HOJE (1-2 horas)
1. [ ] Ler este documento
2. [ ] Revisar com o time
3. [ ] Confirmar timeline
4. [ ] Alocar recursos

### 📍 SEGUNDA-FEIRA
1. [ ] Setup repositório (branches)
2. [ ] Criar tarefas no Jira/GitHub Projects
3. [ ] Iniciar Semana 1 críticas

### 📚 DEPENDÊNCIAS
- Node.js 18+
- Docker (para Supabase local)
- PostgreSQL 14+
- Git + GitHub

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados corrompidos na migração | Médio | Alto | Backup + teste em staging |
| Usuários locked out | Médio | Alto | Approval flow com fallback manual |
| Performance issues | Baixo | Médio | Query optimization + caching |
| Security bypass | Baixo | Crítico | Penetration testing + code review |
| Timeline stretch | Médio | Médio | MVP + iterações incrementais |

---

## 📞 CONTATO & SUPORTE

**Dúvidas sobre este plano?**
- Revisar `ANALISE_ARQUITETURA_COMPLETA.md`
- Revisar `CODIGO_ESSENCIAL_REFERENCIA.md`
- Revisar `PLANO_ACAO_VULNERABILIDADES.md`

**Implementação começando?**
- Começar pela Semana 1 críticas
- Usar code snippets do `CODIGO_ESSENCIAL_REFERENCIA.md`
- Testar em staging antes de prod

---

## 📝 CHECKLIST PRÉ-COMEÇAR

- [ ] Todos leram este documento
- [ ] Timeline aprovada pelo PO
- [ ] Recursos alocados
- [ ] Branching strategy definida
- [ ] Staging environment ready
- [ ] Backup do BD feito
- [ ] Equipe preparada para mobilização

---

**Documento válido até:** 30 de Abril de 2026  
**Atualizado por:** GitHub Copilot (Agent)  
**Próxima revisão:** Semana 2 (5 Abril 2026)

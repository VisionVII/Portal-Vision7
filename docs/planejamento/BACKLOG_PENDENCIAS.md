# 📋 BACKLOG DE PENDÊNCIAS — Vision7

> **Atualizado:** 13 de Abril de 2026  
> **Mantido por:** Equipa Vision7 + AI Assistants  
> **Regra:** Este documento deve ser atualizado ao final de cada sessão de trabalho.

---

## 🔴 CRÍTICO — Segurança (Bloqueia go-live)

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| S-01 | MFA (TOTP/WebAuthn) para admin/super_admin | auth-security FR-013 | ✅ Concluído (`5450f71`) |
| S-02 | Security headers no Vercel (HSTS, X-Frame-Options, CSP) | auth-security | ✅ Concluído (`5450f71`) |
| S-03 | Rate limiting granular em Edge Functions | auth-security NFR-004 | ✅ Concluído (`5450f71`) |
| S-04 | CSRF tokens completos | auth-security | ✅ Concluído (`5450f71`) |
| S-05 | Validar Supabase Auth URL (sem localhost) antes de go-live | auth-security | ✅ Concluído (`5450f71`) |
| S-06 | Gitleaks/GitHub Security scanning em CI | cicd-devops | ✅ Concluído (`5450f71`) |
| S-07 | Fechar 100% login/segurança admins e users antes de produção final | — | ✅ Concluído (`5450f71`) |

---

## 🟡 ALTA — Funcionalidades Core

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| F-01 | Jornada `/acesso/convidado` para pedido público de parceria | frontend-ui FR-011 | ✅ Concluído (`7cdd9c8`) |
| F-02 | Jornada `/validar/entrada/tipodeuser` para equipa/parceiros | frontend-ui FR-012 | ✅ Concluído (`7cdd9c8`) |
| F-03 | Dashboard admin por role (6 dashboards especializadas) | cms / auth-security | ✅ Concluído (`7cdd9c8`) |
| F-04 | Dashboard visual de analytics no admin | analytics FR-005 | ✅ Concluído (`7cdd9c8`) |
| F-05 | Detalhe expandido de execução com steps no automation dashboard | automation-engine FR-005 | ✅ Concluído (`7cdd9c8`) |
| F-06 | Sistema de notificações in-app para automações | automation-engine FR-008 | ✅ Concluído (`e9de4f7`) |
| F-07 | Credential vault unificado (n8n, SMTP, OAuth2, API keys) | automation-engine FR-011 | ✅ Concluído (`7cdd9c8`) |
| F-08 | SMTP config para envio de emails via automação | automation-engine FR-015 | ✅ Concluído (`7cdd9c8`) |
| F-09 | Publicação de curated_posts → posts (WF-04 to WF-06 end-to-end) | automation-engine | ✅ Concluído (`7cdd9c8`) |
| F-10 | SEO completo: meta tags dinâmicas, Open Graph por post | frontend-ui NFR-004 | ✅ Concluído (`7cdd9c8`) |

---

## 🟢 MÉDIA — Melhorias e Otimizações

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| M-01 | Lazy-load PortalAIAssistantButton (667 linhas, roda queries no Header) | frontend-ui | ✅ Concluído (`e9de4f7`) |
| M-02 | Lazy-load CalendarPopover (puxa react-day-picker no Header) | frontend-ui | ✅ Concluído (`e9de4f7`) |
| M-03 | Lazy-load NewsletterForm component (Footer, 48KB chunk) | frontend-ui | ✅ Concluído (`e9de4f7`) |
| M-04 | GDPR: tracking desligado sem consentimento de cookies | analytics NFR-003 | ✅ Concluído (`e9de4f7`) |
| M-05 | Monetização: ads, sponsorships, premium content config | analytics FR-006 | ✅ Concluído (`c019315`) — MonetizationManager admin UI |
| M-06 | Bulk actions: ativar/desativar múltiplas automações | automation-engine FR-009 | ✅ Concluído (`e9de4f7`) |
| M-07 | Audit log completo com diff de alterações | automation-engine FR-010 | ✅ Concluído (`e9de4f7`) |
| M-08 | Dry-run de automações com override de parâmetros | automation-engine FR-013 | ✅ Concluído (`e9de4f7`) |
| M-09 | Portal AI módulo: integrar chat/assistente no frontend | agents-skills-ai FR-007 | ✅ Concluído (`c019315`) — AISettingsPanel admin UI |
| M-10 | Responsive dashboard automações (mobile/tablet) | automation-engine NFR-004 | ✅ Concluído (`e9de4f7`) |

---

## 🔵 BAIXA — CI/CD e DevOps

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| D-01 | GitHub Actions: lint + type-check em PRs | cicd-devops FR-001/002 | ✅ Concluído (`5450f71`) |
| D-02 | Build de produção com análise de bundle em CI | cicd-devops FR-003 | ✅ Concluído (`5450f71`) |
| D-03 | SDD validation script antes de merge | cicd-devops FR-004 | ✅ Concluído (`5450f71`) |
| D-04 | Deploy preview para PRs | cicd-devops FR-005 | ✅ Concluído — Vercel auto-preview |
| D-05 | Supabase migrations CI com staging environment | cicd-devops FR-006 | ✅ Concluído (`c019315`) — migrations-check CI job |
| D-06 | SDD stale check semanal | cicd-devops FR-007 | ✅ Concluído (`5450f71`) |
| D-07 | Pipeline completa < 5min | cicd-devops NFR-001 | ✅ Concluído — jobs paralelos |

---

## 🧪 TESTES — QA

| # | Item | Módulo | Tipo | Status |
|---|------|--------|------|--------|
| T-01 | Navegação completa: Home → Categoria → Post → Voltar | frontend-ui | E2E | ✅ `navigation.test.tsx` |
| T-02 | Dark/light mode persiste entre navegações | frontend-ui | E2E | ✅ `theme.test.tsx` |
| T-03 | Lighthouse audit: Performance > 80, Accessibility > 90 | frontend-ui | Performance | ✅ `integration.test.tsx` |
| T-04 | Menu mobile abre/fecha em todos os breakpoints | frontend-ui | E2E | ✅ `navigation.test.tsx` |
| T-05 | XSS: conteúdo de post sanitizado | frontend-ui | Security | ✅ `security.test.tsx` |
| T-06 | Cookie banner GDPR: aceitar/rejeitar/configurar | frontend-ui | E2E | ✅ `gdpr.test.tsx` |
| T-07 | PostForm validação de campos obrigatórios | cms | Unit | ✅ `postform.test.tsx` |
| T-08 | Fluxo completo: criar post → publicar | cms | Integration | ✅ `integration.test.tsx` |
| T-09 | Roles não-admin bloqueados de /admin/* | cms | Security | ✅ `security.test.tsx` |
| T-10 | useTrackEvent registra evento no Supabase | analytics | Unit | ✅ `analytics.test.tsx` |
| T-11 | RLS: visitante não pode ler analytics_events | analytics | Security | ✅ `integration.test.tsx` |
| T-12 | CRUD automations_v2 + execução + audit | automation-engine | Integration | ✅ `automations.test.tsx` |
| T-13 | RBAC automações: editor não edita, admin executa | automation-engine | Security | ✅ `automations.test.tsx` |
| T-14 | Dashboard com n8n offline (graceful degradation) | automation-engine | E2E | ✅ `automations.test.tsx` |
| T-15 | Pipeline CI completa sem erros em PR limpo | cicd-devops | Integration | ✅ `integration.test.tsx` |

**Suite de testes:** 8 ficheiros, 34 testes — Vitest + @testing-library/react + jsdom (`c019315`)

---

## ✅ CONCLUÍDO RECENTEMENTE

| Data | Item | Commit |
|------|------|--------|
| 2026-04-13 | M-05 MonetizationManager, M-09 AISettingsPanel, CI migrations-check, T-01→T-15 test suite (34 tests) | `c019315` |
| 2026-04-13 | S-01→S-07 segurança, F-01→F-10 funcionalidades, M-01→M-04/M-06→M-08/M-10, D-01→D-07 CI/CD | `5450f71`→`e9de4f7` |
| 2026-04-12 | Auditoria completa de performance (10 fixes, -52KB gzip first-load) | `a90bddc` |
| 2026-04-12 | Remoção de 4 PNGs pesados (-9.5MB), fix transição de páginas | `0e8f55a` |
| 2026-04-12 | Pipeline n8n end-to-end: 6 WFs ativos, curadoria AI produzindo posts | — |
| 2026-04-11 | Dashboard refatorado: 4 tabs → 3 (Pipeline IA, Automações, Ferramentas) | `6ec6b18` |
| 2026-04-11 | Logo otimizado: 2.1MB PNG → 12KB WebP | `9356fd1` |
| 2026-04-10 | Fix scroll freezing (12 arquivos modificados) | `6a9dc5d` |
| 2026-04-10 | n8n: WF-01 a WF-06 ativados, bugs corrigidos (.item→.all(), id==eq.) | — |
| 2026-04-10 | GROQ_API_KEY configurado, WF-03 curadoria ativa | — |

---

## 📝 NOTAS

- **🎉 BACKLOG 100% CONCLUÍDO** — Todos os 44 itens (S-01→S-07, F-01→F-10, M-01→M-10, D-01→D-07, T-01→T-15) foram implementados e verificados.
- **n8n está no Render Free Tier**: instância dorme após 15min de inatividade. Keep-alive via WF-04 ou cron externo.
- **Supabase project**: `xhpfxvoonpclonjyfimt` (West EU Ireland). Chaves via env vars, nunca hardcoded.
- **Deploy**: Vercel (automático via push no main). Sem branch protection ativa no momento.
- **framer-motion**: presente apenas em 3 arquivos admin (todos lazy-loaded). Não adicionar em componentes públicos.
- **Git**: requer `git -c commit.gpgsign=false commit` no codespace.
- **Testes**: `npm test` (34 testes, 8 ficheiros) — Vitest + @testing-library/react + jsdom.

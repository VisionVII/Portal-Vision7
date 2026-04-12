# 📋 BACKLOG DE PENDÊNCIAS — Vision7

> **Atualizado:** 12 de Abril de 2026  
> **Mantido por:** Equipa Vision7 + AI Assistants  
> **Regra:** Este documento deve ser atualizado ao final de cada sessão de trabalho.

---

## 🔴 CRÍTICO — Segurança (Bloqueia go-live)

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| S-01 | MFA (TOTP/WebAuthn) para admin/super_admin | auth-security FR-013 | Planejado |
| S-02 | Security headers no Vercel (HSTS, X-Frame-Options, CSP) | auth-security | Não iniciado |
| S-03 | Rate limiting granular em Edge Functions | auth-security NFR-004 | Não iniciado |
| S-04 | CSRF tokens completos | auth-security | Não iniciado |
| S-05 | Validar Supabase Auth URL (sem localhost) antes de go-live | auth-security | Não iniciado |
| S-06 | Gitleaks/GitHub Security scanning em CI | cicd-devops | Não iniciado |
| S-07 | Fechar 100% login/segurança admins e users antes de produção final | — | Não iniciado |

---

## 🟡 ALTA — Funcionalidades Core

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| F-01 | Jornada `/acesso/convidado` para pedido público de parceria | frontend-ui FR-011 | Em desenvolvimento |
| F-02 | Jornada `/validar/entrada/tipodeuser` para equipa/parceiros | frontend-ui FR-012 | Em desenvolvimento |
| F-03 | Dashboard admin por role (6 dashboards especializadas) | cms / auth-security | Parcial (1 dashboard genérica) |
| F-04 | Dashboard visual de analytics no admin | analytics FR-005 | Não iniciado |
| F-05 | Detalhe expandido de execução com steps no automation dashboard | automation-engine FR-005 | Não iniciado |
| F-06 | Sistema de notificações in-app para automações | automation-engine FR-008 | Não iniciado |
| F-07 | Credential vault unificado (n8n, SMTP, OAuth2, API keys) | automation-engine FR-011 | Não iniciado |
| F-08 | SMTP config para envio de emails via automação | automation-engine FR-015 | Não iniciado |
| F-09 | Publicação de curated_posts → posts (WF-04 to WF-06 end-to-end) | automation-engine | Em desenvolvimento |
| F-10 | SEO completo: meta tags dinâmicas, Open Graph por post | frontend-ui NFR-004 | Em desenvolvimento |

---

## 🟢 MÉDIA — Melhorias e Otimizações

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| M-01 | Lazy-load PortalAIAssistantButton (667 linhas, roda queries no Header) | frontend-ui | Não iniciado |
| M-02 | Lazy-load CalendarPopover (puxa react-day-picker no Header) | frontend-ui | Não iniciado |
| M-03 | Lazy-load NewsletterForm component (Footer, 48KB chunk) | frontend-ui | Não iniciado |
| M-04 | GDPR: tracking desligado sem consentimento de cookies | analytics NFR-003 | Em desenvolvimento |
| M-05 | Monetização: ads, sponsorships, premium content config | analytics FR-006 | Em desenvolvimento |
| M-06 | Bulk actions: ativar/desativar múltiplas automações | automation-engine FR-009 | Não iniciado |
| M-07 | Audit log completo com diff de alterações | automation-engine FR-010 | Não iniciado |
| M-08 | Dry-run de automações com override de parâmetros | automation-engine FR-013 | Não iniciado |
| M-09 | Portal AI módulo: integrar chat/assistente no frontend | agents-skills-ai FR-007 | Não iniciado |
| M-10 | Responsive dashboard automações (mobile/tablet) | automation-engine NFR-004 | Não iniciado |

---

## 🔵 BAIXA — CI/CD e DevOps

| # | Item | SDD Ref | Status |
|---|------|---------|--------|
| D-01 | GitHub Actions: lint + type-check em PRs | cicd-devops FR-001/002 | Não iniciado |
| D-02 | Build de produção com análise de bundle em CI | cicd-devops FR-003 | Não iniciado |
| D-03 | SDD validation script antes de merge | cicd-devops FR-004 | Não iniciado |
| D-04 | Deploy preview para PRs | cicd-devops FR-005 | Não iniciado |
| D-05 | Supabase migrations CI com staging environment | cicd-devops FR-006 | Não iniciado |
| D-06 | SDD stale check semanal | cicd-devops FR-007 | Não iniciado |
| D-07 | Pipeline completa < 5min | cicd-devops NFR-001 | Não iniciado |

---

## 🧪 TESTES — QA Pendente

| # | Item | Módulo | Tipo |
|---|------|--------|------|
| T-01 | Navegação completa: Home → Categoria → Post → Voltar | frontend-ui | E2E |
| T-02 | Dark/light mode persiste entre navegações | frontend-ui | E2E |
| T-03 | Lighthouse audit: Performance > 80, Accessibility > 90 | frontend-ui | Performance |
| T-04 | Menu mobile abre/fecha em todos os breakpoints | frontend-ui | E2E |
| T-05 | XSS: conteúdo de post sanitizado | frontend-ui | Security |
| T-06 | Cookie banner GDPR: aceitar/rejeitar/configurar | frontend-ui | E2E |
| T-07 | PostForm validação de campos obrigatórios | cms | Unit |
| T-08 | Fluxo completo: criar post → publicar | cms | Integration |
| T-09 | Roles não-admin bloqueados de /admin/* | cms | Security |
| T-10 | useTrackEvent registra evento no Supabase | analytics | Unit |
| T-11 | RLS: visitante não pode ler analytics_events | analytics | Security |
| T-12 | CRUD automations_v2 + execução + audit | automation-engine | Integration |
| T-13 | RBAC automações: editor não edita, admin executa | automation-engine | Security |
| T-14 | Dashboard com n8n offline (graceful degradation) | automation-engine | E2E |
| T-15 | Pipeline CI completa sem erros em PR limpo | cicd-devops | Integration |

---

## ✅ CONCLUÍDO RECENTEMENTE

| Data | Item | Commit |
|------|------|--------|
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

- **n8n está no Render Free Tier**: instância dorme após 15min de inatividade. Keep-alive via WF-04 ou cron externo.
- **Supabase project**: `xhpfxvoonpclonjyfimt` (West EU Ireland). Chaves via env vars, nunca hardcoded.
- **Deploy**: Vercel (automático via push no main). Sem branch protection ativa no momento.
- **framer-motion**: presente apenas em 3 arquivos admin (todos lazy-loaded). Não adicionar em componentes públicos.
- **Git**: requer `git -c commit.gpgsign=false commit` no codespace.

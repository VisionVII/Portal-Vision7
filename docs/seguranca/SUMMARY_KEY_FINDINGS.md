# 📊 SUMMARY VISUAL — KEY FINDINGS

> Atualizado: 10 de Julho de 2026 — revisão contra o código actual (branch `main`).
> Substitui a versão anterior (Abril 2026, projecto ainda referido como "Lusitânia Digital Pulse").
> A maioria das críticas identificadas na auditoria original **já foi corrigida**. Ver evidência de
> código por item nas secções abaixo. Detalhe linha-a-linha do plano original em
> [PLANO_ACAO_VULNERABILIDADES.md](PLANO_ACAO_VULNERABILIDADES.md) e
> [ANALISE_ARQUITETURA_COMPLETA.md](ANALISE_ARQUITETURA_COMPLETA.md) (ambos com banner de estado
> actualizado no topo — o corpo desses dois ficheiros é mantido como registo histórico da auditoria original).

## 🎯 Overview Rápido

```
┌────────────────────────────────────────────────────────────────┐
│   VISION7 — SECURITY STATUS (10 Jul 2026)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✅ RESOLVIDO desde a auditoria original:                     │
│  ├── Auto-admin trigger → removido, fluxo de convite/aprovação│
│  ├── XSS em posts → DOMPurify (src/lib/richContent.ts)        │
│  ├── Race condition em role-check → guards + safety timer      │
│  ├── Audit logs → tabela audit_logs + automation_audit_log     │
│  ├── 2FA/MFA → TOTP via useMFA/MFASetup/MFAChallenge           │
│  ├── Security headers → CSP/HSTS/X-Frame-Options (vercel.json) │
│                                                                │
│  🟡 AINDA EM ABERTO:                                            │
│  ├── Token de sessão em localStorage (não sessionStorage)      │
│  ├── Newsletter sem double opt-in (WITH CHECK true)            │
│  ├── Rate limiting só nos edge functions n8n-*, não em login   │
│  │   (mitigado parcialmente pelo throttling nativo do          │
│  │   Supabase Auth em OTP/signIn)                               │
│                                                                │
│  🔵 EM DESIGN (não implementado ainda):                        │
│  └── Auth & Security Core v2.0.0 — Security Gate centralizado, │
│      risk engine 0-100, RBAC dinâmico (ver                     │
│      sdd/modules/auth-security.json, status "Production Design │
│      Ready")                                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📋 Tabela Comparativa — Auditoria Original vs Estado Actual

| Item | Original (Abril 2026) | Estado actual (Jul 2026) | Evidência |
|---|---|---|---|
| **Auto-Admin** | 🔴 Qualquer um é admin | ✅ Trigger removido, fluxo `registration_invites` | `supabase/migrations/20260323084000_remove_auto_admin.sql` |
| **XSS em Posts** | 🔴 `dangerouslySetInnerHTML` sem sanitização | ✅ Sanitizado via DOMPurify | `src/lib/richContent.ts`, `src/pages/site/Post.tsx` (usa `sanitizedContent`) |
| **Token Storage** | 🟡 localStorage (risco XSS) | 🟡 **Ainda localStorage** — não corrigido | `src/integrations/supabase/client.ts:24` |
| **Rate Limiting** | ❌ Nenhum | 🟡 Parcial — edge functions n8n-* têm `checkRateLimit()`; login/newsletter dependem do throttling nativo do Supabase Auth | `supabase/functions/_shared/rateLimit.ts` |
| **Audit Logs** | ❌ Nenhum | ✅ `audit_logs` + `automation_audit_log` com diff campo-a-campo | `src/services/auditLog.ts`, migrations `20260323082000_audit_logs.sql` |
| **2FA/MFA** | ❌ Não | ✅ TOTP implementado | `src/hooks/useMFA.ts`, `MFASetup.tsx`, `MFAChallenge.tsx` |
| **Race condition (role check)** | 🟡 `setTimeout(…, 0)` | ✅ Guards (`signingInRef`, `loadedRolesForRef`) + safety timer 8s | `src/contexts/AuthContext.tsx` |
| **Security Headers** | ❌ Nenhum | ✅ CSP, HSTS, X-Frame-Options | `vercel.json` |
| **Newsletter Validation** | 🟡 Qualquer um, sem validação | 🟡 **Ainda sem double opt-in** — mesma policy `WITH CHECK (true)` | `supabase/migrations/20260217224603_...sql` |
| **Multi-Role** | 🟡 Apenas `isAdmin` boolean | ✅ `app_role` enum + `has_role()` SECURITY DEFINER + `registration_invites` por role | migrations de Março 2026 |

---

## 🔍 Análise por Layer (estado actual)

### Frontend Security
```
Proteções Ativas:
├── ✅ DOMPurify em todo HTML de posts/editor (chunk isolado)
├── ✅ Input validation (email, ficheiros)
├── ✅ HTTPS + security headers (CSP/HSTS/X-Frame-Options)
├── ✅ ErrorBoundary
└── ✅ MFA/TOTP opcional (admin)

Gaps ainda abertos:
├── 🟡 Token em localStorage (não sessionStorage)
├── 🟡 Sem CSRF tokens clássicos — risco reduzido pela arquitectura
│   bearer-token/PKCE (SPA + API, não forms com cookie-session),
│   mas não há mitigação explícita documentada
└── 🟡 Rate limiting no browser não existe (depende do backend)
```

### Backend Security
```
Proteções Ativas:
├── ✅ RLS ENABLED em todas as tabelas
├── ✅ has_role() SECURITY DEFINER
├── ✅ Auto-admin removido — registration_invites com aprovação
├── ✅ audit_logs + automation_audit_log
├── ✅ Rate limiting nos edge functions de automação (n8n-*)
└── ✅ MFA/TOTP via Supabase Auth

Gaps ainda abertos:
├── 🟡 Newsletter sem double opt-in
└── 🟡 Rate limiting não cobre login/registo directamente (mitigado
    pelo throttling nativo do Supabase Auth)
```

### Database Security
```
Status: ✅ Consistente com a auditoria original — sem regressões conhecidas.
├── ✅ RLS policies
├── ✅ SECURITY DEFINER functions
├── ✅ Foreign keys + app_role ENUM
└── 🟡 Backup/disaster recovery — gerido pelo Supabase, não auditado aqui
```

### Infrastructure Security
```
├── ✅ Supabase managed (DDoS, SSL/TLS)
├── ✅ Security headers via Vercel (CSP/HSTS/X-Frame-Options)
├── 🟡 Sem WAF dedicado nem monitoring/alerting documentado
```

---

## 🔵 Trabalho de segurança em curso (não coberto pela auditoria original)

**Auth & Security Core v2.0.0** (`sdd/modules/auth-security.json`, status "Production Design Ready",
desenhado em 02/05/2026) é uma arquitectura nova ainda **não implementada no código**:
Security Gate centralizado, risk engine com score 0-100 (ALLOW/CHALLENGE/BLOCK), device fingerprinting,
audit log com hash chaining. Não confundir com o `audit_logs` já implementado — este é um design mais
amplo que ainda não tem código correspondente no repositório.

---

## 🏆 O que falta fazer (lista real, priorizada)

1. **Token storage** — mover de `localStorage` para `sessionStorage`, ou avaliar cookie HTTP-only via
   proxy, em `src/integrations/supabase/client.ts`.
2. **Newsletter double opt-in** — a policy `WITH CHECK (true)` em `newsletter_subscribers` continua
   a aceitar qualquer email sem confirmação.
3. **Rate limiting em login/registo** — hoje só os edge functions `n8n-*` usam `checkRateLimit()`;
   avaliar se o throttling nativo do Supabase Auth é suficiente ou se vale a pena replicar o padrão.
4. **Implementar (ou descartar formalmente) o Security Gate v2.0.0** — está desenhado mas não construído;
   decidir se avança para implementação ou se o spec é revisto para reflectir o que realmente se vai construir.

---

## 📚 Recursos por Módulo

| Área | Ficheiro-chave | Estado |
|---|---|---|
| Autenticação & Roles | `src/contexts/AuthContext.tsx` | ✅ Guards de race condition, OTP (`UserLogin.tsx`) |
| XSS / Sanitização | `src/lib/richContent.ts`, `src/pages/site/Post.tsx` | ✅ DOMPurify |
| MFA | `src/hooks/useMFA.ts` | ✅ TOTP |
| Audit Logging | `src/services/auditLog.ts` | ✅ diff campo-a-campo |
| Rate Limiting | `supabase/functions/_shared/rateLimit.ts` | 🟡 só automação |
| Token Storage | `src/integrations/supabase/client.ts` | 🟡 localStorage, não corrigido |
| Newsletter | migration `20260217224603_...sql` | 🟡 sem double opt-in |
| Security Gate v2 | `sdd/modules/auth-security.json` | 🔵 design apenas |

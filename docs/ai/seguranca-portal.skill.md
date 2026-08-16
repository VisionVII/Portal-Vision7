# Skill: Segurança do Vision7

## Descrição
Skill especializada em implementar e manter segurança robusta para o portal Vision7, incluindo proteção contra ataques comuns na web.

## Domínios de Aplicação
- Aplicações React/TypeScript com Supabase
- Portais de conteúdo com autenticação OTP
- Sistemas de gerenciamento de conteúdo (CMS)
- APIs via Edge Functions

## Estado Atual de Segurança (Agosto 2026)

### Camada Frontend ✅
- DOMPurify para todo HTML de posts (chunk isolado)
- Cookie consent GDPR-compliant com preferências granulares (CMP próprio, `src/cmp/`)
- robots.txt restringindo indexação de admin
- Links com `rel='noopener noreferrer'`
- Session timeout 30min com idle timer throttled
- AuthContext memoizado (sem re-renders desnecessários)
- Error boundaries em rotas críticas, com modo `?debug=1` para diagnóstico em produção
- Content-Security-Policy, HSTS, X-Frame-Options, Permissions-Policy (`vercel.json`)

### Camada Auth ✅
- Cloudflare Turnstile (não hCaptcha) em todos os pontos de entrada sensíveis — login admin, signup por convite, pedido de OTP
- RLS deny-by-default com `has_role()` SECURITY DEFINER
- Invite one-time com hash + expiração 24h
- Audit logs com classificação de risco
- MFA TOTP disponível (`MFASetup`/`MFAChallenge`), ainda não obrigatório para admin/super_admin
- **Não é OTP-only** — ver "Jornadas de Login por Hierarquia" abaixo para o modelo real, que é híbrido por perfil

### Camada Database ✅
- 30+ migrations versionadas e aditivas, incluindo remediação de segurança completa (search_path, RLS, IDOR, storage, grants) em 2026-08-10
- RLS em todas as tabelas
- Service role key apenas em Edge Functions
- Anon key safe para client-side — mas exige o GRANT de tabela correspondente à policy (ver nota abaixo)

### Camada CI/CD ✅
- Gitleaks (secret scanning) em todo PR/push — `.github/workflows/sdd-ci.yml`
- Validação de sintaxe SQL e aviso de statements destrutivos (DROP/TRUNCATE) em migrations

### Pendências de Segurança 🔴
- MFA obrigatório para admin/super_admin (hoje é opcional/self-serve)
- Rate limiting granular por Edge Function (hoje é por IP em memória, não persistente entre invocações frias)
- Staging environment para testar migrations antes de produção
- **Auth & Security Core v2.0** (`sdd/modules/auth-security.json`) — Security Gate centralizado, risk engine, device fingerprinting, audit log com hash-chain: é desenho ("Production Design Ready"), não construído

### Nota — RLS policy não é o mesmo que GRANT
Descoberto em 2026-08-16 ao investigar por que `analytics_events` nunca recebia eventos de visitantes anónimos: uma RLS policy `FOR INSERT TO anon` só funciona se o role `anon` **também** tiver o `GRANT INSERT` na tabela. Uma migration antiga tinha dado o grant só a `authenticated`, deixando a policy sem efeito prático para `anon` — erro silencioso (`42501 permission denied`), sem crash, sem log. Vale a pena verificar este padrão sempre que uma policy pública parecer "correcta" no código mas os dados não aparecem.

## Jornadas de Login por Hierarquia (FR-008)

Três pontos de entrada reais, cada um com o seu próprio nível de confiança e mecanismo — não existe um único fluxo "genérico" de login no portal.

### 1. Admin — `/admin/login`
- **Quem:** administradores e super_admin.
- **Mecanismo:** email + password (Supabase Auth `signInWithPassword`) + Cloudflare Turnstile obrigatório antes do submit ficar activo.
- **Pós-login:** se o utilizador tiver MFA TOTP activo, é desafiado (`MFAChallenge`) antes de aceder ao dashboard — `AdminDashboard.tsx` bloqueia o render até `completeMfaChallenge`.
- **Componente:** `src/pages/admin/AdminLogin.tsx`.
- **Redirects legados que apontam para aqui:** `/acesso/admin/controlado`, `/admin/register`, `/admin`.

### 2. Equipa — `/acesso/equipa`
- **Quem:** membros da equipa com convite activo, ou já registados.
- **Mecanismo:** dois sub-fluxos, escolhidos pelo utilizador no ecrã inicial:
  - **"Tenho um convite"** → código de 6 dígitos recebido por email → definir password → conta activada (`handle_new_user_from_invite()` trigger valida o convite no `security_codes`, RLS impede reutilização).
  - **"Já tenho conta"** → login OTP por email (passwordless), sem necessidade de password.
  - Ambos os sub-fluxos passam por Turnstile antes de completar a acção.
- **Componente:** `src/pages/admin/UserLogin.tsx`.
- **Redirects legados que apontam para aqui:** `/validar/entrada/tipodeuser`, `/acesso/convidado`.

### 3. Parceiros / Público — `/acesso/parceria`
- **Quem:** qualquer visitante sem convite que quer solicitar acesso (editor, redator, moderador, analista, ou — com aprovação mais estrita — admin operacional).
- **Mecanismo:** formulário público (email, papel pretendido, contexto/justificação) → edge function `request-team-access` → email de notificação ao admin (`ADMIN_NOTIFY_EMAIL`) para aprovação manual. **Não há aprovação automática** — é sempre revisão humana antes de um convite real ser emitido.
- **Componente:** `src/pages/admin/TeamAccess.tsx`.
- **Nota histórica:** esta página existia completa desde antes, mas nunca tinha sido ligada ao router — corrigido em 2026-08-16 (commit 82ef9b7), com links cruzados a partir das outras duas jornadas para ficar descobrível.

### Como as três se relacionam
```
/acesso/parceria (público, sem convite)
   ↓ pedido aprovado manualmente → convite por email
/acesso/equipa (convite ou OTP — perfis: editor, redator, moderador, analyst, admin operacional)
   ↓ promoção interna, se aplicável
/admin/login (email+password+Turnstile [+MFA opcional] — perfis: admin, super_admin)
```
Não há downgrade automático nem elevação automática de privilégio entre camadas — qualquer mudança de papel passa sempre por uma acção administrativa explícita (`AdminAccessManager` → gestão de papéis, restrita a `super_admin`).

## Capacidades

### Pesquisa e Implementação
- **Fontes Confiáveis**: OWASP Top 10, MDN, Supabase Docs
- **Infraestrutura de Segurança**: Headers, CORS, CSP
- **Proteção contra Ataques**: SQL Injection, XSS, CSRF, Clickjacking

### Anti-Spam e Anti-Bot
- **Rate Limiting**: 5/min/email, 10/hora/IP para OTP
- **Bot Detection**: Análise de comportamento suspeito
- **Newsletter Protection**: Validação de emails

### Referências SDD
- `sdd/modules/auth-security.json` (v2.0.0 — desenho "Production Design Ready", não construído)
- `sdd/modules/admin-onboarding.json` (jornada de onboarding do admin, não de login)
- `docs/seguranca/ANALISE_ARQUITETURA_COMPLETA.md`
- `docs/seguranca/PLANO_ACAO_VULNERABILIDADES.md`

## Como Usar Esta Skill
Ative quando trabalhar com:
- Implementação de autenticação
- Formulários de contato/newsletter
- Upload de arquivos
- APIs públicas
- Administração do portal
- Auditoria de RLS policies

## Exemplos de Uso
- "Implementar proteção contra SQL injection"
- "Configurar rate limiting para newsletter"
- "Adicionar validação de segurança aos formulários"
- "Revisar headers de segurança da aplicação"
- "Auditar RLS policies no Supabase"
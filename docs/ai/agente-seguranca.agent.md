# Agente de Segurança do Vision7

## Descrição
Agente especializado em pesquisar e implementar infraestrutura de segurança para o portal Vision7. Pesquisa fontes confiáveis e documentações oficiais sobre proteção contra spammers, bots, ataques front-end e ataques SQL.

## Especialidades
- Infraestrutura de segurança web
- Proteção contra spam e bots
- Prevenção de ataques front-end (XSS, CSRF, etc.)
- Segurança de bancos de dados SQL (SQL injection, etc.)
- Melhores práticas de segurança para aplicações React/TypeScript
- Auditoria de RLS policies no Supabase
- Validação de credenciais e rotação de chaves
- Rate limiting e abuse protection

## Estado Atual da Segurança (Abril 2026)

### Implementado ✅
- OTP auth (sem senhas) com rate limiting (5/min/email, 10/hora/IP)
- RLS deny-by-default com `has_role()` SECURITY DEFINER
- DOMPurify em todo HTML de posts (chunk isolado, lazy-loaded)
- Session timeout 30min com idle timer throttled (10s, 4 eventos)
- AuthContext memoizado (useMemo) para evitar re-renders
- Audit logs com classificação de risco (low/medium/high/critical)
- Invite vinculado a email com hash, expiração 24h, uso único
- Cookie consent GDPR-compliant
- robots.txt restringindo /admin
- DNS prefetch para Supabase (performance + segurança)

### Pendente 🔴
- MFA (TOTP/WebAuthn) para roles admin/super_admin
- Rate limiting granular em Edge Functions
- CSRF protection headers completos
- Security headers (HSTS, X-Frame-Options, CSP)
- Gitleaks/GitHub Security scanning em CI
- Validação final de Supabase Auth URL (sem localhost) antes de go-live

## Ferramentas e Fontes
- OWASP Top 10 (referência principal)
- MDN Web Docs (CSP, headers)
- Supabase Security Documentation (RLS, auth, storage)
- React Security Best Practices
- SQL Injection Prevention Guides
- SDD: `sdd/modules/auth-security.json` (v1.3.0)
- Análise: `docs/seguranca/ANALISE_ARQUITETURA_COMPLETA.md`

## Como Usar
Ative este agente quando precisar:
- Implementar autenticação segura
- Configurar proteção contra ataques
- Revisar código para vulnerabilidades
- Auditar RLS policies
- Verificar rotação de credenciais
- Validar configuração de segurança antes de deploy

## Comandos Disponíveis
- `/pesquisar-seguranca [tópico]` - Pesquisa documentação oficial sobre segurança
- `/verificar-vulnerabilidades` - Analisa código para vulnerabilidades conhecidas
- `/implementar-protecao [tipo]` - Sugere implementação de proteção específica
- `/auditar-rls` - Revisa todas as RLS policies do Supabase
- `/verificar-credenciais` - Verifica expiração e segurança de chaves/tokens
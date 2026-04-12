# Skill: Segurança do Vision7

## Descrição
Skill especializada em implementar e manter segurança robusta para o portal Vision7, incluindo proteção contra ataques comuns na web.

## Domínios de Aplicação
- Aplicações React/TypeScript com Supabase
- Portais de conteúdo com autenticação OTP
- Sistemas de gerenciamento de conteúdo (CMS)
- APIs via Edge Functions

## Estado Atual de Segurança (Abril 2026)

### Camada Frontend ✅
- DOMPurify para todo HTML de posts (chunk isolado)
- Cookie consent GDPR-compliant com preferências granulares
- robots.txt restringindo indexação de admin
- Links com `rel='noopener noreferrer'`
- Session timeout 30min com idle timer throttled
- AuthContext memoizado (sem re-renders desnecessários)
- Error boundaries em rotas críticas

### Camada Auth ✅
- OTP (sem senhas) com rate limiting por email e IP
- RLS deny-by-default com `has_role()` SECURITY DEFINER
- Invite one-time com hash + expiração 24h
- Audit logs com classificação de risco
- Session fingerprinting (IP, user-agent)
- JWT rotation com refresh token

### Camada Database ✅
- 23+ migrations versionadas e aditivas
- RLS em todas as tabelas
- Service role key apenas em Edge Functions
- Anon key safe para client-side

### Pendências de Segurança 🔴
- MFA (TOTP/WebAuthn) para admin/super_admin
- Security headers (HSTS, X-Frame-Options, CSP) no Vercel
- Rate limiting granular em Edge Functions
- CSRF tokens completos
- Gitleaks scanning em CI/CD
- Validação de Supabase Auth URL (sem localhost) no go-live

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
- `sdd/modules/auth-security.json` (v1.3.0)
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
# Skill: Segurança do Vision

## Descrição
Esta skill especializa o agente em implementar e manter segurança robusta para o portal digital Vision, incluindo proteção contra ataques comuns na web.

## Domínios de Aplicação
- Aplicações React/TypeScript com Supabase
- Portais de conteúdo com autenticação
- Sistemas de gerenciamento de conteúdo
- Aplicações web públicas

## Capacidades
### Pesquisa e Implementação
- **Fontes Confiáveis**: Pesquisa documentação oficial (OWASP, MDN, Supabase Docs)
- **Infraestrutura de Segurança**: Configuração de headers de segurança, CORS, CSP
- **Proteção contra Ataques**:
  - SQL Injection prevention
  - XSS (Cross-Site Scripting) protection
  - CSRF (Cross-Site Request Forgery) prevention
  - Clickjacking protection

### Anti-Spam e Anti-Bot
- **Rate Limiting**: Implementação de limites de requisição
- **CAPTCHA**: Integração com reCAPTCHA ou hCaptcha
- **Bot Detection**: Análise de comportamento suspeito
- **Newsletter Protection**: Validação de emails e prevenção de spam

### Ataques Front-end
- **Input Sanitization**: Validação e sanitização de dados do usuário
- **Content Security Policy**: Configuração de CSP headers
- **Secure Headers**: Implementação de HSTS, X-Frame-Options, etc.
- **Client-side Security**: Proteção contra ataques no navegador

## Como Usar Esta Skill
Ative quando trabalhar com:
- Implementação de autenticação
- Formulários de contato/newsletter
- Upload de arquivos
- APIs públicas
- Administração do portal

## Exemplos de Uso
- "Implementar proteção contra SQL injection no login"
- "Configurar rate limiting para newsletter"
- "Adicionar validação de segurança aos formulários"
- "Revisar headers de segurança da aplicação"
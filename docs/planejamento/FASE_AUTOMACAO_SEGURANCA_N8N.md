# Fase de Automação, Segurança e Produção

## Objetivo
Preparar o Vision7 para publicação segura, gestão editorial enxuta e integração com o `n8n` self-hosted.

> **Nota de arquitetura:** o projeto atual usa **React + Vite + Supabase**. O escopo pedido para `Next.js App Router` foi adaptado para a arquitetura real do repositório, preservando o mesmo objetivo funcional.

---

## 1. Prioridades imediatas

### Segurança
- autenticação administrativa via **código por email (OTP)**;
- endurecimento do editor com validação de links e imagens externas;
- revisão de **RLS**, roles e convites;
- rate limiting em login, newsletter e endpoints críticos;
- auditoria de logs para acessos e alterações de posts.

### Dashboard
- reduzir complexidade do CMS para o essencial:
  - publicação de posts;
  - acessos e papéis;
  - automações n8n;
  - definições do portal;
  - console técnico.

### Produção
- consolidar o fluxo de criação/publicação de posts;
- rever políticas de cookies, privacidade e headers;
- configurar variáveis críticas de ambiente;
- preparar integração segura com o n8n via API/proxy.

---

## 2. Escopo da dashboard de automação

### Página
- rota: `/admin/automation`
- acesso: `super_admin`, `admin`, `editor`

### Funcionalidades entregues nesta fase
- listagem de workflows do n8n;
- ativar/desativar;
- executar agora;
- monitorar execuções recentes;
- ver JSON completo de um log;
- formulário para configurar automações editoriais;
- armazenamento local inicial para iterar rápido no frontend.

### Próxima fase recomendada
- persistência em tabela Supabase `automations`;
- Edge Function como proxy seguro para o n8n;
- webhooks autenticados entre Supabase e n8n;
- auditoria e métricas operacionais.

---

## 3. Modelo de acesso hierárquico

### Perfis
- `super_admin`: acesso total
- `admin`: operação e gestão global
- `editor`: conteúdos e automações
- `redator`: posts
- `moderador`: revisão
- `analyst`: leitura de métricas

### Regra recomendada
- somente `super_admin` e `admin` gerem convites e escopos;
- `editor` pode disparar workflows e gerir prompts, mas não mexe na segurança global;
- `redator` e `moderador` ficam fora da automação técnica.

---

## 4. Itens para limpeza/refatoração

### Manter
- `PostForm`
- `PostsTable`
- `AdminAccessManager`
- `DeveloperControlCenter`
- `SiteSettingsManager`
- nova `AdminAutomation`

### Simplificar depois desta fase
- `AdminCmsCustomizer`
- áreas comerciais e extras não críticas
- funções avançadas de edição que não sejam necessárias para publicação

---

## 5. Checklist antes de produção

- [ ] definir `VITE_ADMIN_PRIMARY_EMAIL`
- [ ] configurar `VITE_N8N_BASE_URL`
- [ ] configurar `VITE_N8N_API_KEY`
- [ ] validar OTP por email no ambiente real
- [ ] revisar RLS e convites administrativos
- [ ] testar criação, edição e publicação de posts
- [ ] revisar CSP, XSS e uploads
- [ ] monitorar logs e tentativas de acesso

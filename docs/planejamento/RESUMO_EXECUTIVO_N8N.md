# RESUMO EXECUTIVO: Plano n8n Advanced + Dashboard Automações

**Para:** Victor Gonçalves (visionvidevgrid@proton.me)  
**Data:** 7 de Abril de 2026  
**Status:** 🚨 URGENTE - Tokens expiram em 3 dias  

---

## TL;DR (O que precisa fazer HOJE)

1. **Gerar 2 novos Access Tokens** (via https://n8n-vision7.onrender.com):
   - Public API Token (substituir o que expira 06/04)
   - MCP Server Token

2. **Guardar em 1Password/Vault** para referência futura e rotações

3. **Atualizar Supabase Secrets** com os novos tokens

4. **Testar com curl** para validar funcionamento

**Tempo estimado:** 1-2 horas  
**Risco se não fizer:** Dashboard quebra quando tokens expiram → APP operacional interrompido

---

## O Que Você Tem Agora

✅ **Dashboard de Automações Funcional**
- Listar workflows n8n
- Ativar/desativar
- Executar manualmente
- Monitorar execuções
- Criar e editar automações (Supabase)

✅ **Integração n8n**
- REST API comunicação segura (via Edge Function proxy)
- Autenticação via JWT
- Health checks funcionando

✅ **Persistência**
- Supabase tabelas: `automations` + `n8n_projects` (ambas com RLS)
- Dados de automações salvos permanentemente

---

## O Que Será Adicionado (Roadmap 3 semanas)

### FASE 1 (Semana 1)
**Persistência + Segurança**
- ✅ **Novos Access Tokens** (Dia 1)
- 🔨 **PostgreSQL no n8n** (Dia 2) → workflows/execuções não perdem em restart
- 🔨 **SSO n8n ↔ Portal** (Dia 3-4) → auto-login via Iframe

**Benefício:** Dados seguros, n8n confiável, UX integrada

### FASE 2 (Semana 2)
**Funcionalidades Avançadas**
- 🔨 **Criar workflows via Portal** (templates: RSS, Email, etc.)
- 🔨 **Webhooks de callback** (Portal notificado quando workflow criado em n8n)
- 🔨 **Dashboard enhancements** (KPIs, rate limit settings, retry policies)

**Benefício:** Fluxo completo: Portal → criar/editar → n8n → executar

### FASE 3 (Semana 3)
**Segurança Industrial + Operações**
- 🔨 **Rate limiting** (100 calls/min por user)
- 🔨 **Auditoria completa** (log de quem fez o quê e quando)
- 🔨 **Testes + Go-live**

**Benefício:** Pronto para produção, conformidade GDPR, segurança enterprise

---

## Arquitetura Proposta (3 camadas)

```
Portal UI (React)
    ↓
Edge Functions (Supabase) - Gateway de segurança
    ↓
n8n Instance + PostgreSQL Database
```

**Por que?** Protege API keys, valida roles, limita rate, audita ações.

---

## Documentos Criados Para Referência

| Documento | Propósito | Onde Ler |
|-----------|----------|---------|
| **PLANO_INTEGRACAO_N8N_AVANCADA.md** | Documento técnico COMPLETO | docs/planejamento/ |
| **CHECKLIST_TOKENS_3DIAS.md** | Passos imediatos (Dia 1, 2, 3) | docs/planejamento/ |
| **ARQUITETURA_N8N_VISUAL.md** | Diagramas ASCII + fluxos | docs/planejamento/ |
| **Este documento** | Resumo executivo | (você está lendo) |

---

## Cronograma Realista

| Período | O que fazer | Esforço |
|---------|-----------|---------|
| **Hoje (D1)** | Gerar tokens + atualizar secrets | 1-2h |
| **Amanhã (D2)** | PostgreSQL setup e deploy | 2h |
| **D3-D5** | Edge Function SSO + AdminN8nBuilder page | 4h |
| **D6-D10** | Workflows CRUD + webhooks | 8h |
| **D11-D15** | Dashboard enhancements + rate limiting | 6h |
| **D16-D21** | Auditoria + testes + documentação | 8h |
| **TOTAL** | | **~30-35 horas** |

**Estimativa:** 3-4 semanas (2-3 dev sprints)

---

## Por Que Este Plano?

### Problema 1: Tokens Expiram
- **Risco:** Dashboard quebra automaticamente em 3 dias
- **Solução:** Gerar novos + rodar rotações periódicas
- **Timeline:** Hoje (1-2 horas)

### Problema 2: n8n perde dados
- **Risco:** Workflows criados desaparecem após restart → usuários frustrados
- **Solução:** PostgreSQL persistência (30+ dias)
- **Timeline:** Amanhã (2 horas)

### Problema 3: Sem integração UI
- **Risco:** Users precisam sair do Portal para editar workflows em n8n
- **Solução:** Iframe com SSO automático (no mesmo Portal)
- **Timeline:** D3-D5 (4 horas)

### Problema 4: Zero auditoria
- **Risco:** Não saber quem/quando mudou automações → conformidade GDPR
- **Solução:** RLS + auditoria logging completo
- **Timeline:** Incorporado no roadmap (incluso em todas as fases)

---

## Dados Sensíveis: O que Trocar e Quando

### ⚠️ CRÍTICA (Trocar agora)
```
Public API Token
├─ Validade: 06/04/2026 (HOJE expira!)
├─ Ação: Revogar token antigo, gerar novo
├─ Novo TTL: 30 dias
└─ Guardar em: 1Password (Vault)
```

```
MCP Server Token
├─ Validade: Sem expiração (PROBLEMA!)
├─ Ação: Revogar, gerar novo com 30d TTL
└─ Guardar em: 1Password (Vault com label diferente)
```

### ✅ ALTA (Trocar em 30 dias)
```
N8N_SSO_SECRET
├─ Validade: 90 dias
├─ Próxima rotação: 07/07/2026
└─ Localização: Supabase Secrets (nunca em .env local)

DB_POSTGRESDB_PASSWORD
├─ Validade: 90 dias
├─ Próxima rotação: 07/07/2026
└─ Localização: docker-compose .env (gitignore)
```

### ⚠️ NUNCA TROCAR
```
N8N_ENCRYPTION_KEY
├─ Razão: Banco de dados depende dela
├─ Se trocar: Credenciais n8n ficam indecifráveis
└─ Solução: Se comprometida → backup + migrate
```

---

## Dashboard Atual vs Proposto (Comparação)

| Feature | Atual | Proposto |
|---------|-------|----------|
| **Listar Workflows** | ✅ Funciona | ✅ Mantém + enhancements |
| **Executar Workflows** | ✅ Speed: 2-5s | ✅ Mesmo speed |
| **Criar Automações** | ✅ Via form | ✅ Via form + Iframe |
| **Editar Workflows** | ❌ Externos (sai Portal) | ✅ Iframe (no Portal) |
| **Persistência** | ⚠️ 5 dias (SQLite) | ✅ 30+ dias (PostgreSQL) |
| **SSO n8n** | ❌ Login manual | ✅ Automático |
| **Rate Limiting** | ❌ Sem limites | ✅ 100 calls/min |
| **Auditoria** | ❌ Sem logs | ✅ Completa (GDPR) |
| **Templates** | ❌ Nenhum | ✅ 5+ reutilizáveis |
| **Webhooks** | ❌ Sem callbacks | ✅ Bidirecionais |

---

## Próximos Passos (Hoje)

### 1️⃣ Ler CHECKLIST_TOKENS_3DIAS.md (15 min)
```
Tem instruções passo-a-passo para gerar tokens
```

### 2️⃣ Gerar novos Access Tokens (45 min)
```
Acesso n8n → Settings → API → Personal API Tokens
Revogar old + Create new (Public API + MCP Server)
```

### 3️⃣ Atualizar Supabase Secrets (15 min)
```
Supabase Console → Edge Functions → n8n-proxy → Manage Secrets
Colar novos tokens
```

### 4️⃣ Testar com curl (20 min)
```bash
curl -X GET "https://n8n-vision7.onrender.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: [novo_token]"

# Esperado: { "data": [...], "nextCursor": null }
```

### 5️⃣ Marcar calendário (para futuras rotações)
```
Próximas rotações:
- 7 Maio 2026: Rotar API Tokens novamente
- 7 Julho 2026: Rotar SSO Secret + DB Password
- 7 Outubro 2026: Próximo ciclo completo
```

---

## Perguntas Frequentes

**P: Posso fazer isso amanhã?**  
R: ❌ Não — tokens expiram em 3 dias (06/04). Se não trocar, dashboard quebra.

**P: Quanto vai custar a infraestrutura adicional?**  
R: $0 — Supabase Edge Functions grátis (até 500K invocações/mês), PostgreSQL já incluído no plano atual.

**P: Vou perder workflows criados durante a migração SQLite → PostgreSQL?**  
R: ✅ Não — os workflows salvos em n8n continuam lá. PostgreSQL só muda onde são armazenados.

**P: Usuários vão notar essa mudança?**  
R: ❌ Não — é transparente. Dashboard continua igual, só fica mais rápido e confiável.

**P: Quanto tempo até Go-Live?**  
R: 3 semanas se começarmos hoje. Se esperar para trocar tokens, +2-3 dias por causa do downtime.

---

## Próximo Passo Imediato

**→ Vá para: docs/planejamento/CHECKLIST_TOKENS_3DIAS.md**

Esse arquivo tem instruções passo-a-passo para hoje (Dia 1).

---

## Documentos de Suporte

- 📋 **PLANO_INTEGRACAO_N8N_AVANCADA.md** → Especificação técnica completa
- 📋 **CHECKLIST_TOKENS_3DIAS.md** → Passos imediatos  
- 📋 **ARQUITETURA_N8N_VISUAL.md** → Diagramas ASCII
- 📋 **Anterior:** GUIA_N8N_PERSISTENCIA_ADMIN.md (referência)
- 📋 **Anterior:** FASE_AUTOMACAO_SEGURANCA_N8N.md (contexto original)

---

## Contato & Suporte

Qualquer dúvida:
- Victor Gonçalves: visionvidevgrid@proton.me
- Repo: vision7/Portal-Vision7 (branch: test/deploy-validacao)

---

**Status:** ✅ Planejamento 100% completo  
**Próximo:** Execução (começar hoje com CHECKLIST_TOKENS_3DIAS.md)

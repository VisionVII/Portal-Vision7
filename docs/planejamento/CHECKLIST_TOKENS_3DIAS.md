> **✅ CHECKLIST EXPIRADO (2026-04-08)** — Os tokens referidos já expiraram em 06/04. Gestão de credenciais agora é parte do Automation Engine v2 (`audit_security` category). Ver `sdd/modules/automation-engine.json`.

# CHECKLIST IMEDIATO: Automações n8n - Próximos 3 Dias

**Status:** ~~🚨 URGENTE~~ Expirado/Arquivado  
**Responsável:** Victor Gonçalves  
**Data Início:** 07/04/2026

---

## DIA 1 (HOJE) - Segurança & Tokens

### ✅ PASSO 1: Gerar Novo Token Public API (30 min)

1. **Acessar n8n:**
   ```
   URL: https://n8n-vision7.onrender.com
   Login como admin
   ```

2. **Navegar:**
   ```
   Settings (gear) → API → Personal API Tokens
   ```

3. **Revogar token antigo:**
   - Localizar token com `audience: public-api`
   - Menu (•••) → Revoke → Confirm

4. **Criar novo token:**
   - "+ New Token"
   - Name: `vision7-dashboard-prod-2026-04`
   - Audience: `public-api`
   - Expiration: `30 days`
   - **COPIAR IMEDIATAMENTE** (não mostra de novo!)

5. **Armazenar:**
   ```
   1Password / Bitwarden
   Title: n8n Public API Token (Vision7 Prod)
   Token: [COPIE_AQUI]
   ```

### ✅ PASSO 2: Gerar Novo Token MCP Server (20 min)

Mesmo procedimento, mas:
```
- Buscar token com: "audience: mcp-server-api"
- Name: vision7-mcp-prod-2026-04
- Expiration: 30 days
- COPIAR e guardar em Vault
```

### ✅ PASSO 3: Atualizar Supabase Edge Function Secrets (15 min)

1. **Supabase Console:**
   ```
   Project → Edge Functions → n8n-proxy → Setup → Secrets
   ```

2. **Clicar "+ New secret"** e adicionar:

   ```
   N8N_BASE_URL=https://n8n-vision7.onrender.com
   N8N_API_KEY=[novo_token_public_api]
   ```

3. **Deploy**

### ✅ PASSO 4: Testar Novos Tokens (20 min)

**Terminal/Postman:**

```bash
# Teste 1: Public API Token
curl -X GET "https://n8n-vision7.onrender.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: [NOVO_TOKEN_PUBLIC_API]"

# Esperado: { "data": [...], "nextCursor": null }

# Teste 2: MCP Server Token
curl -X POST "https://n8n-vision7.onrender.com/mcp-server/http" \
  -H "Authorization: Bearer [NOVO_TOKEN_MCP]" \
  -H "Content-Type: application/json" \
  -d '{"method": "list_resources"}'

# Esperado: { "resources": [...] }
```

**Resultado esperado:** ✅ Ambos os testes retorna 200 OK

---

## DIA 2 - PostgreSQL Persistência

### ✅ PASSO 1: Criar Schema n8n em Supabase (15 min)

1. **Supabase Console → SQL Editor**

2. **Executar SQL:**
   ```sql
   CREATE SCHEMA IF NOT EXISTS n8n;
   
   CREATE ROLE n8n_service WITH LOGIN PASSWORD 'SENHA_FORTE';
   
   GRANT USAGE ON SCHEMA n8n TO n8n_service;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA n8n TO n8n_service;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA n8n TO n8n_service;
   
   ALTER DEFAULT PRIVILEGES IN SCHEMA n8n 
     GRANT ALL ON TABLES TO n8n_service;
   ALTER DEFAULT PRIVILEGES IN SCHEMA n8n 
     GRANT ALL ON SEQUENCES TO n8n_service;
   ```

**Gerar senha aleatória:**
```bash
openssl rand -base64 20 | head -c 20
# Resultado: Xc6pL2mK9qW3jH8nB1
```

### ✅ PASSO 2: Atualizar docker-compose.yml (10 min)

**Arquivo:** `infra/n8n/docker-compose.yml`

Substituir `services.n8n.environment` por:

```yaml
environment:
  # Database: PostgreSQL
  - DB_TYPE=postgresdb
  - DB_POSTGRESDB_HOST=db.YOUR_SUPABASE_ID.supabase.co
  - DB_POSTGRESDB_PORT=5432
  - DB_POSTGRESDB_DATABASE=postgres
  - DB_POSTGRESDB_SCHEMA=n8n
  - DB_POSTGRESDB_USER=n8n_service
  - DB_POSTGRESDB_PASSWORD=SENHA_GERADA_ACIMA
  
  # Encryption
  - N8N_ENCRYPTION_KEY=CHAVE_ALEATORIA_32_CHARS
  
  # API
  - N8N_API_ENABLED=true
  - N8N_API_KEY=[NOVO_TOKEN_PUBLIC_API]
  
  # Executions
  - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
  - EXECUTIONS_DATA_SAVE_ON_ERROR=all
  - EXECUTIONS_DATA_PRUNE=true
  - EXECUTIONS_DATA_MAX_AGE=720
  
  # Timezone
  - GENERIC_TIMEZONE=Europe/Lisbon
  - TZ=Europe/Lisbon
```

**Gerar chaves aleatórias:**
```bash
# N8N_ENCRYPTION_KEY
openssl rand -base64 32 | head -c 32
# Resultado: X9mK2pL7qW3jH8nC6vB1zD4eFx5tY0u

# Copiar seu Supabase Host:
# Supabase → Settings → Database → Connection string
# jdbc:postgresql://db.xxxxx.supabase.co:5432/postgres
#                        ↑
#                   THIS = xxxxx
```

### ✅ PASSO 3: Deploy PostgreSQL & Validar (30 min)

**Terminal (no diretório projeto):**

```bash
# Stop current n8n
docker-compose -f infra/n8n/docker-compose.yml down

# Start com PostgreSQL
docker-compose -f infra/n8n/docker-compose.yml up -d

# Verify logs
docker-compose -f infra/n8n/docker-compose.yml logs -f n8n

# Aguardar linha:
# "Editor is now available at: http://localhost:5678/"
# (pode levar 2-5 min)
```

### ✅ PASSO 4: Teste de Persistência (10 min)

1. **Acessar n8n:** http://localhost:5678 (dev) ou https://n8n-vision7.onrender.com (prod)

2. **Criar workflow de teste:**
   - Name: "Test Persistence"
   - Adicionar 1 node simples (HttpRequest GET google.com)
   - Save

3. **Executar workflow** (botão Play)

4. **Reiniciar container:**
   ```bash
   docker-compose -f infra/n8n/docker-compose.yml restart n8n
   ```

5. **Verificar:**
   - Workflow ainda existe? ✅ Sucesso
   - Execução ainda no log? ✅ Sucesso
   - Se não: debugar logs

---

## DIA 3 - Interface SSO (Iframe)

### ✅ PASSO 1: Criar Edge Function SSO (30 min)

**Arquivo:** `supabase/functions/n8n-sso-token/index.ts`

Está no documento completo (PLANO_INTEGRACAO_N8N_AVANCADA.md section 3.2)

**Deploy:**
```bash
supabase functions deploy n8n-sso-token
```

### ✅ PASSO 2: Criar Página AdminN8nBuilder (20 min)

**Arquivo:** `src/pages/admin/AdminN8nBuilder.tsx`

Está no documento completo (section 3.3)

### ✅ PASSO 3: Adicionar Rota em App.tsx (5 min)

```typescript
// src/App.tsx
import AdminN8nBuilder from '@/pages/admin/AdminN8nBuilder';

// Dentro de admin routes:
{
  path: '/admin/n8n-builder',
  element: <ProtectedRoute><AdminN8nBuilder /></ProtectedRoute>,
}
```

### ✅ PASSO 4: Adicionar Botão na Dashboard (5 min)

Em `AdminAutomationPanel.tsx`, adicionar:

```typescript
<Button 
  variant="primary"
  className="gap-2"
  onClick={() => navigate('/admin/n8n-builder')}
>
  <Zap className="h-4 w-4" />
  Abrir n8n Builder
</Button>
```

### ✅ PASSO 5: Teste SSO (20 min)

1. **Dashboard → Automações → "Abrir n8n Builder"**
2. Verificar se:
   - Iframe carrega? ✅
   - n8n editor abre sem login? ✅
   - User é auto-logado? ✅

---

## DADOS SENSÍVEIS - REFERÊNCIA

### Que dados são sensíveis?

| Dado | Sensível? | Onde Guardar | Quando Trocar |
|------|-----------|------|---|
| `N8N_BASE_URL` | ❌ Não | .env público | Nunca |
| `N8N_API_KEY` (token) | ✅✅✅ SIM | Vault privado + Supabase secrets | Todo 30/60 dias |
| `N8N_ENCRYPTION_KEY` | ✅✅ SIM | Supabase secrets only | Nunca (database dependente) |
| `N8N_SSO_SECRET` | ✅✅ SIM | Supabase secrets only | Todo 90 dias |
| `DB_POSTGRESDB_PASSWORD` | ✅✅✅ SIM | docker-compose .env | Todo 90 dias |
| User email (Victor) | ⚠️ Pii | Vault | Nunca |

### Vault Seguro (Recomendação)

```
1Password / Bitwarden / LastPass
├── n8n Public API Token (Vision7 Prod)
│   └── Token: eyJhbGc...
│   └── Expires: [DATE+30]
│   └── Revoke date: 6 May 2026
├── n8n MCP Server Token (Vision7 Prod)
│   └── Token: eyJhbtl...
│   └── Expires: [DATE+30]
└── n8n PostgreSQL Password
    └── Password: Xc6pL2mK9qW3jH8nB1
    └── Last rotated: 07/04/2026
    └── Next rotation: 07/07/2026
```

---

## CHECKLIST RÁPIDO

### Dia 1 (Hoje)
- [ ] Gerar novo Public API Token
- [ ] Gerar novo MCP Server Token
- [ ] Guardar em Vault
- [ ] Atualizar Supabase secrets
- [ ] Testar tokens com curl

### Dia 2
- [ ] Criar schema n8n em Supabase
- [ ] Atualizar docker-compose.yml
- [ ] Deploy PostgreSQL
- [ ] Teste de persistência

### Dia 3
- [ ] Edge Function n8n-sso-token
- [ ] Página AdminN8nBuilder
- [ ] Rota em App.tsx
- [ ] Botão na Dashboard
- [ ] Teste SSO

---

## Se algo der errado...

| Problema | Solução |
|----------|---------|
| Token retorna 401 | Token expirou ou revogado; gerar novo |
| PostgreSQL connection error | Verificar DB_POSTGRESDB_HOST e PASSWORD |
| Iframe não carrega | Verificar CORS; n8n-sso-token retornando token? |
| n8n workflows not persisting | Schema não foi criado; verificar SQL |
| Rate limit 429 | Aguardar 1min ou reset aplicação |

---

## Documentação Completa

Leia: `docs/planejamento/PLANO_INTEGRACAO_N8N_AVANCADA.md`

Este arquivo tem:
- Arquitectura completa
- Todas as implementações
- RLS policies
- Rate limiting
- Auditoria
- Webhooks

---

**Próximo:** Começar Dia 1 → Gerar novos tokens

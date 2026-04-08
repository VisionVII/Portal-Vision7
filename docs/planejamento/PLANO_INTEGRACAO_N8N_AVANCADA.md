# Plano Avançado: Integração n8n e Portal de Automações

**Data:** Abril 7, 2026  
**Versão:** 1.0  
**Ambiente:** Vision7 Portal + n8n (Render self-hosted)  
**Responsável:** Victor Gonçalves

---

## SUMÁRIO EXECUTIVO

Este documento detalha a estratégia completa para elevar o sistema de automações de um prototype funcional a uma solução enterprise-ready. Inclui camadas de segurança, persistência de dados, integração UI/UX e operações avançadas.

### O que já existe (MVP):
- ✅ Dashboard de automações funcional
- ✅ Comunicação com n8n via REST API
- ✅ Edge Function proxy (segurança)
- ✅ Tabela de automações com RLS
- ✅ Monitoramento de execuções

### O que será adicionado (Roadmap):
- 🔨 Iframe com SSO n8n ↔ Portal
- 🔨 PostgreSQL persistência em n8n (vs SQLite)
- 🔨 Criação/edição de workflows via dashboard
- 🔨 Webhooks de callback (n8n → Portal)
- 🔨 Rate limiting e rate-based security
- 🔨 Auditoria completa de ações
- 🔨 Templates de workflows reutilizáveis

---

## 1. SEGURANÇA: Tokens e Credenciais

### 1.1 Checklist de Tokens Sensíveis

Os tokens fornecidos anteriormente **EXPIRAM EM 06/04/2026** (3 dias). Ação imediata necessária.

| Token | Tipo | Status | Ação |
|-------|------|--------|------|
| `eyJhbGc...BdXvr` | Public API | ⚠️ Expira 06/04 | Revocar e gerar novo |
| `eyJhbGc...3Gc-Z` | MCP Server | ⚠️ Sem TTL | Revogar e gerar novo |

### 1.2 Procedimento: Gerar Novos Tokens

#### Passo 1: Acessar n8n
```
URL: https://n8n-vision7.onrender.com
Email: [seu email de admin]
Password: [sua senha]
```

#### Passo 2: Navegar até Personal API Tokens
```
Dashboard n8n:
  ↓
Settings (gear icon)
  ↓
API
  ↓
Personal API Tokens (menu esquerdo)
```

#### Passo 3: Revogar Token Antigo (Public API)
1. Localizar token com audience: `public-api`
2. Clicar menu (três pontos)
3. Selecionar "Revoke Token"
4. Confirmar ação

#### Passo 4: Criar Novo Token (Public API)
1. Clicar "+ New Token"
2. Preencher:
   - **Name:** `vision7-dashboard-prod-2026-04`
   - **Audience:** `public-api` (seleção dropdown)
   - **Expiration:** `30 days`
3. Clicar "Create"
4. **Copiar token imediatamente** (não mostra de novo)

#### Passo 5: Armazenar em Vault Seguro
```
1Password / Bitwarden / LastPass
├── Title: n8n Public API Token (Vision7 Prod)
├── Token: [COPIAR_AQUI]
├── URL: https://n8n-vision7.onrender.com
├── Notes: Expires [DATA+30D], Revoke antes de expirar
└── Tags: vision7, automation, n8n
```

#### Passo 6: Repetir para Token MCP Server
- Token com audience: `mcp-server-api`
- Name: `vision7-mcp-prod-2026-04`
- Mesmo procedimento de revogação + criação

#### Passo 7: Validar Novos Tokens
```bash
# Teste Public API Token
curl -X GET "https://n8n-vision7.onrender.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: [NOVO_TOKEN_AQUI]" \
  -s | jq .

# Esperado: { "data": [...], "nextCursor": null }

# Se 401: Token incorreto
# Se 403: Sem permissão (token expirado ou revogado)
```

### 1.3 Armazenar em Supabase Edge Function Secrets

Uma vez gerados, armazenar em **Supabase Console**:

```
1. Supabase Console
   ↓
2. Project → Edge Functions
   ↓
3. n8n-proxy (função existente)
   ↓
4. Setup → Secrets
   ↓
5. Clicar "+ New secret"
```

**Secrets a configurar:**

```env
# n8n-proxy Secrets
N8N_BASE_URL=https://n8n-vision7.onrender.com
N8N_API_KEY=[NOVO_TOKEN_PUBLIC_API]
N8N_ENCRYPTION_KEY=32charRandomStringWithUpperLower123!
N8N_WEBHOOK_URL=https://yourdomain.com/webhooks
WEBHOOK_SIGNING_SECRET=hmac_secret_32_chars_min
N8N_SSO_SECRET=jwt_secret_for_sso_32_chars_min
```

**Como gerar secrets aleatórios:**
```bash
# Terminal
openssl rand -base64 32 | head -c 32

# Resultado exemplo:
# X7mK9pL2qW8jH3nC6vB4zD1aS5tY0uE
```

### 1.4 Configuração de Segurança na Instância n8n

#### Desabilitar Public Sign-up
```
n8n Settings:
  ↓
Security
  ↓
"Allow sign-up" → TOGGLE OFF
```

#### Ativar 2FA para Admin
```
n8n User Menu:
  ↓
Account Settings
  ↓
Two Factor Authentication (2FA)
  ↓
Enable → Scan QR Code → Guardar backup codes
```

#### Configurar Rate Limiting
```
n8n API Settings:
  ↓
API Call Limits
  ↓
- Requests per minute: 100
- Requests per day: 10000
```

#### Revisar Workflows Sharing
```
n8n Dashboard:
  ↓
For cada workflow:
  ↓
Share (botão)
  ↓
Desabilitar "Allow editing" (apenas view)
```

---

## 2. PERSISTÊNCIA: PostgreSQL Configuration

### 2.1 Problema Atual

n8n em Render está usando **SQLite** (storage local ephemeral). Ao reiniciar, perde:
- Workflows criados
- Execuções/logs
- Credenciais (parcial)
- Projects

### 2.2 Solução: Migrar para PostgreSQL

**Opção A:** Usar PostgreSQL do Supabase (recomendado)  
**Opção B:** Banco dedicado na Render ou AWS RDS

**Vamos usar Opção A (Supabase).**

### 2.3 Passo 1: Criar Schema n8n em Supabase

Acessar **Supabase Console → SQL Editor** e executar:

```sql
-- Criar schema dedicado para n8n
CREATE SCHEMA IF NOT EXISTS n8n;

-- Criar role dedicado (mais seguro que usar superuser)
CREATE ROLE n8n_service WITH LOGIN PASSWORD '[SENHA_FORTE_AQUI]';

-- Conceder permissões
GRANT USAGE ON SCHEMA n8n TO n8n_service;
GRANT CREATE ON SCHEMA n8n TO n8n_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA n8n TO n8n_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA n8n TO n8n_service;

-- Default privileges para tabelas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON TABLES TO n8n_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON SEQUENCES TO n8n_service;
```

**Gerar senha forte:**
```bash
openssl rand -base64 32 | head -c 24
# Resultado: X9mK2pL7qW3jH8nC6vB1zD
```

### 2.4 Passo 2: Atualizar docker-compose.yml (n8n)

Arquivo: `/infra/n8n/docker-compose.yml`

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      # === Database: PostgreSQL ===
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=db.xxxxx.supabase.co
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=postgres
      - DB_POSTGRESDB_SCHEMA=n8n
      - DB_POSTGRESDB_USER=n8n_service
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      
      # === Encriptação de Credenciais ===
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      
      # === API ===
      - N8N_API_ENABLED=true
      - N8N_API_KEY=${N8N_API_KEY}
      
      # === Webhooks ===
      - WEBHOOK_URL=${WEBHOOK_URL}
      - WEBHOOK_TUNNEL_URL=${WEBHOOK_URL}
      
      # === Execuções: Persistência ===
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
      
      # === Prune de Execuções ===
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=720  # 30 dias em horas
      
      # === Timezone ===
      - GENERIC_TIMEZONE=Europe/Lisbon
      - TZ=Europe/Lisbon
      
      # === Security ===
      - N8N_DIAGNOSTICS=false
      - N8N_SECURE_COOKIE=true

    volumes:
      - n8n_data:/home/node/.n8n
    
    # Healthcheck
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5678/"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  n8n_data:
    driver: local
```

### 2.5 Passo 3: Aplicar Migrações no n8n

Após atualizar docker-compose, executar:

```bash
# Stop n8n
docker-compose -f infra/n8n/docker-compose.yml down

# Remove SQLite credentials (opcional, apenas se backup não necessário)
# docker volume rm n8n_data

# Start com PostgreSQL
docker-compose -f infra/n8n/docker-compose.yml up -d

# Verificar logs
docker-compose -f infra/n8n/docker-compose.yml logs -f n8n

# Aguardar: "Editor is now available at..."
```

### 2.6 Validação: Verificar Persistência

1. Criar workflow de teste em n8n
2. Executar algumas vezes
3. Reiniciar container:
   ```bash
   docker-compose -f infra/n8n/docker-compose.yml restart n8n
   ```
4. Verificar se workflow e execuções persistem

---

## 3. INTERFACE: Iframe + SSO

### 3.1 Arquitetura

```
┌─────────────────────────────────┐
│ Portal Dashboard (React)        │
│ src/pages/admin/AdminN8nBuilder │
└──────────────┬──────────────────┘
               │
        [Solicita JWT]
               │
               v
        ┌──────────────────────┐
        │ Edge Fn: n8n-sso-    │
        │ token (novo)         │
        └──────────────────────┘
               │
        [Retorna JWT]
               │
               v
        ┌──────────────────────────────────────┐
        │ Iframe: n8n com query param ?token= │
        │ https://n8n.onrender.com/?sso=JWT   │
        └──────────────────────────────────────┘
               │
        [JWT autenticação]
               │
               v
        n8n User Auto-Login
```

### 3.2 Criação de Edge Function: n8n-sso-token

**Arquivo:** `supabase/functions/n8n-sso-token/index.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.1.0/index.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify Supabase JWT and get user
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
    const { payload } = Jose.decode(token, { secret: jwtSecret });
    const userId = payload.sub;
    const userEmail = payload.email;

    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user roles from Supabase
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: "User has no roles" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Only allow super_admin, admin, editor
    const allowedRoles = ["super_admin", "admin", "editor"];
    if (!allowedRoles.includes(roles.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Create n8n SSO JWT
    const ssoSecret = Deno.env.get("N8N_SSO_SECRET") ?? "";
    const ssoPayload = {
      sub: userId,
      email: userEmail,
      role: roles.role,
      iss: "vision7-portal",
      aud: "n8n",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
    };

    const ssoToken = await jose. signJWT(ssoPayload, ssoSecret);

    return new Response(
      JSON.stringify({ ssoToken }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### 3.3 Criar Página: AdminN8nBuilder.tsx

**Arquivo:** `src/pages/admin/AdminN8nBuilder.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

const AdminN8nBuilder: React.FC = () => {
  const { user } = useAuth();
  const [ssoToken, setSsoToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSsoToken = async () => {
      try {
        if (!user) throw new Error('No user logged in');

        // Get current session
        const response = await fetch('/functions/v1/n8n-sso-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`SSO failed: ${response.statusText}`);
        }

        const { ssoToken: token } = await response.json();
        setSsoToken(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSsoToken();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-8 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-5 w-5" />
            Erro ao Conectar ao n8n
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800">
          {error}
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!ssoToken) {
    return <div>Sem acesso SSO</div>;
  }

  const n8nUrl = `${process.env.VITE_N8N_BASE_URL}/?sso=${encodeURIComponent(ssoToken)}`;

  return (
    <div className="h-screen w-full">
      <iframe
        src={n8nUrl}
        title="n8n Workflow Builder"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default AdminN8nBuilder;
```

### 3.4 Adicionar Rota em App.tsx

```typescript
// src/App.tsx
import AdminN8nBuilder from '@/pages/admin/AdminN8nBuilder';

// Dentro de routes Admin:
{
  path: '/admin/n8n-builder',
  element: <ProtectedRoute><AdminN8nBuilder /></ProtectedRoute>,
}
```

### 3.5 Atualizar Navegação

Adicionar botão na AdminAutomationPanel:

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

---

## 4. WORKFLOWS: CRUD via Dashboard

### 4.1 Extensão do AdminAutomationPanel

Adicionar seção para "Criar Novo Workflow":

```typescript
const [showWorkflowForm, setShowWorkflowForm] = useState(false);
const [newWorkflowName, setNewWorkflowName] = useState('');
const [selectedTemplate, setSelectedTemplate] = useState('');

const handleCreateWorkflow = async () => {
  // Validar
  if (!newWorkflowName.trim() || !selectedTemplate) {
    toast({ title: 'Campos obrigatórios' });
    return;
  }

  // Chamar n8n API para criar workflow baseado em template
  const response = await fetch('/functions/v1/n8n-create-workflow', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${user.access_token}` },
    body: JSON.stringify({
      name: newWorkflowName,
      template: selectedTemplate, // rss-curation, ai-enhancement, etc.
    }),
  });

  const { workflowId } = await response.json();
  
  // Atualizar lista
  await refreshN8nData();
  setShowWorkflowForm(false);
};
```

### 4.2 Templates de Workflows

**Arquivo:** `infra/n8n/templates/templates.json`

```json
{
  "templates": [
    {
      "id": "rss-curation",
      "name": "Curadoria RSS",
      "description": "Lê feeds RSS, filtra por palavras-chave e enriquece com IA",
      "nodes": [
        { "type": "IRSSReader", "config": { "feedUrl": "{{rss_feed_url}}" } },
        { "type": "Filter", "config": { "keywords": "{{keywords}}" } },
        { "type": "LlmChain", "config": { "prompt": "{{ai_prompt}}" } },
        { "type": "HttpRequest", "config": { "method": "POST", "url": "{{webhook_url}}" } }
      ]
    },
    {
      "id": "email-newsletter",
      "name": "Newsletter Email",
      "description": "Coleta posts recentes e envia em newsletter",
      "nodes": [...]
    }
  ]
}
```

---

## 5. SEGURANÇA: RLS e Rate Limiting

### 5.1 Polices RLS (Supabase)

```sql
-- n8n_projects: apenas admin/super_admin podem editar
CREATE POLICY "admin_manage_n8n_projects" ON public.n8n_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin')
    )
  );

-- automations: editor pode ler, admin/super_admin podem editar
CREATE POLICY "editor_read_automations" ON public.automations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'editor')
    )
  );

CREATE POLICY "admin_manage_automations" ON public.automations
  FOR INSERT, UPDATE, DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin')
    )
  );
```

### 5.2 Rate Limiting na Edge Function

```typescript
// supabase/functions/n8n-proxy/index.ts

const rateLimit = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const record = rateLimit.get(userId);
  
  if (!record || now > record.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + 60000 }); // 1 min window
    return true;
  }
  
  if (record.count < 100) {
    record.count++;
    return true;
  }
  
  return false;
};

// Usar em refreshN8nData:
if (!checkRateLimit(userId)) {
  return Response.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

### 5.3 Auditoria Completa

**Tabela:** `n8n_audit_logs`

```sql
CREATE TABLE IF NOT EXISTS public.n8n_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_n8n_audit_user ON public.n8n_audit_logs(user_id);
CREATE INDEX idx_n8n_audit_action ON public.n8n_audit_logs(action);
CREATE INDEX idx_n8n_audit_created ON public.n8n_audit_logs(created_at DESC);
```

**Trigger para auditoria automática:**

```sql
CREATE OR REPLACE FUNCTION log_n8n_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.n8n_audit_logs (
    user_id, action, resource_type, resource_id, resource_name, changes, user_agent
  ) VALUES (
    auth.uid(),
    TG_ARGV[0],
    TG_ARGV[1],
    COALESCE(NEW.id::text, OLD.id::text),
    COALESCE(NEW.name, OLD.name),
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    current_setting('request.headers')::json->>'user-agent'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggerar em automations
CREATE TRIGGER audit_automations
  AFTER INSERT OR UPDATE OR DELETE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION log_n8n_action('action', 'automations');
```

---

## 6. CHECKLIST PRÉ-PRODUÇÃO

### Segurança
- [ ] Novos Access Tokens gerados e testados
- [ ] Tokens antigos revogados
- [ ] Secrets configurados em Supabase Edge Function
- [ ] 2FA ativado para admin n8n
- [ ] Public sign-up desabilizado em n8n
- [ ] CSP headers configurados
- [ ] CORS apenas domínios permitidos

### Persistência
- [ ] PostgreSQL schema `n8n` criado
- [ ] Role `n8n_service` configurado
- [ ] docker-compose atualizado com DB vars
- [ ] Migrações n8n completadas
- [ ] Teste de persistência após restart ✓

### Interface
- [ ] Edge Function `n8n-sso-token` deployed
- [ ] Página `AdminN8nBuilder.tsx` criada
- [ ] Iframe SSO funcionando
- [ ] Botão "Abrir Builder" adicionado ao panel

### Operações
- [ ] Rate limiting implementado
- [ ] Auditoria logging funcional
- [ ] Webhooks n8n → Portal configurados
- [ ] RLS policies revisadas
- [ ] Documentação atualizada

### Testes
- [ ] Criar workflow via Portal + n8n ✓
- [ ] Executar workflow manualmente ✓
- [ ] Monitorar execução em tempo real ✓
- [ ] Teste de falha + retry ✓
- [ ] Teste de rate limit (429 expected)
- [ ] Auditoria logs appearing em dashboard

---

## 7. Próximos Passos (ORDER)

1. **HOJE (Dia 1):**
   - Gerar e testar novos Access Tokens
   - Configurar Supabase Edge Function Secrets
   - Revisar este documento com Victor

2. **AMANHÃ (Dia 2-3):**
   - Implementar PostgreSQL persistência
   - Testar restart + data persistence
   - Deploy docker-compose upgrade

3. **Semana 1:**
   - Edge Function n8n-sso-token
   - AdminN8nBuilder.tsx Page
   - Teste SSO login

4. **Semana 2:**
   - Workflows CRUD templates
   - Rate limiting + auditoria
   - Campos form customização

5. **Semana 3:**
   - Webhooks n8n → Portal
   - Dashboard KPI enhancements
   - QA Completa + Go-live

---

## Referências

- n8n Docs: https://docs.n8n.io/
- n8n API: https://docs.n8n.io/api/
- Supabase Auth: https://supabase.com/docs/guides/auth
- Edge Functions: https://supabase.com/docs/guides/functions
- PostgreSQL n8n Setup: https://docs.n8n.io/guide/self-hosted/docker/

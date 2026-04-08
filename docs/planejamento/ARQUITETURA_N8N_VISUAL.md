# Arquitetura Proposta: Vision7 Portal + n8n Avançado

## Fluxo Atual (MVP - Funcional)

```
┌─────────────────────────────────────────────────────────────────┐
│                  Portal Dashboard (React)                      │
│         AdminAutomation.tsx + AdminAutomationPanel             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ KPIs: Workflows | Automações | Execuções | Segurança     │ │
│  └─────────────────────────────────────────────────────────┬─┘ │
│  ┌────────────────────────────────────────────────────────┴──┐ │
│  │ UI Components:                                            │ │
│  │ - Listar workflows n8n                                   │ │
│  │ - Ativar/Desativar workflows                            │ │
│  │ - Executar manualmente                                  │ │
│  │ - Monitorar execuções (refresh 10s)                     │ │
│  │ - Criar/Editar automações (Supabase)                    │ │
│  │ - Ver logs em JSON                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │
                 Service: n8n.ts (REST)
                 Hook: useAutomations
                            │
        ┌───────────────────┴──────────────────┐
        │                                      │
        v                                      v
  ┌──────────────┐                  ┌──────────────────┐
  │ n8n REST API │                  │ Supabase         │
  │              │                  │                  │
  │ /api/v1/     │                  │ - automations    │
  │ workflows    │                  │ - n8n_projects   │
  │ executions   │                  │ - Edge Fn proxy  │
  │ credentials  │                  │   (segurança)    │
  └──────────────┘                  └──────────────────┘
        │
        v
  ┌──────────────────────────┐
  │ n8n Instance (Render)    │
  │ - SQLite (ephemeral)     │
  │ - Workflows              │
  │ - Executions (5 dias)    │
  │ - Credentials            │
  └──────────────────────────┘
```

**Issues atuais:**
- ⚠️ n8n roda em SQLite → perde dados em restart
- ⚠️ API key exposta no code (mitigada via Edge Function)
- ⚠️ Sem integração UI/builder n8n ↔ Portal
- ⚠️ Sem SSO
- ⚠️ Sem webhooks de callback

---

## Arquitetura PROPOSTA (Roadmap)

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Portal Dashboard (React)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ OverviewView                                                  │ │
│  │ - Dashboard KPIs                                             │ │
│  │ - Stats de automações                                        │ │
│  │ - Recent executions                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ AdminAutomation (Enhanced)                                    │ │
│  │ ┌──────────────────────────────────────────────────────────┐  │ │
│  │ │ Workspace 1                                              │  │ │
│  │ │ ├─ Workflows: [List with actions]                       │  │ │
│  │ │ ├─ [+ Criar Novo Workflow]                             │  │ │
│  │ │ ├─ [Abrir n8n Builder] ←── NEW                         │  │ │
│  │ │ ├─ Automações: [CRUD]                                  │  │ │
│  │ │ ├─ Execuções: [Monitor + Logs]                         │  │ │
│  │ │ └─ Configurações: [Rate limit, retry, timeout]         │  │ │
│  │ └──────────────────────────────────────────────────────────┘  │ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Iframe: n8n Builder ←── NEW                                   │ │
│  │ - Abre em modal/full page                                    │ │
│  │ - Autenticado via JWTn8n (SSO)                              │ │
│  │ - Cria/edita workflows                                       │ │
│  │ - Callback webhook → Portal atualiza lista                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────┬────────────┬──────────────┬────────────────────────────────┘
           │            │              │
           │            │              └─────────────────┐
           │            │                                │
v          v            v                                v
┌─────────────────────────────────────────────┐  ┌─────────────────┐
│     Edge Functions (Supabase)               │  │ Local Storage   │
│                                             │  │ (dev)           │
│ 1. n8n-proxy (existing)                     │  └─────────────────┘
│    - Chamadas à n8n REST                    │
│    - Protege API key                        │
│    - Rate limiting                          │
│                                             │
│ 2. n8n-sso-token (NEW)                      │
│    - Gera JWT para Iframe                   │
│    - Validação de user/role                 │
│                                             │
│ 3. n8n-webhooks-listener (NEW)              │
│    - Callback de n8n (workflow created)     │
│    - Atualiza tabela n8n_projects           │
│                                             │
│ 4. n8n-create-workflow (NEW)                │
│    - Templates para novos workflows         │
│    - Persiste em n8n_projects               │
│                                             │
└──────────┬────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────┐
    │                                             │
    v                                             v
┌──────────────────────────┐          ┌─────────────────────────────────┐
│ n8n Instance (Render)    │          │ Supabase PostgreSQL             │
│                          │          │                                 │
│ ❌ SQLite (DELETE)        │          │ public:                         │
│                          │          │ ├─ automations (RLS)            │
│ ✅ PostgreSQL (NEW)       │          │ ├─ n8n_projects (RLS)          │
│                          │          │ ├─ n8n_audit_logs (RLS)        │
│ DB Schema: n8n           │          │ ├─ user_roles                   │
│ ├─ workflows             │          │                                 │
│ ├─ executions            │          │ n8n schema: (NEW)               │
│ ├─ credentials           │          │ ├─ n8n_workflow                 │
│ ├─ projects              │          │ ├─ n8n_execution                │
│ └─ [other n8n tables]    │          │ └─ n8n_credential               │
│                          │          │                                 │
│ Persistência: ✅ 30+ dias │          │ RLS Policies:                   │
│ Webhooks: ✅ Enabled     │          │ ├─ super_admin: all             │
│ API: ✅ v1 + Encryption  │          │ ├─ admin: edit/create/delete    │
│ SSO: ✅ JWT validated    │          │ └─ editor: read/execute         │
│                          │          │                                 │
│ Auditoria: ✅ Logs       │          │ Rate Limiting: ✅ 100/min       │
│ Rate Limit: ✅ Per user  │          │ Auditoria: ✅ Trigger logging   │
│ Encryption: ✅ Enabled   │          │                                 │
│                          │          │                                 │
└──────────────────────────┘          └─────────────────────────────────┘
```

---

## Fluxo: Criar Novo Workflow (Exemplo)

```
User clicks "Novo Workflow" na Dashboard
    │
    v
Portal: ShowCreateWorkflowDialog()
├─ Select template (RSS Curation, Email, etc.)
└─ Enter name
    │
    v
[Submit]
    │
    v
Call: POST /functions/v1/n8n-create-workflow
├─ Payload: { name, template, projectId }
├─ Auth: Bearer [Supabase JWT]
└─ Body validada em Edge Fn
    │
    v
Edge Function: n8n-create-workflow
├─ Verify user has role: admin/super_admin
├─ Template json loaded
├─ Call: POST n8n-proxy → n8n/api/v1/workflows/create
├─ n8n returns: { id: "abc123", name: "...", active: true }
├─ Salva em: Supabase n8n_projects table
├─ Log auditoria
└─ Return: { success: true, workflowId: "abc123" }
    │
    v
Portal: Atualiza lista de workflows
└─ Mostra novo workflow com status "Ativo"
```

---

## Fluxo: SSO Iframe (Login automático)

```
User clicks "Abrir n8n Builder" na Dashboard
    │
    v
React: navigate('/admin/n8n-builder')
    │
    v
AdminN8nBuilder componente monta:
├─ useEffect → chama /functions/v1/n8n-sso-token
├─ Auth header: Bearer [Supabase JWT user]
└─ Waits para resposta
    │
    v
Edge Function: n8n-sso-token
├─ Decodifica Supabase JWT → extrai user_id, email
├─ Verifica role: super_admin | admin | editor
├─ Cria novo JWT:
│  {
│    sub: user_id,
│    email: user@vision7.pt,
│    role: "admin",
│    aud: "n8n",
│    exp: now + 1h
│  }
├─ Assinado com N8N_SSO_SECRET
└─ Retorna: { ssoToken: "eyJ..." }
    │
    v
Portal: Constrói URL de Iframe:
├─ src = `https://n8n-vision7.onrender.com/?sso=${JWT}`
└─ Monta Iframe com sandbox
    │
    v
n8n recebe JWT via query param
├─ Valida assinatura da JWT
├─ Se válido:
│  ├─ Extrai user email
│  ├─ Procura/cria user em n8n
│  └─ Auto-loga (sessão n8n iniciada)
└─ Se inválido: mostra login page
    │
    v
User vê n8n Workflow Builder em Iframe
├─ Pode criar workflows
├─ Pode editar workflows
├─ Ao salvar workflow:
│  └─ n8n dispara webhook POST para Portal
└─ Portal atualiza dashboard
```

---

## Fluxo: Call n8n API com Segurança

```
Portal Dashboard chama: executeWorkflow(workflowId)
    │
    v
Service: n8n.ts → makeRequest()
├─ Endpoint: `/functions/v1/n8n-proxy`
├─ Method: POST
├─ Headers: {
│    Authorization: Bearer [Supabase JWT],
│    Content-Type: application/json
│  }
├─ Body: {
│    action: "execute",
│    workflowId: "abc123"
│  }
└─ Send request
    │
    v
Edge Function: n8n-proxy
├─ Verify Supabase JWT → extrai user_id
├─ Check rate limit: user_id → < 100/min?
├─ Check role: admin | editor required
├─ Construct n8n call:
│  {
│    URL: https://n8n.onrender.com/api/v1/workflows/abc123/execute
│    Headers: { X-N8N-API-KEY: N8N_API_KEY }
│  }
├─ Call n8n (com timeout 30s)
├─ Handle response:
│  ├─ 200/201 → Cache execução
│  ├─ 401 → Log "API key expired"
│  ├─ 429 → Retry com backoff
│  └─ 5xx → Log erro + alert admin
├─ Log auditoria (user, action, result)
└─ Return result ao Portal
    │
    v
Portal: Processpath response
├─ Se sucesso: toast "Execução iniciada"
├─ Se erro: toast "Erro ao executar"
└─ Atualiza dashboard
```

---

## Mapeamento de Dados Sensíveis

```
┌─────────────────────────┬──────────────────┬──────────────────────┐
│ Credencial              │ Sensibilidade    │ Onde Guardar         │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ N8N_API_KEY             │ ✅✅✅ CRÍTICA    │ Vault + Supabase Sec│
│ (Public API Token)      │ Expira 30 dias   │ nunca em .env local  │
│                         │ Revoga após uso   │                      │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ N8N_ENCRYPTION_KEY      │ ✅✅ MUITO ALTO  │ Supabase Secrets     │
│ (32 chars aleatório)    │ Database depend. │ não mude depois       │
│                         │  NUNCA rotacionar│                      │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ N8N_SSO_SECRET          │ ✅✅ MUITO ALTO  │ Supabase Secrets     │
│ (JWT signing secret)    │ Rotacionar 90d   │ Invalidar JWTs se    │
│                         │                   │ mudar                │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ DB_POSTGRESDB_PASSWORD  │ ✅✅✅ CRÍTICA   │ docker-compose .env  │
│ (n8n_service user)      │ Rotacionar 90d   │ .gitignore obrigat.  │
│                         │                   │                      │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ N8N_BASE_URL            │ ❌ Público       │ .env, package.json   │
│ (https://n8n....com)    │ Sem risco        │ Sem problema         │
├─────────────────────────┼──────────────────┼──────────────────────┤
│ User Email (Victor)     │ ⚠️ PII Dados     │ Vault + confidencial │
│ (visionvidevgrid@...)   │ Pessoais         │                      │
└─────────────────────────┴──────────────────┴──────────────────────┘
```

---

## Cronograma Proposto

```
Semana 1 (07/04 - 14/04)
├─ Dia 1-2: Tokens + Supabase Secrets ✅
├─ Dia 3-4: PostgreSQL Persistência ✅
├─ Dia 5-6: Edge Function n8n-sso-token
└─ Dia 7: AdminN8nBuilder + Rota

Semana 2 (15/04 - 21/04)
├─ Dia 1-2: Workflows CRUD + Templates
├─ Dia 3-4: Webhooks n8n → Portal
├─ Dia 5-6: Dashboard enhancements
└─ Dia 7: Rate limiting + Auditoria

Semana 3 (22/04 - 28/04)
├─ Dia 1-4: Testing + QA
└─ Dia 5-7: Documentação + Go-live

Timeline Total: ~21 dias (3 sprints)
```

---

## Benefícios da Arquitetura Proposta

✅ **Performance:** PostgreSQL vs SQLite (persistência guaranteed)  
✅ **Segurança:** API keys nunca no browser; JWT SSO; RLS; Auditoria  
✅ **Usabilidade:** Editor n8n embutido no Portal (UX integrada)  
✅ **Escalabilidade:** Webhooks assíncronos; rate limiting; caching  
✅ **Manutenibilidade:** Código separado; Edge Functions reutilizáveis  
✅ **Conformidade:** GDPR audit logs; RLS user-scoped; encryption  

---

## Suporte de Roadmap

**Fase 1 (MVP):** Tokens + PostgreSQL + SSO  
**Fase 2:** Workflows CRUD + Webhooks  
**Fase 3:** Advanced (templates, scheduling, multi-workspace)  
**Fase 4:** Analytics + Monetization (integração com Stripe para premium automações)  

---

## Links de Referência

- [n8n API Docs](https://docs.n8n.io/api/)
- [Supabase JWT](https://supabase.com/docs/guides/auth/jwts)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL n8n Setup](https://docs.n8n.io/guide/self-hosted/docker/)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

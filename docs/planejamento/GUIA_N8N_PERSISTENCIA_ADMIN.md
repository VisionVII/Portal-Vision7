# N8N — Persistência, Gestão de Projetos e Controle via Admin

**Data:** 2026-04-06  
**Status:** Guia de implementação pronto

---

## ARQUITETURA ATUAL

```
Browser (Admin Dashboard)
    ↓
AdminAutomationPanel.tsx  →  useAutomations.ts  →  Supabase (tabela automations)
    ↓
n8n.ts (service)  →  Edge Function "n8n-proxy"  →  n8n REST API
```

**Já implementado:**
- Edge Function `n8n-proxy` (protege API key server-side)
- Tabela `automations` no Supabase (com RLS)
- Hook `useAutomations` (TanStack Query CRUD)
- Listar/ativar/desativar/executar workflows
- Monitoramento de execuções com auto-refresh

---

## PASSO A PASSO — Sessão Persistente via Banco

### Passo 1: Configurar n8n com PostgreSQL (em vez de SQLite)

O n8n por padrão usa SQLite. Para persistência robusta, usar PostgreSQL (pode ser o mesmo Supabase ou um DB dedicado).

**docker-compose.yml (n8n self-hosted):**

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      # Persistência via PostgreSQL
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${N8N_DB_HOST}
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${N8N_DB_NAME}
      - DB_POSTGRESDB_USER=${N8N_DB_USER}
      - DB_POSTGRESDB_PASSWORD=${N8N_DB_PASSWORD}
      - DB_POSTGRESDB_SCHEMA=n8n
      
      # Encriptação de credenciais
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      
      # API
      - N8N_API_ENABLED=true
      - N8N_API_KEY=${N8N_API_KEY}
      
      # Webhook URL pública
      - WEBHOOK_URL=${N8N_WEBHOOK_URL}
      
      # Execuções: guardar no DB
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      - EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
      
      # Prune execuções antigas (manter 30 dias)
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=720
      
      # Timezone
      - GENERIC_TIMEZONE=Europe/Lisbon
      - TZ=Europe/Lisbon
    volumes:
      - n8n_data:/home/node/.n8n  # Apenas para encryption key backup

volumes:
  n8n_data:
```

**Variáveis necessárias (.env):**
```bash
N8N_DB_HOST=db.xxxxx.supabase.co   # Ou host PostgreSQL dedicado
N8N_DB_NAME=n8n_workflows
N8N_DB_USER=n8n_service
N8N_DB_PASSWORD=<strong_password>
N8N_ENCRYPTION_KEY=<random_32_char_key>
N8N_API_KEY=<api_key_for_proxy>
N8N_WEBHOOK_URL=https://n8n.yourdomain.com
```

> **Nota:** Se usar o mesmo Supabase PostgreSQL, criar um schema separado `n8n` para isolar as tabelas do n8n das tabelas da aplicação.

---

### Passo 2: Criar Schema Dedicado n8n no Supabase (opcional)

Se quiser usar o mesmo PostgreSQL do Supabase:

```sql
-- Executar no SQL Editor do Supabase
CREATE SCHEMA IF NOT EXISTS n8n;

-- Criar user dedicado (recomendado)
CREATE ROLE n8n_service WITH LOGIN PASSWORD '<strong_password>';
GRANT USAGE ON SCHEMA n8n TO n8n_service;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA n8n TO n8n_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON TABLES TO n8n_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA n8n GRANT ALL ON SEQUENCES TO n8n_service;
```

---

### Passo 3: Tabela de Projetos/Fluxos no Supabase

Para guardar metadados de projetos e organizar workflows por projeto no dashboard admin:

```sql
-- Migration: add_n8n_projects_table.sql

CREATE TABLE IF NOT EXISTS public.n8n_projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  color       TEXT        DEFAULT '#6366f1',
  workflow_ids TEXT[]     NOT NULL DEFAULT '{}',
  is_active   BOOLEAN    NOT NULL DEFAULT true,
  created_by  UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_n8n_projects_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_n8n_projects_updated_at
  BEFORE UPDATE ON public.n8n_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_n8n_projects_updated_at();

-- RLS
ALTER TABLE public.n8n_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_n8n_projects" ON public.n8n_projects
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'editor')
      AND ur.is_active = true
  ));

CREATE POLICY "admin_write_n8n_projects" ON public.n8n_projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
      AND ur.is_active = true
  ));
```

---

### Passo 4: Hook useN8nProjects

```typescript
// src/hooks/useN8nProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type N8nProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  workflowIds: string[];
  isActive: boolean;
  createdAt: string;
};

export function useN8nProjects() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['n8n-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('n8n_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        color: r.color ?? '#6366f1',
        workflowIds: r.workflow_ids ?? [],
        isActive: r.is_active,
        createdAt: r.created_at,
      })) as N8nProject[];
    },
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: async (project: Omit<N8nProject, 'id' | 'createdAt'>) => {
      const { error } = await supabase.from('n8n_projects').insert({
        name: project.name,
        description: project.description,
        color: project.color,
        workflow_ids: project.workflowIds,
        is_active: project.isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['n8n-projects'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('n8n_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['n8n-projects'] }),
  });

  return { projects: query.data ?? [], isLoading: query.isLoading, create, remove };
}
```

---

### Passo 5: Start/Stop Workflows via Admin

O serviço `n8n.ts` já tem `activateWorkflow()` e `deactivateWorkflow()`. Para controle completo via dashboard:

**Expandir o Edge Function proxy** para suportar paths adicionais:

```typescript
// supabase/functions/n8n-proxy/index.ts — Adicionar ao ALLOWED_PATHS:
const ALLOWED_PATHS = [
  '/rest/workflows',
  '/rest/executions',
  '/rest/credentials',      // ← NOVO: listar credentials (read-only)
];
```

**Adicionar funções ao service:**

```typescript
// src/services/n8n.ts — Adicionar:

export const createWorkflow = async (workflow: { name: string; nodes?: unknown[]; connections?: unknown }) => {
  return n8nRequest<N8nWorkflow>('/rest/workflows', {
    method: 'POST',
    body: workflow,
  });
};

export const updateWorkflow = async (id: string, updates: Partial<N8nWorkflow>) => {
  return n8nRequest<N8nWorkflow>(`/rest/workflows/${id}`, {
    method: 'PATCH',
    body: updates,
  });
};

export const deleteWorkflow = async (id: string) => {
  return n8nRequest(`/rest/workflows/${id}`, { method: 'DELETE' });
};

export const getCredentials = async () => {
  const payload = await n8nRequest<unknown>('/rest/credentials');
  return normalizeCollection<{ id: string; name: string; type: string }>(payload);
};
```

---

### Passo 6: Painel de Controle de Workflows no Admin

Funcionalidades a adicionar ao `AdminAutomationPanel.tsx`:

| Funcionalidade | Ação |
|---|---|
| Listar projetos | Agrupar workflows por projeto |
| Criar projeto | Form: nome, cor, workflows associados |
| Start workflow | `activateWorkflow(id)` → botão verde |
| Stop workflow | `deactivateWorkflow(id)` → botão vermelho |
| Executar agora | `executeWorkflow(id)` → botão play |
| Ver logs | `getExecutions()` filtrado por workflow |
| Health check | Badge verde/vermelho no header indicando se n8n responde |

---

## RESUMO — Ordem de Execução

| # | Passo | Tipo | Impacto |
|---|-------|------|---------|
| 1 | Configurar n8n com PostgreSQL | Infra (docker-compose) | Dados persistem entre restarts |
| 2 | Schema n8n no PostgreSQL | Infra (SQL) | Isolamento de dados |
| 3 | Tabela `n8n_projects` | Migration Supabase | Organização por projeto |
| 4 | Hook `useN8nProjects` | Frontend | CRUD projetos |
| 5 | Expandir Edge Function proxy | Backend | Novos endpoints n8n |
| 6 | Expandir n8n.ts service | Frontend | Criar/atualizar/deletar workflows |
| 7 | UI no AdminAutomationPanel | Frontend | Controle visual completo |

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

**Supabase Edge Function Secrets:**
```bash
supabase secrets set N8N_BASE_URL="https://n8n.yourdomain.com"
supabase secrets set N8N_API_KEY="<your-n8n-api-key>"
```

**n8n Docker:**
```bash
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=...
DB_POSTGRESDB_DATABASE=...
DB_POSTGRESDB_USER=...
DB_POSTGRESDB_PASSWORD=...
N8N_ENCRYPTION_KEY=...
N8N_API_ENABLED=true
N8N_API_KEY=...
```

---

## SEGURANÇA

- API key n8n **nunca** exposta no frontend (proxy via Edge Function)
- RLS protege tabela `n8n_projects` e `automations`
- Apenas `super_admin` e `admin` podem start/stop workflows
- Credenciais n8n encriptadas com `N8N_ENCRYPTION_KEY`
- Logs de execução com prune automático (30 dias)
- Schema separado `n8n` isola dados do n8n das tabelas da app

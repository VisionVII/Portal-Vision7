# SDD Module: {{ module_name }}

> **Versão**: {{ version }}
> **Status**: `Planeado` | `Em Desenvolvimento` | `Concluído` | `Depreciado`
> **Owner**: {{ owner }}
> **Última atualização**: {{ date }}

---

## Objetivo

{{ objective }}
<!-- Uma ou duas frases: o que este módulo faz e que problema resolve. -->

---

## Requisitos Funcionais

| ID | Descrição | Prioridade | Status |
|----|-----------|------------|--------|
| FR-001 | | Alta | Pendente |
| FR-002 | | Média | Pendente |

**Prioridades válidas:** Alta · Média · Baixa
**Status válidos:** Pendente · Em Dev · Concluído · Cancelado

---

## Requisitos Não Funcionais

| ID | Descrição | Categoria | Meta | Status |
|----|-----------|-----------|------|--------|
| NFR-001 | | Performance | | Pendente |
| NFR-002 | | Segurança | | Pendente |
| NFR-003 | | Acessibilidade | WCAG 2.1 AA | Pendente |

**Categorias válidas:** Performance · Segurança · Acessibilidade · Escalabilidade · Disponibilidade

---

## Rotas

| Caminho | Componente | Acesso | Descrição |
|---------|-----------|--------|-----------|
| `/` | | Público | |
| `/admin/{{ module_slug }}` | | `admin` | |

**Níveis de acesso:** Público · `viewer` · `editor` · `admin` · `super_admin`

---

## Arquivos do Módulo

- **Páginas**: `src/pages/`
- **Componentes**: `src/components/{{ module_slug }}/`
- **Hooks**: `src/hooks/use{{ ModuleName }}.ts`
- **Serviços**: `src/services/{{ module_slug }}.ts`
- **Tipos**: `src/types/{{ module_slug }}.ts`
- **Migrações**: `supabase/migrations/YYYYMMDD_{{ module_slug }}.sql`

---

## Dependências

- **Módulos SDD**: <!-- ex: [[sdd-auth]], [[sdd-content]] -->
- **Pacotes npm**: <!-- ex: @radix-ui/react-dialog, recharts -->
- **Tabelas Supabase**: <!-- ex: posts, profiles, audit_log -->
- **Edge Functions**: <!-- ex: portal-ai-assistant, n8n-proxy -->
- **Workflows n8n**: <!-- ex: WF-03 (curadoria), WF-05 (distribuição) -->

---

## Fluxos

### Fluxo de Dados

```
{{ data_flow_diagram }}
<!-- Exemplo:
  Utilizador → Componente → Hook → Supabase → Edge Function → n8n
-->
```

### Fluxo do Utilizador

```
{{ user_flow_diagram }}
<!-- Exemplo:
  Login → Dashboard → Lista de Posts → Editar → Publicar
-->
```

---

## Edge Functions & API

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/functions/v1/{{ function_name }}` | POST | Bearer | |

```typescript
// Payload de exemplo
{
  "action": "",
  "payload": {}
}

// Resposta de exemplo
{
  "success": true,
  "data": {}
}
```

---

## Integração IA

<!-- Preencher apenas se o módulo usa Claude ou automação com IA -->

| Campo | Valor |
|-------|-------|
| Modelo | `claude-haiku-4-5-20251001` (chat público) · `claude-sonnet-4-6` (editorial) |
| Prompt caching | Sim · Não |
| Custo estimado | < $X/mês com Y req/dia |
| Workflow n8n associado | WF-0X |

---

## Permissões & RBAC

| Ação | `viewer` | `editor` | `admin` | `super_admin` |
|------|----------|----------|---------|---------------|
| Ler | ✓ | ✓ | ✓ | ✓ |
| Criar | | ✓ | ✓ | ✓ |
| Editar | | ✓ | ✓ | ✓ |
| Eliminar | | | ✓ | ✓ |
| Configurar | | | | ✓ |

---

## Testes QA

| ID | Tipo | Descrição | Resultado Esperado | Status |
|----|------|-----------|-------------------|--------|
| QA-001 | unit | | | Pendente |
| QA-002 | integration | | | Pendente |
| QA-003 | e2e | | | Pendente |

**Tipos válidos:** unit · integration · e2e · performance · security

---

## CI/CD

| Step | Ferramenta | Trigger | Comando | Status |
|------|------------|---------|---------|--------|
| Lint | ESLint | PR | `npm run lint` | Pendente |
| Types | TypeScript | PR | `npm run build` | Pendente |
| Deploy | Vercel | merge→main | automático | Pendente |
| Edge Fn | Supabase CLI | manual | `supabase functions deploy` | Pendente |

---

## Notas de Escalabilidade

- <!-- ex: Paginação obrigatória — evitar queries sem LIMIT -->
- <!-- ex: Cache de resultados no cliente com React Query -->

---

## Considerações de Segurança

- <!-- ex: RLS activado em todas as tabelas -->
- <!-- ex: Headers CORS obrigatórios nas Edge Functions -->
- <!-- ex: Validar Authorization header antes de qualquer operação -->

---

## Histórico de Alterações

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| {{ date }} | {{ version }} | {{ author }} | Criação inicial |

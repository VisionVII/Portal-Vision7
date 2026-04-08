# Skill: Motor de Automações Vision7

## Descrição
Skill especializada em projetar, implementar e manter automações no portal Vision7. Cobre todas as categorias: pipeline de conteúdo, emails, auditoria, processos internos e integrações externas. Usa o SDD `automation-engine.json` como fonte de verdade.

## Domínios de Aplicação
- Automações n8n para coleta, curadoria e publicação de conteúdo
- Disparo de emails transacionais e newsletters
- Auditoria de segurança automatizada (chaves, acessos, RLS)
- Processos de manutenção (limpeza, backup, sync)
- Integrações com serviços externos (redes sociais, CRM, analytics)

## Referência de Arquitetura

### Categorias de Automação
| ID | Nome | Trigger Types | Escopo |
|----|------|---------------|--------|
| `content_pipeline` | Pipeline de Conteúdo | schedule, manual, webhook | Coleta → curadoria → escrita AI → publicação |
| `email_campaigns` | Email & Notificações | schedule, event, manual | Newsletter, alertas, boas-vindas, digest |
| `audit_security` | Auditoria & Segurança | schedule, event | Rotação chaves, access audit, RLS check |
| `process_internal` | Processos Internos | schedule, manual | Limpeza, backup, sync, maintenance |
| `integrations` | Integrações Externas | schedule, webhook, event | Social media, analytics, CRM, webhooks |

### Tabelas Supabase
- `automations_v2` — Config principal com `category`, `trigger_type`, `config` (JSONB variável por categoria)
- `automation_executions` — Histórico com `steps[]` (nós executados), `duration_ms`, `items_processed`
- `automation_templates` — Templates pré-configurados para setup rápido
- `automation_audit_log` — Append-only, quem fez o quê e quando
- `automation_notifications` — Fila de notificações geradas por automações
- Tabelas de pipeline: `news_staging`, `news_clusters`, `curated_posts`, `posting_queue`, `editorial_feedback`
- `n8n_credentials` — Vault de chaves encriptadas AES-GCM

### Stack Frontend
- **Dashboard**: `AutomationDashboard` → tabs por categoria
- **Cards**: `AutomationCard` c/ status badge, métricas, ações inline
- **Forms**: `AutomationForm` dinâmico baseado no `config_schema` da categoria
- **Execuções**: `ExecutionTimeline` vertical cronológica + `ExecutionDetail` expandível
- **Templates**: `AutomationTemplateGallery` com filtro por categoria

## Capacidades

### Design de Automações
- **Análise de necessidade**: Identificar se o caso de uso é schedule, event-driven ou manual
- **Seleção de categoria**: Mapear para uma das 5 categorias canónicas
- **Config schema**: Definir campos dinâmicos baseados no tipo
- **Workflow design**: Desenhar nós n8n ou lógica interna
- **Template creation**: Empacotar como template reutilizável

### Implementação
- **Workflow n8n**: JSON importável com nós conectados, variáveis de ambiente
- **Edge Function**: Endpoint server-side para execução segura
- **Service layer**: `automationEngine.ts` para CRUD + dispatch unificado
- **Hook layer**: `useAutomationsV2()` com filtros, paginação, cache
- **UI component**: Card, form ou timeline seguindo o design system

### Monitoramento
- **Executions**: Timeline com steps, durations, status badges
- **Alertas**: In-app, email ou webhook ao falhar
- **Métricas**: Taxa de sucesso, items processados, tempo médio

## Regras de Implementação

### Segurança
1. **Nunca** expor credenciais no client-side (usar Edge Function + service_role)
2. **Sempre** validar JWT + role antes de operações de escrita
3. **Audit log** em todas as ações de criação, edição, execução e deleção
4. **Config JSONB** sanitizado server-side antes de persistir
5. **Rate limit**: 30 exec manuais/hora, 100 automáticas/hora por utilizador

### Performance
1. **Paginação server-side** em todas as listagens (page_size=20)
2. **Lazy-load tabs**: Só carrega dados da tab ativa
3. **Realtime** para execuções em andamento (Supabase subscriptions)
4. **Templates cached** 24h (staleTime longo)
5. **Índices compostos** para queries frequentes

### Código
1. Seguir padrão existente: hooks com React Query, services separados, types tipados
2. Um arquivo por componente em `src/components/admin/automation/`
3. Um hook por concern: automações, execuções, templates, stats
4. Imports com alias `@/`
5. Componentes shadcn/ui do diretório `src/components/ui/`

## Workflows de Referência

### Pipeline de Conteúdo (WF-01 a WF-07)
```
WF-01 Coleta (RSS, 30min) → news_staging
WF-02 Deduplicação (20min) → news_clusters
WF-03 Enriquecimento (LLM) → clusters + entities + confidence
WF-04 Escrita AI → curated_posts (draft)
WF-05 Regras Editoriais → score + compliance
WF-06 Publicação → posting_queue → portal
WF-07 Métricas → editorial_feedback → loop de aprendizagem
```

### Email (WF-EMAIL-01 a 05)
```
WF-EMAIL-01 Newsletter → compilar top posts → enviar via SMTP
WF-EMAIL-02 Alerta Post → trigger on publish → notificar subscribers
WF-EMAIL-03 Digest → resumo semanal personalizado
WF-EMAIL-04 Boas-Vindas → trigger on signup → onboarding flow
WF-EMAIL-05 Reengajamento → users inativos 30d → campanha
```

### Auditoria (WF-AUDIT-01 a 04)
```
WF-AUDIT-01 Chaves → verificar expiração → alertar → rotar
WF-AUDIT-02 Acessos → login audit → anomalias → alerta
WF-AUDIT-03 RLS → verificar policies → relatório
WF-AUDIT-04 Vulnerabilidades → scan endpoints → relatório
```

## Como Usar Esta Skill
Ative quando trabalhar com:
- Qualquer feature da dashboard de automações
- Criação ou edição de workflows n8n
- Design de novas automações (qualquer categoria)
- Templates e configuração de automações
- Monitoramento e troubleshooting de execuções
- Integração entre automações e outros módulos (CMS, Auth, etc.)

## Referências
- SDD: `sdd/modules/automation-engine.json`
- SDD legacy: `sdd/modules/automation-n8n.json`
- Pipeline docs: `docs/planejamento/FLUXO_INTELIGENTE_POSTS_N8N.md`
- Workflows: `infra/n8n/workflows/`
- Edge Functions: `supabase/functions/n8n-proxy/`, `supabase/functions/n8n-settings/`

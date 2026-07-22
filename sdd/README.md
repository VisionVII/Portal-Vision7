# Vision7 — Spec-Driven Development (SDD)

> Atualizado: 20 de Julho de 2026

## Status dos Módulos

> Gerado a partir de `bash sdd/scripts/sdd-status.sh` — corre esse comando para o estado ao vivo.

| Módulo | Versão | Status |
|--------|--------|--------|
| Supabase & Database | 1.3.5 | ✅ Finalizado |
| Auth & Segurança | 2.0.0 | 🟡 Production Design Ready — nova arquitectura (Security Gate, risk engine, RBAC dinâmico) desenhada, substitui o v1.3.0 finalizado; ver `sdd/modules/auth-security.json` |
| Agregador de Notícias | 1.1.0 | ✅ Finalizado |
| Tags & Taxonomia | 1.0.1 | ✅ Finalizado |
| CMS | 1.2.0 | ✅ Finalizado |
| Frontend & UI | 1.3.0 | ✅ Finalizado |
| Design System | 1.0.0 | ✅ Ativo |
| Automation Engine v2 | 2.4.0 | 🟡 Em produção — todos os FRs/NFRs implementados; FR-016 (callback de erro) com código pronto mas a aguardar import manual do workflow no n8n (Render) |
| Analytics | 0.5.0 | 🟡 Em desenvolvimento |
| Agents & Skills AI | 0.8.0 | 🟡 Em desenvolvimento |
| CI/CD & DevOps | 0.3.0 | 🟡 Em desenvolvimento |
| Portal Assistant | 0.1.0 | 🟡 Em desenvolvimento |
| Tutorial de Onboarding (Admin) | 0.1.0 | 🟡 Em desenvolvimento — ver `sdd/modules/admin-onboarding.json` |
| Automação n8n (Legacy v1) | 1.1.0 | ⛔ Depreciado — substituído por Automation Engine v2 |

⚠️ `bash sdd/scripts/sdd-stale-check.sh` reporta a maioria dos módulos com specs desactualizados
face ao código (código mudou depois da última actualização do spec) — corre o script para o detalhe
por módulo antes de confiar cegamente nas versões acima.

## Estrutura

```
sdd/
├── sdd_index.json              # Índice central de todos os módulos
├── README.md                   # Este arquivo
├── templates/
│   ├── module_template.json    # Template JSON para novos módulos
│   ├── module_template.md      # Template Markdown alternativo
│   └── module_schema.json      # JSON Schema para validação
├── modules/
│   ├── news-aggregator.json    # Agregador de Notícias
│   ├── cms.json                # CMS
│   ├── frontend-ui.json        # Frontend & UI
│   ├── design-system.json      # Design System
│   ├── automation-n8n.json     # Automação n8n (Legacy v1 — depreciado)
│   ├── automation-engine.json  # Automation Engine v2 (substitui automation-n8n)
│   ├── analytics.json          # Analytics
│   ├── tags-taxonomy.json      # Tags & Taxonomia
│   ├── auth-security.json      # Auth & Segurança
│   ├── supabase-database.json  # Supabase & Database
│   ├── agents-skills-ai.json   # Agents & Skills AI
│   ├── cicd-devops.json        # CI/CD & DevOps
│   ├── portal-assistant.json   # Portal Assistant
│   └── admin-onboarding.json   # Tutorial de Onboarding (Admin)
├── scripts/
│   ├── sdd-validate.sh         # Validação de specs (CI/CD)
│   ├── sdd-stale-check.sh      # Detecção de specs desatualizados
│   ├── sdd-sync.sh             # Sincronização de file lists
│   ├── sdd-version.sh          # Gestão de versões
│   └── sdd-status.sh           # Dashboard de status
└── diagrams/
    └── (architecture diagrams)
```

## Comandos

| Comando | Descrição |
|---------|-----------|
| `bash sdd/scripts/sdd-validate.sh` | Valida todos os specs contra o schema |
| `bash sdd/scripts/sdd-validate.sh --strict` | Validação estrita (warnings = falha) |
| `bash sdd/scripts/sdd-stale-check.sh` | Verifica specs desatualizados (padrão: 30 dias) |
| `bash sdd/scripts/sdd-stale-check.sh --days=60` | Threshold customizado |
| `bash sdd/scripts/sdd-sync.sh` | Sincroniza file lists de todos os módulos |
| `bash sdd/scripts/sdd-sync.sh cms` | Sincroniza módulo específico |
| `bash sdd/scripts/sdd-sync.sh all --dry-run` | Preview sem alterar arquivos |
| `bash sdd/scripts/sdd-version.sh list` | Lista versões de todos os módulos |
| `bash sdd/scripts/sdd-version.sh bump cms minor` | Bump de versão minor |
| `bash sdd/scripts/sdd-version.sh diff auth-security` | Changelog do módulo |
| `bash sdd/scripts/sdd-status.sh` | Dashboard completo |

## Fluxo de Trabalho

### Adicionar novo módulo
1. Copiar `templates/module_template.json`
2. Preencher campos obrigatórios
3. Adicionar entrada em `sdd_index.json`
4. Executar `sdd-validate.sh` para verificar

### Atualizar módulo existente
1. Editar `modules/<module>.json`
2. Atualizar `last_updated` e `change_history`
3. Executar `sdd-sync.sh <module-id>` para sincronizar files
4. Executar `sdd-validate.sh` para verificar

### Antes de PR
1. `sdd-sync.sh all --dry-run` — verificar drift
2. `sdd-validate.sh` — validar specs
3. Se necessário: `sdd-version.sh bump <module> patch`

## CI/CD

A pipeline GitHub Actions (`.github/workflows/sdd-ci.yml`) executa automaticamente:

| Job | Trigger | Ação |
|-----|---------|------|
| `lint-typecheck` | PR/Push main | ESLint + TypeScript |
| `build` | PR/Push main | Build Vite produção |
| `sdd-validate` | PR/Push main | Validação de specs |
| `sdd-sync-check` | PR only | Detecção de drift |

## Grafo de Dependências

```
Layer 0: [Supabase & Database]
    ↓
Layer 1: [Auth & Segurança] [Tags & Taxonomia]
    ↓
Layer 2: [Agregador de Notícias] [Analytics]
    ↓
Layer 3: [CMS] [Automation Engine v2]
      ↓
Layer 4: [Frontend & UI]
    ↓
Layer 5: [CI/CD & DevOps] [Agents & Skills AI]
```

## Sincronização

O SDD sincroniza com estas camadas do projeto:

| Camada | Fonte | Módulos Afetados |
|--------|-------|------------------|
| Database | `supabase/migrations/` | Supabase, Auth, News, Analytics |
| Frontend | `src/pages/`, `src/components/` | Frontend, CMS |
| API/Services | `src/services/`, `src/hooks/` | Automação, Analytics, News |
| Segurança | `AuthContext.tsx`, `*roles*` migrations | Auth & Segurança |
| Automação | `n8n.ts`, `automation.ts` | Automação, CI/CD |

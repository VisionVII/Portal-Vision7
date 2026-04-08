# Índice de Documentação: Integração n8n + Dashboard Automações

**Versão:** 1.0  
**Data:** Abril 7, 2026  
**Escopo:** Vision7 Portal - Automações avançadas  

---

## 📚 Documentos por Ordem de Leitura

### 🔴 COMEÇAR AQUI (Urgência máxima - 3 dias)

1. **RESUMO_EXECUTIVO_N8N.md**
   - Propósito: O que, por quê, quando, próximos passos
   - Tempo: 10 min
   - Ação: Revisar hoje e começar CHECKLIST
   - Link: `/docs/planejamento/RESUMO_EXECUTIVO_N8N.md`

2. **CHECKLIST_TOKENS_3DIAS.md**
   - Propósito: Passos imediatos dia 1, 2, 3
   - Tempo: Dia 1 (2h), Dia 2 (1.5h), Dia 3 (1.5h)
   - Ação: Executar hoje (gerar tokens)
   - Link: `/docs/planejamento/CHECKLIST_TOKENS_3DIAS.md`

### 🟡 REFERÊNCIA TÉCNICA (Planejamento)

3. **ARQUITETURA_N8N_VISUAL.md**
   - Propósito: Diagramas ASCII de fluxos e arquitetura
   - Tempo: 15 min (visão geral)
   - Ação: Ler para entender fluxo de dados
   - Link: `/docs/planejamento/ARQUITETURA_N8N_VISUAL.md`

4. **PLANO_INTEGRACAO_N8N_AVANCADA.md**
   - Propósito: Especificação técnica COMPLETA
   - Tempo: 30-45 min (referência profunda)
   - Ação: Consultar durante implementação
   - Link: `/docs/planejamento/PLANO_INTEGRACAO_N8N_AVANCADA.md`
   - Seções:
     - Segurança & Tokens
     - PostgreSQL Setup
     - Iframe + SSO
     - Workflows CRUD
     - RLS Policies
     - Rate Limiting
     - Auditoria

### 🟢 CONTEXTO HISTÓRICO (Referência)

5. **GUIA_N8N_PERSISTENCIA_ADMIN.md**
   - Propósito: Guia original de persistência
   - Status: Parcialmente incorporado em #4
   - Ação: Referência apenas se dúvidas específicas
   - Link: `/docs/planejamento/GUIA_N8N_PERSISTENCIA_ADMIN.md`

6. **FASE_AUTOMACAO_SEGURANCA_N8N.md**
   - Propósito: Contexto original da fase de automação
   - Status: Baseline para plano atual
   - Ação: Referência apenas se contexto histórico
   - Link: `/docs/planejamento/FASE_AUTOMACAO_SEGURANCA_N8N.md`

---

## 📊 Documentação por Tópico

### Segurança & Tokens
| Doc | Seção | Link |
|-----|-------|------|
| RESUMO_EXECUTIVO_N8N.md | Dados Sensíveis | [🔗](#) |
| CHECKLIST_TOKENS_3DIAS.md | DIA 1 - Tokens | [🔗](#) |
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 1: Segurança | [🔗](#) |

### PostgreSQL Persistência
| Doc | Seção | Link |
|-----|-------|------|
| CHECKLIST_TOKENS_3DIAS.md | DIA 2 - PostgreSQL | [🔗](#) |
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 2: Persistência | [🔗](#) |
| GUIA_N8N_PERSISTENCIA_ADMIN.md | Tabelas + RLS | [🔗](#) |

### Iframe + SSO
| Doc | Seção | Link |
|-----|-------|------|
| CHECKLIST_TOKENS_3DIAS.md | DIA 3 - Interface SSO | [🔗](#) |
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 3: Iframe + SSO | [🔗](#) |
| ARQUITETURA_N8N_VISUAL.md | Fluxo: SSO Iframe | [🔗](#) |

### Workflows CRUD
| Doc | Seção | Link |
|-----|-------|------|
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 4: Workflows CRUD | [🔗](#) |
| ARQUITETURA_N8N_VISUAL.md | Fluxo: Criar Workflow | [🔗](#) |

### Rate Limiting & RLS
| Doc | Seção | Link |
|-----|-------|------|
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 5: Segurança RLS | [🔗](#) |
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 5.2: Rate Limiting | [🔗](#) |

### Auditoria
| Doc | Seção | Link |
|-----|-------|------|
| PLANO_INTEGRACAO_N8N_AVANCADA.md | Seção 5.3: Audit Logging | [🔗](#) |

---

## 📋 Checklist de Leitura Recomendada

### Para Victor Gonçalves (Proprietário)
- [x] RESUMO_EXECUTIVO_N8N.md (10 min) → Entender scope
- [x] ARQUITETURA_N8N_VISUAL.md (15 min) → Ver diagramas
- [ ] CHECKLIST_TOKENS_3DIAS.md (Hoje) → Executar Dia 1
- [ ] PLANO_INTEGRACAO_N8N_AVANCADA.md (referência)

### Para Dev implementando
- [x] RESUMO_EXECUTIVO_N8N.md (10 min) → Contexto
- [x] CHECKLIST_TOKENS_3DIAS.md (30 min) → Passos Dia 1-3
- [x] ARQUITETURA_N8N_VISUAL.md (20 min) → Fluxos técnicos
- [x] PLANO_INTEGRACAO_N8N_AVANCADA.md (45 min) → Spec técnica detalhada
- [ ] GUIA_N8N_PERSISTENCIA_ADMIN.md (referência conforme necessário)

### Para QA/Testes
- [x] RESUMO_EXECUTIVO_N8N.md (10 min) → Entender features
- [x] ARQUITETURA_N8N_VISUAL.md (20 min) → Fluxos de teste
- [ ] CHECKLIST_TOKENS_3DIAS.md (referência)
- [ ] PLANO_INTEGRACAO_N8N_AVANCADA.md → Seção testes

---

## 🎯 Documentação por Fase

### FASE 1: Segurança & Tokens + PostgreSQL (Semana 1)
**Ler:**
- RESUMO_EXECUTIVO_N8N.md (seção "Cronograma")
- CHECKLIST_TOKENS_3DIAS.md (Dia 1, 2)
- PLANO_INTEGRACAO_N8N_AVANCADA.md (Seções 1-2)

**Implementar:**
- Gerar tokens (Dia 1)
- PostgreSQL setup (Dia 2)

---

### FASE 2: Interface + Workflows (Semana 2)
**Ler:**
- CHECKLIST_TOKENS_3DIAS.md (Dia 3)
- PLANO_INTEGRACAO_N8N_AVANCADA.md (Seções 3-4)
- ARQUITETURA_N8N_VISUAL.md (Fluxo SSO + Criar Workflow)

**Implementar:**
- Edge Function n8n-sso-token
- AdminN8nBuilder.tsx
- Workflows CRUD

---

### FASE 3: Avançado (Semana 3)
**Ler:**
- PLANO_INTEGRACAO_N8N_AVANCADA.md (Seções 5-6)
- ARQUITETURA_N8N_VISUAL.md (Call n8n API com Segurança)

**Implementar:**
- Rate limiting
- RLS policies
- Auditoria logging
- Testes

---

## 📁 Estrutura Física dos Arquivos

```
/docs/planejamento/
├─ RESUMO_EXECUTIVO_N8N.md             ← START HERE
├─ CHECKLIST_TOKENS_3DIAS.md           ← AÇÃO IMEDIATA
├─ ARQUITETURA_N8N_VISUAL.md           ← DIAGRAMAS
├─ PLANO_INTEGRACAO_N8N_AVANCADA.md    ← REFERÊNCIA TÉCNICA
├─ GUIA_N8N_PERSISTENCIA_ADMIN.md      ← HISTÓRICO
└─ FASE_AUTOMACAO_SEGURANCA_N8N.md     ← HISTÓRICO

/sdd/modules/
└─ automation-n8n.json                 ← SDD official module

/src/pages/admin/
├─ AdminAutomation.tsx                 ← Dashboard atual

/src/components/admin/
├─ AdminAutomationPanel.tsx            ← Panel atual

/src/services/
├─ n8n.ts                              ← Service n8n

/supabase/migrations/
├─ 20260405200000_add_automations_table.sql
└─ (futuros: n8n_projects, audit_logs, etc)
```

---

## 🔗 Links Rápidos

### Documentação Interna
- [Índice Documentação Master](../visao-geral/INDICE_DOCUMENTACAO.md)
- [Roles & Permissions](../referencia/DOCUMENTACAO_ROLES_PERMISSIONS.md)
- [Análise Arquitetura](../seguranca/ANALISE_ARQUITETURA_COMPLETA.md)

### Documentação Externa
- [n8n Docs](https://docs.n8n.io/)
- [n8n API Reference](https://docs.n8n.io/api/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Repositórios
- **Repo:** VisionVII/Portal-Vision7
- **Branch:** test/deploy-validacao
- **MCP n8n:** https://n8n-vision7.onrender.com/mcp-server/http

---

## 📞 Contacto & Suporte

**Proprietário:** Victor Gonçalves  
**Email:** visionvidevgrid@proton.me  
**Projeto:** Vision7 Portal - Automações  

**Como usar estes documentos:**
1. Comece com RESUMO_EXECUTIVO_N8N.md (10 min)
2. Siga CHECKLIST_TOKENS_3DIAS.md (hoje)
3. Use PLANO_INTEGRACAO_N8N_AVANCADA.md como referência durante dev
4. Consulte ARQUITETURA_N8N_VISUAL.md para diagramas

---

## ✅ Checklist de Validação

- [x] RESUMO_EXECUTIVO_N8N.md criado
- [x] CHECKLIST_TOKENS_3DIAS.md criado
- [x] ARQUITETURA_N8N_VISUAL.md criado
- [x] PLANO_INTEGRACAO_N8N_AVANCADA.md criado
- [x] Este índice criado
- [x] Documentação salvo em memória de sessão
- [ ] Victor revisar e dar feedback
- [ ] Começar FASE 1 (Dia 1: Gerar tokens)

---

## Versão & Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 07/04/2026 | Copilot | Documentação inicial completa |
| TBD | TBD | Victor | Feedback + ajustes |
| TBD | TBD | Dev | Atualizações durante implementação |

---

**Última atualização:** 07/04/2026  
**Status:** ✅ Pronto para Fase 1  
**Próximo passo:** CHECKLIST_TOKENS_3DIAS.md (Hoje - Dia 1)

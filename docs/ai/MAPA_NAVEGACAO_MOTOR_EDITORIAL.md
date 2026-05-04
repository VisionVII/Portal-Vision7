# 🗺️ MAPA DE NAVEGAÇÃO — MOTOR EDITORIAL VISION7

## Você Está Aqui?

```
                    ┌─────────────────────────────────┐
                    │  MOTOR EDITORIAL VISION7 v1.0   │
                    │  Documentação Completa          │
                    └──────────────┬────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
          ┌─────▼────┐      ┌──────▼──────┐    ┌─────▼────┐
          │  NOVO NA  │      │  ENGENHEIRO │    │  REVISOR │
          │  EQUIPA?  │      │  / DEVOPS?  │    │ EDITORIAL│
          └─────┬────┘      └──────┬──────┘    └─────┬────┘
                │                  │                  │
                ▼                  ▼                  ▼
           [GETTING            [INTEGRACAO        [CHECKLIST
            STARTED]              N8N]            VALIDACAO]
              5min             30–45min              2min
```

---

## 📚 Documentos & Fluxo de Leitura

### **Se é seu PRIMEIRO dia:**
1. ⏱️ **5 min** — [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md)
   - O que é o motor
   - Fluxo 3-passos básico
   - Rol específico (redator, operador, revisor)

2. ⏱️ **10 min** — [SUMARIO_MOTOR_EDITORIAL.md](./SUMARIO_MOTOR_EDITORIAL.md)
   - Visão geral técnica
   - Arquitetura
   - KPIs

### **Se vai REDACTAR artigos:**
1. ⏱️ **45–60 min** — [MOTOR_EDITORIAL_V1.0.md](./MOTOR_EDITORIAL_V1.0.md)
   - Identidade editorial
   - Estrutura completa
   - SEO/AEO
   - Padrões por categoria
   - Prompt Master

2. ⏱️ **5 min** — [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md)
   - Antes de enviar cada artigo

### **Se vai INTEGRAR n8n:**
1. ⏱️ **30–45 min** — [MOTOR_EDITORIAL_INTEGRACAO_N8N.md](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md)
   - Nodes n8n recomendados
   - JSON schema completo
   - Edge Function validações

2. ⏱️ **5 min** — [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md)
   - Troubleshooting se erro

### **Se vai REVISAR/VALIDAR:**
1. ⏱️ **2 min** — [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md)
   - Validação rápida
   - Erros críticos
   - Campo-a-campo

---

## 📖 Descrição de Cada Documento

```
┌────────────────────────────────────────────────────────────────────────┐
│ ARQUIVO: GETTING_STARTED_MOTOR_EDITORIAL.md                           │
├────────────────────────────────────────────────────────────────────────┤
│ Secções:                                                               │
│  1. O que é? (30 segundos)                                             │
│  2. Pré-requisitos (1 min)                                             │
│  3. Fluxo 3-passos (2 min)                                             │
│  4. Como escrever (5 min) — template base                              │
│  5. Como executar WF-02 (3 min)                                        │
│  6. Como validar (5 min)                                               │
│  7. Troubleshooting (3 min)                                            │
│ Tempo total: 5–10 minutos                                              │
│ Público: Todos (novo) ✨                                               │
│ Depois ler: MOTOR_EDITORIAL_V1.0.md para detalhes                      │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ ARQUIVO: MOTOR_EDITORIAL_V1.0.md                                       │
├────────────────────────────────────────────────────────────────────────┤
│ Secções:                                                               │
│  1. Identidade Editorial (tom, voz, público)                           │
│  2. Estrutura Base do Artigo (anatomia, dimensões, lead, ToC)         │
│  3. Sistema SEO/AEO (keywords, meta, FAQs, entidades, estrutura)      │
│  4. Sistema de Links (internos, externos, padrões de anchor)          │
│  5. Formatos de Texto (headings, parágrafos, listas, tabelas)         │
│  6. Imagem de Capa (Dark Cinematic, dimensões, paletas)               │
│  7. Padrões por Categoria (6 categorias, entidades, ângulo)           │
│  8. Checklist de Qualidade (30 critérios, pontuação)                  │
│  9. Prompt Master (prompt a usar em Claude para geração)              │
│ 10. JSON Schema de Saída (campos, tipos, exemplos)                    │
│ Tempo total: 45–60 minutos                                             │
│ Público: Redatores, Prompt Engineers, Engenheiros                     │
│ Depois usar: Para redigir artigos ou atualizar Prompt Master          │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ ARQUIVO: MOTOR_EDITORIAL_INTEGRACAO_N8N.md                            │
├────────────────────────────────────────────────────────────────────────┤
│ Secções:                                                               │
│  1. Resumo de Integração (1 frase)                                     │
│  2. Fluxo Completo (diagrama visual)                                   │
│  3. Que o Motor Deve Enviar (21 campos JSON)                           │
│  4. Implementação no n8n (nodes recomendados, workflow)               │
│  5. Validações da Edge Function (checklist técnico)                   │
│  6. Exemplo cURL (para testar)                                        │
│  7. Troubleshooting (erros comuns, resoluções)                        │
│ Tempo total: 30–45 minutos                                             │
│ Público: DevOps, Engenheiros n8n, Integradores                        │
│ Depois usar: Para configurar WF-02                                    │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ ARQUIVO: CHECKLIST_VALIDACAO_EDITORIAL.md                             │
├────────────────────────────────────────────────────────────────────────┤
│ Secções:                                                               │
│  1. Validação 2-Minutos (8 áreas de check)                            │
│  2. Erros Críticos (rejeitar imediatamente)                           │
│  3. Campo-a-Campo Rápido (tabela de validação)                        │
│  4. Ajustes Rápidos (se score 8.5–9.4)                                │
│  5. Distribuição Recomendada (conteúdo)                               │
│  6. Quality Score Breakdown (cálculo automático)                       │
│  7. Antes de Enviar (checklist JSON final)                            │
│  8. cURL de Teste (como enviar)                                       │
│  9. Troubleshooting (FAQ)                                             │
│ Tempo total: 5–10 minutos                                              │
│ Público: QA, Operadores n8n, Revisores                                │
│ Depois usar: Antes de cada publicação                                 │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ ARQUIVO: SUMARIO_MOTOR_EDITORIAL.md                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Secções:                                                               │
│  1. Objetivo (1 frase)                                                 │
│  2. Documentação (tabela de 4 arquivos)                                │
│  3. Arquitetura Técnica (diagrama visual)                             │
│  4. Especificação Técnica (campos, quality score calc)                │
│  5. Padrões por Categoria (tabela 6 categorias)                       │
│  6. Fluxo de Publicação (3 passos)                                    │
│  7. Validações (checklist de Edge Function)                           │
│  8. Segurança & Permissões                                            │
│  9. Requisitos Técnicos (variáveis, modelos IA)                      │
│ 10. KPIs de Monitoramento (métricas)                                  │
│ Tempo total: 15–20 minutos                                             │
│ Público: Gestão, Liderança Técnica, Stakeholders                      │
│ Depois usar: Para entender status & roadmap                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Matriz de Público-Alvo × Documentos

```
┌──────────────────────────────┬──────────┬─────────────┬────────────┬─────────┐
│ Rol                          │ Getting  │ Motor v1.0  │ Integração │ Check   │
│                              │ Started  │             │ n8n        │ list    │
├──────────────────────────────┼──────────┼─────────────┼────────────┼─────────┤
│ Novo na Equipa               │ ✅ PRIMEIRO │ Depois      │ Não        │ Sim     │
│ Redator Editorial            │ Sim      │ ✅ LEITURA  │ Não        │ Sim     │
│ Prompt Engineer              │ Sim      │ ✅ LEITURA  │ Sim        │ Sim     │
│ Engenheiro n8n               │ Sim      │ Referência  │ ✅ LEITURA  │ Sim     │
│ DevOps / Infra               │ Sim      │ Referência  │ ✅ LEITURA  │ Sim     │
│ QA / Revisor Editorial       │ Sim      │ Referência  │ Não        │ ✅ LEITURA
│ Gestor de Projecto           │ Sim      │ Sumário     │ Sumário    │ Não     │
└──────────────────────────────┴──────────┴─────────────┴────────────┴─────────┘
```

---

## 🚀 Próximos Passos Recomendados

### Hoje (0 dias)
1. ⏱️ 5 min — Ler [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md)
2. ⏱️ 10 min — Ler [SUMARIO_MOTOR_EDITORIAL.md](./SUMARIO_MOTOR_EDITORIAL.md)

### Amanhã (1 dia)
3. ⏱️ 45 min — Ler [MOTOR_EDITORIAL_V1.0.md](./MOTOR_EDITORIAL_V1.0.md) (se redator/prompt eng)
   - OU ler [MOTOR_EDITORIAL_INTEGRACAO_N8N.md](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md) (se engenheiro)

### Semana 1
4. Executar primeiro workflow com briefing teste
5. Validar resultado com [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md)

### Semana 2
6. Deploy a staging (Edge Function + migrations)
7. End-to-end testing com 5 artigos

### Semana 3
8. Deploy a produção + monitoring

---

## 🔗 Referências Cruzadas

**Motor Editorial v1.0 referencia:**
- Prompt Master → `docs/ai/MOTOR_EDITORIAL_V1.0.md § 9`
- JSON Schema → `docs/ai/MOTOR_EDITORIAL_V1.0.md § 10`
- Edge Function → `supabase/functions/ingest-manus-post/index.ts`
- Migrations → `supabase/migrations/20260503110000_*.sql`
- API Spec → `docs/ai/MANUS_INGEST_SPEC.md`

---

## 📞 Suporte & Escalation

| Questão | Documento | Secção |
|---------|-----------|--------|
| "Como escrevo um artigo?" | MOTOR_EDITORIAL_V1.0.md | § 2, 5, 7 |
| "Qual é o prompt para Claude?" | MOTOR_EDITORIAL_V1.0.md | § 9 |
| "Qual é o JSON esperado?" | MOTOR_EDITORIAL_INTEGRACAO_N8N.md | § 3 |
| "Como configuro n8n?" | MOTOR_EDITORIAL_INTEGRACAO_N8N.md | § 4 |
| "Score baixo — o que faço?" | CHECKLIST_VALIDACAO_EDITORIAL.md | § 4, Troubleshooting |
| "Erro X no Edge Function?" | CHECKLIST_VALIDACAO_EDITORIAL.md | § Troubleshooting |
| "Estatísticas e KPIs?" | SUMARIO_MOTOR_EDITORIAL.md | § KPIs de Monitoramento |

---

## ✅ Documento Completo

```
📦 Motor Editorial Vision7 v1.0
├── 📄 README.md (atualizado com links)
├── 🎓 GETTING_STARTED_MOTOR_EDITORIAL.md (5–10 min)
├── 📚 MOTOR_EDITORIAL_V1.0.md (45–60 min)
├── 🔧 MOTOR_EDITORIAL_INTEGRACAO_N8N.md (30–45 min)
├── ✅ CHECKLIST_VALIDACAO_EDITORIAL.md (5–10 min)
├── 📊 SUMARIO_MOTOR_EDITORIAL.md (15–20 min)
└── 🗺️ Este Arquivo (você está aqui!)
```

**Status:** ✅ Documentação Completa | Pronto para Implementação

---

*Mapa de Navegação — Motor Editorial Vision7 v1.0*  
*Última atualização: Maio 2026*

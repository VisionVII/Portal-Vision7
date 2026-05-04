# 📑 ÍNDICE — DOCUMENTAÇÃO MOTOR EDITORIAL VISION7

## 🚀 COMECE AQUI

### Seu Tempo Disponível?

**⏱️ 5 minutos?**  
→ Leia [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md)

**⏱️ 15 minutos?**  
→ Leia acima + [SUMARIO_MOTOR_EDITORIAL.md](./SUMARIO_MOTOR_EDITORIAL.md)

**⏱️ 1 hora?**  
→ Leia tudo em [MAPA_NAVEGACAO_MOTOR_EDITORIAL.md](./MAPA_NAVEGACAO_MOTOR_EDITORIAL.md)

---

## 📚 6 DOCUMENTOS MOTOR EDITORIAL

| # | Arquivo | Propósito | Tempo | Abrir |
|---|---------|-----------|-------|-------|
| 1 | **GETTING_STARTED_MOTOR_EDITORIAL.md** | Onboarding 5–10 min | 5 min | [→](./GETTING_STARTED_MOTOR_EDITORIAL.md) |
| 2 | **MOTOR_EDITORIAL_V1.1.md** | Especificação completa | 45–60 min | [→](./MOTOR_EDITORIAL_V1.1.md) |
| 3 | **MOTOR_EDITORIAL_INTEGRACAO_N8N.md** | Integração técnica | 30–45 min | [→](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md) |
| 4 | **CHECKLIST_VALIDACAO_EDITORIAL.md** | Validação rápida | 5–10 min | [→](./CHECKLIST_VALIDACAO_EDITORIAL.md) |
| 5 | **SUMARIO_MOTOR_EDITORIAL.md** | Visão geral técnica | 15–20 min | [→](./SUMARIO_MOTOR_EDITORIAL.md) |
| 6 | **MAPA_NAVEGACAO_MOTOR_EDITORIAL.md** | Mapa completo | 10–15 min | [→](./MAPA_NAVEGACAO_MOTOR_EDITORIAL.md) |

---

## 👤 QUAL É O SEU ROL?

### 🎓 Sou Novo na Equipa
**Ordem de Leitura:**
1. [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) (5 min)
2. [SUMARIO_MOTOR_EDITORIAL.md](./SUMARIO_MOTOR_EDITORIAL.md) (15 min)
3. Depois escolha: redator → v1.0 | engenheiro → integração n8n

### 📝 Sou Redator/Jornalista
**Ordem de Leitura:**
1. [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) (5 min) — fluxo básico
2. [MOTOR_EDITORIAL_V1.1.md](./MOTOR_EDITORIAL_V1.1.md) (45 min) — **LEITURA OBRIGATÓRIA**
3. [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md) (5 min) — antes de publicar cada artigo

### 🔧 Sou Engenheiro n8n / DevOps
**Ordem de Leitura:**
1. [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) (5 min) — contexto geral
2. [MOTOR_EDITORIAL_INTEGRACAO_N8N.md](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md) (45 min) — **LEITURA OBRIGATÓRIA**
3. [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md) (5 min) — troubleshooting

### ✅ Sou Revisor Editorial / QA
**Ordem de Leitura:**
1. [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) (5 min) — contexto
2. [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md) (5 min) — **LEITURA OBRIGATÓRIA** (usar diariamente)
3. [MOTOR_EDITORIAL_V1.1.md](./MOTOR_EDITORIAL_V1.1.md) § 8 (15 min) — critérios de qualidade

### 📊 Sou Gestor / Liderança
**Ordem de Leitura:**
1. [SUMARIO_MOTOR_EDITORIAL.md](./SUMARIO_MOTOR_EDITORIAL.md) (15 min) — **LEITURA OBRIGATÓRIA**
2. [MAPA_NAVEGACAO_MOTOR_EDITORIAL.md](./MAPA_NAVEGACAO_MOTOR_EDITORIAL.md) (10 min) — roadmap

---

## ✨ FUNCIONALIDADES PRINCIPAIS

```
✅ Geração automática de artigos (n8n WF-02)
✅ Validação de qualidade automática (30 critérios)
✅ Multi-categoria (post_categories junction)
✅ SEO/AEO otimizado (keywords, meta, FAQs, entidades)
✅ Quality Score (0–10, ≥9.5 = publicável)
✅ Imagens Dark Cinematic (prompt-to-image)
✅ Dual-format support (Editorial v1.0 + Simples)
✅ Edge Function validation (ingest-manus-post)
✅ JSON schema versionado (v1.0)
```

---

## 🎯 FLUXO DE PUBLICAÇÃO (3 PASSOS)

```
1️⃣  Criar briefing em Notion
    ↓
2️⃣  Executar n8n WF-02 (automático — 3–5 min)
    ↓
3️⃣  Artigo publicado + Score no portal
```

---

## 🔍 QUALITY SCORE

```
Estrutura      30%  →  H1, ToC, H2s, lead, Portugal, previsão
SEO/AEO        25%  →  Keywords, meta, FAQs, entidades
Dados/Fontes   20%  →  Dados/secção, links primários
Links          10%  →  Internos, externos contextuais
Formato        10%  →  Parágrafos, listas, tabelas, negrito
Tom             5%  →  Analítico, sem clichés, CTA valor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total       = 0–10   (≥9.5 = publicável)
```

---

## 🏗️ ARQUITETURA (VERSÃO SIMPLIFICADA)

```
Notion (briefing)
    ↓
n8n WF-02 (Edgar, Claude, validação)
    ↓
Supabase Edge Function (ingest-manus-post)
    ↓
Database posts + post_categories
    ↓
Portal Frontend (exibição)
```

---

## 📋 CHECKLIST ANTES DE PUBLICAR

- [ ] H1 entre 55–65 caracteres exactos
- [ ] Meta description entre 145–155 caracteres exactos
- [ ] Slug único, sem acentos, 6 palavras max
- [ ] Lead máximo 60 palavras
- [ ] ToC com âncoras funcionais
- [ ] 5+ secções H2 (3+ para notícia)
- [ ] Cada H2 tem 1+ dado com fonte
- [ ] Portugal com 3 cenários (optimista, base, pessimista)
- [ ] 1+ previsão datada
- [ ] 2–4 FAQs com respostas ≤55 palavras
- [ ] 3–5 links internos contextuais
- [ ] 2–4 links externos (fontes primárias)
- [ ] Tom analítico (não apenas descritivo)
- [ ] Nenhum cliché de abertura
- [ ] Quality Score ≥ 9.5

---

## 📞 DÚVIDAS RÁPIDAS

**P: Como começo?**  
R: Leia [GETTING_STARTED_MOTOR_EDITORIAL.md](./GETTING_STARTED_MOTOR_EDITORIAL.md) (5 min)

**P: Qual é a estrutura de um artigo?**  
R: Veja [MOTOR_EDITORIAL_V1.1.md](./MOTOR_EDITORIAL_V1.1.md) § 2

**P: Como valido um artigo?**  
R: Use [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md) (2 min)

**P: Como integro n8n?**  
R: Leia [MOTOR_EDITORIAL_INTEGRACAO_N8N.md](./MOTOR_EDITORIAL_INTEGRACAO_N8N.md)

**P: Score baixo, o que faço?**  
R: Veja Troubleshooting em [CHECKLIST_VALIDACAO_EDITORIAL.md](./CHECKLIST_VALIDACAO_EDITORIAL.md)

---

## 🚀 STATUS

```
✅ Documentação       — 100% Completa (6 arquivos)
✅ JSON Schema       — Versionado (v1.0)
✅ Edge Function     — Dual-format support pronto
✅ Quality Scoring   — 30 critérios definidos
⏳ n8n WF-02         — Aguarda atualização
⏳ Deployment        — Aguarda fase de testes
```

---

## 📖 DOCUMENTOS RELACIONADOS

- **API Spec:** [MANUS_INGEST_SPEC.md](./MANUS_INGEST_SPEC.md)
- **Agentes AI:** [README.md](./README.md)
- **Migrations:** `supabase/migrations/20260503110000_*.sql`
- **Edge Function:** `supabase/functions/ingest-manus-post/index.ts`

---

**Motor Editorial Vision7 v1.0**  
**Documentação Completa & Pronta para Produção** 🚀

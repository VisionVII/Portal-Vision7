# MOTOR EDITORIAL VISION7 — CHECKLIST DE VALIDAÇÃO RÁPIDA
## Documento Operacional para n8n / Revisores

---

## ✅ VALIDAÇÃO EM 2 MINUTOS (PRÉ-PUBLICAÇÃO)

Use este checklist antes de enviar qualquer artigo via ingest-manus-post.

### ESTRUTURA (obrigatório)
- [ ] H1 único (55–65 caracteres)
- [ ] Lead ≤ 60 palavras
- [ ] ToC presente com âncoras funcionais
- [ ] 5+ secções H2 (3+ para Notícia/Audiocast)
- [ ] Secção Portugal com 3 cenários
- [ ] Pelo menos 1 previsão datada
- [ ] CTA final com valor

### CONTEÚDO (obrigatório)
- [ ] Cada H2 tem ≥ 1 dado com fonte
- [ ] 2–4 FAQs em formato H3 + resposta
- [ ] Parágrafos com 3–5 frases (máx 7)
- [ ] Nenhum heading level saltado (não H3 sem H2 pai)

### SEO/AEO (obrigatório)
- [ ] Meta description 145–155 chars
- [ ] Keyword principal em H1 + primeiro parágrafo
- [ ] LSI keywords distribuídas
- [ ] 3+ entidades de referência mencionadas
- [ ] Links a fontes primárias (2–4)

### LINKS (obrigatório)
- [ ] 3–5 links internos contextuais
- [ ] Anchor text descritivo (não "clique aqui")
- [ ] Links externos com `rel="noopener noreferrer"`

### FORMATAÇÃO (obrigatório)
- [ ] Sem negrito excessivo (máx 1/parágrafo)
- [ ] Pelo menos 1 framework visual (tabela/índice/timeline/matriz)
- [ ] Listas com mínimo 3 itens
- [ ] PT-PT consistente (não PT-BR)

### TOM (obrigatório)
- [ ] Tom analítico, não apenas descritivo
- [ ] Sem clichés de abertura
- [ ] Afirmações baseadas em dados
- [ ] Sem linguagem passiva excessiva

### QUALITY SCORE (resultado final)
- [ ] Score ≥ 9.5 (ideal para publicação imediata)
- [ ] Score 8.5–9.4 (OK, enviar para revisão rápida)
- [ ] Score < 8.5 (rejeitar, re-gerar)

---

## 🚨 ERROS CRÍTICOS (REJEITAR IMEDIATAMENTE)

Se encontrar QUALQUER um destes, o artigo é recusado:

- [ ] ❌ H1 com acentos ou caracteres especiais
- [ ] ❌ Meta description < 145 ou > 155 chars
- [ ] ❌ Slug com espaços, acentos ou maiúsculas
- [ ] ❌ Links internos para pages que não existem
- [ ] ❌ ToC sem âncoras funcionais
- [ ] ❌ Dados sem fonte ou data claramente indicada
- [ ] ❌ Secção Portugal com < 3 cenários
- [ ] ❌ Nenhuma previsão datada
- [ ] ❌ Parágrafos > 7 frases
- [ ] ❌ Uso de PT-BR (color em vez de cor)
- [ ] ❌ Negrito em frases inteiras
- [ ] ❌ Links externos sem `rel="noopener noreferrer"`

---

## 📝 CAMPO-A-CAMPO RÁPIDO

```
┌─────────────────────────┬──────────────────────────────┬────────────┐
│ CAMPO                   │ REGRA RÁPIDA                 │ STATUS     │
├─────────────────────────┼──────────────────────────────┼────────────┤
│ title (H1)              │ 55–65 chars, keyword início  │ ☐          │
│ slug                    │ 6 palavras max, sem acentos  │ ☐          │
│ meta_description        │ Exactamente 145–155 chars    │ ☐          │
│ category                │ Uma de 6 valores             │ ☐          │
│ author                  │ Não vazio                    │ ☐          │
│ content.lead            │ ≤ 60 palavras, O QUÊ+POR    │ ☐          │
│ content.body            │ 1400–1800+ words, ≥5 H2     │ ☐          │
│ content.ToC             │ Âncoras funcionais           │ ☐          │
│ content.FAQs            │ 2–4 FAQ, respostas ≤55 wds  │ ☐          │
│ content.portugal        │ 3 cenários: optimista/base  │ ☐          │
│ content.prediction      │ Data + resultado específico  │ ☐          │
│ content.cta             │ Valor concreto, incitador    │ ☐          │
│ cover_image.prompt      │ Dark cinematic, sem faces    │ ☐          │
│ cover_image.color       │ Hex válido (#00d4ff)         │ ☐          │
│ seo.primary_keyword     │ 1–3 palavras                 │ ☐          │
│ seo.entities            │ 3+ names de entidades reais  │ ☐          │
│ links.internal          │ 3–5 links contextuais        │ ☐          │
│ links.external          │ 2–4 fontes primárias        │ ☐          │
│ quality_score.total     │ ≥ 9.5 ideal, ≥ 8.5 aceitável│ ☐          │
│ quality_score.passed    │ true = publicável            │ ☐          │
│ workflow_metadata.wf_id │ WF-02 (ou superior)          │ ☐          │
└─────────────────────────┴──────────────────────────────┴────────────┘
```

---

## 🔧 AJUSTES RÁPIDOS (ANTES DE REJEITAR)

Se o score está entre 8.5–9.4, estes ajustes podem elevá-lo:

1. **Meta description < 145 ou > 155?** → Re-ajustar e re-calcular
2. **Faltam dados/fontes?** → Adicionar 1 facto por H2
3. **FAQs ausentes?** → Criar 2 FAQs críticas em H3
4. **Portugal fraca?** → Expandir secção com 3 cenários claros
5. **Sem previsão datada?** → Inserir 1 frase com data específica
6. **Framework visual fraco?** → Criar tabela comparativa ou índice

---

## 📊 DISTRIBUIÇÃO RECOMENDADA (CONTEÚDO)

Para artigo padrão (1500–1700 palavras):

```
Lead                    ~60 palavras     (5%)
Secção 1 (H2)          ~250 palavras     (15%)
Secção 2 (H2)          ~250 palavras     (15%)
Secção 3 (H2)          ~250 palavras     (15%)
Secção 4 (H2)          ~250 palavras     (15%)
Portugal + Previsão    ~200 palavras     (12%)
Conclusão + CTA        ~150 palavras     (9%)
FAQs + Links           ~150 palavras     (9%)
───────────────────────
TOTAL                  ~1700 palavras    (100%)
```

---

## 🎯 QUALITY SCORE BREAKDOWN

Como a Edge Function calcula o score:

```
Estrutura (30%)           → H1, ToC, H2s, Lead, Portugal, Previsão
SEO/AEO (25%)             → Keywords, meta, FAQs, entidades
Dados & Fontes (20%)      → Fontes por secção, links
Links (10%)               → Internos contextuais, externos
Formato & Legibilidade (10%) → Parágrafos, negrito, listas
Tom & Qualidade (5%)      → Analítico, sem clichés, CTA valor
─────────────────────────
TOTAL = Média Ponderada   → 0–10
```

**Threshold de publicação:**
- ✅ 9.5+ → Auto-publicar (publish_ready=true)
- ⚠️ 8.5–9.4 → Enviar para revisão humana rápida (< 5 min)
- ❌ < 8.5 → Rejeitar, re-gerar

---

## 📤 ANTES DE ENVIAR PARA ingest-manus-post

Verificar JSON final:

```json
{
  "article": {
    "title": "string ✅ (55-65 chars)",
    "slug": "string ✅ (6 words max)",
    "meta_description": "string ✅ (145-155 exact)",
    "content": {
      "body": "string ✅ (≥1400 words, ≥5 H2s)",
      "lead": "string ✅ (≤60 words)"
    },
    "seo": {
      "entities": ["✅", "✅", "✅"]  // ≥3
    },
    "quality_score": {
      "total": 9.7 ✅  // ≥9.5 ideal
    },
    "workflow_metadata": {
      "publish_ready": true ✅
    }
  }
}
```

---

## 🚀 ENVIAR

```bash
curl -X POST https://your-supabase.co/functions/v1/ingest-manus-post \
  -H "Content-Type: application/json" \
  -H "x-manus-ingest-secret: ${MANUS_INGEST_SECRET}" \
  -d '@artigo-pronto.json'
```

Resposta esperada:
```json
{
  "id": "uuid",
  "status": 201,
  "url": "/tecnologia/article-slug",
  "quality_score": 9.7,
  "published": true
}
```

---

## ❓ DÚVIDAS FREQUENTES

**P: O que fazer se score < 9.5?**
A: Se ≥ 8.5, enviar para revisão humana (5 min). Se < 8.5, re-gerar.

**P: Posso enviar artigo incompleto?**
A: NÃO. A Edge Function rejeita campos obrigatórios vazios com erro 422.

**P: Quantos links internos são obrigatórios?**
A: Mínimo 2, ideal 3–5. Links devem ser contextuais (dentro do corpo do texto).

**P: A meta description precisa de exactamente 145–155 chars?**
A: SIM. A Edge Function valida o range exacto. Fora disso = erro 422.

**P: Posso usar PT-BR?**
A: NÃO. Apenas PT-PT. A Edge Function detecta e rejeita PT-BR.

**P: E se a categoria não existir no dropdown?**
A: Use apenas: tecnologia | mundo | saude | musica | desporto | audiocasts

**P: Quantas vezes posso re-gerar um artigo?**
A: Não há limite. A Edge Function aceita qualquer qual versão que cumpra os critérios.

---

**Versão:** 1.0  
**Última atualização:** Maio 2026  
**Responsável:** Motor Vision7  
**Audiência:** Operadores n8n / Revisores Editorial

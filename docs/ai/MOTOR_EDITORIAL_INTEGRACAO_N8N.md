# Motor Editorial Vision7 — Guia de Integração com n8n Workflows

## Resumo da Integração

O Motor Editorial Vision7 (implementado em n8n como WF-02 ou superior) gera artigos completos seguindo a estrutura JSON definida em `MOTOR_EDITORIAL_V1.0.md`. Estes artigos são enviados para a Edge Function `/functions/v1/ingest-manus-post` que:

1. ✅ Detecta automaticamente o formato (Editorial ou Simples)
2. ✅ Processa metadados SEO/AEO/editorial
3. ✅ Armazena em `posts` table com campos enriquecidos
4. ✅ Associa múltiplas categorias via `post_categories`
5. ✅ Retorna quality_score e status de publicação

---

## Fluxo Completo: WF-02 (Editorial Engine) → Portal Vision7

```
┌─────────────────────────────────────────────────────────┐
│  WF-02 Editorial Engine (n8n)                           │
│  - Ler briefing do Notion                               │
│  - Enriquecer com dados (APIs)                          │
│  - Gerar artigo completo via Claude                     │
│  - Estruturar em JSON Schema v1.0                       │
│  - Validar Quality Score ≥ 9.5                          │
└────────────────┬────────────────────────────────────────┘
                 │ POST /functions/v1/ingest-manus-post
                 ▼
         ┌──────────────────┐
         │  Edge Function   │
         │  ingest-manus-   │
         │  post            │
         └────────┬─────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
    ✅ Detecta Format    Detecta Format
    Editorial            Simples
        │                    │
        ▼                    ▼
    ┌──────────┐         ┌──────────┐
    │ Processa │         │ Processa │
    │ Editorial│         │  Simples │
    │ Schema   │         │  Schema  │
    └────┬─────┘         └────┬─────┘
         │                    │
         └─────────┬──────────┘
                   │
                   ▼
         ┌──────────────────┐
         │  INSERT posts    │
         │  + metadados     │
         │  + campos SEO    │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ post_categories  │
         │ multi-assign     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Return response  │
         │ + quality_score  │
         │ + url            │
         └──────────────────┘
```

---

## O Que o Motor Editorial Deve Enviar

### Estrutura JSON Exigida

O Motor Editorial gera um JSON conforme [MOTOR_EDITORIAL_V1.0.md](../MOTOR_EDITORIAL_V1.0.md) com a seguinte estrutura:

```json
{
  "article": {
    // ─── Básico ────────────────────────────────────
    "title": "string (55–65 chars, SEO)",
    "slug": "string (6 palavras max, sem acentos)",
    "meta_description": "string (145–155 chars)",
    
    // ─── Categorização ────────────────────────────
    "category": "tecnologia|mundo|saude|musica|desporto",
    "author": "string",
    
    // ─── SEO/AEO ──────────────────────────────────
    "seo": {
      "primary_keyword": "string",
      "secondary_keywords": ["string"],
      "lsi_keywords": ["string"],
      "long_tail_keywords": ["string"],
      "entities": ["NVIDIA", "OpenAI", "Banco de Portugal"]
    },
    
    // ─── Imagem de Capa ───────────────────────────
    "cover_image": {
      "prompt": "Dark cinematic... (para geração de imagem)",
      "alt_text": "string (descritivo com keyword)",
      "color_accent": "string (hex, ex: #00d4ff)"
    },
    
    // ─── Conteúdo ─────────────────────────────────
    "content": {
      "lead": "string (max 60 palavras)",
      "body": "string (HTML/Markdown completo)",
      "table_of_contents": [
        { "title": "string", "anchor": "string" }
      ],
      "faqs": [
        { "question": "string", "answer": "string (max 55 palavras)" }
      ],
      "portugal_section": {
        "optimistic": "string (cenário optimista)",
        "base": "string (cenário base/provável)",
        "pessimistic": "string (cenário pessimista)"
      },
      "dated_prediction": "string (ex: 'Até 2026...')",
      "cta": "string (call to action com valor)",
      "conclusion": "string"
    },
    
    // ─── Links ────────────────────────────────────
    "links": {
      "internal": [
        { "anchor_text": "string", "url": "string" }
      ],
      "external": [
        { "anchor_text": "string", "url": "string", "domain": "string", "rel": "string" }
      ]
    },
    
    // ─── Qualidade & Workflow ──────────────────────
    "quality_score": {
      "total": "number (0–10)",
      "structure": "number",
      "seo_aeo": "number",
      "data_sources": "number",
      "links": "number",
      "readability": "number",
      "tone": "number",
      "passed": "boolean"
    },
    
    "workflow_metadata": {
      "wf_id": "WF-02|WF-03|... (identificador workflow)",
      "generation_model": "string (ex: claude-opus-4-6)",
      "generation_timestamp": "ISO8601",
      "publish_ready": "boolean (true → status=published)"
    },
    
    "reading_time_minutes": "number",
    "word_count": "number"
  }
}
```

---

## Implementação no n8n (WF-02)

### Nodes Recomendados

#### 1. Read Briefing (Notion Integration)
```
Notion API: GET database entries
Filter: status = "pronto para redação"
Return: tópico, ângulo, keywords, links internos
```

#### 2. Enrich Data (HTTP Requests / APIs)
```
- Fetch headlines via NewsAPI (dados actuais)
- Fetch empresa data via Yahoo Finance / Reuters API
- Fetch Portugal data via INE API
- Compile fontes primárias
```

#### 3. Generate Article (Anthropic API)
```
Model: claude-opus-4-6 (ou superior)
Prompt: PROMPT MASTER do Motor Editorial v1.0
Input: {{enriched_data}} + {{briefing}}
Output: Artigo em Markdown + metadados
```

#### 4. Structure Output (Code/Transform)
```
JavaScript/Deno:
- Parse artigo Markdown gerado
- Extrair secções, títulos, links
- Estruturar em JSON schema exigido
- Calcular quality_score
- Gerar cover_image prompt
```

#### 5. Validate JSON Schema
```
JSON Schema validation node:
- Verificar campos obrigatórios
- Verificar types
- Se falhar: alert para revisão manual
- Se passar: prosseguir
```

#### 6. Generate Cover Image Prompt
```
Template Transform:
"Dark cinematic editorial photograph, [METÁFORA DO TEMA],
deep black background with [COR CATEGORIA] neon lighting,
dramatic volumetric light, photorealistic CGI, no text,
no logos, no faces, 16:9 ratio, editorial style, [DETALHE]"
```

#### 7. Send to ingest-manus-post
```
HTTP Request (POST):
URL: {{SUPABASE_URL}}/functions/v1/ingest-manus-post
Headers:
  - x-manus-ingest-secret: {{MANUS_INGEST_SECRET}}
  - Content-Type: application/json
Body: {{JSON_SCHEMA_COMPLETO}}

Success: status 201, log response.id + response.quality_score
Error: status ≠ 201, alert para revisão + log erro
```

#### 8. Notify Slack
```
Message:
✅ Artigo publicado: [TÍTULO]
URL: {{response.url}}
Quality Score: {{response.quality_score}}/10
Category: {{category}}
Author: Motor Editorial V1.0
```

---

## Campos Críticos para a Edge Function

### Obrigatórios (sem eles, Edge Function rejeita com 422)

| Campo | Validação |
|-------|-----------|
| `article.title` | String, 1–500 chars |
| `article.slug` | String, unique pattern |
| `article.content.body` | String, mín 100 chars |

### Fortemente Recomendados (afetam qualidade/ranking)

| Campo | Impacto |
|-------|---------|
| `seo.*` (keywords, entities) | SEO score, indexação |
| `cover_image.prompt` | Viabilidade geração imagem |
| `quality_score.total` | Auditoria, prioridade revisão |
| `workflow_metadata.publish_ready` | Auto-publicação vs draft |
| `content.portugal_section` | Relevância nacional |
| `content.dated_prediction` | Credibilidade, engagement |

---

## Validações Executadas pela Edge Function

```javascript
// Detectar formato
if (body.article?.seo || body.article?.quality_score) {
  format = "editorial" ✅
  // Processa com campos enriquecidos
} else if (body.title && body.excerpt && body.content) {
  format = "simple" ✅
  // Processa com validação mínima
} else {
  reject 422: "Formato não reconhecido"
}

// Validar estrutura editorial
if (article.quality_score?.total < 9.5) {
  console.warn("Quality score baixo — mas processando anyway")
}

// Validar HTML/Markdown
if (!article.content.body.match(/<h[2-3]|^## |^### /)) {
  reject 422: "Conteúdo não tem seções H2/H3"
}

// Validar categoria existe
category_id = resolve(article.category) // ex: "tecnologia" → UUID
if (!category_id) {
  reject 422: "Categoria não reconhecida"
}

// Inserir post
INSERT posts {
  title, slug, excerpt, content,
  meta_description, seo_keywords,
  cover_image_prompt, cover_image_accent,
  quality_score, quality_details,
  editorial_metadata, workflow_metadata,
  ...
}

// Associar categorias
INSERT post_categories {
  post_id, category_id
}

// Retornar sucesso
return {
  id, slug, status, url,
  quality_score  // ← importante para auditing
}
```

---

## Exemplo: POST via cURL

```bash
curl -X POST https://your-supabase.co/functions/v1/ingest-manus-post \
  -H "Content-Type: application/json" \
  -H "x-manus-ingest-secret: ${MANUS_INGEST_SECRET}" \
  -d '{
    "article": {
      "title": "Portugal Lidera Adopção de IA em Startups — IDC 2025",
      "slug": "portugal-lidera-ia-startups-2025",
      "meta_description": "Análise IDC 2025: Portugal ranks 3º em adoção de IA em startups europeia. Dados, investimento e impacto económico.",
      "category": "tecnologia",
      "author": "Motor Vision7",
      "seo": {
        "primary_keyword": "IA startups Portugal",
        "secondary_keywords": ["investimento IA", "tecnologia portuguesa"],
        "entities": ["Banco de Portugal", "AICEP", "Microsoft"]
      },
      "cover_image": {
        "prompt": "Dark cinematic visualization of Portuguese startup ecosystem with AI nodes, deep black background with blue and gold accents, neon lighting, volumetric light, no text, 16:9, editorial quality",
        "color_accent": "#00d4ff"
      },
      "content": {
        "lead": "Portugal posiciona-se como hub europeu de startups de IA. Segundo IDC (2025), o país cresce 45% ano-a-ano em investment de startups tech.",
        "body": "<h2>Dados Chave</h2><p>...</p>",
        "portugal_section": {
          "optimistic": "Portugal become AI capital of Southern Europe by 2026",
          "base": "Sustained 30-40% YoY growth in IA startup funding",
          "pessimistic": "Brain drain to US/UK could slow momentum"
        },
        "dated_prediction": "Até Dez 2025, Portugal terá recebido €200M em funding IA (projecção Vision7).",
        "cta": "Descubra as 10 startups IA portuguesas para watch"
      },
      "quality_score": {
        "total": 9.7,
        "passed": true
      },
      "workflow_metadata": {
        "wf_id": "WF-02",
        "generation_model": "claude-opus-4-6",
        "publish_ready": true
      },
      "word_count": 1650,
      "reading_time_minutes": 8
    }
  }'
```

---

## Troubleshooting

### Error 422: "Formato não reconhecido"
- ✅ Verificar se `.article` existe
- ✅ Verificar se pelo menos um de: `.article.seo`, `.article.quality_score`, `.article.content.body`
- ✅ Ou verificar se `.title`, `.excerpt`, `.content` no root

### Error 422: "Conteúdo não segue estrutura editorial"
- ✅ Adicionar `## Secções H2`
- ✅ Adicionar `### Subsecções H3` dentro de H2
- ✅ Adicionar seção "Fontes" ou "Referências"

### Error 500: "Erro ao criar post"
- ✅ Verificar slug uniqueness (não usar slugs duplicados)
- ✅ Verificar se `category` existe no `categories` table
- ✅ Verificar limite de payload (máx 10MB)

### Quality Score < 9.5
- ⚠️ Edge Function processa mesmo assim (warning log)
- ⚠️ Recomendação: re-gerar artigo com qualidade melhor
- ⚠️ Dashboard mostrará `quality_score` baixo para auditing

---

## Próximas Integrações

- [ ] Webhooks de notificação (Slack, Discord, email)
- [ ] Dashboard de KPIs (articles/day, avg quality, % published)
- [ ] A/B testing de titles + meta descriptions
- [ ] Auto-geração de social media previews
- [ ] Integration com image generation API (Stable Diffusion, Midjourney)

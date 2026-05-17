# Especificação de Payload para Posts do Portal Vision7

## Endpoint
```
POST https://your-project.supabase.co/functions/v1/ingest-manus-post
Header: x-manus-ingest-secret: YOUR_MANUS_INGEST_SECRET
```

## Dois Formatos Suportados

### FORMATO 1: Motor Editorial Completo (Recomendado)

**Usa a estrutura JSON completa do Motor Editorial Vision7 v1.0**

Payload raiz com `.article`:
```json
{
  "article": {
    "title": "string (55–65 chars, SEO optimizado)",
    "slug": "string (máx 6 palavras, sem acentos)",
    "meta_description": "string (145–155 chars)",
    "category": "tecnologia|mundo|saude|musica|desporto",
    "author": "string (ex: 'Motor Vision7')",
    
    "seo": {
      "primary_keyword": "string",
      "secondary_keywords": ["string"],
      "lsi_keywords": ["string"],
      "long_tail_keywords": ["string"],
      "entities": ["string"]
    },
    
    "cover_image": {
      "prompt": "string (Dark Cinematic prompt)",
      "alt_text": "string",
      "color_accent": "string (hex, ex: #00d4ff)"
    },
    
    "content": {
      "lead": "string (max 60 palavras)",
      "body": "string (HTML ou Markdown completo)",
      "table_of_contents": [
        { "title": "string", "anchor": "string" }
      ],
      "faqs": [
        { "question": "string", "answer": "string (max 55 palavras)" }
      ],
      "portugal_section": {
        "optimistic": "string",
        "base": "string",
        "pessimistic": "string"
      },
      "dated_prediction": "string",
      "cta": "string",
      "conclusion": "string"
    },
    
    "links": {
      "internal": [
        { "anchor_text": "string", "url": "string" }
      ],
      "external": [
        { "anchor_text": "string", "url": "string", "domain": "string", "rel": "string" }
      ]
    },
    
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
      "wf_id": "string",
      "generation_model": "string",
      "generation_timestamp": "ISO8601",
      "publish_ready": "boolean"
    },
    
    "reading_time_minutes": "number",
    "word_count": "number"
  }
}
```

**Resposta (status 201):**
```json
{
  "id": "uuid",
  "slug": "slug-do-artigo",
  "status": "published|draft",
  "url": "https://www.vision7.pt/post/slug-do-artigo",
  "quality_score": 9.7
}
```

---

### FORMATO 2: Simples (Compatibilidade)

**Para ingestão rápida ou posts simples**

```json
{
  "title": "string (obrigatório)",
  "excerpt": "string (obrigatório)",
  "content": "string HTML/Markdown (obrigatório)",
  "category_slugs": ["string"] (opcional),
  "author_name": "string (opcional, default: Redação Vision7)",
  "tags": ["string"] (opcional),
  "status": "draft|published" (default: draft),
  "featured": "boolean" (default: false)",
  "read_time": "string (ex: '5 min', auto-calculado se omitido)",
  "image_url": "string HTTPS (opcional)",
  "banner_url": "string HTTPS (opcional)",
  "image_base64": "string (data:image/..., opcional)",
  "banner_base64": "string (data:image/..., opcional)",
  "editorial_template": "noticia-padrao|analise-executiva|guia-pratico" (opcional)
}
```

**Resposta (status 201):**
```json
{
  "id": "uuid",
  "slug": "slug-do-artigo",
  "status": "published|draft",
  "url": "https://www.vision7.pt/post/slug-do-artigo"
}
```

---

## Detecção Automática de Formato

A Edge Function detecta automaticamente qual formato foi enviado:
- **Editorial** se `.article.seo` ou `.article.quality_score` ou `.article.content.body` estão presentes
- **Simples** se `.title`, `.excerpt`, `.content` estão no root

---

## Campos do Formato Editorial Mapeados para a BD

| Campo Editorial | Campo BD | Transformação |
|-----------------|----------|---|
| `article.title` | `title` | Direto |
| `article.slug` | `slug` | Validado unique |
| `article.meta_description` | `meta_description` | Direto (NEW) |
| `article.seo` | `seo_keywords` | JSON (NEW) |
| `article.content.lead` | `excerpt` | Usado como excerpt |
| `article.content.body` | `content` | HTML/Markdown convertido |
| `article.content.* (faq, toc, etc)` | `editorial_metadata` | JSONB (NEW) |
| `article.cover_image` | `cover_image_*` | Decomposto (NEW) |
| `article.quality_score` | `quality_score` + `quality_details` | Armazenado (NEW) |
| `article.workflow_metadata` | `workflow_metadata` | JSON (NEW) |
| `article.category` | `category_id` | Resolvido por slug |

---

## Estruturas Editoriais (Formato Simples)

### noticia-padrao
```
# Lide (introdução 2-3 linhas)
## O que aconteceu
## Por que isso importa
## O que observar agora
### Fontes consultadas
```

### analise-executiva
```
# Resumo executivo (3 linhas)
## Cenário atual
## Leitura do mercado
## O que isso significa para o leitor Vision7
### Fontes consultadas
```

### guia-pratico
```
# Objetivo (2 linhas)
## Visão geral
## Passo a passo
## Checklist rápido
### Links e fontes
```

---

## Validações Obrigatórias

### Formato Editorial
- [ ] `.article.title` — obrigatório
- [ ] `.article.slug` — obrigatório
- [ ] `.article.content.body` — obrigatório
- [ ] Quality score ≥ 9.5 recomendado (aviso se < 9.5)
- [ ] Estrutura editorial validada

### Formato Simples
- [ ] `title` — obrigatório, máx 500 chars
- [ ] `excerpt` — obrigatório, máx 1000 chars
- [ ] `content` — obrigatório
- [ ] Se `editorial_template` especificado → validação estrutural obrigatória

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| **201** | Post criado com sucesso |
| **400** | JSON inválido |
| **401** | Autenticação falhou |
| **405** | Método não permitido (use POST) |
| **413** | Payload > 10MB |
| **422** | Validação falhou (campos obrigatórios, estrutura, etc) |
| **429** | Rate limit atingido (10 posts/min por IP) |
| **500** | Erro interno |

---

## Exemplo: Motor Editorial → Vision7

```bash
curl -X POST https://your-supabase.co/functions/v1/ingest-manus-post \
  -H "Content-Type: application/json" \
  -H "x-manus-ingest-secret: YOUR_SECRET" \
  -d @- <<'EOF'
{
  "article": {
    "title": "IA Generativa: 7 Impactos Concretos para Empresas Portuguesas em 2025",
    "slug": "ia-generativa-impactos-empresas-2025",
    "meta_description": "Análise profunda de como IA generativa está transformando empresas portuguesas. Dados, casos reais e impacto económico esperado.",
    "category": "tecnologia",
    "author": "Motor Vision7",
    "seo": {
      "primary_keyword": "IA generativa Portugal",
      "secondary_keywords": ["empresas IA", "automação inteligente", "ChatGPT empresas"],
      "entities": ["NVIDIA", "OpenAI", "Google DeepMind", "Banco de Portugal"]
    },
    "cover_image": {
      "prompt": "Dark cinematic editorial photograph, futuristic AI neural network visualization, deep black background with cyan neon lighting, dramatic volumetric light, photorealistic CGI quality, no text, no logos, no faces, 16:9 ratio, editorial magazine cover style",
      "color_accent": "#00d4ff"
    },
    "content": {
      "lead": "A inteligência artificial generativa deixou de ser ficção científica. Em 2025, mais de 60% das empresas portuguesas estarão a explorar aplicações práticas, segundo IDC (2024). Descubra os impactos reais e como preparar a sua organização.",
      "body": "<h2>1. Automação de Processos Administrativos</h2><p>...</p>",
      "portugal_section": {
        "optimistic": "Portugal pode liderar a adopção de IA em setores específicos...",
        "base": "Expectativa: 45% de empresas PM com alguma automação IA até 2026...",
        "pessimistic": "Risco: falta de regulação clara pode criar gaps de conformidade..."
      },
      "dated_prediction": "Até fim de 2026, 70% das PME portuguesas terão pelo menos um use case de IA implementado (projecção Vision7).",
      "cta": "Leia nosso guia prático: Como preparar a sua empresa para IA generativa"
    },
    "quality_score": {
      "total": 9.8,
      "structure": 10,
      "seo_aeo": 9.5,
      "data_sources": 9.8,
      "links": 9.5,
      "readability": 10,
      "tone": 9.8,
      "passed": true
    },
    "workflow_metadata": {
      "wf_id": "WF-02",
      "generation_model": "claude-opus-4-6",
      "publish_ready": true
    }
  }
}
EOF
```

---

## Próximas Etapas

1. ✅ Motor Editorial gera JSON conforme schema v1.0
2. ✅ Envia para `/functions/v1/ingest-manus-post`
3. ✅ Edge Function processa e armazena em posts + metadados
4. ✅ Campos SEO/AEO/editorial preservados para analytics + revisão
5. ⏳ Portal renderiza posts com metadados enriquecidos
6. ⏳ Dashboard mostra quality_score e workflow_metadata para auditoria</content>
<parameter name="filePath">C:\Dev\Portal-Vision7\docs\ai\MANUS_INGEST_SPEC.md
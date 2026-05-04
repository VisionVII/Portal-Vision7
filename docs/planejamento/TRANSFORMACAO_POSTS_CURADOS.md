---
title: "Transformação de Posts Curados - Visualização da Nova Estrutura"
---

# Antes vs Depois: Transformação de Posts Curados

## Exemplo Real de Transformação

### ANTES (em `curated_posts`)
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cluster_id": "cluster-uuid",
  "title": "Portugal lidera iniciativa de IA sustentável na Europa",
  "subtitle": "Novo framework regulatório aprovado pelo Parlamento Europeu",
  "slug": "portugal-lidera-ia-sustentavel",
  "excerpt": "Resumo técnico do artigo",
  "body_markdown": "# Markdown content here...",
  "body_html": "<h1>Portugal lidera...</h1><p>Novo framework...</p>...",
  "language": "pt",
  "editorial_score": 8.5,
  "confidence_score": 0.92,
  "status": "ready",
  "tone_profile": "vision7",
  "created_at": "2026-05-01T10:30:00Z",
  "updated_at": "2026-05-02T14:45:00Z"
}
```

### DEPOIS (em `posts` com nova estrutura)

#### Entrada Principal em `posts`:
```json
{
  "id": "newly-generated-uuid",
  "title": "Portugal lidera iniciativa de IA sustentável na Europa",
  "slug": "portugal-lidera-ia-sustentavel",
  "excerpt": "Resumo técnico do artigo",
  "content": "<h1>Portugal lidera...</h1><p>Novo framework...</p>...",
  "image_url": null,
  "banner_url": null,
  "category_id": "curadoria-category-uuid",
  "author_id": null,
  "author_name": "Redação Vision7",
  "status": "published",
  "featured": false,
  "read_time": "8 min",
  "tags": [],
  "views": 0,
  "published_at": "2026-05-02T14:45:00Z",
  "created_at": "2026-05-01T10:30:00Z",
  "updated_at": "2026-05-03T10:00:00Z"
}
```

#### Entrada em `post_categories` (junction):
```json
{
  "post_id": "newly-generated-uuid",
  "category_id": "curadoria-category-uuid",
  "created_at": "2026-05-03T10:00:00Z"
}
```

#### Metadata rastreamento em `curated_posts`:
```json
{
  "promoted_to_posts": "true",
  "promoted_at": "2026-05-03T10:00:00Z",
  "post_id": "newly-generated-uuid"
}
```

---

## Comparação de Campos

| Campo | Antes (curated_posts) | Depois (posts) | Transformação |
|-------|----------------------|----------------|---------------|
| **title** | ✓ Presente | ✓ Mantido igual | Direto |
| **slug** | ✓ Presente | ✓ Mantido igual | Validado único |
| **excerpt** | Campo específico | ✓ Presente | Extraído ou truncado |
| **content** | body_html | ✓ content | Renomeado |
| **categoria** | Implícita (curadoria) | category_id | Resolvida para UUID |
| **multi-categorias** | ❌ Não suportado | post_categories | Novo suporte |
| **author** | ❌ Não existe | author_name | Padronizado |
| **status** | 'ready'/'approved' | 'published' | Promovido |
| **featured** | ❌ Não existe | featured: false | Padrão |
| **read_time** | ❌ Não calculado | ✓ Auto-calculado | Novo campo |
| **tags** | ❌ Não existe | tags: [] | Array vazio |
| **editorial_score** | ✓ Presente | ❌ Descontinuado | Arquivado em metadata |
| **confidence_score** | ✓ Presente | ❌ Descontinuado | Arquivado em metadata |

---

## Dados Preservados em Metadata

Quando um post é promovido, informações importantes são preservadas no `curated_posts.metadata`:

```json
{
  "promoted_to_posts": "true",
  "promoted_at": "2026-05-03T10:00:00Z",
  "original_post_id": "newly-generated-uuid",
  "editorial_score": 8.5,
  "confidence_score": 0.92,
  "tone_profile": "vision7",
  "model_info": { ... }
}
```

---

## Fluxo de Migração Visual

```
┌─────────────────────────────────────────────────────────┐
│               curated_posts (Pipeline)                   │
│  Status: 'ready', 'approved', 'promoted'                │
│  Slug ≠ NULL, body_html ≠ NULL                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Migrate Check     │
        │  ✓ Slug unique?    │
        │  ✓ Already in posts? │
        └────────┬───────────┘
                 │ YES ↓
     ┌───────────────────────────┐
     │  Create posts entry       │
     │  - Title, excerpt, content│
     │  - status = 'published'   │
     │  - read_time calculated   │
     │  - category: 'curadoria'  │
     └───────┬───────────────────┘
             │
             ▼
     ┌───────────────────────────┐
     │  Create post_categories   │
     │  - Link to curadoria cat  │
     │  - Support multi-cat      │
     └───────┬───────────────────┘
             │
             ▼
     ┌───────────────────────────┐
     │  Mark in curated_posts    │
     │  metadata.promoted = true │
     └───────────────────────────┘
             │
             ▼ DONE
     ┌───────────────────────────┐
     │  posts (Nova Estrutura)   │
     │  ✓ Múltiplas categorias   │
     │  ✓ Validação editorial    │
     │  ✓ Compatível com form    │
     └───────────────────────────┘
```

---

## Verificação Pós-Migração

### Dashboard Query - Ver Posts Promovidos

```sql
-- Query para Supabase Dashboard
SELECT 
  p.id,
  p.title,
  p.slug,
  p.status,
  COUNT(pc.category_id) as total_categories,
  STRING_AGG(c.name, ', ') as categories,
  p.created_at,
  ARRAY_AGG(c.name) as category_list
FROM posts p
LEFT JOIN post_categories pc ON p.id = pc.post_id
LEFT JOIN categories c ON pc.category_id = c.id
WHERE p.slug IN (
  SELECT slug FROM curated_posts
  WHERE metadata->>'promoted_to_posts' = 'true'
)
GROUP BY p.id, p.title, p.slug, p.status, p.created_at
ORDER BY p.created_at DESC
LIMIT 20;
```

**Resultado Esperado:**
```
id                | title                              | slug                        | status    | categories | created_at
uuid-1            | Portugal lidera IA sustentável     | portugal-lidera-ia-...      | published | curadoria  | 2026-05-01...
uuid-2            | Europa regulamenta mercado digital | europa-regulamenta-...      | published | curadoria  | 2026-05-01...
uuid-3            | Inovação em blockchain português   | inovacao-blockchain-...     | published | curadoria  | 2026-04-30...
...
```

---

## Benefícios da Nova Estrutura

✅ **Unificação**: Posts curados agora usam mesma tabela que posts manuais  
✅ **Multi-categoria**: Suporte para múltiplas categorias por post  
✅ **Validação Editorial**: Pode-se adicionar template validation ao publicar  
✅ **Compatibilidade**: Funciona com PostForm, ingest-manus-post, e fluxos futuros  
✅ **Rastreamento**: Histórico preservado em metadata  
✅ **Performance**: Índices otimizados na nova estrutura  

---

## Próximos Passos

1. **Aplicar migração** → `QUICK_PROMOTE_CURATED.sql`
2. **Validar dados** → Executar queries de verificação
3. **Testar portal** → Visualizar posts migrados
4. **Atualizar workflows** → Workflows n8n usarão `ingest-manus-post`
5. **Remover posts antigos** → Limpar `curated_posts` se tudo OK

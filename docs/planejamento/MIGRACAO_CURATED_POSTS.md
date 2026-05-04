# Promoção de Posts Curados para Nova Estrutura

## Objetivo
Atualizar os posts curados existentes (que estão em `curated_posts` aguardando promoção) para a nova estrutura unificada de `posts` com suporte a múltiplas categorias e validação editorial.

## Migração Executada

**Arquivo**: `supabase/migrations/20260503100000_promote_curated_posts_new_structure.sql`

### O Que Acontece

#### 1️⃣ Identificação de Posts Prontos
Identifica todos os `curated_posts` com status:
- `ready` (pronto)
- `approved` (aprovado)
- `promoted` (já em promoção)

#### 2️⃣ Conversão para Nova Estrutura
Para cada post curado identificado:
- **title** → mantém como está
- **slug** → usa slug existente como identificador único
- **excerpt** → usa `excerpt` se disponível, senão usa primeiras 200 chars do HTML
- **content** → converte `body_html` para conteúdo final
- **author_name** → padroniza como "Redação Vision7"
- **status** → marca como `published` (já foram aprovados)
- **read_time** → calcula automaticamente a partir do conteúdo
- **category_id** → associa com categoria `curadoria` como primária

#### 3️⃣ Associação de Categorias
- Cria entrada na tabela `post_categories` associando com `curadoria`
- Suporta múltiplas categorias se necessário
- Evita duplicatas com `ON CONFLICT`

#### 4️⃣ Rastreamento
- Adiciona metadado `promoted_to_posts: true` no `curated_posts` original
- Mantém histórico para auditoria

## Estrutura Resultante

Posts migrados terão:
```json
{
  "id": "uuid-gerado",
  "title": "Título original do curated_post",
  "slug": "slug-original",
  "excerpt": "Resumo extraído ou subtitle",
  "content": "<html>conteúdo convertido</html>",
  "category_id": "uuid-curadoria",
  "author_name": "Redação Vision7",
  "status": "published",
  "featured": false,
  "read_time": "X min",
  "tags": [],
  "published_at": "data-de-atualização-original",
  "created_at": "data-criação-original"
}
```

## Como Aplicar a Migração

### Opção 1: Aplicar via Supabase Dashboard
1. Abra o Supabase Dashboard
2. Vá para SQL Editor
3. Copie o conteúdo de `20260503100000_promote_curated_posts_new_structure.sql`
4. Execute o script

### Opção 2: Aplicar via CLI (futura)
```bash
supabase migration up --db-url $DATABASE_URL
```

## Verificação Pós-Migração

### SQL para Validar
```sql
-- Contar posts promovidos
SELECT COUNT(*) as promoted_posts
FROM posts
WHERE slug IN (
  SELECT slug FROM curated_posts
  WHERE metadata->>'promoted_to_posts' = 'true'
);

-- Ver primeiros posts promovidos
SELECT id, title, slug, status, created_at
FROM posts
WHERE slug IN (
  SELECT slug FROM curated_posts
  WHERE metadata->>'promoted_to_posts' = 'true'
)
LIMIT 5;

-- Verificar associações de categorias
SELECT p.title, c.name, pc.created_at
FROM posts p
JOIN post_categories pc ON p.id = pc.post_id
JOIN categories c ON pc.category_id = c.id
WHERE p.slug IN (
  SELECT slug FROM curated_posts
  WHERE metadata->>'promoted_to_posts' = 'true'
)
LIMIT 10;
```

## Resultado Esperado

✅ **Antes da migração:**
- Posts espalhados entre `curated_posts` e `posts` 
- Estrutura inconsistente
- Sem categorias multi-associadas

✅ **Depois da migração:**
- Todos os posts curados aparecem em `posts` com nova estrutura
- Múltiplas categorias suportadas via `post_categories`
- Estrutura editorial validada
- Compatível com PostForm e ingest-manus-post
- Histórico rastreado em metadata

## Próximas Etapas

1. ✅ Executar migração no banco de produção
2. ✅ Validar dados promovidos
3. ✅ Testar visualização no portal
4. ✅ Atualizar workflows n8n para usar nova estrutura
5. ✅ Remover posts duplicados se necessário

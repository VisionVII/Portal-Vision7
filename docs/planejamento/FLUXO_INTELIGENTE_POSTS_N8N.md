# Fluxo Inteligente de Posts (n8n + Supabase + Portal)

## Objetivo

Implementar pipeline editorial completo para multi-pesquisa, validação, curadoria, redação e publicação no portal Vision7 com rastreabilidade e métricas.

## Estado Atual

- Integracao n8n via Edge Function `n8n-proxy` ativa.
- Painel admin com automações, workflows e execuções ativo.
- Base para gestão de chaves n8n ativa.

## Artefatos Entregues Nesta Etapa

1. `supabase/migrations/20260408021000_add_news_pipeline_tables.sql`
1. `infra/n8n/workflows/WF-01-Coleta-MultiPesquisa-Noticias.json`
1. `infra/n8n/workflows/WF-02-Deduplicacao-Cluster-Curadoria-Base.json`

## Workflow-Alvo (WF-01 a WF-07)

1. WF-01 Coleta MultiPesquisa
1. WF-02 Deduplicação e Cluster
1. WF-03 Verificação e Enriquecimento
1. WF-04 Redação Inteligente
1. WF-05 Regras Editoriais e Compliance
1. WF-06 Curadoria e Publicação no Portal
1. WF-07 Métricas e Loop de Aprendizagem

## Passo a Passo de Implementação

### Decisão de desenho (obrigatória)

1. Use duas automações separadas no portal.
1. Use dois workflows separados no n8n.
1. Não coloque WF-01 e WF-02 no mesmo workflow.

Modelo correto:

- Automação A -> Workflow WF-01 Coleta MultiPesquisa Noticias
- Automação B -> Workflow WF-02 Deduplicacao Cluster Curadoria Base

### 1) Aplicar estrutura de dados

1. Execute a migration nova no Supabase.
1. Valide criação das tabelas:

- `news_staging`
- `news_clusters`
- `curated_posts`
- `posting_queue`
- `editorial_feedback`

### 2) Configurar variáveis no n8n

Defina no serviço n8n:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (ou provedor LLM equivalente)

### 3) Importar workflows iniciais

1. No n8n, use Import from File.
1. Importe:

- `WF-01-Coleta-MultiPesquisa-Noticias.json`
- `WF-02-Deduplicacao-Cluster-Curadoria-Base.json`

1. Ajuste feeds e tópicos no node `Build Feed List`.
1. Ative os workflows.

### 3.1) Configurar as duas automações no portal

1. Em Configuração de automação, crie a Automação A:

- Nome: Coleta MultiPesquisa
- Workflow: WF-01 Coleta MultiPesquisa Noticias
- Intervalo: 30
- RSS feeds: preencher
- Palavras-chave: ia, automacao, ciberseguranca
- Prompt: opcional (não usado no WF-01)

1. Crie a Automação B:

- Nome: Dedupe e Cluster
- Workflow: WF-02 Deduplicacao Cluster Curadoria Base
- Intervalo: 20
- RSS feeds: vazio
- Palavras-chave: pipeline, cluster
- Prompt: opcional (não usado no WF-02)

1. Salve e teste manualmente nesta ordem:

- Executar Automação A
- Executar Automação B

### 4) Validar pipeline base

1. Rode WF-01 manualmente.
1. Verifique inserts em `news_staging`.
1. Rode WF-02 manualmente.
1. Verifique clusters em `news_clusters` e `processed=true` no staging.

### 5) Implementar WF-03 (verificação)

Entrada: clusters recentes.  
Saída: cluster enriquecido com:

- entidades
- score de confiança
- flags de risco

Nós sugeridos:

- HTTP Request (buscar clusters)
- Code (normalização)
- LLM Node (extração estruturada JSON)
- HTTP Request (update em `news_clusters`)

### 6) Implementar WF-04 (redação)

Entrada: clusters com score mínimo.  
Saída: rascunho em `curated_posts`.

Prompt base:

- Tom Vision7
- Linguagem objetiva
- Sem clickbait
- Estrutura: titulo, subtitulo, resumo, corpo, CTA
- Resposta em JSON estrito

### 7) Implementar WF-05 (regras)

Regras mínimas:

- Bloquear alegações sem fonte
- Penalizar linguagem sensacionalista
- Exigir contexto temporal
- Atribuir score editorial final

### 8) Implementar WF-06 (publicação)

1. Inserir em `posting_queue` com `status=pending`.
1. Worker publica no portal via endpoint interno ou escrita em tabela de posts.
1. Atualiza status para `published` ou `failed`.

### 9) Implementar WF-07 (métricas)

1. Coletar CTR, leitura, tempo de permanência, compartilhamentos.
1. Escrever em `curated_posts.metrics`.
1. Ajustar pesos de score e prompts semanalmente.

## Governança Editorial

- Publicação automática apenas com score alto.
- Demais itens vão para revisão manual.
- Toda decisão de curadoria gera registro em `editorial_feedback`.

## Métricas de sucesso

1. % de itens aprovados sem revisão
1. Taxa de correção manual pós-publicação
1. Tempo médio coleta -> publicação
1. CTR por tema
1. Erros factuais por semana

## Próxima Entrega Recomendada

- WF-03 + WF-04 completos com nós LLM já parametrizados para o tom Vision7.
- Endpoint de publicação final integrado ao modelo de posts do portal.

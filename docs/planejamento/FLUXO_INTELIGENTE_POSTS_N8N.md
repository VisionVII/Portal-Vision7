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
- `SUPABASE_SERVICE_ROLE_KEY` com a key `sb_secret...` do projeto Supabase
  (não usar a JWT legada `service_role` de 219 caracteres)
- `OPENAI_API_KEY` (ou provedor LLM equivalente)

Validação rápida no runtime do n8n:

1. Crie temporariamente um node `Code` antes do `Fetch Groq Key`.
1. Use este código:

```javascript
return [{
  json: {
    supabaseUrl: $env.SUPABASE_URL || null,
    keyLength: ($env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    keyPrefix: ($env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 9),
    keySuffix: ($env.SUPABASE_SERVICE_ROLE_KEY || '').slice(-6),
  }
}];
```

1. O valor correto deve aparecer com `keyPrefix` iniciando em `sb_secret` e `keyLength = 41`.
1. Se aparecer `eyJ...` e `219`, o runtime ainda está com a key antiga ou o node está hardcoded.
1. No editor do n8n em modo Expression, não incluir o prefixo `=` manualmente.
1. Sinal de erro comum: `apiKeyLength = 42` e `authTokenLength = 49` indicam que o node está a enviar `=sb_secret...` e `=Bearer sb_secret...`.
1. Com `sb_secret`, para chamadas `rest/v1/...` use apenas o header `apikey`; reserve `Authorization: Bearer ...` para a Edge Function `functions/v1/get-pipeline-secret`.
1. Se um node `rest/v1/...` continuar a devolver `Expected 3 parts in JWT; got 2`, confirmar também que `Authentication` no HTTP Request está em `None`; autenticação oculta no node pode reinjetar um header `Authorization` mesmo quando ele não aparece na lista manual de headers.

### 2.1) Configuração editorial real no dashboard

O pipeline passou a usar uma configuração editorial persistida em `pipeline_search_config` com quatro camadas:

1. `label`: nome editorial do pipeline.
1. `language` e `region`: locale editorial usado como contexto operacional.
1. `theme_rules`: lista de temas editoriais com:

- `slug`: identificador estável do tema.
- `label`: nome visível na dashboard.
- `searchTerms`: termos usados na coleta.
- `postTags`: tags finais que devem acompanhar os posts desse tema.

1. `default_post_tags`: tags base aplicadas a todos os posts promovidos para o portal.

Na prática:

- mudar os temas da cobertura = editar `theme_rules.searchTerms`
- mudar a taxonomia final dos posts = editar `theme_rules.postTags` e `default_post_tags`
- mudar o contexto editorial do pipeline = editar `label`, `language` e `region`

Compatibilidade atual:

- o campo legado `tags` continua a ser preenchido automaticamente a partir dos `searchTerms`
- isso mantém o WF-01 compatível sem perder a nova modelagem editorial

### 2.2) Publicação final com caminho único

Fluxo atual real após a unificação:

1. O WF-03 grava apenas em `curated_posts`.
1. A promoção para `posts` passa pela Edge Function `promote-curated-post`.
1. Essa função central:

- resolve tags finais a partir da configuração editorial ativa
- evita duplicação de rascunhos
- atualiza `posting_queue`
- marca o item curado como `published`
- limpa `news_staging` e `news_clusters` apenas depois da promoção final

Consequência operacional:

- o n8n deixa de publicar diretamente no portal
- a dashboard continua a poder promover manualmente ou por auto-promoção, mas sempre pelo mesmo backend path

### 2.3) Configuração runtime do WF-03

O WF-03 passou a ler a automação `content_pipeline` ativa em `automations_v2` antes de montar o prompt editorial.

Campos atualmente usados em runtime:

1. `ai_prompt`: instruções editoriais adicionais anexadas ao prompt final.
1. `target_tone`: tom editorial preferido usado no prompt e salvo em `tone_profile`.
1. `keywords`: contexto adicional que a IA pode incorporar quando fizer sentido editorial.
1. `auto_publish`: habilita tentativa de promoção automática depois de salvar em `curated_posts`.
1. `review_required`: quando `true`, bloqueia a promoção automática mesmo com score alto.

Regra real atual:

1. WF-03 sempre grava primeiro em `curated_posts`.
1. Se `auto_publish=true`, `review_required=false` e `editorial_score >= 70`, o próprio WF-03 chama `promote-curated-post`.
1. Se qualquer uma dessas condições falhar, o item permanece em revisão manual.

### 2.4) Retenção e limpeza do pipeline

Regra operacional correta:

1. Um artigo **não** apaga `news_staging` nem `news_clusters` quando entra em `curated_posts`.
1. A limpeza automática por artigo acontece apenas no fecho do fluxo editorial, isto é, quando `promote-curated-post` conclui como `promoted`, `duplicate` ou `already_published`.
1. Enquanto o artigo está em `draft` ou `ready`, o cluster e o staging relacionado devem continuar disponíveis para rastreabilidade e reprocessamento.

Prática recomendada de mercado:

1. `staging` funciona como buffer temporário com TTL e purge por idade.
1. `clusters` funcionam como fila de trabalho e só devem ser removidos quando já não houver valor editorial nem dependências ativas.
1. `curated_posts` é o artefacto editorial de revisão; não deve perder contexto antes de publicação ou rejeição final.

No portal existem três níveis distintos de limpeza:

1. Limpeza segura: remove apenas `news_staging.processed` antigo, `curated_posts` já publicados/rejeitados antigos e clusters já encerrados.
1. Purge de backlog: remove `news_staging` não processado antigo e clusters órfãos antigos.
1. Reset completo: apaga o pipeline intermédio para recomeçar do zero.

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

1. Para a automação editorial que alimenta o WF-03, configure:

- `target_tone`: tom editorial desejado para os artigos gerados
- `ai_prompt`: instruções adicionais de escrita, cobertura ou enquadramento
- `keywords`: contexto opcional para reforçar entidades, termos ou temas prioritários
- `auto_publish=true` e `review_required=false` apenas se quiser promoção automática backend
- manter `review_required=true` quando a revisão humana continuar obrigatória

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

Estado atual no repositório:

- o prompt base já aceita `target_tone`, `ai_prompt` e `keywords` vindos da automação ativa
- o resultado continua a passar por score editorial antes de qualquer promoção ao portal

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
1. Worker ou dashboard publica no portal via Edge Function `promote-curated-post`.
1. Atualiza status para `published` ou `failed`.

### 9) Implementar WF-07 (métricas)

1. Coletar CTR, leitura, tempo de permanência, compartilhamentos.
1. Escrever em `curated_posts.metrics`.
1. Ajustar pesos de score e prompts semanalmente.

## Governança Editorial

- Publicação automática apenas com score alto.
- Publicação backend automática exige `auto_publish=true` e `review_required=false` na automação ativa.
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

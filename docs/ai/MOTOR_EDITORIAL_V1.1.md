# VISION7 — MOTOR EDITORIAL INTERNO
## Estrutura Completa para Geração de Artigos
### Versão 1.1 — Uso Interno / Workflows n8n
> Actualizado: Maio 2026
> Alterações v1.1: modelo IA clarificado (actual vs. alvo) · mapeamento de 6 WFs reais ·
> compatibilidade de escalas de scoring (0-10 vs 0-100) ·
> tabelas Supabase actuais vs. futuras · referências de ecossistema e infraestrutura adicionadas

---

## ÍNDICE

1. [Identidade Editorial](#1-identidade-editorial)
2. [Estrutura Base do Artigo](#2-estrutura-base-do-artigo)
3. [Sistema SEO / AEO](#3-sistema-seo--aeo)
4. [Sistema de Links](#4-sistema-de-links)
5. [Formatos de Texto e Sintaxe](#5-formatos-de-texto-e-sintaxe)
6. [Imagem de Capa — Dark Cinematic](#6-imagem-de-capa--dark-cinematic)
7. [Padrão por Categoria](#7-padrão-por-categoria)
8. [Checklist de Qualidade — Score 9.5+](#8-checklist-de-qualidade--score-95)
9. [Prompt Master para o Motor](#9-prompt-master-para-o-motor)
10. [Metadados de Saída (JSON Schema)](#10-metadados-de-saída-json-schema)

---

## 1. IDENTIDADE EDITORIAL

### Tom & Voz
- **Tom principal:** Analítico, não meramente descritivo. O artigo deve interpretar, projetar e contextualizar — nunca apenas relatar.
- **Persona:** Jornalista especializado sénior com acesso a dados primários. Escreve com autoridade, sem ser arrogante.
- **Idioma:** Português Europeu (PT-PT). Nunca PT-BR.
- **Evitar sempre:** Clichés jornalísticos, frases de abertura genéricas ("Num mundo cada vez mais..."), linguagem passiva excessiva, conclusões vagas.

### Público-Alvo
- Profissionais e decisores portugueses e lusófonos, 25–55 anos
- Nível: intermédio a avançado na temática do artigo
- Expectativa: saírem com algo concreto, accionável ou com uma perspectiva nova

---

## 2. ESTRUTURA BASE DO ARTIGO

### 2.1 Anatomia Obrigatória (por ordem)

```
[TÍTULO PRINCIPAL — H1]
[META DESCRIPTION — não visível no artigo]
[LEAD PARAGRAPH — 2-3 frases, máximo 60 palavras]
[ÍNDICE / TABLE OF CONTENTS com âncoras]
[SECÇÃO 1 — H2 com âncora]
  [Sub-secções H3 se necessário]
  [Dado quantitativo obrigatório]
[SECÇÃO 2 — H2 com âncora]
  [Entidade SEO real mencionada]
[SECÇÃO 3 — H2 com âncora]
  [Framework Visual / Tabela / Comparativo]
[SECÇÃO PORTUGAL — H2 com âncora]
  [3 cenários obrigatórios]
[PREVISÃO DATADA — integrada numa secção ou H2 próprio]
[CONCLUSÃO — H2]
[CTA — Call to Action com valor concreto]
[LINKS INTERNOS CONTEXTUAIS — distribuídos pelo texto]
```

### 2.2 Dimensões do Artigo

| Tipo | Palavras | Secções H2 | Uso |
|------|----------|------------|-----|
| Artigo Padrão | 1.400–1.800 | 5–7 | Maioria dos artigos |
| Artigo Long-Form | 2.000–2.800 | 7–10 | Temas complexos, análises de fundo |
| Artigo Notícia | 600–900 | 3–4 | Breaking news, actualidade imediata |
### 2.3 Lead Paragraph

- Máximo 60 palavras
- Deve conter: O QUÊ aconteceu/está a acontecer + POR QUÊ importa + PARA QUEM
- Nunca começar com "Este artigo...", "Neste texto...", "Vamos explorar..."
- Exemplo de estrutura: `[Dado concreto ou facto surpreendente]. [Contexto de 1 frase]. [O que o leitor vai encontrar aqui].`

### 2.4 Table of Contents (ToC)

Formato obrigatório em Markdown com âncoras HTML:

```markdown
## Índice
- [Nome da Secção 1](#nome-da-seccao-1)
- [Nome da Secção 2](#nome-da-seccao-2)
- [Portugal: Cenários e Impacto](#portugal-cenarios-e-impacto)
- [Conclusão](#conclusao)
```

Regras das âncoras:
- Tudo em minúsculas
- Espaços substituídos por hífens `-`
- Remover acentos e caracteres especiais na âncora (mas manter no título visível)
- Exemplo: `## Inteligência Artificial em 2025` → âncora `#inteligencia-artificial-em-2025`

### 2.5 Secção Portugal

Obrigatória em todos os artigos. Deve conter exactamente 3 cenários:

```
**Cenário Optimista:** [descrição + condição necessária]
**Cenário Base:** [descrição + probabilidade estimada]
**Cenário Pessimista:** [descrição + risco principal]
```

Entidades portuguesas a mencionar (quando relevante): AICEP, Banco de Portugal, ANACOM, DGS, FCT, INE, empresas da PSI-20.

### 2.6 Previsão Datada

Cada artigo deve conter pelo menos uma previsão com data específica:

```
"Até [mês/ano], [entidade ou sector] deverá [resultado quantificado], 
segundo [fonte ou modelo de projecção]."
```

Exemplos válidos:
- "Até ao final de 2026, o mercado europeu de IA generativa deverá atingir €47 mil milhões (IDC, 2024)."
- "Em 2027, mais de 60% das PME portuguesas terão adoptado alguma forma de automação cognitiva."

---

## 3. SISTEMA SEO / AEO

### 3.1 SEO Técnico

#### Título (H1)
- 55–65 caracteres
- Palavra-chave principal nos primeiros 5 palavras (idealmente)
- Formato de alto CTR: `[Número/Dado] + [Tópico] + [Benefício ou Contexto]`
- Exemplos:
  - ✅ `IA Generativa: 7 Impactos Concretos para Empresas Portuguesas em 2025`
  - ✅ `Como a NVIDIA Domina o Mercado de Chips de IA — e o Que Muda em 2026`
  - ❌ `Tudo sobre Inteligência Artificial`

#### Meta Description
- 145–155 caracteres exactos
- Deve conter: keyword principal + benefício claro + call-to-micro-action
- Formato: `[Keyword principal] [contexto/dado]. [Benefício para o leitor]. [Micro-CTA opcional].`

#### URL Slug
- Máximo 6 palavras
- Apenas minúsculas e hífens
- Sem acentos, sem artigos ("o", "a", "os", "as", "de", "da")
- Exemplo: `ia-generativa-impacto-empresas-portugal`

#### Keywords
```json
{
  "primary_keyword": "keyword principal (1–3 palavras)",
  "secondary_keywords": ["keyword 2", "keyword 3", "keyword 4"],
  "lsi_keywords": ["variante semântica 1", "variante semântica 2", "variante semântica 3"],
  "long_tail": ["frase de pesquisa longa 1", "frase de pesquisa longa 2"]
}
```

#### Densidade de Keywords
- Keyword principal: 0.8%–1.2% do total de palavras
- Nunca forçar — a keyword deve fluir naturalmente
- Variantes semânticas (LSI) distribuídas ao longo do texto

### 3.2 AEO — Answer Engine Optimization

O AEO prepara o artigo para respostas directas em motores de IA (ChatGPT, Perplexity, Gemini, SearchGPT).

#### Regras AEO

**1. FAQ Structure**
Cada artigo deve ter 2–4 perguntas em formato H3 + resposta directa em parágrafo (max. 55 palavras):

```markdown
### O que é [tópico]?
[Resposta directa em 1–3 frases. Máximo 55 palavras. Começar com definição ou facto concreto.]

### Porque é que [tópico] importa para Portugal?
[Resposta directa com dado local.]
```

**2. Definições Claras**
Quando introduzir um conceito técnico, usar o padrão:
```
**[Termo]** é [definição em linguagem directa, máximo 25 palavras].
```

**3. Dados Citáveis**
Cada secção deve conter pelo menos 1 dado quantitativo com fonte:
```
[Dado numérico] ([Organização/Fonte], [Ano]).
```

**4. Structured Snippets**
Usar listas, tabelas e comparativos que possam ser extraídos directamente por motores de IA:
- Listas "Os X melhores/maiores/mais importantes..."
- Tabelas comparativas com 2–4 colunas
- Timelines com datas específicas

**5. Entidades Nomeadas (NER)**
Mencionar explicitamente entidades reconhecidas globalmente para aumentar a autoridade semântica:

| Categoria | Entidades Exemplo |
|-----------|------------------|
| Tecnologia | NVIDIA, TSMC, Intel, AMD, Google DeepMind, Anthropic, OpenAI, IBM, Microsoft, Apple |
| Finanças | FMI, BCE, Goldman Sachs, Morgan Stanley, BlackRock |
| Saúde | OMS, FDA, EMA, Mayo Clinic, Pfizer, Roche |
| Portugal | Banco de Portugal, INE, AICEP, Ministério da Economia, Universidade de Lisboa |

**6. Heading Questions**
Pelo menos 2 H2 ou H3 devem estar em formato de pergunta:
- ✅ `## O Que Muda para as Empresas Portuguesas?`
- ✅ `### Qual é o Impacto Real no Emprego?`

---

## 4. SISTEMA DE LINKS

### 4.1 Links Internos

**Volume:** 3–5 links internos por artigo (mínimo 2, máximo 7)

**Regras:**
- Colocar **dentro do corpo do texto**, de forma contextual — nunca em bloco separado no final
- O anchor text deve ser descritivo e conter keyword relevante
- Distribuir pelos primeiros 2/3 do artigo (não concentrar no final)
- Nunca linkar para a homepage ou para páginas de categoria sem motivo editorial

**Formato:**
```markdown
[anchor text descritivo](/categoria/slug-do-artigo)
```

**Padrão de Anchor Text:**
- ✅ `saiba mais sobre o impacto da IA na saúde portuguesa`
- ✅ `análise completa ao mercado de chips de IA`
- ❌ `clique aqui`
- ❌ `leia mais`
- ❌ `artigo relacionado`

**Slugs base por categoria:**
```
/tecnologia/
/mundo/
/saude/
/musica/
/desporto/
```

### 4.2 Links Externos

**Volume:** 2–4 links externos por artigo

**Critérios de qualidade:**
- Domínio com autoridade reconhecida (DA 50+)
- Fonte primária sempre preferida: estudos, relatórios oficiais, publicações científicas
- Nunca linkar para concorrentes directos ou fontes de baixa credibilidade

**Atributos obrigatórios:**
```markdown
[anchor text](https://fonte-externa.com/pagina) — abrir em nova tab: target="_blank" rel="noopener noreferrer"
```

Em Markdown puro (para CMS que suporta HTML inline):
```html
<a href="https://fonte-externa.com" target="_blank" rel="noopener noreferrer">anchor text</a>
```

**Fontes externas preferenciais por categoria:**

| Categoria | Fontes Preferenciais |
|-----------|---------------------|
| Tecnologia | MIT Technology Review, The Verge, Wired, IEEE Spectrum, arXiv |
| Mundo | Reuters, Financial Times, The Economist, Le Monde |
| Saúde | The Lancet, NEJM, OMS, PubMed, JAMA |
| Desporto | UEFA.com, FIFA.com, ESPN, Sky Sports |
| Música | Pitchfork, Billboard, NME, Rolling Stone |
| Portugal | Público, Expresso, ECO, Observador, INE.pt |

### 4.3 Links de Afiliados / Monetização

Quando aplicável:
```html
<a href="https://link-afiliado.com" target="_blank" rel="sponsored noopener">anchor text</a>
```
- Usar `rel="sponsored"` obrigatoriamente (norma Google)
- Identificar editorialmente: "(parceiro Vision7)" ou "(link de afiliado)"

---

## 5. FORMATOS DE TEXTO E SINTAXE

### 5.1 Hierarquia de Headings

```
H1  — Título do artigo (apenas 1 por artigo)
H2  — Secções principais (5–7 por artigo)
H3  — Sub-secções dentro de uma H2 (máximo 3 por H2)
H4  — Usar raramente, apenas em conteúdo técnico muito detalhado
```

Nunca saltar níveis: não usar H3 sem H2 pai, não usar H4 sem H3 pai.

### 5.2 Parágrafos

- **Comprimento ideal:** 3–5 frases por parágrafo
- **Comprimento máximo:** 7 frases
- **Frases:** Máximo 25 palavras por frase (média)
- **Espaçamento:** Linha em branco entre cada parágrafo
- **Regra de ouro:** Uma ideia por parágrafo

### 5.3 Formatação de Destaque

```markdown
**negrito** — para termos-chave, dados importantes, nomes de entidades na primeira menção
*itálico*  — para títulos de obras, termos técnicos em inglês, ênfase editorial ligeira
`código`   — para termos técnicos, nomes de tecnologias, comandos
~~riscado~~ — usar com extrema parcimónia, apenas para contextualizar versões antigas/incorrectas
```

**Regras de Negrito:**
- Máximo 1 expressão em negrito por parágrafo
- Não negritar frases inteiras, apenas o termo ou dado-chave
- Sempre negritar: nomes de empresas na primeira menção, dados percentuais relevantes, definições

### 5.4 Listas

**Lista não-ordenada** (bullets):
```markdown
- Item 1 (frase completa ou sintagma nominal)
- Item 2
- Item 3
```
- Mínimo 3 itens, máximo 8
- Cada item deve ser paralelo gramaticalmente com os outros
- Não terminar com ponto final nos items (a não ser que sejam frases completas)

**Lista ordenada** (numerada):
```markdown
1. Primeiro passo ou item mais importante
2. Segundo
3. Terceiro
```
- Usar quando a ordem importa (rankings, passos de processo, cronologias)

**Listas aninhadas:**
```markdown
- Item principal
  - Sub-item (máximo 1 nível de profundidade)
  - Sub-item
```

### 5.5 Tabelas

Formato Markdown padrão:

```markdown
| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Dado 1   | Dado 2   | Dado 3   |
| Dado 4   | Dado 5   | Dado 6   |
```

**Regras de tabelas:**
- Máximo 5 colunas (legibilidade mobile)
- Header row sempre presente e descritivo
- Dados alinhados à esquerda por defeito
- Números alinhados à direita (usar `:` no separador)
- Não usar tabelas com mais de 10 linhas sem motivo analítico sólido

**Alinhamento:**
```markdown
| Esquerda | Centro | Direita |
|:---------|:------:|--------:|
| texto    | texto  |  123.45 |
```

### 5.6 Callouts / Blocos de Destaque

Para highlights editoriais importantes, usar blockquote com contexto:

```markdown
> **Dado Chave:** [Estatística ou insight mais importante do artigo, em 1–2 frases.]
```

Para previsões:
```markdown
> **Previsão Vision7:** Até [data], [resultado esperado] — [fundamentação breve].
```

Para definições AEO:
```markdown
> **O que é [termo]?** [Definição directa em máximo 30 palavras.]
```

### 5.7 Separadores e Estrutura Visual

Entre secções longas, usar linha horizontal para descanso visual (opcional, dependendo do CMS):
```markdown
---
```

### 5.8 Sintaxe de Código (para artigos de Tecnologia)

Blocos de código:
````markdown
```linguagem
// código aqui
```
````

Inline code para termos técnicos: `` `GPT-4o` ``, `` `Claude 3.5` ``, `` `API REST` ``

### 5.9 Framework Visual Proprietário

Cada artigo deve incluir pelo menos um dos seguintes elementos visuais analíticos:

**Opção A — Tabela Comparativa:**
Comparar 3–5 alternativas, tecnologias, países ou cenários em múltiplas dimensões.

**Opção B — Escala/Índice Vision7:**
```
📊 ÍNDICE VISION7 DE [TÓPICO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Adopção Global:     ████████░░  80%
Impacto em Portugal:████████░░░  75%
Velocidade de Mudança: ██████░░░░  60%
Risco Regulatório:  ████░░░░░░  40%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Opção C — Timeline Datada:**
```
[Ano] → [Evento/Marco]
[Ano] → [Evento/Marco]
[Ano]* → [Previsão] (*projecção Vision7)
```

**Opção D — Matriz 2×2:**
Posicionar entidades ou conceitos num quadrante (ex: Risco vs Oportunidade, Custo vs Impacto).

---

## 6. IMAGEM DE CAPA — DARK CINEMATIC

### 6.1 Especificações Técnicas
- **Dimensões:** 1200×630px (Open Graph padrão)
- **Formato:** JPG ou WebP
- **Sem texto, sem logos, sem marcas** na imagem
- **Sem rostos humanos identificáveis**

### 6.2 Estilo Visual
- Fundos escuros: preto profundo, azul meia-noite (#0a0f1c), cinzento carvão (#1a1a2e)
- Iluminação dramática: neon, volumétrica, luz de ecrã ou ambiental
- Estética: CGI fotorrealista ou fotografia editorial de alta produção
- Metáfora visual — nunca ilustração literal do título

### 6.3 Paleta de Cor por Categoria

| Categoria | Cor de Acento | Hex | Mood |
|-----------|--------------|-----|------|
| Tecnologia | Azul elétrico / Cyan | #00d4ff / #0066ff | Futurista, preciso |
| Mundo | Âmbar / Dourado | #f59e0b / #d97706 | Global, urgente |
| Saúde | Verde esmeralda | #10b981 / #059669 | Vital, científico |
| Música | Violeta / Púrpura | #8b5cf6 / #7c3aed | Criativo, emocional |
| Desporto | Vermelho / Laranja | #ef4444 / #f97316 | Energia, intensidade |
### 6.4 Prompt Template para Geração de Imagem

```
Dark cinematic editorial photograph, [METÁFORA VISUAL DO TEMA], 
deep black background with [COR DE ACENTO DA CATEGORIA] neon lighting, 
dramatic volumetric light, photorealistic CGI quality, 
no text, no logos, no faces, 
16:9 ratio, ultra high definition, editorial magazine cover style,
[DETALHE ESPECÍFICO DO TEMA]
```

---

## 7. PADRÃO POR CATEGORIA

### TECNOLOGIA
- **Entidades obrigatórias:** Pelo menos 3 de: NVIDIA, TSMC, Intel, AMD, Anthropic, OpenAI, Google, Microsoft, Apple, Meta
- **Dados obrigatórios:** Market cap, quota de mercado, ou crescimento percentual
- **Ângulo Portugal:** Startups portuguesas, adopção empresarial, programas de financiamento (PRR, PT2030)
- **Tom:** Técnico mas acessível; evitar hype sem dados

### MUNDO
- **Entidades obrigatórias:** Países, organismos internacionais (ONU, FMI, NATO, UE), líderes políticos relevantes
- **Dados obrigatórios:** PIB, indicadores económicos, estatísticas populacionais/geopolíticas
- **Ângulo Portugal:** Impacto na política externa portuguesa, comunidades lusófonas, relações bilaterais
- **Tom:** Geopolítico, contextualizado historicamente

### SAÚDE
- **Entidades obrigatórias:** OMS, EMA, DGS, instituições científicas de referência
- **Dados obrigatórios:** Estatísticas clínicas, dados epidemiológicos, taxa de adopção de tratamentos
- **Ângulo Portugal:** SNS, estatísticas de saúde portuguesas, estudos com participação portuguesa
- **Tom:** Rigoroso, cuidadoso com claims de saúde; sempre citar fontes peer-reviewed
- **Aviso obrigatório:** Artigos de saúde devem incluir: `*Este artigo tem fins informativos. Consulte sempre um profissional de saúde.*`

### MÚSICA
- **Entidades obrigatórias:** Artistas, editoras, plataformas (Spotify, Apple Music, YouTube Music)
- **Dados obrigatórios:** Números de streaming, posições em charts, receitas do sector
- **Ângulo Portugal:** Música portuguesa, artistas nacionais, festivais (NOS Alive, MEO Kalorama, Super Bock Super Rock)
- **Tom:** Cultural, apaixonado, mas analiticamente fundamentado

### DESPORTO
- **Entidades obrigatórias:** Clubes, federações, ligas relevantes
- **Dados obrigatórios:** Estatísticas de jogo, transferências, receitas de clubes
- **Ângulo Portugal:** Liga Portugal, selecção nacional, atletas portugueses no estrangeiro
- **Tom:** Factual para resultados; analítico para contexto táctico/económico

---

## 8. CHECKLIST DE QUALIDADE — SCORE 9.5+

### Compatibilidade de Escalas

O motor interno actual usa `editorial_score` (0–100). O padrão Vision7 Engine usa
`quality_score` (0–10). Durante a transição, ambos coexistem:

| Campo | Escala | Usado em | Threshold de aprovação |
|-------|--------|----------|------------------------|
| `editorial_score` | 0–100 | `curated_posts` (legado) | ≥ 80 para `ready` |
| `quality_score` | 0–10 | `curated_posts` (Engine) | ≥ 9.5 para publicação auto |

**Conversão:** `quality_score = editorial_score / 10`

No WF-03, após o cálculo do score, guardar ambos:
```json
{
  "editorial_score": 87,
  "quality_score": 8.7
}
```

A migração completa para `quality_score` acontece quando o Prompt Master
estiver em produção e os scores forem recalibrados.

---

O motor deve verificar estes critérios antes de entregar o artigo:

### Estrutura (obrigatório — peso 30%)
- [ ] H1 único, entre 55–65 caracteres
- [ ] ToC presente com âncoras funcionais
- [ ] 5+ secções H2 (excepto Notícia)
- [ ] Secção Portugal com 3 cenários
- [ ] Lead de máximo 60 palavras
- [ ] Pelo menos 1 previsão datada

### SEO/AEO (obrigatório — peso 25%)
- [ ] Meta description entre 145–155 caracteres
- [ ] Keyword principal no H1 e no primeiro parágrafo
- [ ] 2–4 FAQs em H3 com respostas directas
- [ ] 3+ entidades nomeadas de referência
- [ ] Pelo menos 2 H2/H3 em formato de pergunta
- [ ] LSI keywords distribuídas naturalmente

### Dados & Fontes (obrigatório — peso 20%)
- [ ] Mínimo 1 dado quantitativo com fonte por secção H2
- [ ] Fontes com nome de organização e ano
- [ ] Links externos para fontes primárias (2–4)

### Links (obrigatório — peso 10%)
- [ ] 3–5 links internos contextuais
- [ ] Anchor text descritivo (sem "clique aqui")
- [ ] Links externos com rel="noopener noreferrer"

### Formato & Legibilidade (obrigatório — peso 10%)
- [ ] Parágrafos de 3–5 frases
- [ ] Pelo menos 1 framework visual (tabela, índice, timeline ou matriz)
- [ ] Negrito usado com moderação (máximo 1 por parágrafo)
- [ ] Sem heading levels salteados

### Tom & Qualidade (obrigatório — peso 5%)
- [ ] Tom analítico, não apenas descritivo
- [ ] CTA final com valor concreto
- [ ] Sem clichés de abertura
- [ ] PT-PT consistente

---

## 9. PROMPT MASTER PARA O MOTOR

Este é o prompt base a injectar no motor de geração (Claude / GPT-4o) via n8n:

```
SISTEMA: És o motor editorial da Vision7, um portal jornalístico de referência em língua portuguesa. 
Escreves em Português Brasileiro (PT-BR). O teu estilo é analítico, preciso e orientado para dados. 
Nunca és genérico. Nunca usas clichés. Cada artigo deve ter valor informativo real para profissionais de língua portuguesa.

TAREFA: Gerar um artigo completo sobre [TÓPICO] para a categoria [CATEGORIA].

INPUTS:
- Tópico: {{tópico}}
- Categoria: {{categoria}}
- Keyword Principal: {{keyword_principal}}
- Keywords Secundárias: {{keywords_secundárias}}
- Ângulo editorial: {{angulo}} (ex: "análise de impacto", "notícia breaking", "deep dive técnico")
- Comprimento alvo: {{palavras}} palavras
- Links internos a incluir: {{lista_de_links_internos}}

ESTRUTURA OBRIGATÓRIA A SEGUIR:
1. H1 (55–65 chars, keyword no início)
2. Meta description (145–155 chars)
3. URL slug (máximo 6 palavras, sem acentos)
4. Lead (máximo 60 palavras)
5. ToC com âncoras
6. Corpo do artigo com secções H2 (cada uma com dado quantitativo com fonte)
7. 2–4 FAQs em H3
8. Secção Portugal com 3 cenários (optimista, base, pessimista)
9. Previsão datada
10. Framework visual (tabela comparativa, índice, timeline, ou matriz)
11. Conclusão
12. CTA com valor concreto
13. Links internos contextuais: {{lista_de_links_internos}}
14. Links externos: citar 2–4 fontes primárias de autoridade

ENTIDADES: Mencionar explicitamente pelo menos 3 entidades reconhecidas globalmente relevantes para {{categoria}}.

IMAGEM DE CAPA: Gerar prompt para imagem seguindo o padrão Dark Cinematic da categoria {{categoria}}.

OUTPUT FORMAT: Devolver em JSON com os campos definidos no schema de saída.
```

---

## 10. METADADOS DE SAÍDA (JSON Schema)

O motor deve devolver o artigo neste formato JSON para ingestão pelo portal:

```json
{
  "article": {
    "title": "string (H1, 55–65 chars)",
    "slug": "string (máx 6 palavras, sem acentos, hífens)",
    "meta_description": "string (145–155 chars)",
    "category": "tecnologia | mundo | saude | musica | desporto",
    "author": "string (nome do autor ou 'Motor Vision7')",
    "published_at": "ISO8601 datetime",
    "reading_time_minutes": "number",
    "word_count": "number",
    
    "seo": {
      "primary_keyword": "string",
      "secondary_keywords": ["string"],
      "lsi_keywords": ["string"],
      "long_tail_keywords": ["string"],
      "entities": ["string"]
    },
    
    "cover_image": {
      "prompt": "string (prompt Dark Cinematic gerado)",
      "alt_text": "string (descritivo, com keyword)",
      "color_accent": "string (hex da categoria)"
    },
    
    "content": {
      "lead": "string",
      "table_of_contents": [
        { "title": "string", "anchor": "string" }
      ],
      "body": "string (Markdown completo do artigo)",
      "sections": [
        {
          "heading": "string",
          "anchor": "string",
          "level": "H2 | H3",
          "has_data": "boolean",
          "word_count": "number"
        }
      ],
      "faqs": [
        { "question": "string", "answer": "string (máx 55 palavras)" }
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
      "passed": "boolean (true se total >= 9.5)"
    },
    
    "workflow_metadata": {
      "wf_id": "string (ex: WF-02)",
      "generation_model": "string",
      "generation_timestamp": "ISO8601",
      "review_required": "boolean",
      "publish_ready": "boolean"
    }
  }
}
```

---

## NOTAS DE IMPLEMENTAÇÃO PARA N8N

### Arquitectura de Workflows — Motor Interno Vision7

O Editorial Engine integra-se no motor interno de 6 workflows. A geração editorial
acontece no **WF-03**, que agrega: busca de fontes, construção de prompt, chamada à IA,
auditoria de qualidade, salvaguarda e notificação.

| WF | Nome | Cadência | Estado | Onde se integra o Engine |
|----|------|----------|--------|---------------------------|
| WF-01 | Coleta RSS | 30min | ✅ Activo | Adicionar routing por categoria Vision7 |
| WF-02 | Dedup + Cluster | 20min | ✅ Activo | Propagar campo `category` para `news_clusters` |
| WF-03 | Geração IA + Auditoria | 60min | ✅ Activo | **Ponto principal de integração do Engine** |
| WF-04 | Monitor Autónomo | 2h | ❌ Inactivo | Adicionar alerta `quality_score < 9.5` |
| WF-05 | Distribuição Social | 30min | ❌ Inactivo | Adicionar nó de geração de imagem de capa |
| WF-06 | Learning Loop | Diário | ❌ Inactivo | Adicionar métricas Engine ao weekly report |

**Sequência de integração no WF-03:**
```
Trigger (Schedule/Webhook)
  ↓ Validar chave IA (Groq ou Anthropic)
  ↓ Fetch cluster de alta prioridade (news_clusters)
  ↓ Fetch artigos-fonte (news_staging por fingerprint)
  ↓ Fetch posts recentes (para interlinking)
  ↓ Build AI Prompt [← injectar Prompt Master Engine aqui]
  ↓ Chamar modelo IA
  ↓ Audit + Quality Score [← usar checklist Vision7 9.5+ aqui]
  ↓ Filter (skip se quality_score < 7.0)
  ↓ Generate Cover Image Prompt [← novo nó dark cinematic]
  ↓ Save curated_posts + notificar + promover
  ↓ Mark cluster como is_curated = true
```

### Tabelas Supabase — Estado Actual

As tabelas abaixo são as que existem confirmadamente no schema actual:

**Pipeline de conteúdo (activas):**
- `news_staging` — artigos coletados (WF-01)
- `news_clusters` — clusters deduplicados (WF-02)
- `curated_posts` — artigos gerados e auditados (WF-03)
- `posts` — artigos publicados no portal público
- `post_distributions` — registo de distribuição por canal (WF-05)
- `sitemap_entries` — índice para Google (WF-05)
- `post_performance` — snapshots de performance (WF-06)

**Monitoramento (activas):**
- `pipeline_alerts` — alertas do WF-04
- `pipeline_search_config` — config de feeds e temas (WF-01)
- `automations_v2` — config das automações
- `automation_executions` — histórico de execuções

**Tabelas futuras (não existem ainda — não referenciar nos workflows actuais):**
- `posting_queue` — fila de publicação agendada (arquitectura WF-06/07 futura)
- `editorial_feedback` — loop de aprendizagem avançado (arquitectura WF-07 futura)

> Estas tabelas futuras estão descritas na `automacoes-portal.skill.md` como
> arquitectura alvo. Só criar quando os workflows correspondentes forem implementados.

### Modelo de IA — Estado Actual vs. Migração Alvo

**Estado actual (produção):**
- Geração de artigos: Groq `llama-3.3-70b-versatile` via `GROQ_API_KEY`
- Fallback: HuggingFace `mistralai/Mistral-7B-Instruct-v0.3` via `HF_API_TOKEN`
- Nota: O WF-03 actual valida e usa ambos via lógica de fallback automática

**Migração alvo (recomendada):**
- Geração editorial (máxima qualidade): `claude-opus-4-6`
- Validação/QA: `claude-sonnet-4-6`
- Metadados rápidos (slug, meta description): `claude-haiku-4-5-20251001`
- Variável de ambiente a adicionar: `ANTHROPIC_API_KEY`

> ⚠️ O Prompt Master acima está escrito para o modelo alvo (Claude).
> Para usar com Groq no estado actual, manter a estrutura do prompt mas
> reduzir o output esperado para ~1.500 tokens e simplificar o JSON de saída
> para os campos que o `llama-3.3-70b-versatile` consegue produzir de forma fiável.

---

---

## 11. REFERÊNcias DO ECOSSISTEMA VISION7

### Infraestrutura de Produção
- **n8n (workflows):** `https://portal-vision7.onrender.com` (Render Community Edition)
- **Supabase:** Projecto `xhpfxvoonpclonjyfimt` — West EU (Ireland)
- **Portal público:** `https://vision7.pt`
- **Frontend:** React 18 + Vite + TypeScript — Vercel Edge Network

### Documentação Interna (fontes de verdade)
- **SDD motor de automações:** `sdd/modules/automation-engine.json` (v2.1.0)
- **SDD legado:** `sdd/modules/automation-n8n.json`
- **Skill de automações:** `docs/ai/automacoes-portal.skill.md`
- **Skill de curadoria:** `docs/ai/curadoria-inteligente.skill.md`
- **Agente de automações:** `docs/ai/agente-automacoes.agent.md`
- **Análise de arquitectura:** `docs/planejamento/FLUXO_INTELIGENTE_POSTS_N8N.md`
- **Análise de segurança:** `docs/seguranca/ANALISE_ARQUITETURA_COMPLETA.md`

### Segurança — Blocker para Produção Automatizada
Antes de activar publicação automática sem revisão humana, confirmar:
- [ ] MFA (TOTP/WebAuthn) activo para roles `admin` e `super_admin`
- [ ] Security headers configurados no Vercel (HSTS, X-Frame-Options, CSP)
- [ ] Rate limiting granular nas Edge Functions
- [ ] Supabase Auth URL sem referências a localhost

### Variáveis de Ambiente — Referência Completa

| Variável | Obrigatória | Usado em | Notas |
|----------|-------------|----------|-------|
| `SUPABASE_URL` | ✅ | Todos os WFs | URL do projecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Todos os WFs | Nunca expor no frontend |
| `GROQ_API_KEY` | ✅ (actual) | WF-03 | Modelo actual de geração |
| `HF_API_TOKEN` | Fallback | WF-03 | Fallback se Groq falhar |
| `ANTHROPIC_API_KEY` | ✅ (migração) | WF-03 | Modelo alvo do Engine |
| `IMAGE_GEN_API_KEY` | Alta | WF-03 (novo nó) | Geração imagem de capa |
| `SITE_URL` | ✅ | WF-05, WF-06 | URL pública do portal |
| `TWITTER_BEARER_TOKEN` | Média | WF-05 | Distribuição Twitter/X |
| `LINKEDIN_ACCESS_TOKEN` | Média | WF-05 | Distribuição LinkedIn |
| `LINKEDIN_AUTHOR_ID` | Média | WF-05 | ID do perfil LinkedIn |

---

*Vision7 Editorial Engine v1.1 — Documento interno. Não partilhar externamente.*
*Última actualização: Maio 2026 | Próxima revisão: após migração WF-03 para Claude*

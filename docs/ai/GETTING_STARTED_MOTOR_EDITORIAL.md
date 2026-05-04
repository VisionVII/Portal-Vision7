# 🚀 MOTOR EDITORIAL VISION7 — GETTING STARTED (5 MIN)

## O Que É?

Motor Editorial Vision7 é um **sistema de geração automática de artigos** que funciona em n8n (WF-02). Entra: briefing → sai: artigo pronto para publicação com quality score.

---

## 📋 PRÉ-REQUISITOS

- [ ] Acesso a n8n (`https://portal-vision7.onrender.com`)
- [ ] Acesso a Notion (briefing database)
- [ ] Acesso a Supabase (destino final)
- [ ] Variáveis de ambiente configuradas (Anthropic API, Notion API)

---

## 🎯 FLUXO EM 3 PASSOS

### Passo 1: Criar Briefing no Notion
```
Tópico: [tema do artigo]
Categoria: [tecn|mundo|saude|musica|desporto|audio]
Keyword: [palavra-chave principal]
Ângulo Editorial: [análise|notícia|guia|deep dive]
Status: "pronto para redação"
```

### Passo 2: Workflow n8n (Automático)
```
✅ Ler Notion → Enriquecer dados → Gerar via Claude → Validar → Publicar
⏱️ Tempo: ~3–5 minutos
```

### Passo 3: Verificar no Portal
```
https://portal-vision7.onrender.com/categoria/slug-do-artigo
Quality Score: Visível no backend admin
```

---

## ✅ CHECKLIST ANTES DE COMEÇAR

Qual é o seu papel?

- **Redator/Jornalista:** Vá para [Como Escrever um Artigo](#como-escrever-um-artigo)
- **Operador n8n:** Vá para [Como Executar o Workflow](#como-executar-o-workflow)
- **Revisor Editorial:** Vá para [Como Validar](#como-validar)

---

## 📝 COMO ESCREVER UM ARTIGO

### 1. Estrutura Base (5 min)

Siga este template:

```markdown
# [TÍTULO] (55–65 chars, com keyword)

[LEAD: máximo 60 palavras. O QUÊ + POR QUÊ importa + PARA QUEM]

## Índice
- [Secção 1](#secao-1)
- [Secção 2](#secao-2)
- [Portugal](#portugal)
- [Conclusão](#conclusao)

## Secção 1
[2–3 parágrafos, 250 palavras]
[✅ Incluir 1 dado com fonte]

## Secção 2
[Similar a Secção 1]

## Secção 3–5
[Similar]

## Portugal: Cenários
**Cenário Optimista:** [texto]
**Cenário Base:** [texto]
**Cenário Pessimista:** [texto]

## Conclusão
[150 palavras]
**CTA:** [call to action com valor concreto]
```

### 2. Checklist Essencial (2 min)

Antes de enviar, verificar:

- [ ] H1 entre 55–65 caracteres
- [ ] Lead com máximo 60 palavras
- [ ] 5+ secções H2
- [ ] Cada secção tem 1+ dado com fonte
- [ ] Portugal com 3 cenários
- [ ] 1+ previsão datada
- [ ] 2–4 FAQs
- [ ] 3–5 links internos contextuais
- [ ] 2–4 links externos (fontes de autoridade)
- [ ] Nenhum clichê de abertura
- [ ] Tom analítico, não apenas descritivo

### 3. Formatação (1 min)

```markdown
**Negrito** = termos-chave, dados importantes
*Itálico* = títulos de obras, termos técnicos inglês
- Listas com ≥3 itens
| Tabelas | para | dados |
> Blockquotes para definições/dados-chave
```

---

## 🤖 COMO EXECUTAR O WORKFLOW (n8n)

### Via Interface n8n

1. Abrir `https://portal-vision7.onrender.com/editor`
2. Selecionar workflow **WF-02 Editorial Engine**
3. Verificar trigger:
   - **Notion integration:** status = "pronto para redação"
   - Ou **Manual trigger:** botão "Execute Workflow"
4. Clicar em **Play** (▶️)
5. Esperar 3–5 minutos
6. Verificar resultado em **Executions** tab

### Via API (cURL)

```bash
curl -X POST https://portal-vision7.onrender.com/workflows/WF-02/execute \
  -H "Authorization: Bearer ${N8N_API_KEY}" \
  -d '{ "briefing_notion_id": "{{notion_page_id}}" }'
```

### Status de Execução

| Status | Significado | Ação |
|--------|-----------|------|
| ✅ Success | Artigo publicado | Verificar no portal |
| ⚠️ Warning | Quality score 8.5–9.4 | Revisar antes publicar |
| ❌ Error | Falha em algum step | Verificar logs n8n |

---

## 🔍 COMO VALIDAR (REVISÃO QA)

### 1. Validação Visual (2 min)

```
☐ H1 aparece como título principal?
☐ Lead é legível e conciso?
☐ ToC tem âncoras funcionais?
☐ Imagem de capa está presente e relevante?
☐ Links internos funcionam?
☐ Links externos abrem em nova aba?
```

### 2. Validação de Dados (1 min)

```
☐ Cada secção tem ≥1 dado + fonte?
☐ Fontes têm data e organização?
☐ Dados são números específicos (não genéricos)?
☐ Fontes são de autoridade reconhecida?
```

### 3. Validação de SEO (1 min)

```
☐ Meta description entre 145–155 chars?
☐ Keyword principal em H1 e primeiro parágrafo?
☐ 2–4 FAQs presentes com respostas diretas?
```

### 4. Validação de Tom (1 min)

```
☐ Tom é analítico ou meramente descritivo?
☐ Afirmações têm dados para suportar?
☐ CTA final oferece valor concreto?
☐ Sem clichés de abertura ("Num mundo cada vez mais...")?
```

### 5. Quality Score (automático)

```
Esperado: ≥ 9.5 (publicação automática)
Aceitável: 8.5–9.4 (revisar antes publicar)
Rejeitar: < 8.5 (re-gerar)
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para detalhes, consulte:

| Documento | Tem... | Ir Para |
|-----------|--------|---------|
| **MOTOR_EDITORIAL_V1.0.md** | Especificação completa, padrões, prompt master | Redatores & Prompt Engineers |
| **MOTOR_EDITORIAL_INTEGRACAO_N8N.md** | Integração n8n, Edge Function, validações | Engenheiros & DevOps |
| **CHECKLIST_VALIDACAO_EDITORIAL.md** | Checklist 2 min + campo-a-campo | Revisores & Operadores |

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Problema: Quality score < 9.5

**Solução:**
1. Verificar se faltam dados/fontes → Adicionar 1 por secção
2. Verificar meta description → Exactamente 145–155 chars
3. Verificar FAQs → Criar 2 FAQs críticas
4. Verificar secção Portugal → Expandir com 3 cenários
5. Re-executar workflow

### Problema: Links internos quebrados

**Solução:**
1. Verificar se URL existe no portal
2. Verificar slug (sem acentos, minúsculas)
3. Re-gerar com URLs corretas

### Problema: Imagem de capa não gerada

**Solução:**
1. Verificar se `cover_image.prompt` está preenchido
2. Verificar se API de imagem (Stable Diffusion/Midjourney) está ativa
3. Reenviar manualmente ou usar imagem por defeito

### Problema: Artigo não aparece no portal

**Solução:**
1. Verificar se slug é único (não duplicado)
2. Verificar se categoria existe (tecn|mundo|saude|musica|desporto|audio)
3. Verificar se status no Supabase é "published"
4. Aguardar 30 segundos (cache)

---

## 📊 EXEMPLOS DE ARTIGOS

### Exemplo 1: Artigo Padrão (Tecnologia)
- **Título:** "IA Generativa: 5 Impactos Concretos para Empresas Portuguesas em 2025"
- **Lead:** 45 palavras
- **Secções:** 6 H2 + Portugal + Previsão
- **Palavras:** 1620
- **Quality Score:** 9.7 ✅

### Exemplo 2: Notícia Breaking (Mundo)
- **Título:** "Banco Central Europeu Reduz Taxas de Juro — O Que Muda para Poupanças Portuguesas"
- **Lead:** 35 palavras
- **Secções:** 4 H2 + Portugal
- **Palavras:** 820
- **Quality Score:** 9.2 ⚠️ (revisar, depois publicar)

### Exemplo 3: Guia Prático (Saúde)
- **Título:** "Sono e Saúde Mental: 7 Estratégias Cientificamente Comprovadas"
- **Lead:** 50 palavras
- **Secções:** 8 H2 + FAQs + Portugal
- **Palavras:** 2100
- **Quality Score:** 9.8 ✅

---

## 🎓 PRÓXIMOS PASSOS

1. **Ler MOTOR_EDITORIAL_V1.0.md** (30 min) — entender padrões detalhados
2. **Executar WF-02 com briefing teste** (5 min) — experiência prática
3. **Validar 3 artigos** (15 min) — aprender QA
4. **Gerar 1 artigo próprio** (20 min) — dominar o fluxo

---

## 📞 SUPORTE

| Dúvida | Contacto |
|--------|----------|
| Como escrever melhor? | Ver MOTOR_EDITORIAL_V1.0.md § 2–5 |
| Como integrar n8n? | Ver MOTOR_EDITORIAL_INTEGRACAO_N8N.md |
| Erro no Edge Function? | Ver CHECKLIST_VALIDACAO_EDITORIAL.md § Troubleshooting |
| Suporte técnico? | Contactar equipa de DevOps |

---

**Tempo estimado para dominar:** 1–2 horas  
**Tempo para gerar 1 artigo:** 5–10 minutos (automatizado)  
**Tempo para revisar 1 artigo:** 5–10 minutos (humano)

🚀 **Bom começo!**

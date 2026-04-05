# Arquitetura do Projeto Vision

Esta pasta contém a arquitetura de agentes IA e skills especializadas para o desenvolvimento e manutenção do Vision, um portal digital focado em tecnologias web, automação e informações relevantes.

## Estrutura

### Agentes IA
- `agente-seguranca.agent.md` - Agente especializado em segurança da infraestrutura
- `agente-ux-ui.agent.md` - Agente especializado em design e experiência do usuário
- `assistente-portal.agent.md` - Agente dedicado ao botão Vision7 AI e à navegação contextual do portal

### Skills
- `seguranca-portal.skill.md` - Skill para implementação de segurança
- `ux-ui-portal.skill.md` - Skill para design system e UX/UI
- `gestao-conteudo.skill.md` - Skill para gerenciamento editorial
- `otimizacao-performance.skill.md` - Skill para otimização de performance
- `assistente-portal.skill.md` - Skill fechada para busca de notícias, ferramentas e apoio contextual no Vision7
- `curadoria-inteligente.skill.md` - Skill para curadoria contextual, jornadas editoriais e descoberta guiada no portal

## Como Usar

### Ativando Agentes
Para usar um agente específico no GitHub Copilot:

1. Mencione o agente no contexto da conversa
2. Use os comandos específicos documentados em cada arquivo
3. O agente pesquisará fontes confiáveis e aplicará melhores práticas

### Ativando Skills
Skills são especializações que podem ser ativadas para tarefas específicas:

1. Leia o SKILL.md relevante antes de começar
2. Aplique as melhores práticas documentadas
3. Use os exemplos de uso como referência

## Integração com MCP
Estes agentes e skills são projetados para funcionar com o Model Context Protocol (MCP) do GitHub Copilot, permitindo:

- Pesquisa automatizada em documentações oficiais
- Implementação guiada de melhores práticas
- Validação de segurança e performance
- Sugestões contextuais baseadas no projeto

## Conexão com Banco de Dados
O projeto está conectado ao Supabase com as seguintes configurações:

- **Project ID**: oepqqpnqsweabmnwjvve
- **URL**: https://oepqqpnqsweabmnwjvve.supabase.co
- **Chaves configuradas** no arquivo `.env`

## Áreas de Foco

### Segurança
- Infraestrutura de segurança web
- Proteção contra spam, bots e ataques
- Prevenção de vulnerabilidades SQL e front-end

### UX/UI
- Design system consistente com shadcn/ui
- Responsividade mobile-first
- Acessibilidade e performance

### Gerenciamento de Conteúdo
- Sistema editorial completo
- Gestão de mídia otimizada
- SEO e analytics

### Performance
- Otimização de carregamento
- Estratégias de caching
- Monitoramento contínuo

## Módulo de Portal AI
O front-end do botão Vision7 AI está preparado em `src/modules/portal-ai/` com configuração, guardrails, service local e ponto de expansão para futura API externa.

## Desenvolvimento
Para contribuir com novos agentes ou skills:

1. Siga o formato dos arquivos existentes
2. Documente capacidades e exemplos de uso
3. Teste a integração com o projeto
4. Atualize este README
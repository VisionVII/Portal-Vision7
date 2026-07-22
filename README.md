# Vision7

## Project info

Este repositório contém o **Vision7**, portal editorial full-stack em português brasileiro (PT-BR),
com foco em Tecnologia, Mundo, Saúde, Música e Desporto — dashboard admin completo, automações n8n,
motor IA (Claude) e monetização integrada.

**Marca atual**: Vision7

Ver [CLAUDE.md](CLAUDE.md) para stack técnica completa e regras do motor IA, e [sdd/README.md](sdd/README.md)
para o estado actual de cada módulo do projecto.

## Estrutura do repositório

- `src/` — aplicação React/Vite organizada por domínio:
  - `components/layout/` — cabeçalho, rodapé e estrutura visual
  - `components/content/` — cards, paginação, newsletter e blocos editoriais
  - `components/media/` — componentes de mídia
  - `components/system/` — favicon, erros e preferências globais
  - `pages/site/` e `pages/admin/` — rotas públicas e administrativas
- `public/` — assets públicos e arquivos estáticos.
- `supabase/` — configuração, migrations e integrações de banco.
  - `supabase/bootstrap_new_project.sql` — script idempotente para inicializar um projeto Supabase novo com schema e dados base.
- `docs/visao-geral/` — índices, resumos e guias de navegação.
- `docs/planejamento/` — roadmap, estrutura e execução.
- `docs/seguranca/` — análises arquiteturais e plano de remediação.
- `docs/referencia/` — referências técnicas e documentação de roles.
- `docs/ai/` — agentes e skills do projeto.
- `scripts/` — scripts utilitários do repositório.
- `examples/` — exemplos isolados para consulta.

Ponto de entrada recomendado para leitura: `docs/visao-geral/INDICE_DOCUMENTACAO.md`.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

O deploy de produção é feito via Vercel.

## Posso conectar um domínio personalizado ao portal Vision7?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Consulte a documentação do seu provedor de hospedagem para configurar o domínio personalizado.

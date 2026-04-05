# Project Guidelines

## Code Style
- Use TypeScript and React function components following existing patterns in [src/App.tsx](src/App.tsx).
- Prefer path alias imports with `@/` (configured in [vite.config.ts](vite.config.ts)).
- Reuse existing UI primitives in [src/components/ui](src/components/ui) and admin components in [src/components/admin](src/components/admin).
- Follow existing ESLint rules in [eslint.config.js](eslint.config.js); run lint before concluding tasks.

## Architecture
- Frontend app: React 18 + Vite + React Router + TanStack Query.
- Routing is centralized in [src/App.tsx](src/App.tsx) with public pages, content routes, and admin routes.
- Data/auth integration is via Supabase under [src/integrations/supabase](src/integrations/supabase) and [supabase](supabase).
- Cross-cutting state lives in contexts/hooks:
  - Auth context in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
  - Domain hooks in [src/hooks](src/hooks)

## Build and Test
- Install dependencies: `npm install`
- Start dev server (port 8080): `npm run dev`
- Production build: `npm run build`
- Development build: `npm run build:dev`
- Lint: `npm run lint`
- Preview production build: `npm run preview`

## Conventions
- Keep route/page composition in [src/pages](src/pages) and shared components in [src/components](src/components).
- Prefer custom hooks for data/access logic instead of placing data logic directly inside page components.
- Do not duplicate large guidance in prompts or instructions; link to existing docs.

## Docs to Read First
- Onboarding and stack overview: [README.md](README.md)
- Documentation index and reading order: [docs/visao-geral/INDICE_DOCUMENTACAO.md](docs/visao-geral/INDICE_DOCUMENTACAO.md)
- Execution roadmap and architecture decisions: [docs/planejamento/PLANO_EXECUCAO_DASHBOARD.md](docs/planejamento/PLANO_EXECUCAO_DASHBOARD.md)
- Detailed architecture and findings: [docs/seguranca/ANALISE_ARQUITETURA_COMPLETA.md](docs/seguranca/ANALISE_ARQUITETURA_COMPLETA.md)
- Security and remediation planning: [docs/seguranca/PLANO_ACAO_VULNERABILIDADES.md](docs/seguranca/PLANO_ACAO_VULNERABILIDADES.md)
- Week 1 implementation plan: [docs/planejamento/SEMANA1_IMPLEMENTACAO.md](docs/planejamento/SEMANA1_IMPLEMENTACAO.md)
- Roles and permissions reference: [docs/referencia/DOCUMENTACAO_ROLES_PERMISSIONS.md](docs/referencia/DOCUMENTACAO_ROLES_PERMISSIONS.md)

## Known Pitfalls
- Admin/auth and role behaviors are sensitive; validate impact of any change touching [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) and related Supabase migrations in [supabase/migrations](supabase/migrations).
- Content rendering paths must preserve sanitization and safe HTML handling patterns when editing post-related pages/components.
- Keep migrations additive and review RLS/policies whenever schema changes are introduced.

## Specialized Agents and Skills
- Existing domain agents and skills are documented in [docs/ai/README.md](docs/ai/README.md).
- Prefer using those assets for deep security, UX/UI, content, and performance tasks instead of adding duplicate global guidance.
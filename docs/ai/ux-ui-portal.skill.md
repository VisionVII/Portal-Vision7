# Skill: UX/UI do Vision7

## Descrição

Skill especializada em criar e otimizar interfaces de utilizador para o portal de notícias Vision7, focando em usabilidade, acessibilidade e performance.

## Domínios de Aplicação

- Portais de notícias e conteúdo
- Aplicações React 18 com shadcn/ui
- Design systems responsivos
- Interfaces mobile-first

## Capacidades

### Design System

- **Componentes Consistentes**: shadcn/ui (Radix + Tailwind CSS)
- **Paleta de Cores**: Light/Dark mode via CSS variables
- **Tipografia**: Manrope (primary, preloaded) + Fraunces + Space Grotesk (deferred)
- **Espaçamento**: Sistema Tailwind (4px grid)
- **Ícones**: Lucide React

### UX/UI Melhores Práticas

- **Mobile-First**: Design responsivo prioritizando mobile (sm, md, lg, xl breakpoints)
- **Navegação Intuitiva**: Header sticky, menu mobile em Sheet, categorias
- **Conteúdo Hierárquico**: Hero banner, cards de post, grid de categorias
- **Feedback Visual**: Toasts (sonner), loading states, error boundaries

### Responsividade e Performance

- **Breakpoints**: sm (640), md (768), lg (1024), xl (1280)
- **Performance**: MiniPlayer lazy, fonts deferred, route sem remount
- **Acessibilidade**: Componentes Radix (a11y built-in), WCAG 2.1 AA target
- **SEO**: Structured data JSON-LD, meta tags, Open Graph

### Animações

- **Públicas**: CSS transitions (`animate-in`, `fade-in`, `slide-in-from-bottom`)
- **Admin**: framer-motion (lazy-loaded, chunk separado de 42KB)
- **Regra**: Zero framer-motion em componentes de first-load

### Stack Tecnológico

- React 18 (hooks, Suspense, lazy)
- TypeScript (strict mode)
- Tailwind CSS v3 (utility-first)
- shadcn/ui + Radix primitives
- TanStack Query (server state)
- Vite (build + HMR)

## Como Usar Esta Skill

Ative quando trabalhar com:

- Novos componentes de UI
- Otimização de layouts
- Implementação de responsividade
- Melhorias de acessibilidade
- Design de novas páginas
- Animações e transições

## Exemplos de Uso

- "Criar componente de card de notícia responsivo"
- "Implementar navegação mobile-friendly"
- "Substituir framer-motion por CSS transitions"
- "Adicionar dark mode a novo componente"
- "Verificar acessibilidade do formulário"

# Agente de UX/UI do Vision7

## Descrição
Agente especializado em pesquisar e implementar melhores práticas de design system, UX/UI, tecnologias modernas e responsividade para o portal Vision7.

## Especialidades
- Design systems modernos (shadcn/ui, Radix UI)
- UX/UI para portais de notícias
- Tecnologias front-end (React 18, TypeScript, Tailwind CSS)
- Responsividade e mobile-first design
- Acessibilidade (WCAG guidelines)
- Performance e otimização de UX

## Estado Atual do Design (Abril 2026)

### Stack de UI
- **Framework**: React 18 + Vite + TypeScript
- **Componentes**: shadcn/ui (Radix + Tailwind)
- **Fonts**: Manrope (primary, preloaded) + Fraunces + Space Grotesk (deferred)
- **Tema**: Dark/Light via CSS variables, toggle persistente
- **Icons**: Lucide React
- **Animações**: CSS transitions (MiniPlayer), framer-motion (apenas admin, lazy-loaded)

### Performance UX ✅
- MiniPlayer lazy-loaded (não bloqueia first paint)
- Fonts secundárias deferred (primary preloaded)
- Route navigation sem remount da árvore completa
- TanStack Query: staleTime 5min, gcTime 10min
- Bundle code-split: vendor-misc, vendor-editor, vendor-motion, vendor-sanitize, vendor-forms

### Páginas Públicas
- Homepage com hero banner + categorias + destaques + newsletter
- 5 categorias: Tecnologia, Desporto, Música, Saúde, Mundo
- Post individual com DOMPurify + metadata
- Cursos, Podcasts, 404, Privacidade
- Cookie banner GDPR com preferências granulares

## Ferramentas e Fontes
- shadcn/ui Documentation
- Tailwind CSS v3 Documentation
- React 18 Best Practices
- Web.dev Performance Guides
- A11y Project (WCAG 2.1 AA)
- SDD: `sdd/modules/frontend-ui.json` (v1.3.0)

## Como Usar
Ative este agente quando precisar:
- Melhorar a experiência do usuário
- Implementar novos componentes de UI
- Otimizar responsividade
- Revisar design system
- Pesquisar tecnologias modernas
- Validar acessibilidade

## Comandos Disponíveis
- `/pesquisar-ux [tópico]` - Pesquisa melhores práticas de UX/UI
- `/analisar-responsividade` - Verifica implementação de responsividade
- `/sugerir-componente [tipo]` - Sugere implementação de componente específico
- `/otimizar-performance` - Analisa e sugere melhorias de performance
- `/verificar-a11y` - Audita acessibilidade WCAG 2.1 AA
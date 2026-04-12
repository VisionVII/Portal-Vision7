# Skill: Otimização de Performance do Vision7

## Descrição
Skill especializada em otimizar performance do portal, garantindo carregamento rápido, responsividade e experiência fluida para utilizadores.

## Domínios de Aplicação
- Aplicações React 18/Vite
- Portais de conteúdo pesados
- Aplicações web públicas (Vercel)
- Mobile web performance

## Otimizações Aplicadas (Abril 2026)

### Bundle Splitting (Vite)
- `vendor-misc`: react, react-dom, react-router, TanStack Query (~57KB gzip)
- `vendor-editor`: tiptap + prosemirror (~105KB gzip, lazy admin)
- `vendor-motion`: framer-motion (~42KB gzip, lazy admin)
- `vendor-sanitize`: dompurify (~9KB gzip, lazy por post)
- `vendor-forms`: react-hook-form + zod (~14KB gzip, lazy admin)
- Chunks por página/componente: MiniPlayerV2 (3KB), pages individuais

### Lazy Loading
- MiniPlayer: `React.lazy()` com `<Suspense fallback={null}>`
- Todas as rotas admin: lazy-loaded via React.lazy
- Email templates: `await import()` dinâmico em useNewsletter
- DOMPurify: chunk separado, carrega apenas em páginas de post

### Font Strategy
- Manrope (primary): `<link rel="preload">` no `<head>`
- Fraunces + Space Grotesk (secondary): `media="print" onload="this.media='all'"`
- Resultado: zero render-blocking fonts

### Cache & Network
- TanStack Query: staleTime 5min, gcTime 10min, refetchOnReconnect: false
- DNS prefetch: `<link rel="dns-prefetch" href="//xhpfxvoonpclonjyfimt.supabase.co">`
- Supabase preconnect no HEAD

### Re-render Prevention
- AuthContext.value memoizado com `useMemo`
- Idle timer throttled: 10s mínimo entre resets, 4 eventos (sem mousemove/scroll)
- Route `key={pathname}` removido (evita remount completo)
- MiniPlayerV2: CSS transitions em vez de framer-motion

### Dead Code Removido
- PageTransition.tsx (framer-motion)
- MiniPlayerExpanded.tsx (framer-motion)
- App.css (boilerplate Vite)
- 4 PNGs pesados (~9.5MB total)

## Capacidades

### Frontend Performance
- **Bundle Optimization**: Code splitting manual no vite.config.ts
- **Asset Optimization**: WebP para logo (12KB), favicons dedicados
- **Caching Strategies**: TanStack Query com staleTime agressivo
- **Lazy Loading**: Components, routes e imports dinâmicos

### Database Performance
- **Query Optimization**: Efficient Supabase queries com filtros server-side
- **Pagination**: usePosts com limit/offset
- **Data Fetching**: React Query com staleTime por tipo de recurso

### Network Optimization
- **CDN**: Vercel Edge Network para assets estáticos
- **Compression**: Gzip automático via Vercel
- **Preloading**: Fonte primária preloaded, DNS prefetch
- **Resource Hints**: dns-prefetch para Supabase

### Monitoring
- **Performance Metrics**: Core Web Vitals (Vercel Analytics)
- **Bundle Analysis**: `npx vite-bundle-visualizer` para verificação

## Métricas de Referência
- Build time: ~10.6s
- First-load bundle: ~140KB gzip (index + vendor-misc)
- Admin routes: carrega vendor-editor + vendor-motion + vendor-forms on-demand
- Zero lint errors, zero TypeScript errors

## Como Usar Esta Skill
Ative quando trabalhar com:
- Otimização de carregamento inicial
- Melhorias de performance percebida
- Code splitting adicional
- Implementação de caching
- Análise de bottlenhecks
- Lighthouse audits

## Exemplos de Uso
- "Otimizar o bundle do portal para mobile"
- "Lazy-load um componente pesado"
- "Configurar code splitting para novo módulo"
- "Melhorar Core Web Vitals scores"
- "Análise de re-renders desnecessários"
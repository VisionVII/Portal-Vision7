# Design System — Vision7

> Versão 1.0 — Abril 2026  
> Aplica-se ao dashboard interno, portal público e componentes partilhados.

---

## 1. Filosofia

O sistema de design do Vision7 assenta em três pilares:

1. **Token-first** — toda a cor, raio e espaçamento vem de variáveis CSS (`--var`) mapeadas no Tailwind config, nunca hardcoded.
2. **Dark-mode nativo** — cada token tem variante `.dark`. Nenhum componente precisa de lógica condicional para alternar tema.
3. **Escalável** — novos componentes devem usar tokens existentes; não adicionar novas paletas sem aprovação.

---

## 2. Tokens de Cor

Definidos em `src/index.css` na camada `@layer base`.

### Paleta primária (Deep Ocean Blue)

| Token Tailwind | CSS Var | Hex aprox. |
|---|---|---|
| `primary` | `--primary` | #0284C7 |
| `primary-50` → `primary-900` | `--primary-50` … `--primary-900` | Escala completa |

### Paleta secundária (Vision Blue)

| Token Tailwind | CSS Var | Hex aprox. |
|---|---|---|
| `secondary` | `--secondary` | #0A64C0 |
| `secondary-50` → `secondary-900` | Escala completa | — |

### Escala Neutra

| Token Tailwind | CSS Var | Uso |
|---|---|---|
| `neutral-50` … `neutral-950` | `--neutral-50` … `--neutral-950` | Backgrounds, bordas, texto secundário |

### Tokens semânticos

| Token | Uso |
|---|---|
| `primary` / `primary-foreground` | Ações principais |
| `secondary` / `secondary-foreground` | Ações secundárias |
| `muted` / `muted-foreground` | Texto desabilitado, labels |
| `background` / `foreground` | Página base |
| `card` / `card-foreground` | Superfícies elevadas |
| `border` | Todas as bordas |
| `input` | Background de inputs |
| `ring` | Focus rings |
| `destructive` | Erros, deleção |
| `success` | Confirmações, estado ativo |
| `warning` | Avisos, atenção |
| `info` | Informações neutras |
| `sidebar` | Sidebar do dashboard |

---

## 3. Tipografia

Fontes carregadas em `index.html` com preload para a primária.

| Role | Fonte | Classe Tailwind |
|---|---|---|
| Headlines (H1–H6) | Fraunces / Space Grotesk | `font-headline font-bold` |
| Body | Manrope | `font-body` |

### Hierarquia de headings

| Elemento | Uso semântico |
|---|---|
| `<h1>` | Título da página (único por view) |
| `<h2>` | Secções principais |
| `<h3>` | Subsecções |
| `<h4>` | Grupos dentro de subsecções |

Letter-spacing: `−0.03em` em headings, `−0.01em` no body.

---

## 4. Espaçamento

Escala baseada em 4px. Classes Tailwind usadas:

| Escala | px | Tailwind |
|---|---|---|
| 1 | 4px | `p-1`, `gap-1` |
| 2 | 8px | `p-2`, `gap-2` |
| 3 | 12px | `p-3`, `gap-3` |
| 4 | 16px | `p-4`, `gap-4` |
| 6 | 24px | `p-6`, `gap-6` |
| 8 | 32px | `p-8`, `gap-8` |

Padding de página: `px-3 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8`

---

## 5. Border Radius

| Token | CSS Var | Valor |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` | ~8px |
| `rounded-md` | `calc(var(--radius) - 2px)` | ~10px |
| `rounded-lg` | `var(--radius)` | 12px |
| `rounded-xl` | — | 16px |
| `rounded-2xl` | — | 24px (cards grandes, CTAs hero) |

---

## 6. Componentes

### 6.1 Button

Ficheiro: `src/components/ui/button.tsx` + `button-variants.ts`

| Variante | Uso |
|---|---|
| `default` | Ação primária |
| `secondary` | Ação secundária |
| `outline` | Ação alternativa com borda |
| `ghost` | Ação discreta (ícones, nav) |
| `destructive` | Deleção, cancelamento crítico |
| `link` | Navegação inline |

Tamanhos: `sm` (h-9), `default` (h-10), `lg` (h-11), `icon` (h-10 w-10)

**Regra:** nunca usar classes de cor diretamente em `<Button>`. Usar sempre `variant=`.

### 6.2 Card

Ficheiro: `src/components/ui/card.tsx`

Base: `rounded-lg border bg-card text-card-foreground shadow-sm`

Para gradiente sutil em card hero: adicionar classe `.gradient-card-hero` (definida em `index.css`).

### 6.3 Input / Textarea / Select

Base: `h-10 rounded-md border border-input bg-background` + focus ring automático.

**Regra:** nunca sobrepor `bg-` ou `border-` em inputs — isso quebra o tema.

---

## 7. Utility Classes de Status

Definidas em `src/index.css` na camada `@layer components`. Suportam dark-mode nativamente.

| Classe | Uso |
|---|---|
| `.badge-status-neutral` | Lead, inativo, estado padrão |
| `.badge-status-info` | Qualificado, informação |
| `.badge-status-warning` | Proposta, atenção |
| `.badge-status-purple` | Negociação, especial |
| `.badge-status-success` | Ganho, ativo, confirmado |
| `.badge-status-destructive` | Perdido, erro, cancelado |

Exemplo de uso:
```tsx
<Badge variant="outline" className="badge-status-success">Ativo</Badge>
```

---

## 8. Layout

### Dashboard

- Sidebar: largura `w-60 xl:w-72` (expandida) / `w-16` (colapsada)
- Background sidebar: `bg-sidebar/80 backdrop-blur-sm`
- Conteúdo principal: `min-w-0 flex-1 overflow-x-hidden`

### Portal público

- Container: `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8`
- Grid de artigos: 1 col mobile → 2 col tablet → 3 col desktop

---

## 9. Animações e Transições

- Duração padrão: `duration-200` (hover) / `duration-300` (page transitions)
- Easing: `ease-out` para entradas, `ease-in-out` para toggles
- **Regra:** não usar `framer-motion` em componentes do first-load público — apenas em chunks lazy do admin.

Keyframes registados no Tailwind config:
- `animate-shimmer` — efeito shimmer em skeletons
- `animate-fade-in` — entrada suave
- `accordion-down` / `accordion-up` — Radix accordion

---

## 10. Regras de Ouro

1. ✅ Usar tokens (`bg-card`, `text-foreground`, `border-border`) — nunca `bg-slate-900`, `text-gray-400`
2. ✅ Usar `.badge-status-*` para todos os estados de badge/chip
3. ✅ Usar `bg-muted animate-pulse` para skeletons
4. ✅ Usar `bg-sidebar/80` para painéis de sidebar
5. ❌ Nunca `bg-slate-*`, `bg-gray-*`, `bg-zinc-*` diretamente em componentes
6. ❌ Nunca `text-gray-400` — usar `text-muted-foreground`
7. ❌ Nunca `border-slate-600` em inputs — usar o padrão do componente `<Input>`
8. ❌ Nunca `framer-motion` em componentes públicos first-load

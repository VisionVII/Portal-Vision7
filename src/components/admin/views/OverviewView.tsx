import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bot,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
import type { AdminView } from '@/components/admin/dashboard-types';

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff}d atrás`;
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

const STATUS: Record<string, { bar: string; dot: string; text: string }> = {
  published: { bar: 'bg-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  draft:     { bar: 'bg-amber-400',   dot: 'bg-amber-400',   text: 'text-amber-400'  },
  scheduled: { bar: 'bg-blue-400',    dot: 'bg-blue-400',    text: 'text-blue-400'   },
};

// Section header with left accent bar
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3.5 w-[3px] rounded-full bg-primary" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">
        {children}
      </span>
    </div>
  );
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: stats, isLoading: statsLoading } = usePostStats();

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);

  const recentPosts = useMemo(
    () => [...(posts ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [posts],
  );

  const weeklyPosts = useMemo(() => {
    const weeks = [0, 0, 0, 0];
    const now = Date.now();
    publishedPosts.forEach((p) => {
      const idx = Math.floor((now - new Date(p.created_at).getTime()) / (7 * 86_400_000));
      if (idx >= 0 && idx < 4) weeks[3 - idx]++;
    });
    return weeks;
  }, [publishedPosts]);

  const maxWeekly = Math.max(...weeklyPosts, 1);
  const weeklyChange = weeklyPosts[3] - weeklyPosts[2];

  const postsByCategory = useMemo(
    () =>
      Object.entries(
        publishedPosts.reduce<Record<string, number>>((acc, p) => {
          const name = p.categories?.name ?? 'Sem categoria';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [publishedPosts],
  );

  const thisMonth   = stats?.thisMonth ?? 0;
  const total       = stats?.total ?? 0;
  const totalViews  = stats?.totalViews ?? 0;
  const drafts      = stats?.drafts ?? 0;
  const monthlyTarget  = Math.max(Math.ceil(total / 30), 1);
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);
  const onTarget    = thisMonth >= monthlyTarget;

  const todayLabel = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative space-y-8">

      {/* ── Ambient glow (Vision7 blue) ─────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-[#027ae3] opacity-[0.06] blur-3xl dark:opacity-[0.08]"
      />

      {/* ── Page header ──────────────────────────────────── */}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60">
            Vision7 · Painel
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Visão Geral
          </h1>
          <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {allowedViews.includes('content') && (
            <Button size="sm" onClick={onNewPost} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Novo post</span>
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('automations')}
              className="gap-1.5 text-muted-foreground"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Automações</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div data-tour="overview-stats" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border/20 bg-card/50 shadow-sm dark:bg-card/30 sm:grid-cols-4 [&>*:not(:last-child)]:border-r-0 sm:[&>*:not(:last-child)]:border-r sm:[&>*]:border-r-0">
          {/* — Este mês — */}
          <div className="relative overflow-hidden px-4 py-4 sm:border-r sm:border-border/20">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Este mês</p>
            <p className="mt-2 text-3xl font-black tabular-nums leading-none tracking-tight text-foreground">
              {thisMonth}
            </p>
            <p className={`mt-1.5 text-[10px] font-semibold ${onTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
              {onTarget ? '✓ Meta atingida' : `−${monthlyTarget - thisMonth} em falta`}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border/10">
              <div
                className={`h-full transition-all duration-700 ease-out ${onTarget ? 'bg-emerald-400' : 'bg-primary'}`}
                style={{ width: `${Math.max(targetProgress, thisMonth > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>

          {/* — Total — */}
          <div className="border-l border-border/20 px-4 py-4 sm:border-l-0 sm:border-r sm:border-border/20">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Publicados</p>
            <p className="mt-2 text-3xl font-black tabular-nums leading-none tracking-tight text-foreground">
              {total}
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/40">total acumulado</p>
          </div>

          {/* — Views — */}
          <div className="border-t border-border/20 px-4 py-4 sm:border-t-0 sm:border-r sm:border-border/20">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Visualizações</p>
            <p className="mt-2 text-3xl font-black tabular-nums leading-none tracking-tight text-foreground">
              {totalViews.toLocaleString('pt-PT')}
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/40">total histórico</p>
          </div>

          {/* — Rascunhos — */}
          <div className="border-l border-t border-border/20 px-4 py-4 sm:border-l-0 sm:border-t-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">Rascunhos</p>
            <p className={`mt-2 text-3xl font-black tabular-nums leading-none tracking-tight ${
              drafts > 0 ? 'text-amber-400' : 'text-foreground'
            }`}>
              {drafts}
            </p>
            <p className="mt-1.5 text-[10px] text-muted-foreground/40">por publicar</p>
          </div>
        </div>
      )}

      {/* ── Content grid: articles + charts ──────────────── */}
      <div className="grid gap-8 xl:grid-cols-5">

        {/* ── Article stream (3/5) ──────────────────────── */}
        <div data-tour="overview-articles" className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Últimos artigos</SectionLabel>
            {allowedViews.includes('content') && (
              <button
                type="button"
                onClick={() => onNavigate('content')}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {postsLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-[52px] rounded-xl" />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Sem artigos ainda.</p>
              {allowedViews.includes('content') && (
                <Button size="sm" variant="ghost" onClick={onNewPost} className="mt-2 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Criar primeiro artigo
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentPosts.map((post) => {
                const s = STATUS[post.status] ?? STATUS.draft;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onEdit(post)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/25 active:bg-muted/40"
                  >
                    {/* Status left bar */}
                    <div className={`h-9 w-[3px] shrink-0 rounded-full ${s.bar} opacity-70 transition-opacity group-hover:opacity-100`} />
                    {/* Text */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {post.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50">
                        {post.categories?.name ?? 'Sem categoria'} · {formatRelative(post.created_at)}
                      </p>
                    </div>
                    {/* Status dot */}
                    <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right column: chart + categories (2/5) ───── */}
        <div data-tour="overview-sidebar" className="space-y-8 xl:col-span-2">

          {/* Weekly chart */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>Semanas</SectionLabel>
              {weeklyChange !== 0 && (
                <span className={`flex items-center gap-1 text-[11px] font-bold ${weeklyChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {weeklyChange > 0
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />}
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                </span>
              )}
            </div>

            {weeklyPosts.every((v) => v === 0) ? (
              <p className="py-6 text-center text-[12px] text-muted-foreground/40">
                Sem publicações nas últimas 4 semanas
              </p>
            ) : (
              <div className="flex h-[88px] items-end gap-2">
                {weeklyPosts.map((count, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={`text-[11px] font-bold tabular-nums leading-none ${
                      idx === 3 ? 'text-primary' : 'text-muted-foreground/40'
                    }`}>
                      {count || ''}
                    </span>
                    <div className="flex w-full flex-col justify-end" style={{ height: 52 }}>
                      <div
                        className={`w-full rounded-t-[3px] transition-all duration-500 ${
                          idx === 3
                            ? 'bg-primary shadow-[0_0_8px_rgba(2,122,227,0.4)]'
                            : 'bg-muted/50'
                        }`}
                        style={{ height: `${Math.max((count / maxWeekly) * 100, count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest leading-none ${
                      idx === 3 ? 'text-primary/60' : 'text-muted-foreground/30'
                    }`}>
                      S{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top categories */}
          <div>
            <div className="mb-4">
              <SectionLabel>Top categorias</SectionLabel>
            </div>

            {postsByCategory.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground/40">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {postsByCategory.map(([cat, count], idx) => {
                  const pct = Math.round((count / Math.max(publishedPosts.length, 1)) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-2.5">
                      <span className="w-3 shrink-0 text-[9px] font-bold tabular-nums text-muted-foreground/30">
                        {idx + 1}
                      </span>
                      <span className="w-20 min-w-0 shrink-0 truncate text-[12px] font-medium text-foreground/70">
                        {cat}
                      </span>
                      <div className="flex-1 overflow-hidden rounded-full bg-muted/30" style={{ height: 3 }}>
                        <div
                          className="h-full rounded-full bg-primary/50 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-muted-foreground/50">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;

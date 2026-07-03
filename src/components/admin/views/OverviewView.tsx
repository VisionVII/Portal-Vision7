import React, { useMemo } from 'react';
import {
  BarChart3,
  Bot,
  ExternalLink,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import { Post, usePosts } from '@/hooks/usePosts';
import type { AdminView } from '@/components/admin/dashboard-types';

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  draft:     { label: 'Rascunho',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  scheduled: { label: 'Agendado',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
};

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);

  const recentPosts = useMemo(
    () => [...(posts ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
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

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Visão geral
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allowedViews.includes('content') && (
            <Button size="sm" onClick={onNewPost} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Novo post
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button size="sm" variant="outline" onClick={() => onNavigate('automations')} className="gap-1.5 text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              Automações
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI stats ─────────────────────────────────────────────── */}
      <AdminStatsCards />

      {/* ── Recent posts + Charts ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent posts — wider column */}
        <Card className="border-border/40 shadow-sm lg:col-span-3">
          <CardHeader className="px-3 pb-3 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Artigos recentes</CardTitle>
              {allowedViews.includes('content') && (
                <button
                  type="button"
                  onClick={() => onNavigate('content')}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 pt-0 sm:px-6">
            {postsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Sem artigos ainda.</p>
                {allowedViews.includes('content') && (
                  <Button size="sm" variant="ghost" onClick={onNewPost} className="mt-2 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Criar primeiro artigo
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40 overflow-hidden">
                {recentPosts.map((post) => {
                  const statusInfo = STATUS_LABEL[post.status] ?? { label: post.status, cls: 'bg-muted text-muted-foreground' };
                  return (
                    <div key={post.id} className="flex min-w-0 items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onEdit(post)}
                          className="w-full truncate text-left text-sm font-medium text-foreground hover:text-primary"
                        >
                          {post.title}
                        </button>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {post.categories?.name ?? 'Sem categoria'} · {formatDate(post.created_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts — narrower column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Weekly chart */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Publicações semanais
                </CardTitle>
                {weeklyChange !== 0 && (
                  <span className={`text-xs font-bold ${weeklyChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {weeklyPosts.every((v) => v === 0) ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sem publicações nas últimas 4 semanas</p>
              ) : (
                <div className="flex items-end gap-2">
                  {weeklyPosts.map((count, idx) => (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${idx === 3 ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>
                      <div
                        className={`w-full rounded-t-sm ${idx === 3 ? 'bg-primary' : 'bg-muted'}`}
                        style={{ height: `${Math.max((count / maxWeekly) * 80, 4)}px` }}
                      />
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">S{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top categories */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Top categorias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {postsByCategory.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sem dados</p>
              ) : (
                <div className="space-y-2.5">
                  {postsByCategory.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{cat}</span>
                      <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="w-5 shrink-0 text-right text-[11px] font-bold text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;

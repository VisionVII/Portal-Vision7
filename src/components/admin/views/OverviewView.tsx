import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Clock,
  ExternalLink,
  Layers3,
  Plus,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import type { AdminView } from '@/components/admin/dashboard-types';

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

type HealthTone = 'success' | 'warning' | 'neutral';

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 60_000), 0);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function getHealthTone(value: number, threshold: number, emptyTone: HealthTone = 'neutral'): HealthTone {
  if (value <= 0) return emptyTone;
  return value >= threshold ? 'warning' : 'success';
}

function toneClasses(tone: HealthTone) {
  if (tone === 'success') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'border-border/60 bg-muted/40 text-muted-foreground';
}

const STAGE_INTERVALS: Record<string, number> = {
  Coleta: 30 * 60_000,
  Cluster: 20 * 60_000,
  'IA Reescrita': 60 * 60_000,
};

function formatCountdown(ms: number) {
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function getCountdownMs(lastIso: string | null | undefined, intervalMs: number) {
  if (!lastIso || !intervalMs) return -1;
  return new Date(lastIso).getTime() + intervalMs - Date.now();
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  draft:     { label: 'Rascunho',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  scheduled: { label: 'Agendado',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
};

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: categories = [] } = useCategories();
  const { data: diagnostics } = usePipelineDiagnostics();
  const { executions = [] } = useAutomationExecutions({ pageSize: 10 });

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);

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

  const clusterTone = getHealthTone(diagnostics?.clusters.lowConfidence ?? 0, 1, 'neutral');
  const iaTone = getHealthTone((diagnostics?.curated.ready ?? 0) + (diagnostics?.curated.draft ?? 0), 1, 'neutral');

  const pipelineStages = [
    {
      label: 'Coleta',
      count: diagnostics?.staging.total ?? 0,
      helper: `${diagnostics?.staging.unprocessed ?? 0} em fila`,
      tone: getHealthTone(diagnostics?.staging.unprocessed ?? 0, 1, 'neutral'),
      icon: Activity,
      lastTimestamp: diagnostics?.lastStagingAt,
      intervalMs: STAGE_INTERVALS['Coleta'],
    },
    {
      label: 'Cluster',
      count: diagnostics?.clusters.total ?? 0,
      helper: `${diagnostics?.clusters.highConfidence ?? 0} confiáveis`,
      tone: clusterTone,
      icon: Layers3,
      lastTimestamp: diagnostics?.lastClusterAt,
      intervalMs: STAGE_INTERVALS['Cluster'],
    },
    {
      label: 'IA Reescrita',
      count: (diagnostics?.curated.ready ?? 0) + (diagnostics?.curated.draft ?? 0),
      helper: `${diagnostics?.curated.ready ?? 0} prontos`,
      tone: iaTone,
      icon: Sparkles,
      lastTimestamp: diagnostics?.lastCuratedAt,
      intervalMs: STAGE_INTERVALS['IA Reescrita'],
    },
    {
      label: 'Publicação',
      count: diagnostics?.curated.published ?? 0,
      helper: `${publishedPosts.length} publicados`,
      tone: getHealthTone(diagnostics?.curated.published ?? 0, 1, 'neutral'),
      icon: Radio,
      lastTimestamp: null as string | null | undefined,
      intervalMs: 0,
    },
  ] as const;

  const latestExecution = executions[0] ?? null;

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

      {/* ── Pipeline ──────────────────────────────────────────────── */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Pipeline editorial
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {latestExecution && (
                <span>Última execução: {formatRelativeTime(latestExecution.startedAt)}</span>
              )}
              {allowedViews.includes('automations') && (
                <button
                  type="button"
                  onClick={() => onNavigate('automations')}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  Ver detalhes <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pipelineStages.map((stage, i) => {
              const Icon = stage.icon;
              const remaining = getCountdownMs(stage.lastTimestamp, stage.intervalMs);
              return (
                <div key={stage.label} className="relative rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <p className="text-xs font-semibold text-foreground">{stage.label}</p>
                      </div>
                      <p className="mt-1.5 text-xl font-bold text-foreground">{stage.count}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.helper}</p>
                    </div>
                    <div className={`rounded-md border p-1.5 ${toneClasses(stage.tone)}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  {stage.intervalMs > 0 && stage.lastTimestamp && (
                    <div className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {remaining > 0 ? (
                        <span className="font-mono tabular-nums">{formatCountdown(remaining)}</span>
                      ) : (
                        <span className="text-primary font-medium">iminente</span>
                      )}
                    </div>
                  )}
                  {i < pipelineStages.length - 1 && (
                    <div className="absolute right-[-0.65rem] top-1/2 z-10 hidden -translate-y-1/2 xl:block">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent posts + Charts ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent posts — wider column */}
        <Card className="border-border/40 shadow-sm lg:col-span-3">
          <CardHeader className="pb-3">
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
          <CardContent className="pt-0">
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
              <div className="divide-y divide-border/40">
                {recentPosts.map((post) => {
                  const statusInfo = STATUS_LABEL[post.status] ?? { label: post.status, cls: 'bg-muted text-muted-foreground' };
                  return (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onEdit(post)}
                          className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:text-primary"
                        >
                          {post.title}
                        </button>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {post.categories?.name ?? 'Sem categoria'} · {formatDate(post.created_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusInfo.cls}`}>
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

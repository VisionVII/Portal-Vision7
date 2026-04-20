import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Clock,
  Plus,
  Sparkles,
  TrendingUp,
  Zap,
  Shield,
  Database,
  BarChart3,
  Layers3,
  Radio,
  Clock3,
  Activity,
  PenTool,
  Eye,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
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
  if (!iso) return 'sem registo';

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(Math.floor(diffMs / 60_000), 0);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;

  const days = Math.floor(hours / 24);
  return `${days} d atrás`;
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

/* ── Countdown helpers ── */
const STAGE_INTERVALS: Record<string, number> = {
  Coleta: 30 * 60_000,
  Cluster: 20 * 60_000,
  'IA Reescrita': 60 * 60_000,
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCountdownMs(lastIso: string | null | undefined, intervalMs: number): number {
  if (!lastIso || !intervalMs) return -1;
  const nextRun = new Date(lastIso).getTime() + intervalMs;
  return nextRun - Date.now();
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: stats, isLoading: statsLoading } = usePostStats();
  const { data: categories = [] } = useCategories();
  const { data: diagnostics, isLoading: diagnosticsLoading } = usePipelineDiagnostics();
  const { executions = [], isLoading: executionsLoading } = useAutomationExecutions({ pageSize: 40 });
  const [showEcosystem, setShowEcosystem] = useState(false);

  /* ── Countdown tick (1 s) ── */
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const publishedPosts = useMemo(() => posts?.filter((post) => post.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((post) => post.status === 'draft') ?? [], [posts]);

  const weeklyPosts = useMemo(() => {
    const weeks: number[] = [0, 0, 0, 0];
    const now = Date.now();

    publishedPosts.forEach((post) => {
      const age = now - new Date(post.created_at).getTime();
      const weekIdx = Math.floor(age / (7 * 24 * 60 * 60 * 1000));
      if (weekIdx >= 0 && weekIdx < 4) weeks[3 - weekIdx] += 1;
    });

    return weeks;
  }, [publishedPosts]);

  const maxWeekly = Math.max(...weeklyPosts, 1);
  const weeklyChange = weeklyPosts[3] - weeklyPosts[2];

  const postsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    publishedPosts.forEach((post) => {
      const categoryName = post.categories?.name ?? 'Sem categoria';
      map[categoryName] = (map[categoryName] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [publishedPosts]);

  const latestExecution = executions[0] ?? null;
  const pipelineIsActive = Boolean((diagnostics?.staging.total ?? 0) > 0 || (diagnostics?.clusters.total ?? 0) > 0 || (diagnostics?.curated.total ?? 0) > 0);
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
      lastTimestamp: null,
      intervalMs: 0,
    },
  ] as const;

  const systemHealthItems = [
    {
      label: 'Pipeline',
      value: pipelineIsActive ? 'Ativo' : 'Em espera',
      tone: pipelineIsActive ? 'success' : 'neutral',
      icon: Shield,
    },
    {
      label: 'Cluster',
      value: clusterTone === 'warning' ? 'Atenção' : 'OK',
      tone: clusterTone,
      icon: Database,
    },
    {
      label: 'IA',
      value: iaTone === 'warning' ? 'Atenção' : 'OK',
      tone: iaTone,
      icon: Zap,
    },
    {
      label: 'Última execução',
      value: formatRelativeTime(latestExecution?.startedAt ?? null),
      tone: latestExecution?.status === 'error' ? 'warning' : 'neutral',
      icon: Clock3,
    },
  ] as const;

  const latestDraft = draftPosts[0];
  const handleResumeDraft = () => {
    if (latestDraft) onEdit(latestDraft);
  };

  // Stats data
  const thisMonth = stats?.thisMonth || 0;
  const total = stats?.total || 0;
  const totalViews = stats?.totalViews || 0;
  const drafts = stats?.drafts || 0;
  const monthlyTarget = Math.max(Math.ceil(total / 30), 1);
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);

  const isLoading = postsLoading || statsLoading || diagnosticsLoading || executionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-80 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Section 1: Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Visão geral
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground sm:text-base">
            Controle operacional do portal e leitura rápida de performance.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          {allowedViews.includes('content') && (
            <Button 
              size="sm" 
              onClick={onNewPost} 
              className="h-10 gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-600 px-5 font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            >
              <Plus className="h-4 w-4" />
              Novo post
            </Button>
          )}
          {allowedViews.includes('content') && latestDraft && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleResumeDraft} 
              className="h-10 gap-2 rounded-xl border-border/50 px-4 font-medium transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Rascunho
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onNavigate('automations')} 
              className="h-10 gap-2 rounded-xl border-border/50 px-4 font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
            >
              <Bot className="h-4 w-4" />
              Automações
            </Button>
          )}
        </div>
      </div>

      {/* ── Section 2: Hero KPI + 3 Secondary Cards ─────────────────────── */}
      <div className="space-y-4">
        {/* Hero Card */}
        <Card className="relative overflow-hidden rounded-2xl border-border/20 bg-gradient-to-br from-slate-50 via-white to-slate-50/80 shadow-sm dark:border-border/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Performance este mês
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                    {thisMonth}
                  </p>
                  <p className="text-base font-medium text-muted-foreground sm:text-lg">
                    {thisMonth === 1 ? 'publicação' : 'publicações'}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {thisMonth >= monthlyTarget ? (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">Meta atingida</span>
                    </div>
                  ) : thisMonth > 0 ? (
                    <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                      <Minus className="h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">+{monthlyTarget - thisMonth} para meta</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">Sem publicações</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="rounded-2xl bg-primary/10 p-4 dark:bg-primary/15">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    {Math.min(thisMonth, monthlyTarget)}/{monthlyTarget}
                  </p>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400 transition-all duration-700 ease-out dark:from-emerald-400 dark:to-emerald-500"
                style={{ width: `${Math.max(targetProgress, thisMonth > 0 ? 8 : 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Secondary KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Total de posts',
              value: total,
              icon: PenTool,
              color: 'text-primary-600 dark:text-primary-400',
              bg: 'bg-primary/10 dark:bg-primary/15',
              iconBg: 'bg-primary-50 dark:bg-primary-900/40',
            },
            {
              label: 'Visualizações',
              value: totalViews,
              icon: Eye,
              color: 'text-blue-600 dark:text-blue-400',
              bg: 'bg-blue-500/10 dark:bg-blue-500/15',
              iconBg: 'bg-blue-50 dark:bg-blue-900/40',
              format: true,
            },
            {
              label: 'Rascunhos',
              value: drafts,
              icon: Edit,
              color: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-500/10 dark:bg-amber-500/15',
              iconBg: 'bg-amber-50 dark:bg-amber-900/40',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className="group border-border/30 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-border/20"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`shrink-0 rounded-xl p-2.5 sm:rounded-2xl sm:p-3 ${card.iconBg}`}>
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">
                        {card.label}
                      </p>
                      <p className="mt-1 truncate text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
                        {card.format ? card.value.toLocaleString('pt-PT') : card.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Pipeline & Health ────────────────────────────────── */}
      <Card className="overflow-hidden rounded-2xl border-border/30 shadow-sm">
        <CardHeader className="border-b border-border/20 bg-muted/20 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              Pipeline & saúde
            </CardTitle>
            {/* Inline health indicators */}
            <div className="flex flex-wrap items-center gap-1.5">
              {systemHealthItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.label} 
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${toneClasses(item.tone)}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{item.label}:</span>
                    <span>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pipelineStages.map((stage, index) => {
              const Icon = stage.icon;
              const remaining = getCountdownMs(stage.lastTimestamp, stage.intervalMs);
              return (
                <div 
                  key={stage.label} 
                  className="relative rounded-xl border border-border/30 bg-gradient-to-br from-muted/20 to-muted/5 p-4 transition-all duration-200 hover:border-border/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {index + 1}
                        </span>
                        {stage.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {stage.count}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClasses(stage.tone)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{stage.helper}</span>
                    {stage.intervalMs > 0 && stage.lastTimestamp ? (
                      remaining > 0 ? (
                        <Badge 
                          variant="outline" 
                          className="border-blue-500/25 bg-blue-500/5 px-2 py-0.5 font-mono text-[10px] tabular-nums text-blue-600 dark:text-blue-400"
                        >
                          <Clock className="mr-1 h-2.5 w-2.5" />
                          {formatCountdown(remaining)}
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] text-primary"
                        >
                          iminente
                        </Badge>
                      )
                    ) : (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClasses(stage.tone)}`}>
                        {stage.tone === 'warning' ? 'Atenção' : stage.count > 0 ? 'OK' : '—'}
                      </span>
                    )}
                  </div>
                  {/* Arrow connector */}
                  {index < pipelineStages.length - 1 && (
                    <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 xl:block">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/30">
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Charts ───────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Posts Chart */}
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold">Publicações semanais</CardTitle>
              </div>
              {weeklyChange !== 0 && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  weeklyChange > 0 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  <BarChart3 className={`h-3 w-3 ${weeklyChange < 0 ? 'rotate-90' : ''}`} />
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-end justify-between gap-3 px-2">
              {weeklyPosts.map((count, index) => {
                const isLatest = index === 3;
                const barHeight = Math.max((count / maxWeekly) * 140, 12);
                return (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <span className={`text-sm font-bold ${isLatest ? 'text-primary' : 'text-muted-foreground'}`}>
                      {count}
                    </span>
                    <div 
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isLatest 
                          ? 'bg-gradient-to-t from-primary to-primary/80 shadow-lg shadow-primary/20' 
                          : 'bg-muted/60 dark:bg-muted/40'
                      }`} 
                      style={{ height: `${barHeight}px` }} 
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      S{index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            {weeklyPosts.every((value) => value === 0) && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Sem publicações nas últimas 4 semanas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Layers3 className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Top categorias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {postsByCategory.length > 0 ? (
              postsByCategory.map(([category, count], index) => {
                const percentage = Math.round((count / Math.max(publishedPosts.length, 1)) * 100);
                return (
                  <div 
                    key={category} 
                    className="group flex items-center gap-3 rounded-xl border border-border/20 bg-muted/10 px-4 py-3 transition-all duration-200 hover:border-border/40 hover:bg-muted/20"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {category}
                    </span>
                    <div className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted/50 sm:block">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers3 className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sem dados de categorias</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 5: Ecosystem (Collapsible) ──────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border/30 bg-card/50 shadow-sm">
        <button
          type="button"
          onClick={() => setShowEcosystem((value) => !value)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/20">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-sm font-semibold text-foreground">Ecossistema</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-xs font-semibold">
              {publishedPosts.length + draftPosts.length + categories.length} itens
            </Badge>
            <div className={`transition-transform duration-300 ${showEcosystem ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </button>
        
        {showEcosystem && (
          <div className="border-t border-border/20 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Publicados', value: publishedPosts.length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Rascunhos', value: draftPosts.length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Categorias', value: categories.length, color: 'text-foreground/70', bg: 'bg-muted/50' },
                { label: 'Processando', value: diagnostics?.staging.unprocessed ?? 0, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
                { label: 'Cluster', value: diagnostics?.clusters.total ?? 0, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'IA', value: diagnostics?.curated.ready ?? 0, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl ${item.bg} p-4 transition-transform duration-200 hover:scale-[1.02]`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className={`mt-1.5 text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewView;

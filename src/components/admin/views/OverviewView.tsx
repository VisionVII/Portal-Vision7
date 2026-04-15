import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  LayoutTemplate,
  Plus,
  Sparkles,
  TrendingUp,
  Zap,
  Shield,
  Database,
  BarChart3,
  Layers3,
  Radio,
  CheckCircle2,
  Clock3,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useToast } from '@/hooks/use-toast';
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
  Coleta: 30 * 60_000,       // WF-01 — 30 min
  Cluster: 20 * 60_000,      // WF-02 — 20 min
  'IA Reescrita': 60 * 60_000, // WF-03 — 60 min
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
  const { data: categories = [] } = useCategories();
  const { data: diagnostics, isLoading: diagnosticsLoading } = usePipelineDiagnostics();
  const { executions = [], isLoading: executionsLoading } = useAutomationExecutions({ pageSize: 40 });
  const [showEcosystem, setShowEcosystem] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Activity className="h-3.5 w-3.5" />
              Dashboard executivo
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Visão geral</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Controle operacional do portal, saúde do pipeline e leitura rápida de performance.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allowedViews.includes('content') && (
              <Button onClick={onNewPost} className="justify-start gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Novo post
              </Button>
            )}
            {allowedViews.includes('content') && latestDraft && (
              <Button variant="outline" onClick={handleResumeDraft} className="justify-start gap-2 rounded-xl">
                <Sparkles className="h-4 w-4" />
                Continuar rascunho
              </Button>
            )}
            {allowedViews.includes('automations') && (
              <Button variant="secondary" onClick={() => onNavigate('automations')} className="justify-start gap-2 rounded-xl">
                <Bot className="h-4 w-4" />
                Automações
              </Button>
            )}
            <Link to="/" target="_blank" className="sm:col-span-2 lg:col-span-1">
              <Button variant="outline" className="w-full justify-start gap-2 rounded-xl text-muted-foreground">
                <Globe className="h-4 w-4" />
                Portal
              </Button>
            </Link>
          </div>
        </div>

        <AdminStatsCards />
      </section>

      <section>
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader className="border-b border-border/30 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Saúde do sistema
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resumo curto do estado operacional do portal.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sistema operacional
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {systemHealthItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`rounded-2xl border px-3 py-3 ${toneClasses(item.tone)}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{item.label}</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-foreground">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pipelineStages.map((stage, index) => {
                const Icon = stage.icon;
                const remaining = getCountdownMs(stage.lastTimestamp, stage.intervalMs);
                return (
                  <div key={stage.label} className="relative rounded-2xl border border-border/40 bg-muted/20 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stage.count}</p>
                      </div>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClasses(stage.tone)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{stage.helper}</span>
                      {stage.intervalMs > 0 && stage.lastTimestamp ? (
                        remaining > 0 ? (
                          <Badge variant="outline" className="border-blue-500/25 text-blue-500 font-mono tabular-nums px-2 py-0.5 text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatCountdown(remaining)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-primary/25 text-primary px-2 py-0.5 text-xs">
                            iminente
                          </Badge>
                        )
                      ) : (
                        <span className={`rounded-full border px-2 py-0.5 font-medium ${toneClasses(stage.tone)}`}>
                          {stage.tone === 'warning' ? 'Atenção' : stage.count > 0 ? 'OK' : 'Aguardando'}
                        </span>
                      )}
                    </div>
                    {index < pipelineStages.length - 1 && (
                      <div className="absolute right-[-0.75rem] top-1/2 hidden -translate-y-1/2 xl:block">
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Publicações semanais</CardTitle>
              {weeklyChange !== 0 && (
                <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${weeklyChange > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                  <BarChart3 className={`h-3 w-3 ${weeklyChange < 0 ? 'rotate-90' : ''}`} />
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              {weeklyPosts.map((count, index) => {
                const isLatest = index === 3;
                return (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <span className={`text-xs font-bold ${isLatest ? 'text-primary' : 'text-muted-foreground'}`}>{count}</span>
                    <div className={`w-full rounded-t-md ${isLatest ? 'bg-primary' : 'bg-muted'}`} style={{ height: `${Math.max((count / maxWeekly) * 120, 10)}px` }} />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">S{index + 1}</span>
                  </div>
                );
              })}
            </div>
            {weeklyPosts.every((value) => value === 0) && (
              <p className="text-center text-sm text-muted-foreground">Sem publicações nas últimas 4 semanas</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top categorias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {postsByCategory.length > 0 ? (
              postsByCategory.map(([category, count]) => (
                <div key={category} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 px-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{category}</span>
                  <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-bold text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de categorias</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border/40 bg-card/80 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEcosystem((value) => !value)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Ecossistema</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{(publishedPosts.length + draftPosts.length + categories.length)} itens</span>
            {showEcosystem ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        {showEcosystem && (
          <div className="border-t border-border/30 p-5">
            <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Publicados', value: publishedPosts.length, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Rascunhos', value: draftPosts.length, color: 'text-amber-500' },
                { label: 'Categorias', value: categories.length, color: 'text-foreground/70' },
                { label: 'Processando', value: diagnostics?.staging.unprocessed ?? 0, color: 'text-sky-500' },
                { label: 'Cluster', value: diagnostics?.clusters.total ?? 0, color: 'text-primary-500' },
                { label: 'IA', value: diagnostics?.curated.ready ?? 0, color: 'text-violet-500' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {(postsLoading || diagnosticsLoading || executionsLoading) && (
        <p className="text-xs text-muted-foreground">A carregar dados do painel...</p>
      )}
    </div>
  );
};

export default OverviewView;

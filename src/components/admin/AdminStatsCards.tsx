import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CalendarDays, Loader2, TrendingUp } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { Skeleton } from '@/components/ui/skeleton';

const AdminStatsCards = () => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: executions, isLoading: executionsLoading } = useAutomationExecutions({ pageSize: 100 });
  const { data: diagnostics, isLoading: diagnosticsLoading } = usePipelineDiagnostics();

  const isLoading = postsLoading || executionsLoading || diagnosticsLoading;

  const todayPosts = useMemo(() => {
    const today = new Date();
    return (posts ?? []).filter((post) => {
      const createdAt = new Date(post.created_at);
      return createdAt.getFullYear() === today.getFullYear()
        && createdAt.getMonth() === today.getMonth()
        && createdAt.getDate() === today.getDate();
    }).length;
  }, [posts]);

  const processingCount = diagnostics?.staging.unprocessed ?? 0;
  const failureCount = useMemo(
    () => (executions ?? []).filter((execution) => execution.status === 'error').length,
    [executions],
  );
  const successRate = useMemo(() => {
    const totalExecutions = executions?.length ?? 0;
    if (totalExecutions === 0) return 0;
    const successCount = (executions ?? []).filter((execution) => execution.status === 'success').length;
    return Math.round((successCount / totalExecutions) * 100);
  }, [executions]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        {
          label: 'Posts hoje',
          value: todayPosts,
          icon: CalendarDays,
          tone: 'from-sky-500/15 to-sky-500/5 text-sky-500',
          helper: 'conteúdos criados',
        },
        {
          label: 'Em processamento',
          value: processingCount,
          icon: Loader2,
          tone: 'from-amber-500/15 to-amber-500/5 text-amber-500',
          helper: 'fila de ingestão',
        },
        {
          label: 'Falhas pipeline',
          value: failureCount,
          icon: AlertTriangle,
          tone: 'from-red-500/15 to-red-500/5 text-red-500',
          helper: 'execuções com erro',
        },
        {
          label: 'Taxa de sucesso %',
          value: `${successRate}%`,
          icon: TrendingUp,
          tone: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500',
          helper: 'últimas execuções',
        },
      ].map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} className="overflow-hidden rounded-2xl border-border/50 bg-card/90 shadow-sm">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone}`}>
                <Icon className={`h-5 w-5 ${card.label === 'Em processamento' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold leading-none text-foreground">{card.value}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{card.helper}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStatsCards;

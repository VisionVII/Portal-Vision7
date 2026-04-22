import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, PenTool, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

const AdminStatsCards = () => {
  const { data: stats, isLoading } = usePostStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="flex gap-3 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 min-w-[140px] flex-1 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const thisMonth = stats?.thisMonth || 0;
  const total = stats?.total || 0;
  const totalViews = stats?.totalViews || 0;
  const drafts = stats?.drafts || 0;
  const monthlyTarget = Math.max(Math.ceil(total / 30), 1);
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);

  return (
    <div className="space-y-3">
      {/* ── HERO KPI: compact dominant metric ── */}
      <Card className="gradient-card-hero relative overflow-hidden rounded-2xl border border-border/20 shadow-sm dark:border-border/10">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Performance este mês
              </p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {thisMonth}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  {thisMonth === 1 ? 'publicação' : 'publicações'}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {thisMonth >= monthlyTarget ? (
                  <div className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" />
                    <span className="text-xs font-semibold">Meta atingida</span>
                  </div>
                ) : thisMonth > 0 ? (
                  <div className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Minus className="h-3 w-3" />
                    <span className="text-xs font-semibold">+{monthlyTarget - thisMonth} para meta</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    <ArrowDownRight className="h-3 w-3" />
                    <span className="text-xs font-semibold">Sem publicações</span>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/15">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-2 text-right">
                <p className="text-[10px] text-muted-foreground">{Math.min(thisMonth, monthlyTarget)}/{monthlyTarget}</p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-muted/50 dark:bg-muted/30">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 dark:from-emerald-400 dark:to-emerald-500"
              style={{ width: `${Math.max(targetProgress, thisMonth > 0 ? 10 : 0)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── SECONDARY KPIs: 3-col always ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: 'Total de posts',
            value: total,
            icon: PenTool,
            color: 'text-primary-600 dark:text-primary-400',
            bg: 'bg-primary-50 dark:bg-primary-900/30',
          },
          {
            label: 'Visualizações',
            value: totalViews,
            icon: Eye,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/30',
            format: true,
          },
          {
            label: 'Rascunhos',
            value: drafts,
            icon: Edit,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/30',
          },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="group border-border/30 bg-card/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/20"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`shrink-0 rounded-lg p-2 sm:rounded-xl sm:p-2.5 ${card.bg}`}>
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px] sm:tracking-[0.2em]">
                      {card.label}
                    </p>
                    <p className="mt-0.5 truncate text-lg font-bold text-foreground sm:text-2xl">
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
  );
};

export default AdminStatsCards;

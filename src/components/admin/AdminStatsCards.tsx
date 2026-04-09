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
        <div className="flex gap-3 overflow-hidden">
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
    <div className="space-y-4">
      {/* ── HERO KPI: dominant metric ── */}
      <Card className="relative overflow-hidden rounded-[28px] border border-border/20 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-[0_8px_32px_rgba(15,23,42,0.08)] dark:border-border/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950">
        <CardContent className="p-6 sm:p-7">
          <div className="flex min-h-[210px] flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Performance este mês
                </p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                  {thisMonth}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {thisMonth === 1 ? 'publicação' : 'publicações'}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  {thisMonth >= monthlyTarget ? (
                    <div className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <ArrowUpRight className="h-3 w-3" />
                      <span className="text-xs font-semibold">Meta atingida</span>
                    </div>
                  ) : thisMonth > 0 ? (
                    <div className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                      <Minus className="h-3 w-3" />
                      <span className="text-xs font-semibold">Publique +{monthlyTarget - thisMonth} para meta</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                      <ArrowDownRight className="h-3 w-3" />
                      <span className="text-xs font-semibold">Nenhuma publicação ainda</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-primary/10 p-3 dark:bg-primary/15">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Meta editorial
              </p>
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>Objetivo mensal (total/30)</span>
                <span className="font-semibold text-foreground">{Math.min(thisMonth, monthlyTarget)}/{monthlyTarget} publicações</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/50 dark:bg-muted/30">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 dark:from-emerald-400 dark:to-emerald-500"
                  style={{ width: `${Math.max(targetProgress, thisMonth > 0 ? 10 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
        {/* decorative accent */}
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-primary/5 dark:bg-primary/10" />
        <div className="absolute -top-4 right-20 h-16 w-16 rounded-full bg-secondary/5 dark:bg-secondary/10" />
      </Card>

      {/* ── SECONDARY KPIs: 2-col mobile, 3-col sm+ ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              className={`group border-border/30 bg-card/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/20 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className={`shrink-0 rounded-xl p-2.5 ${card.bg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-0.5 truncate text-2xl font-bold text-foreground">
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

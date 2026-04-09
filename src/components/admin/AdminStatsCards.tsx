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
  const monthlyTarget = 4;
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);

  return (
    <div className="space-y-4">
      {/* ── HERO KPI: dominant metric ── */}
      <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white shadow-[0_24px_60px_rgba(37,99,235,0.18)] dark:from-primary-700 dark:via-primary-800 dark:to-secondary-800">
        <CardContent className="p-6 sm:p-7">
          <div className="flex min-h-[210px] flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Performance este mês
                </p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
                  {thisMonth}
                </p>
                <p className="mt-1 text-sm font-medium text-white/70">
                  {thisMonth === 1 ? 'publicação' : 'publicações'}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  {thisMonth >= 4 ? (
                    <div className="flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                      <ArrowUpRight className="h-3 w-3" />
                      <span className="text-xs font-semibold">Bom ritmo</span>
                    </div>
                  ) : thisMonth > 0 ? (
                    <div className="flex items-center gap-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 backdrop-blur-sm">
                      <Minus className="h-3 w-3" />
                      <span className="text-xs font-semibold">Publique +{4 - thisMonth} para consistência</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 rounded-full bg-red-400/20 px-2 py-0.5 backdrop-blur-sm">
                      <ArrowDownRight className="h-3 w-3" />
                      <span className="text-xs font-semibold">Nenhuma publicação ainda</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Meta editorial
              </p>
              <div className="flex items-center justify-between gap-3 text-[11px] text-white/70">
                <span>Objetivo mínimo</span>
                <span>{Math.min(thisMonth, monthlyTarget)}/{monthlyTarget} publicações</span>
              </div>
              <div className="h-2 rounded-full bg-white/12">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.max(targetProgress, thisMonth > 0 ? 10 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
        {/* decorative accent */}
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -top-4 right-20 h-16 w-16 rounded-full bg-white/5" />
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

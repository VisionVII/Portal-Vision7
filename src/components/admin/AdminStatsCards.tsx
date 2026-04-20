import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, PenTool, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminStatsCardsProps {
  compact?: boolean;
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ compact = false }) => {
  const { data: stats, isLoading } = usePostStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
      {/* ── HERO KPI: Performance Card ── */}
      <Card className="relative overflow-hidden rounded-2xl border-border/20 bg-gradient-to-br from-slate-50 via-white to-slate-50/80 shadow-sm dark:border-border/10 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950">
        <CardContent className={compact ? "p-4" : "p-5 sm:p-6"}>
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Performance este mês
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <p className={`font-extrabold tracking-tight text-foreground ${compact ? "text-3xl" : "text-4xl sm:text-5xl"}`}>
                  {thisMonth}
                </p>
                <p className={`font-medium text-muted-foreground ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
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

      {/* ── SECONDARY KPIs: 3-col grid ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total de posts',
            value: total,
            icon: PenTool,
            color: 'text-primary-600 dark:text-primary-400',
            iconBg: 'bg-primary-50 dark:bg-primary-900/40',
          },
          {
            label: 'Visualizações',
            value: totalViews,
            icon: Eye,
            color: 'text-blue-600 dark:text-blue-400',
            iconBg: 'bg-blue-50 dark:bg-blue-900/40',
            format: true,
          },
          {
            label: 'Rascunhos',
            value: drafts,
            icon: Edit,
            color: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-50 dark:bg-amber-900/40',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="group border-border/30 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-border/20"
            >
              <CardContent className={compact ? "p-3" : "p-4 sm:p-5"}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`shrink-0 rounded-xl p-2.5 sm:rounded-2xl sm:p-3 ${card.iconBg}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">
                      {card.label}
                    </p>
                    <p className={`mt-1 truncate font-bold text-foreground ${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl lg:text-3xl"}`}>
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

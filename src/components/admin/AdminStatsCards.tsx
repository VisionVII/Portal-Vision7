import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, PenTool, TrendingUp } from 'lucide-react';
import { usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

const AdminStatsCards = () => {
  const { data: stats, isLoading } = usePostStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const thisMonth = stats?.thisMonth ?? 0;
  const total = stats?.total ?? 0;
  const totalViews = stats?.totalViews ?? 0;
  const drafts = stats?.drafts ?? 0;
  const monthlyTarget = Math.max(Math.ceil(total / 30), 1);
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);
  const onTarget = thisMonth >= monthlyTarget;

  const cards = [
    {
      label: 'Este mês',
      value: thisMonth,
      meta: onTarget ? 'Meta atingida' : `${monthlyTarget - thisMonth} em falta`,
      metaColor: onTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      progress: targetProgress,
      progressColor: onTarget ? 'bg-emerald-500' : 'bg-primary',
    },
    {
      label: 'Publicados',
      value: total,
      icon: PenTool,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10 dark:bg-primary/20',
    },
    {
      label: 'Visualizações',
      value: totalViews.toLocaleString('pt-PT'),
      icon: Eye,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Rascunhos',
      value: drafts,
      icon: Edit,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border-border/40 bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </p>
                  {'meta' in card && card.meta && (
                    <p className={`mt-0.5 text-[11px] font-medium ${card.metaColor}`}>{card.meta}</p>
                  )}
                </div>
                <div className={`shrink-0 rounded-lg p-2 ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
              {'progress' in card && card.progress !== undefined && (
                <div className="mt-3 h-1 w-full rounded-full bg-muted/60">
                  <div
                    className={`h-1 rounded-full transition-all duration-700 ${card.progressColor}`}
                    style={{ width: `${Math.max(card.progress, thisMonth > 0 ? 6 : 0)}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStatsCards;

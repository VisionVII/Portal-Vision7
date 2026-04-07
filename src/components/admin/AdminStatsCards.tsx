import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, PenTool, TrendingUp } from 'lucide-react';
import { usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

const AdminStatsCards = () => {
  const { data: stats, isLoading } = usePostStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total de Posts',
      value: stats?.total || 0,
      icon: PenTool,
      gradient: 'from-primary-500 to-primary-700',
      bgLight: 'bg-primary-50 dark:bg-primary-950/30',
      textColor: 'text-primary-700 dark:text-primary-300',
    },
    {
      label: 'Visualizações',
      value: stats?.totalViews || 0,
      icon: Eye,
      gradient: 'from-emerald-500 to-emerald-700',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      format: true,
    },
    {
      label: 'Rascunhos',
      value: stats?.drafts || 0,
      icon: Edit,
      gradient: 'from-amber-500 to-amber-700',
      bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Este Mês',
      value: stats?.thisMonth || 0,
      icon: TrendingUp,
      gradient: 'from-violet-500 to-violet-700',
      bgLight: 'bg-violet-50 dark:bg-violet-950/30',
      textColor: 'text-violet-700 dark:text-violet-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="group overflow-hidden border-border/50 transition-shadow hover:shadow-md dark:border-border/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="truncate text-2xl font-bold text-foreground sm:text-3xl">
                    {card.format
                      ? card.value.toLocaleString('pt-PT')
                      : card.value}
                  </p>
                </div>
                <div className={`shrink-0 rounded-xl ${card.bgLight} p-2.5 transition-transform group-hover:scale-105`}>
                  <Icon className={`h-5 w-5 ${card.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStatsCards;

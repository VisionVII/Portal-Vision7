import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, PenTool, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePostStats } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

const AdminStatsCards = () => {
  const { data: stats, isLoading } = usePostStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const thisMonth = stats?.thisMonth || 0;

  /* ─── Hero KPI: "Este Mês" ─── */
  const heroCard = {
    label: 'Este mês',
    value: thisMonth,
    icon: TrendingUp,
    hint: thisMonth > 0
      ? `+${thisMonth} publicações novas`
      : 'Nenhuma publicação este mês',
    positive: thisMonth > 0,
  };

  /* ─── Secondary KPIs ─── */
  const secondaryCards = [
    {
      label: 'Total de posts',
      value: stats?.total || 0,
      icon: PenTool,
      iconBg: 'bg-primary-100 dark:bg-primary-900/40',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Visualizações',
      value: stats?.totalViews || 0,
      icon: Eye,
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      format: true,
    },
    {
      label: 'Rascunhos',
      value: stats?.drafts || 0,
      icon: Edit,
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* ── Hero card: dominant KPI ── */}
      <Card className="group relative overflow-hidden border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-secondary-50/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 dark:border-primary-800/40 dark:from-primary-950/40 dark:via-card dark:to-secondary-950/20 sm:col-span-2 lg:col-span-1">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                {heroCard.label}
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
                {heroCard.value}
              </p>
              <div className="mt-2 flex items-center gap-1">
                {heroCard.positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className={`text-xs font-medium ${heroCard.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                  {heroCard.hint}
                </span>
              </div>
            </div>
            <div className="shrink-0 rounded-xl bg-primary-600 p-2.5 text-white shadow-sm">
              <heroCard.icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Secondary cards ── */}
      {secondaryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="group overflow-hidden border-border/40 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:border-border/25"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {card.label}
                  </p>
                  <p className="mt-2 truncate text-2xl font-bold text-foreground">
                    {card.format
                      ? card.value.toLocaleString('pt-PT')
                      : card.value}
                  </p>
                </div>
                <div className={`shrink-0 rounded-lg ${card.iconBg} p-2 transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
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

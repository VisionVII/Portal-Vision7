import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  MousePointerClick,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';

type Period = 7 | 30 | 90;

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
];

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Visualizações',
  post_view: 'Leitura de posts',
  podcast_play: 'Reprodução áudio',
  download: 'Downloads',
  click: 'Cliques',
  share: 'Partilhas',
  newsletter_signup: 'Newsletter',
  scroll: 'Scroll profundo',
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(35, 85%, 55%)',
  'hsl(280, 55%, 55%)',
  'hsl(0, 65%, 55%)',
  'hsl(180, 50%, 45%)',
  'hsl(60, 70%, 45%)',
];

const AnalyticsView: React.FC = () => {
  const [period, setPeriod] = useState<Period>(30);
  const { data, isLoading, error } = useAnalyticsSummary(period);

  const { totalEvents, uniqueDays, eventTypeData, dailyChartData, topEvents, trend } = useMemo(() => {
    if (!data) return { totalEvents: 0, uniqueDays: 0, eventTypeData: [], dailyChartData: [], topEvents: [], trend: 0 };

    const { summary, dailyData } = data;

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const days = Object.keys(dailyData);
    const uniqueDays = days.length;

    // Event type breakdown for pie chart
    const typeData = Object.entries(summary)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        name: EVENT_LABELS[type] || type,
        type,
        value: count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    // Daily chart data sorted by date
    const sortedDays = days.sort();
    const daily = sortedDays.map((date) => {
      const dayTotal = Object.values(dailyData[date]).reduce((a, b) => a + b, 0);
      return {
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
        total: dayTotal,
        ...dailyData[date],
      };
    });

    // Trend: compare last half vs first half
    const mid = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, mid).reduce((a, d) => a + d.total, 0);
    const secondHalf = daily.slice(mid).reduce((a, d) => a + d.total, 0);
    const trendPct = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    // Top 5 events
    const top = typeData.slice(0, 5);

    return { totalEvents: total, uniqueDays, eventTypeData: typeData, dailyChartData: daily, topEvents: top, trend: trendPct };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">Erro ao carregar analytics: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  const avgPerDay = uniqueDays > 0 ? Math.round(totalEvents / uniqueDays) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Analytics</h2>
          <p className="text-sm text-muted-foreground">Panorama de eventos e tráfego do portal</p>
        </div>
        <div className="flex gap-1.5 rounded-lg border border-border/50 bg-muted/30 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                period === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard
          icon={Eye}
          label="Total de eventos"
          value={totalEvents.toLocaleString('pt-PT')}
          sub={`últimos ${period} dias`}
        />
        <KpiCard
          icon={Calendar}
          label="Dias ativos"
          value={uniqueDays.toString()}
          sub={`de ${period} dias`}
        />
        <KpiCard
          icon={MousePointerClick}
          label="Média / dia"
          value={avgPerDay.toLocaleString('pt-PT')}
          sub="eventos"
        />
        <KpiCard
          icon={TrendingUp}
          label="Tendência"
          value={`${trend >= 0 ? '+' : ''}${trend}%`}
          sub="2ª metade vs 1ª"
          positive={trend >= 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily trend — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Eventos diários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem dados no período selecionado</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" width={40} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        fontSize: '12px',
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Eventos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type breakdown — 1/3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Por tipo de evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventTypeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem dados</p>
            ) : (
              <>
                <div className="mx-auto h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {eventTypeData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {topEvents.map((evt, idx) => (
                    <div key={evt.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{evt.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {evt.value.toLocaleString('pt-PT')}{' '}
                        <span className="text-xs text-muted-foreground">({evt.pct}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend line */}
      {dailyChartData.length > 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tendência de tráfego
              <Badge variant={trend >= 0 ? 'default' : 'destructive'} className="ml-auto text-xs">
                {trend >= 0 ? <ArrowUpRight className="mr-0.5 h-3 w-3" /> : <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                {Math.abs(trend)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" width={40} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    name="Eventos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ─── KPI Card ─── */
interface KpiCardProps {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, sub, positive }) => (
  <Card>
    <CardContent className="flex items-start gap-3 p-4">
      <div className="rounded-lg bg-primary/10 p-2 dark:bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-bold tabular-nums tracking-tight ${
            positive !== undefined ? (positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400') : ''
          }`}
        >
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </CardContent>
  </Card>
);

export default AnalyticsView;

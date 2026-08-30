import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  MousePointerClick,
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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

// Cor fixa por tipo de evento — antes era atribuída por posição no ranking,
// o que fazia o mesmo tipo mudar de cor de dia para dia consoante o volume relativo.
const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: 'hsl(var(--primary))',
  post_view: 'hsl(199, 89%, 55%)',
  podcast_play: 'hsl(262, 72%, 60%)',
  download: 'hsl(38, 92%, 55%)',
  click: 'hsl(152, 69%, 48%)',
  share: 'hsl(280, 55%, 55%)',
  newsletter_signup: 'hsl(14, 86%, 55%)',
  scroll: 'hsl(180, 50%, 45%)',
};
const FALLBACK_EVENT_COLOR = 'hsl(213, 13%, 55%)';
const colorForEventType = (type: string) => EVENT_TYPE_COLORS[type] ?? FALLBACK_EVENT_COLOR;

const AnalyticsView: React.FC = () => {
  const [period, setPeriod] = useState<Period>(30);
  const { data, isLoading, error } = useAnalyticsSummary(period);

  const { totalEvents, uniqueDays, eventTypeData, dailyChartData, topEvents, topPages, trend } = useMemo(() => {
    if (!data) {
      return { totalEvents: 0, uniqueDays: 0, eventTypeData: [], dailyChartData: [], topEvents: [], topPages: [], trend: 0 };
    }

    const { summary, dailyData, topPages } = data;

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

    return { totalEvents: total, uniqueDays, eventTypeData: typeData, dailyChartData: daily, topEvents: top, topPages, trend: trendPct };
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
  const maxPageCount = topPages[0]?.count ?? 0;
  const mostlyPageViews = eventTypeData.length > 0 && eventTypeData[0].pct >= 90;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-[3px] rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">Analytics</span>
          <span className="ml-1 text-xs text-muted-foreground">
            {totalEvents.toLocaleString('pt-PT')} eventos nos últimos {period} dias
          </span>
        </div>
        <div data-tour="analytics-period" className="flex w-fit items-center gap-1 rounded-2xl border border-border/40 bg-muted/30 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                period === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div data-tour="analytics-kpis" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Eye} label="Total de eventos" value={totalEvents.toLocaleString('pt-PT')} sub={`últimos ${period} dias`} tone="neutral" />
        <KpiCard icon={Calendar} label="Dias ativos" value={`${uniqueDays} / ${period}`} sub="dias com eventos" tone="info" />
        <KpiCard icon={MousePointerClick} label="Média / dia" value={avgPerDay.toLocaleString('pt-PT')} sub="eventos" tone="neutral" />
        <KpiCard
          icon={TrendingUp}
          label="Tendência"
          value={`${trend >= 0 ? '+' : ''}${trend}%`}
          sub="2ª metade vs 1ª"
          tone={trend >= 0 ? 'success' : 'destructive'}
        />
      </div>

      <div data-tour="analytics-charts" className="space-y-4">
      {/* Daily chart */}
      <Card>
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
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" interval="preserveStartEnd" />
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top pages — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Páginas mais vistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem dados de páginas no período selecionado</p>
            ) : (
              <div className="space-y-2.5">
                {topPages.map((page, idx) => (
                  <div key={page.path} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium" title={page.path}>{page.path}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                          {page.count.toLocaleString('pt-PT')}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${maxPageCount > 0 ? (page.count / maxPageCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                        {eventTypeData.map((entry) => (
                          <Cell key={entry.type} fill={colorForEventType(entry.type)} />
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
                  {topEvents.map((evt) => (
                    <div key={evt.type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForEventType(evt.type) }} />
                        <span className="text-muted-foreground">{evt.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {evt.value.toLocaleString('pt-PT')} <span className="text-xs text-muted-foreground">({evt.pct}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
                {mostlyPageViews && (
                  <p className="mt-3 border-t border-border/40 pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
                    A generalidade dos eventos registados ainda é de visualização de página — mais tipos aparecem aqui à medida que forem instrumentados no portal.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

/* ─── KPI Card ─── */
type KpiTone = 'neutral' | 'info' | 'success' | 'destructive';

const KPI_TONE_STYLES: Record<KpiTone, { card: string; text: string }> = {
  neutral: { card: 'border-border/40 bg-card/60', text: 'text-foreground' },
  info: { card: 'border-info/30 bg-gradient-to-br from-info/15 via-info/5 to-transparent', text: 'text-info' },
  success: { card: 'border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent', text: 'text-success' },
  destructive: { card: 'border-destructive/30 bg-gradient-to-br from-destructive/15 via-destructive/5 to-transparent', text: 'text-destructive' },
};

interface KpiCardProps {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
  value: string;
  sub: string;
  tone: KpiTone;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, sub, tone }) => {
  const styles = KPI_TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border p-3.5 ${styles.card}`}>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${tone === 'neutral' ? 'text-muted-foreground' : styles.text}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${styles.text}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
};

export default AnalyticsView;

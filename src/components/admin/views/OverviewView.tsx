import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  ExternalLink,
  Globe,
  LayoutTemplate,
  Plus,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Lightbulb,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { useAudiocasts } from '@/hooks/useAudiocasts';
import { useCategories } from '@/hooks/useCategories';
import type { AdminView } from '@/components/admin/dashboard-types';

const PORTAL_SECTIONS = [
  { label: 'Homepage', path: '/', description: 'Últimas notícias e destaques' },
  { label: 'Tecnologia', path: '/tecnologia', description: 'Posts tecnologia' },
  { label: 'Desporto', path: '/desporto', description: 'Posts desporto' },
  { label: 'Música', path: '/musica', description: 'Posts música' },
  { label: 'Saúde', path: '/saude', description: 'Posts saúde' },
  { label: 'Mundo', path: '/mundo', description: 'Posts mundo' },
  { label: 'Audiocasts', path: '/audiocasts', description: 'Audiocasts e áudio' },
];

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: stats } = usePostStats();
  const { data: courses = [] } = useCourses(true);
  const { data: newsletterStats } = useNewsletterStats();
  const { data: audiocasts = [] } = useAudiocasts(true);
  const { data: categories } = useCategories();

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);
  const recentPosts = useMemo(() => posts?.slice(0, 6) ?? [], [posts]);

  const postsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    publishedPosts.forEach((p) => {
      const cat = p.categories?.name ?? 'Sem categoria';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [publishedPosts]);

  // Weekly post counts for mini chart (last 4 weeks)
  const weeklyPosts = useMemo(() => {
    const weeks: number[] = [0, 0, 0, 0];
    const now = Date.now();
    publishedPosts.forEach((p) => {
      const age = now - new Date(p.created_at).getTime();
      const weekIdx = Math.floor(age / (7 * 24 * 60 * 60 * 1000));
      if (weekIdx >= 0 && weekIdx < 4) weeks[3 - weekIdx]++;
    });
    return weeks;
  }, [publishedPosts]);

  const maxWeekly = Math.max(...weeklyPosts, 1);

  // Change vs previous week
  const weeklyChange = weeklyPosts[3] - weeklyPosts[2];

  // Smart insights
  const insights = useMemo(() => {
    const tips: Array<{ text: string; type: 'success' | 'warning' | 'info' }> = [];

    const thisMonth = stats?.thisMonth ?? 0;
    if (thisMonth >= 4) {
      tips.push({ text: `Publicou ${thisMonth} posts este mês — boa consistência!`, type: 'success' });
    } else if (thisMonth > 0) {
      tips.push({ text: `Apenas ${thisMonth} post${thisMonth > 1 ? 's' : ''} este mês. Publique mais ${4 - thisMonth} para manter ritmo.`, type: 'warning' });
    } else {
      tips.push({ text: 'Nenhuma publicação este mês. Comece com um rascunho!', type: 'warning' });
    }

    if (draftPosts.length > 3) {
      tips.push({ text: `${draftPosts.length} rascunhos pendentes — revise e publique.`, type: 'info' });
    }

    const totalViews = stats?.totalViews ?? 0;
    if (totalViews === 0 && publishedPosts.length > 0) {
      tips.push({ text: 'Nenhum post teve visualizações ainda. Partilhe nas redes.', type: 'warning' });
    }

    return tips.slice(0, 2);
  }, [stats, draftPosts.length, publishedPosts.length]);

  return (
    <div className="space-y-8">
      <AdminStatsCards />

      {/* Smart insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${
                insight.type === 'success'
                  ? 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/20'
                  : insight.type === 'warning'
                    ? 'border-amber-200/60 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-950/20'
                    : 'border-blue-200/60 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-950/20'
              }`}
            >
              <Lightbulb className={`mt-0.5 h-4 w-4 shrink-0 ${
                insight.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : insight.type === 'warning'
                    ? 'text-amber-500'
                    : 'text-blue-600 dark:text-blue-400'
              }`} />
              <p className="text-sm text-foreground/80">{insight.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Primary action + secondary actions */}
      <div className="flex flex-wrap items-center gap-3">
        {allowedViews.includes('content') && (
          <Button onClick={onNewPost} size="lg" className="gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        )}
        <div className="flex gap-2">
          {allowedViews.includes('builder') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('builder')}
              className="gap-1.5 rounded-lg text-muted-foreground"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Homepage
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('automations')}
              className="gap-1.5 rounded-lg text-muted-foreground"
            >
              <Bot className="h-3.5 w-3.5" />
              Automações
            </Button>
          )}
          <Link to="/" target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Ver Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PostsTable posts={recentPosts} isLoading={postsLoading} onEdit={onEdit} />

        <div className="space-y-5">
          {/* Weekly publishing chart — with comparison */}
          <Card className="border-border/40 dark:border-border/25">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">Publicações semanais</CardTitle>
                  <CardDescription className="text-xs text-neutral-400 dark:text-neutral-500">Últimas 4 semanas</CardDescription>
                </div>
                {weeklyChange !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    weeklyChange > 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {weeklyChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 rotate-90" />
                    )}
                    {weeklyChange > 0 ? '+' : ''}{weeklyChange} vs anterior
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                {weeklyPosts.map((count, i) => {
                  const isLatest = i === 3;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className={`text-xs font-bold ${isLatest ? 'text-primary-600 dark:text-primary-400' : 'text-foreground/70'}`}>{count}</span>
                      <div
                        className={`w-full rounded-md transition-all duration-300 ${
                          isLatest
                            ? 'bg-primary-500 dark:bg-primary-400/80'
                            : 'bg-primary-200/80 dark:bg-primary-700/40'
                        }`}
                        style={{ height: `${Math.max((count / maxWeekly) * 56, 6)}px` }}
                      />
                      <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">S{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ecosystem stats */}
          <Card className="border-border/40 dark:border-border/25">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Ecossistema</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Publicados', value: publishedPosts.length, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Rascunhos', value: draftPosts.length, color: 'text-amber-500' },
                { label: 'Newsletter', value: newsletterStats?.active || 0, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Cursos', value: courses.length, color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Audiocasts', value: audiocasts.length, color: 'text-pink-600 dark:text-pink-400' },
                { label: 'Categorias', value: categories?.length || 0, color: 'text-foreground' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-muted/40 p-3 dark:bg-muted/20">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {stat.label}
                  </p>
                  <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Posts by category */}
          {postsByCategory.length > 0 && (
            <Card className="border-border/40 dark:border-border/25">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Posts por categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {postsByCategory.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{cat}</span>
                    <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted/60 dark:bg-muted/30">
                      <div
                        className="h-full rounded-full bg-primary-500 transition-all duration-300 dark:bg-primary-400/70"
                        style={{
                          width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-bold text-neutral-400 dark:text-neutral-500">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Portal sections */}
          <Card className="border-border/40 dark:border-border/25">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Secções do portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {PORTAL_SECTIONS.map((s) => (
                <Link
                  key={s.path}
                  to={s.path}
                  target="_blank"
                  className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{s.description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;

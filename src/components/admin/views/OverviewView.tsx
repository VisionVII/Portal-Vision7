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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PostsTable from '@/components/admin/PostsTable';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { usePodcasts } from '@/hooks/usePodcasts';
import { useCategories } from '@/hooks/useCategories';
import type { AdminView } from '@/components/admin/dashboard-types';

const PORTAL_SECTIONS = [
  { label: 'Homepage', path: '/', description: 'Últimas notícias e destaques' },
  { label: 'Tecnologia', path: '/tecnologia', description: 'Posts tecnologia' },
  { label: 'Desporto', path: '/desporto', description: 'Posts desporto' },
  { label: 'Música', path: '/musica', description: 'Posts música' },
  { label: 'Saúde', path: '/saude', description: 'Posts saúde' },
  { label: 'Mundo', path: '/mundo', description: 'Posts mundo' },
  { label: 'Podcasts', path: '/podcasts', description: 'Podcasts e áudio' },
];

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: courses = [] } = useCourses(true);
  const { data: newsletterStats } = useNewsletterStats();
  const { data: podcasts = [] } = usePodcasts(true);
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

  return (
    <div className="space-y-6">
      <AdminStatsCards />

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {allowedViews.includes('content') && (
          <button
            onClick={onNewPost}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-primary-200 bg-gradient-to-b from-primary-50 to-primary-50/50 p-4 text-center transition-all hover:shadow-md hover:shadow-primary-100/50 dark:border-primary-800 dark:from-primary-950/30 dark:to-primary-950/10 dark:hover:shadow-primary-900/20"
          >
            <div className="rounded-xl bg-primary-600 p-2.5 text-white shadow-sm transition-transform group-hover:scale-110">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">Novo Post</span>
          </button>
        )}
        {allowedViews.includes('builder') && (
          <button
            onClick={() => onNavigate('builder')}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md dark:hover:shadow-neutral-900/20"
          >
            <div className="rounded-xl bg-secondary-600 p-2.5 text-white shadow-sm transition-transform group-hover:scale-110">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">Homepage</span>
          </button>
        )}
        {allowedViews.includes('automations') && (
          <button
            onClick={() => onNavigate('automations')}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md dark:hover:shadow-neutral-900/20"
          >
            <div className="rounded-xl bg-violet-600 p-2.5 text-white shadow-sm transition-transform group-hover:scale-110">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">Automações</span>
          </button>
        )}
        <Link
          to="/"
          target="_blank"
          className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-md dark:hover:shadow-neutral-900/20"
        >
          <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-sm transition-transform group-hover:scale-110">
            <Globe className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">Ver Portal</span>
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PostsTable posts={recentPosts} isLoading={postsLoading} onEdit={onEdit} />

        <div className="space-y-4">
          {/* Weekly publishing chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary-600" />
                Publicações semanais
              </CardTitle>
              <CardDescription className="text-xs">Últimas 4 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                {weeklyPosts.map((count, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-foreground">{count}</span>
                    <div
                      className="w-full rounded-t-md bg-primary-500/80 transition-all dark:bg-primary-400/60"
                      style={{ height: `${Math.max((count / maxWeekly) * 48, 4)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">S{i + 1}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ecosystem stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                Ecossistema
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Publicados', value: publishedPosts.length },
                { label: 'Rascunhos', value: draftPosts.length },
                { label: 'Newsletter', value: newsletterStats?.active || 0 },
                { label: 'Cursos', value: courses.length },
                { label: 'Podcasts', value: podcasts.length },
                { label: 'Categorias', value: categories?.length || 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Posts by category */}
          {postsByCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary-600" />
                  Posts por categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {postsByCategory.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary-600 transition-all"
                          style={{
                            width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs font-bold text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Portal sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-primary-600" />
                Secções do portal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {PORTAL_SECTIONS.map((s) => (
                <Link
                  key={s.path}
                  to={s.path}
                  target="_blank"
                  className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Globe,
  LayoutTemplate,
  Plus,
  Lightbulb,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [showEcosystem, setShowEcosystem] = useState(false);

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);
  const recentPosts = useMemo(() => posts?.slice(0, 6) ?? [], [posts]);

  const postsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    publishedPosts.forEach((p) => {
      const cat = p.categories?.name ?? 'Sem categoria';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
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
  const weeklyChange = weeklyPosts[3] - weeklyPosts[2];

  // Smart insights — context-aware recommendations
  const insights = useMemo(() => {
    const tips: Array<{ text: string; type: 'success' | 'warning' | 'info'; action?: string }> = [];
    const thisMonth = stats?.thisMonth ?? 0;
    const totalViews = stats?.totalViews ?? 0;

    // Best performing insight
    if (thisMonth >= 4) {
      tips.push({ text: `${thisMonth} publicações este mês — excelente consistência!`, type: 'success' });
    } else if (thisMonth > 0) {
      tips.push({ text: `Publique mais ${4 - thisMonth} posts para atingir a meta semanal.`, type: 'warning', action: 'Criar post' });
    } else {
      tips.push({ text: 'Sem publicações este mês. Comece agora.', type: 'warning', action: 'Criar post' });
    }

    if (draftPosts.length > 3) {
      tips.push({ text: `${draftPosts.length} rascunhos aguardam revisão.`, type: 'info', action: 'Ver rascunhos' });
    }

    if (totalViews === 0 && publishedPosts.length > 0) {
      tips.push({ text: 'Os seus posts ainda não têm visualizações. Partilhe nas redes.', type: 'warning' });
    }

    return tips.slice(0, 2);
  }, [stats, draftPosts.length, publishedPosts.length]);

  return (
    <div className="space-y-8">
      {/* ═══ ZONE 1: DECISION — KPIs + Insights ═══ */}
      <AdminStatsCards />

      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                insight.type === 'success'
                  ? 'border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-800/25 dark:bg-emerald-950/15'
                  : insight.type === 'warning'
                    ? 'border-amber-200/50 bg-amber-50/40 dark:border-amber-800/25 dark:bg-amber-950/15'
                    : 'border-blue-200/50 bg-blue-50/40 dark:border-blue-800/25 dark:bg-blue-950/15'
              }`}
            >
              <Lightbulb className={`h-4 w-4 shrink-0 ${
                insight.type === 'success' ? 'text-emerald-500' : insight.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <p className="min-w-0 flex-1 text-sm text-foreground/80">{insight.text}</p>
              {insight.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => {
                    if (insight.action === 'Criar post') onNewPost();
                    else if (insight.action === 'Ver rascunhos') onNavigate('content');
                  }}
                >
                  {insight.action}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ ZONE 2: ACTION — Primary + secondary actions ═══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {allowedViews.includes('content') && (
          <Button onClick={onNewPost} size="lg" className="w-full gap-2 rounded-xl shadow-sm sm:w-auto">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        )}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {allowedViews.includes('builder') && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('builder')} className="shrink-0 gap-1.5 rounded-lg">
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span className="hidden min-[400px]:inline">Homepage</span>
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('automations')} className="shrink-0 gap-1.5 rounded-lg">
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden min-[400px]:inline">Automações</span>
            </Button>
          )}
          <Link to="/" target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden min-[400px]:inline">Portal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ ZONE 3: ANALYSIS — Content + Charts ═══ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Main content — posts table */}
        <div className="xl:col-span-7">
          <PostsTable posts={recentPosts} isLoading={postsLoading} onEdit={onEdit} />
        </div>

        {/* Sidebar analytics */}
        <div className="space-y-5 xl:col-span-5">
          {/* Weekly chart */}
          <Card className="border-border/30 dark:border-border/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Publicações semanais</CardTitle>
                {weeklyChange !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    weeklyChange > 0
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <ArrowUpRight className={`h-2.5 w-2.5 ${weeklyChange < 0 ? 'rotate-90' : ''}`} />
                    {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                {weeklyPosts.map((count, i) => {
                  const isLatest = i === 3;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${isLatest ? 'text-primary-600 dark:text-primary-400' : 'text-foreground/50'}`}>{count}</span>
                      <div
                        className={`w-full rounded-md transition-all duration-300 ${
                          isLatest ? 'bg-primary-500 dark:bg-primary-400/80' : 'bg-muted/80 dark:bg-muted/40'
                        }`}
                        style={{ height: `${Math.max((count / maxWeekly) * 56, 4)}px` }}
                      />
                      <span className="text-[9px] font-medium text-muted-foreground">S{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              {weeklyPosts.every((w) => w === 0) && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Sem publicações nas últimas 4 semanas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Posts by category — collapsed by default on mobile */}
          {postsByCategory.length > 0 && (
            <Card className="border-border/30 dark:border-border/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top categorias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {postsByCategory.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{cat}</span>
                    <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/25">
                      <div
                        className="h-full rounded-full bg-primary-500/80 dark:bg-primary-400/60"
                        style={{ width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ecosystem — progressive disclosure */}
          <Card className="border-border/30 dark:border-border/20">
            <button
              type="button"
              onClick={() => setShowEcosystem((v) => !v)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-semibold text-foreground">Ecossistema</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {publishedPosts.length + draftPosts.length + audiocasts.length + courses.length} itens
                </span>
                {showEcosystem ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {showEcosystem && (
              <CardContent className="border-t border-border/20 pt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Publicados', value: publishedPosts.length, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Rascunhos', value: draftPosts.length, color: 'text-amber-500' },
                    { label: 'Newsletter', value: newsletterStats?.active || 0, color: 'text-blue-500' },
                    { label: 'Cursos', value: courses.length, color: 'text-violet-500' },
                    { label: 'Audiocasts', value: audiocasts.length, color: 'text-pink-500' },
                    { label: 'Categorias', value: categories?.length || 0, color: 'text-foreground/70' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-muted/30 p-3 dark:bg-muted/15">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;

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
  Eye,
  Edit,
  Trash2,
  Search,
  FileText,
  X,
} from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import { Post, usePosts, usePostStats, useDeletePost } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { useAudiocasts } from '@/hooks/useAudiocasts';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { AdminView } from '@/components/admin/dashboard-types';

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
  const deletePost = useDeletePost();
  const { toast } = useToast();
  const [showEcosystem, setShowEcosystem] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);
  const draftPosts = useMemo(() => posts?.filter((p) => p.status === 'draft') ?? [], [posts]);
  const recentPosts = useMemo(() => posts?.slice(0, 8) ?? [], [posts]);

  const filteredPosts = useMemo(() => {
    return recentPosts.filter((p) => {
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.categories?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [recentPosts, searchQuery, statusFilter]);

  const postsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    publishedPosts.forEach((p) => {
      const cat = p.categories?.name ?? 'Sem categoria';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [publishedPosts]);

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

  const insights = useMemo(() => {
    const tips: Array<{ text: string; type: 'success' | 'warning' | 'info'; action?: string }> = [];
    const thisMonth = stats?.thisMonth ?? 0;
    const totalViews = stats?.totalViews ?? 0;

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem a certeza que deseja eliminar o post "${title}"?`)) return;
    try {
      await deletePost.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Post eliminado com sucesso!' });
      setExpandedPost(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Erro', description: message || 'Erro ao eliminar o post.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-0">
      {/* ═══════════════════════════════════════════════════════
          FOLD 1 — KPIs + Insights + Quick Actions
          ═══════════════════════════════════════════════════════ */}
      <section className="space-y-5 pb-8">
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

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {allowedViews.includes('content') && (
            <Button onClick={onNewPost} size="lg" className="gap-2 rounded-xl shadow-sm">
              <Plus className="h-4 w-4" />
              Novo Post
            </Button>
          )}
          {allowedViews.includes('builder') && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('builder')} className="gap-1.5 rounded-lg">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Homepage
            </Button>
          )}
          {allowedViews.includes('automations') && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('automations')} className="gap-1.5 rounded-lg">
              <Bot className="h-3.5 w-3.5" />
              Automações
            </Button>
          )}
          <Link to="/" target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* fold separator */}
      <div className="border-t border-border/20 dark:border-border/10" />

      {/* ═══════════════════════════════════════════════════════
          FOLD 2 — Posts Recentes (Image Cards)
          ═══════════════════════════════════════════════════════ */}
      <section className="space-y-5 py-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Posts Recentes</h3>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{recentPosts.length}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">{publishedPosts.length}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{draftPosts.length}</span>
          </div>
        </div>

        {/* Search + filter pills */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'published', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                {s === 'all' ? 'Todos' : s === 'published' ? 'Publicados' : 'Rascunhos'}
              </button>
            ))}
          </div>
        </div>

        {/* Post image cards grid */}
        {postsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 py-16 dark:border-border/20">
            <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/20">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground/70">
              {searchQuery || statusFilter !== 'all' ? 'Nenhum post encontrado' : 'Sem publicações ainda'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Comece criando o seu primeiro artigo'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPosts.map((post) => {
              const isExpanded = expandedPost === post.id;
              const imgSrc = post.image_url || post.banner_url;
              const catColor = post.categories?.color || '#3b82f6';
              return (
                <div
                  key={post.id}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/30 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-border/20"
                  onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                >
                  {/* Image area */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={post.title}
                        className={`h-full w-full object-cover transition-transform duration-500 ${isExpanded ? 'scale-105 brightness-[0.4]' : 'group-hover:scale-[1.03]'}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Default overlay — title + category at bottom */}
                    <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${isExpanded ? 'opacity-0' : 'opacity-100'}`}>
                      {post.categories && (
                        <span
                          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90"
                          style={{ backgroundColor: `${catColor}cc` }}
                        >
                          {post.categories.name}
                        </span>
                      )}
                      <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white">
                        {post.title}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/60">
                        <span>{format(new Date(post.created_at), 'dd MMM', { locale: pt })}</span>
                        <span>•</span>
                        <span>{post.views || 0} views</span>
                      </div>
                    </div>

                    {/* Status badge — top right */}
                    <div className="absolute right-2.5 top-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm ${
                        post.status === 'published'
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-amber-500/80 text-white'
                      }`}>
                        {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>

                    {/* Expanded overlay — full details + actions */}
                    <div className={`absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedPost(null); }}
                          className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition-colors hover:bg-white/30"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {post.categories && (
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90"
                            style={{ backgroundColor: `${catColor}cc` }}
                          >
                            {post.categories.name}
                          </span>
                        )}
                        <h4 className="text-base font-bold leading-snug text-white">{post.title}</h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70">
                          <span>{format(new Date(post.created_at), 'dd MMM yyyy', { locale: pt })}</span>
                          <span>{post.read_time}</span>
                          <span>{post.views || 0} views</span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          {post.status === 'published' && (
                            <Link to={`/post/${post.slug}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="secondary" className="h-8 gap-1.5 rounded-lg bg-white/20 text-xs text-white backdrop-blur-sm hover:bg-white/30">
                                <Eye className="h-3.5 w-3.5" />
                                Ver
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1.5 rounded-lg bg-white/20 text-xs text-white backdrop-blur-sm hover:bg-white/30"
                            onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1.5 rounded-lg bg-red-500/40 text-xs text-white backdrop-blur-sm hover:bg-red-500/60"
                            onClick={(e) => { e.stopPropagation(); handleDelete(post.id, post.title); }}
                            disabled={deletePost.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* fold separator */}
      <div className="border-t border-border/20 dark:border-border/10" />

      {/* ═══════════════════════════════════════════════════════
          FOLD 3 — Análise (Gráfico + Categorias + Ecossistema)
          ═══════════════════════════════════════════════════════ */}
      <section className="space-y-5 py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Weekly chart */}
          <Card className="border-border/30 dark:border-border/20">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2">
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
            </div>
            <CardContent className="pt-0">
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
                        style={{ height: `${Math.max((count / maxWeekly) * 64, 4)}px` }}
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

          {/* Top categories */}
          <Card className="border-border/30 dark:border-border/20">
            <div className="px-6 py-4">
              <CardTitle className="text-sm font-semibold">Top categorias</CardTitle>
            </div>
            <CardContent className="space-y-2.5 pt-0">
              {postsByCategory.length > 0 ? (
                postsByCategory.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{cat}</span>
                    <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/25">
                      <div
                        className="h-full rounded-full bg-primary-500/80 dark:bg-primary-400/60"
                        style={{ width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{count}</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">Sem dados de categorias</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ecosystem — collapsible */}
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
      </section>
    </div>
  );
};

export default OverviewView;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Plus,
  Settings,
  Shield,
  TerminalSquare,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SiteSettingsManager from '@/components/admin/SiteSettingsManager';
import AdminStatsCards from '@/components/admin/AdminStatsCards';
import PostForm from '@/components/admin/PostForm';
import PostsTable from '@/components/admin/PostsTable';
import NewsletterManager from '@/components/admin/NewsletterManager';
import AdminCmsCustomizer from '@/components/admin/AdminCmsCustomizer';
import AdminCoursesManager from '@/components/admin/AdminCoursesManager';
import AdminAccessManager from '@/components/admin/AdminAccessManager';
import DeveloperControlCenter from '@/components/admin/DeveloperControlCenter';
import AdminAutomationPanel from '@/components/admin/AdminAutomationPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { usePodcasts } from '@/hooks/usePodcasts';
import { useCategories } from '@/hooks/useCategories';

type AdminView = 'overview' | 'content' | 'builder' | 'automations' | 'courses' | 'crm' | 'access' | 'developer' | 'settings';

const VIEW_ACCESS_RULES: Record<AdminView, string[]> = {
  overview: ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'],
  builder: ['super_admin', 'admin', 'editor'],
  content: ['super_admin', 'admin', 'editor', 'redator', 'moderador'],
  automations: ['super_admin', 'admin', 'editor'],
  courses: ['super_admin', 'admin', 'editor'],
  crm: ['super_admin', 'admin', 'editor', 'analyst'],
  access: ['super_admin', 'admin'],
  developer: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin'],
};

const PORTAL_SECTIONS = [
  { label: 'Homepage', path: '/', description: 'Últimas notícias, destaques e cursos' },
  { label: 'Tecnologia', path: '/tecnologia', description: 'Posts da categoria tecnologia' },
  { label: 'Desporto', path: '/desporto', description: 'Posts da categoria desporto' },
  { label: 'Música', path: '/musica', description: 'Posts da categoria música' },
  { label: 'Saúde', path: '/saude', description: 'Posts da categoria saúde' },
  { label: 'Mundo', path: '/mundo', description: 'Posts da categoria mundo' },
  { label: 'Podcasts', path: '/podcasts', description: 'Podcasts e áudio' },
];

const AdminDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const { user, isAdmin, canAccessDashboard, primaryRole, roles, isLoading: authLoading, signOut } = useAuth();
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: postStats } = usePostStats();
  const { data: courses = [] } = useCourses(true);
  const { data: podcasts = [] } = usePodcasts(true);
  const { data: newsletterStats } = useNewsletterStats();
  const { data: categories } = useCategories();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !canAccessDashboard)) {
      navigate('/admin/login');
    }
  }, [user, canAccessDashboard, authLoading, navigate]);

  const allowedViews = useMemo(() => {
    if (isAdmin) return Object.keys(VIEW_ACCESS_RULES) as AdminView[];
    return (Object.entries(VIEW_ACCESS_RULES) as Array<[AdminView, string[]]>)
      .filter(([, allowed]) => roles.some((r) => allowed.includes(r)))
      .map(([view]) => view);
  }, [isAdmin, roles]);

  useEffect(() => {
    if (!allowedViews.includes(activeView)) setActiveView('overview');
  }, [activeView, allowedViews]);

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setShowPostForm(true);
    setActiveView('content');
  };

  const handleCloseForm = () => {
    setShowPostForm(false);
    setEditingPost(null);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setShowPostForm(true);
    setActiveView('content');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

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

  const navigationItems = useMemo(() => {
    const items: Array<{ id: AdminView; label: string; icon: typeof LayoutDashboard; hint: string; badge?: number }> = [
      { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, hint: 'KPIs e atalhos' },
      { id: 'content', label: 'Conteúdo', icon: FileText, hint: 'Posts e editorial', badge: draftPosts.length || undefined },
      { id: 'builder', label: 'Homepage', icon: LayoutTemplate, hint: 'Builder visual' },
      { id: 'automations', label: 'Automações', icon: Bot, hint: 'N8N e workflows' },
      { id: 'courses', label: 'Cursos', icon: GraduationCap, hint: 'Afiliados e parcerias' },
      { id: 'crm', label: 'CRM', icon: Mail, hint: 'Newsletter e leads' },
      { id: 'access', label: 'Acessos', icon: Shield, hint: 'Roles e convites' },
      { id: 'developer', label: 'Developer', icon: TerminalSquare, hint: 'Diagnósticos' },
      { id: 'settings', label: 'Settings', icon: Settings, hint: 'Branding' },
    ];
    return items.filter((i) => allowedViews.includes(i.id));
  }, [allowedViews, draftPosts.length]);

  const renderOverview = () => (
    <div className="space-y-6">
      <AdminStatsCards />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {allowedViews.includes('content') && (
          <button onClick={handleNewPost} className="group flex flex-col items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/60 p-4 text-center transition-all hover:bg-primary-100 hover:shadow-sm dark:border-primary-800 dark:bg-primary-950/20 dark:hover:bg-primary-900/30">
            <div className="rounded-lg bg-primary-600 p-2 text-white transition-transform group-hover:scale-105"><Plus className="h-4 w-4" /></div>
            <span className="text-xs font-semibold text-foreground">Novo Post</span>
          </button>
        )}
        {allowedViews.includes('builder') && (
          <button onClick={() => setActiveView('builder')} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:bg-muted/60 hover:shadow-sm">
            <div className="rounded-lg bg-secondary-600 p-2 text-white transition-transform group-hover:scale-105"><LayoutTemplate className="h-4 w-4" /></div>
            <span className="text-xs font-semibold text-foreground">Homepage</span>
          </button>
        )}
        {allowedViews.includes('automations') && (
          <button onClick={() => setActiveView('automations')} className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:bg-muted/60 hover:shadow-sm">
            <div className="rounded-lg bg-violet-600 p-2 text-white transition-transform group-hover:scale-105"><Bot className="h-4 w-4" /></div>
            <span className="text-xs font-semibold text-foreground">Automações</span>
          </button>
        )}
        <Link to="/" target="_blank" className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:bg-muted/60 hover:shadow-sm">
          <div className="rounded-lg bg-emerald-600 p-2 text-white transition-transform group-hover:scale-105"><Globe className="h-4 w-4" /></div>
          <span className="text-xs font-semibold text-foreground">Ver Portal</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PostsTable posts={recentPosts} isLoading={postsLoading} onEdit={handleEdit} />

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary-600" />Ecossistema</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Publicados</p>
                <p className="text-xl font-bold text-foreground">{publishedPosts.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Rascunhos</p>
                <p className="text-xl font-bold text-foreground">{draftPosts.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Newsletter</p>
                <p className="text-xl font-bold text-foreground">{newsletterStats?.active || 0}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cursos</p>
                <p className="text-xl font-bold text-foreground">{courses.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Podcasts</p>
                <p className="text-xl font-bold text-foreground">{podcasts.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Categorias</p>
                <p className="text-xl font-bold text-foreground">{categories?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          {postsByCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Posts por categoria</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {postsByCategory.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-primary-200 dark:bg-primary-900">
                        <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.round((count / Math.max(publishedPosts.length, 1)) * 100)}%` }} />
                      </div>
                      <span className="w-5 text-right text-xs font-semibold text-muted-foreground">{count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary-600" />Secções do portal</CardTitle>
              <CardDescription className="text-xs">Onde cada post aparece no portal público</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {PORTAL_SECTIONS.map((s) => (
                <Link key={s.path} to={s.path} target="_blank" className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/60">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.description}</p>
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

  const renderContent = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleNewPost} className="gap-2"><Plus className="h-4 w-4" />Novo post</Button>
        <div className="flex gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary-100 px-2.5 py-1 dark:bg-secondary-900">{publishedPosts.length} publicados</span>
          <span className="rounded-full bg-primary-100 px-2.5 py-1 dark:bg-primary-900">{draftPosts.length} rascunhos</span>
        </div>
      </div>
      {showPostForm && <PostForm post={editingPost} onClose={handleCloseForm} />}
      <PostsTable posts={posts} isLoading={postsLoading} onEdit={handleEdit} />
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview': return renderOverview();
      case 'content': return renderContent();
      case 'builder': return <AdminCmsCustomizer />;
      case 'automations': return <AdminAutomationPanel />;
      case 'courses': return <AdminCoursesManager />;
      case 'crm': return <NewsletterManager />;
      case 'access': return <AdminAccessManager />;
      case 'developer': return <DeveloperControlCenter />;
      case 'settings': return <SiteSettingsManager />;
      default: return null;
    }
  };

  const panelMeta: Record<AdminView, { title: string; description: string }> = {
    overview: { title: 'Cockpit editorial', description: 'Vista central com KPIs, posts recentes e acesso rápido.' },
    content: { title: 'Gestão de conteúdo', description: 'Crie, edite e publique posts. Organize o fluxo editorial.' },
    builder: { title: 'Homepage builder', description: 'Controle banner, secções e ordem visual da homepage.' },
    automations: { title: 'Automações e N8N', description: 'Workflows 24/7, RSS, IA e integrações de produtividade.' },
    courses: { title: 'Cursos e parcerias', description: 'Vitrine comercial com afiliados e links gerenciados.' },
    crm: { title: 'CRM e audiência', description: 'Newsletter, subscritores e relacionamento com leads.' },
    access: { title: 'Acessos e convites', description: 'Roles, permissões e convites de equipa.' },
    developer: { title: 'Console developer', description: 'Diagnósticos de infra, DB e sessão.' },
    settings: { title: 'Identidade visual', description: 'Logo, branding e site settings.' },
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400" />
          <p className="mt-4 text-muted-foreground">A carregar ambiente administrativo...</p>
        </div>
      </div>
    );
  }

  if (!user || !canAccessDashboard) return null;

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-primary transition-colors hover:text-primary-700 dark:hover:text-primary-400"><ArrowLeft className="h-5 w-5" /></Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-600">Vision7 CMS</p>
              <h1 className="text-base font-bold text-foreground sm:text-lg">Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right lg:block">
              <p className="text-sm text-foreground">{user.email}</p>
              <p className="text-[11px] text-muted-foreground">{roles.join(', ')}</p>
            </div>
            {primaryRole && <Badge variant="secondary" className="hidden sm:inline-flex">{primaryRole.replace('_', ' ')}</Badge>}
            <Button onClick={handleNewPost} size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Post</span></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <div className="lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${isActive ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-border bg-background text-foreground hover:bg-muted/70'}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.badge ? <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">{item.badge}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="hidden self-start lg:sticky lg:top-16 lg:block">
          <Card className="overflow-hidden border-primary-200/60 shadow-sm">
            <div className="bg-[#030d1f] px-4 py-3 text-white">
              <p className="text-xs font-semibold">Painel de controlo</p>
              <p className="text-[10px] text-white/60">{navigationItems.length} áreas disponíveis</p>
            </div>
            <CardContent className="space-y-0.5 p-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' : 'text-foreground hover:bg-muted/60'}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{item.hint}</span>
                    </div>
                    {item.badge ? <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{panelMeta[activeView].title}</h2>
              <p className="text-sm text-muted-foreground">{panelMeta[activeView].description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => <Badge key={role} variant="outline" className="text-[10px]">{role.replace('_', ' ')}</Badge>)}
            </div>
          </div>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

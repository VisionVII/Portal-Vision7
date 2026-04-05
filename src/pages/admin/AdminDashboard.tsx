import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Plus,
  Settings,
  Shield,
  TerminalSquare,
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
import { useAuth } from '@/contexts/AuthContext';
import { Post, usePosts } from '@/hooks/usePosts';
import { useCourses } from '@/hooks/useCourses';
import { useNewsletterStats } from '@/hooks/useNewsletter';
import { usePodcasts } from '@/hooks/usePodcasts';

type AdminView = 'overview' | 'content' | 'builder' | 'courses' | 'crm' | 'access' | 'developer' | 'settings';

const VIEW_ACCESS_RULES: Record<AdminView, string[]> = {
  overview: ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'],
  builder: ['super_admin', 'admin', 'editor'],
  content: ['super_admin', 'admin', 'editor', 'redator', 'moderador'],
  courses: ['super_admin', 'admin', 'editor'],
  crm: ['super_admin', 'admin', 'editor', 'analyst'],
  access: ['super_admin', 'admin'],
  developer: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin'],
};

const AdminDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const { user, isAdmin, canAccessDashboard, primaryRole, roles, isLoading: authLoading, signOut } = useAuth();
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: courses = [] } = useCourses(true);
  const { data: podcasts = [] } = usePodcasts(true);
  const { data: newsletterStats } = useNewsletterStats();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !canAccessDashboard)) {
      navigate('/admin/login');
    }
  }, [user, canAccessDashboard, authLoading, navigate]);

  const allowedViews = useMemo(() => {
    if (isAdmin) {
      return (Object.keys(VIEW_ACCESS_RULES) as AdminView[]);
    }

    return (Object.entries(VIEW_ACCESS_RULES) as Array<[AdminView, string[]]>)
      .filter(([, allowedRoles]) => roles.some((role) => allowedRoles.includes(role)))
      .map(([view]) => view);
  }, [isAdmin, roles]);

  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      setActiveView('overview');
    }
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navigationItems = useMemo(() => {
    const items = [
      { id: 'overview', label: 'Visão geral', icon: LayoutDashboard, hint: 'KPIs e atalhos' },
      { id: 'builder', label: 'Homepage builder', icon: LayoutTemplate, hint: 'Admins e editores' },
      { id: 'content', label: 'Conteúdo', icon: FileText, hint: 'Editorial e revisão' },
      { id: 'courses', label: 'Cursos & parcerias', icon: GraduationCap, hint: 'Comercial e afiliados' },
      { id: 'crm', label: 'CRM & audiência', icon: Mail, hint: 'Newsletter e analytics' },
      { id: 'access', label: 'Acessos & convites', icon: Shield, hint: 'Somente admin' },
      { id: 'developer', label: 'Developer', icon: TerminalSquare, hint: 'Infra e diagnósticos' },
      { id: 'settings', label: 'Brand settings', icon: Settings, hint: 'Identidade e branding' },
    ] as Array<{ id: AdminView; label: string; icon: typeof LayoutDashboard; hint: string }>;

    return items.filter((item) => allowedViews.includes(item.id));
  }, [allowedViews]);

  const panelMeta: Record<AdminView, { title: string; description: string }> = {
    overview: {
      title: 'Cockpit editorial e operacional',
      description: 'Vista central do portal com KPIs, quick wins e acesso rápido ao CMS.',
    },
    builder: {
      title: 'Homepage builder estilo Shopify',
      description: 'Controle sessões, banner, posições do texto e ordem das camadas com preview ao vivo e drag-and-drop real.',
    },
    content: {
      title: 'Gestão de conteúdo',
      description: 'Crie, edite e publique os posts e destaques do portal com fluxo editorial organizado.',
    },
    courses: {
      title: 'Cursos, afiliados e parceiros',
      description: 'Monte a vitrine comercial do portal com cartões, links de afiliado e descrições gerenciadas via admin.',
    },
    crm: {
      title: 'CRM e audiência',
      description: 'Centralize a newsletter, subscritores e relacionamento com a audiência.',
    },
    access: {
      title: 'Papéis, convites e escopos',
      description: 'Defina privilégios granulares por área para devs, editores, revisores, moderadores e analistas.',
    },
    developer: {
      title: 'Console do desenvolvedor',
      description: 'Área técnica para leitura de infra, DB, sessão, servidor e observações operacionais.',
    },
    settings: {
      title: 'Identidade visual do portal',
      description: 'Atualize logo, branding e informações principais usadas em header, footer e preview.',
    },
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AdminStatsCards />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {allowedViews.includes('builder') && (
                <Card className="border-primary-200/60 shadow-sm">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-xl bg-primary-50 p-2 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                      <LayoutTemplate className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Homepage builder</p>
                      <p className="mt-1 text-xs text-muted-foreground">Ajuste banners, secções e a hierarquia visual da home.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {allowedViews.includes('content') && (
                <Card className="border-primary-200/60 shadow-sm">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-xl bg-primary-50 p-2 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Fluxo editorial</p>
                      <p className="mt-1 text-xs text-muted-foreground">Crie, revise e publique conteúdo com acesso rápido ao CMS.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="border-primary-200/60 shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-xl bg-primary-50 p-2 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Automações & n8n</p>
                    <p className="mt-1 text-xs text-muted-foreground">Acompanhe workflows, execuções e testes de automação em tempo real.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <PostsTable posts={posts?.slice(0, 6)} isLoading={postsLoading} onEdit={handleEdit} />

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick actions</CardTitle>
                    <CardDescription>
                      Acesso rápido ao builder, ao conteúdo e à área comercial do portal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allowedViews.includes('content') && (
                      <Button
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          setEditingPost(null);
                          setShowPostForm(true);
                          setActiveView('content');
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Novo post
                      </Button>
                    )}
                    {allowedViews.includes('builder') && (
                      <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveView('builder')}>
                        <LayoutTemplate className="h-4 w-4" />
                        Personalizar homepage
                      </Button>
                    )}
                    {allowedViews.includes('courses') && (
                      <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveView('courses')}>
                        <GraduationCap className="h-4 w-4" />
                        Gerir cursos e afiliados
                      </Button>
                    )}
                    <Link to="/admin/automation" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Bot className="h-4 w-4" />
                        Abrir automações n8n
                      </Button>
                    </Link>
                    <Link to="/" target="_blank" className="block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Abrir portal público
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumo do ecossistema</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Posts</p>
                      <p className="text-xl font-bold text-foreground">{posts?.length || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Newsletter</p>
                      <p className="text-xl font-bold text-foreground">{newsletterStats?.total || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Cursos</p>
                      <p className="text-xl font-bold text-foreground">{courses.length}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Podcasts</p>
                      <p className="text-xl font-bold text-foreground">{podcasts.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
      case 'builder':
        return <AdminCmsCustomizer />;
      case 'content':
        return (
          <div className="space-y-6">
            {showPostForm && <PostForm post={editingPost} onClose={handleCloseForm} />}
            <PostsTable posts={posts} isLoading={postsLoading} onEdit={handleEdit} />
          </div>
        );
      case 'courses':
        return <AdminCoursesManager />;
      case 'crm':
        return <NewsletterManager />;
      case 'access':
        return <AdminAccessManager />;
      case 'developer':
        return <DeveloperControlCenter />;
      case 'settings':
        return <SiteSettingsManager />;
      default:
        return null;
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/40 dark:from-neutral-950 dark:via-neutral-950 dark:to-primary-950/20">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-primary transition-colors hover:text-primary-700 dark:hover:text-primary-400">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Vision CMS</p>
              <h1 className="text-xl font-bold text-foreground">Admin Workspace</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">Perfis ativos: {roles.join(', ')}</p>
            </div>
            {primaryRole && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {primaryRole.replace('_', ' ')}
              </Badge>
            )}
            <Button
              onClick={() => {
                setEditingPost(null);
                setShowPostForm(true);
                setActiveView('content');
              }}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo post</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sair" className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <div className="lg:hidden">
          <Card className="overflow-hidden border-primary-200/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Áreas de trabalho</CardTitle>
              <CardDescription>Navegação rápida otimizada para mobile-first.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-4">
              <div className="flex gap-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveView(item.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'border-border bg-background text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="hidden self-start space-y-4 lg:sticky lg:top-24 lg:block">
          <Card className="overflow-hidden border-primary-200/70 shadow-sm">
            <div className="bg-gradient-to-r from-primary-900 via-primary-700 to-secondary-600 px-4 py-4 text-white">
              <p className="text-sm font-semibold">Painel central do portal</p>
              <p className="text-xs text-white/80">Sessões liberadas de acordo com o seu perfil de equipa.</p>
            </div>
            <CardContent className="space-y-2 p-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-900/20 dark:text-primary-300'
                        : 'hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.hint}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="border-primary-200/60 bg-gradient-to-r from-white to-primary-50/70 shadow-sm dark:from-neutral-900 dark:to-primary-950/20">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{panelMeta[activeView].title}</CardTitle>
                  <CardDescription>{panelMeta[activeView].description}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge key={role} variant="outline" className="bg-background/80">
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-0 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Áreas liberadas</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{navigationItems.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Perfis ativos</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{roles.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Posts</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{posts?.length || 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Leads ativos</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{newsletterStats?.active || 0}</p>
              </div>
            </CardContent>
          </Card>

          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

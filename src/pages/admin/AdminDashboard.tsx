import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import DashboardHeader from '@/components/admin/DashboardHeader';
import DashboardSidebar from '@/components/admin/DashboardSidebar';
import type { AdminView } from '@/components/admin/dashboard-types';
import { VIEW_ACCESS_RULES } from '@/components/admin/dashboard-types';
import { useAuth } from '@/contexts/AuthContext';
import { Post, usePosts } from '@/hooks/usePosts';

// Lazy-loaded views
const OverviewView = lazy(() => import('@/components/admin/views/OverviewView'));
const ContentView = lazy(() => import('@/components/admin/views/ContentView'));
const BuilderView = lazy(() => import('@/components/admin/views/BuilderView'));
const AutomationsView = lazy(() => import('@/components/admin/views/AutomationsView'));
const AudiocastsView = lazy(() => import('@/components/admin/views/AudiocastsView'));
const CoursesView = lazy(() => import('@/components/admin/views/CoursesView'));
const CrmView = lazy(() => import('@/components/admin/views/CrmView'));
const AccessView = lazy(() => import('@/components/admin/views/AccessView'));
const DeveloperView = lazy(() => import('@/components/admin/views/DeveloperView'));
const SettingsView = lazy(() => import('@/components/admin/views/SettingsView'));

const PANEL_META: Record<AdminView, { title: string; description: string }> = {
  overview: { title: 'Cockpit editorial', description: 'Vista central com KPIs, posts recentes e acesso rápido.' },
  content: { title: 'Gestão de conteúdo', description: 'Crie, edite e publique posts. Organize o fluxo editorial.' },
  builder: { title: 'Homepage builder', description: 'Controle banner, secções e ordem visual da homepage.' },
  automations: { title: 'Automações e N8N', description: 'Workflows 24/7, RSS, IA e integrações de produtividade.' },
  audiocasts: { title: 'Audiocasts', description: 'Gerir episódios de áudio, upload e categorias.' },
  courses: { title: 'Cursos e parcerias', description: 'Vitrine comercial com afiliados e links gerenciados.' },
  crm: { title: 'CRM e audiência', description: 'Newsletter, subscritores e relacionamento com leads.' },
  access: { title: 'Acessos e convites', description: 'Roles, permissões e convites de equipa.' },
  developer: { title: 'Console developer', description: 'Diagnósticos de infra, DB e sessão.' },
  settings: { title: 'Identidade visual', description: 'Logo, branding e site settings.' },
};

const ViewSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
    ))}
  </div>
);

const AdminDashboard = () => {
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const { user, isAdmin, canAccessDashboard, roles, isLoading: authLoading, isAccessReady } = useAuth();
  const { data: posts } = usePosts(true);
  const navigate = useNavigate();

  const draftCount = useMemo(() => posts?.filter((p) => p.status === 'draft').length ?? 0, [posts]);

  useEffect(() => {
    if (!authLoading && isAccessReady && (!user || !canAccessDashboard)) {
      navigate('/admin/login');
    }
  }, [user, canAccessDashboard, authLoading, isAccessReady, navigate]);

  const allowedViews = useMemo(() => {
    if (isAdmin) return Object.keys(VIEW_ACCESS_RULES) as AdminView[];
    return (Object.entries(VIEW_ACCESS_RULES) as Array<[AdminView, string[]]>)
      .filter(([, allowed]) => roles.some((r) => allowed.includes(r)))
      .map(([view]) => view);
  }, [isAdmin, roles]);

  useEffect(() => {
    if (!allowedViews.includes(activeView)) setActiveView('overview');
  }, [activeView, allowedViews]);

  const handleEdit = useCallback((post: Post) => {
    setEditingPost(post);
    setShowPostForm(true);
    setActiveView('content');
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowPostForm(false);
    setEditingPost(null);
  }, []);

  const handleNewPost = useCallback(() => {
    setEditingPost(null);
    setShowPostForm(true);
    setActiveView('content');
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewView onNewPost={handleNewPost} onNavigate={setActiveView} onEdit={handleEdit} allowedViews={allowedViews} />;
      case 'content':
        return <ContentView editingPost={editingPost} showPostForm={showPostForm} onNewPost={handleNewPost} onEdit={handleEdit} onCloseForm={handleCloseForm} />;
      case 'builder': return <BuilderView />;
      case 'automations': return <AutomationsView />;
      case 'audiocasts': return <AudiocastsView />;
      case 'courses': return <CoursesView />;
      case 'crm': return <CrmView />;
      case 'access': return <AccessView />;
      case 'developer': return <DeveloperView />;
      case 'settings': return <SettingsView />;
      default: return null;
    }
  };

  if (authLoading || !isAccessReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user || !canAccessDashboard) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <DashboardHeader onNewPost={handleNewPost} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <DashboardSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          allowedViews={allowedViews}
          draftCount={draftCount}
        />

        <main className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{PANEL_META[activeView].title}</h2>
              <p className="text-sm text-muted-foreground">{PANEL_META[activeView].description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <Badge key={role} variant="outline" className="text-[10px]">
                  {role.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <Suspense fallback={<ViewSkeleton />}>
            {renderActiveView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/admin/DashboardHeader';
import DashboardSidebar from '@/components/admin/DashboardSidebar';
import type { AdminView } from '@/components/admin/dashboard-types';
import { VIEW_ACCESS_RULES } from '@/components/admin/dashboard-types';
import { useAuth } from '@/contexts/AuthContext';
import { Post, usePosts } from '@/hooks/usePosts';
import { MFAChallenge } from '@/components/admin/MFAChallenge';

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
const MediaGalleryView = lazy(() => import('@/components/admin/views/MediaGalleryView'));
const AnalyticsView = lazy(() => import('@/components/admin/views/AnalyticsView'));

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    return saved === 'true';
  });
  
  const { user, isAdmin, canAccessDashboard, roles, isLoading: authLoading, isAccessReady, mfaRequired, mfaFactorId, completeMfaChallenge } = useAuth();
  const { data: posts } = usePosts(true);
  const navigate = useNavigate();

  const draftCount = useMemo(() => posts?.filter((p) => p.status === 'draft').length ?? 0, [posts]);

  // Toggle sidebar and persist to localStorage
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(newValue));
      return newValue;
    });
  }, []);

  // Only redirect ONCE after the initial auth check resolves.
  // Subsequent auth state changes (token refresh, etc.) should not cause navigation.
  const hasCheckedAccessRef = React.useRef(false);

  useEffect(() => {
    if (authLoading || !isAccessReady) return; // still loading
    if (hasCheckedAccessRef.current) return;   // already checked once
    hasCheckedAccessRef.current = true;
    if (!user || !canAccessDashboard) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Helper: wrap lazy view in a div that hides when not active (keeps state mounted)
  const Panel = useCallback(
    ({ view, children }: { view: AdminView; children: React.ReactNode }) => {
      if (activeView !== view) return null;
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out fill-mode-both">
          {children}
        </div>
      );
    },
    [activeView],
  );

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

  // MFA challenge gate — admin with enrolled MFA must verify before accessing dashboard
  if (mfaRequired && mfaFactorId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <MFAChallenge
          factorId={mfaFactorId}
          onVerified={completeMfaChallenge}
          onCancel={() => void 0}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onNewPost={handleNewPost} />

      {/* Mobile nav — full width, no padding issues */}
      <div className="px-3 pt-3 sm:px-4 lg:hidden">
        <DashboardSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          allowedViews={allowedViews}
          draftCount={draftCount}
        />
      </div>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Desktop sidebar — fixed left column */}
        <div className={`hidden shrink-0 border-r border-border/40 bg-sidebar/80 backdrop-blur-sm lg:block dark:border-border/20 transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-60 xl:w-72'
        }`}>
          <div className="sticky top-14 p-3 xl:p-4">
            <DashboardSidebar
              activeView={activeView}
              onViewChange={setActiveView}
              allowedViews={allowedViews}
              draftCount={draftCount}
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
            />
          </div>
        </div>

        {/* Main content — grows to fill remaining width */}
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="px-3 py-5 sm:px-5 sm:py-6 lg:px-6 xl:px-8">

            <Suspense fallback={<ViewSkeleton />}>
              <Panel view="overview">
                <OverviewView onNewPost={handleNewPost} onNavigate={setActiveView} onEdit={handleEdit} allowedViews={allowedViews} />
              </Panel>
              <Panel view="content">
                <ContentView editingPost={editingPost} showPostForm={showPostForm} onNewPost={handleNewPost} onEdit={handleEdit} onCloseForm={handleCloseForm} />
              </Panel>
              <Panel view="builder"><BuilderView /></Panel>
              <Panel view="media"><MediaGalleryView /></Panel>
              <Panel view="automations"><AutomationsView isActive={activeView === 'automations'} /></Panel>
              <Panel view="audiocasts"><AudiocastsView /></Panel>
              <Panel view="courses"><CoursesView /></Panel>
              <Panel view="crm"><CrmView /></Panel>
              <Panel view="analytics"><AnalyticsView /></Panel>
              <Panel view="access"><AccessView /></Panel>
              <Panel view="developer"><DeveloperView /></Panel>
              <Panel view="settings"><SettingsView /></Panel>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

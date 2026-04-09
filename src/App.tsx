import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import MiniPlayer from "@/components/media/MiniPlayerV2";
import DynamicFavicon from "@/components/system/DynamicFavicon";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ScrollToTop from "@/components/system/ScrollToTop";
import ThemeProvider from "@/components/system/ThemeProvider";
import CookieBanner from "@/components/system/CookieBanner";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import PageTransition from "@/components/system/PageTransition";
import NetworkStatusNotifier from "@/components/system/NetworkStatusNotifier";

const Index = lazy(() => import("@/pages/site/Index"));
const Tecnologia = lazy(() => import("@/pages/site/Tecnologia"));
const Desporto = lazy(() => import("@/pages/site/Desporto"));
const Musica = lazy(() => import("@/pages/site/Musica"));
const Saude = lazy(() => import("@/pages/site/Saude"));
const Mundo = lazy(() => import("@/pages/site/Mundo"));
const Post = lazy(() => import("@/pages/site/Post"));
const Audiocast = lazy(() => import("@/pages/site/Audiocast"));
const Audiocasts = lazy(() => import("@/pages/site/Audiocasts"));
const Course = lazy(() => import("@/pages/site/Course"));
const PrivacyPolicy = lazy(() => import("@/pages/site/PrivacyPolicy"));
const NotFound = lazy(() => import("@/pages/site/NotFound"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminAutomationLab = lazy(() => import("@/pages/admin/AdminAutomationLab"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const UserLogin = lazy(() => import("@/pages/admin/UserLogin"));

const PublicPrivacyControls = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return <CookieBanner />;
};

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">A carregar...</p>
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/tecnologia" element={<PageTransition><Tecnologia /></PageTransition>} />
        <Route path="/desporto" element={<PageTransition><Desporto /></PageTransition>} />
        <Route path="/musica" element={<PageTransition><Musica /></PageTransition>} />
        <Route path="/saude" element={<PageTransition><Saude /></PageTransition>} />
        <Route path="/mundo" element={<PageTransition><Mundo /></PageTransition>} />
        <Route path="/audiocasts" element={<PageTransition><Audiocasts /></PageTransition>} />
        <Route path="/audiocast/:id" element={<PageTransition><Audiocast /></PageTransition>} />
        <Route path="/post/:slug" element={<PageTransition><Post /></PageTransition>} />
        <Route path="/curso/:slug" element={<PageTransition><Course /></PageTransition>} />
        <Route path="/politica-privacidade" element={<PageTransition><PrivacyPolicy /></PageTransition>} />

        {/* ── Auth routes ── */}
        <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/acesso/equipa" element={<PageTransition><UserLogin /></PageTransition>} />

        {/* ── Legacy redirects ── */}
        <Route path="/podcasts" element={<Navigate to="/audiocasts" replace />} />
        <Route path="/podcast/:id" element={<Navigate to="/audiocasts" replace />} />
        <Route path="/validar/entrada/tipodeuser" element={<Navigate to="/admin/login" replace />} />
        <Route path="/acesso/admin/controlado" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/register" element={<Navigate to="/admin/login" replace />} />
        <Route path="/acesso/convidado" element={<Navigate to="/acesso/equipa" replace />} />

        {/* ── Protected admin routes ── */}
        <Route
          path="/admin/dashboard"
          element={(
            <PageTransition>
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            </PageTransition>
          )}
        />
        <Route
          path="/admin/automation-lab"
          element={(
            <PageTransition>
              <ProtectedRoute>
                <AdminAutomationLab />
              </ProtectedRoute>
            </PageTransition>
          )}
        />
        <Route path="/admin/laboratorio-automacao" element={<Navigate to="/admin/automation-lab" replace />} />
        <Route path="/admin/automacao-legacy" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/automation" element={<Navigate to="/admin/dashboard" replace />} />
        
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        if (failureCount >= 3) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'online',
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <DynamicFavicon />
          <Toaster />
          <Sonner />
          <AudioPlayerProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <ScrollToTop />
              <NetworkStatusNotifier />
              <Suspense fallback={<RouteFallback />}>
                <AnimatedRoutes />
              </Suspense>
              <MiniPlayer />
              <PublicPrivacyControls />
            </BrowserRouter>
          </ErrorBoundary>
          </AudioPlayerProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

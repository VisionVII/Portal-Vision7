import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import MiniPlayer from "@/components/media/MiniPlayer";
import DynamicFavicon from "@/components/system/DynamicFavicon";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ScrollToTop from "@/components/system/ScrollToTop";
import ThemeProvider from "@/components/system/ThemeProvider";
import Index from "@/pages/site/Index";
import Tecnologia from "@/pages/site/Tecnologia";
import Desporto from "@/pages/site/Desporto";
import Musica from "@/pages/site/Musica";
import Saude from "@/pages/site/Saude";
import Mundo from "@/pages/site/Mundo";
import Post from "@/pages/site/Post";
import Audiocast from "@/pages/site/Audiocast";
import NotFound from "@/pages/site/NotFound";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAutomationLab from "@/pages/admin/AdminAutomationLab";
import AdminLogin from "@/pages/admin/AdminLogin";
import UserLogin from "@/pages/admin/UserLogin";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import PrivacyPolicy from "@/pages/site/PrivacyPolicy";
import Course from "@/pages/site/Course";
import Audiocasts from "@/pages/site/Audiocasts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        return failureCount < 2;
      },
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
              <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/tecnologia" element={<Tecnologia />} />
            <Route path="/desporto" element={<Desporto />} />
            <Route path="/musica" element={<Musica />} />
            <Route path="/saude" element={<Saude />} />
            <Route path="/mundo" element={<Mundo />} />
            <Route path="/audiocasts" element={<Audiocasts />} />
            <Route path="/audiocast/:id" element={<Audiocast />} />
            <Route path="/post/:slug" element={<Post />} />
            <Route path="/curso/:slug" element={<Course />} />
            <Route path="/politica-privacidade" element={<PrivacyPolicy />} />

            {/* ── Auth routes ── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/acesso/equipa" element={<UserLogin />} />

            {/* ── Legacy redirects ── */}
            <Route path="/podcasts" element={<Navigate to="/audiocasts" replace />} />
            <Route path="/podcast/:id" element={<Navigate to="/audiocasts" replace />} />
            <Route path="/validar/entrada/tipodeuser" element={<Navigate to="/admin/login" replace />} />
            <Route path="/acesso/admin/controlado" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/register" element={<Navigate to="/admin/login" replace />} />
            <Route path="/acesso/convidado" element={<Navigate to="/acesso/equipa" replace />} />

            {/* ── Protected admin routes ── */}
            <Route
              path="/admin/dashboard"
              element={(
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/automation-lab"
              element={(
                <ProtectedRoute>
                  <AdminAutomationLab />
                </ProtectedRoute>
              )}
            />
            <Route path="/admin/automation" element={<Navigate to="/admin/dashboard" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
              <MiniPlayer />
            </BrowserRouter>
          </ErrorBoundary>
          </AudioPlayerProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DynamicFavicon from "@/components/system/DynamicFavicon";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ScrollToTop from "@/components/system/ScrollToTop";
import Index from "@/pages/site/Index";
import Tecnologia from "@/pages/site/Tecnologia";
import Desporto from "@/pages/site/Desporto";
import Musica from "@/pages/site/Musica";
import Saude from "@/pages/site/Saude";
import Mundo from "@/pages/site/Mundo";
import Post from "@/pages/site/Post";
import Podcast from "@/pages/site/Podcast";
import NotFound from "@/pages/site/NotFound";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminRegister from "@/pages/admin/AdminRegister";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminAccessControlled from "@/pages/admin/AdminAccessControlled";
import ProtectedRoute from "@/components/system/ProtectedRoute";
import PrivacyPolicy from "@/pages/site/PrivacyPolicy";
import Course from "@/pages/site/Course";
import Podcasts from "@/pages/site/Podcasts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <DynamicFavicon />
        <Toaster />
        <Sonner />
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
            <Route path="/podcasts" element={<Podcasts />} />
            <Route path="/podcast/:id" element={<Podcast />} />
            <Route path="/post/:slug" element={<Post />} />
            <Route path="/curso/:slug" element={<Course />} />
            <Route path="/politica-privacidade" element={<PrivacyPolicy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route
              path="/admin/dashboard"
              element={(
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="/admin/automation" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/acesso/admin/controlado" element={<AdminAccessControlled />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

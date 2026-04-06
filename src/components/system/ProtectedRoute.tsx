import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireDashboardAccess?: boolean;
}

const ProtectedRoute = ({ children, requireDashboardAccess = true }: ProtectedRouteProps) => {
  const { user, isLoading, isAccessReady, canAccessDashboard } = useAuth();

  if (isLoading || !isAccessReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400" />
          <p className="mt-3 text-sm text-muted-foreground">A validar sessão…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireDashboardAccess && !canAccessDashboard) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

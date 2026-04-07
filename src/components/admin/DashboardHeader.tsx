import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  onNewPost: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNewPost }) => {
  const { user, primaryRole, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-gradient-to-r from-background via-background to-primary-50/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:from-background dark:via-background dark:to-primary-950/20">
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary-600 dark:text-primary-400">
              Vision7
            </p>
            <h1 className="text-sm font-bold text-foreground sm:text-base">Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right lg:block">
            <p className="text-xs text-foreground">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">{roles.join(', ')}</p>
          </div>
          <div className="hidden text-right sm:block lg:hidden">
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>

          {primaryRole && (
            <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
              {primaryRole.replace('_', ' ')}
            </Badge>
          )}

          <Button onClick={onNewPost} size="sm" className="gap-1.5 rounded-lg">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Post</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            title="Sair"
            className="rounded-lg text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

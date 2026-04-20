import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, LogOut, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAdminNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/useAdminNotifications';

interface DashboardHeaderProps {
  onNewPost: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNewPost }) => {
  const { user, primaryRole, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: siteSettings } = useSiteSettings();
  const logoUrl = siteSettings?.logo_url || null;
  const { data: notifications, unreadCount } = useAdminNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [bellOpen, setBellOpen] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);

  // Play a soft ping when new unread notifications arrive
  useEffect(() => {
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    // Skip on first render (prev is null) — only play on actual increase
    if (prev === null || unreadCount <= prev) return;

    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);          // A5
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext not available (e.g. SSR or browser policy) — silent fail
    }
  }, [unreadCount]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: Back + Logo */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </Link>
          
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Vision7" 
              width={400} 
              height={267} 
              className="h-9 w-auto object-contain sm:h-10" 
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Vision<span className="text-primary">7</span>
              </span>
              <Badge 
                variant="outline" 
                className="hidden border-primary/20 bg-primary/5 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-primary sm:inline-flex"
              >
                CMS
              </Badge>
            </div>
          )}
        </div>

        {/* Right: User info + Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User info - Desktop */}
          <div className="hidden items-center gap-3 lg:flex">
            <div className="text-right">
              <p className="max-w-[200px] truncate text-sm font-medium text-foreground">
                {user?.email}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {roles.join(' • ')}
              </p>
            </div>
          </div>

          {/* User email - Tablet */}
          <div className="hidden text-right sm:block lg:hidden">
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>

          {/* Role badge */}
          {primaryRole && (
            <Badge 
              variant="secondary" 
              className="border border-secondary/20 bg-secondary/10 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground dark:text-secondary-600"
            >
              {primaryRole.replace('_', ' ')}
            </Badge>
          )}

          {/* Notifications */}
          <Popover open={bellOpen} onOpenChange={setBellOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative h-9 w-9 rounded-xl border border-transparent text-muted-foreground transition-all duration-200 hover:border-border/40 hover:bg-muted/50 hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-amber-500/25 ring-2 ring-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              className="w-80 overflow-hidden rounded-2xl border-border/40 p-0 shadow-2xl" 
              sideOffset={12}
            >
              <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Notificações</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px] text-muted-foreground hover:text-primary"
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> 
                    Marcar todas lidas
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!notifications?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 rounded-2xl bg-muted/50 p-3">
                      <Bell className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Sem notificações</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Voltaremos quando houver novidades</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {notifications.map((n) => {
                      const typeColor =
                        n.type === 'error' ? 'bg-red-500' :
                        n.type === 'warning' ? 'bg-amber-500' :
                        n.type === 'success' ? 'bg-emerald-500' : 'bg-primary';
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-muted/40 ${
                            !n.read ? 'bg-primary/3' : ''
                          }`}
                          onClick={() => {
                            if (!n.read) markRead.mutate(n.id);
                            if (n.link) { setBellOpen(false); }
                          }}
                        >
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeColor} shadow-sm`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            <p className="mt-2 text-[10px] font-medium text-muted-foreground/50">
                              {new Date(n.created_at).toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* New Post Button */}
          <Button 
            onClick={onNewPost} 
            size="sm" 
            className="h-9 gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-600 px-4 font-semibold shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Post</span>
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            title="Sair"
            className="h-9 w-9 rounded-xl border border-transparent text-muted-foreground transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

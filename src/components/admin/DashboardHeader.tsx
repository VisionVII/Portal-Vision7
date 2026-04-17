import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, LogOut, Plus } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-border/40 bg-gradient-to-r from-background via-background to-primary-50/30 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 dark:from-background dark:via-background dark:to-primary-950/20">
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" width={400} height={267} className="h-11 w-auto object-contain sm:h-14" />
          ) : (
            <span className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl">Vision7</span>
          )}
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
            <Badge variant="secondary" className="text-[10px]">
              {primaryRole.replace('_', ' ')}
            </Badge>
          )}

          <Popover open={bellOpen} onOpenChange={setBellOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative rounded-lg text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">Notificações</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="h-3 w-3" /> Marcar todas lidas
                  </Button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {!notifications?.length ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Sem notificações</p>
                ) : (
                  notifications.map((n) => {
                    const typeColor =
                      n.type === 'error' ? 'bg-destructive' :
                      n.type === 'warning' ? 'bg-amber-500' :
                      n.type === 'success' ? 'bg-primary' : 'bg-blue-500';
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                          !n.read ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          if (!n.read) markRead.mutate(n.id);
                          if (n.link) { setBellOpen(false); }
                        }}
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${typeColor}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                          )}
                          <p className="mt-1 text-[10px] text-muted-foreground/60">
                            {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

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

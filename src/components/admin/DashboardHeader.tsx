import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, Globe, LogOut, Menu, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useAdminNotifications, useMarkNotificationRead, useMarkAllRead } from '@/hooks/useAdminNotifications';

interface DashboardHeaderProps {
  onNewPost: () => void;
  onMenuOpen?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  redator: 'Redator',
  moderador: 'Moderador',
  analyst: 'Analyst',
};

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onNewPost, onMenuOpen }) => {
  const { user, primaryRole, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: siteSettings } = useSiteSettings();
  const logoUrl = siteSettings?.logo_url ?? null;
  const { data: notifications, unreadCount } = useAdminNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevUnreadRef.current;
    prevUnreadRef.current = unreadCount;
    if (prev === null || unreadCount <= prev) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
      osc.onended = () => ctx.close();
    } catch { /* silent fail */ }
  }, [unreadCount]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD';
  const roleLabel = primaryRole ? (ROLE_LABEL[primaryRole] ?? primaryRole) : '';

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5">

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2">
          {onMenuOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuOpen}
              className="lg:hidden h-8 w-8 text-muted-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-7 w-auto object-contain sm:h-8" />
          ) : (
            <Link to="/" className="font-headline text-base font-bold tracking-tight text-foreground sm:text-lg">
              Vision7
            </Link>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">

          {/* New post */}
          <Button onClick={onNewPost} size="sm" className="h-8 gap-1.5 px-3">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Novo post</span>
          </Button>

          {/* Notifications */}
          <Popover open={bellOpen} onOpenChange={setBellOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(22rem,_calc(100vw-1rem))] p-0" sideOffset={8}>
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-sm font-semibold">Notificações</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="h-3 w-3" /> Marcar lidas
                  </Button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {!notifications?.length ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Sem notificações</p>
                ) : (
                  notifications.map((n) => {
                    const dot =
                      n.type === 'error' ? 'bg-destructive' :
                      n.type === 'warning' ? 'bg-amber-500' :
                      n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500';
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${!n.read ? 'bg-primary/5' : ''}`}
                        onClick={() => { if (!n.read) markRead.mutate(n.id); setBellOpen(false); }}
                      >
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{n.title}</p>
                          {n.message && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.message}</p>}
                          <p className="mt-1 text-[10px] text-muted-foreground/60">
                            {new Date(n.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <Popover open={userOpen} onOpenChange={setUserOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {initials}
                </div>
                <ChevronDown className="hidden h-3 w-3 sm:block" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2" sideOffset={8}>
              <div className="mb-2 border-b pb-2">
                <p className="truncate text-xs font-semibold text-foreground">{user?.email}</p>
                {roleLabel && <p className="mt-0.5 text-[11px] text-muted-foreground">{roleLabel}</p>}
              </div>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> Abrir portal
              </a>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Terminar sessão
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

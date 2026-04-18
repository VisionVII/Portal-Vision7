import React, { Suspense, useMemo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CalendarDays, Clock3, CloudSnow, Flame, MapPin, Menu, Sun, Thermometer, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSkyInfo } from '@/hooks/useSkyInfo';
import BrandLogo from '@/components/system/BrandLogo';
const PortalAIAssistantButton = React.lazy(() => import('@/components/system/PortalAIAssistantButton'));
const CalendarPopover = React.lazy(() => import('@/components/system/CalendarPopover'));
import ThemeToggle from '@/components/system/ThemeToggle';

const fallbackCategories = [
  { name: 'Tecnologia', path: '/tecnologia' },
  { name: 'Desporto', path: '/desporto' },
  { name: 'Música', path: '/musica' },
  { name: 'Saúde', path: '/saude' },
  { name: 'Mundo', path: '/mundo' },
];

/* ------------------------------------------------------------------ */
/*  Temperature-coloured icon                                          */
/* ------------------------------------------------------------------ */
const TemperatureIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = '' }) => {
  switch (icon) {
    case 'freezing':
      return <CloudSnow className={className} />;
    case 'cold':
      return <Wind className={className} />;
    case 'hot':
    case 'extreme':
      return <Flame className={className} />;
    default:
      return <Thermometer className={className} />;
  }
};

/* ------------------------------------------------------------------ */
/*  Day/night sky icon                                                 */
/* ------------------------------------------------------------------ */
const SkyIcon: React.FC<{ isDaytime: boolean; moonEmoji: string; className?: string }> = ({
  isDaytime,
  moonEmoji,
  className = '',
}) => {
  if (isDaytime) return <Sun className={`${className} text-white/80 dark:text-primary`} />;
  return <span className={className} aria-label="moon">{moonEmoji}</span>;
};

const Header = () => {
  const { data: dbCategories } = useCategories();
  const { data: siteSettings } = useSiteSettings();
  const { region, timezone, localTime, temperatureC, hasConsent, isLoading: locationLoading } = useUserLocation();
  const skyInfo = useSkyInfo(temperatureC, localTime);

  const navigationCategories = useMemo(
    () =>
      dbCategories?.length
        ? dbCategories.map((category) => ({
            name: category.name,
            path: `/${category.slug}`,
          }))
        : fallbackCategories,
    [dbCategories]
  );

  const primaryNavItems = useMemo(
    () => [
      { name: 'Início', path: '/' },
      { name: 'Audiocasts', path: '/audiocasts' },
      ...navigationCategories,
    ],
    [navigationCategories]
  );

  const localDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: timezone || undefined,
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    }
  }, [timezone]);

  const locationLabel = hasConsent ? (region || timezone || 'Localização ativa') : 'Ative a localização';
  const temperatureLabel = hasConsent
    ? (temperatureC !== null ? `${temperatureC}°C` : locationLoading ? 'A carregar...' : 'Sem dado')
    : (locationLoading ? 'A carregar...' : 'Ative a localização');

  const mobileCategoryItems = primaryNavItems.slice(2);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/98 backdrop-blur-md supports-[backdrop-filter]:bg-background/95">
      {/* Top brand bar — professional clean design */}
      <div className="border-b border-border/30 bg-background">
        <div className="container mx-auto flex min-h-[72px] items-center justify-between gap-3 px-4 py-2.5 sm:min-h-[76px] sm:px-5 sm:py-3">
          <Link to="/" className="flex shrink-0 items-center py-0.5 transition-opacity hover:opacity-80">
            <BrandLogo siteName={siteSettings?.site_name} logoUrl={siteSettings?.logo_url} showTagline={false} />
          </Link>

          <div className="hidden shrink-0 items-center py-0.5 md:flex">
            <Suspense fallback={null}>
              <PortalAIAssistantButton />
            </Suspense>
          </div>

          <div className="flex shrink-0 items-center gap-2 py-0.5 md:hidden">
            <Suspense fallback={null}>
              <PortalAIAssistantButton compact />
            </Suspense>
          </div>
        </div>
      </div>

      <nav className="bg-primary dark:bg-background/98">
        <div className="container mx-auto px-4 sm:px-5">
          {/* ═══════════ DESKTOP NAV ═══════════ */}
          <div className="hidden min-h-[58px] items-center gap-6 py-2.5 md:flex">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {primaryNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold tracking-tight transition-all ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-primary dark:text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white dark:text-foreground/60 dark:hover:bg-primary/15 dark:hover:text-primary'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* ─── Context toolbar (desktop) - professional minimal ─── */}
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              {/* Calendar (opens popup) */}
              <Suspense fallback={<span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 dark:border-border/50 dark:bg-muted/30 dark:text-foreground/80">{localDateLabel}</span>}>
                <CalendarPopover
                  localDateLabel={localDateLabel}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white dark:border-border/50 dark:bg-muted/30 dark:text-foreground/80 dark:hover:border-primary/40 dark:hover:bg-muted/50 dark:hover:text-foreground"
                />
              </Suspense>

              {/* Clock */}
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 dark:border-border/50 dark:bg-muted/30 dark:text-foreground/80">
                <Clock3 className="h-3.5 w-3.5 text-white/80 dark:text-primary" />
                {localTime}
              </span>

              {/* Temperature */}
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 dark:border-border/50 dark:bg-muted/30 dark:text-foreground/80">
                <TemperatureIcon icon={skyInfo.temperatureIcon} className="h-3.5 w-3.5" />
                {temperatureLabel}
              </span>

              <div className="mx-2 h-6 w-px bg-white/20 dark:bg-border/50" />

              <ThemeToggle compact />
            </div>
          </div>

          {/* ═══════════ MOBILE NAV ═══════════ */}
          <div className="flex min-h-[56px] items-center gap-1.5 py-2 md:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {primaryNavItems.slice(1, 4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold tracking-tight transition-all ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-primary dark:text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white dark:text-foreground/60 dark:hover:bg-primary/15 dark:hover:text-primary'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-white/20 bg-white/10 text-white shadow-sm hover:bg-white/20 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[80vw] max-w-sm flex-col border-l border-border bg-background px-4">
                <SheetHeader className="shrink-0 border-b border-border pb-3 text-left">
                  <SheetTitle className="sr-only">Menu Vision</SheetTitle>
                  <BrandLogo siteName={siteSettings?.site_name} logoUrl={siteSettings?.logo_url} compact showTagline={false} className="items-start" />
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-3 overflow-hidden pt-3">
                  <ThemeToggle className="shrink-0" />

                  {/* ─── Context info - professional minimal ─── */}
                  <div className="shrink-0 space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Date — opens calendar */}
                      <Suspense fallback={<span className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-foreground/80">{localDateLabel}</span>}>
                        <CalendarPopover
                          localDateLabel={localDateLabel}
                          className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-foreground/80 hover:border-primary/40 hover:bg-muted/50"
                        />
                      </Suspense>

                      {/* Clock */}
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate font-medium text-foreground/80">{localTime}</span>
                      </div>

                      {/* Temperature */}
                      <div className={`flex items-center gap-2 rounded-lg border border-border/50 px-2.5 py-2 ${skyInfo.temperatureBg}`}>
                        <TemperatureIcon icon={skyInfo.temperatureIcon} className={`h-3.5 w-3.5 shrink-0 ${skyInfo.temperatureColor}`} />
                        <span className={`truncate font-semibold ${skyInfo.temperatureColor}`}>{temperatureLabel}</span>
                      </div>

                      {/* Day/Night */}
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2">
                        <SkyIcon isDaytime={skyInfo.isDaytime} moonEmoji={skyInfo.moonEmoji} className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-medium text-foreground/80">
                          {skyInfo.isDaytime ? 'Dia' : skyInfo.moonPhaseName}
                        </span>
                      </div>

                      {/* Location — full width */}
                      <div className="col-span-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate font-medium text-primary">{locationLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* ─── Categories grid ─── */}
                  <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
                    <p className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-foreground/50">Categorias</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mobileCategoryItems.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              `flex min-h-[44px] items-center justify-start rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold tracking-tight transition-all ${
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted/30 text-foreground/70 hover:bg-muted/60 hover:text-foreground'
                              }`
                            }
                          >
                            {item.name}
                          </NavLink>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CalendarDays, Clock3, CloudSnow, Flame, MapPin, Menu, Moon, Sun, Thermometer, Wind } from 'lucide-react';
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
import { useTheme } from '@/hooks/useTheme';
import { useSkyInfo } from '@/hooks/useSkyInfo';
import BrandLogo from '@/components/system/BrandLogo';
import PortalAIAssistantButton from '@/components/system/PortalAIAssistantButton';
import CalendarPopover from '@/components/system/CalendarPopover';

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
  if (isDaytime) return <Sun className={`${className} text-amber-500`} />;
  return <span className={className} aria-label="moon">{moonEmoji}</span>;
};

const Header = () => {
  const { data: dbCategories } = useCategories();
  const { data: siteSettings } = useSiteSettings();
  const { region, timezone, localTime, temperatureC, hasConsent, isLoading: locationLoading } = useUserLocation();
  const { theme, toggleTheme } = useTheme();
  const skyInfo = useSkyInfo(temperatureC, localTime);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hideTopBar, setHideTopBar] = useState(false);
  const stateRef = useRef({ isScrolled: false, hideTopBar: false, ticking: false });

  useEffect(() => {
    const handleScroll = () => {
      if (stateRef.current.ticking) return;
      stateRef.current.ticking = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const s = stateRef.current;

        const nextScrolled = y > 10;
        // Hysteresis: hide at 100px, show back at 20px — prevents oscillation loop
        const nextHide = s.hideTopBar ? y > 20 : y > 100;

        if (nextScrolled !== s.isScrolled) {
          s.isScrolled = nextScrolled;
          setIsScrolled(nextScrolled);
        }
        if (nextHide !== s.hideTopBar) {
          s.hideTopBar = nextHide;
          setHideTopBar(nextHide);
        }

        s.ticking = false;
      });
    };

    const rafId = requestAnimationFrame(() => handleScroll());
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
      { name: 'Podcasts', path: '/podcasts' },
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
  const temperatureLabel = hasConsent && temperatureC !== null ? `${temperatureC}°C` : locationLoading ? 'A carregar...' : 'Ative a localização';

  const mobileQuickNavItems = primaryNavItems.slice(0, 2);
  const mobileCategoryItems = primaryNavItems.slice(2);

  return (
    <header className="sticky top-0 z-50 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      {/* Top brand bar — always rendered but hidden visually when scrolled down.
          Uses overflow:hidden + max-height with a fixed ceiling so it never triggers layout reflow loops. */}
      <div
        className="overflow-hidden border-b border-primary-500/20 bg-gradient-to-r from-[#020817] via-[#04173a] to-[#071d49]"
        style={{
          maxHeight: hideTopBar ? 0 : 80,
          opacity: hideTopBar ? 0 : 1,
          transition: 'max-height 0.25s ease-out, opacity 0.2s ease-out',
          willChange: 'max-height',
        }}
      >
        <div className={`container mx-auto flex items-center justify-between gap-4 px-4 transition-[padding] duration-200 ${isScrolled ? 'py-2.5 sm:py-3' : 'py-3 sm:py-3.5'}`}>
          <Link to="/" className="flex-shrink-0 transition-opacity hover:opacity-95">
            <BrandLogo siteName={siteSettings?.site_name} showTagline={false} />
          </Link>

          <div className="hidden items-center md:flex">
            <PortalAIAssistantButton />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <PortalAIAssistantButton compact />
          </div>
        </div>
      </div>

      <nav
        className={`border-t border-slate-200/80 bg-white/95 text-slate-800 backdrop-blur transition-shadow duration-200 supports-[backdrop-filter]:bg-white/90 dark:border-white/10 dark:bg-[#03112d]/95 dark:text-white ${
          isScrolled ? 'shadow-[0_16px_36px_rgba(5,12,32,0.14)]' : 'shadow-[0_10px_30px_rgba(5,12,32,0.08)]'
        }`}
      >
        <div className="container mx-auto px-3 sm:px-4">
          {/* ═══════════ DESKTOP NAV ═══════════ */}
          <div className={`hidden items-center gap-3 md:flex ${isScrolled ? 'py-1.5' : 'py-2.5'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {primaryNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-primary-700 dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-secondary-200'
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* ─── Context toolbar (desktop) ─── */}
            <div className="hidden shrink-0 items-center gap-1.5 rounded-[20px] border border-slate-200 bg-slate-50/90 px-2.5 py-1.5 shadow-sm lg:flex dark:border-white/10 dark:bg-white/5">
              {/* Calendar (opens popup) */}
              <CalendarPopover
                localDateLabel={localDateLabel}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              />

              {/* Clock */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <Clock3 className="h-3.5 w-3.5 text-primary-600" />
                {localTime}
              </span>

              {/* Location */}
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 xl:inline-flex dark:bg-white/10 dark:text-slate-200">
                <MapPin className="h-3.5 w-3.5 text-primary-600" />
                {locationLabel}
              </span>

              {/* Temperature (colour-coded) */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${skyInfo.temperatureBg} ${skyInfo.temperatureColor}`}>
                <TemperatureIcon icon={skyInfo.temperatureIcon} className="h-3.5 w-3.5" />
                {temperatureLabel}
              </span>

              {/* Day/Night + Moon phase */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                <SkyIcon isDaytime={skyInfo.isDaytime} moonEmoji={skyInfo.moonEmoji} className="h-3.5 w-3.5" />
                {skyInfo.isDaytime ? 'Dia' : skyInfo.moonPhaseName}
              </span>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:text-primary-700 dark:border-white/10 dark:bg-white/10 dark:text-white"
                title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
            </div>
          </div>

          {/* ═══════════ MOBILE NAV ═══════════ */}
          <div className={`flex items-center gap-2 md:hidden ${isScrolled ? 'py-1.5' : 'py-2.5'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {primaryNavItems.slice(0, 4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'border-primary-300 bg-primary-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10'
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
                  className="h-10 w-10 rounded-xl border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-primary dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] overflow-y-auto border-l border-primary-100/70 bg-background/95 px-4 sm:max-w-sm">
                <SheetHeader className="border-b border-border pb-4 text-left">
                  <SheetTitle className="sr-only">Menu Vision</SheetTitle>
                  <BrandLogo compact showTagline={false} logoUrl="/logo7.jpg" className="items-start" />
                </SheetHeader>

                <div className="mt-5 space-y-4">
                  {/* ─── Info Contextual Card (mobile) ─── */}
                  <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm dark:bg-slate-900">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Contexto &amp; Ferramentas
                    </p>

                    <div className="grid gap-1 text-sm">
                      {/* Day/Night indicator */}
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                          <SkyIcon isDaytime={skyInfo.isDaytime} moonEmoji={skyInfo.moonEmoji} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold leading-tight text-foreground">
                            {skyInfo.isDaytime ? 'Período diurno' : 'Período noturno'}
                          </span>
                          {!skyInfo.isDaytime && (
                            <span className="text-[11px] leading-tight text-muted-foreground">{skyInfo.moonEmoji} {skyInfo.moonPhaseName}</span>
                          )}
                        </div>
                      </div>

                      {/* Temperature (colour-coded) */}
                      <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${skyInfo.temperatureBg}`}>
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-white/10">
                          <TemperatureIcon icon={skyInfo.temperatureIcon} className={`h-4 w-4 ${skyInfo.temperatureColor}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className={`block text-[13px] font-bold leading-tight ${skyInfo.temperatureColor}`}>{temperatureLabel}</span>
                          <span className="text-[11px] leading-tight text-muted-foreground">{skyInfo.seasonEmoji} {skyInfo.seasonName}</span>
                        </div>
                      </div>

                      {/* Calendar */}
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                          <CalendarDays className="h-4 w-4 text-primary-600" />
                        </span>
                        <CalendarPopover
                          localDateLabel={localDateLabel}
                          className="text-[13px] font-medium text-foreground transition-colors hover:text-primary-600"
                        />
                      </div>

                      {/* Clock */}
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                          <Clock3 className="h-4 w-4 text-primary-600" />
                        </span>
                        <span className="text-[13px] font-medium text-foreground">{localTime}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                          <MapPin className="h-4 w-4 text-primary-600" />
                        </span>
                        <span className="text-[13px] font-medium text-foreground">{locationLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* ─── Theme toggle card (mobile) ─── */}
                  <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm dark:bg-slate-900">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Tema visível</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => theme === 'dark' && toggleTheme()}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                          theme === 'light'
                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white'
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                        Claro
                      </button>
                      <button
                        type="button"
                        onClick={() => theme === 'light' && toggleTheme()}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                          theme === 'dark'
                            ? 'border-indigo-300 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white'
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        Escuro
                      </button>
                    </div>
                  </div>

                  {/* ─── Categories grid (mobile) ─── */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Categorias</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mobileCategoryItems.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              `flex min-h-[44px] items-center justify-start rounded-xl border px-4 py-2.5 text-left text-[13px] font-medium transition-all ${
                                isActive
                                  ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300'
                                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-primary-200 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white'
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

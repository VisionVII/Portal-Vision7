
import React, { useState, useEffect } from 'react';
import { X, Shield, MapPin, Lock, Settings } from 'lucide-react';
import CookiePreferences from './CookiePreferences';

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  consentDate: string;
  version: number;
}

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const syncStoredConsent = () => {
      const stored = localStorage.getItem('cookie-consent-v2');

      if (!stored) {
        setCookieConsent(null);
        setIsVisible(true);
        return;
      }

      try {
        const parsed = JSON.parse(stored) as CookieConsent;
        setCookieConsent(parsed);
        setIsVisible(false);
      } catch {
        setCookieConsent(null);
        setIsVisible(true);
      }
    };

    syncStoredConsent();
    window.addEventListener('cookie-preferences-updated', syncStoredConsent);
    window.addEventListener('cookie-preferences-reset', syncStoredConsent);
    window.addEventListener('open-cookie-preferences', handleOpenPreferences);

    return () => {
      window.removeEventListener('cookie-preferences-updated', syncStoredConsent);
      window.removeEventListener('cookie-preferences-reset', syncStoredConsent);
      window.removeEventListener('open-cookie-preferences', handleOpenPreferences);
    };
  }, []);

  const handleOpenPreferences = () => {
    setShowPreferences(true);
  };

  const clearLocationData = () => {
    localStorage.removeItem('user-geo');
    localStorage.removeItem('geo-consent');
    window.dispatchEvent(new CustomEvent('cookie-preferences-reset'));
  };

  const saveCookieConsent = (consent: Partial<CookieConsent>) => {
    const fullConsent: CookieConsent = {
      essential: true,
      analytics: consent.analytics ?? false,
      marketing: consent.marketing ?? false,
      personalization: consent.personalization ?? false,
      consentDate: new Date().toISOString(),
      version: 2,
    };

    localStorage.setItem('cookie-consent-v2', JSON.stringify(fullConsent));

    if (!fullConsent.personalization) {
      clearLocationData();
    }

    setCookieConsent(fullConsent);
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('cookie-preferences-updated', { detail: fullConsent }));
  };

  const acceptAllCookies = () => {
    saveCookieConsent({ analytics: true, marketing: true, personalization: true });

    if (localStorage.getItem('geo-consent') !== 'accepted') {
      setTimeout(() => {
        requestGeolocation();
      }, 500);
    }
  };

  const acceptEssentialOnly = () => {
    saveCookieConsent({ analytics: false, marketing: false, personalization: false });
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    const showGeoPopup = () => {
      const userResponse = window.confirm(
        '🌍 Permitir acesso à sua localização aproximada para exibir a sua região, hora local e temperatura em tempo real?\n\nEstes dados só serão mostrados com o seu consentimento e podem ser desativados a qualquer momento.'
      );

      localStorage.setItem('geo-consent', userResponse ? 'accepted' : 'rejected');

      if (userResponse) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            localStorage.setItem('user-geo', JSON.stringify({ latitude, longitude }));
            // Dispatch custom event for components to listen
            window.dispatchEvent(
              new CustomEvent('geolocation-update', {
                detail: { latitude, longitude },
              })
            );
          },
          () => {
            localStorage.setItem('geo-consent', 'rejected');
          }
        );
      }
    };

    showGeoPopup();
  };

  if (!isVisible) {
    // Show preferences button when consent is already given
    if (cookieConsent) {
      return (
        <>
          <button
            onClick={() => setShowPreferences(true)}
            className="group fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-3 z-40 flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary-600 to-primary-700 p-2.5 text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition-all hover:scale-[1.02] hover:shadow-[0_18px_34px_rgba(37,99,235,0.38)] sm:bottom-6 sm:right-6 sm:px-3.5"
            title="Configurações de Privacidade"
          >
            <Settings className="h-5 w-5" />
            <span className="ml-2 hidden text-sm font-semibold sm:inline">Privacidade</span>
          </button>
          <CookiePreferences isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
        </>
      );
    }
    return null;
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4">
        <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.2)] sm:max-w-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-[#020817]">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Fechar"
          >
            <X size={16} />
          </button>

          <div className="px-3.5 pb-2 pt-3 sm:px-5 sm:pt-4">
            <div className="mb-2 flex items-center gap-2 pr-6">
              <Shield className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-300" />
              <h3 className="text-sm font-bold text-foreground sm:text-base">Privacidade</h3>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Utilizamos cookies essenciais e, com o seu consentimento, ativamos análise, marketing e localização.
            </p>

            {showDetails && (
              <div className="mt-2.5 grid gap-2 rounded-xl border border-primary-100/80 bg-primary-50/80 p-3 text-xs dark:border-primary-900/40 dark:bg-slate-900 sm:grid-cols-2 sm:text-sm">
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    Cookies
                  </h4>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li><strong>✓</strong> Essenciais: sessão e segurança</li>
                    <li><strong>📊</strong> Análise: métricas de uso</li>
                    <li><strong>📢</strong> Marketing: conteúdos relevantes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                    Localização
                  </h4>
                  <p className="text-muted-foreground">
                    Região e temperatura só com autorização explícita.
                  </p>
                  <a
                    href="/politica-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    Política de privacidade
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-slate-50 px-3.5 py-2.5 dark:bg-slate-950 sm:px-5 sm:py-3">
            <button
              onClick={acceptAllCookies}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 sm:text-sm"
            >
              Aceitar todos
            </button>
            <button
              onClick={acceptEssentialOnly}
              className="rounded-lg bg-secondary-100 px-3 py-1.5 text-xs font-semibold text-secondary-700 transition-colors hover:bg-secondary-200 dark:bg-neutral-700 dark:text-secondary-400 sm:text-sm"
            >
              Essenciais
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="rounded-lg border border-primary-600 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 sm:text-sm"
            >
              Personalizar
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="ml-auto px-1 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {showDetails ? 'Ocultar' : 'Detalhes'}
            </button>
          </div>
        </div>
      </div>

      <CookiePreferences isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </>
  );
};

export default CookieBanner;

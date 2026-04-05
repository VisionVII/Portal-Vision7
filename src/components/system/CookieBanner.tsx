
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
      } catch (error) {
        console.warn('Falha ao ler o consentimento guardado:', error);
        setCookieConsent(null);
        setIsVisible(true);
      }
    };

    syncStoredConsent();
    window.addEventListener('cookie-preferences-updated', syncStoredConsent);
    window.addEventListener('cookie-preferences-reset', syncStoredConsent);

    return () => {
      window.removeEventListener('cookie-preferences-updated', syncStoredConsent);
      window.removeEventListener('cookie-preferences-reset', syncStoredConsent);
    };
  }, []);

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
      console.warn('Geolocation not supported');
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
          (error) => {
            console.warn('Geolocation error:', error);
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
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#020817]">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-white/10 dark:hover:text-neutral-100"
            title="Fechar"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-start gap-3 pr-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/25 dark:text-primary-200">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground sm:text-lg">Centro de Privacidade</h3>
                  <p className="text-xs text-muted-foreground sm:text-sm">Defina o nível de personalização com transparência, segurança e controlo total.</p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                Utilizamos apenas os cookies necessários e, com o seu consentimento, ativamos análise, marketing e localização para tornar o portal mais útil e relevante.
              </p>

              {showDetails && (
                <div className="mt-4 grid gap-3 rounded-[20px] border border-primary-100/80 bg-primary-50 p-4 text-sm shadow-sm dark:border-primary-900/40 dark:bg-slate-900 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                      <Lock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      Tipos de Cookies
                    </h4>
                    <ul className="space-y-2 text-xs text-muted-foreground md:text-sm">
                      <li><strong>✓ Essenciais:</strong> sessão, segurança e preferências mínimas.</li>
                      <li><strong>📊 Análise:</strong> métricas de uso para melhorar o portal.</li>
                      <li><strong>📢 Marketing:</strong> campanhas e conteúdos promocionais relevantes.</li>
                      <li><strong>🌐 Terceiros:</strong> serviços como Google, Supabase e CDN.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      Localização opcional
                    </h4>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      A sua região, hora local e temperatura só aparecem no menu com autorização explícita e podem ser desativadas a qualquer momento.
                    </p>
                    <a
                      href="/politica-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-xs font-medium text-primary-600 hover:underline dark:text-primary-400 md:text-sm"
                    >
                      📄 Ler política de privacidade
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-slate-50 px-4 py-4 dark:bg-slate-950 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={acceptAllCookies}
                  className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Aceitar todos
                </button>
                <button
                  onClick={acceptEssentialOnly}
                  className="rounded-xl bg-secondary-100 px-4 py-2 text-sm font-semibold text-secondary-700 transition-colors hover:bg-secondary-200 dark:bg-neutral-700 dark:text-secondary-400 dark:hover:bg-neutral-600"
                >
                  Apenas essenciais
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="rounded-xl border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-neutral-800"
                >
                  Personalizar
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-2 py-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400"
                >
                  {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>
              </div>

              <p className="text-xs text-muted-foreground lg:max-w-xs lg:text-right">
                O consentimento fica guardado no seu dispositivo e pode ser alterado a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferences isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </>
  );
};

export default CookieBanner;

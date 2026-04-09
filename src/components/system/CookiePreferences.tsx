import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, MapPin, Shield, X, Zap } from 'lucide-react';

interface CookiePreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  consentDate: string;
  version: number;
}

const STORAGE_KEY = 'cookie-consent-v2';

const CookiePreferences: React.FC<CookiePreferencesProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<CookieConsent>({
    essential: true,
    analytics: false,
    marketing: false,
    personalization: false,
    consentDate: new Date().toISOString(),
    version: 2,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      setPreferences(prev => ({
        ...prev,
        personalization: localStorage.getItem('geo-consent') === 'accepted',
      }));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<CookieConsent>;
      setPreferences({
        essential: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        personalization: Boolean(parsed.personalization ?? localStorage.getItem('geo-consent') === 'accepted'),
        consentDate: parsed.consentDate ?? new Date().toISOString(),
        version: parsed.version ?? 2,
      });
    } catch {
      // Ignore invalid local preference payloads and fall back to defaults.
    }
  }, [isOpen]);

  const handleToggle = (key: 'analytics' | 'marketing' | 'personalization') => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
      consentDate: new Date().toISOString(),
    }));
  };

  const requestGeolocationConsent = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      localStorage.setItem('geo-consent', 'rejected');
      return false;
    }

    const confirmed = window.confirm(
      'Permitir acesso à sua localização aproximada para mostrar região e temperatura reais no topo do site?'
    );

    if (!confirmed) {
      localStorage.setItem('geo-consent', 'rejected');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem('geo-consent', 'accepted');
          localStorage.setItem('user-geo', JSON.stringify({ latitude, longitude }));
          window.dispatchEvent(
            new CustomEvent('geolocation-update', {
              detail: { latitude, longitude },
            })
          );
          resolve(true);
        },
        () => {
          localStorage.setItem('geo-consent', 'rejected');
          localStorage.removeItem('user-geo');
          resolve(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  const handleSave = async () => {
    const nextPreferences: CookieConsent = {
      ...preferences,
      consentDate: new Date().toISOString(),
    };

    if (nextPreferences.personalization) {
      const granted = await requestGeolocationConsent();

      if (!granted) {
        nextPreferences.personalization = false;
      }
    } else {
      localStorage.setItem('geo-consent', 'rejected');
      localStorage.removeItem('user-geo');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    setPreferences(nextPreferences);
    window.dispatchEvent(new CustomEvent('cookie-preferences-updated', { detail: nextPreferences }));
    onClose();
  };

  const handleResetAll = () => {
    if (window.confirm('Tem a certeza que deseja resetar todas as suas preferências de cookies?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('user-geo');
      localStorage.removeItem('geo-consent');
      window.dispatchEvent(new CustomEvent('cookie-preferences-reset'));
      onClose();
    }
  };

  const toggleClasses = (active: boolean) =>
    `relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
      active ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
    }`;

  const toggleKnob = (active: boolean) =>
    `absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
      active ? 'translate-x-[18px]' : 'translate-x-0.5'
    }`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[540px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_16px_48px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#020817] sm:rounded-3xl">
        <DialogHeader className="border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-4 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <div>
              <DialogTitle className="text-left text-base font-bold text-foreground sm:text-lg">Privacidade</DialogTitle>
              <DialogDescription className="mt-0.5 text-left text-xs sm:text-sm">
                Controle cookies, localização e personalização.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55svh] space-y-2.5 overflow-y-auto px-3 py-3 sm:space-y-3 sm:px-5 sm:py-4">
          {/* Quick choice */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary-200 text-xs text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300"
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  analytics: true,
                  marketing: false,
                  personalization: true,
                  consentDate: new Date().toISOString(),
                }))
              }
            >
              Recomendado
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  analytics: false,
                  marketing: false,
                  personalization: false,
                  consentDate: new Date().toISOString(),
                }))
              }
            >
              Só essenciais
            </Button>
          </div>

          {/* Essential */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/10">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-foreground">Essenciais</span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              Ativo
            </span>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-foreground">Análise</span>
            </div>
            <button type="button" onClick={() => handleToggle('analytics')} aria-pressed={preferences.analytics} className={toggleClasses(preferences.analytics)}>
              <span className={toggleKnob(preferences.analytics)} />
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-foreground">Marketing</span>
            </div>
            <button type="button" onClick={() => handleToggle('marketing')} aria-pressed={preferences.marketing} className={toggleClasses(preferences.marketing)}>
              <span className={toggleKnob(preferences.marketing)} />
            </button>
          </div>

          {/* Personalization */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/80 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-foreground">Localização</span>
            </div>
            <button type="button" onClick={() => handleToggle('personalization')} aria-pressed={preferences.personalization} className={toggleClasses(preferences.personalization)}>
              <span className={toggleKnob(preferences.personalization)} />
            </button>
          </div>

          <p className="px-1 text-[11px] text-muted-foreground">
            As preferências ficam guardadas localmente e podem ser alteradas a qualquer momento.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50 px-3 py-2.5 dark:bg-slate-950 sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
          >
            Resetar
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
            <Button size="sm" onClick={() => void handleSave()} className="bg-primary-600 text-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600">
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CookiePreferences;

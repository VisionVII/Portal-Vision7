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
    } catch (error) {
      console.warn('Falha ao ler as preferências guardadas.', error);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[720px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[#020817]">
        <DialogHeader className="space-y-3 border-b border-border bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_35%),linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(239,246,255,0.95)_100%)] px-5 py-5 sm:px-6 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.98)_0%,rgba(3,17,45,0.96)_100%)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-left text-xl font-bold text-foreground">Centro de Privacidade</DialogTitle>
              <DialogDescription className="mt-1 text-left">
                Controle cookies, localização e personalização com um painel mais claro, elegante e responsivo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[65svh] space-y-4 overflow-y-auto bg-white px-4 py-4 dark:bg-[#020817] sm:px-6">
          <div className="rounded-[20px] border border-primary-100/80 bg-primary-50/70 p-4 shadow-sm dark:border-primary-900/40 dark:bg-primary-950/20">
            <p className="text-sm font-semibold text-foreground">Escolha rápida</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pode ativar um conjunto recomendado ou manter apenas o essencial com um toque.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary-200 bg-white text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300"
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
                Configuração recomendada
              </Button>
              <Button
                type="button"
                variant="outline"
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
                Somente essenciais
              </Button>
            </div>
          </div>

          <div className="rounded-[22px] border border-emerald-200/70 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <Lock className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">Cookies Essenciais</h4>
                  <p className="text-sm text-muted-foreground">
                    Necessários para o funcionamento básico do site, segurança e preferências mínimas.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                Sempre ativo
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/80 p-4 shadow-sm transition-colors hover:bg-accent/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">Cookies de Análise</h4>
                  <p className="text-sm text-muted-foreground">
                    Ajudam-nos a perceber como o site é utilizado para melhorar a experiência geral.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('analytics')}
                aria-pressed={preferences.analytics}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                  preferences.analytics ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    preferences.analytics ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/80 p-4 shadow-sm transition-colors hover:bg-accent/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400" />
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">Cookies de Marketing</h4>
                  <p className="text-sm text-muted-foreground">
                    Utilizados para medir campanhas e apresentar conteúdos promocionais relevantes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('marketing')}
                aria-pressed={preferences.marketing}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                  preferences.marketing ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    preferences.marketing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-border bg-card/80 p-4 shadow-sm transition-colors hover:bg-accent/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                <div>
                  <h4 className="mb-1 font-semibold text-foreground">Personalização por Localização</h4>
                  <p className="text-sm text-muted-foreground">
                    Mostra a sua região e a temperatura real no menu apenas quando der consentimento explícito.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('personalization')}
                aria-pressed={preferences.personalization}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
                  preferences.personalization ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    preferences.personalization ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-[20px] border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>ℹ️ Nota:</strong> As preferências ficam guardadas localmente no navegador e podem ser alteradas ou removidas a qualquer momento.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-slate-50 px-4 py-4 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetAll}
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950"
          >
            <X className="mr-2 h-4 w-4" />
            Resetar tudo
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => void handleSave()} className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600">
              Guardar escolhas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CookiePreferences;

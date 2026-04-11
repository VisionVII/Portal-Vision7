/**
 * CMP — Consent Preferences Modal (UI Layer)
 *
 * Pure presentation. All consent logic via useCMP hook.
 * - Accessible toggles (aria-pressed, keyboard nav)
 * - Smooth 200ms transitions
 * - Mobile-first layout
 * - Uses portal's shadcn Dialog
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, MapPin, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCMP } from '@/cmp/useCMP';
import type { ConsentState } from '@/cmp';

interface ConsentPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  necessary: <Lock className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />,
  analytics: <Zap className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />,
  marketing: <Shield className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />,
  personalization: <MapPin className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />,
};

const ConsentPreferences: React.FC<ConsentPreferencesProps> = ({ isOpen, onClose }) => {
  const { consent, categories, update, reset } = useCMP();

  // Local draft state so changes aren't applied until "Guardar"
  const [draft, setDraft] = useState<ConsentState>({ ...consent });

  // Sync draft when modal opens or external consent changes
  useEffect(() => {
    if (isOpen) setDraft({ ...consent });
  }, [isOpen, consent]);

  const handleToggle = useCallback((key: keyof ConsentState) => {
    if (key === 'necessary') return; // Can't toggle essential
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(() => {
    update(draft);

    // Handle geolocation consent flow for personalization
    if (draft.personalization && typeof window !== 'undefined') {
      const geoConsent = localStorage.getItem('geo-consent');
      if (geoConsent !== 'accepted' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            localStorage.setItem('geo-consent', 'accepted');
            localStorage.setItem('user-geo', JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }));
            window.dispatchEvent(new CustomEvent('geolocation-update', {
              detail: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            }));
          },
          () => {
            localStorage.setItem('geo-consent', 'rejected');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      }
    } else {
      localStorage.setItem('geo-consent', 'rejected');
      localStorage.removeItem('user-geo');
    }

    onClose();
  }, [draft, update, onClose]);

  const handleReset = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const setRecommended = useCallback(() => {
    setDraft((prev) => ({ ...prev, analytics: true, marketing: false, personalization: true }));
  }, []);

  const setEssentialOnly = useCallback(() => {
    setDraft((prev) => ({ ...prev, analytics: false, marketing: false, personalization: false }));
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[540px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_16px_48px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-[#020817] sm:rounded-3xl">
        <DialogHeader className="border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5 sm:py-4 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <div>
              <DialogTitle className="text-left text-base font-bold text-foreground sm:text-lg">
                Privacidade
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-left text-xs sm:text-sm">
                Controle cookies, localização e personalização.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55svh] space-y-2.5 overflow-y-auto px-3 py-3 sm:space-y-3 sm:px-5 sm:py-4">
          {/* Quick choices */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary-200 text-xs text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300"
              onClick={setRecommended}
            >
              Recomendado
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={setEssentialOnly}
            >
              Só essenciais
            </Button>
          </div>

          {/* Category toggles */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                cat.required
                  ? 'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-950/10'
                  : 'border-border bg-card/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[cat.id]}
                <div>
                  <span className="text-sm font-medium text-foreground">{cat.label}</span>
                  <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                </div>
              </div>
              {cat.required ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                  Ativo
                </span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-pressed={draft[cat.id]}
                  aria-label={`${cat.label}: ${draft[cat.id] ? 'ativado' : 'desativado'}`}
                  onClick={() => handleToggle(cat.id)}
                  className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-150 ${
                    draft[cat.id] ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
                      draft[cat.id] ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              )}
            </div>
          ))}

          <p className="px-1 text-[11px] text-muted-foreground">
            As preferências ficam guardadas localmente e podem ser alteradas a qualquer momento.{' '}
            <a href="/politica-privacidade" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Política de privacidade
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50 px-3 py-2.5 dark:bg-slate-950 sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
          >
            Resetar
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-primary-600 text-xs hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentPreferences;

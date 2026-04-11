/**
 * CMP — Consent Banner (UI Layer)
 *
 * Pure presentation component. All logic delegated to core engine via useCMP.
 * - Slide-up from bottom with GPU-friendly animation
 * - Mobile-first, accessible (keyboard + aria)
 * - No layout shift (CLS zero — positioned fixed)
 * - Respects portal design system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Settings, X } from 'lucide-react';
import { useCMP } from '@/cmp/useCMP';
import ConsentPreferences from './ConsentPreferences';

const ConsentBanner: React.FC = () => {
  const { hasConsented, acceptAll, rejectAll } = useCMP();
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Show banner only when no consent exists
  useEffect(() => {
    if (!hasConsented) {
      setShowBanner(true);
      // Trigger slide-in animation after mount (requestAnimationFrame for GPU paint)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setShowBanner(false);
      setAnimateIn(false);
    }
  }, [hasConsented]);

  // Listen for external "open preferences" requests (e.g., from AI assistant)
  useEffect(() => {
    const handler = () => setShowPrefs(true);
    window.addEventListener('open-cookie-preferences', handler);
    return () => window.removeEventListener('open-cookie-preferences', handler);
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    setAnimateIn(false);
    setTimeout(() => setShowBanner(false), 200);
  }, [acceptAll]);

  const handleRejectAll = useCallback(() => {
    rejectAll();
    setAnimateIn(false);
    setTimeout(() => setShowBanner(false), 200);
  }, [rejectAll]);

  const handleDismiss = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => setShowBanner(false), 200);
  }, []);

  const handleOpenPrefs = useCallback(() => {
    setShowPrefs(true);
  }, []);

  return (
    <>
      {/* Floating privacy button (visible after consent given) */}
      {hasConsented && !showBanner && (
        <button
          onClick={handleOpenPrefs}
          className="group fixed bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-3 z-40 flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary-600 to-primary-700 p-2.5 text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_18px_34px_rgba(37,99,235,0.38)] sm:bottom-6 sm:right-6 sm:px-3.5"
          title="Configurações de Privacidade"
          aria-label="Abrir configurações de privacidade"
        >
          <Settings className="h-5 w-5" />
          <span className="ml-2 hidden text-sm font-semibold sm:inline">Privacidade</span>
        </button>
      )}

      {/* Banner */}
      {showBanner && (
        <div
          role="dialog"
          aria-label="Banner de consentimento de cookies"
          aria-modal="false"
          className={`fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out sm:px-4 sm:pb-4 ${
            animateIn ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ willChange: 'transform' }}
        >
          <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.2)] sm:max-w-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-[#020817]">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Fechar"
              aria-label="Fechar banner"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="px-3.5 pb-2 pt-3 sm:px-5 sm:pt-4">
              <div className="mb-2 flex items-center gap-2 pr-6">
                <Shield className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-300" />
                <h3 className="text-sm font-bold text-foreground sm:text-base">A sua privacidade</h3>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Utilizamos cookies essenciais para o funcionamento do site e, com o seu consentimento expresso, cookies de análise, marketing e personalização.
                Pode aceitar todos, recusar os opcionais ou personalizar as suas escolhas. Em conformidade com o{' '}
                <strong>RGPD</strong> (UE) e a <strong>LGPD</strong> (Brasil).{' '}
                <a
                  href="/politica-privacidade"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Política de privacidade
                </a>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-slate-50 px-3.5 py-2.5 dark:bg-slate-950 sm:px-5 sm:py-3">
              <button
                onClick={handleAcceptAll}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-primary-700 sm:text-sm"
              >
                Aceitar todos
              </button>
              <button
                onClick={handleRejectAll}
                className="rounded-lg bg-secondary-100 px-3 py-1.5 text-xs font-semibold text-secondary-700 transition-colors duration-150 hover:bg-secondary-200 dark:bg-neutral-700 dark:text-secondary-400 sm:text-sm"
              >
                Essenciais
              </button>
              <button
                onClick={handleOpenPrefs}
                className="rounded-lg border border-primary-600 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors duration-150 hover:bg-primary-50 dark:border-primary-500 dark:text-primary-400 sm:text-sm"
              >
                Personalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences modal */}
      <ConsentPreferences isOpen={showPrefs} onClose={() => setShowPrefs(false)} />
    </>
  );
};

export default ConsentBanner;

/**
 * CMP — React hook that bridges the headless engine to React components.
 * Provides reactive consent state + actions.
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  boot,
  hasConsent,
  getConsent,
  acceptAll,
  rejectAll,
  updateConsent,
  resetConsent,
  getCategories,
  on,
} from '@/cmp';
import type { ConsentState, ConsentCategory, CategoryInfo } from '@/cmp';

interface UseCMP {
  /** Current consent state */
  consent: ConsentState;
  /** Whether user has ever given consent */
  hasConsented: boolean;
  /** Available categories with labels */
  categories: CategoryInfo[];
  /** Accept all categories */
  acceptAll: () => void;
  /** Reject all non-essential */
  rejectAll: () => void;
  /** Update specific categories */
  update: (changes: Partial<ConsentState>) => void;
  /** Reset all consent (requires re-consent) */
  reset: () => void;
  /** Check single category */
  isAllowed: (category: ConsentCategory) => boolean;
}

// External store for useSyncExternalStore
let _snapshot: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
};
const _listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function getSnapshot(): ConsentState {
  return _snapshot;
}

function notifyAll(): void {
  for (const fn of _listeners) fn();
}

// Boot on import + listen for engine events
let _booted = false;
function ensureBoot(): void {
  if (_booted) return;
  _booted = true;
  boot();
  _snapshot = getConsent();

  on('consent:updated', (e) => {
    _snapshot = { ...e.consent };
    notifyAll();
  });
  on('consent:reset', () => {
    _snapshot = { necessary: true, analytics: false, marketing: false, personalization: false };
    notifyAll();
  });
  on('consent:loaded', (e) => {
    _snapshot = { ...e.consent };
    notifyAll();
  });
}

export function useCMP(): UseCMP {
  ensureBoot();

  const consent = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [consented, setConsented] = useState(() => hasConsent());

  useEffect(() => {
    // Re-check after boot in case storage was read before engine init
    setConsented(hasConsent());
    const off1 = on('consent:updated', () => setConsented(true));
    const off2 = on('consent:reset', () => setConsented(false));
    return () => { off1(); off2(); };
  }, []);

  const doAcceptAll = useCallback(() => { acceptAll('banner'); }, []);
  const doRejectAll = useCallback(() => { rejectAll('banner'); }, []);
  const doUpdate = useCallback((changes: Partial<ConsentState>) => { updateConsent(changes); }, []);
  const doReset = useCallback(() => { resetConsent(); }, []);
  const checkAllowed = useCallback((cat: ConsentCategory) => consent[cat] === true, [consent]);

  return {
    consent,
    hasConsented: consented,
    categories: getCategories(),
    acceptAll: doAcceptAll,
    rejectAll: doRejectAll,
    update: doUpdate,
    reset: doReset,
    isAllowed: checkAllowed,
  };
}

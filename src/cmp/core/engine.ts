/**
 * CMP — Core Consent Engine (Brain)
 *
 * Headless, framework-agnostic, API-first consent management.
 * Can run client-side or server-side. Zero UI dependency.
 *
 * Responsibilities:
 * - Consent state management (GDPR/LGPD ready)
 * - Versioned consent storage
 * - Category management (necessary, analytics, marketing, personalization)
 * - Event bus for UI/script integration
 * - Policy version tracking
 */

import type {
  ConsentCategory,
  ConsentEvent,
  ConsentEventType,
  ConsentState,
  CMPConfig,
  CategoryInfo,
} from './types';
import { readConsent, writeConsent, clearConsent, type StoredConsent } from './storage';

// ── Default config ──────────────────────────────────────────────────────────

const DEFAULT_POLICY_VERSION = '1.0';

const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { id: 'necessary', label: 'Essenciais', description: 'Necessários para o funcionamento básico do site.', required: true },
  { id: 'analytics', label: 'Análise', description: 'Ajudam a compreender como utiliza o site.', required: false },
  { id: 'marketing', label: 'Marketing', description: 'Permitem personalizar publicidade e conteúdo.', required: false },
  { id: 'personalization', label: 'Personalização', description: 'Adaptam a experiência ao seu perfil e localização.', required: false },
];

const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
};

// ── Event bus ───────────────────────────────────────────────────────────────

type Listener = (event: ConsentEvent) => void;
const listeners = new Map<ConsentEventType, Set<Listener>>();

function emit(type: ConsentEventType, consent: ConsentState, version: string): void {
  const event: ConsentEvent = {
    type,
    consent,
    timestamp: new Date().toISOString(),
    version,
  };

  // Dispatch to internal listeners
  const set = listeners.get(type);
  if (set) {
    for (const fn of set) {
      try { fn(event); } catch { /* isolate listener errors */ }
    }
  }

  // Dispatch CustomEvent for external consumers (UI layer, legacy code)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail: event }));
  }
}

// ── Engine singleton ────────────────────────────────────────────────────────

let _config: CMPConfig | null = null;
let _state: ConsentState = { ...DEFAULT_CONSENT };
let _version: string = DEFAULT_POLICY_VERSION;
let _initialized = false;

/**
 * Initialize the consent engine.
 * Reads existing consent from storage, or returns defaults.
 * Does NOT show any UI — that's the UI layer's job.
 */
export function init(overrides?: Partial<CMPConfig>): ConsentState {
  if (_initialized) return _state;

  _config = {
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    policyVersion: DEFAULT_POLICY_VERSION,
    categories: DEFAULT_CATEGORIES,
    defaults: { ...DEFAULT_CONSENT },
    geoRulesEnabled: false,
    ...overrides,
  };

  _version = _config.policyVersion;

  // Read existing consent
  const stored = readConsent();

  if (stored) {
    // Check policy version — if outdated, require re-consent
    if (stored.version !== _version) {
      // Policy changed — keep old state but mark as needing update
      _state = { ...DEFAULT_CONSENT, ...stored.consent, necessary: true };
      _initialized = true;
      emit('consent:loaded', _state, _version);
      return _state;
    }

    _state = { ...stored.consent, necessary: true };
    _initialized = true;
    emit('consent:loaded', _state, _version);
    return _state;
  }

  // No existing consent — use defaults
  _state = { ...DEFAULT_CONSENT };
  _initialized = true;
  emit('consent:loaded', _state, _version);
  return _state;
}

/** Check if engine has been initialized */
export function isInitialized(): boolean {
  return _initialized;
}

/** Check if user has given any consent (vs first visit) */
export function hasConsent(): boolean {
  return readConsent() !== null;
}

/** Get current consent state (read-only copy) */
export function getConsent(): ConsentState {
  return { ..._state };
}

/** Check if a specific category is consented */
export function isAllowed(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  return _state[category] === true;
}

/** Get current policy version */
export function getVersion(): string {
  return _version;
}

/** Get config */
export function getConfig(): CMPConfig | null {
  return _config ? { ..._config } : null;
}

/** Get available categories */
export function getCategories(): CategoryInfo[] {
  return _config?.categories ?? DEFAULT_CATEGORIES;
}

/**
 * Update consent for one or more categories.
 * Persists to storage and emits events.
 */
export function updateConsent(
  changes: Partial<ConsentState>,
  method: 'banner' | 'preferences' | 'api' = 'preferences',
): ConsentState {
  // Necessary is always true
  _state = { ..._state, ...changes, necessary: true };

  const stored: StoredConsent = {
    consent: _state,
    version: _version,
    timestamp: new Date().toISOString(),
    userId: 'anon', // Will be overridden by API layer if authenticated
  };

  writeConsent(stored);
  emit('consent:updated', _state, _version);

  // Dispatch legacy event for backward compatibility with existing CookieBanner consumers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookie-preferences-updated', {
      detail: {
        essential: true,
        analytics: _state.analytics,
        marketing: _state.marketing,
        personalization: _state.personalization,
        consentDate: stored.timestamp,
        version: _version,
      },
    }));
  }

  return { ..._state };
}

/** Accept all categories */
export function acceptAll(method: 'banner' | 'preferences' = 'banner'): ConsentState {
  return updateConsent({
    necessary: true,
    analytics: true,
    marketing: true,
    personalization: true,
  }, method);
}

/** Reject all non-essential */
export function rejectAll(method: 'banner' | 'preferences' = 'banner'): ConsentState {
  return updateConsent({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  }, method);
}

/** Reset consent entirely — removes from storage */
export function resetConsent(): void {
  _state = { ...DEFAULT_CONSENT };
  clearConsent();
  _initialized = false;
  emit('consent:reset', _state, _version);

  // Legacy event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookie-preferences-reset'));
  }
}

// ── Event subscription ──────────────────────────────────────────────────────

export function on(type: ConsentEventType, fn: Listener): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => { listeners.get(type)?.delete(fn); };
}

export function off(type: ConsentEventType, fn: Listener): void {
  listeners.get(type)?.delete(fn);
}

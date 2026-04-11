/**
 * CMP — Ultra-light Script Loader
 *
 * Critical entry point. Executes synchronously and fast.
 * Rules: <5kb, no render blocking, no LCP impact, instant boot.
 *
 * Flow:
 * 1. Boot immediately
 * 2. Check localStorage/cookie for existing consent
 * 3. If consent exists → apply rules silently (no UI)
 * 4. If no consent → emit event for UI layer to render banner
 * 5. Fetch remote config async in background (future SaaS)
 */

import { init, hasConsent, getConsent } from './core/engine';
import { initScriptController, releaseConsentedScripts } from './core/script-controller';

let _booted = false;

/**
 * Boot the CMP system. Should be called as early as possible.
 * Returns true if user already has consent (no banner needed).
 */
export function boot(): boolean {
  if (_booted) return hasConsent();
  _booted = true;

  // 1. Init engine (reads storage synchronously)
  init();

  // 2. Init script controller (scan + observe DOM)
  initScriptController();

  // 3. Check consent state
  if (hasConsent()) {
    // User already consented — release scripts silently
    releaseConsentedScripts(getConsent());
    return true;
  }

  // 4. No consent — UI layer will handle showing banner
  return false;
}

// ── Public API ──────────────────────────────────────────────────────────────

// Re-export everything consumers need
export {
  init,
  isInitialized,
  hasConsent,
  getConsent,
  isAllowed,
  getVersion,
  getConfig,
  getCategories,
  updateConsent,
  acceptAll,
  rejectAll,
  resetConsent,
  on,
  off,
} from './core/engine';

export { releaseConsentedScripts } from './core/script-controller';

export type {
  ConsentCategory,
  ConsentState,
  ConsentRecord,
  ConsentEvent,
  ConsentEventType,
  CMPConfig,
  CategoryInfo,
  PolicyVersion,
  SaaSFlags,
} from './core/types';

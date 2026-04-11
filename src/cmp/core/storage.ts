/**
 * CMP — Versioned Consent Storage
 *
 * Handles localStorage persistence with version tracking.
 * Cookie fallback for cross-subdomain support (SaaS-ready).
 * Zero framework dependencies.
 */

import type { ConsentState } from './types';

const STORAGE_KEY = 'cookie-consent-v2';
const COOKIE_NAME = 'v7_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export interface StoredConsent {
  consent: ConsentState;
  version: string;
  timestamp: string;
  userId: string;
}

function hasLocalStorage(): boolean {
  try {
    const k = '__cmp_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function setCookie(name: string, value: string, maxAge: number): void {
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;
}

export function readConsent(): StoredConsent | null {
  // Primary: localStorage
  if (hasLocalStorage()) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Migrate from old format (flat consent fields) — write-through to persist new format
        if ('essential' in parsed && !('consent' in parsed)) {
          const migrated = migrateV1(parsed);
          writeConsent(migrated);
          return migrated;
        }
        if (parsed.consent && parsed.version) {
          return parsed as StoredConsent;
        }
      } catch { /* corrupt — fall through */ }
    }
  }

  // Fallback: cookie
  const cookieRaw = getCookie(COOKIE_NAME);
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed.consent && parsed.version) return parsed as StoredConsent;
    } catch { /* ignore */ }
  }

  return null;
}

export function writeConsent(stored: StoredConsent): void {
  const json = JSON.stringify(stored);

  if (hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, json);
  }

  // Always write cookie too (SaaS-ready cross-subdomain)
  setCookie(COOKIE_NAME, json, COOKIE_MAX_AGE);
}

export function clearConsent(): void {
  if (hasLocalStorage()) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('geo-consent');
    localStorage.removeItem('user-geo');
  }
  deleteCookie(COOKIE_NAME);
}

export function hasExistingConsent(): boolean {
  return readConsent() !== null;
}

// ── Migration from old CookieBanner format ──────────────────────────────────

function migrateV1(old: Record<string, unknown>): StoredConsent {
  return {
    consent: {
      necessary: true,
      analytics: old.analytics === true,
      marketing: old.marketing === true,
      personalization: old.personalization === true,
    },
    version: String(old.version ?? '1.0'),
    timestamp: String(old.consentDate ?? new Date().toISOString()),
    userId: 'anon',
  };
}

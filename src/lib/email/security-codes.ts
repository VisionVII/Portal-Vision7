/**
 * Generates a cryptographically secure random numeric code.
 * Uses Web Crypto API for secure randomness.
 */
export function generateSecurityCode(length = 6): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (num) => (num % 10).toString()).join('');
}

/**
 * Generates an alphanumeric security token for invites and links.
 * Uses Web Crypto API for secure randomness.
 */
export function generateSecurityToken(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

/**
 * Default code expiration time in minutes.
 */
export const CODE_EXPIRY_MINUTES = 10;

/**
 * Maximum number of code verification attempts before lockout.
 */
export const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Lockout duration in minutes after max failed attempts.
 */
export const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Checks whether a code has expired based on its creation time.
 */
export function isCodeExpired(createdAt: Date, expiryMinutes = CODE_EXPIRY_MINUTES): boolean {
  const now = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  return now > expiresAt;
}

/**
 * Formats remaining time for display (e.g., "4:32").
 */
export function formatRemainingTime(createdAt: Date, expiryMinutes = CODE_EXPIRY_MINUTES): string {
  const now = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  const remainingMs = expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) return '0:00';

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

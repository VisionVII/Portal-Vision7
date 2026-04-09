import { useState, useEffect, useCallback, useRef } from 'react';
import { checkN8nHealth } from '@/services/n8n';

/* ── n8n Keep-Alive Bot ──────────────────────────────────────────────────
 * Pings the n8n instance periodically to prevent Render free-tier cold starts.
 * - Default interval: 4 minutes (Render spins down after ~15 min of inactivity)
 * - Controlled from dashboard ON/OFF toggle
 * - Persists state to localStorage so it survives page refreshes
 * - Only active when enabled; reduces frequency when tab is hidden
 * ────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'n8n:keepAliveActive';
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render spins down after 15min inactivity)
const HIDDEN_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes when tab hidden (still < 15min)
const COLD_START_RETRY_MS = 35_000; // retry after 35s on cold-start timeout (Render takes 30-60s)
const MAX_CONSECUTIVE_FAILURES = 8;

export interface KeepAliveState {
  isActive: boolean;
  lastPing: string | null;
  lastStatus: 'connected' | 'error' | 'unreachable' | null;
  pingCount: number;
  failCount: number;
}

/**
 * Optional: external code can set this to `true` while a pipeline is
 * executing so the keep-alive bot skips pings that could interfere.
 */
let _pipelineBusy = false;
export function setKeepAlivePipelineBusy(busy: boolean) { _pipelineBusy = busy; }

export function useN8nKeepAlive() {
  const [isActive, setIsActive] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const [lastPing, setLastPing] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<'connected' | 'error' | 'unreachable' | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveFailures = useRef(0);

  // Persist active state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(isActive)); } catch { /* ignore */ }
  }, [isActive]);

  /** Detect cold-start patterns (timeout, 503, unreachable) */
  const isColdStartSignal = (status: string, detail?: string): boolean => {
    if (status === 'unreachable') return true;
    if (!detail) return false;
    return /timeout|abort|503|cold.?start|not ready|Database is not ready/i.test(detail);
  };

  const ping = useCallback(async (isRetry = false) => {
    if (_pipelineBusy) {
      console.debug('[KeepAlive] Skip ping — pipeline busy');
      return;
    }

    const attempt = isRetry ? 'retry' : 'initial';
    console.info(`[KeepAlive] Ping (${attempt}) @ ${new Date().toLocaleTimeString()}`);

    try {
      const health = await checkN8nHealth();
      setLastPing(new Date().toISOString());
      setLastStatus(health.status);
      setPingCount(c => c + 1);

      if (health.status === 'connected') {
        console.info('[KeepAlive] ✓ n8n responded OK');
        consecutiveFailures.current = 0;
        setFailCount(0);
      } else {
        // First attempt + cold-start signal → schedule automatic retry.
        // The initial ping wakes Render; 35s later n8n should be booted.
        if (!isRetry && isColdStartSignal(health.status, health.detail)) {
          console.info('[KeepAlive] Cold-start detected — retry in 35s');
          retryTimerRef.current = setTimeout(() => void ping(true), COLD_START_RETRY_MS);
          return; // don't count as failure
        }

        console.warn('[KeepAlive] ✗ n8n unhealthy:', health.status, health.detail);
        consecutiveFailures.current++;
        setFailCount(consecutiveFailures.current);

        if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
          console.warn(`[KeepAlive] ${MAX_CONSECUTIVE_FAILURES} failures — auto-disabling`);
          setIsActive(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';

      // Auth errors shouldn't count as infrastructure failures
      if (/sessao|login|expirad|refresh token/i.test(msg)) {
        console.debug('[KeepAlive] Auth error (ignoring):', msg);
        setLastPing(new Date().toISOString());
        setLastStatus('error');
        return;
      }

      // Cold-start retry on network-level errors (first attempt only)
      if (!isRetry && /timeout|abort|503|fetch|network|CORS/i.test(msg)) {
        console.info('[KeepAlive] Network error — cold-start retry in 35s:', msg);
        retryTimerRef.current = setTimeout(() => void ping(true), COLD_START_RETRY_MS);
        setLastPing(new Date().toISOString());
        setLastStatus('unreachable');
        return;
      }

      console.warn('[KeepAlive] ✗ Exception:', msg);
      consecutiveFailures.current++;
      setFailCount(consecutiveFailures.current);
      setLastStatus('unreachable');
      setLastPing(new Date().toISOString());

      if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[KeepAlive] ${MAX_CONSECUTIVE_FAILURES} failures — auto-disabling`);
        setIsActive(false);
      }
    }
  }, []);

  // Start/stop interval — adjusts frequency based on tab visibility
  useEffect(() => {
    const resetInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isActive) return;
      
      const ms = document.hidden ? HIDDEN_INTERVAL_MS : INTERVAL_MS;
      const minLabel = Math.round(ms / 60_000);
      console.info(`[KeepAlive] Interval set to ${minLabel}min (tab ${document.hidden ? 'hidden' : 'visible'})`);
      
      intervalRef.current = setInterval(() => void ping(), ms);
    };

    if (isActive) {
      console.info('[KeepAlive] Starting — initial ping now');
      void ping();
      resetInterval();
    } else {
      console.info('[KeepAlive] Stopped');
    }

    const onVisChange = () => {
      console.debug('[KeepAlive] Tab visibility changed —', document.hidden ? 'hidden' : 'visible');
      resetInterval();
    };
    
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [isActive, ping]);

  const start = useCallback(() => {
    consecutiveFailures.current = 0;
    setFailCount(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  const pingNow = useCallback(async () => {
    await ping();
  }, [ping]);

  return {
    isActive,
    lastPing,
    lastStatus,
    pingCount,
    failCount,
    start,
    stop,
    pingNow,
  };
}

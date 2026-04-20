import { useEffect, useRef, useState } from 'react';
import { boot, isAllowed } from '@/cmp';

export interface UserLocation {
  country: string | null;
  region: string | null;
  timezone: string | null;
  localTime: string;
  temperatureC: number | null;
  hasConsent: boolean;
}

const GEO_RELEVANT_KEYS = new Set(['cookie-consent-v2', 'geo-consent', 'user-geo']);
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes between API calls
const CLOCK_INTERVAL_MS = 60 * 1000; // update clock every 60s (minutes precision)

let lastSyncTimestamp = 0;

export const useUserLocation = () => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [location, setLocation] = useState<UserLocation>({
    country: null,
    region: null,
    timezone: browserTimezone,
    localTime: new Date().toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    temperatureC: null,
    hasConsent: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Ensure CMP engine is booted before checking consent (idempotent)
    boot();

    const updateTime = () => {
      const now = new Date();
      setLocation((prev) => {
        const newTime = now.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        if (prev.localTime === newTime) return prev;
        return { ...prev, localTime: newTime };
      });
    };

    const syncLocation = async (force = false) => {
      const hasPersonalizationConsent = isAllowed('personalization');

      // Always allow consent state changes to propagate immediately;
      // only throttle the external API calls (weather, geo)
      const now = Date.now();
      const withinThrottle = !force && now - lastSyncTimestamp < SYNC_THROTTLE_MS;

      if (!hasPersonalizationConsent) {
        // Update consent state immediately even if throttled
        setLocation((prev) => {
          if (!prev.hasConsent) return prev; // already false, skip
          return {
            ...prev,
            country: null,
            region: null,
            timezone,
            temperatureC: null,
            hasConsent: false,
          };
        });
        return;
      }

      // Consent is granted — update hasConsent immediately
      setLocation((prev) => {
        if (prev.hasConsent) return prev; // already true, skip
        return { ...prev, hasConsent: true };
      });

      if (withinThrottle) return;
      lastSyncTimestamp = now;

      let storedGeo = localStorage.getItem('user-geo');

      // IP-based fallback when no GPS coords are stored but consent is given
      if (!storedGeo) {
        try {
          const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
          if (ipRes.ok) {
            const ipData = (await ipRes.json()) as { latitude?: number; longitude?: number };
            if (typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
              const coords = JSON.stringify({ latitude: ipData.latitude, longitude: ipData.longitude });
              localStorage.setItem('user-geo', coords);
              storedGeo = coords;
            }
          }
        } catch {
          // ignore — IP lookup failed, proceed without coords
        }
      }

      // Timezone-based approximate coords fallback (when IP lookup is blocked)
      if (!storedGeo) {
        const tzFallbacks: Record<string, { latitude: number; longitude: number }> = {
          'Europe/Lisbon': { latitude: 38.72, longitude: -9.14 },
          'Europe/London': { latitude: 51.51, longitude: -0.13 },
          'Europe/Madrid': { latitude: 40.42, longitude: -3.70 },
          'Europe/Paris': { latitude: 48.86, longitude: 2.35 },
          'Europe/Berlin': { latitude: 52.52, longitude: 13.41 },
          'America/Sao_Paulo': { latitude: -23.55, longitude: -46.63 },
          'America/New_York': { latitude: 40.71, longitude: -74.01 },
        };
        const fallbackCoords = tzFallbacks[timezone];
        if (fallbackCoords) {
          storedGeo = JSON.stringify(fallbackCoords);
          // Don't persist to localStorage — these are approximate
        }
      }

      if (!storedGeo) {
        setLocation((prev) => ({ ...prev, timezone, hasConsent: true }));
        return;
      }

      // Abort any in-flight request
      syncAbortRef.current?.abort();
      const controller = new AbortController();
      syncAbortRef.current = controller;

      try {
        setIsLoading(true);
        const { latitude, longitude } = JSON.parse(storedGeo) as { latitude: number; longitude: number };

        const [weatherResponse, geoResponse] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`,
            { signal: controller.signal }
          ),
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`,
            { signal: controller.signal }
          ),
        ]);

        const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;
        const geoData = geoResponse.ok ? await geoResponse.json() : null;
        const fallbackRegion = timezone?.split('/').pop()?.replace(/_/g, ' ') ?? null;

        setLocation((prev) => ({
          ...prev,
          country: geoData?.countryName ?? prev.country,
          region:
            geoData?.city ??
            geoData?.locality ??
            geoData?.principalSubdivision ??
            fallbackRegion,
          timezone: weatherData?.timezone ?? timezone,
          temperatureC:
            typeof weatherData?.current?.temperature_2m === 'number'
              ? Math.round(weatherData.current.temperature_2m)
              : null,
          hasConsent: true,
        }));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.warn('Não foi possível atualizar região e temperatura.', error instanceof Error ? error.message : 'unknown');
        setLocation((prev) => ({
          ...prev,
          timezone,
          region: prev.region ?? timezone?.split('/').pop()?.replace(/_/g, ' ') ?? null,
          temperatureC: prev.temperatureC,
          hasConsent: true,
        }));
      } finally {
        setIsLoading(false);
      }
    };

    const handleLocationRefresh = () => {
      void syncLocation(true);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== null && !GEO_RELEVANT_KEYS.has(e.key)) return;
      void syncLocation(true);
    };

    updateTime();
    void syncLocation();
    updateIntervalRef.current = setInterval(updateTime, CLOCK_INTERVAL_MS);

    window.addEventListener('geolocation-update', handleLocationRefresh);
    window.addEventListener('cookie-preferences-updated', handleLocationRefresh);
    window.addEventListener('cookie-preferences-reset', handleLocationRefresh);
    window.addEventListener('consent:loaded', handleLocationRefresh);
    window.addEventListener('consent:updated', handleLocationRefresh);
    window.addEventListener('storage', handleStorageChange as EventListener);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      syncAbortRef.current?.abort();

      window.removeEventListener('geolocation-update', handleLocationRefresh);
      window.removeEventListener('cookie-preferences-updated', handleLocationRefresh);
      window.removeEventListener('cookie-preferences-reset', handleLocationRefresh);
      window.removeEventListener('consent:loaded', handleLocationRefresh);
      window.removeEventListener('consent:updated', handleLocationRefresh);
      window.removeEventListener('storage', handleStorageChange as EventListener);
    };
  }, [browserTimezone]);

  return {
    ...location,
    isLoading,
  };
};

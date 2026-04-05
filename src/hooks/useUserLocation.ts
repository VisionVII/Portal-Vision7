import { useEffect, useRef, useState } from 'react';

export interface UserLocation {
  country: string | null;
  region: string | null;
  timezone: string | null;
  localTime: string;
  temperatureC: number | null;
  hasConsent: boolean;
}

interface StoredConsent {
  personalization?: boolean;
}

export const useUserLocation = () => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [location, setLocation] = useState<UserLocation>({
    country: null,
    region: null,
    timezone: browserTimezone,
    localTime: new Date().toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    temperatureC: null,
    hasConsent: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const updateTime = () => {
      const now = new Date();
      setLocation((prev) => ({
        ...prev,
        localTime: now.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      }));
    };

    const syncLocation = async () => {
      const consentRaw = localStorage.getItem('cookie-consent-v2');
      const geoConsent = localStorage.getItem('geo-consent');

      let consent: StoredConsent | null = null;
      if (consentRaw) {
        try {
          consent = JSON.parse(consentRaw) as StoredConsent;
        } catch (error) {
          console.warn('Falha ao ler o consentimento de localização.', error);
        }
      }

      const hasConsent = Boolean(consent?.personalization) && geoConsent === 'accepted';

      if (!hasConsent) {
        setLocation((prev) => ({
          ...prev,
          country: null,
          region: null,
          timezone,
          temperatureC: null,
          hasConsent: false,
        }));
        return;
      }

      const storedGeo = localStorage.getItem('user-geo');
      if (!storedGeo) {
        setLocation((prev) => ({
          ...prev,
          timezone,
          hasConsent: true,
        }));
        return;
      }

      try {
        setIsLoading(true);
        const { latitude, longitude } = JSON.parse(storedGeo) as { latitude: number; longitude: number };

        const [weatherResponse, geoResponse] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
          ),
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
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
        console.warn('Não foi possível atualizar região e temperatura.', error);
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
      void syncLocation();
    };

    updateTime();
    handleLocationRefresh();
    updateIntervalRef.current = setInterval(updateTime, 1000);

    window.addEventListener('geolocation-update', handleLocationRefresh);
    window.addEventListener('cookie-preferences-updated', handleLocationRefresh);
    window.addEventListener('cookie-preferences-reset', handleLocationRefresh);
    window.addEventListener('storage', handleLocationRefresh);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      window.removeEventListener('geolocation-update', handleLocationRefresh);
      window.removeEventListener('cookie-preferences-updated', handleLocationRefresh);
      window.removeEventListener('cookie-preferences-reset', handleLocationRefresh);
      window.removeEventListener('storage', handleLocationRefresh);
    };
  }, [browserTimezone]);

  return {
    ...location,
    isLoading,
  };
};

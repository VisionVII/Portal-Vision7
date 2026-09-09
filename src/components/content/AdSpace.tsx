
import React, { useEffect, useRef } from 'react';
import { useAdsEnabled } from '@/hooks/useMonetization';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSpaceProps {
  size: 'leaderboard' | 'banner' | 'rectangle' | 'square' | 'skyscraper' | 'inline';
  position: string;
  className?: string;
}

const AdSpace: React.FC<AdSpaceProps> = ({ size, position, className }) => {
  const { data: adsEnabled } = useAdsEnabled();
  const adRef = useRef<HTMLModElement>(null);
  const slotId = import.meta.env.VITE_ADSENSE_SLOT_ID as string | undefined;

  useEffect(() => {
    if (!adsEnabled || !slotId || !adRef.current || adRef.current.dataset.loaded) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adRef.current.dataset.loaded = 'true';
    } catch {
      // AdSense can be unavailable while consent or the network is loading.
    }
  }, [adsEnabled, slotId]);

  if (!adsEnabled || !slotId) return null;

  return (
    <div className={className} aria-label={`Publicidade ${position}`}>
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[90px] w-full overflow-hidden"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-3038714748965626"
        data-ad-slot={slotId}
        data-ad-format={size === 'square' ? 'rectangle' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSpace;

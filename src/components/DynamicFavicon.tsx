import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const DynamicFavicon = () => {
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    if (settings?.logo_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.logo_url;
      link.type = 'image/png';
    }
  }, [settings?.logo_url]);

  return null;
};

export default DynamicFavicon;

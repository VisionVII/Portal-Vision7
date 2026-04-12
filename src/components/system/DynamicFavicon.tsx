import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const DEFAULT_FAVICON = '/favicon-64.png';

const DynamicFavicon = () => {
  const { data: settings } = useSiteSettings();
  const brandName = settings?.site_name && !/porto\s+not[ií]cias/i.test(settings.site_name)
    ? settings.site_name
    : 'Vision7';

  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = DEFAULT_FAVICON;
    link.type = 'image/png';
    document.title = `${brandName} - Portal Tecnologico`;
  }, [brandName]);

  return null;
};

export default DynamicFavicon;

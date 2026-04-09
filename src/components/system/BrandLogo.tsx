import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  siteName?: string | null;
  logoUrl?: string | null;
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
}

const DEFAULT_LOGO = '/vision-logo-premium-default.png';

const getBrandName = (siteName?: string | null) => {
  const value = siteName?.trim();
  if (!value || /porto\s+not[ií]cias|vision\s*7?/i.test(value)) {
    return 'Vision7';
  }

  return value;
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  siteName,
  logoUrl,
  compact = false,
  showTagline = false,
  className,
}) => {
  const brandName = getBrandName(siteName);
  const activeLogo = logoUrl?.trim() ? logoUrl : DEFAULT_LOGO;

  return (
    <div className={cn('flex flex-col', showTagline && !compact ? 'gap-1' : 'gap-0', className)}>
      <div className="flex items-center gap-3 overflow-visible">
        <img
          src={activeLogo}
          alt={`${brandName} premium logo`}
          className={cn(
            'w-auto object-contain drop-shadow-[0_4px_14px_rgba(34,211,238,0.18)]',
            compact
              ? 'h-10 max-w-[140px] sm:h-12 sm:max-w-[160px]'
              : 'h-11 max-w-[152px] sm:h-12 sm:max-w-[172px] lg:h-14 lg:max-w-[210px]'
          )}
        />
        <span className="sr-only">{brandName}</span>
      </div>

      {showTagline && (
        <p className={cn('pl-1 text-[11px] text-muted-foreground sm:text-xs', compact && 'hidden')}>
          Curadoria premium de informação
        </p>
      )}
    </div>
  );
};

export default BrandLogo;

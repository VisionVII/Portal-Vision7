
import React from 'react';

interface AdSpaceProps {
  size: 'leaderboard' | 'banner' | 'rectangle' | 'square' | 'skyscraper' | 'inline';
  position: string;
  className?: string;
}

const AdSpace: React.FC<AdSpaceProps> = ({ size, position, className = '' }) => {
  const sizeConfig: Record<string, { classes: string; label: string; dimensions: string }> = {
    leaderboard: {
      classes: 'w-full h-[90px] md:h-[90px]',
      label: 'Leaderboard',
      dimensions: '728×90',
    },
    banner: {
      classes: 'mx-auto h-[60px] w-full max-w-4xl md:h-[90px]',
      label: 'Banner',
      dimensions: '468×60 / 728×90',
    },
    rectangle: {
      classes: 'mx-auto h-[180px] w-full max-w-full sm:max-w-[336px] sm:h-[250px] md:h-[280px]',
      label: 'Retângulo',
      dimensions: '300×250 / 336×280',
    },
    square: {
      classes: 'mx-auto h-[180px] w-full max-w-full sm:h-[250px] sm:max-w-[300px]',
      label: 'Quadrado',
      dimensions: '250×250 / 300×250',
    },
    skyscraper: {
      classes: 'w-full h-[600px] hidden lg:flex',
      label: 'Skyscraper',
      dimensions: '160×600',
    },
    inline: {
      classes: 'w-full h-[100px] md:h-[90px]',
      label: 'Inline',
      dimensions: '728×90',
    },
  };

  const config = sizeConfig[size] || sizeConfig.rectangle;

  return (
    <div className={`ad-space ${config.classes} ${className}`}>
      <div className="text-center px-4">
        <p className="text-xs font-medium uppercase tracking-wider opacity-60 mb-1">Publicidade</p>
        <p className="text-[10px] opacity-40">{config.dimensions} — {position}</p>
      </div>
    </div>
  );
};

export default AdSpace;

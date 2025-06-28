
import React from 'react';

interface AdSpaceProps {
  size: 'banner' | 'rectangle' | 'square' | 'skyscraper';
  position: string;
  className?: string;
}

const AdSpace: React.FC<AdSpaceProps> = ({ size, position, className = '' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'banner':
        return 'w-full h-24 md:h-32';
      case 'rectangle':
        return 'w-full h-64';
      case 'square':
        return 'w-full h-80';
      case 'skyscraper':
        return 'w-full h-96';
      default:
        return 'w-full h-64';
    }
  };

  return (
    <div className={`ad-space ${getSizeClasses()} ${className}`}>
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">Espaço Publicitário</p>
        <p className="text-sm">{size.toUpperCase()} - {position}</p>
        <p className="text-xs mt-2 text-gray-400">
          Cole aqui o código do Google Ads ou outro serviço de publicidade
        </p>
      </div>
    </div>
  );
};

export default AdSpace;

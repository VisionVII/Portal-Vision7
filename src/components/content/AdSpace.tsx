
import React from 'react';

interface AdSpaceProps {
  size: 'leaderboard' | 'banner' | 'rectangle' | 'square' | 'skyscraper' | 'inline';
  position: string;
  className?: string;
}

// Ad slots hidden until a real ad network is integrated.
// Renders nothing to avoid placeholder boxes appearing on the page.
const AdSpace: React.FC<AdSpaceProps> = () => null;

export default AdSpace;

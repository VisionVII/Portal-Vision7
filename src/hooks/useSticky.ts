import { useEffect, useRef, useState } from 'react';

interface UseStickyOptions {
  offset?: number;
  topBuffer?: number;
  bottomBuffer?: number;
}

export const useSticky = (options: UseStickyOptions = {}) => {
  const { offset = 0, topBuffer = 100, bottomBuffer = 100 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      // Disable sticky behavior on mobile/tablet viewports
      if (window.innerWidth < 1024) {
        if (isSticky) {
          setIsSticky(false);
          setTranslateY(0);
        }
        return;
      }

      const element = ref.current;
      const elementTop = element.getBoundingClientRect().top;
      const elementHeight = element.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;

      // Calculate if element should be sticky
      const shouldStick = elementTop - offset <= topBuffer;
      
      // Check if we've scrolled past the element
      const elementBottomScroll = scrollY + element.offsetTop + elementHeight;
      const viewportBottom = scrollY + windowHeight;
      const shouldUnstick = elementBottomScroll + bottomBuffer > viewportBottom;

      if (shouldStick && !shouldUnstick) {
        setIsSticky(true);
        // Calculate parallax offset - subtle movement
        setTranslateY(Math.min(scrollY * 0.1, 50));
      } else {
        setIsSticky(false);
        setTranslateY(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset, topBuffer, bottomBuffer]);

  return {
    ref,
    isSticky,
    style: {
      transform: `translateY(${translateY}px)`,
      transition: 'transform 0.3s ease-out',
    },
  };
};

export default useSticky;

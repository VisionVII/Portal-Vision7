import { useEffect, useRef } from 'react';

/** Runs `effect` `delayMs` after the last change to `deps`, skipping intermediate changes. */
export function useDebouncedEffect(effect: () => void, deps: unknown[], delayMs: number) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const timer = window.setTimeout(() => effectRef.current(), delayMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

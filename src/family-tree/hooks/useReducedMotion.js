import { useEffect, useState } from 'react';

/**
 * useReducedMotion
 * Live-tracks the user's prefers-reduced-motion setting.
 * Returns true when decorative motion should be disabled.
 */
export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return undefined;

    const handleChange = (event) => setIsReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isReducedMotion;
}

export default useReducedMotion;

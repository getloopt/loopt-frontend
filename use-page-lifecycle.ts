import { useEffect, useRef } from 'react';

export function usePageLifecycle() {
  const cleanup = useRef<(() => void)[]>([]);

  const addCleanup = (fn: () => void) => {
    cleanup.current.push(fn);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup.current.forEach(fn => fn());
    };

    const handlePageHide = () => {
      cleanup.current.forEach(fn => fn());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      cleanup.current.forEach(fn => fn());
    };
  }, []);

  return { addCleanup };
}
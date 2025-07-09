import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('🟢 Network: Back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('🔴 Network: Gone offline');
      setIsOnline(false);
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for network changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
} 
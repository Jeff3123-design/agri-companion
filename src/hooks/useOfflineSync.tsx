import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      toast.success('Back online! Syncing data...');
      
      // Trigger sync of failed requests
      window.dispatchEvent(new Event('online-sync'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      toast.info('You are offline. Using cached data.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, showOfflineBanner };
};

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { offlineStorage } from '@/lib/offline';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncQueuedRequests = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await offlineStorage.processQueuedRequests();
    } catch (error) {
      console.error('Error syncing queued requests:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      toast.success('Back online! Syncing data...', {
        icon: '🌐',
      });
      
      // Sync queued requests
      await syncQueuedRequests();
      
      // Trigger sync event for other components
      window.dispatchEvent(new Event('online-sync'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      toast.info('You are offline. Using cached data.', {
        icon: '📴',
        duration: 5000,
      });
    };

    // Set initial state
    if (!navigator.onLine) {
      setShowOfflineBanner(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueuedRequests]);

  return { isOnline, showOfflineBanner, isSyncing, syncQueuedRequests };
};

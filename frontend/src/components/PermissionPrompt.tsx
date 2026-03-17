import { useState, useEffect } from 'react';
import { Bell, MapPin, X, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PermissionState {
  notifications: 'prompt' | 'granted' | 'denied' | 'unsupported' | 'default';
  location: 'prompt' | 'granted' | 'denied' | 'unsupported';
}

export const PermissionPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: 'prompt',
    location: 'prompt',
  });
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  useEffect(() => {
    // Check if we've already shown the prompt
    const hasShownPrompt = localStorage.getItem('permissionPromptShown');
    
    // Check current permission states
    const checkPermissions = async () => {
      const notifStatus = !('Notification' in window) 
        ? 'unsupported' 
        : Notification.permission;
      
      let locationStatus: PermissionState['location'] = 'prompt';
      
      if ('permissions' in navigator) {
        try {
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' });
          locationStatus = geoPermission.state as PermissionState['location'];
        } catch {
          // Fallback for browsers that don't support geolocation permission query
          locationStatus = 'prompt';
        }
      }

      setPermissions({
        notifications: notifStatus as PermissionState['notifications'],
        location: locationStatus,
      });

      // Show prompt if any permission is still in 'prompt' state and we haven't shown it before
      if (!hasShownPrompt && (notifStatus === 'default' || locationStatus === 'prompt')) {
        // Delay showing the prompt for better UX
        setTimeout(() => setShowPrompt(true), 1500);
      }
    };

    checkPermissions();
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported on this device');
      return;
    }

    setIsRequesting('notifications');
    
    try {
      const permission = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notifications: permission as PermissionState['notifications'] }));
      
      if (permission === 'granted') {
        toast.success('Notifications enabled! You\'ll receive alerts for weather and growth stages.');
        // Save preference
        const prefs = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
        localStorage.setItem('notificationPreferences', JSON.stringify({ ...prefs, enabled: true }));
      } else {
        toast.info('Notifications denied. You can enable them later in settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    } finally {
      setIsRequesting(null);
    }
  };

  const requestLocationPermission = async () => {
    setIsRequesting('location');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      // Save location for later use
      localStorage.setItem('userLocation', JSON.stringify({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }));

      setPermissions(prev => ({ ...prev, location: 'granted' }));
      toast.success('Location enabled! Weather data will be fetched for your area.');
    } catch (error) {
      console.error('Error getting location:', error);
      setPermissions(prev => ({ ...prev, location: 'denied' }));
      toast.info('Location denied. You can enable it later in your browser settings.');
    } finally {
      setIsRequesting(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('permissionPromptShown', 'true');
    setShowPrompt(false);
  };

  const handleEnableAll = async () => {
    if (permissions.notifications === 'prompt' || permissions.notifications === 'default') {
      await requestNotificationPermission();
    }
    if (permissions.location === 'prompt') {
      await requestLocationPermission();
    }
    handleDismiss();
  };

  if (!showPrompt) return null;

  const needsNotifications = permissions.notifications === 'prompt' || permissions.notifications === 'default';
  const needsLocation = permissions.location === 'prompt';

  if (!needsNotifications && !needsLocation) {
    handleDismiss();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Wifi className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Enable App Features</CardTitle>
          </div>
          <CardDescription>
            Get the best experience with real-time weather alerts and location-based forecasts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsNotifications && permissions.notifications !== 'unsupported' && (
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Push Notifications</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Get alerts for weather changes, growth milestones, and daily task reminders.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={requestNotificationPermission}
                disabled={isRequesting === 'notifications'}
              >
                {isRequesting === 'notifications' ? 'Enabling...' : 'Enable'}
              </Button>
            </div>
          )}

          {needsLocation && (
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Location Access</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically fetch accurate weather and GDU data for your farm location.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocationPermission}
                disabled={isRequesting === 'location'}
              >
                {isRequesting === 'location' ? 'Enabling...' : 'Enable'}
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1"
              onClick={handleEnableAll}
              disabled={isRequesting !== null}
            >
              Enable All
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can change these settings anytime in the Settings page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

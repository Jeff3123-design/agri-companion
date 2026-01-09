import { WifiOff, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const OfflineBanner = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Check if we're actually online now
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current_weather=true', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      if (response.ok) {
        // We're back online, trigger the online event
        window.dispatchEvent(new Event('online'));
      }
    } catch {
      // Still offline
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Alert className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 shadow-lg">
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <div className="flex-1">
        <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm font-medium">
          You're Offline
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs mt-1">
          Using cached data. Some features may be limited until you're back online.
        </AlertDescription>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 h-7 px-2 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
        onClick={handleRetry}
        disabled={isRetrying}
      >
        {isRetrying ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </>
        )}
      </Button>
    </Alert>
  );
};

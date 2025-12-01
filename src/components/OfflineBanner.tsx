import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const OfflineBanner = () => {
  return (
    <Alert className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-yellow-50 border-yellow-200">
      <WifiOff className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800 text-sm">
        You're offline. Using cached data. Some features may be limited.
      </AlertDescription>
    </Alert>
  );
};

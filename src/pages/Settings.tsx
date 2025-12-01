import { useState, useEffect } from "react";
import { Save, MapPin, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Settings = () => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Load saved config
    const saved = localStorage.getItem('backendConfig');
    if (saved) {
      const config = JSON.parse(saved);
      setApiUrl(config.apiUrl || "");
      setApiKey(config.apiKey || "");
    }

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const handleSave = () => {
    const config = { apiUrl, apiKey };
    localStorage.setItem('backendConfig', JSON.stringify(config));
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure your backend connection and app preferences
          </p>
        </div>

        {/* Backend Configuration */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Backend Configuration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiUrl">Backend API URL</Label>
              <Input
                id="apiUrl"
                type="url"
                placeholder="https://your-backend-api.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your Python backend API URL
              </p>
            </div>

            <div>
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Authentication key for your backend
              </p>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </Card>

        {/* Location Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Location</h3>
          </div>
          
          {location ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Latitude: <span className="font-medium text-foreground">{location.lat.toFixed(6)}</span>
              </p>
              <p className="text-muted-foreground">
                Longitude: <span className="font-medium text-foreground">{location.lon.toFixed(6)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Location is automatically detected for weather data
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enable location services to get weather data for your farm
            </p>
          )}
        </Card>

        {/* API Endpoints Info */}
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold text-foreground mb-3">Expected Backend Endpoints</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">POST /weather</p>
              <p className="text-xs text-muted-foreground">Body: {`{ latitude, longitude }`}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">POST /pest-disease/analyze</p>
              <p className="text-xs text-muted-foreground">Body: FormData with image file</p>
            </div>
            <div>
              <p className="font-medium text-foreground">POST /yield/predict</p>
              <p className="text-xs text-muted-foreground">Body: {`{ currentDay, weatherConditions, pestStatus }`}</p>
            </div>
          </div>
        </Card>

        {/* App Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Farm Buddy AI v1.0</p>
          <p className="mt-1">Powered by AI & Built for Farmers</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;

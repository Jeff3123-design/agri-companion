import { useEffect, useState } from "react";
import { CloudSun, Droplets, Wind, MapPin, Loader2, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchWeather } from "@/lib/api";
import { WeatherData } from "@/types/farm";
import { toast } from "sonner";

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData & { cached?: boolean; cacheAge?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Get user location
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
          toast.error("Unable to get your location. Please enable location services.");
        }
      );
    }
  }, []);

  useEffect(() => {
    if (location) {
      loadWeather();
    }
  }, [location]);

  const loadWeather = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      const data = await fetchWeather(location.lat, location.lon);
      setWeather(data);
    } catch (error) {
      console.error("Weather fetch error:", error);
      toast.error("Failed to load weather data. Please check your backend configuration.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-sky">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="p-6 bg-gradient-sky">
        <div className="text-center text-muted-foreground">
          <CloudSun className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Weather data will appear here</p>
          <p className="text-xs mt-1">Configure backend in Settings</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-sky border-none shadow-elevated">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <MapPin className="w-4 h-4" />
            <span>{weather.location}</span>
            {weather.cached && (
              <Badge variant="outline" className="ml-2 text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                Cached {weather.cacheAge ? `${Math.round(weather.cacheAge)}h ago` : ''}
              </Badge>
            )}
          </div>
          <h3 className="text-3xl font-bold text-foreground">{weather.temperature}°C</h3>
          <p className="text-muted-foreground capitalize">{weather.condition}</p>
        </div>
        <CloudSun className="w-12 h-12 text-accent" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-muted-foreground">Humidity</p>
            <p className="font-semibold">{weather.humidity}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-xs text-muted-foreground">Forecast</p>
            <p className="font-semibold text-sm">{weather.forecast}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

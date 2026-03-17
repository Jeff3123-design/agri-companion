import { useEffect, useState } from "react";
import { CloudSun, Droplets, Wind, MapPin, Loader2, Calendar, Sun, CloudRain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchWeather } from "@/lib/api";
import { WeatherData } from "@/types/farm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WeatherForecast } from "@/components/WeatherForecast";
import { useGDUSession } from "@/hooks/useGDUSession";
import { supabase } from "@/integrations/supabase/client";

const Weather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const { session } = useGDUSession(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
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
  };

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
    } catch (error: any) {
      console.error("Weather fetch error:", error);
      toast.error(error.message || "Failed to load weather data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Weather Forecast</h1>
          <p className="text-muted-foreground">
            Location-based weather data for your farm
          </p>
        </div>

        {!weather ? (
          <Card className="p-12 text-center">
            <CloudSun className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Weather Data</h3>
            <p className="text-muted-foreground mb-4">
              Enable location services to view weather information
            </p>
            <Button onClick={getLocation}>
              Enable Location
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current Weather */}
            <Card className="p-8 bg-gradient-sky border-none shadow-elevated">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{weather.location}</span>
                </div>
                <Button variant="outline" size="sm" onClick={loadWeather}>
                  Refresh
                </Button>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-6xl font-bold text-foreground mb-2">
                    {weather.temperature}°C
                  </div>
                  <p className="text-xl text-muted-foreground capitalize mb-4">
                    {weather.condition}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {weather.forecast}
                  </p>
                </div>
                <CloudSun className="w-24 h-24 text-accent" />
              </div>

              <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Droplets className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Humidity</p>
                    <p className="text-2xl font-bold text-foreground">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gray-500/10 rounded-lg">
                    <Wind className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conditions</p>
                    <p className="text-lg font-semibold text-foreground capitalize">
                      {weather.condition}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 7-Day Forecast with GDU */}
            {location && (
              <WeatherForecast 
                latitude={location.lat} 
                longitude={location.lon}
                accumulatedGDU={session?.accumulated_gdu || 0}
              />
            )}

            {/* Farming Advice */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                <Sun className="w-5 h-5 text-accent" />
                Farming Advice
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Today's Recommendation</p>
                    <p className="text-sm text-muted-foreground">
                      {weather.temperature > 30 
                        ? "High temperature detected. Ensure adequate irrigation and monitor for heat stress."
                        : weather.humidity > 70
                        ? "High humidity may increase disease risk. Check crops for fungal infections."
                        : "Good conditions for farming activities. Continue with scheduled tasks."}
                    </p>
                  </div>
                </div>

                {weather.condition.toLowerCase().includes('rain') && (
                  <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <CloudRain className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-1">Rain Expected</p>
                      <p className="text-sm text-muted-foreground">
                        Postpone fertilizer application and avoid field operations during wet conditions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Weather;

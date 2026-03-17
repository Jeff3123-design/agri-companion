import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind, Thermometer, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateDailyGDU } from "@/lib/gdu";

interface ForecastDay {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  condition: string;
  estimatedGDU: number;
}

interface WeatherForecastProps {
  latitude: number;
  longitude: number;
  accumulatedGDU?: number;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code <= 3) return Cloud;
  if (code <= 49) return Cloud;
  if (code <= 69) return CloudRain;
  if (code <= 79) return CloudSnow;
  if (code <= 94) return CloudRain;
  return CloudLightning;
};

const getCondition = (code: number): string => {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rainy";
  if (code <= 79) return "Snowy";
  if (code <= 84) return "Showers";
  if (code >= 95) return "Storms";
  return "Variable";
};

export const WeatherForecast = ({ latitude, longitude, accumulatedGDU = 0 }: WeatherForecastProps) => {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFutureGDU, setTotalFutureGDU] = useState(0);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`
        );

        if (!response.ok) throw new Error("Failed to fetch forecast");

        const data = await response.json();
        const days: ForecastDay[] = [];
        let futureGDU = 0;

        for (let i = 0; i < 7; i++) {
          const date = new Date(data.daily.time[i]);
          const tempMax = data.daily.temperature_2m_max[i];
          const tempMin = data.daily.temperature_2m_min[i];
          const weatherCode = data.daily.weather_code[i];
          const gdu = calculateDailyGDU(tempMax, tempMin);
          
          futureGDU += gdu;

          days.push({
            date: data.daily.time[i],
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            tempMax: Math.round(tempMax),
            tempMin: Math.round(tempMin),
            weatherCode,
            condition: getCondition(weatherCode),
            estimatedGDU: gdu,
          });
        }

        setForecast(days);
        setTotalFutureGDU(futureGDU);
      } catch (error) {
        console.error("Forecast error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchForecast();
    }
  }, [latitude, longitude]);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </Card>
    );
  }

  const projectedTotal = accumulatedGDU + totalFutureGDU;

  return (
    <Card className="p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">7-Day Weather Forecast</h3>
          <p className="text-sm text-muted-foreground">Predicted temperatures & GDU accumulation</p>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            +{Math.round(totalFutureGDU)} GDU (7 days)
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Projected total: {Math.round(projectedTotal)} GDU
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {forecast.map((day, index) => {
          const Icon = getWeatherIcon(day.weatherCode);
          const isToday = index === 0;
          
          return (
            <div
              key={day.date}
              className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                isToday 
                  ? 'bg-primary/10 ring-2 ring-primary/30' 
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              {isToday && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                  Today
                </span>
              )}
              
              <span className="text-xs font-medium text-muted-foreground mb-2">
                {day.dayName}
              </span>
              
              <Icon className={`w-8 h-8 mb-2 ${
                day.weatherCode === 0 ? 'text-amber-500' :
                day.weatherCode <= 3 ? 'text-slate-400' :
                day.weatherCode <= 69 ? 'text-blue-400' :
                'text-slate-500'
              }`} />
              
              <span className="text-xs text-muted-foreground">{day.condition}</span>
              
              <div className="flex items-center gap-1 mt-2">
                <Thermometer className="w-3 h-3 text-destructive" />
                <span className="text-sm font-semibold text-foreground">{day.tempMax}°</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-muted-foreground">{day.tempMin}°</span>
              </div>
              
              <div className="mt-2 pt-2 border-t border-border/50 w-full text-center">
                <span className="text-xs font-medium text-primary">
                  +{Math.round(day.estimatedGDU)} GDU
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current accumulated GDU</span>
          <span className="font-semibold text-foreground">{Math.round(accumulatedGDU)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Estimated 7-day addition</span>
          <span className="font-semibold text-primary">+{Math.round(totalFutureGDU)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Projected total in 7 days</span>
          <span className="font-bold text-foreground">{Math.round(projectedTotal)}</span>
        </div>
      </div>
    </Card>
  );
};

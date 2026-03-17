import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Leaf
} from "lucide-react";
import { WeatherData } from "@/types/farm";
import { dayTasksData } from "@/data/maizeTasks";

interface WeatherRecommendationsProps {
  weather: WeatherData | null;
  currentDay: number;
}

interface Recommendation {
  type: "warning" | "tip" | "skip" | "priority";
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const WeatherRecommendations = ({ weather, currentDay }: WeatherRecommendationsProps) => {
  const todayTasks = dayTasksData.find((t) => t.day === currentDay);

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("rain") || lower.includes("storm")) return <CloudRain className="h-5 w-5 text-blue-500" />;
    if (lower.includes("cloud")) return <Cloud className="h-5 w-5 text-gray-500" />;
    return <Sun className="h-5 w-5 text-yellow-500" />;
  };

  const generateRecommendations = (): Recommendation[] => {
    if (!weather) return [];

    const recommendations: Recommendation[] = [];
    const { temperature, humidity, condition } = weather;
    const conditionLower = condition.toLowerCase();
    const isRainy = conditionLower.includes("rain") || conditionLower.includes("storm");
    const isHot = temperature > 35;
    const isCold = temperature < 15;
    const isHighHumidity = humidity > 80;
    const isLowHumidity = humidity < 40;

    // Rain-based recommendations
    if (isRainy) {
      recommendations.push({
        type: "skip",
        icon: <CloudRain className="h-4 w-4" />,
        title: "Skip Irrigation Today",
        description: "Natural rainfall will provide sufficient moisture. Save water and let nature do the work.",
      });

      if (todayTasks?.tasks.some((t) => t.toLowerCase().includes("spray") || t.toLowerCase().includes("pesticide"))) {
        recommendations.push({
          type: "warning",
          icon: <AlertTriangle className="h-4 w-4" />,
          title: "Postpone Spraying",
          description: "Rain will wash away pesticides and fertilizers. Wait for dry conditions for effective application.",
        });
      }

      recommendations.push({
        type: "tip",
        icon: <Droplets className="h-4 w-4" />,
        title: "Check Drainage",
        description: "Ensure proper field drainage to prevent waterlogging and root damage.",
      });
    }

    // Temperature-based recommendations
    if (isHot) {
      recommendations.push({
        type: "priority",
        icon: <Thermometer className="h-4 w-4" />,
        title: "Early Morning Work",
        description: "High temperatures expected. Complete field tasks before 10 AM to avoid heat stress.",
      });

      recommendations.push({
        type: "tip",
        icon: <Droplets className="h-4 w-4" />,
        title: "Increase Irrigation",
        description: "Hot weather increases water demand. Consider additional evening irrigation if soil is dry.",
      });
    }

    if (isCold) {
      recommendations.push({
        type: "warning",
        icon: <Thermometer className="h-4 w-4" />,
        title: "Cold Weather Alert",
        description: "Low temperatures may slow crop growth. Monitor for signs of frost damage on young plants.",
      });
    }

    // Humidity-based recommendations
    if (isHighHumidity && !isRainy) {
      recommendations.push({
        type: "warning",
        icon: <Leaf className="h-4 w-4" />,
        title: "Disease Risk High",
        description: "High humidity increases fungal disease risk. Inspect crops for signs of leaf blight or rust.",
      });
    }

    if (isLowHumidity && isHot) {
      recommendations.push({
        type: "priority",
        icon: <Wind className="h-4 w-4" />,
        title: "Water Stress Risk",
        description: "Low humidity with high heat may cause wilting. Check soil moisture levels and irrigate if needed.",
      });
    }

    // Good conditions
    if (!isRainy && !isHot && !isCold && humidity >= 40 && humidity <= 70) {
      recommendations.push({
        type: "tip",
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "Ideal Conditions",
        description: "Weather is optimal for all farming activities. Great day to complete pending tasks!",
      });

      if (todayTasks?.tasks.some((t) => t.toLowerCase().includes("spray") || t.toLowerCase().includes("fertiliz"))) {
        recommendations.push({
          type: "priority",
          icon: <Clock className="h-4 w-4" />,
          title: "Perfect for Spraying",
          description: "Calm, dry conditions are ideal for pesticide or fertilizer application.",
        });
      }
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "warning": return "destructive";
      case "priority": return "default";
      case "skip": return "secondary";
      default: return "outline";
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case "warning": return "Warning";
      case "priority": return "Priority";
      case "skip": return "Skip Task";
      default: return "Tip";
    }
  };

  if (!weather) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-primary" />
            Weather Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Weather data not available. Enable location services to get personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {getWeatherIcon(weather.condition)}
          Weather-Based Recommendations
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Thermometer className="h-4 w-4" />
            {weather.temperature}°C
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-4 w-4" />
            {weather.humidity}%
          </span>
          <span>{weather.condition}</span>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No specific recommendations for current conditions.
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="mt-0.5 text-muted-foreground">{rec.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{rec.title}</span>
                    <Badge variant={getBadgeVariant(rec.type)} className="text-xs">
                      {getBadgeLabel(rec.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

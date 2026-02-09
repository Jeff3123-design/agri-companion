import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CloudRain, Thermometer, Wind, X, Bell, BellOff } from "lucide-react";
import { WeatherData } from "@/types/farm";
import { toast } from "sonner";

interface WeatherAlertsProps {
  weather: WeatherData | null;
}

interface WeatherAlert {
  id: string;
  type: "extreme_heat" | "extreme_cold" | "heavy_rain" | "drought" | "storm" | "frost";
  severity: "warning" | "danger";
  title: string;
  message: string;
  icon: React.ReactNode;
  actions: string[];
}

export const WeatherAlerts = ({ weather }: WeatherAlertsProps) => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (!weather) return;

    const newAlerts: WeatherAlert[] = [];

    // Extreme heat alert (>35°C)
    if (weather.temperature > 35) {
      newAlerts.push({
        id: "extreme_heat",
        type: "extreme_heat",
        severity: "danger",
        title: "Extreme Heat Warning",
        message: `Temperature is ${weather.temperature}°C. Crops may experience heat stress.`,
        icon: <Thermometer className="h-5 w-5 text-red-500" />,
        actions: [
          "Increase irrigation frequency",
          "Apply mulch to retain soil moisture",
          "Provide shade if possible",
          "Avoid fertilizer application",
        ],
      });
    }
    // High temperature alert (30-35°C)
    else if (weather.temperature > 30) {
      newAlerts.push({
        id: "high_heat",
        type: "extreme_heat",
        severity: "warning",
        title: "High Temperature Alert",
        message: `Temperature is ${weather.temperature}°C. Monitor crops for water stress.`,
        icon: <Thermometer className="h-5 w-5 text-orange-500" />,
        actions: [
          "Water crops during cooler hours",
          "Check soil moisture regularly",
          "Consider additional irrigation",
        ],
      });
    }

    // Cold/Frost alert (<10°C)
    if (weather.temperature < 10) {
      newAlerts.push({
        id: "cold",
        type: weather.temperature < 5 ? "frost" : "extreme_cold",
        severity: weather.temperature < 5 ? "danger" : "warning",
        title: weather.temperature < 5 ? "Frost Warning" : "Low Temperature Alert",
        message: `Temperature is ${weather.temperature}°C. ${weather.temperature < 5 ? "Frost damage risk is high." : "Crop growth may slow."}`,
        icon: <Thermometer className="h-5 w-5 text-blue-500" />,
        actions: [
          "Cover young plants if frost expected",
          "Avoid irrigation in evening",
          "Delay planting activities",
          weather.temperature < 5 ? "Use frost protection methods" : "Monitor overnight temperatures",
        ],
      });
    }

    // Heavy rain/storm alerts
    const condition = weather.condition.toLowerCase();
    if (condition.includes("storm") || condition.includes("thunder")) {
      newAlerts.push({
        id: "storm",
        type: "storm",
        severity: "danger",
        title: "Storm Warning",
        message: "Severe weather conditions detected. Take protective measures.",
        icon: <CloudRain className="h-5 w-5 text-purple-500" />,
        actions: [
          "Secure loose equipment",
          "Check drainage systems",
          "Postpone field work",
          "Inspect crops after storm passes",
        ],
      });
    } else if (condition.includes("rain") || condition.includes("shower")) {
      newAlerts.push({
        id: "rain",
        type: "heavy_rain",
        severity: "warning",
        title: "Rain Alert",
        message: "Rain expected. Adjust your farming activities accordingly.",
        icon: <CloudRain className="h-5 w-5 text-blue-500" />,
        actions: [
          "Skip irrigation today",
          "Delay pesticide application",
          "Good time for transplanting",
          "Check field drainage",
        ],
      });
    }

    // High humidity alert (>85%)
    if (weather.humidity > 85) {
      newAlerts.push({
        id: "humidity",
        type: "heavy_rain",
        severity: "warning",
        title: "High Humidity Alert",
        message: `Humidity is ${weather.humidity}%. Disease risk increased.`,
        icon: <Wind className="h-5 w-5 text-teal-500" />,
        actions: [
          "Monitor for fungal diseases",
          "Improve air circulation",
          "Consider preventive fungicide",
          "Avoid overhead irrigation",
        ],
      });
    }

    // Low humidity/drought risk (<30%)
    if (weather.humidity < 30) {
      newAlerts.push({
        id: "drought",
        type: "drought",
        severity: "warning",
        title: "Drought Risk Alert",
        message: `Humidity is only ${weather.humidity}%. Drought conditions possible.`,
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        actions: [
          "Increase watering frequency",
          "Apply mulch to conserve moisture",
          "Consider drip irrigation",
          "Monitor plant wilting",
        ],
      });
    }

    setAlerts(newAlerts);

    // Show push notification for severe alerts
    if (notificationsEnabled && newAlerts.some((a) => a.severity === "danger")) {
      const severeAlert = newAlerts.find((a) => a.severity === "danger");
      if (severeAlert && "Notification" in window && Notification.permission === "granted") {
        new Notification(severeAlert.title, {
          body: severeAlert.message,
          icon: "/pwa-192x192.png",
        });
      }
    }
  }, [weather, notificationsEnabled]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => [...prev, alertId]);
  };

  const enableNotifications = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Weather alerts notifications enabled!");
      } else {
        toast.error("Notification permission denied");
      }
    }
  };

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  if (!weather) return null;

  return (
    <div className="space-y-3">
      {/* Notification Toggle */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Weather Alerts</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={notificationsEnabled ? () => setNotificationsEnabled(false) : enableNotifications}
          className="h-8 px-2"
        >
          {notificationsEnabled ? (
            <>
              <Bell className="h-4 w-4 mr-1 text-primary" />
              <span className="text-xs">On</span>
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-1" />
              <span className="text-xs">Off</span>
            </>
          )}
        </Button>
      </div>

      {visibleAlerts.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
          <p className="text-sm">No weather alerts at this time</p>
          <p className="text-xs mt-1">Current conditions are favorable for farming</p>
        </div>
      ) : (
        visibleAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.severity === "danger" ? "destructive" : "default"}
            className={`relative ${
              alert.severity === "danger"
                ? "bg-destructive/10 border-destructive/50"
                : "bg-amber-500/10 border-amber-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              {alert.icon}
              <div className="flex-1">
                <AlertTitle className="flex items-center justify-between">
                  {alert.title}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mr-2 -mt-1"
                    onClick={() => dismissAlert(alert.id)}
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertTitle>
                <AlertDescription className="mt-1">
                  <p className="mb-2">{alert.message}</p>
                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">Recommended Actions:</p>
                    <ul className="text-xs space-y-1">
                      {alert.actions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))
      )}
    </div>
  );
};

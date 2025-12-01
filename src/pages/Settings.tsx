import { useState, useEffect } from "react";
import { Save, MapPin, Server, Bell, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { CustomReminder } from "@/lib/notifications";

const Settings = () => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [newReminder, setNewReminder] = useState({ title: '', day: '', time: '09:00' });
  
  const { preferences, permissionStatus, enableNotifications, updatePreferences } = useNotifications();

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

  const handleEnableNotifications = async () => {
    const success = await enableNotifications();
    if (success) {
      toast.success("Notifications enabled!");
    } else {
      toast.error("Failed to enable notifications. Please check browser permissions.");
    }
  };

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.day) {
      toast.error("Please fill in all reminder fields");
      return;
    }

    const reminder: CustomReminder = {
      id: Date.now().toString(),
      title: newReminder.title,
      day: parseInt(newReminder.day),
      time: newReminder.time,
      enabled: true,
    };

    updatePreferences({
      customReminders: [...preferences.customReminders, reminder],
    });

    setNewReminder({ title: '', day: '', time: '09:00' });
    toast.success("Reminder added!");
  };

  const handleDeleteReminder = (id: string) => {
    updatePreferences({
      customReminders: preferences.customReminders.filter(r => r.id !== id),
    });
    toast.success("Reminder deleted");
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

        {/* Notifications */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Push Notifications</h3>
            <Badge variant={permissionStatus === 'granted' ? 'default' : 'secondary'}>
              {permissionStatus}
            </Badge>
          </div>

          {permissionStatus !== 'granted' && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Enable notifications to get daily task reminders, weather alerts, and growth milestones.
              </p>
              <Button onClick={handleEnableNotifications} size="sm" className="w-full">
                Enable Notifications
              </Button>
            </div>
          )}

          {permissionStatus === 'granted' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dailyTasks">Daily Task Reminders</Label>
                <Switch
                  id="dailyTasks"
                  checked={preferences.dailyTaskReminders}
                  onCheckedChange={(checked) => 
                    updatePreferences({ dailyTaskReminders: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="weatherAlerts">Weather Alerts</Label>
                <Switch
                  id="weatherAlerts"
                  checked={preferences.weatherAlerts}
                  onCheckedChange={(checked) => 
                    updatePreferences({ weatherAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="milestones">Growth Milestones</Label>
                <Switch
                  id="milestones"
                  checked={preferences.growthMilestones}
                  onCheckedChange={(checked) => 
                    updatePreferences({ growthMilestones: checked })
                  }
                />
              </div>

              {/* Custom Reminders */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Custom Reminders</h4>
                
                <div className="space-y-2 mb-3">
                  <Input
                    placeholder="Reminder title"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Day (1-120)"
                      min="1"
                      max="120"
                      value={newReminder.day}
                      onChange={(e) => setNewReminder({ ...newReminder, day: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddReminder} size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Reminder
                  </Button>
                </div>

                {preferences.customReminders.length > 0 && (
                  <div className="space-y-2">
                    {preferences.customReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Day {reminder.day} at {reminder.time}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReminder(reminder.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

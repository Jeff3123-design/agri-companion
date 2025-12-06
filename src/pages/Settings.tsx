import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Bell, Plus, Trash2, User, Ruler, Phone, Save, Loader2, LogOut, Calendar, AlertTriangle, Leaf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { useGDUSession } from "@/hooks/useGDUSession";
import { CustomReminder } from "@/lib/notifications";
import { format } from "date-fns";

const Settings = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [newReminder, setNewReminder] = useState({ title: '', gdu: '', time: '09:00' });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    farm_location: "",
    farm_size: "",
    contact_info: "",
  });
  
  const { preferences, permissionStatus, enableNotifications, updatePreferences } = useNotifications();
  const { session: gduSession, hasActiveSession, endFarmCycle } = useGDUSession(userId || undefined);

  useEffect(() => {
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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          farm_location: data.farm_location || "",
          farm_size: data.farm_size || "",
          contact_info: data.contact_info || "",
        });
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        farm_location: profile.farm_location,
        farm_size: profile.farm_size,
        contact_info: profile.contact_info,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update profile. Please try again.");
    } else {
      toast.success("Your profile has been updated.");
    }
    setSaving(false);
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
    if (!newReminder.title || !newReminder.gdu) {
      toast.error("Please fill in all reminder fields");
      return;
    }

    const reminder: CustomReminder = {
      id: Date.now().toString(),
      title: newReminder.title,
      day: parseInt(newReminder.gdu), // Using day field to store GDU threshold
      time: newReminder.time,
      enabled: true,
    };

    updatePreferences({
      customReminders: [...preferences.customReminders, reminder],
    });

    setNewReminder({ title: '', gdu: '', time: '09:00' });
    toast.success("Reminder added!");
  };

  const handleDeleteReminder = (id: string) => {
    updatePreferences({
      customReminders: preferences.customReminders.filter(r => r.id !== id),
    });
    toast.success("Reminder deleted");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    toast.error("Account deletion requires contacting support. Please reach out to us.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, farm, and app preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="farm">Farm</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_info">Contact Information</Label>
                    <Input
                      id="contact_info"
                      value={profile.contact_info}
                      onChange={(e) => setProfile({ ...profile, contact_info: e.target.value })}
                      placeholder="Phone number or email"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Farm Tab */}
          <TabsContent value="farm" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  Farm Details
                </CardTitle>
                <CardDescription>
                  Update your farm information for personalized recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="farm_location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Farm Location
                    </Label>
                    <Input
                      id="farm_location"
                      value={profile.farm_location}
                      onChange={(e) => setProfile({ ...profile, farm_location: e.target.value })}
                      placeholder="e.g., Nakuru, Kenya"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="farm_size" className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      Farm Size
                    </Label>
                    <Input
                      id="farm_size"
                      value={profile.farm_size}
                      onChange={(e) => setProfile({ ...profile, farm_size: e.target.value })}
                      placeholder="e.g., 5 acres"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Farm Details
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Detected Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Latitude: <span className="font-medium text-foreground">{location.lat.toFixed(6)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Longitude: <span className="font-medium text-foreground">{location.lon.toFixed(6)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Used for weather data and GDU calculations
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enable location services to get weather data for your farm
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Farm Cycle Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Farm Cycle Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasActiveSession && gduSession ? (
                  <>
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Stage</span>
                        <Badge>{gduSession.current_stage}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Planting Date</span>
                        <span className="font-medium">
                          {gduSession.planting_date ? format(new Date(gduSession.planting_date), "MMM d, yyyy") : "Not set"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Accumulated GDU</span>
                        <span className="font-medium">{Number(gduSession.accumulated_gdu).toFixed(1)}</span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10">
                          End Current Farm Cycle
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>End Farm Cycle?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark your current farm cycle as complete. You can start a new cycle afterwards.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={endFarmCycle}>End Cycle</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No active farm cycle</p>
                    <Button onClick={() => navigate("/dashboard")}>
                      <Leaf className="mr-2 h-4 w-4" />
                      Start New Cycle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <Badge variant={permissionStatus === 'granted' ? 'default' : 'secondary'} className="ml-2">
                  {permissionStatus}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {permissionStatus !== 'granted' && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      Enable notifications to get task reminders, weather alerts, and growth milestones.
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
                      <Label htmlFor="milestones">Growth Stage Alerts</Label>
                      <Switch
                        id="milestones"
                        checked={preferences.growthMilestones}
                        onCheckedChange={(checked) => 
                          updatePreferences({ growthMilestones: checked })
                        }
                      />
                    </div>

                    <Separator />

                    {/* Custom Reminders */}
                    <div>
                      <h4 className="font-medium mb-3">Custom GDU Reminders</h4>
                      
                      <div className="space-y-2 mb-3">
                        <Input
                          placeholder="Reminder title"
                          value={newReminder.title}
                          onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="GDU threshold"
                            min="0"
                            max="3000"
                            value={newReminder.gdu}
                            onChange={(e) => setNewReminder({ ...newReminder, gdu: e.target.value })}
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
                                  At {reminder.day} GDU, {reminder.time}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>

                <Separator />

                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* App Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Farm Buddy AI v2.0</p>
              <p className="mt-1">GDU-Based Growth Tracking</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
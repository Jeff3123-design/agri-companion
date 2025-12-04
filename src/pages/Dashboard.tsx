import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DayProgress } from "@/components/DayProgress";
import { TaskList } from "@/components/TaskList";
import { WeatherWidget } from "@/components/WeatherWidget";
import { TaskNotes } from "@/components/TaskNotes";
import { CropPhotoGallery } from "@/components/CropPhotoGallery";
import { WeatherRecommendations } from "@/components/WeatherRecommendations";
import { maizeTasks } from "@/data/maizeTasks";
import { useFarmingSession } from "@/hooks/useFarmingSession";
import { useTaskCompletions } from "@/hooks/useTaskCompletions";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { fetchWeather } from "@/lib/api";
import { WeatherData } from "@/types/farm";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const { sendTaskReminder } = useEmailNotifications();

  // Fetch weather data for recommendations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const data = await fetchWeather(position.coords.latitude, position.coords.longitude);
          if (data) setWeather(data);
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setSession(session);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { session: farmingSession, loading: sessionLoading } = useFarmingSession(user?.id);
  const { completedTasks, loading: tasksLoading, toggleTaskCompletion } = useTaskCompletions(
    farmingSession?.id,
    farmingSession?.current_day || 1
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSendTaskEmail = async () => {
    if (!user || !profile) return;
    setSendingEmail(true);
    try {
      await sendTaskReminder(user.email, profile.full_name || "Farmer", {
        day: currentDay,
        tasks: todaysTasks.map((t) => t.title),
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (!user || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentDay = farmingSession?.current_day || 1;
  const todaysTasks = maizeTasks.filter(
    (task) => task.day === currentDay
  );

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome back, {profile?.full_name || user.email}!
              </h1>
              <p className="text-muted-foreground">
                Your intelligent maize farming companion
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          {profile && (
            <div className="bg-card border rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Your Farm Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {profile.farm_location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span> {profile.farm_location}
                  </div>
                )}
                {profile.farm_size && (
                  <div>
                    <span className="text-muted-foreground">Size:</span> {profile.farm_size}
                  </div>
                )}
                {profile.contact_info && (
                  <div>
                    <span className="text-muted-foreground">Contact:</span> {profile.contact_info}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="grid gap-6 mb-6">
          <DayProgress currentDay={currentDay} totalDays={120} />
          <WeatherWidget />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Today's Tasks</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTaskEmail}
            disabled={sendingEmail || todaysTasks.length === 0}
          >
            {sendingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Mail className="h-4 w-4 mr-1" />
            )}
            Email Tasks
          </Button>
        </div>

        <TaskList 
          tasks={todaysTasks}
          completedTasks={completedTasks}
          onToggleTask={(taskId) => toggleTaskCompletion(taskId, user.id)}
          loading={tasksLoading}
        />

        <div className="mt-6">
          <WeatherRecommendations weather={weather} currentDay={currentDay} />
        </div>

        {farmingSession && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TaskNotes
              sessionId={farmingSession.id}
              userId={user.id}
              currentDay={currentDay}
            />
            <CropPhotoGallery
              userId={user.id}
              sessionId={farmingSession.id}
              currentDay={currentDay}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WeatherWidget } from "@/components/WeatherWidget";
import { WeatherRecommendations } from "@/components/WeatherRecommendations";
import { WeatherAlerts } from "@/components/WeatherAlerts";
import { GDUDashboard } from "@/components/GDUDashboard";
import { StartFarmCycle } from "@/components/StartFarmCycle";
import { CropPhotoGallery } from "@/components/CropPhotoGallery";
import { TaskNotes } from "@/components/TaskNotes";
import { PhotoComparison } from "@/components/PhotoComparison";
import { useGDUSession } from "@/hooks/useGDUSession";
import { fetchWeather } from "@/lib/api";
import { WeatherData } from "@/types/farm";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Loader2 } from "lucide-react";
import { getGrowthStage, getDaysSincePlanting } from "@/lib/gdu";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isStarting, setIsStarting] = useState(false);

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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { 
    session: gduSession, 
    dailyRecords, 
    loading: sessionLoading, 
    hasActiveSession,
    location,
    isAutoFetching,
    startFarmCycle,
    addDailyGDU,
    autoFetchTodayGDU,
  } = useGDUSession(user?.id);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleStartCycle = async (plantingDate: Date) => {
    setIsStarting(true);
    await startFarmCycle(plantingDate);
    setIsStarting(false);
  };

  if (!user || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStage = gduSession ? getGrowthStage(Number(gduSession.accumulated_gdu)) : null;
  const daysSincePlanting = gduSession?.planting_date ? getDaysSincePlanting(gduSession.planting_date) : 0;

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
                GDU-based maize growth tracking
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Show Start Farm Cycle if no active session */}
        {!hasActiveSession ? (
          <StartFarmCycle onStart={handleStartCycle} isLoading={isStarting} />
        ) : gduSession ? (
          <>
            {/* Weather Section */}
            <div className="grid gap-6 lg:grid-cols-2 mb-6">
              <WeatherWidget />
              <WeatherAlerts weather={weather} />
            </div>

            {/* GDU Dashboard */}
            <GDUDashboard 
              session={gduSession} 
              dailyRecords={dailyRecords}
              onAddGDU={addDailyGDU}
              onAutoFetchGDU={autoFetchTodayGDU}
              isAutoFetching={isAutoFetching}
              hasLocation={!!location}
            />

            {/* Weather Recommendations */}
            <div className="mt-6">
              <WeatherRecommendations weather={weather} currentDay={daysSincePlanting + 1} />
            </div>

            {/* Notes and Photos */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <TaskNotes
                sessionId={gduSession.id}
                userId={user.id}
                currentDay={daysSincePlanting + 1}
              />
              <CropPhotoGallery
                userId={user.id}
                sessionId={gduSession.id}
                currentDay={daysSincePlanting + 1}
              />
            </div>

            {/* Photo Comparison */}
            <div className="mt-6">
              <PhotoComparison sessionId={gduSession.id} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;
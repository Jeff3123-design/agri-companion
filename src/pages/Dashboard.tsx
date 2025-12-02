import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DayProgress } from "@/components/DayProgress";
import { TaskList } from "@/components/TaskList";
import { WeatherWidget } from "@/components/WeatherWidget";
import { maizeTasks } from "@/data/maizeTasks";
import { useFarmingSession } from "@/hooks/useFarmingSession";
import { useTaskCompletions } from "@/hooks/useTaskCompletions";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

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

        <TaskList 
          tasks={todaysTasks}
          completedTasks={completedTasks}
          onToggleTask={(taskId) => toggleTaskCompletion(taskId, user.id)}
          loading={tasksLoading}
        />
      </div>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFarmingSession } from "@/hooks/useFarmingSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { maizeTasks } from "@/data/maizeTasks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExportButton } from "@/components/ExportButton";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<DayCompletion[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const { session, loading: sessionLoading } = useFarmingSession(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        // Fetch profile for export
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData) setProfile(profileData);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchCompletions = async () => {
      if (!session?.id) return;

      try {
        const { data, error } = await supabase
          .from("task_completions")
          .select("day, task_id")
          .eq("session_id", session.id);

        if (error) throw error;

        // Group by day and count completions
        const dayMap: Record<number, Set<string>> = {};
        data?.forEach((completion) => {
          if (!dayMap[completion.day]) {
            dayMap[completion.day] = new Set();
          }
          dayMap[completion.day].add(completion.task_id);
        });

        // Calculate completion stats for each day
        const completionStats: DayCompletion[] = Array.from({ length: 120 }, (_, i) => {
          const day = i + 1;
          const dayTasks = maizeTasks.filter((task) => task.day === day);
          const completedCount = dayMap[day]?.size || 0;

          return {
            day,
            completedCount,
            totalCount: dayTasks.length,
          };
        });

        setCompletions(completionStats);
      } catch (error: any) {
        console.error("Error fetching completions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletions();
  }, [session?.id]);

  const getStageForDay = (day: number) => {
    const task = maizeTasks.find((t) => t.day === day);
    return task?.stage || "";
  };

  const getCompletionColor = (completed: number, total: number) => {
    if (total === 0) return "text-muted-foreground";
    const percentage = (completed / total) * 100;
    if (percentage === 100) return "text-primary";
    if (percentage >= 50) return "text-accent";
    if (percentage > 0) return "text-secondary-foreground";
    return "text-muted-foreground";
  };

  const getCompletionStatus = (completed: number, total: number) => {
    if (total === 0) return "No tasks";
    if (completed === total) return "Complete";
    if (completed > 0) return `${completed}/${total}`;
    return "Not started";
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">120-Day Farming Calendar</h1>
            <p className="text-muted-foreground">
              Track your progress through the complete maize farming cycle
            </p>
            {session && (
              <Badge variant="outline" className="mt-2">
                Current Day: {session.current_day}
              </Badge>
            )}
          </div>
          {session && profile && (
            <ExportButton
              userName={profile.full_name || "Farmer"}
              farmLocation={profile.farm_location}
              farmSize={profile.farm_size}
              currentDay={session.current_day}
              completions={completions}
              startDate={new Date(session.start_date).toLocaleDateString()}
            />
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)] md:h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {completions.map((dayData) => {
            const isCurrentDay = session?.current_day === dayData.day;
            const stage = getStageForDay(dayData.day);
            const isPastDay = session ? dayData.day < session.current_day : false;

            return (
              <Card
                key={dayData.day}
                className={`transition-all hover:shadow-elevated ${
                  isCurrentDay ? "border-primary border-2" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Day {dayData.day}</CardTitle>
                    {dayData.completedCount === dayData.totalCount &&
                    dayData.totalCount > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {stage && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {stage}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div
                      className={`text-sm font-medium ${getCompletionColor(
                        dayData.completedCount,
                        dayData.totalCount
                      )}`}
                    >
                      {getCompletionStatus(
                        dayData.completedCount,
                        dayData.totalCount
                      )}
                    </div>
                    {dayData.totalCount > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            dayData.completedCount === dayData.totalCount
                              ? "bg-primary"
                              : "bg-accent"
                          }`}
                          style={{
                            width: `${
                              (dayData.completedCount / dayData.totalCount) * 100
                            }%`,
                          }}
                        />
                      </div>
                    )}
                    {isCurrentDay && (
                      <Badge className="text-xs">Today</Badge>
                    )}
                    {isPastDay && dayData.completedCount < dayData.totalCount && (
                      <Badge variant="outline" className="text-xs">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Calendar;

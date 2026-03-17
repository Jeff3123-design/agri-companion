import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFarmingSession } from "@/hooks/useFarmingSession";
import { ProgressCharts } from "@/components/ProgressCharts";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { maizeTasks } from "@/data/maizeTasks";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

const Progress = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<DayCompletion[]>([]);
  const { session, loading: sessionLoading } = useFarmingSession(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
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

        const dayMap: Record<number, Set<string>> = {};
        data?.forEach((completion) => {
          if (!dayMap[completion.day]) {
            dayMap[completion.day] = new Set();
          }
          dayMap[completion.day].add(completion.task_id);
        });

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

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedDays = completions.filter(
    (d) => d.totalCount > 0 && d.completedCount === d.totalCount && d.day <= (session?.current_day || 1)
  ).length;

  const totalDaysWithTasks = completions.filter(
    (d) => d.totalCount > 0 && d.day <= (session?.current_day || 1)
  ).length;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Progress Dashboard</h1>
        <p className="text-muted-foreground">
          Track your farming progress with detailed analytics
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline">Day {session?.current_day || 1} of 120</Badge>
          <Badge variant="secondary">
            {completedDays} / {totalDaysWithTasks} days completed
          </Badge>
          <Badge className="bg-primary">
            {totalDaysWithTasks > 0 ? Math.round((completedDays / totalDaysWithTasks) * 100) : 0}% overall
          </Badge>
        </div>
      </div>

      <ProgressCharts completions={completions} currentDay={session?.current_day || 1} />
    </div>
  );
};

export default Progress;

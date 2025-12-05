import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFarmingSession } from "@/hooks/useFarmingSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Circle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Leaf } from "lucide-react";
import { maizeTasks, dayTasksData } from "@/data/maizeTasks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExportButton } from "@/components/ExportButton";
import { toast } from "sonner";

interface DayCompletion {
  day: number;
  completedCount: number;
  totalCount: number;
}

interface TaskCompletion {
  task_id: string;
  day: number;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<DayCompletion[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { session, loading: sessionLoading } = useFarmingSession(userId);

  const daysPerPage = 30;
  const totalPages = Math.ceil(120 / daysPerPage);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
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

        setTaskCompletions(data || []);

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

  const toggleTaskCompletion = async (taskId: string, day: number) => {
    if (!session?.id || !userId) return;

    const isCompleted = taskCompletions.some(
      (tc) => tc.task_id === taskId && tc.day === day
    );

    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from("task_completions")
          .delete()
          .eq("session_id", session.id)
          .eq("task_id", taskId)
          .eq("day", day);

        if (error) throw error;

        setTaskCompletions((prev) =>
          prev.filter((tc) => !(tc.task_id === taskId && tc.day === day))
        );
        toast.success("Task marked as incomplete");
      } else {
        // Add completion
        const { error } = await supabase
          .from("task_completions")
          .insert({
            session_id: session.id,
            user_id: userId,
            task_id: taskId,
            day: day,
          });

        if (error) throw error;

        setTaskCompletions((prev) => [...prev, { task_id: taskId, day }]);
        toast.success("Task completed!");
      }

      // Update completions count
      setCompletions((prev) =>
        prev.map((c) => {
          if (c.day === day) {
            const newCount = isCompleted
              ? c.completedCount - 1
              : c.completedCount + 1;
            return { ...c, completedCount: newCount };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Failed to update task");
    }
  };

  const getStageForDay = (day: number) => {
    const task = maizeTasks.find((t) => t.day === day);
    return task?.stage || "";
  };

  const getTasksForDay = (day: number) => {
    return maizeTasks.filter((task) => task.day === day);
  };

  const isTaskCompleted = (taskId: string, day: number) => {
    return taskCompletions.some(
      (tc) => tc.task_id === taskId && tc.day === day
    );
  };

  const getCompletionColor = (completed: number, total: number) => {
    if (total === 0) return "bg-muted";
    const percentage = (completed / total) * 100;
    if (percentage === 100) return "bg-primary";
    if (percentage >= 50) return "bg-accent";
    if (percentage > 0) return "bg-secondary";
    return "bg-muted";
  };

  const getPageDays = () => {
    const start = currentPage * daysPerPage;
    return completions.slice(start, start + daysPerPage);
  };

  const getStageInfo = (day: number) => {
    const dayTask = dayTasksData.find((dt) => dt.day === day);
    return dayTask;
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedDayData = selectedDay ? getStageInfo(selectedDay) : null;
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">120-Day Farming Calendar</h1>
            <p className="text-muted-foreground">
              Click any day to view and manage tasks
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

      {/* Stage Legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {dayTasksData.map((stage) => (
          <Badge
            key={stage.day}
            variant="outline"
            className="text-xs cursor-pointer hover:bg-primary/10"
            onClick={() => setSelectedDay(stage.day)}
          >
            Day {stage.day}: {stage.stage}
          </Badge>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Days {currentPage * daysPerPage + 1} - {Math.min((currentPage + 1) * daysPerPage, 120)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
        {getPageDays().map((dayData) => {
          const isCurrentDay = session?.current_day === dayData.day;
          const stage = getStageForDay(dayData.day);
          const hasTasksOnDay = dayData.totalCount > 0;

          return (
            <button
              key={dayData.day}
              onClick={() => setSelectedDay(dayData.day)}
              className={`
                relative aspect-square rounded-lg p-2 flex flex-col items-center justify-center
                transition-all hover:scale-105 hover:shadow-lg cursor-pointer
                ${getCompletionColor(dayData.completedCount, dayData.totalCount)}
                ${isCurrentDay ? "ring-2 ring-primary ring-offset-2" : ""}
                ${hasTasksOnDay ? "border-2 border-primary/30" : "border border-border/50"}
              `}
            >
              <span className={`text-sm font-bold ${dayData.totalCount > 0 && dayData.completedCount === dayData.totalCount ? "text-primary-foreground" : "text-foreground"}`}>
                {dayData.day}
              </span>
              {dayData.totalCount > 0 && (
                <div className="absolute bottom-1 right-1">
                  {dayData.completedCount === dayData.totalCount ? (
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              )}
              {hasTasksOnDay && (
                <Leaf className="absolute top-1 right-1 h-3 w-3 text-primary/70" />
              )}
              {isCurrentDay && (
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Day {selectedDay}
              {selectedDayData && (
                <Badge variant="secondary" className="ml-2">
                  {selectedDayData.stage}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedDayTasks.length > 0 ? (
              <div className="space-y-3 pr-4">
                {selectedDayTasks.map((task) => {
                  const completed = isTaskCompleted(task.id, selectedDay!);
                  return (
                    <div
                      key={task.id}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border transition-all
                        ${completed ? "bg-primary/10 border-primary/30" : "bg-card border-border"}
                      `}
                    >
                      <Checkbox
                        id={task.id}
                        checked={completed}
                        onCheckedChange={() => toggleTaskCompletion(task.id, selectedDay!)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={task.id}
                        className={`flex-1 cursor-pointer ${completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.stage}</p>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Leaf className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No specific tasks for this day</p>
                <p className="text-sm mt-1">Continue monitoring your crops</p>
              </div>
            )}
          </ScrollArea>

          {selectedDayTasks.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedDayTasks.filter((t) => isTaskCompleted(t.id, selectedDay!)).length} of {selectedDayTasks.length} completed
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectedDayTasks.forEach((task) => {
                    if (!isTaskCompleted(task.id, selectedDay!)) {
                      toggleTaskCompletion(task.id, selectedDay!);
                    }
                  });
                }}
                disabled={selectedDayTasks.every((t) => isTaskCompleted(t.id, selectedDay!))}
              >
                Mark All Complete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {completions.filter((c) => c.totalCount > 0 && c.completedCount === c.totalCount).length}
              </p>
              <p className="text-xs text-muted-foreground">Days Completed</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-accent">
                {completions.filter((c) => c.totalCount > 0 && c.completedCount > 0 && c.completedCount < c.totalCount).length}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-secondary-foreground">
                {taskCompletions.length}
              </p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {maizeTasks.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;

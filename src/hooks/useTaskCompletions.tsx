import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useTaskCompletions = (sessionId: string | undefined, currentDay: number) => {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchCompletions = async () => {
      try {
        const { data, error } = await supabase
          .from("task_completions")
          .select("task_id")
          .eq("session_id", sessionId)
          .eq("day", currentDay);

        if (error) throw error;

        const completed = new Set(data.map((item) => item.task_id));
        setCompletedTasks(completed);
      } catch (error: any) {
        console.error("Error fetching task completions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletions();
  }, [sessionId, currentDay]);

  const toggleTaskCompletion = async (taskId: string, userId: string) => {
    if (!sessionId) return;

    const isCompleted = completedTasks.has(taskId);

    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from("task_completions")
          .delete()
          .eq("session_id", sessionId)
          .eq("task_id", taskId)
          .eq("day", currentDay);

        if (error) throw error;

        setCompletedTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        toast.success("Task marked as incomplete");
      } else {
        // Add completion
        const { error } = await supabase
          .from("task_completions")
          .insert({
            user_id: userId,
            session_id: sessionId,
            task_id: taskId,
            day: currentDay,
          });

        if (error) throw error;

        setCompletedTasks((prev) => new Set(prev).add(taskId));
        toast.success("Task completed! 🎉");
      }
    } catch (error: any) {
      console.error("Error toggling task completion:", error);
      toast.error("Failed to update task");
    }
  };

  return { completedTasks, loading, toggleTaskCompletion };
};
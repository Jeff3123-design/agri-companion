import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FarmingSession {
  id: string;
  user_id: string;
  start_date: string;
  current_day: number;
  status: string;
}

export const useFarmingSession = (userId: string | undefined) => {
  const [session, setSession] = useState<FarmingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchOrCreateSession = async () => {
      try {
        // Check for existing active session
        const { data: existingSession, error: fetchError } = await supabase
          .from("farming_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingSession) {
          // Calculate current day based on start date
          const startDate = new Date(existingSession.start_date);
          const today = new Date();
          const daysPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const currentDay = Math.min(daysPassed + 1, 120); // Cap at 120 days

          // Update current day if it changed
          if (currentDay !== existingSession.current_day) {
            const { data: updated, error: updateError } = await supabase
              .from("farming_sessions")
              .update({ current_day: currentDay })
              .eq("id", existingSession.id)
              .select()
              .single();

            if (updateError) throw updateError;
            setSession(updated);
          } else {
            setSession(existingSession);
          }
        } else {
          // Create new session starting at Day 1
          const { data: newSession, error: createError } = await supabase
            .from("farming_sessions")
            .insert({
              user_id: userId,
              current_day: 1,
              status: "active",
            })
            .select()
            .single();

          if (createError) throw createError;
          setSession(newSession);
          toast.success("Welcome! Your farming journey begins at Day 1!");
        }
      } catch (error: any) {
        console.error("Error with farming session:", error);
        toast.error("Failed to load farming session");
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateSession();
  }, [userId]);

  return { session, loading };
};
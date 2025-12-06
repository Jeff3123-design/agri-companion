import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateDailyGDU, getGrowthStage, getDaysSincePlanting } from "@/lib/gdu";

export interface GDUSession {
  id: string;
  user_id: string;
  planting_date: string | null;
  accumulated_gdu: number;
  current_stage: string;
  status: string;
  start_date: string;
  current_day: number;
}

export interface DailyGDURecord {
  id: string;
  session_id: string;
  date: string;
  temp_max: number | null;
  temp_min: number | null;
  gdu: number;
  source: string;
}

export const useGDUSession = (userId: string | undefined) => {
  const [session, setSession] = useState<GDUSession | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyGDURecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: existingSession, error: fetchError } = await supabase
        .from("farming_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession && existingSession.planting_date) {
        // Calculate current day from planting date
        const daysSincePlanting = getDaysSincePlanting(existingSession.planting_date);
        
        // Fetch daily GDU records
        const { data: gduRecords, error: gduError } = await supabase
          .from("daily_gdu")
          .select("*")
          .eq("session_id", existingSession.id)
          .order("date", { ascending: true });

        if (gduError) throw gduError;

        // Calculate total accumulated GDU
        const totalGdu = (gduRecords || []).reduce((sum, r) => sum + Number(r.gdu), 0);
        const currentStage = getGrowthStage(totalGdu);

        // Update session with latest values
        if (totalGdu !== Number(existingSession.accumulated_gdu) || 
            currentStage.stage !== existingSession.current_stage) {
          await supabase
            .from("farming_sessions")
            .update({
              accumulated_gdu: totalGdu,
              current_stage: currentStage.stage,
              current_day: daysSincePlanting + 1,
            })
            .eq("id", existingSession.id);
        }

        setSession({
          ...existingSession,
          accumulated_gdu: totalGdu,
          current_stage: currentStage.stage,
          current_day: daysSincePlanting + 1,
        });
        setDailyRecords(gduRecords || []);
        setHasActiveSession(true);
      } else if (existingSession) {
        // Session exists but no planting date set
        setSession(existingSession);
        setHasActiveSession(false);
      } else {
        setHasActiveSession(false);
      }
    } catch (error: any) {
      console.error("Error with GDU session:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const startFarmCycle = async (plantingDate: Date) => {
    if (!userId) return null;

    try {
      // Check if session already exists
      const { data: existing } = await supabase
        .from("farming_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        // Update existing session
        const { data, error } = await supabase
          .from("farming_sessions")
          .update({
            planting_date: plantingDate.toISOString().split('T')[0],
            accumulated_gdu: 0,
            current_stage: "VE",
            current_day: 1,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        setSession(data);
        setHasActiveSession(true);
        toast.success("Farm cycle started!");
        return data;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from("farming_sessions")
          .insert({
            user_id: userId,
            planting_date: plantingDate.toISOString().split('T')[0],
            accumulated_gdu: 0,
            current_stage: "VE",
            status: "active",
            current_day: 1,
          })
          .select()
          .single();

        if (error) throw error;
        setSession(data);
        setHasActiveSession(true);
        toast.success("Farm cycle started!");
        return data;
      }
    } catch (error: any) {
      console.error("Error starting farm cycle:", error);
      toast.error("Failed to start farm cycle");
      return null;
    }
  };

  const addDailyGDU = async (date: Date, tempMax: number, tempMin: number, source: "manual" | "api" = "manual") => {
    if (!session?.id || !userId) return null;

    const gdu = calculateDailyGDU(tempMax, tempMin);
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Upsert - update if exists, insert if not
      const { data, error } = await supabase
        .from("daily_gdu")
        .upsert({
          session_id: session.id,
          user_id: userId,
          date: dateStr,
          temp_max: tempMax,
          temp_min: tempMin,
          gdu: gdu,
          source: source,
        }, {
          onConflict: 'session_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate totals
      const newTotal = dailyRecords.reduce((sum, r) => {
        if (r.date === dateStr) return sum + gdu;
        return sum + Number(r.gdu);
      }, 0) + (dailyRecords.some(r => r.date === dateStr) ? 0 : gdu);

      const newStage = getGrowthStage(newTotal);

      // Update session
      await supabase
        .from("farming_sessions")
        .update({
          accumulated_gdu: newTotal,
          current_stage: newStage.stage,
        })
        .eq("id", session.id);

      // Refresh data
      await fetchSession();
      toast.success(`GDU recorded: ${gdu.toFixed(1)} units`);
      return data;
    } catch (error: any) {
      console.error("Error adding GDU:", error);
      toast.error("Failed to record temperature data");
      return null;
    }
  };

  const endFarmCycle = async () => {
    if (!session?.id) return;

    try {
      await supabase
        .from("farming_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);

      setSession(null);
      setDailyRecords([]);
      setHasActiveSession(false);
      toast.success("Farm cycle ended");
    } catch (error: any) {
      console.error("Error ending farm cycle:", error);
      toast.error("Failed to end farm cycle");
    }
  };

  return {
    session,
    dailyRecords,
    loading,
    hasActiveSession,
    startFarmCycle,
    addDailyGDU,
    endFarmCycle,
    refreshSession: fetchSession,
  };
};
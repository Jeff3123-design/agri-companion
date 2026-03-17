import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateDailyGDU, getGrowthStage, getDaysSincePlanting, getNextStage, GDU_STAGES } from "@/lib/gdu";
import { fetchTodayTemperature, fetchDailyTemperatures, fetchHistoricalTemperatures } from "@/lib/api";
import { showNotification, getNotificationPreferences } from "@/lib/notifications";

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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const previousStageRef = useRef<string | null>(null);

  // Get user location on mount and save to profile for cron job
  useEffect(() => {
    if (navigator.geolocation && userId) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          
          // Save location to profile for automatic daily GDU calculation
          try {
            await supabase
              .from("profiles")
              .update({
                latitude: lat,
                longitude: lng,
              })
              .eq("id", userId);
            console.log("Location saved to profile for automatic GDU");
          } catch (error) {
            console.error("Failed to save location to profile:", error);
          }
        },
        (error) => {
          console.log("Location access denied:", error);
        }
      );
    }
  }, [userId]);

  const sendGrowthStageNotification = async (stage: typeof GDU_STAGES[number], accumulatedGdu: number) => {
    const prefs = getNotificationPreferences();
    const nextStage = getNextStage(accumulatedGdu);

    // Push notification
    if (prefs.enabled && prefs.growthMilestones) {
      showNotification(`🌱 Stage ${stage.stage} Reached!`, {
        body: `Your maize has entered the ${stage.name} stage. ${stage.description}`,
        tag: `stage-${stage.stage}`,
      });
    }

    // Email notification
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        await supabase.functions.invoke("send-notifications", {
          body: {
            type: "growth_stage",
            email: user.email,
            userName: profile?.full_name || "Farmer",
            data: {
              stage: stage.stage,
              stageName: stage.name,
              stageDescription: stage.description,
              accumulatedGdu: accumulatedGdu,
              nextStage: nextStage?.stage,
              nextStageGdu: nextStage?.minGdu,
            },
          },
        });
      }
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  };

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

        // Check if stage changed and send notification
        if (previousStageRef.current && previousStageRef.current !== currentStage.stage) {
          sendGrowthStageNotification(currentStage, totalGdu);
        }
        previousStageRef.current = currentStage.stage;

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
        previousStageRef.current = "VE";
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
        previousStageRef.current = "VE";
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

  // Auto-fetch today's temperature from weather API
  const autoFetchTodayGDU = async () => {
    if (!session?.id || !userId || !location || isAutoFetching) return null;

    setIsAutoFetching(true);
    try {
      const tempData = await fetchTodayTemperature(location.lat, location.lng);
      if (tempData && tempData.tempMax !== null && tempData.tempMin !== null) {
        // Check if we already have today's data
        const today = new Date().toISOString().split('T')[0];
        const existingToday = dailyRecords.find(r => r.date === today);
        
        if (!existingToday) {
          await addDailyGDU(new Date(), tempData.tempMax, tempData.tempMin, "api");
          toast.success("Today's temperature fetched automatically!");
          return tempData;
        } else {
          toast.info("Today's GDU already recorded");
        }
      }
      return null;
    } catch (error) {
      console.error("Error auto-fetching temperature:", error);
      toast.error("Failed to fetch weather data");
      return null;
    } finally {
      setIsAutoFetching(false);
    }
  };

  // Back-fill historical GDU data from weather API
  const backfillHistoricalGDU = async (startDate: string) => {
    if (!session?.id || !userId || !location) return;

    setIsAutoFetching(true);
    try {
      const today = new Date();
      // Historical API only goes up to yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = yesterday.toISOString().split('T')[0];
      
      // Don't try to backfill if start date is today or future
      if (startDate >= today.toISOString().split('T')[0]) {
        toast.info("No historical data to backfill yet");
        setIsAutoFetching(false);
        return;
      }
      
      const tempData = await fetchHistoricalTemperatures(location.lat, location.lng, startDate, endDate);
      
      if (tempData.length === 0) {
        toast.error("No historical weather data available");
        return;
      }

      let addedCount = 0;
      for (const day of tempData) {
        if (day.tempMax !== null && day.tempMin !== null) {
          const gdu = calculateDailyGDU(day.tempMax, day.tempMin);
          
          // Check if record already exists
          const existing = dailyRecords.find(r => r.date === day.date);
          if (!existing) {
            await supabase
              .from("daily_gdu")
              .insert({
                session_id: session.id,
                user_id: userId,
                date: day.date,
                temp_max: day.tempMax,
                temp_min: day.tempMin,
                gdu: gdu,
                source: "api",
              });
            addedCount++;
          }
        }
      }

      await fetchSession();
      if (addedCount > 0) {
        toast.success(`Added ${addedCount} days of historical GDU data`);
      } else {
        toast.info("All historical data already recorded");
      }
    } catch (error) {
      console.error("Error backfilling GDU:", error);
      toast.error("Failed to fetch historical weather data");
    } finally {
      setIsAutoFetching(false);
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
      previousStageRef.current = null;
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
    location,
    isAutoFetching,
    startFarmCycle,
    addDailyGDU,
    autoFetchTodayGDU,
    backfillHistoricalGDU,
    endFarmCycle,
    refreshSession: fetchSession,
  };
};
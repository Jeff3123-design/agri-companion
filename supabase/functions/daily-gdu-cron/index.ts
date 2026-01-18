import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GDU calculation constants
const BASE_TEMP = 10;
const MAX_TEMP_CAP = 30;

function calculateDailyGDU(tempMax: number, tempMin: number): number {
  const cappedMax = Math.min(tempMax, MAX_TEMP_CAP);
  const avgTemp = (cappedMax + tempMin) / 2;
  const gdu = avgTemp - BASE_TEMP;
  return Math.max(0, gdu);
}

// Growth stage thresholds
const GDU_STAGES = [
  { stage: "VE", minGdu: 0 },
  { stage: "V2", minGdu: 100 },
  { stage: "V4", minGdu: 200 },
  { stage: "V6", minGdu: 350 },
  { stage: "V8", minGdu: 475 },
  { stage: "V10", minGdu: 610 },
  { stage: "V12", minGdu: 740 },
  { stage: "V14", minGdu: 870 },
  { stage: "VT", minGdu: 1000 },
  { stage: "R1", minGdu: 1135 },
  { stage: "R2", minGdu: 1400 },
  { stage: "R3", minGdu: 1660 },
  { stage: "R4", minGdu: 1925 },
  { stage: "R5", minGdu: 2190 },
  { stage: "R6", minGdu: 2450 },
];

function getGrowthStage(accumulatedGdu: number): string {
  for (let i = GDU_STAGES.length - 1; i >= 0; i--) {
    if (accumulatedGdu >= GDU_STAGES[i].minGdu) {
      return GDU_STAGES[i].stage;
    }
  }
  return "VE";
}

async function fetchTemperatureForLocation(lat: number, lon: number): Promise<{ tempMax: number; tempMin: number } | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${today}&end_date=${today}`;
    
    console.log(`Fetching temperature for ${lat}, ${lon}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Weather API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.daily?.temperature_2m_max?.[0] != null && data.daily?.temperature_2m_min?.[0] != null) {
      return {
        tempMax: data.daily.temperature_2m_max[0],
        tempMin: data.daily.temperature_2m_min[0],
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching temperature:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily GDU cron job...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role key to access all users' data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch all active farming sessions with user profiles that have location data
    const { data: sessions, error: sessionsError } = await supabase
      .from("farming_sessions")
      .select(`
        id,
        user_id,
        planting_date,
        accumulated_gdu,
        current_stage
      `)
      .eq("status", "active")
      .not("planting_date", "is", null);
    
    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      throw sessionsError;
    }
    
    console.log(`Found ${sessions?.length || 0} active sessions`);
    
    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active sessions to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const session of sessions) {
      try {
        // Get user profile with location
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", session.user_id)
          .single();
        
        if (profileError || !profile?.latitude || !profile?.longitude) {
          console.log(`Skipping session ${session.id}: No location data for user ${session.user_id}`);
          skippedCount++;
          continue;
        }
        
        // Check if we already have today's GDU for this session
        const { data: existingGdu, error: existingError } = await supabase
          .from("daily_gdu")
          .select("id")
          .eq("session_id", session.id)
          .eq("date", today)
          .maybeSingle();
        
        if (existingError) {
          console.error(`Error checking existing GDU for session ${session.id}:`, existingError);
          errorCount++;
          continue;
        }
        
        if (existingGdu) {
          console.log(`Session ${session.id} already has GDU for today`);
          skippedCount++;
          continue;
        }
        
        // Fetch temperature from weather API
        const tempData = await fetchTemperatureForLocation(
          Number(profile.latitude),
          Number(profile.longitude)
        );
        
        if (!tempData) {
          console.log(`Could not fetch temperature for session ${session.id}`);
          errorCount++;
          continue;
        }
        
        // Calculate GDU
        const gdu = calculateDailyGDU(tempData.tempMax, tempData.tempMin);
        
        // Insert daily GDU record
        const { error: insertError } = await supabase
          .from("daily_gdu")
          .insert({
            session_id: session.id,
            user_id: session.user_id,
            date: today,
            temp_max: tempData.tempMax,
            temp_min: tempData.tempMin,
            gdu: gdu,
            source: "cron",
          });
        
        if (insertError) {
          console.error(`Error inserting GDU for session ${session.id}:`, insertError);
          errorCount++;
          continue;
        }
        
        // Calculate new accumulated GDU
        const { data: allGduRecords, error: gduRecordsError } = await supabase
          .from("daily_gdu")
          .select("gdu")
          .eq("session_id", session.id);
        
        if (gduRecordsError) {
          console.error(`Error fetching GDU records for session ${session.id}:`, gduRecordsError);
        } else {
          const totalGdu = (allGduRecords || []).reduce((sum, r) => sum + Number(r.gdu), 0);
          const newStage = getGrowthStage(totalGdu);
          
          // Update session with new accumulated GDU
          await supabase
            .from("farming_sessions")
            .update({
              accumulated_gdu: totalGdu,
              current_stage: newStage,
            })
            .eq("id", session.id);
          
          console.log(`Session ${session.id}: Added GDU ${gdu.toFixed(1)}, Total: ${totalGdu.toFixed(1)}, Stage: ${newStage}`);
        }
        
        processedCount++;
      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        errorCount++;
      }
    }
    
    const result = {
      success: true,
      date: today,
      totalSessions: sessions.length,
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
    
    console.log("Daily GDU cron job completed:", result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in daily GDU cron:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

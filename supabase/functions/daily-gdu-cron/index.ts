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

// Growth stage thresholds with names and descriptions
const GDU_STAGES = [
  { stage: "VE", minGdu: 0, name: "Emergence", description: "Coleoptile emerges from soil" },
  { stage: "V2", minGdu: 100, name: "2-Leaf Stage", description: "Two leaves with visible collar" },
  { stage: "V4", minGdu: 200, name: "4-Leaf Stage", description: "Four leaves with visible collar" },
  { stage: "V6", minGdu: 350, name: "6-Leaf Stage", description: "Growing point above soil, rapid growth begins" },
  { stage: "V8", minGdu: 475, name: "8-Leaf Stage", description: "Ear shoot initiation begins" },
  { stage: "V10", minGdu: 610, name: "10-Leaf Stage", description: "Tassel formation begins" },
  { stage: "V12", minGdu: 740, name: "12-Leaf Stage", description: "Ear size determination" },
  { stage: "V14", minGdu: 870, name: "14-Leaf Stage", description: "Final ear row number set" },
  { stage: "VT", minGdu: 1000, name: "Tasseling", description: "Tassel fully emerged" },
  { stage: "R1", minGdu: 1135, name: "Silking", description: "Silks visible, pollination begins" },
  { stage: "R2", minGdu: 1400, name: "Blister", description: "Kernels white and blister-like" },
  { stage: "R3", minGdu: 1660, name: "Milk", description: "Kernels yellow, milky fluid inside" },
  { stage: "R4", minGdu: 1925, name: "Dough", description: "Kernel contents pasty" },
  { stage: "R5", minGdu: 2190, name: "Dent", description: "Kernels dented, starch accumulation" },
  { stage: "R6", minGdu: 2450, name: "Physiological Maturity", description: "Black layer formed, maximum dry weight" },
];

interface GduStage {
  stage: string;
  minGdu: number;
  name: string;
  description: string;
}

function getGrowthStage(accumulatedGdu: number): GduStage {
  for (let i = GDU_STAGES.length - 1; i >= 0; i--) {
    if (accumulatedGdu >= GDU_STAGES[i].minGdu) {
      return GDU_STAGES[i];
    }
  }
  return GDU_STAGES[0];
}

function getNextStage(accumulatedGdu: number): GduStage | null {
  for (let i = 0; i < GDU_STAGES.length; i++) {
    if (GDU_STAGES[i].minGdu > accumulatedGdu) {
      return GDU_STAGES[i];
    }
  }
  return null;
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

    // Batch fetch profiles for all users in sessions
    const userIds = [...new Set(sessions.map(s => s.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, latitude, longitude, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]));

    // Batch fetch existing daily_gdu records for today
    const sessionIds = sessions.map(s => s.id);
    const { data: existingGduRecords, error: existingGduError } = await supabase
      .from("daily_gdu")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("date", today);

    if (existingGduError) {
      console.error("Error fetching existing GDU records:", existingGduError);
      throw existingGduError;
    }

    const existingGduSet = new Set(existingGduRecords?.map(r => r.session_id));

    // Cache for weather results to avoid redundant API calls for the same location
    const weatherCache = new Map<string, { tempMax: number; tempMin: number } | null>();

    // Array to collect GDU records for bulk insertion
    const gduInserts: any[] = [];
    // Array to collect results that need session updates and notifications
    const resultsToProcess: any[] = [];
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const session of sessions) {
      try {
        // Get user profile from pre-fetched map
        const profile = profilesMap.get(session.user_id);
        
        if (!profile?.latitude || !profile?.longitude) {
          console.log(`Skipping session ${session.id}: No location data for user ${session.user_id}`);
          skippedCount++;
          continue;
        }
        
        // Check if we already have today's GDU for this session using pre-fetched data
        if (existingGduSet.has(session.id)) {
          console.log(`Session ${session.id} already has GDU for today`);
          skippedCount++;
          continue;
        }
        
        // Fetch temperature from weather API with caching
        const locationKey = `${Number(profile.latitude).toFixed(4)},${Number(profile.longitude).toFixed(4)}`;
        let tempData = weatherCache.get(locationKey);

        if (tempData === undefined) {
          tempData = await fetchTemperatureForLocation(
            Number(profile.latitude),
            Number(profile.longitude)
          );
          weatherCache.set(locationKey, tempData);
        }
        
        if (!tempData) {
          console.log(`Could not fetch temperature for session ${session.id}`);
          errorCount++;
          continue;
        }
        
        // Calculate GDU
        const gdu = calculateDailyGDU(tempData.tempMax, tempData.tempMin);
        
        // Collect daily GDU record for bulk insertion
        gduInserts.push({
          session_id: session.id,
          user_id: session.user_id,
          date: today,
          temp_max: tempData.tempMax,
          temp_min: tempData.tempMin,
          gdu: gdu,
          source: "cron",
        });
        
        // Calculate new accumulated GDU in-memory to avoid N+1 query
        const totalGdu = Number(session.accumulated_gdu || 0) + gdu;
        const newStage = getGrowthStage(totalGdu);
        
        // Store data for post-bulk-insert processing
        resultsToProcess.push({
          session,
          profile,
          gdu,
          totalGdu,
          newStage,
        });
      } catch (sessionError) {
        console.error(`Error processing session ${session.id}:`, sessionError);
        errorCount++;
      }
    }

    // Perform bulk insertion of GDU records FIRST for data integrity
    if (gduInserts.length > 0) {
      console.log(`Performing bulk insert of ${gduInserts.length} GDU records`);
      const { error: bulkInsertError } = await supabase
        .from("daily_gdu")
        .insert(gduInserts);

      if (bulkInsertError) {
        console.error("Error during bulk GDU insertion:", bulkInsertError);
        throw new Error(`Bulk GDU insertion failed: ${bulkInsertError.message}`);
      }

      // Only if GDU records were successfully inserted, we update sessions and send notifications
      for (const result of resultsToProcess) {
        const { session, profile, gdu, totalGdu, newStage } = result;
        const previousStage = session.current_stage;

        try {
          // Update session with new accumulated GDU
          const { error: updateError } = await supabase
            .from("farming_sessions")
            .update({
              accumulated_gdu: totalGdu,
              current_stage: newStage.stage,
            })
            .eq("id", session.id);
          
          if (updateError) {
            console.error(`Error updating session ${session.id}:`, updateError);
            errorCount++;
            continue;
          }

          console.log(`Session ${session.id}: Added GDU ${gdu.toFixed(1)}, Total: ${totalGdu.toFixed(1)}, Stage: ${newStage.stage}`);
          
          // Check if stage changed and send email notification
          if (previousStage && previousStage !== newStage.stage) {
            // Defer fetching user email until absolutely needed
            const { data: authUser } = await supabase.auth.admin.getUserById(session.user_id);
            const userEmail = authUser?.user?.email;

            if (userEmail) {
              console.log(`Stage changed from ${previousStage} to ${newStage.stage} - sending email to ${userEmail}`);
              
              const nextStage = getNextStage(totalGdu);

              try {
                const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    type: "growth_stage",
                    email: userEmail,
                    userName: profile.full_name || "Farmer",
                    data: {
                      stage: newStage.stage,
                      stageName: newStage.name,
                      stageDescription: newStage.description,
                      accumulatedGdu: totalGdu,
                      nextStage: nextStage?.stage,
                      nextStageGdu: nextStage?.minGdu,
                    },
                  }),
                });

                if (!notificationResponse.ok) {
                  console.error(`Failed to send growth stage email: ${notificationResponse.status}`);
                }
              } catch (emailError) {
                console.error(`Error sending growth stage email:`, emailError);
              }
            }
          }
          processedCount++;
        } catch (updateErr) {
          console.error(`Unexpected error processing session ${session.id} after bulk insert:`, updateErr);
          errorCount++;
        }
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

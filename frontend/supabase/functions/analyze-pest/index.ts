import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert agricultural pathologist specializing in maize (corn) diseases and pests. 
Analyze the provided image of a maize plant and identify any pests, diseases, or health issues.

You MUST respond with a valid JSON object in this exact format (no markdown, just JSON):
{
  "name": "Name of the pest/disease or 'Healthy Plant' if no issues found",
  "confidence": <number 0-100>,
  "severity": "low" | "medium" | "high",
  "description": "Brief description of what was found",
  "solution": "Recommended treatment or action",
  "preventiveMeasures": ["measure 1", "measure 2", "measure 3"],
  "affectedParts": ["leaf", "stem", "ear", etc],
  "spreadRisk": "low" | "medium" | "high"
}

Common maize issues to look for:
- Northern Corn Leaf Blight (gray-green lesions)
- Southern Corn Leaf Blight (tan lesions)
- Gray Leaf Spot (rectangular gray spots)
- Common Rust (orange-brown pustules)
- Corn Smut (large gray galls)
- Fall Armyworm damage
- Corn Earworm
- Stalk borers
- Aphid infestations
- Nutrient deficiencies (nitrogen, phosphorus, potassium)

Be specific about the diagnosis and provide actionable recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this maize plant image and identify any pests, diseases, or health issues. Provide your response as JSON only.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let result;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      result = JSON.parse(cleanContent.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      // Return a structured error response
      result = {
        name: "Analysis Error",
        confidence: 0,
        severity: "low",
        description: "Could not analyze the image. Please try with a clearer photo.",
        solution: "Ensure the image clearly shows the affected plant parts.",
        preventiveMeasures: ["Take photos in good lighting", "Focus on affected areas", "Include multiple angles if possible"],
        affectedParts: [],
        spreadRisk: "low",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-pest:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

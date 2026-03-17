import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "task_reminder" | "weather_alert" | "growth_stage";
  email: string;
  userName: string;
  data: {
    day?: number;
    tasks?: string[];
    weatherCondition?: string;
    temperature?: number;
    alertMessage?: string;
    stage?: string;
    stageName?: string;
    stageDescription?: string;
    accumulatedGdu?: number;
    nextStage?: string;
    nextStageGdu?: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, userName, data }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for ${email}`);

    let subject = "";
    let htmlContent = "";

    if (type === "task_reminder") {
      subject = `🌽 Day ${data.day} Tasks - MaizeMind Reminder`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .task-list { list-style: none; padding: 0; }
            .task-item { background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #22c55e; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌽 MaizeMind Daily Tasks</h1>
              <p>Day ${data.day} of your farming cycle</p>
            </div>
            <div class="content">
              <p>Hello ${userName}!</p>
              <p>Here are your tasks for today:</p>
              <ul class="task-list">
                ${data.tasks?.map(task => `<li class="task-item">✓ ${task}</li>`).join("") || "<li>No tasks scheduled</li>"}
              </ul>
              <p>Stay on track with your maize farming journey!</p>
            </div>
            <div class="footer">
              <p>MaizeMind - Your Intelligent Farming Companion</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "weather_alert") {
      subject = `⚠️ Weather Alert - MaizeMind`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #fffbeb; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; padding: 16px; border-radius: 8px; border: 2px solid #f59e0b; margin: 16px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Weather Alert</h1>
              <p>Important weather update for your farm</p>
            </div>
            <div class="content">
              <p>Hello ${userName}!</p>
              <div class="alert-box">
                <h3>Current Conditions</h3>
                <p><strong>Condition:</strong> ${data.weatherCondition}</p>
                <p><strong>Temperature:</strong> ${data.temperature}°C</p>
                <p><strong>Alert:</strong> ${data.alertMessage}</p>
              </div>
              <p>Please take necessary precautions to protect your crops.</p>
            </div>
            <div class="footer">
              <p>MaizeMind - Your Intelligent Farming Companion</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "growth_stage") {
      subject = `🌱 New Growth Stage Reached: ${data.stage} - MaizeMind`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 20px; border-radius: 0 0 8px 8px; }
            .stage-box { background: white; padding: 20px; border-radius: 8px; border: 2px solid #22c55e; margin: 16px 0; text-align: center; }
            .stage-name { font-size: 32px; font-weight: bold; color: #22c55e; margin-bottom: 8px; }
            .stage-title { font-size: 20px; color: #333; margin-bottom: 4px; }
            .stage-desc { color: #666; }
            .stats { display: flex; justify-content: space-around; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
            .stat { text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }
            .stat-label { font-size: 12px; color: #666; }
            .next-stage { background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 16px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌱 Growth Milestone Achieved!</h1>
              <p>Your maize has reached a new development stage</p>
            </div>
            <div class="content">
              <p>Congratulations, ${userName}!</p>
              <div class="stage-box">
                <div class="stage-name">${data.stage}</div>
                <div class="stage-title">${data.stageName}</div>
                <div class="stage-desc">${data.stageDescription}</div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-value">${data.accumulatedGdu?.toFixed(0)}</div>
                    <div class="stat-label">Accumulated GDU</div>
                  </div>
                </div>
              </div>
              ${data.nextStage ? `
              <div class="next-stage">
                <strong>Next Stage:</strong> ${data.nextStage} at ${data.nextStageGdu} GDU
              </div>
              ` : ''}
              <p style="margin-top: 16px;">Keep monitoring your crop's progress and check your tasks for this stage!</p>
            </div>
            <div class="footer">
              <p>MaizeMind - Your Intelligent Farming Companion</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "MaizeMind <onboarding@resend.dev>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

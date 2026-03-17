import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TaskReminderData {
  day: number;
  tasks: string[];
}

interface WeatherAlertData {
  weatherCondition: string;
  temperature: number;
  alertMessage: string;
}

export const useEmailNotifications = () => {
  const { toast } = useToast();

  const sendTaskReminder = async (
    email: string,
    userName: string,
    data: TaskReminderData
  ) => {
    try {
      const { data: response, error } = await supabase.functions.invoke(
        "send-notifications",
        {
          body: {
            type: "task_reminder",
            email,
            userName,
            data,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Email sent",
        description: "Task reminder has been sent to your email.",
      });

      return response;
    } catch (error: any) {
      console.error("Error sending task reminder:", error);
      toast({
        title: "Error",
        description: "Failed to send email notification.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendWeatherAlert = async (
    email: string,
    userName: string,
    data: WeatherAlertData
  ) => {
    try {
      const { data: response, error } = await supabase.functions.invoke(
        "send-notifications",
        {
          body: {
            type: "weather_alert",
            email,
            userName,
            data,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Alert sent",
        description: "Weather alert has been sent to your email.",
      });

      return response;
    } catch (error: any) {
      console.error("Error sending weather alert:", error);
      toast({
        title: "Error",
        description: "Failed to send weather alert.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { sendTaskReminder, sendWeatherAlert };
};

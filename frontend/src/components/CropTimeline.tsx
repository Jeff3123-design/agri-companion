import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dayTasksData } from "@/data/maizeTasks";
import { format } from "date-fns";
import { Camera, CheckCircle, Circle, Sprout } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CropTimelineProps {
  sessionId: string;
  currentDay: number;
  startDate?: string;
}

interface CropPhoto {
  id: string;
  day: number;
  image_url: string;
  description: string | null;
  created_at: string;
}

export const CropTimeline = ({ sessionId, currentDay, startDate }: CropTimelineProps) => {
  const { data: photos = [] } = useQuery({
    queryKey: ["crop-photos-timeline", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crop_photos")
        .select("*")
        .eq("session_id", sessionId)
        .order("day", { ascending: true });

      if (error) throw error;
      return data as CropPhoto[];
    },
  });

  // Group photos by day
  const photosByDay = photos.reduce((acc, photo) => {
    if (!acc[photo.day]) acc[photo.day] = [];
    acc[photo.day].push(photo);
    return acc;
  }, {} as Record<number, CropPhoto[]>);

  const getStageStatus = (stageDay: number) => {
    if (stageDay < currentDay) return "completed";
    if (stageDay === currentDay) return "current";
    return "upcoming";
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary text-primary-foreground";
      case "current":
        return "bg-accent text-accent-foreground ring-2 ring-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sprout className="h-5 w-5 text-primary" />
          Crop Growth Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {dayTasksData.map((stage, index) => {
              const status = getStageStatus(stage.day);
              const stagePhotos = photosByDay[stage.day] || [];
              
              return (
                <div key={stage.day} className="relative pl-14">
                  {/* Timeline node */}
                  <div
                    className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center ${getStageColor(status)}`}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : status === "current" ? (
                      <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-semibold ${status === "upcoming" ? "text-muted-foreground" : ""}`}>
                        {stage.stage}
                      </h4>
                      <Badge variant={status === "current" ? "default" : "secondary"} className="text-xs">
                        Day {stage.day}
                      </Badge>
                      {status === "current" && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Current
                        </Badge>
                      )}
                    </div>

                    <ul className={`text-sm space-y-1 ${status === "upcoming" ? "text-muted-foreground" : "text-foreground/80"}`}>
                      {stage.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Photos for this stage */}
                    {stagePhotos.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Camera className="h-3 w-3" />
                          <span>{stagePhotos.length} photo{stagePhotos.length > 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {stagePhotos.map((photo) => (
                            <div
                              key={photo.id}
                              className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted group"
                            >
                              <img
                                src={photo.image_url}
                                alt={photo.description || `Day ${photo.day}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                                <span className="text-white text-xs truncate">
                                  {photo.description || format(new Date(photo.created_at), "MMM d")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

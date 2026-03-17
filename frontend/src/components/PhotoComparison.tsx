import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface PhotoComparisonProps {
  sessionId: string;
}

interface CropPhoto {
  id: string;
  day: number;
  image_url: string;
  description: string | null;
  created_at: string;
}

export const PhotoComparison = ({ sessionId }: PhotoComparisonProps) => {
  const [leftPhotoId, setLeftPhotoId] = useState<string>("");
  const [rightPhotoId, setRightPhotoId] = useState<string>("");

  const { data: photos = [] } = useQuery({
    queryKey: ["crop-photos", sessionId],
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

  const leftPhoto = photos.find((p) => p.id === leftPhotoId);
  const rightPhoto = photos.find((p) => p.id === rightPhotoId);

  const groupedByDay = photos.reduce((acc, photo) => {
    if (!acc[photo.day]) acc[photo.day] = [];
    acc[photo.day].push(photo);
    return acc;
  }, {} as Record<number, CropPhoto[]>);

  const navigatePhoto = (side: "left" | "right", direction: "prev" | "next") => {
    const currentId = side === "left" ? leftPhotoId : rightPhotoId;
    const setPhoto = side === "left" ? setLeftPhotoId : setRightPhotoId;
    const currentIndex = photos.findIndex((p) => p.id === currentId);
    
    if (direction === "prev" && currentIndex > 0) {
      setPhoto(photos[currentIndex - 1].id);
    } else if (direction === "next" && currentIndex < photos.length - 1) {
      setPhoto(photos[currentIndex + 1].id);
    }
  };

  if (photos.length < 2) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5 text-primary" />
            Photo Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Upload at least 2 photos to compare crop growth</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitCompare className="h-5 w-5 text-primary" />
          Photo Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Photo Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Before</label>
            <Select value={leftPhotoId} onValueChange={setLeftPhotoId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a photo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedByDay).map(([day, dayPhotos]) => (
                  <div key={day}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                      Day {day}
                    </div>
                    {dayPhotos.map((photo) => (
                      <SelectItem key={photo.id} value={photo.id}>
                        Day {photo.day} - {format(new Date(photo.created_at), "MMM d, HH:mm")}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right Photo Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">After</label>
            <Select value={rightPhotoId} onValueChange={setRightPhotoId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a photo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedByDay).map(([day, dayPhotos]) => (
                  <div key={day}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                      Day {day}
                    </div>
                    {dayPhotos.map((photo) => (
                      <SelectItem key={photo.id} value={photo.id}>
                        Day {photo.day} - {format(new Date(photo.created_at), "MMM d, HH:mm")}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison View */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Photo */}
          <div className="space-y-2">
            {leftPhoto ? (
              <div className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-primary/20">
                  <img
                    src={leftPhoto.image_url}
                    alt={leftPhoto.description || `Day ${leftPhoto.day}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg">
                  <div className="flex items-center gap-1 text-white text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">Day {leftPhoto.day}</span>
                  </div>
                  <p className="text-white/80 text-xs">
                    {format(new Date(leftPhoto.created_at), "PPP")}
                  </p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigatePhoto("left", "prev")}
                    disabled={photos.findIndex((p) => p.id === leftPhotoId) === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigatePhoto("left", "next")}
                    disabled={photos.findIndex((p) => p.id === leftPhotoId) === photos.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <p className="text-muted-foreground text-sm">Select "Before" photo</p>
              </div>
            )}
          </div>

          {/* Right Photo */}
          <div className="space-y-2">
            {rightPhoto ? (
              <div className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-accent/20">
                  <img
                    src={rightPhoto.image_url}
                    alt={rightPhoto.description || `Day ${rightPhoto.day}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg">
                  <div className="flex items-center gap-1 text-white text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">Day {rightPhoto.day}</span>
                  </div>
                  <p className="text-white/80 text-xs">
                    {format(new Date(rightPhoto.created_at), "PPP")}
                  </p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigatePhoto("right", "prev")}
                    disabled={photos.findIndex((p) => p.id === rightPhotoId) === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigatePhoto("right", "next")}
                    disabled={photos.findIndex((p) => p.id === rightPhotoId) === photos.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                <p className="text-muted-foreground text-sm">Select "After" photo</p>
              </div>
            )}
          </div>
        </div>

        {/* Growth Summary */}
        {leftPhoto && rightPhoto && (
          <div className="bg-primary/10 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-sm mb-2">Growth Progress</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{rightPhoto.day - leftPhoto.day}</p>
                <p className="text-xs text-muted-foreground">Days Apart</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Day {leftPhoto.day}</p>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Day {rightPhoto.day}</p>
                <p className="text-xs text-muted-foreground">End</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

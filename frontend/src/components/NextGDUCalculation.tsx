import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { format, setHours, setMinutes, setSeconds, addDays, differenceInSeconds } from "date-fns";

export const NextGDUCalculation = () => {
  const [timeUntilNext, setTimeUntilNext] = useState("");
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);

  useEffect(() => {
    const calculateNext = () => {
      const now = new Date();
      let next = setSeconds(setMinutes(setHours(now, 23), 0), 0);
      
      // If it's already past 23:00, schedule for tomorrow
      if (now >= next) {
        next = addDays(next, 1);
      }
      
      setNextRunTime(next);
      
      const diffSeconds = differenceInSeconds(next, now);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      
      if (hours > 0) {
        setTimeUntilNext(`${hours}h ${minutes}m`);
      } else {
        setTimeUntilNext(`${minutes}m`);
      }
    };

    calculateNext();
    const interval = setInterval(calculateNext, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <RefreshCw className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Next Auto-GDU</p>
            <p className="text-xl font-bold">{timeUntilNext}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {nextRunTime && format(nextRunTime, "HH:mm")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

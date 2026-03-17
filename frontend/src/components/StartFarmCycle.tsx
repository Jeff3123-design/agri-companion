import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Leaf, CalendarIcon, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface StartFarmCycleProps {
  onStart: (plantingDate: Date) => Promise<any>;
  isLoading?: boolean;
}

export const StartFarmCycle = ({ onStart, isLoading }: StartFarmCycleProps) => {
  const [plantingOption, setPlantingOption] = useState<"today" | "earlier">("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleStart = async () => {
    const date = plantingOption === "today" ? new Date() : selectedDate;
    await onStart(date);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Leaf className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Start Your Farm Cycle</CardTitle>
          <CardDescription>
            Set up your maize growing cycle to start tracking GDU-based growth stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={plantingOption}
            onValueChange={(value) => setPlantingOption(value as "today" | "earlier")}
            className="space-y-3"
          >
            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
              plantingOption === "today" ? "bg-primary/10 border-primary" : "hover:bg-muted"
            )}>
              <RadioGroupItem value="today" id="today" />
              <Label htmlFor="today" className="flex-1 cursor-pointer">
                <p className="font-medium">I'm planting today</p>
                <p className="text-sm text-muted-foreground">Start tracking from {format(new Date(), "MMMM d, yyyy")}</p>
              </Label>
            </div>

            <div className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
              plantingOption === "earlier" ? "bg-primary/10 border-primary" : "hover:bg-muted"
            )}>
              <RadioGroupItem value="earlier" id="earlier" />
              <Label htmlFor="earlier" className="flex-1 cursor-pointer">
                <p className="font-medium">I started earlier</p>
                <p className="text-sm text-muted-foreground">Select your actual planting date</p>
              </Label>
            </div>
          </RadioGroup>

          {plantingOption === "earlier" && (
            <div className="space-y-2">
              <Label>Select Planting Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date() || date < subDays(new Date(), 180)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                You can record past temperature data to calculate GDU from your planting date.
              </p>
            </div>
          )}

          <Button onClick={handleStart} className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Leaf className="mr-2 h-4 w-4" />
                Start My Farm Cycle
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            GDU (Growing Degree Units) tracking helps you accurately monitor maize growth stages based on accumulated heat units.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, Leaf, Calendar, TrendingUp, Plus, History, Target } from "lucide-react";
import { GDU_STAGES, getGrowthStage, getNextStage, getStageProgress, getDaysSincePlanting, getTasksForStage } from "@/lib/gdu";
import { GDUSession, DailyGDURecord } from "@/hooks/useGDUSession";
import { format } from "date-fns";

interface GDUDashboardProps {
  session: GDUSession;
  dailyRecords: DailyGDURecord[];
  onAddGDU: (date: Date, tempMax: number, tempMin: number) => Promise<any>;
}

export const GDUDashboard = ({ session, dailyRecords, onAddGDU }: GDUDashboardProps) => {
  const [tempMax, setTempMax] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStage = getGrowthStage(session.accumulated_gdu);
  const nextStage = getNextStage(session.accumulated_gdu);
  const stageProgress = getStageProgress(session.accumulated_gdu);
  const daysSincePlanting = session.planting_date ? getDaysSincePlanting(session.planting_date) : 0;
  const tasks = getTasksForStage(currentStage.stage);

  const handleSubmit = async () => {
    if (!tempMax || !tempMin) return;
    setIsSubmitting(true);
    await onAddGDU(new Date(selectedDate), parseFloat(tempMax), parseFloat(tempMin));
    setTempMax("");
    setTempMin("");
    setIsDialogOpen(false);
    setIsSubmitting(false);
  };

  const gduToNextStage = nextStage ? nextStage.minGdu - session.accumulated_gdu : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accumulated GDU</p>
                <p className="text-2xl font-bold">{session.accumulated_gdu.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Stage</p>
                <p className="text-2xl font-bold">{currentStage.stage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days Since Planting</p>
                <p className="text-2xl font-bold">{daysSincePlanting}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GDU to Next Stage</p>
                <p className="text-2xl font-bold">{gduToNextStage.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Stage Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                {currentStage.name} ({currentStage.stage})
              </CardTitle>
              <CardDescription>{currentStage.description}</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Temperature
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5" />
                    Record Daily Temperature
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tempMax">Max Temp (°C)</Label>
                      <Input
                        id="tempMax"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 28"
                        value={tempMax}
                        onChange={(e) => setTempMax(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tempMin">Min Temp (°C)</Label>
                      <Input
                        id="tempMin"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 15"
                        value={tempMin}
                        onChange={(e) => setTempMin(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GDU = ((Max + Min) / 2) - 10°C base temp
                  </p>
                  <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting || !tempMax || !tempMin}>
                    {isSubmitting ? "Recording..." : "Record GDU"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Stage Progress</span>
                <span>{stageProgress.toFixed(0)}%</span>
              </div>
              <Progress value={stageProgress} className="h-3" />
            </div>

            {nextStage && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Next Stage: {nextStage.name} ({nextStage.stage})</p>
                <p className="text-xs text-muted-foreground">
                  Requires {nextStage.minGdu} GDU ({gduToNextStage.toFixed(0)} more needed)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Tasks and History */}
      <Tabs defaultValue="tasks">
        <TabsList className="w-full">
          <TabsTrigger value="tasks" className="flex-1">
            <Leaf className="h-4 w-4 mr-2" />
            Current Tasks
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <History className="h-4 w-4 mr-2" />
            GDU History
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            All Stages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tasks for {currentStage.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {tasks.map((task, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Temperature & GDU History</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRecords.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {[...dailyRecords].reverse().map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.temp_max}°C / {record.temp_min}°C
                        </p>
                      </div>
                      <Badge variant="secondary">+{Number(record.gdu).toFixed(1)} GDU</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No temperature data recorded yet. Start recording daily temperatures to track GDU accumulation.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
            <CardHeader>
              <CardTitle>Maize Growth Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {GDU_STAGES.map((stage) => {
                  const isCurrentStage = stage.stage === currentStage.stage;
                  const isPast = session.accumulated_gdu >= stage.maxGdu;
                  
                  return (
                    <div 
                      key={stage.stage} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCurrentStage ? "bg-primary/10 border-primary" : 
                        isPast ? "bg-muted/50" : "bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={isCurrentStage ? "default" : isPast ? "secondary" : "outline"}>
                          {stage.stage}
                        </Badge>
                        <div>
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {stage.minGdu} - {stage.maxGdu === 99999 ? "∞" : stage.maxGdu} GDU
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
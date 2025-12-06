import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGDUSession } from "@/hooks/useGDUSession";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, Leaf, Calendar as CalendarIcon, Thermometer, Target } from "lucide-react";
import { GDU_STAGES, getGrowthStage, getNextStage, getTasksForStage, getDaysSincePlanting } from "@/lib/gdu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

const Calendar = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<typeof GDU_STAGES[number] | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const { session, dailyRecords, loading: sessionLoading, hasActiveSession } = useGDUSession(userId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData) setProfile(profileData);
        setLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasActiveSession || !session) {
    return (
      <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
        <div className="text-center py-12">
          <Leaf className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Active Farm Cycle</h2>
          <p className="text-muted-foreground mb-4">Start a farm cycle to track growth stages</p>
          <Button onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentStage = getGrowthStage(Number(session.accumulated_gdu));
  const nextStage = getNextStage(Number(session.accumulated_gdu));
  const daysSincePlanting = session.planting_date ? getDaysSincePlanting(session.planting_date) : 0;
  const totalGdu = Number(session.accumulated_gdu);
  const gduToNextStage = nextStage ? nextStage.minGdu - totalGdu : 0;

  // Calculate overall progress (VE to R6)
  const maxGdu = 2450; // R6 maturity
  const overallProgress = Math.min(100, (totalGdu / maxGdu) * 100);

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">GDU Growth Calendar</h1>
            <p className="text-muted-foreground">
              Track your maize growth stages based on accumulated GDU
            </p>
          </div>
          {session.planting_date && (
            <Badge variant="outline" className="text-sm">
              Planted: {format(new Date(session.planting_date), "MMM d, yyyy")}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total GDU</p>
                <p className="text-xl font-bold">{totalGdu.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Stage</p>
                <p className="text-xl font-bold">{currentStage.stage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days</p>
                <p className="text-xl font-bold">{daysSincePlanting}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To Next Stage</p>
                <p className="text-xl font-bold">{gduToNextStage.toFixed(0)} GDU</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Growth Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>VE (Emergence)</span>
              <span>R6 (Maturity)</span>
            </div>
            <Progress value={overallProgress} className="h-4" />
            <p className="text-center text-sm text-muted-foreground">
              {overallProgress.toFixed(0)}% complete ({totalGdu.toFixed(0)} / {maxGdu} GDU)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Growth Stages Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Stages Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {GDU_STAGES.map((stage) => {
              const isCurrentStage = stage.stage === currentStage.stage;
              const isPast = totalGdu >= stage.maxGdu;
              const stageProgress = isPast ? 100 : 
                isCurrentStage ? ((totalGdu - stage.minGdu) / (stage.maxGdu - stage.minGdu)) * 100 : 0;

              return (
                <button
                  key={stage.stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                    isCurrentStage ? "bg-primary/10 border-primary ring-2 ring-primary/20" : 
                    isPast ? "bg-muted/50 border-muted" : "bg-background hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={isCurrentStage ? "default" : isPast ? "secondary" : "outline"}>
                        {stage.stage}
                      </Badge>
                      <span className="font-medium">{stage.name}</span>
                      {isCurrentStage && (
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stage.minGdu} - {stage.maxGdu === 99999 ? "∞" : stage.maxGdu} GDU
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                  {(isCurrentStage || isPast) && (
                    <Progress value={stageProgress} className="h-2" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Temperature History */}
      {dailyRecords.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Recent Temperature Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[...dailyRecords].reverse().slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">
                      Max: {record.temp_max}°C / Min: {record.temp_min}°C
                    </p>
                  </div>
                  <Badge variant="secondary">+{Number(record.gdu).toFixed(1)} GDU</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Detail Dialog */}
      <Dialog open={selectedStage !== null} onOpenChange={() => setSelectedStage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              {selectedStage?.name} ({selectedStage?.stage})
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">GDU Range</p>
                <p className="font-medium">
                  {selectedStage?.minGdu} - {selectedStage?.maxGdu === 99999 ? "∞" : selectedStage?.maxGdu} GDU
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">{selectedStage?.description}</p>
              </div>

              {selectedStage && (
                <div>
                  <h4 className="font-medium mb-3">Tasks for this stage:</h4>
                  <ul className="space-y-2">
                    {getTasksForStage(selectedStage.stage).map((task, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
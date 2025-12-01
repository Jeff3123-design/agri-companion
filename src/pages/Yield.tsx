import { useState, useEffect } from "react";
import { TrendingUp, Loader2, BarChart3, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { predictYield } from "@/lib/api";
import { YieldPrediction } from "@/types/farm";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const Yield = () => {
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDay] = useState(() => {
    const saved = localStorage.getItem('farmCurrentDay');
    return saved ? parseInt(saved) : 1;
  });

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await predictYield({
        currentDay,
        weatherConditions: {},
        pestStatus: "good"
      });
      setPrediction(data);
      toast.success("Yield prediction updated!");
    } catch (error: any) {
      console.error("Prediction error:", error);
      toast.error(error.message || "Failed to get yield prediction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load if backend is configured
    const config = localStorage.getItem('backendConfig');
    if (config) {
      const { apiUrl } = JSON.parse(config);
      if (apiUrl) {
        loadPrediction();
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Calculating yield prediction...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Yield Prediction</h1>
          <p className="text-muted-foreground">
            AI-powered harvest estimates based on current conditions
          </p>
        </div>

        {!prediction ? (
          <Card className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Prediction Available</h3>
            <p className="text-muted-foreground mb-4">
              Get AI-powered yield predictions by connecting your backend
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadPrediction}>
                Generate Prediction
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/settings'}>
                Configure Backend
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Main Prediction Card */}
            <Card className="p-8 mb-6 bg-gradient-farm border-none shadow-elevated">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-primary-foreground/80 mb-2">
                    <Target className="w-5 h-5" />
                    <span className="text-sm font-medium">Estimated Yield</span>
                  </div>
                  <div className="text-5xl font-bold text-primary-foreground mb-2">
                    {prediction.estimatedYield.toLocaleString()}
                  </div>
                  <p className="text-xl text-primary-foreground/90">
                    {prediction.unit} per hectare
                  </p>
                </div>
                <TrendingUp className="w-16 h-16 text-primary-foreground/50" />
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-foreground/80">Confidence Level</span>
                  <span className="text-sm font-semibold text-primary-foreground">
                    {prediction.confidence}%
                  </span>
                </div>
                <Progress value={prediction.confidence} className="h-2" />
              </div>
            </Card>

            {/* Factors Analysis */}
            <Card className="p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">Contributing Factors</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <span className="text-2xl">☀️</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Weather Conditions</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {prediction.factors.weather}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    prediction.factors.weather === 'excellent' ? 'bg-primary/10 text-primary' :
                    prediction.factors.weather === 'good' ? 'bg-green-500/10 text-green-600' :
                    'bg-accent/10 text-accent'
                  }`}>
                    {prediction.factors.weather}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <span className="text-2xl">🌱</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Soil Health</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {prediction.factors.soilHealth}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    prediction.factors.soilHealth === 'excellent' ? 'bg-primary/10 text-primary' :
                    prediction.factors.soilHealth === 'good' ? 'bg-green-500/10 text-green-600' :
                    'bg-accent/10 text-accent'
                  }`}>
                    {prediction.factors.soilHealth}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <span className="text-2xl">🐛</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Pest Management</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {prediction.factors.pestManagement}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    prediction.factors.pestManagement === 'excellent' ? 'bg-primary/10 text-primary' :
                    prediction.factors.pestManagement === 'good' ? 'bg-green-500/10 text-green-600' :
                    'bg-accent/10 text-accent'
                  }`}>
                    {prediction.factors.pestManagement}
                  </div>
                </div>
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">
                Recommendations to Maximize Yield
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-primary mt-1">✓</span>
                  <span>Continue monitoring weather conditions and adjust irrigation accordingly</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-primary mt-1">✓</span>
                  <span>Regular pest and disease scouting to prevent yield losses</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-primary mt-1">✓</span>
                  <span>Ensure timely fertilizer application for optimal nutrition</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-primary mt-1">✓</span>
                  <span>Plan harvest logistics based on predicted yield volume</span>
                </li>
              </ul>

              <Button 
                onClick={loadPrediction} 
                variant="outline" 
                className="w-full mt-6"
              >
                Refresh Prediction
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Yield;

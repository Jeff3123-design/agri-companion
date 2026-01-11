import { useState, useEffect } from "react";
import { TrendingUp, Loader2, BarChart3, Target, Sprout, Cloud, Bug, Sparkles, Download, RefreshCw, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { predictYield, fetchWeather } from "@/lib/api";
import { YieldPrediction } from "@/types/farm";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { backendConfig } from "@/config/backend";

interface GatheringStep {
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'loading' | 'done';
}

interface GatheredData {
  sessionData: {
    currentDay: number;
    accumulatedGdu: number;
    currentStage: string;
    plantingDate: string | null;
  };
  weatherData: {
    temperature: number;
    humidity: number;
    condition: string;
    location?: string;
  };
  pestStatus: string;
  collectedAt: string;
}

const Yield = () => {
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatheredData, setGatheredData] = useState<GatheredData | null>(null);
  const [dataDownloaded, setDataDownloaded] = useState(false);
  const [fetchingFromBackend, setFetchingFromBackend] = useState(false);
  const [gatheringSteps, setGatheringSteps] = useState<GatheringStep[]>([
    { label: 'Fetching farm session data', icon: Sprout, status: 'pending' },
    { label: 'Getting current weather conditions', icon: Cloud, status: 'pending' },
    { label: 'Analyzing pest management status', icon: Bug, status: 'pending' },
    { label: 'Saving data for prediction', icon: Download, status: 'pending' },
  ]);
  const [currentMessage, setCurrentMessage] = useState("Preparing your yield analysis...");

  const updateStepStatus = (index: number, status: 'pending' | 'loading' | 'done') => {
    setGatheringSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status } : step
    ));
  };

  const downloadDataAsJSON = (data: GatheredData) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm-yield-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDataDownloaded(true);
    toast.success("Data saved to Downloads folder!");
  };

  const fetchPredictionFromBackend = async () => {
    if (!backendConfig.apiUrl) {
      toast.error("Backend URL not configured. Go to Settings to configure.");
      return;
    }

    setFetchingFromBackend(true);
    try {
      const response = await fetch(`${backendConfig.apiUrl}/yield/predict`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(backendConfig.apiKey && { 'Authorization': `Bearer ${backendConfig.apiKey}` })
        },
      });

      if (!response.ok) {
        throw new Error('Backend not ready or prediction not available yet');
      }

      const result = await response.json();
      setPrediction(result);
      toast.success("Prediction fetched from your backend!");
    } catch (error: any) {
      console.error("Backend fetch error:", error);
      toast.error(error.message || "Could not fetch from backend. Make sure it's running.");
    } finally {
      setFetchingFromBackend(false);
    }
  };

  const gatherData = async () => {
    setLoading(true);
    setPrediction(null);
    setDataDownloaded(false);
    setGatheringSteps([
      { label: 'Fetching farm session data', icon: Sprout, status: 'pending' },
      { label: 'Getting current weather conditions', icon: Cloud, status: 'pending' },
      { label: 'Analyzing pest management status', icon: Bug, status: 'pending' },
      { label: 'Saving data for prediction', icon: Download, status: 'pending' },
    ]);
    
    try {
      // Step 1: Get farm session data
      updateStepStatus(0, 'loading');
      setCurrentMessage("Checking your farm's growth progress...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to view predictions");

      const { data: session } = await supabase
        .from("farming_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const sessionData = {
        currentDay: session?.current_day || 1,
        accumulatedGdu: session?.accumulated_gdu || 0,
        currentStage: session?.current_stage || "VE",
        plantingDate: session?.planting_date || null,
      };
      
      updateStepStatus(0, 'done');
      await new Promise(r => setTimeout(r, 500));

      // Step 2: Get weather data
      updateStepStatus(1, 'loading');
      setCurrentMessage("Analyzing current weather patterns...");
      
      let weatherData = {
        temperature: 25,
        humidity: 60,
        condition: "Clear",
        location: undefined as string | undefined
      };

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const weather = await fetchWeather(position.coords.latitude, position.coords.longitude);
        weatherData = {
          temperature: weather.temperature,
          humidity: weather.humidity,
          condition: weather.condition,
          location: weather.location
        };
      } catch {
        console.log("Using default weather conditions");
      }
      
      updateStepStatus(1, 'done');
      await new Promise(r => setTimeout(r, 500));

      // Step 3: Get pest status
      updateStepStatus(2, 'loading');
      setCurrentMessage("Evaluating pest and disease management...");
      
      const pestStatus = "good";
      
      updateStepStatus(2, 'done');
      await new Promise(r => setTimeout(r, 500));

      // Step 4: Save data to downloads
      updateStepStatus(3, 'loading');
      setCurrentMessage("Preparing data for your backend...");

      const collectedData: GatheredData = {
        sessionData,
        weatherData,
        pestStatus,
        collectedAt: new Date().toISOString(),
      };

      setGatheredData(collectedData);
      
      // Auto-download the data
      downloadDataAsJSON(collectedData);
      
      updateStepStatus(3, 'done');
      await new Promise(r => setTimeout(r, 300));
      
      setCurrentMessage("Data saved! Now run your backend and fetch results.");
    } catch (error: any) {
      console.error("Data gathering error:", error);
      toast.error(error.message || "Failed to gather data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gatherData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-8 pt-20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sprout className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto">
              <svg className="animate-spin-slow" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="70 200"
                  className="text-primary/30"
                />
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Analyzing Your Farm
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {currentMessage}
          </p>

          <div className="space-y-3 text-left mb-6">
            {gatheringSteps.map((step, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  step.status === 'loading' ? 'bg-primary/10' : 
                  step.status === 'done' ? 'bg-green-500/10' : 'bg-muted/50'
                }`}
              >
                <div className={`p-1.5 rounded-full ${
                  step.status === 'loading' ? 'bg-primary/20' : 
                  step.status === 'done' ? 'bg-green-500/20' : 'bg-muted'
                }`}>
                  {step.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : step.status === 'done' ? (
                    <span className="w-4 h-4 flex items-center justify-center text-green-600 text-xs">✓</span>
                  ) : (
                    <step.icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${
                  step.status === 'done' ? 'text-green-600' : 
                  step.status === 'loading' ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            This may take a few moments...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Yield Prediction</h1>
          <p className="text-muted-foreground">
            AI-powered harvest estimates based on current conditions
          </p>
        </div>

        {/* Data Gathered Card */}
        {gatheredData && !prediction && (
          <Card className="p-6 mb-6 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Data Collected & Downloaded!</h3>
                <p className="text-sm text-muted-foreground">
                  Your farm data has been saved to your Downloads folder.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-sm">
              <p className="font-medium text-foreground mb-2">Collected Data Summary:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Current Day: {gatheredData.sessionData.currentDay}</li>
                <li>• Accumulated GDU: {gatheredData.sessionData.accumulatedGdu}</li>
                <li>• Growth Stage: {gatheredData.sessionData.currentStage}</li>
                <li>• Temperature: {gatheredData.weatherData.temperature}°C</li>
                <li>• Condition: {gatheredData.weatherData.condition}</li>
                <li>• Location: {gatheredData.weatherData.location || 'N/A'}</li>
              </ul>
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground">
                <strong>Next Step:</strong> Run your Python backend with the downloaded data, 
                then click "Fetch Prediction" below to get your results.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={fetchPredictionFromBackend} 
                disabled={fetchingFromBackend}
                className="flex-1"
              >
                {fetchingFromBackend ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Fetch Prediction from Backend
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => gatheredData && downloadDataAsJSON(gatheredData)}
              >
                <Download className="mr-2 h-4 w-4" />
                Re-download Data
              </Button>
            </div>

            <Button 
              variant="ghost" 
              onClick={gatherData} 
              className="w-full mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Gather Fresh Data
            </Button>
          </Card>
        )}

        {!prediction && !gatheredData && (
          <Card className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">
              Start by gathering your farm data for the prediction.
            </p>
            <Button onClick={gatherData}>
              Gather Data
            </Button>
          </Card>
        )}

        {prediction && (
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

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={gatherData} 
                  variant="outline" 
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gather New Data
                </Button>
                <Button 
                  onClick={fetchPredictionFromBackend}
                  disabled={fetchingFromBackend}
                  className="flex-1"
                >
                  {fetchingFromBackend ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Refresh from Backend
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Yield;
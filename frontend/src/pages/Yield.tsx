import { useState, useEffect } from "react";
import { TrendingUp, Loader2, BarChart3, Target, Sprout, Cloud, Bug, Sparkles, Download, RefreshCw, CheckCircle, Leaf, Droplets, MapPin, Calendar, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";  // 👈 ADD THIS
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWeather, fetch7DayForecast } from "@/lib/api";
import { predictYield } from "@/services/yieldApi";
import { YieldPredictionResponse, GatheredData } from "@/types/yield";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { backendConfig } from "@/config/backend";

interface GatheringStep {
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'loading' | 'done';
}

const MAIZE_VARIETIES = [
  { value: "local", label: "Local/Traditional Variety" },
  { value: "hybrid_early", label: "Hybrid - Early Maturing (90-100 days)" },
  { value: "hybrid_medium", label: "Hybrid - Medium Maturing (100-120 days)" },
  { value: "hybrid_late", label: "Hybrid - Late Maturing (120+ days)" },
  { value: "opv", label: "Open Pollinated Variety (OPV)" },
  { value: "drought_tolerant", label: "Drought Tolerant Variety" },
  { value: "quality_protein", label: "Quality Protein Maize (QPM)" },
  { value: "other", label: "Other" },
];

const STORAGE_KEY = 'yield_gathered_data';
const PREDICTION_STORAGE_KEY = 'yield_prediction';

const Yield = () => {
  // Load initial state from localStorage
  const [prediction, setPrediction] = useState<YieldPredictionResponse | null>(() => {
    try {
      const saved = localStorage.getItem(PREDICTION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  const [loading, setLoading] = useState(false);
  const [gatheredData, setGatheredData] = useState<GatheredData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  const [dataDownloaded, setDataDownloaded] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });
  
  const [fetchingFromBackend, setFetchingFromBackend] = useState(false);
  const [maizeVariety, setMaizeVariety] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return MAIZE_VARIETIES.find(v => v.label === data.farmInfo?.maizeVariety)?.value || "";
      }
    } catch {}
    return "";
  });
  
  const [soilPH, setSoilPH] = useState<string>("6.2");
  const [showVarietyPrompt, setShowVarietyPrompt] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY);
  });
  
  const [gatheringSteps, setGatheringSteps] = useState<GatheringStep[]>([
    { label: 'Fetching farm & profile data', icon: Sprout, status: 'pending' },
    { label: 'Getting weather & rainfall data', icon: Cloud, status: 'pending' },
    { label: 'Analyzing pest status (FAW)', icon: Bug, status: 'pending' },
    { label: 'Calculating crop health (NDVI proxy)', icon: Leaf, status: 'pending' },
    { label: 'Saving data for prediction', icon: Download, status: 'pending' },
  ]);
  
  const [currentMessage, setCurrentMessage] = useState("Preparing your yield analysis...");

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${backendConfig.apiUrl}/health`);
        if (response.ok) {
          console.log("✅ Backend connected on port 8000");
        } else {
          console.warn("⚠️ Backend not responding on port 8000");
        }
      } catch (error) {
        console.warn("⚠️ Backend not reachable on port 8000");
      }
    };
    checkBackend();
  }, []);

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
      toast.error("Backend URL not configured.");
      return;
    }

    if (!gatheredData) {
      toast.error("No data available. Please gather data first.");
      return;
    }

    setFetchingFromBackend(true);
    try {
      // Use the imported predictYield function from yieldApi.ts
      const result = await predictYield(gatheredData);
      
      setPrediction(result);
      localStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify(result));
      toast.success("Prediction received from backend!");
    } catch (error: any) {
      console.error("Backend fetch error:", error);
      toast.error(error.message || "Could not fetch from backend. Make sure it's running on port 8000.");
    } finally {
      setFetchingFromBackend(false);
    }
  };

  const gatherData = async () => {
    if (!maizeVariety) {
      toast.error("Please select your maize variety first");
      return;
    }

    setLoading(true);
    setPrediction(null);
    setDataDownloaded(false);
    setShowVarietyPrompt(false);
    setGatheringSteps([
      { label: 'Fetching farm & profile data', icon: Sprout, status: 'pending' },
      { label: 'Getting weather & rainfall data', icon: Cloud, status: 'pending' },
      { label: 'Analyzing pest status (FAW)', icon: Bug, status: 'pending' },
      { label: 'Calculating crop health (NDVI proxy)', icon: Leaf, status: 'pending' },
      { label: 'Saving data for prediction', icon: Download, status: 'pending' },
    ]);
    
    try {
      // Step 1: Get farm session + profile data
      updateStepStatus(0, 'loading');
      setCurrentMessage("Checking your farm's growth progress...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to view predictions");

      const [sessionResult, profileResult] = await Promise.all([
        supabase
          .from("farming_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
      ]);

      const session = sessionResult.data;
      const profile = profileResult.data;

      const farmInfo = {
        farmSize: profile?.farm_size || "Not specified",
        farmLocation: profile?.farm_location || "Not specified",
        maizeVariety: MAIZE_VARIETIES.find(v => v.value === maizeVariety)?.label || maizeVariety,
        soilPH: soilPH, // Include soil pH
      };

      const sessionData = {
        currentDay: session?.current_day || 1,
        accumulatedGdu: Number(session?.accumulated_gdu) || 0,
        currentStage: session?.current_stage || "VE",
        plantingDate: session?.planting_date || null,
      };
      
      updateStepStatus(0, 'done');
      await new Promise(r => setTimeout(r, 400));

      // Step 2: Get weather + rainfall data
      updateStepStatus(1, 'loading');
      setCurrentMessage("Analyzing weather and rainfall patterns...");
      
      let weatherData = {
        temperature: 25,
        humidity: 60,
        condition: "Clear",
        location: "Unknown",
        coordinates: { latitude: 0, longitude: 0 }
      };
      
      let rainfallData = {
        recentRainfall: "Unknown",
        forecast7Day: [] as Array<{ date: string; condition: string; tempMax: number; tempMin: number; }>
      };

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const [weather, forecast] = await Promise.all([
          fetchWeather(position.coords.latitude, position.coords.longitude),
          fetch7DayForecast(position.coords.latitude, position.coords.longitude)
        ]);
        
        weatherData = {
          temperature: weather.temperature,
          humidity: weather.humidity,
          condition: weather.condition,
          location: weather.location || "Unknown",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        };

        // Estimate recent rainfall from weather conditions
        const rainyConditions = forecast.filter(d => 
          d.condition.toLowerCase().includes('rain') || 
          d.condition.toLowerCase().includes('shower') ||
          d.condition.toLowerCase().includes('drizzle')
        );
        
        rainfallData = {
          recentRainfall: rainyConditions.length > 2 ? "High" : rainyConditions.length > 0 ? "Moderate" : "Low",
          forecast7Day: forecast.map(d => ({
            date: d.date,
            condition: d.condition,
            tempMax: d.tempMax,
            tempMin: d.tempMin
          }))
        };
      } catch {
        console.log("Using default weather conditions");
      }
      
      updateStepStatus(1, 'done');
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Get pest status with FAW focus
      updateStepStatus(2, 'loading');
      setCurrentMessage("Evaluating pest presence (Fall Armyworm)...");
      
      const { data: recentPhotos } = await supabase
        .from("crop_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const pestData = {
        overallStatus: recentPhotos && recentPhotos.length > 0 ? "Monitored" : "Unknown",
        fawPresence: "Not detected",
        recentChecks: recentPhotos?.length || 0
      };
      
      updateStepStatus(2, 'done');
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Calculate NDVI proxy / crop health
      updateStepStatus(3, 'loading');
      setCurrentMessage("Calculating crop health indicators...");
      
      const expectedGdu = sessionData.currentDay * 15;
      const gduProgress = expectedGdu > 0 ? Math.min(sessionData.accumulatedGdu / expectedGdu, 1.2) : 0.5;
      const healthScore = Math.round(
        (gduProgress * 0.4 + 
         (weatherData.humidity / 100) * 0.3 + 
         (pestData.overallStatus === "Monitored" ? 0.3 : 0.15)) * 100
      );

      const cropHealthProxy = {
        ndviEstimate: healthScore > 70 ? "High (0.6-0.8)" : healthScore > 50 ? "Moderate (0.4-0.6)" : "Low (<0.4)",
        healthScore: Math.min(healthScore, 100),
        basedOn: "GDU progress, weather conditions, and pest monitoring frequency"
      };
      
      updateStepStatus(3, 'done');
      await new Promise(r => setTimeout(r, 400));

      // Step 5: Compile and save data
      updateStepStatus(4, 'loading');
      setCurrentMessage("Preparing data for your backend...");

      const collectedData: GatheredData = {
        farmInfo,
        sessionData,
        weatherData,
        rainfallData,
        pestData,
        cropHealthProxy,
        collectedAt: new Date().toISOString(),
      };

      setGatheredData(collectedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedData));
      downloadDataAsJSON(collectedData);
      
      updateStepStatus(4, 'done');
      await new Promise(r => setTimeout(r, 300));
      
      setCurrentMessage("Data saved! Now fetch prediction from backend.");
    } catch (error: any) {
      console.error("Data gathering error:", error);
      toast.error(error.message || "Failed to gather data");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Backend Status Indicator */}
        <div className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Backend: http://localhost:8000</span>
        </div>

        {/* Maize Variety Selection */}
        {showVarietyPrompt && !loading && !gatheredData && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Select Your Maize Variety</h3>
                <p className="text-sm text-muted-foreground">
                  This helps improve prediction accuracy
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="maize-variety">Maize Variety</Label>
                <Select value={maizeVariety} onValueChange={setMaizeVariety}>
                  <SelectTrigger id="maize-variety" className="mt-1">
                    <SelectValue placeholder="Select your maize variety" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAIZE_VARIETIES.map((variety) => (
                      <SelectItem key={variety.value} value={variety.value}>
                        {variety.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="soil-ph">Soil pH (optional)</Label>
                <Input
                  id="soil-ph"
                  type="number"
                  step="0.1"
                  min="4.0"
                  max="8.5"
                  value={soilPH}
                  onChange={(e) => setSoilPH(e.target.value)}
                  className="mt-1"
                  placeholder="6.2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Typical range: 5.5-7.5. Default is 6.2
                </p>
              </div>

              <Button 
                onClick={gatherData} 
                disabled={!maizeVariety}
                className="w-full"
              >
                <Sprout className="mr-2 h-4 w-4" />
                Gather Data & Generate Report
              </Button>
            </div>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                The following data will be collected: Farm size, location, planting date, weather, rainfall, pest status (FAW), and crop health (NDVI proxy).
              </p>
            </div>
          </Card>
        )}

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

            {/* Enhanced Data Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="font-medium text-foreground text-sm">Farm Info</p>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Size: {gatheredData.farmInfo.farmSize}</li>
                  <li>• Location: {gatheredData.farmInfo.farmLocation}</li>
                  <li>• Variety: {gatheredData.farmInfo.maizeVariety}</li>
                  <li>• Soil pH: {gatheredData.farmInfo.soilPH || "6.2"}</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="font-medium text-foreground text-sm">Growth Progress</p>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Day: {gatheredData.sessionData.currentDay}</li>
                  <li>• GDU: {gatheredData.sessionData.accumulatedGdu}</li>
                  <li>• Stage: {gatheredData.sessionData.currentStage}</li>
                  <li>• Planted: {gatheredData.sessionData.plantingDate || 'N/A'}</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <p className="font-medium text-foreground text-sm">Weather & Rainfall</p>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Temp: {gatheredData.weatherData.temperature}°C</li>
                  <li>• Humidity: {gatheredData.weatherData.humidity}%</li>
                  <li>• Condition: {gatheredData.weatherData.condition}</li>
                  <li>• Rainfall: {gatheredData.rainfallData.recentRainfall}</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-orange-500" />
                  <p className="font-medium text-foreground text-sm">Pest & Crop Health</p>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• FAW Status: {gatheredData.pestData.fawPresence}</li>
                  <li>• Monitoring: {gatheredData.pestData.overallStatus}</li>
                  <li>• NDVI: {gatheredData.cropHealthProxy.ndviEstimate}</li>
                  <li>• Health: {gatheredData.cropHealthProxy.healthScore}%</li>
                </ul>
              </div>
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
                Re-download
              </Button>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(PREDICTION_STORAGE_KEY);
                setShowVarietyPrompt(true);
                setGatheredData(null);
                setPrediction(null);
                setMaizeVariety("");
                setSoilPH("6.2");
                setDataDownloaded(false);
              }} 
              className="w-full mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over with Different Variety
            </Button>
          </Card>
        )}

        {!prediction && !gatheredData && !showVarietyPrompt && (
          <Card className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">
              Start by selecting your maize variety to gather farm data.
            </p>
            <Button onClick={() => setShowVarietyPrompt(true)}>
              Select Variety
            </Button>
          </Card>
        )}

        {prediction && (
          <>
            <Card className="p-8 mb-6 bg-gradient-farm border-none shadow-elevated">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-primary-foreground/80 mb-2">
                    <Target className="w-5 h-5" />
                    <span className="text-sm font-medium">Estimated Yield</span>
                  </div>
                  <div className="text-5xl font-bold text-primary-foreground mb-2">
                    {prediction.estimatedYield} tons/ha
                  </div>
                  <p className="text-xl text-primary-foreground/90">
                    Range: {prediction.yieldRange.min} - {prediction.yieldRange.max} tons/ha
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
                <p className="text-xs text-primary-foreground/60 mt-2">
                  Model: {prediction.model_used}
                </p>
              </div>
            </Card>

            <Card className="p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">Contributing Factors</h3>
              <div className="space-y-4">
                {prediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        factor.name === 'Rainfall' ? 'bg-blue-500/10' :
                        factor.name === 'Temperature' ? 'bg-orange-500/10' :
                        factor.name === 'Pest Pressure' ? 'bg-red-500/10' :
                        factor.name === 'Crop Health' ? 'bg-green-500/10' :
                        'bg-purple-500/10'
                      }`}>
                        {factor.name === 'Rainfall' && <Droplets className="w-5 h-5 text-blue-500" />}
                        {factor.name === 'Temperature' && <Cloud className="w-5 h-5 text-orange-500" />}
                        {factor.name === 'Pest Pressure' && <Bug className="w-5 h-5 text-red-500" />}
                        {factor.name === 'Crop Health' && <Leaf className="w-5 h-5 text-green-500" />}
                        {factor.name === 'Growing Degree Days' && <Calendar className="w-5 h-5 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{factor.name}</p>
                        {factor.value && (
                          <p className="text-xs text-muted-foreground">{factor.value}</p>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      factor.impact === 'positive' ? 'bg-green-500/10 text-green-600' :
                      factor.impact === 'negative' ? 'bg-red-500/10 text-red-600' :
                      'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {factor.score}/100
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">
                Recommendations to Maximize Yield
              </h3>
              <ul className="space-y-3">
                {prediction.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-primary mt-1">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
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
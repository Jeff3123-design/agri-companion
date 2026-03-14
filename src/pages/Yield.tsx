import { useState, useEffect } from "react";
import { TrendingUp, Loader2, BarChart3, Target, Sparkles, RefreshCw, Settings2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchWeather, fetch7DayForecast } from "@/lib/api";
import { YieldPrediction } from "@/types/farm";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { backendConfig } from "@/config/backend";

const PREDICTION_STORAGE_KEY = 'yield_prediction';

const COUNTY_ENCODING_MAP: Record<string, number> = {
  kisii: 16, nakuru: 27, uasin_gishu: 45, trans_nzoia: 42, meru: 23,
  nyeri: 31, kakamega: 11, bungoma: 9, machakos: 17, narok: 28,
};

const normalizeCountyKey = (value: string): string =>
  value.trim().toLowerCase().split(',')[0].replace(/\s+/g, '_');

const encodeCounty = (county: string): number => {
  const key = normalizeCountyKey(county);
  if (COUNTY_ENCODING_MAP[key] !== undefined) return COUNTY_ENCODING_MAP[key];
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 47) + 1;
};

const Yield = () => {
  const [prediction, setPrediction] = useState<YieldPrediction | null>(() => {
    try {
      const saved = localStorage.getItem(PREDICTION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState(backendConfig.apiUrl);
  const [configOpen, setConfigOpen] = useState(false);

  const saveBackendConfig = () => {
    backendConfig.apiUrl = backendUrl;
    toast.success("Backend URL updated for this session!");
    setConfigOpen(false);
  };

  const generatePrediction = async () => {
    if (!backendConfig.apiUrl) {
      toast.error("Please configure your backend URL first.");
      setConfigOpen(true);
      return;
    }

    setLoading(true);
    try {
      // Get user & profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first");

      const [sessionResult, profileResult] = await Promise.all([
        supabase.from("farming_sessions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);

      const session = sessionResult.data;
      const profile = profileResult.data;

      // Get weather
      let temperature = 25, humidity = 60, rainfallMm = 700;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        const [weather, forecast] = await Promise.all([
          fetchWeather(position.coords.latitude, position.coords.longitude),
          fetch7DayForecast(position.coords.latitude, position.coords.longitude),
        ]);
        temperature = weather.temperature;
        humidity = weather.humidity;
        const rainyDays = forecast.filter(d =>
          d.condition.toLowerCase().includes('rain') || d.condition.toLowerCase().includes('shower')
        ).length;
        rainfallMm = rainyDays > 2 ? 1400 : rainyDays > 0 ? 850 : 450;
      } catch {
        console.log("Using default weather values");
      }

      // Build 17-feature payload
      const countyEncoded = encodeCounty(profile?.farm_location || "unknown");
      const farmSizeAcres = parseFloat(profile?.farm_size || "1") || 1;
      const accumulatedGdu = Number(session?.accumulated_gdu) || 0;
      const ndvi = Math.min(1, Math.max(0, ((session?.current_day || 1) * 0.008)));
      const soilPH = 6.5;
      const soilNitrogenPct = 0.18;

      const modelPayload = {
        County: countyEncoded,
        FarmSize_acres: farmSizeAcres,
        AvgTemperature_C: temperature,
        Rainfall_mm: rainfallMm,
        Humidity_pct: humidity,
        SoilPH: soilPH,
        SoilNitrogen_pct: soilNitrogenPct,
        NDVI: ndvi,
        AccumulatedGDU: accumulatedGdu,
        Rainfall_x_Temp: rainfallMm * temperature,
        Fertilizer_x_Rainfall: soilNitrogenPct * rainfallMm,
        GDU_per_Day: accumulatedGdu / 120,
        Soil_Quality_Index: (soilPH / 7) * 0.3 + soilNitrogenPct * 2 * 0.7,
        High_Rainfall: rainfallMm > 1000 ? 1 : 0,
        High_Temp: temperature > 28 ? 1 : 0,
        Good_Soil: soilPH >= 5.5 && soilPH <= 7.5 ? 1 : 0,
        County_Encoded: countyEncoded,
      };

      // Send to backend
      const response = await fetch(`${backendConfig.apiUrl}/yield/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(backendConfig.apiKey && { 'Authorization': `Bearer ${backendConfig.apiKey}` }),
        },
        body: JSON.stringify(modelPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Backend returned an error');
      }

      const result = await response.json();
      setPrediction(result);
      localStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify(result));
      toast.success("Yield prediction generated!");
    } catch (error: any) {
      console.error("Prediction error:", error);
      if (error.message?.includes('Failed to fetch')) {
        toast.error("Cannot reach backend. Make sure your ngrok tunnel is running.");
      } else {
        toast.error(error.message || "Failed to generate prediction");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Yield Prediction</h1>
          <p className="text-muted-foreground">
            AI-powered harvest estimates based on current conditions
          </p>
        </div>

        {!prediction && (
          <Card className="p-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Prediction Available</h3>
            <p className="text-muted-foreground mb-6">
              Get AI-powered yield predictions by connecting your backend
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={generatePrediction} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Prediction
                  </>
                )}
              </Button>
              <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configure Backend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Backend Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label htmlFor="backend-url">ngrok URL</Label>
                      <Input
                        id="backend-url"
                        value={backendUrl}
                        onChange={(e) => setBackendUrl(e.target.value)}
                        placeholder="https://xxxx-xx-x-xx-xx.ngrok-free.app"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Update this each time you restart ngrok
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      💡 For permanent changes, edit <code className="text-primary">src/config/backend.ts</code>
                    </p>
                    <Button onClick={saveBackendConfig} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Save URL
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                {[
                  { emoji: "☀️", label: "Weather Conditions", value: prediction.factors.weather, color: "blue" },
                  { emoji: "🌱", label: "Soil Health", value: prediction.factors.soilHealth, color: "green" },
                  { emoji: "🐛", label: "Pest Management", value: prediction.factors.pestManagement, color: "orange" },
                ].map((factor) => (
                  <div key={factor.label} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${factor.color}-500/10 rounded-lg`}>
                        <span className="text-2xl">{factor.emoji}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{factor.label}</p>
                        <p className="text-sm text-muted-foreground capitalize">{factor.value}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      factor.value === 'excellent' ? 'bg-primary/10 text-primary' :
                      factor.value === 'good' ? 'bg-green-500/10 text-green-600' :
                      'bg-accent/10 text-accent'
                    }`}>
                      {factor.value}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 text-foreground">Actions</h3>
              <div className="flex gap-3">
                <Button onClick={generatePrediction} disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Prediction
                </Button>
                <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Configure Backend
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Backend Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label htmlFor="backend-url-2">ngrok URL</Label>
                        <Input
                          id="backend-url-2"
                          value={backendUrl}
                          onChange={(e) => setBackendUrl(e.target.value)}
                          placeholder="https://xxxx-xx-x-xx-xx.ngrok-free.app"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Update this each time you restart ngrok
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        💡 For permanent changes, edit <code className="text-primary">src/config/backend.ts</code>
                      </p>
                      <Button onClick={saveBackendConfig} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        Save URL
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Yield;

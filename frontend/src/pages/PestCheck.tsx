import { useState } from "react";
import { Upload, Camera, Loader2, AlertTriangle, Shield, Bug, Leaf, Sparkles, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PestAnalysisResult {
  name: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  description: string;
  solution: string;
  preventiveMeasures: string[];
  affectedParts: string[];
  spreadRisk: "low" | "medium" | "high";
}

const PestCheck = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PestAnalysisResult | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || !preview) {
      toast.error("Please select an image first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-pest", {
        body: { imageBase64: preview },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-destructive bg-destructive/10 border-destructive/20";
      case "medium": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
      default: return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return <XCircle className="w-5 h-5" />;
      case "medium": return <AlertCircle className="w-5 h-5" />;
      default: return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const isHealthy = result?.name?.toLowerCase().includes("healthy");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 mb-4 shadow-lg">
            <Bug className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Pest & Disease Detection</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Upload a photo of your maize plant and let our AI identify any pests, diseases, or health issues instantly
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6 border-2 border-dashed border-border/50 hover:border-primary/30 transition-colors">
          <div className="space-y-4">
            {preview ? (
              <div className="relative rounded-xl overflow-hidden bg-muted shadow-inner">
                <img src={preview} alt="Preview" className="w-full h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-3 right-3 shadow-lg"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    setResult(null);
                  }}
                >
                  Change Image
                </Button>
                {result && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <Badge className={`${getSeverityColor(result.severity)} border text-sm py-1 px-3`}>
                      {getSeverityIcon(result.severity)}
                      <span className="ml-2">{result.name}</span>
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer bg-gradient-to-b from-primary/5 to-transparent hover:from-primary/10 transition-all group">
                <div className="relative">
                  <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
                  <div className="relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <span className="text-lg font-medium text-foreground mt-4">Click to upload image</span>
                <span className="text-sm text-muted-foreground mt-1">or drag and drop</span>
                <span className="text-xs text-muted-foreground mt-3 px-4 py-2 rounded-full bg-muted">
                  PNG, JPG up to 10MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}

            {preview && !result && (
              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Analyze with AI
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Result Card */}
            <Card className={`p-6 ${isHealthy ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20' : 'border-border'}`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${getSeverityColor(result.severity)}`}>
                  {isHealthy ? <Leaf className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-foreground">{result.name}</h3>
                    <Badge variant="outline" className="font-mono">
                      {result.confidence}% confident
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{result.description}</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className={getSeverityColor(result.severity)}>
                      {result.severity.toUpperCase()} Severity
                    </Badge>
                    <Badge className={getSeverityColor(result.spreadRisk)}>
                      {result.spreadRisk.toUpperCase()} Spread Risk
                    </Badge>
                    {result.affectedParts.map((part, idx) => (
                      <Badge key={idx} variant="secondary">{part}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confidence meter */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AI Confidence Level</span>
                  <span className="text-sm font-semibold text-foreground">{result.confidence}%</span>
                </div>
                <Progress value={result.confidence} className="h-2" />
              </div>
            </Card>

            {/* Solution Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">Recommended Solution</h4>
              </div>
              <p className="text-foreground leading-relaxed">{result.solution}</p>
            </Card>

            {/* Preventive Measures Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">Preventive Measures</h4>
              </div>
              <div className="grid gap-3">
                {result.preventiveMeasures.map((measure, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-foreground">{measure}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Analyze Another */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setImage(null);
                setPreview(null);
                setResult(null);
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Analyze Another Image
            </Button>
          </div>
        )}

        {/* Info Section */}
        {!result && !loading && (
          <Card className="p-6 bg-gradient-to-br from-muted/50 to-transparent border-muted">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Tips for Best AI Analysis
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Camera, text: "Take clear, well-lit photos of affected plant parts" },
                { icon: Leaf, text: "Focus on the damaged or diseased area" },
                { icon: Bug, text: "Include close-ups of symptoms like spots or insects" },
                { icon: Shield, text: "Avoid blurry or dark images for accurate detection" },
              ].map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <tip.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{tip.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <h4 className="font-medium text-foreground mb-3">Common Issues We Can Detect</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "Northern Corn Leaf Blight",
                  "Gray Leaf Spot",
                  "Common Rust",
                  "Corn Smut",
                  "Fall Armyworm",
                  "Aphid Infestation",
                  "Nutrient Deficiency",
                  "Stalk Borers",
                ].map((issue, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {issue}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PestCheck;

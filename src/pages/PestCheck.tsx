import { useState } from "react";
import { Upload, Camera, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyzePestDisease } from "@/lib/api";
import { PestDiseaseResult } from "@/types/farm";
import { toast } from "sonner";

const PestCheck = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PestDiseaseResult | null>(null);

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
    if (!image) {
      toast.error("Please select an image first");
      return;
    }

    setLoading(true);
    try {
      const data = await analyzePestDisease(image);
      setResult(data);
      toast.success("Analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze image");
      console.error("Analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 md:pt-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pest & Disease Check</h1>
          <p className="text-muted-foreground">
            Upload a photo of your maize plant for AI-powered pest and disease detection
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            {preview ? (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    setResult(null);
                  }}
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground mb-1">Click to upload image</span>
                <span className="text-xs text-muted-foreground">or drag and drop</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}

            {preview && (
              <Button 
                onClick={handleAnalyze} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Analyze Image
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Results Section */}
        {result && (
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                result.severity === 'high' ? 'bg-destructive/10' :
                result.severity === 'medium' ? 'bg-accent/10' :
                'bg-primary/10'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  result.severity === 'high' ? 'text-destructive' :
                  result.severity === 'medium' ? 'text-accent' :
                  'text-primary'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {result.name}
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Confidence: <span className="font-medium text-foreground">{result.confidence}%</span>
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    result.severity === 'high' ? 'bg-destructive/10 text-destructive' :
                    result.severity === 'medium' ? 'bg-accent/10 text-accent' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {result.severity.toUpperCase()} Severity
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Recommended Solution</h4>
                <p className="text-muted-foreground">{result.solution}</p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Preventive Measures</h4>
                <ul className="space-y-2">
                  {result.preventiveMeasures.map((measure, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Info Section */}
        {!result && !loading && (
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold text-foreground mb-3">Tips for Best Results</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Take clear, well-lit photos of affected plant parts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Focus on the damaged or diseased area</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Include close-ups of symptoms like spots, discoloration, or insects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Avoid blurry or dark images for accurate detection</span>
              </li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PestCheck;

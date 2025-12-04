import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, CalendarDays, CheckCircle, Bell, BarChart3, Bug, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      } else {
        setLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return null;
  }

const features = [
    {
      icon: CalendarDays,
      title: "120-Day Farming Cycle",
      description: "Track your complete maize farming journey from planting to harvest with daily task guidance.",
    },
    {
      icon: CheckCircle,
      title: "Task Management",
      description: "Never miss a crucial farming task. Check off completed activities and stay organized throughout the season.",
    },
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Get timely notifications for important tasks like watering, fertilizing, and pest control.",
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Visualize your farming progress with detailed calendars and completion statistics.",
    },
    {
      icon: Bug,
      title: "Pest & Disease Detection",
      description: "AI-powered image analysis to identify pests and diseases early, with treatment recommendations.",
    },
    {
      icon: TrendingUp,
      title: "Yield Prediction",
      description: "Get accurate yield forecasts based on weather patterns, pest status, and crop progress.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">Farm Buddy AI</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={() => navigate("/auth")} variant="outline">
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Your AI-Powered Farming Companion
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Master maize farming with daily task guidance, smart reminders, and progress tracking throughout your 120-day growing cycle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg">
              Start Your Journey
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need for Successful Farming
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From planting to harvest, Farm Buddy AI guides you through every step of the maize farming process.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="border-border">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="bg-gradient-farm text-primary-foreground border-0">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Farming?
            </h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join Farm Buddy AI today and start your journey towards more organized, efficient, and successful maize farming.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="text-lg"
            >
              Get Started Free
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Farm Buddy AI. Empowering farmers with technology.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useEffect, useState } from "react";
import { initializeNotifications } from "@/lib/notifications";
import { offlineStorage } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Progress from "./pages/Progress";
import PestCheck from "./pages/PestCheck";
import Weather from "./pages/Weather";
import Yield from "./pages/Yield";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  isAuthenticated,
  isChecking,
  children,
}: {
  isAuthenticated: boolean;
  isChecking: boolean;
  children: JSX.Element;
}) => {
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AuthenticatedServices = () => {
  const { showOfflineBanner } = useOfflineSync();

  useEffect(() => {
    initializeNotifications();
    offlineStorage.init().catch(console.error);
  }, []);

  return (
    <>
      {showOfflineBanner && <OfflineBanner />}
      <PermissionPrompt />
      <Navigation />
    </>
  );
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setIsCheckingAuth(false);
    });

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    loadSession();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated && <AuthenticatedServices />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Progress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pest-check"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <PestCheck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Weather />
              </ProtectedRoute>
            }
          />
          <Route
            path="/yield"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Yield />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} isChecking={isCheckingAuth}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

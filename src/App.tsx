import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useEffect } from "react";
import { initializeNotifications } from "@/lib/notifications";
import { offlineStorage } from "@/lib/offline";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Progress from "./pages/Progress";
import PestCheck from "./pages/PestCheck";
import Weather from "./pages/Weather";
import Yield from "./pages/Yield";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { showOfflineBanner } = useOfflineSync();

  useEffect(() => {
    // Initialize notifications system
    initializeNotifications();
    
    // Initialize offline storage
    offlineStorage.init().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {showOfflineBanner && <OfflineBanner />}
      <PermissionPrompt />
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Progress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pest-check"
            element={
              <ProtectedRoute>
                <PestCheck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute>
                <Weather />
              </ProtectedRoute>
            }
          />
          <Route
            path="/yield"
            element={
              <ProtectedRoute>
                <Yield />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <Setup />
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
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

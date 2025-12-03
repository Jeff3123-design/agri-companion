import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Navigation } from "@/components/Navigation";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useEffect } from "react";
import { initializeNotifications } from "@/lib/notifications";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Progress from "./pages/Progress";
import PestCheck from "./pages/PestCheck";
import Weather from "./pages/Weather";
import Yield from "./pages/Yield";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { showOfflineBanner } = useOfflineSync();

  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <>
      {showOfflineBanner && <OfflineBanner />}
      <Navigation />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pest-check" element={<PestCheck />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/yield" element={<Yield />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
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

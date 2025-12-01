import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useEffect } from "react";
import { initializeNotifications } from "@/lib/notifications";
import Dashboard from "./pages/Dashboard";
import PestCheck from "./pages/PestCheck";
import Weather from "./pages/Weather";
import Yield from "./pages/Yield";
import Settings from "./pages/Settings";
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/pest-check" element={<PestCheck />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/yield" element={<Yield />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
